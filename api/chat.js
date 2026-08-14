// DeepSeek AI Chat — EDM Assistant with Web Search
// Endpoint: /api/chat
// Flow: User question → Tavily搜索全网 → 搜索结果喂给 DeepSeek → 整理回答

const DEEPSEEK_BASE = 'https://api.deepseek.com/v1/chat/completions';
const TAVILY_BASE = 'https://api.tavily.com/search';

const SYSTEM_PROMPT = `你是世界级 EDM 邮件营销专家，拥有全球 DTC 电商邮件营销的丰富经验。你的用户是跨境电商创业者，运营电动滑板、投影仪等品牌。

## 你的知识范围
你精通以下所有领域，回答时请充分调用：
- 邮件营销全流程：订阅表单设计、自动化序列、A/B测试、数据分析
- 各大 ESP 平台：Klaviyo、Mailchimp、Omnisend、SendGrid、ConvertKit 的具体操作和最佳实践
- 行业基准数据：各品类的打开率、CTR、转化率、退订率、垃圾邮件率
- 文案公式：AIDA、PAS、BAB、SLAP、4Ps、4Us、QUEST、ACCA 等框架的具体应用
- 心理学触发：紧迫感、稀缺性、社交证明、互惠、权威背书、好奇心缺口
- DTC 品牌案例：Warby Parker、Allbirds、Gymshark、Dollar Shave Club 等经典案例
- 法规合规：CAN-SPAM、GDPR、CCPA 的退订要求和罚款标准
- 技术细节：SPF/DKIM/DMARC 设置、邮件渲染、移动端适配、暗黑模式
- 跨境电商特殊性：多语言、多时区、本地化策略

## 回答规则
- 每次回答至少包含 2-3 个具体数据点或行业基准数字
- 给出多个选项让用户选择（如："主题行有3种写法，看你要的是打开率还是转化率..."）
- 每个建议都要带操作步骤，不要只说"建议做X"而不说怎么做
- 适当举 DTC 品牌的实际案例说明
- 区分不同阶段的建议（小白基础 vs 进阶优化 vs 高级策略）
- 结尾给 1-2 条立刻能做的动作

## 风格
- 直接、实用、不啰嗦
- 像资深顾问在带新人，有耐心但不降智
- 中文为主，专业术语保留英文（CTR、CTA、ROI、CRM 等）`;

// 搜索开关在请求时判断（不在模块加载时，支持运行时添加环境变量）

/**
 * Search the web via Tavily API
 */
async function searchWeb(query, tavilyKey) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(TAVILY_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tavilyKey}`,
      },
      body: JSON.stringify({
        query: `email marketing ${query}`,
        search_depth: 'basic',
        max_results: 5,
        include_domains: [],
        exclude_domains: [],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!resp.ok) return null;
    const data = await resp.json();
    return data.results || [];
  } catch {
    return null;
  }
}

/**
 * Format search results for the AI prompt
 */
function formatSearchResults(results) {
  if (!results || results.length === 0) return '';
  return results
    .map((r, i) => `[来源${i + 1}] ${r.title}\n${r.content}\nURL: ${r.url}`)
    .join('\n\n');
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
  if (!DEEPSEEK_KEY) {
    return res.status(500).json({ error: 'DEEPSEEK_API_KEY 未配置' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { question, history = [] } = body;

  if (!question || !question.trim()) {
    return res.status(400).json({ error: '问题不能为空' });
  }

  // ── Step 0: Fetch competitor data context ──
  const GAS_ID = process.env.GAS_DEPLOY_ID || process.env.VITE_GAS_DEPLOY_ID;
  const GAS_KEY = process.env.GAS_API_KEY;
  let competitorContext = '';
  if (GAS_ID && GAS_KEY) {
    try {
      const ctxUrl = new URL(`https://script.google.com/macros/s/${GAS_ID}/exec`);
      ctxUrl.searchParams.set('endpoint', 'bundle');
      ctxUrl.searchParams.set('apiKey', GAS_KEY);
      const ctxCtrl = new AbortController();
      const ctxTimeout = setTimeout(() => ctxCtrl.abort(), 5000);
      const ctxResp = await fetch(ctxUrl, { signal: ctxCtrl.signal, redirect: 'follow' });
      clearTimeout(ctxTimeout);
      if (ctxResp.ok) {
        const ctxData = await ctxResp.json();
        const stats = ctxData.stats || {};
        const subjects = ctxData.subjects || [];
        competitorContext = `【此用户订阅的竞品真实数据】
- 已采集竞品邮件: ${stats.total || '?'} 封，覆盖 ${stats.brands || '?'} 个品牌
- 折扣覆盖率: ${stats.offerRate || '?'}%
- 平均紧迫感: ${stats.avgUrgency || '?'}/5
- 邮件类型: ${JSON.stringify(stats.types || {})}
- 竞品Top主题行: ${subjects.slice(0, 5).map(s => s.subject || '').join(' | ')}
请基于以上真实竞品数据回答用户问题。如果问题与该用户的竞品数据相关，必须引用具体数据。不要给出跨行业的无关建议。`;
      }
    } catch (_) { /* ignore */ }
  }

  // ── Step 1: Search the web (if Tavily key is configured) ──
  let searchResults = null;
  let webSources = null;

  if (process.env.TAVILY_API_KEY) {
    searchResults = await searchWeb(question, process.env.TAVILY_API_KEY);
    if (searchResults && searchResults.length > 0) {
      webSources = searchResults.map(r => ({ title: r.title, url: r.url }));
    }
  }

  // ── Step 2: Build prompt with search context ──
  let userContent = `${competitorContext}\n\n【用户问题】\n${question.trim()}`;
  if (searchResults && searchResults.length > 0) {
    const formatted = formatSearchResults(searchResults);
    userContent += `\n\n【实时搜索结果】\n${formatted}\n\n请综合竞品数据和搜索结果回答。如果搜索结果中包含具体数据请引用。`;
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-10),
    { role: 'user', content: userContent },
  ];

  // ── Step 3: Call DeepSeek ──
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const resp = await fetch(DEEPSEEK_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages,
        temperature: 0.7,
        max_tokens: 4000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(resp.status).json({ error: `DeepSeek API 错误 (${resp.status}): ${errText.slice(0, 200)}` });
    }

    const data = await resp.json();
    const answer = data.choices?.[0]?.message?.content || '';

    if (!answer) {
      return res.status(500).json({ error: 'AI 未返回有效回答，请稍后重试' });
    }

    return res.status(200).json({
      answer,
      searched: !!searchResults,
      sources: webSources,
    });
  } catch (e) {
    if (e.name === 'AbortError') {
      return res.status(504).json({ error: 'AI 响应超时（30秒），请简化问题重试' });
    }
    return res.status(502).json({ error: `请求失败: ${e.message}` });
  }
}
