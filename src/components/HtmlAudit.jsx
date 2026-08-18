import { useState, useMemo, useRef } from 'react';
import { fetchHtmlAudit } from '../api';

// 疑似测试/占位链接的特征
const TEST_LINK_PATTERNS = [
  'test', 'example', 'localhost', '127.0.0.1', 'placehold', 'sample',
  'demo', 'staging', 'dev.', 'yourdomain', 'mysite', 'xxx', 'preview',
  'your-', 'fill', 'todo', 'placeholder',
];

// 未替换的模板变量（如 {{url}}、{link}、%%LINK%%、[URL]、${x}）
const VARIABLE_LINK_RE = /\{\{|\}\}|\{link\}|\{url\}|\{tracking\}|\{cta\}|%%[a-z0-9_]+%%|\[(link|url|tracking|cta|href)\]|\$\{|\$[a-z_]+/i;

// 常见的两段式二级域名（用于正确取主域名）
const TWO_PART_TLDS = ['co.uk', 'com.au', 'com.cn', 'co.jp', 'com.br', 'co.nz', 'co.in', 'com.sg', 'com.hk', 'com.mx', 'co.kr'];

// 归一化目标域名 → 主域名（去掉协议、www、路径）
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

// 由 hostname 取主域名（brand.com、brand.co.uk）
function getMainDomain(hostname) {
  const parts = (hostname || '').toLowerCase().replace(/^www\./, '').split('.');
  if (parts.length <= 2) return parts.join('.');
  const lastTwo = parts.slice(-2).join('.');
  if (TWO_PART_TLDS.includes(lastTwo) && parts.length >= 3) return parts.slice(-3).join('.');
  return lastTwo;
}

function getHostname(url) {
  try {
    return new URL(url.startsWith('//') ? 'http:' + url : url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

// 提取所有 <a href> 和 <img src>
function extractUrls(html) {
  const urls = [];
  const hrefRe = /href\s*=\s*["']([^"']*)["']/gi;
  let m;
  while ((m = hrefRe.exec(html)) !== null) {
    const url = m[1].trim();
    if (url && !urls.some(u => u.url === url && u.type === 'link')) urls.push({ url, type: 'link' });
  }
  const srcRe = /<img[^>]+src\s*=\s*["']([^"']*)["']/gi;
  while ((m = srcRe.exec(html)) !== null) {
    const url = m[1].trim();
    if (url && !urls.some(u => u.url === url && u.type === 'image')) urls.push({ url, type: 'image' });
  }
  return urls;
}

function classifyLink(url, targetMain) {
  if (!url) return { status: 'empty', label: '空链接' };
  if (url === '#' || url.startsWith('#')) return { status: 'hash', label: '锚点/占位' };
  if (/^(mailto:|tel:|sms:|data:)/i.test(url)) return { status: 'ok', label: '非网页链接' };
  if (VARIABLE_LINK_RE.test(url)) return { status: 'variable', label: '未替换变量' };
  const lower = url.toLowerCase();
  if (TEST_LINK_PATTERNS.some(p => lower.includes(p))) return { status: 'test', label: '测试/预览/本地' };
  if (url.startsWith('/') || (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url) && !url.startsWith('//'))) {
    return { status: 'relative', label: '相对路径' };
  }
  const hostname = getHostname(url);
  if (!hostname) return { status: 'invalid', label: '无法解析' };
  const mainDomain = getMainDomain(hostname);
  if (targetMain && mainDomain !== targetMain) return { status: 'mismatch', label: '主域名不一致', hostname, mainDomain };
  return { status: 'ok', label: '正常', hostname, mainDomain };
}

function auditLinks(html, targetDomain) {
  const targetMain = targetDomain ? getMainDomain(targetDomain) : '';
  const links = extractUrls(html).map(({ url, type }) => {
    const c = classifyLink(url, targetMain);
    return { href: url, type, ...c };
  });
  const mainDomains = [...new Set(links.map(l => l.mainDomain).filter(Boolean))];
  const count = (s) => links.filter(l => l.status === s);
  const issues = [];
  if (count('empty').length) issues.push(`有 ${count('empty').length} 个空链接（href/src 为空）`);
  if (count('hash').length) issues.push(`有 ${count('hash').length} 个「#」占位链接未替换`);
  if (count('variable').length) issues.push(`有 ${count('variable').length} 个链接包含未替换的模板变量`);
  if (count('test').length) issues.push(`有 ${count('test').length} 个测试/预览/localhost 链接`);
  if (count('relative').length) issues.push(`有 ${count('relative').length} 个相对路径链接（邮件中需用绝对 URL）`);
  if (count('invalid').length) issues.push(`有 ${count('invalid').length} 个无法解析的链接`);
  if (targetMain && count('mismatch').length) issues.push(`${count('mismatch').length} 个链接主域名与目标「${targetMain}」不一致`);
  if (mainDomains.length > 1) issues.push(`出现 ${mainDomains.length} 个不同主域名：${mainDomains.join('、')}`);
  return { links, mainDomains, issues, unified: mainDomains.length <= 1 };
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

  const linkAudit = useMemo(() => html.trim() ? auditLinks(html, normalizeDomain(targetDomain)) : null, [html, targetDomain]);
  const promoAudit = useMemo(() => html.trim() ? checkPromoCode(html, promoCode) : null, [html, promoCode]);
  const infoScan = useMemo(() => html.trim() ? scanInfoConsistency(html) : null, [html]);

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
      const linkSummary = linkAudit
        ? `共 ${linkAudit.links.length} 个链接（含图片）；主域名：${linkAudit.mainDomains.length ? linkAudit.mainDomains.join('、') : '未识别到'}；问题：${linkAudit.issues.length ? linkAudit.issues.join('；') : '无'}`
        : '';
      const r = await fetchHtmlAudit({ html, targetDomain: normalizeDomain(targetDomain), promoCode: promoCode.trim(), linkSummary, subject, plainText });
      setAi(r);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const highRisk = useMemo(() => [
    ...(linkAudit?.issues || []),
    ...(promoAudit?.issues || []),
    ...(infoScan?.issues || []),
    ...(ai?.consistency?.issues || []),
  ], [linkAudit, promoAudit, infoScan, ai]);

  const verdict = useMemo(() => {
    const fatal = linkAudit && linkAudit.links.some(l => ['empty', 'hash', 'variable', 'test', 'invalid', 'mismatch', 'relative'].includes(l.status));
    const promoMissing = promoAudit && promoAudit.checked && !promoAudit.found;
    const aiSend = ai?.verdict?.send;
    if (fatal || promoMissing || aiSend === 'no') return { send: 'no', reason: ai?.verdict?.reason || '存在高危问题（坏链接/占位链接/未替换变量/优惠码缺失），请修复后再发送' };
    if (aiSend === 'caution' || highRisk.length > 0) return { send: 'caution', reason: ai?.verdict?.reason || '存在需修复的问题，建议优化后再发送' };
    if (ai) return { send: aiSend || 'yes', reason: ai?.verdict?.reason || '' };
    return null;
  }, [linkAudit, promoAudit, highRisk, ai]);

  const priorities = useMemo(() => {
    const p0 = [], p1 = [], p2 = [];
    if (linkAudit) {
      const fatal = linkAudit.links.filter(l => ['empty', 'hash', 'variable', 'test', 'invalid', 'mismatch', 'relative'].includes(l.status));
      if (fatal.length) p0.push(`修复 ${fatal.length} 个坏链接/占位链接/未替换变量（见下方链接清单）`);
      if (linkAudit.mainDomains.length > 1) p1.push(`统一链接主域名（当前 ${linkAudit.mainDomains.length} 个：${linkAudit.mainDomains.join('、')}）`);
    }
    if (promoAudit && promoAudit.checked && !promoAudit.found) p0.push(`写入优惠码「${promoAudit.expected}」到正文或链接参数`);
    if (infoScan?.issues?.length) p1.push(...infoScan.issues.map(s => '核对信息：' + s));
    if (ai) {
      if (ai.spelling?.issues?.length) p1.push(`修复拼写/语法问题（${ai.spelling.issues.length} 处）`);
      if (ai.copy?.issues?.length) p2.push(`优化文案/CTA（${ai.copy.issues.length} 处）`);
      if (ai.design?.issues?.length) p2.push(`优化设计/排版（${ai.design.issues.length} 处）`);
    }
    return { p0, p1, p2 };
  }, [linkAudit, promoAudit, infoScan, ai]);

  return (
    <div className="card html-audit-card">
      <h2>🧪 邮件文件审核</h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
        上传 .eml 或 .html 测试邮件，系统自动检查拼写语法、链接一致性、优惠码/价格/日期，并调用 AI 给出 EDM 优化建议。
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
        <input type="text" className="score-input" aria-label="目标主域名" placeholder="目标主域名，如 example.com" value={targetDomain} onChange={e => setTargetDomain(e.target.value)} />
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
        {linkAudit && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            已提取 {linkAudit.links.length} 个链接（含图片）{linkAudit.mainDomains.length > 0 ? ` · ${linkAudit.mainDomains.length} 个主域名` : ''}
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

      {/* 高风险问题 */}
      {highRisk.length > 0 && (
        <div className="score-section">
          <h3 className="score-section-title warn">高风险问题</h3>
          <ul className="score-list">{highRisk.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}

      {/* 链接一致性检查 */}
      {linkAudit && (
        <div className="score-section">
          <h3 className="score-section-title">链接一致性检查</h3>
          {linkAudit.mainDomains.length > 0 && (
            <div style={{ fontSize: 12, color: linkAudit.mainDomains.length > 1 ? '#dc2626' : '#059669', marginBottom: 8 }}>
              {linkAudit.mainDomains.length > 1
                ? `⚠️ 出现 ${linkAudit.mainDomains.length} 个不同主域名：${linkAudit.mainDomains.join('、')}`
                : `✅ 主域名统一：${linkAudit.mainDomains[0]}`}
            </div>
          )}
          {linkAudit.links.length > 0 && (
            <table className="link-list">
              <thead>
                <tr><th style={{ width: 90 }}>状态</th><th style={{ width: 52 }}>类型</th><th style={{ width: 160 }}>主域名</th><th>链接</th></tr>
              </thead>
              <tbody>
                {linkAudit.links.map((l, i) => (
                  <tr key={i}>
                    <td><span className={`link-badge link-${l.status}`}>{l.label}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{l.type === 'image' ? '图片' : '链接'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{l.mainDomain || '—'}</td>
                    <td className="link-href">{l.href}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
