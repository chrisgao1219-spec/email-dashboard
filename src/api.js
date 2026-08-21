import API_BASE from './config';

const API_KEY = import.meta.env.DEV ? (import.meta.env.VITE_API_KEY || '') : '';
const REQUEST_TIMEOUT_MS = 25000;

function withKey(params = {}) {
  return API_KEY ? { ...params, apiKey: API_KEY } : params;
}

async function fetchJson(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function get(endpoint, params = {}) {
  const qs = new URLSearchParams({ endpoint, ...withKey(params) }).toString();
  return fetchJson(API_BASE + '?' + qs);
}

async function post(endpoint, body = {}) {
  return fetchJson(API_BASE + '?endpoint=' + endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withKey(body))
  });
}

export function fetchBundle(brand)           { return get('bundle', brand ? { brand } : {}); }
export function fetchConfig()              { return get('config'); }
export function fetchStats()               { return get('stats'); }
export function fetchDashboard()           { return get('dashboard'); }
export function fetchTopSubjects()         { return get('subjects'); }
export function fetchActionReport(brand)   { return get('action', brand ? { brand } : {}); }
export function fetchWeeklyReport()        { return get('weekly'); }
export function fetchBrandComparison(type, brand) { return get('compare', { type, ...(brand && { brand }) }); }
export function fetchInspiration(type, brand)     { return get('inspire', { type, ...(brand && { brand }) }); }
export function fetchCopywriting()         { return get('copy'); }
export function fetchTemplates(brand)      { return get('templates', brand ? { brand } : {}); }
export function fetchSheetUrl()            { return get('sheetUrl'); }
export function runFullAnalysis(brand)     { return post('runFull', brand ? { brand } : {}); }
export function runQuickCollect()          { return post('runQuick'); }
export function fetchScore(subject, body, brand, preheader) { return post('score', { subject, body, brand, preheader }); }
export function fetchCalendar(brand)       { return get('calendar', brand ? { brand } : {}); }
export function registerBrand(config)     { return post('register', { config }); }
export function removeBrand(brandName)    { return post('remove', { brandName }); }
export function fetchRegisteredConfigs()  { return get('registered'); }
export function fetchAIdeas(type, brand)   { return get('aiIdeas', { type, ...(brand && { brand }) }); }
export function fetchAIRewrite(subject, competitor, offer, brand) { return post('rewrite', { subject, competitor, offer, brand }); }
export function fetchAITemplate(type, brand) { return post('template', { type, brand }); }
export function fetchAIDigest(brand)        { return get('digest', brand ? { brand } : {}); }
export function fetchAICustomTemplate(params) { return post('customTemplate', params); }
export function fetchStrategy()             { return get('strategy'); }
export function connectShopify(shopDomain, accessToken) { return post('shopifyConnect', { shopDomain, accessToken }); }
export function fetchShopifyData()          { return get('shopifyData'); }

// Strategy API (handled locally, no GAS)
export function fetchStrategyBrands()       { return get('strategyBrands'); }
export function fetchStrategyScenarios()    { return get('strategyScenarios'); }
export function generateStrategy(params)    { return post('strategyGenerate', params); }
export function quickGenerate(params)       { return post('strategyQuickGenerate', params); }

// 邮件 HTML 审核（走 endpoint 分发）
export function fetchHtmlAudit(params)      { return post('htmlAudit', params); }

// 竞品邮件原文（可套用模板）
export function fetchCompetitorEmail(type) { return get('competitorEmail', { type }); }

// 邮件活动生成器（调 DeepSeek 生成结构化邮件 JSON）
export function fetchGenerateCampaign(prompt) { return post('generateCampaign', { prompt }); }

// AI 月度日历排期生成（长超时，DeepSeek 生成慢）
export function fetchGenerateCalendar(params) {
  return fetchJson(API_BASE + '?endpoint=generateCalendar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withKey(params)),
  }, 45000);
}

// 短超时版竞品数据（日历生成用，GAS 慢时快速降级）
export function fetchStatsQuick() {
  return fetchJson(API_BASE + '?' + new URLSearchParams({ endpoint: 'stats', ...withKey() }).toString(), {}, 8000);
}
export function fetchTopSubjectsQuick() {
  return fetchJson(API_BASE + '?' + new URLSearchParams({ endpoint: 'subjects', ...withKey() }).toString(), {}, 8000);
}
