const WRITE_ENDPOINTS = new Set(['runFull', 'runQuick', 'dedup', 'setAiKey', 'register', 'remove', 'setupTrigger', 'score', 'rewrite', 'template', 'shopifyConnect']);
const READ_ENDPOINTS = new Set(['config', 'stats', 'dashboard', 'subjects', 'action', 'weekly', 'compare', 'inspire', 'copy', 'templates', 'bundle', 'aiStatus', 'aiIdeas', 'strategy', 'calendar', 'digest', 'sheetUrl', 'registered', 'shopifyData', 'competitorEmail']);
const ALL_ENDPOINTS = new Set([...WRITE_ENDPOINTS, ...READ_ENDPOINTS]);
const STRATEGY_ENDPOINTS = new Set(['strategyGenerate', 'strategyBrands', 'strategyScenarios', 'strategyQuickGenerate']);
const AI_ENDPOINTS = new Set(['aiIdeas', 'template', 'inspire', 'score', 'rewrite', 'digest', 'customTemplate']);
const REQUEST_TIMEOUT_MS = 25000;

// Local strategy handler — no GAS dependency
async function handleStrategyEndpoint(endpoint, method, body) {
  const {
    generateStrategyMarkdown, generateSequenceMarkdown,
    generateCopyMarkdown, generateDesignMarkdown,
    generateFullStrategy, generateSequenceEmails,
  } = await import('./generator.js');
  const { BRANDS, SCENARIO_PRESETS, VISUAL_ARCHETYPES } = await import('./knowledge.js');

  switch (endpoint) {
    case 'strategyBrands':
      return Object.entries(BRANDS).map(([k, v]) => ({ key: k, ...v }));
    case 'strategyScenarios':
      return SCENARIO_PRESETS;
    case 'strategyGenerate': {
      const { action, brandKey, customConfig, ...rest } = body;
      switch (action) {
        case 'strategy':
          return { markdown: generateStrategyMarkdown(brandKey, customConfig, rest.selectedTiers, rest.targetCtr, rest.targetCtor, rest.notes) };
        case 'sequence':
          return { markdown: generateSequenceMarkdown(rest.sequenceType, brandKey, customConfig, rest.emailCount, rest.customNotes) };
        case 'copy':
          return { markdown: generateCopyMarkdown(brandKey, customConfig, rest.selectedFormulas, rest.bodyFramework, rest.ctaStyle, rest.brandKeywords, rest.customNotes) };
        case 'design':
          return { markdown: generateDesignMarkdown(rest.archetypeName, rest.colorStrategyName, rest.primaryColor, brandKey, customConfig, rest.customNotes) };
        case 'emails':
          return { emails: generateSequenceEmails(rest.sequenceType, brandKey, customConfig, rest.emailCount, rest.subjectFormula, rest.bodyFramework, rest.tone, rest.keywords, rest.ctaUrl || '') };
        case 'full':
          return { markdown: generateFullStrategy(brandKey, customConfig, rest.phase1Md, rest.phase2Md, rest.phase3Md, rest.phase4Md) };
        default:
          throw new Error('Unknown strategy action: ' + action);
      }
    }
    case 'strategyQuickGenerate': {
      const { scenarioId, brandKey, customConfig } = body;
      const scenario = SCENARIO_PRESETS.find(s => s.id === scenarioId);
      if (!scenario) throw new Error('Scenario not found');
      const brand = BRANDS[brandKey] || BRANDS['custom'];
      const kw = customConfig?.keywords || brand.keywords || [];
      const theTone = customConfig?.tone || brand.tone || scenario.tone;
      const theColor = customConfig?.color_hex || brand.color_hex || '#6C5CE7';

      return {
        phase1: generateStrategyMarkdown(brandKey, customConfig, [1, 2, 3], 3.0, 15.0),
        phase2: generateSequenceMarkdown(scenario.sequence, brandKey, customConfig, scenario.email_count),
        phase3: generateCopyMarkdown(brandKey, customConfig, ['好奇', '直接', '社交证明'], scenario.framework, '按钮 + 文字', kw),
        phase4: generateDesignMarkdown(scenario.archetype, scenario.color, theColor, brandKey, customConfig),
        emails: generateSequenceEmails(scenario.sequence, brandKey, customConfig, scenario.email_count, '直接', scenario.framework, theTone, kw, ''),
      };
    }
    default:
      throw new Error('Unknown strategy endpoint: ' + endpoint);
  }
}

export default async function handler(req, res) {
  const gasDeployId = process.env.GAS_DEPLOY_ID || process.env.VITE_GAS_DEPLOY_ID;
  const gasApiKey = process.env.GAS_API_KEY;
  const method = req.method || 'GET';

  const endpoint = Array.isArray(req.query.endpoint) ? req.query.endpoint[0] : req.query.endpoint;

  // Strategy endpoints handled locally (no GAS needed)
  if (endpoint && STRATEGY_ENDPOINTS.has(endpoint)) {
    if (req.method === 'OPTIONS') {
      res.status(204).setHeader('Access-Control-Allow-Origin', '*').setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS').setHeader('Access-Control-Allow-Headers', 'Content-Type').end();
      return;
    }
    try {
      const body = req.method === 'POST' ? (req.body && typeof req.body === 'object' ? req.body : {}) : {};
      const result = await handleStrategyEndpoint(endpoint, req.method, body);
      res.status(200).json(result);
    } catch (e) {
      res.status(500).json({ error: e.message || 'Strategy error' });
    }
    return;
  }

  // AI endpoints — fetch competitor data context, then call DeepSeek
  if (endpoint && AI_ENDPOINTS.has(endpoint)) {
    if (req.method === 'OPTIONS') {
      res.status(204).setHeader('Access-Control-Allow-Origin', '*').setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS').setHeader('Access-Control-Allow-Headers', 'Content-Type').end();
      return;
    }
    try {
      const { handleAiIdeas, handleTemplate, handleInspire, handleScore, handleRewrite, handleDigest, handleCustomTemplate } = await import('./ai-handler.js');
      const params = method === 'POST' ? (req.body && typeof req.body === 'object' ? req.body : {}) : (req.query || {});
      const brand = params.brand || '';

      // Fetch competitor data context for AI (non-blocking, graceful fallback)
      let competitorContext = '';
      if (gasDeployId && gasApiKey) {
        try {
          const ctxUrl = new URL(`https://script.google.com/macros/s/${gasDeployId}/exec`);
          ctxUrl.searchParams.set('endpoint', 'bundle');
          ctxUrl.searchParams.set('apiKey', gasApiKey);
          if (brand) ctxUrl.searchParams.set('brand', brand);

          const ctxCtrl = new AbortController();
          const ctxTimeout = setTimeout(() => ctxCtrl.abort(), 5000);
          const ctxResp = await fetch(ctxUrl, { signal: ctxCtrl.signal, redirect: 'follow' });
          clearTimeout(ctxTimeout);
          if (ctxResp.ok) {
            const ctxData = await ctxResp.json();
            const stats = ctxData.stats || {};
            const subjects = ctxData.subjects || [];
            competitorContext = `【竞品数据上下文 — 基于该品牌真实订阅的竞品邮件】
- 已采集竞品邮件: ${stats.total || '?'} 封
- 本周新增: ${stats.thisWeek || '?'} 封
- 覆盖品牌数: ${stats.brands || '?'} 个
- 折扣覆盖率: ${stats.offerRate || '?'}%
- 邮件类型分布: ${JSON.stringify(stats.types || {})}
- 竞品Top主题行: ${subjects.slice(0, 5).map(s => s.subject || '').join(' | ')}
请基于以上真实竞品数据给出建议，不要给出与这些竞品无关的跨行业建议。`;
          }
        } catch (_) { /* ignore — AI works without competitor context */ }
      }

      switch (endpoint) {
        case 'aiIdeas': {
          const data = await handleAiIdeas(params.type || '促销活动', brand, competitorContext);
          return res.status(200).json(data);
        }
        case 'template': {
          const result = await handleTemplate(params.type || '促销活动', brand, competitorContext);
          return res.status(200).json({ result });
        }
        case 'inspire': {
          const data = await handleInspire(params.type || '促销活动', brand, competitorContext);
          return res.status(200).json(data);
        }
        case 'score': {
          const data = await handleScore(params.subject, params.body, brand, params.preheader, competitorContext);
          return res.status(200).json(data);
        }
        case 'rewrite': {
          const result = await handleRewrite(params.subject, params.competitor, params.offer, brand, competitorContext);
          return res.status(200).json({ result });
        }
        case 'digest': {
          const result = await handleDigest(brand, competitorContext);
          return res.status(200).json({ result });
        }
        case 'customTemplate': {
          const result = await handleCustomTemplate(params, competitorContext);
          return res.status(200).json({ result });
        }
        default:
          return res.status(400).json({ error: 'Unknown AI endpoint' });
      }
    } catch (e) {
      return res.status(500).json({ error: e.message || 'AI handler error' });
    }
  }

  if (!gasDeployId) {
    res.status(500).json({ error: 'GAS_DEPLOY_ID is not configured' });
    return;
  }

  if (!endpoint || !ALL_ENDPOINTS.has(endpoint)) {
    res.status(400).json({ error: 'Unknown endpoint' });
    return;
  }

  if (method !== 'GET' && method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (WRITE_ENDPOINTS.has(endpoint) && method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed: use POST for this endpoint' });
    return;
  }
  if (!WRITE_ENDPOINTS.has(endpoint) && method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed: use GET for this endpoint' });
    return;
  }
  if (!gasApiKey) {
    res.status(500).json({ error: 'GAS_API_KEY is not configured' });
    return;
  }

  const url = new URL(`https://script.google.com/macros/s/${gasDeployId}/exec`);
  Object.entries(req.query || {}).forEach(([key, value]) => {
    if (value === undefined || key === 'apiKey') return;
    url.searchParams.set(key, Array.isArray(value) ? value[0] : value);
  });
  if (method === 'GET') {
    url.searchParams.set('apiKey', gasApiKey);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const init = { method, headers: {}, redirect: 'follow', signal: controller.signal };

  if (method === 'POST') {
    const payload = req.body && typeof req.body === 'object' ? { ...req.body } : {};
    payload.apiKey = gasApiKey;
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(payload);
  }

  try {
    const response = await fetch(url, init);
    const contentType = response.headers.get('content-type') || 'application/json; charset=utf-8';
    const text = await response.text();
    res.status(response.status);
    res.setHeader('Content-Type', contentType);
    res.send(text);
  } catch (error) {
    const isTimeout = error && error.name === 'AbortError';
    res.status(isTimeout ? 504 : 502).json({ error: isTimeout ? 'GAS proxy request timed out' : (error.message || 'GAS proxy request failed') });
  } finally {
    clearTimeout(timeout);
  }
}
