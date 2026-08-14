// Gmail 测试邮箱读取 + 邮件审核
// action: auth（发起授权）/ status（查连接状态）/ read（读最新邮件）/ analyze（AI 审核）
// 权限：gmail.readonly（只读）
// refresh_token 存 Vercel KV

import { kv } from '@vercel/kv';
import { askDeepSeek } from './ai-handler.js';

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const KV_KEY = 'gmail_refresh_token';

// 根据请求 host 动态决定 redirect URI（本地 localhost / 生产 vercel.app）
function getRedirectUri(host) {
  const protocol = host && host.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${host}/api/auth/google/callback`;
}

// 用 refresh_token 换 access_token
async function getAccessToken(refreshToken) {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error('Gmail 令牌刷新失败: ' + (data.error_description || data.error || resp.status));
  return data.access_token;
}

function decodeBase64(data) {
  if (!data) return '';
  try {
    const buff = Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    return buff.toString('utf-8');
  } catch { return ''; }
}

// 递归查找指定 mimeType 的正文
function findBody(payload, mimeType) {
  if (!payload) return '';
  if (payload.mimeType === mimeType && payload.body?.data) {
    return decodeBase64(payload.body.data);
  }
  if (Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      const result = findBody(part, mimeType);
      if (result) return result;
    }
  }
  return '';
}

function parseEmail(detail) {
  const headers = detail.payload?.headers || [];
  const getHeader = (name) => {
    const h = headers.find(h => h.name && h.name.toLowerCase() === name.toLowerCase());
    return h ? h.value : '';
  };

  const subject = getHeader('Subject');
  const from = getHeader('From');
  const htmlBody = findBody(detail.payload, 'text/html');
  const plainBody = findBody(detail.payload, 'text/plain');

  // 提取所有链接（去重）
  const linkMatches = [...htmlBody.matchAll(/href=["']([^"']+)["']/gi)];
  const links = [...new Set(linkMatches.map(m => m[1]))];

  // 提取优惠码
  const fullText = plainBody || htmlBody.replace(/<[^>]+>/g, ' ');
  const codeRegex = /\b(?:code|promo|coupon|discount|use)[:\s]+([A-Z0-9][A-Z0-9-]{3,20})\b/gi;
  const codes = [];
  let match;
  while ((match = codeRegex.exec(fullText)) !== null) {
    if (!codes.includes(match[1])) codes.push(match[1]);
  }

  return {
    id: detail.id,
    subject,
    from,
    date: getHeader('Date'),
    htmlBody,
    plainBody,
    links,
    codes,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const action = req.query.action || '';

  // ── 1. 发起 OAuth 授权 ──
  if (action === 'auth') {
    const redirectUri = getRedirectUri(req.headers.host);
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID || '');
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', GMAIL_SCOPE);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    return res.status(302).setHeader('Location', url.toString()).end();
  }

  // ── 2. 查询连接状态 ──
  if (action === 'status') {
    try {
      const token = await kv.get(KV_KEY);
      return res.status(200).json({ connected: !!token });
    } catch {
      return res.status(200).json({ connected: false });
    }
  }

  // ── 3. 读取最新测试邮件 ──
  if (action === 'read') {
    try {
      const refreshToken = await kv.get(KV_KEY);
      if (!refreshToken) return res.status(401).json({ error: '未连接 Gmail，请先授权' });

      const accessToken = await getAccessToken(refreshToken);

      // 列出最新 1 封邮件
      const listResp = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const listData = await listResp.json();
      if (!listResp.ok) throw new Error('Gmail 读取失败: ' + (listData.error?.message || listResp.status));
      if (!listData.messages || listData.messages.length === 0) {
        return res.status(200).json({ found: false, message: '测试邮箱里没有邮件' });
      }

      // 读详情
      const msgId = listData.messages[0].id;
      const detailResp = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const detail = await detailResp.json();
      if (!detailResp.ok) throw new Error('Gmail 详情读取失败: ' + (detail.error?.message || detailResp.status));

      const email = parseEmail(detail);
      return res.status(200).json({ found: true, email });
    } catch (e) {
      return res.status(500).json({ error: e.message || '读取失败' });
    }
  }

  // ── 4. AI 审核邮件 ──
  if (action === 'analyze') {
    try {
      const { subject, from, htmlBody, plainBody, links } = req.body || {};
      const text = plainBody || (htmlBody || '').replace(/<[^>]+>/g, ' ');

      const system = '你是专业的邮件营销审核专家。严格、具体、可执行地审核每一封邮件。用 JSON 格式输出。';
      const prompt = `请审核这封测试邮件：

发件人：${from || '未知'}
主题行：${subject || '(空)'}
正文（截取前 1500 字）：${(text || '(空)').slice(0, 1500)}
所有链接：${links && links.length ? links.join('\n') : '(无)'}

请从以下 4 个维度审核，返回 JSON：
{
  "links": { "score": 0-100, "unified": true/false, "domains": ["域名1"], "issues": ["问题"], "suggestions": ["建议"] },
  "spelling": { "score": 0-100, "issues": ["拼写/语法问题"], "suggestions": ["建议"] },
  "copy": { "score": 0-100, "strengths": ["优点"], "issues": ["问题"], "suggestions": ["建议"] },
  "design": { "score": 0-100, "issues": ["设计/版式问题"], "suggestions": ["建议"] },
  "summary": "总体评价一句话"
}

检查要点：
- 链接统一性：所有链接域名是否一致，有无可疑/坏链接/追踪参数异常
- 拼写语法：英文拼写、语法、标点、大小写
- 文案：主题行吸引力、CTA 是否清晰、价值主张是否明确
- 设计：移动端适配、图片占比、按钮大小、信息层级`;

      const result = await askDeepSeek(system, prompt, 2500);
      const json = result.replace(/```(json)?/g, '').trim();
      try {
        return res.status(200).json(JSON.parse(json));
      } catch {
        return res.status(200).json({ raw: result, summary: '审核完成（结构化解析失败，返回原文）' });
      }
    } catch (e) {
      return res.status(500).json({ error: e.message || '审核失败' });
    }
  }

  return res.status(400).json({ error: '未知 action，支持 auth/status/read/analyze' });
}
