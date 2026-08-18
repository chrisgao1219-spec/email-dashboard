// DeepSeek-based AI handler v2 — replaces GAS backend for AI endpoints (2026-07-29)

const DEEPSEEK_BASE = 'https://api.deepseek.com/v1/chat/completions';

export async function askDeepSeek(systemPrompt, userPrompt, maxTokens = 2000) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY not configured');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const resp = await fetch(DEEPSEEK_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(`DeepSeek error ${resp.status}: ${JSON.stringify(data).slice(0, 200)}`);
    return data.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timeout);
  }
}

// ── aiIdeas: Generate 3 creative campaign ideas ──
export async function handleAiIdeas(type, brand, competitorContext = '') {
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  const month = now.getMonth() + 1;
  const season = month >= 3 && month <= 5 ? '春季' : month >= 6 && month <= 8 ? '夏季' : month >= 9 && month <= 11 ? '秋季' : '冬季';
  const system = `你是有创意的邮件营销策划专家。现在是${dateStr}（${season}）。请基于当前季节和用户提供的竞品数据生成精准方案。用JSON格式输出。`;
  const prompt = `为${brand || '一个DTC品牌'}生成3个${type}邮件营销创意方案。当前是${season}。

${competitorContext || '（无竞品数据，请基于行业通用知识）'}

请基于以上竞品真实数据，分析竞品正在做什么、缺少什么，给出有针对性的创意方案。每个方案包含：title、subject、content(100字以内)、type。严格按照JSON数组格式返回。`;

  const text = await askDeepSeek(system, prompt, 1500);
  // Parse JSON from response (handle markdown code blocks)
  const json = text.replace(/```(json)?/g, '').trim();
  try {
    return JSON.parse(json);
  } catch {
    // Fallback: return structured fallback
    return [
      { title: `${type}方案A`, subject: `限时优惠：全场9折`, content: `以限时折扣为核心，营造紧迫感推动转化`, type },
      { title: `${type}方案B`, subject: `新品首发，抢先体验`, content: `用新品故事和预热制造期待感`, type },
      { title: `${type}方案C`, subject: `你的专属福利已到`, content: `个性化推荐+专属优惠，提升打开率`, type },
    ];
  }
}

// ── template: Generate email template ──
export async function handleTemplate(type, brand, competitorContext = '') {
  const seed = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const system = 'You are a professional email marketing designer and copywriter. Always output in English. Include visual layout descriptions with image placeholders. Every output must be different.';
  const prompt = `${competitorContext}

Design a complete "${type}" email for ${brand || 'a DTC brand'}. Output in English with the following structure:

## Visual Layout
[Describe the overall visual structure — hero image position, text placement, button placement]

## Email Preview
┌─────────────────────┐
│  [LOGO: Brand logo] │
│  [HERO IMAGE: product shot, 600x400px, dark tech background] │
│  Headline: ...      │
│  Subheadline: ...   │
│  [CTA BUTTON: ...]  │
│  [Product Features] │
│  [Footer]           │
└─────────────────────┘

## Subject Lines (3 options)
## Preview Text
## Body Copy
## CTA Button (text + color)
## Image Suggestions (size, style, tone)
## Send Recommendations

Seed: ${seed}`;

  return await askDeepSeek(system, prompt, 3000);
}

// ── inspire: Get email inspiration ──
export async function handleInspire(type, brand, competitorContext = '') {
  const system = '你是邮件营销数据分析师。基于竞品真实数据给出灵感。用JSON格式输出。';
  const prompt = `${competitorContext}

为${brand || 'DTC品牌'}提供5条「${type}」邮件灵感参考。请基于竞品数据中的真实品牌和邮件类型，给出有针对性的灵感。每条包含真实品牌会用的标题公式和简短策略。

返回JSON数组：
[
  {"subject": "主题行示例", "strategy": "策略说明", "brand_style": "适合的品牌类型"},
  ...
]`;

  const text = await askDeepSeek(system, prompt, 1500);
  const json = text.replace(/```(json)?/g, '').trim();
  try {
    return JSON.parse(json);
  } catch {
    return [
      { subject: `限时48小时：全场8折`, strategy: '紧迫感+折扣驱动', brand_style: '促销型品牌' },
      { subject: `你错过了一个好东西`, strategy: '好奇心+社交证明', brand_style: '内容型品牌' },
      { subject: `新品来了，抢先看`, strategy: '预告+独家感', brand_style: '潮流品牌' },
      { subject: `你的购物车还在等你`, strategy: '温和提醒+FAQ', brand_style: '服务型品牌' },
      { subject: `我们想你啦`, strategy: '情感+回归福利', brand_style: '生活方式品牌' },
    ];
  }
}

// ── score: Score email quality ──
export async function handleScore(subject, body, brand, preheader, competitorContext = '') {
  const system = '你是严格的邮件质量评审员。参考竞品数据进行基准对比。用JSON格式输出评分。';
  const prompt = `${competitorContext}

请从7个维度评分（每项满分20分，总分140），并与竞品平均水平对比：

邮件标题：${subject || '(空)'}
预览文本：${preheader || '(空)'}
正文内容：${body || '(空)'}
品牌：${brand || '未指定'}

返回JSON：
{
  "total": 总分,
  "subject": 分,
  "preheader": 分,
  "personalization": 分,
  "cta": 分,
  "readability": 分,
  "spam": 分,
  "structure": 分,
  "issues": ["问题1", "问题2"],
  "suggestions": ["建议1", "建议2"],
  "checklist": [{"item": "检查项", "status": "pass或warn或fail", "detail": "详情"}],
  "benchmarks": {"open_rate": {"label": "打开率", "avg": "20-25%"}}
}`;

  const text = await askDeepSeek(system, prompt, 2000);
  const json = text.replace(/```(json)?/g, '').trim();
  try {
    return JSON.parse(json);
  } catch {
    return { total: 80, subject: 15, preheader: 10, personalization: 10, cta: 12, readability: 12, spam: 10, structure: 11, issues: ['AI评分解析失败，请重试'], suggestions: ['重新输入并评分'], checklist: [] };
  }
}

// ── rewrite: Rewrite subject line ──
export async function handleRewrite(subject, competitor, offer, brand, competitorContext = '') {
  const system = '你是邮件文案改写专家。基于竞品数据给出差异化改写。';
  const prompt = `${competitorContext}

竞品「${competitor || '某品牌'}」的主题行："${subject}"
竞品优惠：${offer || '未知'}
我方品牌：${brand || '你的品牌'}

请改写为3个不同风格的版本（直接/好奇/紧迫），每个版本包含改写后的主题行和简短策略说明。
输出格式：每个版本一行，注明 [风格] 主题行 — 策略`;

  return await askDeepSeek(system, prompt, 1000);
}

// ── digest: Competitive intelligence insights ──
export async function handleDigest(brand, competitorContext = '') {
  const system = '你是电商竞争情报分析师。严格基于用户提供的真实竞品数据进行分析。';
  const prompt = `${competitorContext || '（无竞品数据）'}

请严格基于以上竞品真实数据（邮件类型分布、折扣覆盖率、紧迫感评分、Top主题行），分析该品牌订阅的竞品邮件策略：

1. 近期竞品邮件趋势（3条，过去30天流行的策略和风格）
2. 机会空白（2-3条，竞品近期还没做但值得尝试的方向）
3. 可操作建议（3条，本周即可执行的策略）
4. 本周推荐邮件类型和主题方向（结合当前季节和大促节点）

输出为Markdown格式，每条带具体数据和案例。请注明"基于2026年7月近期趋势"。`;

  return await askDeepSeek(system, prompt, 2500);
}

// ── customTemplate: Custom email generation with detailed params ──
export async function handleCustomTemplate(params, competitorContext = '') {
  const { emailType, goal, discount, discountCode, visualStyle, productInfo, emailContent, notes, brand } = params;
  const system = 'You are a world-class email designer. Generate in English with visual layout + copy.';
  const prompt = `${competitorContext || ''}

Design a complete marketing email for ${brand || 'a DTC brand'}.
Type: ${emailType || 'Promotion'} | Goal: ${goal || 'Drive Sales'} | Style: ${visualStyle || 'Modern Clean'}
Product: ${productInfo || 'Main product'} | Discount: ${discount || 'None'} | Code: ${discountCode || 'None'}
Notes: ${notes || 'None'} | Reference: ${emailContent || 'None'}

Output in English with visual layout:
## Visual Layout
## Subject Lines (3 options)
## Preview Text
## Body Copy (with image placeholders [IMG: description])
## CTA Button (text + hex color)
## Image Suggestions
## Send Tips`;

  return await askDeepSeek(system, prompt, 3000);
}

// ── htmlAudit: 邮件 HTML 审核（拼写语法/文案/设计 + 是否建议发送） ──
export async function handleHtmlAudit(html, targetDomain, promoCode, linkSummary = '', subject = '', plainText = '') {
  const stripped = (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const text = (plainText || stripped).slice(0, 2000);
  const system = '你是严格的 EDM 邮件审核专家。检查拼写语法、文案和设计，并给出是否建议发送的结论。仅输出 JSON，不要输出 JSON 以外的内容。';
  const prompt = `请审核这封 EDM 邮件。

主题行：${subject || '(未提取)'}
目标主域名：${targetDomain || '(未指定)'}
本次优惠码：${promoCode || '(未指定)'}

【链接检查结果（程序自动提取，供你参考）】
${linkSummary || '(无)'}

【邮件正文（截取前 2000 字）】
${text || '(空)'}

请从以下维度审核，返回 JSON：
{
  "spelling": { "issues": ["拼写/语法/标点问题"], "suggestions": ["修改建议"] },
  "copy": { "issues": ["文案问题"], "suggestions": ["文案优化建议"] },
  "design": { "issues": ["设计/版式问题"], "suggestions": ["设计建议"] },
  "verdict": { "send": "yes | caution | no", "reason": "是否建议发送的一句话理由" }
}

审核要点：
- 拼写语法：英文拼写、语法、标点、大小写、多余空格、错别字
- 文案：标题/主题吸引力、CTA 是否清晰、价值主张是否明确、优惠码是否突出
- 设计：移动端适配、图片占比、按钮大小与可点击性、信息层级、暗黑模式兼容
- verdict：无高危问题 → yes；有需修复的问题 → caution；有严重问题（坏链接/明显错误/优惠码缺失）→ no`;

  const result = await askDeepSeek(system, prompt, 2500);
  const json = result.replace(/```(json)?/g, '').trim();
  try {
    return JSON.parse(json);
  } catch {
    return {
      spelling: {}, copy: {}, design: {},
      verdict: { send: 'caution', reason: 'AI 审核结果解析失败，请人工复核' },
      raw: result,
    };
  }
}
