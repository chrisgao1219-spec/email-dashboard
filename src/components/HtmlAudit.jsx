import { useState, useMemo, useRef } from 'react';
import { fetchHtmlAudit } from '../api';

// 疑似测试/占位链接的特征（机械检查，不涉及主域名）
const TEST_LINK_PATTERNS = [
  'test', 'example', 'localhost', '127.0.0.1', 'placehold', 'sample',
  'demo', 'staging', 'dev.', 'yourdomain', 'mysite', 'xxx', 'preview',
  'your-', 'fill', 'todo', 'placeholder',
];

// 未替换的模板变量（如 {{ product.url }}、{link}、%%LINK%%、[URL]、${x}）
const VARIABLE_LINK_RE = /\{\{|\}\}|\{link\}|\{url\}|\{tracking\}|\{cta\}|%%[a-z0-9_]+%%|\[(link|url|tracking|cta|href|product_url)\]|\$\{|\$[a-z_]+/i;

// 常见社媒域名
const SOCIAL_DOMAINS = ['facebook.com', 'fb.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com', 'youtube.com', 'youtu.be', 'linkedin.com', 'pinterest.com', 'snapchat.com', 'weibo.com', 'reddit.com', 'threads.net'];

// 按钮 CTA 关键词
const CTA_KEYWORDS = ['buy now', 'shop now', 'learn more', 'claim', 'view deal', 'get yours', 'order now', 'shop', 'buy', 'get the deal', 'explore', 'discover', 'grab', '立即购买', '立即抢购', '了解更多', '查看详情', '马上抢', '立即下单', '现在购买', '购买', '抢购'];

// 追踪链接里常见的「真实目标」参数名
const TRACKING_PARAM_NAMES = ['url', 'u', 'target', 'redirect', 'destination', 'link', 'next', 'goto', 'redir', 'rurl', 'dest', 'redirect_url', 'redirect_to', 'target_url', 'url_to', 'return', 'out', 'l', 'rd', 'to'];

// 常见的两段式二级域名（用于正确取主域名）
const TWO_PART_TLDS = ['co.uk', 'com.au', 'com.cn', 'co.jp', 'com.br', 'co.nz', 'co.in', 'com.sg', 'com.hk', 'com.mx', 'co.kr'];

const TYPE_COLORS = {
  '图片': '#d97706', '按钮': '#2563eb', '文字': '#059669',
  '社媒': '#7c3aed', '退订': '#64748b', '隐私政策': '#64748b',
  '查看网页版': '#64748b', '其他': '#64748b', '图片资源': '#d97706',
};

// 归一化目标域名 → hostname（去掉协议、www、路径）
function normalizeDomain(input) {
  let s = (input || '').trim();
  if (!s) return '';
  if (!/^[a-z]+:\/\//i.test(s)) s = 'http://' + s;
  try {
    return new URL(s).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return input.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split(/[/?#]/)[0];
  }
}

function getHostname(url) {
  try {
    return new URL(url.startsWith('//') ? 'http:' + url : url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

// 由 hostname 取主域名（brand.com、brand.co.uk）
function getMainDomain(hostname) {
  const parts = (hostname || '').toLowerCase().replace(/^www\./, '').split('.');
  if (parts.length <= 2) return parts.join('.');
  const lastTwo = parts.slice(-2).join('.');
  if (TWO_PART_TLDS.includes(lastTwo) && parts.length >= 3) return parts.slice(-3).join('.');
  return lastTwo;
}

// 机械检查（只判空/#/测试/未替换变量/相对路径/无法解析，不判主域名）
function classifyMechanical(url) {
  if (!url) return { status: 'empty', label: '空链接' };
  if (url === '#' || url.startsWith('#')) return { status: 'hash', label: '锚点/占位' };
  if (/^(mailto:|tel:|sms:|data:)/i.test(url)) return { status: 'ok', label: '非网页链接' };
  if (VARIABLE_LINK_RE.test(url)) return { status: 'variable', label: '未替换变量' };
  const lower = url.toLowerCase();
  if (TEST_LINK_PATTERNS.some(p => lower.includes(p))) return { status: 'test', label: '测试/预览/本地' };
  if (url.startsWith('/') || (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url) && !url.startsWith('//'))) {
    return { status: 'relative', label: '相对路径' };
  }
  if (!getHostname(url)) return { status: 'invalid', label: '无法解析' };
  return { status: 'ok', label: '正常' };
}

function isCtaText(t) {
  return CTA_KEYWORDS.some(k => t.includes(k));
}

// 判断单个 <a> 的链接类型（社媒/退订/隐私/网页版 优先，其次图片/按钮/文字/其他）
function detectLinkType(a, href, hostname, path) {
  const h = (hostname || '').toLowerCase();
  const anchorText = (a.textContent || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const combo = anchorText + ' ' + path;
  const hasImg = !!a.querySelector('img');
  const hasTable = !!a.querySelector('table, td');

  if (SOCIAL_DOMAINS.some(d => h === d || h.endsWith('.' + d))) return '社媒';
  if (/unsubscribe|退订|opt-?out|unsub/i.test(combo)) return '退订';
  if (/privacy|terms|隐私|条款|policy|legal/i.test(combo)) return '隐私政策';
  if (/view in browser|viewonline|网页版|web version/i.test(combo)) return '查看网页版';
  if (hasImg) return '图片';
  if (hasTable || isCtaText(anchorText)) return '按钮';
  if (anchorText) return '文字';
  return '其他';
}

// 向上找最近的「块级」祖先文本，作为产品模块上下文
function getParentContextText(a) {
  let node = a.parentElement;
  let depth = 0;
  const selfText = (a.textContent || '').trim().replace(/\s+/g, ' ');
  while (node && depth < 6) {
    if (['TD', 'DIV', 'TR', 'TABLE', 'SECTION', 'ARTICLE', 'P', 'LI', 'H1', 'H2', 'H3'].includes(node.tagName)) {
      const t = (node.textContent || '').trim().replace(/\s+/g, ' ');
      if (t.length >= 10 && t !== selfText) return t.slice(0, 200);
    }
    node = node.parentElement;
    depth++;
  }
  return '';
}

function extractPrice(text) {
  const m = (text || '').match(/[$€£￥¥]\s*\d+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?\s*(?:USD|EUR|GBP|CNY)/i);
  return m ? m[0].replace(/\s+/g, '') : '';
}

// 尝试把候选值解码成 http(s) URL（支持多层 URL 编码 + base64）
function tryDecodeToUrl(raw) {
  let cur = raw;
  for (let i = 0; i < 3; i++) {
    if (/^https?:\/\//i.test(cur)) return cur;
    // base64（含 urlsafe 变体）
    if (/^[A-Za-z0-9_-]{12,}={0,2}$/.test(cur)) {
      try {
        let b64 = cur.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        const bin = atob(b64);
        const dec = new TextDecoder('utf-8').decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
        if (dec !== cur) { cur = dec; continue; }
      } catch {}
    }
    // URL 解码
    try {
      const dec = decodeURIComponent(cur);
      if (dec !== cur) { cur = dec; continue; }
    } catch {}
    break;
  }
  return /^https?:\/\//i.test(cur) ? cur : '';
}

// 从追踪链接里解析真实目标（query 参数 + 路径 + base64，大小写不敏感）
function resolveFinalTarget(href) {
  if (!href) return '';
  const candidates = [];
  try {
    const u = new URL(href.startsWith('//') ? 'http:' + href : href);
    // 1) query 参数（大小写不敏感）
    for (const [key, val] of u.searchParams.entries()) {
      if (TRACKING_PARAM_NAMES.includes(key.toLowerCase())) candidates.push(val);
    }
    // 2) 路径里可能藏了编码后的 URL（如 /r/<url>、/click/<url>）
    const path = u.pathname || '';
    const pathUrl = path.match(/(?:https?%3A%2F%2F|https?:\/\/)[^/?#]+/i);
    if (pathUrl) candidates.push(pathUrl[0]);
    // 3) 路径末段可能是 base64 编码的真实 URL
    const lastSeg = path.split('/').filter(Boolean).pop() || '';
    if (/^[A-Za-z0-9_-]{12,}={0,2}$/.test(lastSeg)) candidates.push(lastSeg);
  } catch {
    return '';
  }

  for (const c of candidates) {
    const dec = tryDecodeToUrl(c);
    if (dec) return dec;
  }
  return '';
}

// 用 DOMParser 提取所有 <a>（含图片/按钮/文字/追踪）和独立 <img>
function extractItems(html) {
  let doc;
  try {
    doc = new DOMParser().parseFromString(html, 'text/html');
  } catch {
    return [];
  }
  const items = [];

  // 1) 所有 <a> 链接（EDM 按钮/图片/文字都是 <a> 包裹）
  doc.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href') || '';
    const anchorText = (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120);
    const img = a.querySelector('img');
    const imgSrc = img?.getAttribute('src') || '';
    const imgAlt = img?.getAttribute('alt') || '';
    const imgTitle = img?.getAttribute('title') || '';
    const hostname = getHostname(href) || '';
    let path = '';
    try { path = new URL(href.startsWith('//') ? 'http:' + href : href).pathname.toLowerCase(); } catch {}
    const type = detectLinkType(a, href, hostname, path);
    const parentText = getParentContextText(a);
    items.push({
      kind: 'link', type, href, anchorText, imgSrc, imgAlt, imgTitle, parentText,
      nearbyPrice: extractPrice(parentText),
      finalTarget: resolveFinalTarget(href),
      hostname, mainDomain: hostname ? getMainDomain(hostname) : '',
      mech: classifyMechanical(href),
    });
  });

  // 2) 独立 <img>（不在 <a> 内，纯图片资源）
  doc.querySelectorAll('img').forEach(img => {
    if (img.closest('a')) return;
    const src = img.getAttribute('src') || '';
    const alt = img.getAttribute('alt') || '';
    const hostname = getHostname(src) || '';
    items.push({
      kind: 'image', type: '图片资源', href: src, anchorText: alt, imgSrc: src, imgAlt: alt,
      imgTitle: img.getAttribute('title') || '', parentText: '', nearbyPrice: '', finalTarget: '',
      hostname, mainDomain: hostname ? getMainDomain(hostname) : '',
      mech: { status: 'ok', label: '图片' },
    });
  });

  return items;
}

function extractCodes(html) {
  const text = html.replace(/<[^>]+>/g, ' ');
  const re = /\b(?:code|promo|coupon|discount|use|apply)[:\s]+([A-Z0-9][A-Z0-9\-]{2,24})\b/gi;
  const codes = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const c = m[1].toUpperCase();
    if (!codes.includes(c)) codes.push(c);
  }
  return codes;
}

// 从纯文本版里提取所有 URL（很多 ESP 在 text/plain 里保留真实网址）
function extractPlainUrls(plainText) {
  if (!plainText) return [];
  const urls = [];
  const re = /https?:\/\/[^\s<>"'\\)\]]+/gi;
  let m;
  while ((m = re.exec(plainText)) !== null) {
    const u = m[0].replace(/[),.;:，。；：]+$/, '');
    if (u && !urls.includes(u)) urls.push(u);
  }
  return urls;
}

function checkPromoCode(html, expectedCode) {
  const extracted = extractCodes(html);
  if (!expectedCode || !expectedCode.trim()) {
    return { checked: false, expected: '', found: null, extractedCodes: extracted, issues: [] };
  }
  const norm = expectedCode.trim().toUpperCase();
  const inText = extracted.includes(norm);
  const inUrl = /[?&](code|coupon|promo|discount)=/i.test(html) && html.toUpperCase().includes(norm);
  const found = extracted.includes(norm) || html.toUpperCase().includes(norm);
  const issues = [];
  if (!found) issues.push(`未在邮件中找到优惠码「${expectedCode.trim()}」——请确认已写入正文或链接参数`);
  else if (!inText && !inUrl) issues.push(`优惠码「${expectedCode.trim()}」仅以普通文字出现，建议同时在结算链接参数中带上`);
  return { checked: true, expected: expectedCode.trim(), found, extractedCodes: extracted, issues };
}

// 信息一致性粗查：折扣力度 / 日期是否出现多个冲突值
function scanInfoConsistency(html) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const issues = [];
  const pctRe = /(\d{1,3})\s*%/g;
  const pcts = new Set();
  let m;
  while ((m = pctRe.exec(text)) !== null) pcts.add(m[1] + '%');
  if (pcts.size > 1) issues.push(`出现多个不同折扣力度：${[...pcts].join('、')}（确认是否矛盾）`);

  const cnDateRe = /\d{1,2}\s*月\s*\d{1,2}\s*日/g;
  const enDateRe = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\b/gi;
  const dates = new Set();
  while ((m = cnDateRe.exec(text)) !== null) dates.add(m[0].replace(/\s+/g, ''));
  while ((m = enDateRe.exec(text)) !== null) dates.add(m[0]);
  if (dates.size > 1) issues.push(`出现多个不同日期：${[...dates].join('、')}（确认活动截止时间）`);

  return { issues, pcts: [...pcts], dates: [...dates] };
}

// ── .eml 解析（递归处理嵌套 multipart）──
function parseHeaders(headerText) {
  const headers = {};
  let lastName = null;
  headerText.split('\n').forEach(line => {
    if (/^[ \t]/.test(line) && lastName) { headers[lastName] += ' ' + line.trim(); return; }
    const idx = line.indexOf(':');
    if (idx > 0) { lastName = line.slice(0, idx).trim().toLowerCase(); headers[lastName] = line.slice(idx + 1).trim(); }
  });
  return headers;
}

function getCharset(contentType) {
  const m = (contentType || '').match(/charset=["']?([^;"'\s]+)/i);
  return m ? m[1].toLowerCase() : 'utf-8';
}

function decodeBytes(bytes, charset) {
  try {
    return new TextDecoder(charset).decode(Uint8Array.from(bytes));
  } catch {
    try { return new TextDecoder('utf-8').decode(Uint8Array.from(bytes)); }
    catch { return String.fromCharCode.apply(null, bytes); }
  }
}

function decodeMimeWord(s) {
  if (!s) return '';
  return s.replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_m, charset, enc, data) => {
    try {
      if (enc.toLowerCase() === 'b') {
        const bin = atob(data.replace(/\s+/g, ''));
        return decodeBytes(Uint8Array.from(bin, c => c.charCodeAt(0)), charset || 'utf-8');
      }
      return data.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    } catch {
      return data;
    }
  });
}

function decodeBase64(s, charset = 'utf-8') {
  try {
    const bin = atob(s.replace(/\s+/g, ''));
    return decodeBytes(Uint8Array.from(bin, c => c.charCodeAt(0)), charset);
  } catch {
    return s;
  }
}

function decodeQuotedPrintable(s, charset = 'utf-8') {
  const noSoft = s.replace(/=\r?\n/g, '');
  const bytes = [];
  for (let i = 0; i < noSoft.length; i++) {
    if (noSoft[i] === '=' && i + 2 < noSoft.length && /^[0-9A-Fa-f]{2}$/.test(noSoft.slice(i + 1, i + 3))) {
      bytes.push(parseInt(noSoft.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(noSoft.charCodeAt(i));
    }
  }
  return decodeBytes(bytes, charset);
}

function decodeByEncoding(content, enc, charset) {
  if (enc.includes('base64')) return decodeBase64(content, charset);
  if (enc.includes('quoted-printable')) return decodeQuotedPrintable(content, charset);
  return content;
}

function walkMime(body, contentType, transferEncoding, out) {
  const ct = contentType || '';
  const enc = (transferEncoding || '').toLowerCase();
  const boundaryMatch = ct.match(/boundary=["']?([^;"']+)/i);
  const boundary = boundaryMatch ? boundaryMatch[1] : null;

  if (boundary) {
    const delim = '--' + boundary;
    const parts = body.split(delim);
    for (const part of parts) {
      const t = part.trim();
      if (!t || t === '--') continue; // 空段或结束分隔符
      const partHeaderEnd = part.search(/\n\n/);
      if (partHeaderEnd < 0) continue;
      const partHeader = part.slice(0, partHeaderEnd);
      const partBody = part.slice(partHeaderEnd + 2);
      const ph = parseHeaders(partHeader);
      walkMime(partBody, ph['content-type'] || '', ph['content-transfer-encoding'] || '', out);
    }
    return;
  }

  // 叶子 part
  const charset = getCharset(ct);
  const decoded = decodeByEncoding(body.replace(/^\n/, ''), enc, charset);
  if (/text\/html/i.test(ct)) {
    if (!out.htmlBody) out.htmlBody = decoded;
  } else if (/text\/plain/i.test(ct)) {
    if (!out.plainBody) out.plainBody = decoded;
  } else if (!ct) {
    if (/<[a-z][^>]*>/i.test(decoded)) { if (!out.htmlBody) out.htmlBody = decoded; }
    else { if (!out.plainBody) out.plainBody = decoded; }
  }
}

function parseEml(raw) {
  const text = (raw || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const headerEnd = text.search(/\n\n/);
  const headerText = headerEnd >= 0 ? text.slice(0, headerEnd) : text;
  const bodyText = headerEnd >= 0 ? text.slice(headerEnd + 2) : '';

  const headers = parseHeaders(headerText);
  const out = { htmlBody: '', plainBody: '' };
  walkMime(bodyText, headers['content-type'] || '', headers['content-transfer-encoding'] || '', out);

  return {
    subject: decodeMimeWord(headers['subject'] || ''),
    from: decodeMimeWord(headers['from'] || ''),
    htmlBody: out.htmlBody,
    plainBody: out.plainBody,
  };
}

export default function HtmlAudit() {
  const [html, setHtml] = useState('');
  const [subject, setSubject] = useState('');
  const [from, setFrom] = useState('');
  const [plainText, setPlainText] = useState('');
  const [fileName, setFileName] = useState('');
  const [targetDomain, setTargetDomain] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [ai, setAi] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [debug, setDebug] = useState(null);
  const fileInputRef = useRef(null);

  const items = useMemo(() => html.trim() ? extractItems(html) : [], [html]);

  const linkCounts = useMemo(() => {
    const links = items.filter(it => it.kind === 'link');
    const count = (t) => links.filter(l => l.type === t).length;
    return {
      total: links.length,
      image: count('图片'),
      button: count('按钮'),
      text: count('文字'),
      social: count('社媒'),
      unsub: count('退订'),
      privacy: count('隐私政策'),
      browser: count('查看网页版'),
      other: count('其他'),
    };
  }, [items]);

  const mainDomains = useMemo(() => [...new Set(items.map(it => it.mainDomain).filter(Boolean))], [items]);

  const finalDomains = useMemo(() => {
    const s = new Set();
    items.forEach(it => {
      if (it.finalTarget) {
        const h = getHostname(it.finalTarget);
        if (h) s.add(getMainDomain(h));
      }
    });
    return [...s];
  }, [items]);

  const mechanicalIssues = useMemo(() => {
    const issues = [];
    const links = items.filter(it => it.kind === 'link');
    const count = (s) => links.filter(l => l.mech.status === s);
    if (count('empty').length) issues.push(`有 ${count('empty').length} 个空链接（href 为空）`);
    if (count('hash').length) issues.push(`有 ${count('hash').length} 个「#」占位链接未替换`);
    if (count('variable').length) issues.push(`有 ${count('variable').length} 个链接含未替换变量（如 {{ product.url }}、{link}、[url]）`);
    if (count('test').length) issues.push(`有 ${count('test').length} 个测试/preview/localhost 链接`);
    if (count('relative').length) issues.push(`有 ${count('relative').length} 个相对路径链接（邮件中需用绝对 URL）`);
    if (count('invalid').length) issues.push(`有 ${count('invalid').length} 个无法解析的链接`);
    return issues;
  }, [items]);

  const promoAudit = useMemo(() => html.trim() ? checkPromoCode(html, promoCode) : null, [html, promoCode]);
  const infoScan = useMemo(() => html.trim() ? scanInfoConsistency(html) : null, [html]);

  // 纯文本版里的真实链接（排除 mamba 等追踪域名）
  const plainRealUrls = useMemo(() => {
    return extractPlainUrls(plainText).filter(u => {
      const h = getHostname(u);
      const main = h ? getMainDomain(h) : '';
      return !main.includes('mambasendtrack') && !main.includes('mamba');
    });
  }, [plainText]);

  const itemsSummary = useMemo(() => {
    if (!items.length) return '';
    return items.map((it, i) => {
      if (it.kind === 'image') return `[${i + 1}] 图片资源 alt="${it.anchorText || ''}" → ${it.href}`;
      const parts = [`${it.type}链接`];
      if (it.anchorText) parts.push(`文本:"${it.anchorText}"`);
      if (it.imgAlt) parts.push(`图片alt:"${it.imgAlt}"`);
      if (it.parentText) parts.push(`附近文本:"${it.parentText.slice(0, 80)}"`);
      if (it.mech.status !== 'ok') parts.push(`⚠️${it.mech.label}`);
      parts.push(`href=${it.href}`);
      if (it.finalTarget && it.finalTarget !== it.href) parts.push(`最终目标=${it.finalTarget}`);
      return `[${i + 1}] ${parts.join(' | ')}`;
    }).join('\n');
  }, [items]);

  const canRun = html.trim().length > 0;

  const handleFile = async (file) => {
    if (!file) return;
    const name = file.name || '';
    const lower = name.toLowerCase();
    setError(null); setAi(null);
    try {
      const text = await file.text();
      if (lower.endsWith('.html') || lower.endsWith('.htm')) {
        setHtml(text); setSubject(''); setFrom(''); setPlainText('');
        setDebug({ htmlFound: true, htmlChars: text.length, isEml: false });
      } else if (lower.endsWith('.eml')) {
        const eml = parseEml(text);
        setSubject(eml.subject || ''); setFrom(eml.from || '');
        setPlainText(eml.plainBody || '');
        setHtml(eml.htmlBody || eml.plainBody || '');
        setDebug({ htmlFound: !!(eml.htmlBody && eml.htmlBody.trim()), htmlChars: (eml.htmlBody || '').length, isEml: true });
      } else if (/<[a-z][^>]*>/i.test(text)) {
        setHtml(text); setSubject(''); setFrom(''); setPlainText('');
        setDebug({ htmlFound: true, htmlChars: text.length, isEml: false });
      } else {
        const eml = parseEml(text);
        setSubject(eml.subject || ''); setFrom(eml.from || '');
        setPlainText(eml.plainBody || '');
        setHtml(eml.htmlBody || eml.plainBody || text);
        setDebug({ htmlFound: !!(eml.htmlBody && eml.htmlBody.trim()), htmlChars: (eml.htmlBody || '').length, isEml: true });
      }
      setFileName(name);
    } catch (e) {
      setError('读取文件失败：' + (e.message || e));
    }
  };

  const onDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files && e.dataTransfer.files[0]); };
  const onInputChange = (e) => { handleFile(e.target.files && e.target.files[0]); e.target.value = ''; };

  const handleRun = async () => {
    if (!canRun) return;
    setLoading(true); setError(null); setAi(null);
    try {
      const r = await fetchHtmlAudit({ html, targetDomain: normalizeDomain(targetDomain), promoCode: promoCode.trim(), itemsSummary, subject, plainText });
      setAi(r);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const highRisk = useMemo(() => [
    ...mechanicalIssues,
    ...(promoAudit?.issues || []),
    ...(infoScan?.issues || []),
    ...(ai?.consistency?.issues || []),
  ], [mechanicalIssues, promoAudit, infoScan, ai]);

  const verdict = useMemo(() => {
    const fatalMech = ['empty', 'hash', 'variable', 'test', 'relative'].some(s => items.some(it => it.kind === 'link' && it.mech.status === s));
    const promoMissing = promoAudit && promoAudit.checked && !promoAudit.found;
    const aiSend = ai?.verdict?.send;
    if (promoMissing || aiSend === 'no') return { send: 'no', reason: ai?.verdict?.reason || '存在严重问题（优惠码缺失/产品跳错/坏链接），请修复后再发送' };
    if (fatalMech || aiSend === 'caution') return { send: 'caution', reason: ai?.verdict?.reason || '存在需修复的问题，建议优化后再发送' };
    if (ai) return { send: aiSend || 'yes', reason: ai?.verdict?.reason || '' };
    return null;
  }, [items, promoAudit, ai]);

  const priorities = useMemo(() => {
    const p0 = [], p1 = [], p2 = [];
    const productCount = ai?.productIssues?.length || 0;
    if (productCount) p0.push(`修复 ${productCount} 处产品链接跳转/不匹配（见「产品链接匹配检查」）`);
    if (mechanicalIssues.length) p0.push(...mechanicalIssues);
    if (promoAudit?.checked && !promoAudit.found) p0.push(`写入优惠码「${promoAudit.expected}」`);
    if (ai) {
      if (ai.consistency?.issues?.length) p1.push(...ai.consistency.issues.map(s => '核对：' + s));
      if (ai.spelling?.issues?.length) p1.push(`修复拼写/语法问题（${ai.spelling.issues.length} 处）`);
      if (ai.copy?.issues?.length) p2.push(`优化文案/CTA（${ai.copy.issues.length} 处）`);
      if (ai.design?.issues?.length) p2.push(`优化设计/排版（${ai.design.issues.length} 处）`);
    }
    if (infoScan?.issues?.length) p1.push(...infoScan.issues.map(s => '核对信息：' + s));
    return { p0, p1, p2 };
  }, [ai, mechanicalIssues, promoAudit, infoScan]);

  return (
    <div className="card html-audit-card">
      <h2>🧪 邮件文件审核</h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
        上传 .eml 或 .html 测试邮件，系统检查产品链接匹配、拼写语法、优惠码/价格/日期，并调用 AI 给出 EDM 优化建议。
      </p>

      {/* 上传区域 */}
      <div
        className={`html-audit-dropzone${dragOver ? ' drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
      >
        <input ref={fileInputRef} type="file" accept=".eml,.html,.htm" style={{ display: 'none' }} onChange={onInputChange} />
        <div className="dropzone-icon">📎</div>
        <div className="dropzone-text">{fileName ? `已上传：${fileName}` : '拖拽 .eml / .html 文件到这里，或点击选择'}</div>
        <div className="dropzone-hint">.eml 自动解析 HTML/纯文本正文与主题；.html 直接作为邮件 HTML</div>
      </div>

      {(subject || from) && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.6 }}>
          {subject && <div><strong>主题：</strong>{subject}</div>}
          {from && <div><strong>发件人：</strong>{from}</div>}
        </div>
      )}

      {/* 调试信息 */}
      {debug && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <strong style={{ color: 'var(--text)' }}>🔎 解析信息</strong>
          <div>HTML 解析：{debug.htmlFound ? '✅ 成功' : '⚠️ 未找到 text/html（可能只有纯文本）'}</div>
          <div>HTML 字符数：{debug.htmlChars.toLocaleString()}</div>
          <div>&lt;a href&gt; 链接数：<strong>{linkCounts.total}</strong>（图片 {linkCounts.image} · 按钮 {linkCounts.button} · 文字 {linkCounts.text} · 社媒 {linkCounts.social} · 退订 {linkCounts.unsub} · 隐私 {linkCounts.privacy} · 网页版 {linkCounts.browser} · 其他 {linkCounts.other}）</div>
        </div>
      )}

      <div className="html-audit-meta">
        <input type="text" className="score-input" aria-label="目标主域名" placeholder="目标主域名（仅参考），如 example.com" value={targetDomain} onChange={e => setTargetDomain(e.target.value)} />
        <input type="text" className="score-input" aria-label="本次优惠码" placeholder="本次优惠码，如 SUMMER20" value={promoCode} onChange={e => setPromoCode(e.target.value)} />
      </div>

      <details style={{ marginBottom: 10 }}>
        <summary style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>或手动粘贴 HTML（.eml 请用上方上传）</summary>
        <textarea
          className="score-textarea"
          aria-label="EDM HTML"
          placeholder="在此粘贴完整 EDM HTML 源码..."
          value={html}
          onChange={e => { setHtml(e.target.value); setSubject(''); setFrom(''); setPlainText(''); setDebug(null); }}
          rows={5}
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 12, marginTop: 8 }}
        />
      </details>

      <div className="html-audit-actions">
        <button className="btn btn-primary" disabled={loading || !canRun} onClick={handleRun}>
          {loading ? '审核中...' : '🔍 开始审核'}
        </button>
        {items.length > 0 && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            已提取 {items.length} 个链接/图片{mainDomains.length > 0 ? ` · ${mainDomains.length} 个主域名` : ''}
          </span>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 10, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 13, color: '#b91c1c' }}>
          ⚠️ {error}
        </div>
      )}

      {/* iframe 预览 */}
      {html.trim() && (
        <div className="html-audit-preview">
          <div className="html-audit-preview-bar">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
            <span style={{ marginLeft: 8 }}>邮件预览（iframe）</span>
          </div>
          <iframe srcDoc={html} title="EDM 预览" sandbox="allow-same-origin" style={{ width: '100%', height: 480, border: 'none', background: '#fff', display: 'block' }} />
        </div>
      )}

      {/* ── 审核报告 ── */}

      {/* 总结：是否建议发送 */}
      {verdict && (
        <div className={`html-audit-verdict verdict-${verdict.send}`}>
          <span className="verdict-icon">{verdict.send === 'yes' ? '✅' : verdict.send === 'caution' ? '⚠️' : '🚫'}</span>
          <div>
            <strong>{verdict.send === 'yes' ? '建议发送' : verdict.send === 'caution' ? '谨慎发送（建议修复后发送）' : '不建议发送'}</strong>
            {verdict.reason && <div style={{ fontSize: 12, marginTop: 2, opacity: 0.85 }}>{verdict.reason}</div>}
          </div>
        </div>
      )}

      {/* 产品链接匹配检查 */}
      {ai && (
        <div className="score-section">
          <h3 className="score-section-title warn">产品链接匹配检查</h3>
          {ai.productIssues?.length > 0 ? (
            ai.productIssues.map((p, i) => (
              <div key={i} className={`product-issue${/人工确认/.test(p.location || '') ? ' product-issue-warn' : ''}`}>
                <div className="product-issue-row"><strong>📍 位置：</strong>{p.location || '—'}</div>
                <div className="product-issue-row"><strong>🔍 显示：</strong>{p.display || '—'}</div>
                <div className="product-issue-row"><strong>🎯 当前指向：</strong>{p.target || '—'}</div>
                <div className="product-issue-row"><strong>⚠️ 风险：</strong>{p.risk || '—'}</div>
                <div className="product-issue-row"><strong>✅ 建议：</strong>{p.suggestion || '—'}</div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: 12, color: '#059669' }}>✅ 未发现产品链接跳转/不匹配问题</div>
          )}
        </div>
      )}

      {/* 高风险问题 */}
      {highRisk.length > 0 && (
        <div className="score-section">
          <h3 className="score-section-title warn">高风险问题</h3>
          <ul className="score-list">{highRisk.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}

      {/* 链接分类 */}
      {items.length > 0 && (
        <div className="score-section">
          <h3 className="score-section-title">链接分类（{linkCounts.total} 个链接）</h3>
          <table className="link-list">
            <thead>
              <tr><th style={{ width: 34 }}>#</th><th style={{ width: 92 }}>类型</th><th style={{ width: 84 }}>状态</th><th>内容 / 链接</th></tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td><span className="cat-badge" style={{ color: TYPE_COLORS[it.type] || '#64748b' }}>{it.type}</span></td>
                  <td>{it.kind === 'link' && it.mech.status !== 'ok' ? <span className={`link-badge link-${it.mech.status}`}>{it.mech.label}</span> : <span className="link-badge link-ok">—</span>}</td>
                  <td>
                    <div style={{ color: 'var(--text)' }}>
                      {it.anchorText || it.imgAlt || <span style={{ color: 'var(--text-muted)' }}>(无文本)</span>}
                      {it.nearbyPrice ? <span style={{ color: 'var(--text-muted)' }}> · {it.nearbyPrice}</span> : null}
                    </div>
                    <div className="link-href">{it.href}</div>
                    {it.finalTarget && it.finalTarget !== it.href && (
                      <div className="link-href" style={{ color: '#059669' }}>→ 最终目标：{it.finalTarget}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 纯文本版真实链接 */}
      {plainRealUrls.length > 0 && (
        <div className="score-section">
          <h3 className="score-section-title">纯文本版真实链接（从 text/plain 提取）</h3>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, wordBreak: 'break-all' }}>
            {plainRealUrls.map((u, i) => <div key={i}>🔗 {u}</div>)}
          </div>
        </div>
      )}

      {/* 主域名参考 */}
      {(mainDomains.length > 0 || finalDomains.length > 0) && (
        <div className="score-section">
          <h3 className="score-section-title">主域名参考（不参与扣分）</h3>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            {mainDomains.length > 0 && (
              <div>追踪域名：{mainDomains.map(d => <span key={d} className="cat-badge" style={{ marginRight: 6, color: '#db2777' }}>{d}</span>)}</div>
            )}
            {finalDomains.length > 0 && (
              <div style={{ marginTop: 4 }}>最终目标域名（真实产品站）：{finalDomains.map(d => <span key={d} className="cat-badge" style={{ marginRight: 6, color: '#059669' }}>{d}</span>)}</div>
            )}
          </div>
        </div>
      )}

      {/* 拼写和语法问题 */}
      {ai?.spelling && (ai.spelling.issues?.length > 0 || ai.spelling.suggestions?.length > 0) && (
        <div className="score-section">
          <h3 className="score-section-title">✏️ 拼写和语法问题</h3>
          {ai.spelling.issues?.length > 0 && <ul className="score-list">{ai.spelling.issues.map((s, i) => <li key={i}>⚠️ {s}</li>)}</ul>}
          {ai.spelling.suggestions?.length > 0 && <ul className="score-list">{ai.spelling.suggestions.map((s, i) => <li key={i}>💡 {s}</li>)}</ul>}
        </div>
      )}

      {/* 文案优化建议 */}
      {ai?.copy && (ai.copy.issues?.length > 0 || ai.copy.suggestions?.length > 0) && (
        <div className="score-section">
          <h3 className="score-section-title tip">📝 文案优化建议</h3>
          {ai.copy.issues?.length > 0 && <ul className="score-list">{ai.copy.issues.map((s, i) => <li key={i}>⚠️ {s}</li>)}</ul>}
          {ai.copy.suggestions?.length > 0 && <ul className="score-list">{ai.copy.suggestions.map((s, i) => <li key={i}>💡 {s}</li>)}</ul>}
        </div>
      )}

      {/* 邮件设计/排版建议 */}
      {ai?.design && (ai.design.issues?.length > 0 || ai.design.suggestions?.length > 0) && (
        <div className="score-section">
          <h3 className="score-section-title">🎨 邮件设计/排版建议</h3>
          {ai.design.issues?.length > 0 && <ul className="score-list">{ai.design.issues.map((s, i) => <li key={i}>⚠️ {s}</li>)}</ul>}
          {ai.design.suggestions?.length > 0 && <ul className="score-list">{ai.design.suggestions.map((s, i) => <li key={i}>💡 {s}</li>)}</ul>}
        </div>
      )}

      {/* 修复优先级 */}
      {(priorities.p0.length > 0 || priorities.p1.length > 0 || priorities.p2.length > 0) && (
        <div className="score-section">
          <h3 className="score-section-title">🔧 修复优先级</h3>
          <ol className="score-list" style={{ listStyle: 'decimal', paddingLeft: 20 }}>
            {priorities.p0.map((s, i) => <li key={'p0' + i}><strong style={{ color: '#dc2626' }}>[P0 立即]</strong> {s}</li>)}
            {priorities.p1.map((s, i) => <li key={'p1' + i}><strong style={{ color: '#b45309' }}>[P1 发送前]</strong> {s}</li>)}
            {priorities.p2.map((s, i) => <li key={'p2' + i}><strong style={{ color: '#2563eb' }}>[P2 优化]</strong> {s}</li>)}
          </ol>
        </div>
      )}

      {/* AI 原始输出（解析失败时兜底展示） */}
      {ai?.raw && (
        <div className="score-section">
          <h3 className="score-section-title">AI 原始输出</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{ai.raw}</pre>
        </div>
      )}
    </div>
  );
}
