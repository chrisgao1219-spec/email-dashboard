import { useState, useMemo, useRef } from 'react';
import { fetchHtmlAudit } from '../api';

// 疑似测试/占位链接的特征（用于机械检查，不涉及主域名）
const TEST_LINK_PATTERNS = [
  'test', 'example', 'localhost', '127.0.0.1', 'placehold', 'sample',
  'demo', 'staging', 'dev.', 'yourdomain', 'mysite', 'xxx', 'preview',
  'your-', 'fill', 'todo', 'placeholder',
];

// 未替换的模板变量（如 {{ product.url }}、{link}、%%LINK%%、[URL]、${x}）
const VARIABLE_LINK_RE = /\{\{|\}\}|\{link\}|\{url\}|\{tracking\}|\{cta\}|%%[a-z0-9_]+%%|\[(link|url|tracking|cta|href|product_url)\]|\$\{|\$[a-z_]+/i;

// 常见社媒域名
const SOCIAL_DOMAINS = ['facebook.com', 'fb.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com', 'youtube.com', 'youtu.be', 'linkedin.com', 'pinterest.com', 'snapchat.com', 'weibo.com', 'reddit.com', 'threads.net'];
// 追踪链接特征
const TRACKING_HINTS = ['track', 'click', 'redirect', 'utm_', 'mailer', 'sendgrid', 'mailchimp', 'klaviyo', 'omnisend', 'litmus', 'mandrill', 'mkt', 'esp.', 'em.', '/l/', '/r/'];

// 常见的两段式二级域名（用于正确取主域名）
const TWO_PART_TLDS = ['co.uk', 'com.au', 'com.cn', 'co.jp', 'com.br', 'co.nz', 'co.in', 'com.sg', 'com.hk', 'com.mx', 'co.kr'];

const CAT_COLORS = {
  '产品链接': '#059669', '活动页/集合页': '#2563eb', '社媒': '#7c3aed',
  '退订': '#64748b', '隐私/条款': '#64748b', '查看网页版': '#64748b',
  '图片资源': '#d97706', '追踪链接': '#db2777', '其他链接': '#64748b',
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

// 链接分类（粗分类，供展示；产品匹配的精细判断交给 AI）
function classifyCategory(kind, url, text, hostname) {
  if (kind === 'image') return '图片资源';
  const h = (hostname || '').toLowerCase();
  const t = (text || '').toLowerCase();
  let path = '';
  try { path = new URL(url.startsWith('//') ? 'http:' + url : url).pathname.toLowerCase(); } catch {}
  const combo = t + ' ' + path;
  if (SOCIAL_DOMAINS.some(d => h === d || h.endsWith('.' + d))) return '社媒';
  if (/unsubscribe|退订|opt-?out|unsub/i.test(combo)) return '退订';
  if (/privacy|terms|隐私|条款|policy|legal/i.test(combo)) return '隐私/条款';
  if (/view in browser|viewonline|网页版|web version|view-online/i.test(combo)) return '查看网页版';
  if (TRACKING_HINTS.some(k => h.includes(k) || url.toLowerCase().includes(k))) return '追踪链接';
  if (/\/products?\/|\/dp\/|\/product-|\/item\//i.test(path)) return '产品链接';
  if (/\/collections?\/|\/category\/|\/pages\/|\/campaign|\/sale|\/promo|\/shop\b/i.test(path)) return '活动页/集合页';
  return '其他链接';
}

// 用 DOMParser 提取所有 <a> 和 <img>（保持文档顺序 + 锚文本/alt）
function extractItems(html) {
  let doc;
  try {
    doc = new DOMParser().parseFromString(html, 'text/html');
  } catch {
    return [];
  }
  const items = [];
  doc.querySelectorAll('a, img').forEach(el => {
    const kind = el.tagName === 'IMG' ? 'image' : 'link';
    const url = kind === 'image' ? (el.getAttribute('src') || '') : (el.getAttribute('href') || '');
    let text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    if (kind === 'link' && !text) {
      const img = el.querySelector('img');
      text = (img?.getAttribute('alt') || '').slice(0, 80);
    }
    if (kind === 'image') text = (el.getAttribute('alt') || '').slice(0, 80);
    items.push({ kind, url, text });
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

// ── .eml 解析 ──
function decodeMimeWord(s) {
  if (!s) return '';
  return s.replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_m, _charset, enc, data) => {
    try {
      if (enc.toLowerCase() === 'b') {
        const bin = atob(data.replace(/\s+/g, ''));
        return new TextDecoder('utf-8').decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
      }
      return data.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    } catch {
      return data;
    }
  });
}

function decodeBase64(s) {
  try {
    const bin = atob(s.replace(/\s+/g, ''));
    return new TextDecoder('utf-8').decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
  } catch {
    return s;
  }
}

function decodeQuotedPrintable(s) {
  return s.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function parseEml(raw) {
  const text = (raw || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const headerEnd = text.search(/\n\n/);
  const headerText = headerEnd >= 0 ? text.slice(0, headerEnd) : text;
  const bodyText = headerEnd >= 0 ? text.slice(headerEnd + 2) : '';

  const headers = {};
  let lastName = null;
  headerText.split('\n').forEach(line => {
    if (/^[ \t]/.test(line) && lastName) { headers[lastName] += ' ' + line.trim(); return; }
    const idx = line.indexOf(':');
    if (idx > 0) { lastName = line.slice(0, idx).trim().toLowerCase(); headers[lastName] = line.slice(idx + 1).trim(); }
  });

  const contentType = headers['content-type'] || '';
  const transferEncoding = (headers['content-transfer-encoding'] || '').toLowerCase();
  const boundaryMatch = contentType.match(/boundary=["']?([^;"']+)/i);
  const boundary = boundaryMatch ? boundaryMatch[1] : null;

  const decodeByEncoding = (content, enc) => {
    if (enc.includes('base64')) return decodeBase64(content);
    if (enc.includes('quoted-printable')) return decodeQuotedPrintable(content);
    return content;
  };

  let htmlBody = '';
  let plainBody = '';

  if (boundary) {
    const segments = bodyText.split('--' + boundary);
    for (const seg of segments) {
      const trimmed = seg.trim();
      if (!trimmed || trimmed === '--') continue;
      const partHeaderEnd = seg.search(/\n\n/);
      if (partHeaderEnd < 0) continue;
      const partHeader = seg.slice(0, partHeaderEnd);
      const partBody = seg.slice(partHeaderEnd + 2);
      const partContentType = (partHeader.match(/content-type:\s*([^\n]+)/i) || [])[1] || '';
      const partEncoding = ((partHeader.match(/content-transfer-encoding:\s*([^\n]+)/i) || [])[1] || '').toLowerCase();
      const content = decodeByEncoding(partBody.replace(/^\n/, ''), partEncoding);
      if (/text\/html/i.test(partContentType) && !htmlBody) htmlBody = content;
      else if (/text\/plain/i.test(partContentType) && !plainBody) plainBody = content;
    }
  } else {
    const content = decodeByEncoding(bodyText.replace(/^\n/, ''), transferEncoding);
    if (/text\/html/i.test(contentType)) htmlBody = content;
    else if (/text\/plain/i.test(contentType)) plainBody = content;
    else if (/<[a-z][^>]*>/i.test(content)) htmlBody = content;
    else plainBody = content;
  }

  return { subject: decodeMimeWord(headers['subject'] || ''), from: decodeMimeWord(headers['from'] || ''), htmlBody, plainBody };
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
  const fileInputRef = useRef(null);

  // 结构化提取 + 机械检查 + 粗分类
  const items = useMemo(() => {
    if (!html.trim()) return [];
    return extractItems(html).map(it => {
      const mech = it.kind === 'link' ? classifyMechanical(it.url) : { status: 'ok', label: '图片' };
      const hostname = getHostname(it.url) || '';
      const mainDomain = hostname ? getMainDomain(hostname) : '';
      const category = classifyCategory(it.kind, it.url, it.text, hostname);
      return { ...it, mech, hostname, mainDomain, category };
    });
  }, [html]);

  const mainDomains = useMemo(() => [...new Set(items.map(it => it.mainDomain).filter(Boolean))], [items]);

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

  const itemsSummary = useMemo(() => {
    if (!items.length) return '';
    return items.map((it, i) => {
      const flag = it.kind === 'link' && it.mech.status !== 'ok' ? `  ⚠️${it.mech.label}` : '';
      const prefix = it.kind === 'image' ? `图片 alt="${it.text}"` : `链接 "${it.text}"`;
      return `[${i + 1}] ${prefix} → ${it.url}${flag}`;
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
      } else if (lower.endsWith('.eml')) {
        const eml = parseEml(text);
        setSubject(eml.subject || ''); setFrom(eml.from || '');
        setPlainText(eml.plainBody || ''); setHtml(eml.htmlBody || eml.plainBody || '');
      } else if (/<[a-z][^>]*>/i.test(text)) {
        setHtml(text); setSubject(''); setFrom(''); setPlainText('');
      } else {
        const eml = parseEml(text);
        setSubject(eml.subject || ''); setFrom(eml.from || '');
        setPlainText(eml.plainBody || ''); setHtml(eml.htmlBody || eml.plainBody || text);
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
          onChange={e => { setHtml(e.target.value); setSubject(''); setFrom(''); setPlainText(''); }}
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
          <h3 className="score-section-title">链接分类</h3>
          <table className="link-list">
            <thead>
              <tr><th style={{ width: 34 }}>#</th><th style={{ width: 110 }}>分类</th><th style={{ width: 90 }}>状态</th><th>链接 / 文本</th></tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td><span className="cat-badge" style={{ color: CAT_COLORS[it.category] || '#64748b' }}>{it.category}</span></td>
                  <td>{it.kind === 'link' && it.mech.status !== 'ok' ? <span className={`link-badge link-${it.mech.status}`}>{it.mech.label}</span> : <span className="link-badge link-ok">—</span>}</td>
                  <td>
                    <div style={{ color: 'var(--text)' }}>{it.text || <span style={{ color: 'var(--text-muted)' }}>(无文本)</span>}</div>
                    <div className="link-href">{it.url}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 主域名参考 */}
      {mainDomains.length > 0 && (
        <div className="score-section">
          <h3 className="score-section-title">主域名参考（不参与扣分）</h3>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {mainDomains.map(d => <span key={d} className="cat-badge" style={{ marginRight: 6, color: '#64748b' }}>{d}</span>)}
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
