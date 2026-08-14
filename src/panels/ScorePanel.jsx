import { useState, useCallback, useMemo, useEffect } from 'react';
import { fetchScore, fetchGmailStatus, fetchGmailRead, fetchGmailAnalyze, getGmailAuthUrl } from '../api';
import EmailPreview from '../components/EmailPreview';

const MOBILE_CUTOFF = 33;
const TRIGGER_PATTERNS = [
  { id: 'curiosity', label: '好奇心', icon: '❓', words: ['秘密', '不为人知', '发现', '这个', '为什么', '原来', '竟然', '终于', '曝光', 'inside', 'secret', 'revealed', 'surprising', 'hidden', 'what', 'why'] },
  { id: 'urgency', label: '紧迫感', icon: '⏰', words: ['限时', '最后', '马上', '即将', '倒计时', '错过', '赶紧', '现在', '今晚', '24小时', 'last', 'limited', 'hurry', 'ending', 'deadline', 'now', 'today', 'hours'] },
  { id: 'social', label: '社交证明', icon: '👥', words: ['大家都在', 'X人', '万人', '畅销', '热销', '爆款', '抢购', '断货', '好评', '推荐', 'best', 'popular', 'loved', 'review', 'join', 'community'] },
  { id: 'scarcity', label: '稀缺性', icon: '🔥', words: ['限量', '仅剩', '库存', '售罄', '抢光', '最后一', '不再', '绝版', '限量版', 'only', 'left', 'limited', 'exclusive', 'sold', 'rare'] },
  { id: 'authority', label: '权威背书', icon: '🏆', words: ['专家', '认证', '获奖', '专利', '官方', '推荐', '评测', '排名', '第一', '冠军', 'award', 'certified', 'expert', 'proven', 'tested', '#1'] },
  { id: 'emotion', label: '情感共鸣', icon: '💛', words: ['梦想', '你值得', '辛苦了', '奖励', '犒劳', '宠爱', '幸福', '温暖', '美好', '陪伴', 'love', 'deserve', 'treat', 'enjoy', 'beautiful', 'care'] },
];

function analyzeSubjectLine(subject) {
  const len = subject.length;
  const words = subject.trim().split(/[\s　]+/).filter(Boolean);
  const hasEmoji = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(subject);
  const emojiAtStart = hasEmoji && /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(subject);
  const hasNumber = /\d/.test(subject);
  const hasBracket = /[【\[\{\(（].*[】\]\}\)）]/.test(subject);

  const mobileSafe = len <= MOBILE_CUTOFF;
  const wordCount = words.length;
  const wordOptimal = wordCount >= 4 && wordCount <= 9;

  const patterns = TRIGGER_PATTERNS.map(p => ({
    ...p,
    hits: p.words.filter(w => subject.toLowerCase().includes(w.toLowerCase())),
    active: p.words.some(w => subject.toLowerCase().includes(w.toLowerCase())),
  })).filter(p => p.active);

  let score = 0;
  if (mobileSafe) score += 3;
  if (wordOptimal) score += 3;
  if (hasEmoji) score += 1;
  if (hasNumber) score += 1;
  if (hasBracket) score += 1;
  if (patterns.length >= 1) score += 2;
  if (patterns.length >= 2) score += 1;

  return { len, words: wordCount, hasEmoji, emojiAtStart, hasNumber, hasBracket, mobileSafe, wordOptimal, patterns, score, maxScore: 12 };
}

function generateVariants(subject, patterns) {
  const base = subject.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
  const variants = [];

  // Pattern-based variants
  if (patterns.some(p => p.id === 'curiosity')) {
    variants.push({ pattern: '好奇心', subject: `原来${base.slice(0, 20)}... 你不好奇吗？`, tip: '用省略号制造悬念' });
  } else {
    variants.push({ pattern: '好奇心', subject: `关于${base.slice(0, 15)}，90%的人不知道`, tip: '数字+信息差触发好奇' });
  }

  if (patterns.some(p => p.id === 'urgency')) {
    variants.push({ pattern: '紧迫感', subject: `⏰ 最后机会：${base}`, tip: '前置紧迫信号' });
  } else {
    variants.push({ pattern: '紧迫感', subject: `${base} — 今晚截止`, tip: '用截止时间制造紧迫' });
  }

  variants.push({ pattern: '社交证明', subject: `{{数字}}+人已选择：${base}`, tip: '数字社交证明前置' });
  variants.push({ pattern: '稀缺性', subject: `仅剩{数量}件 | ${base}`, tip: '竖线分隔传递稀缺信息' });
  variants.push({ pattern: '权威背书', subject: `🏆 获奖推荐：${base}`, tip: '奖杯emoji+权威信号' });
  variants.push({ pattern: '情感共鸣', subject: `${base} — 你值得更好的`, tip: '建立情感连接' });

  return variants;
}

function simulateAIInbox(body, subject, preheader) {
  if (!body || body.trim().length < 30) return null;
  const firstChars = body.trim().slice(0, 200);
  const sentences = firstChars.split(/[。！？.!?\n]/).filter(s => s.trim().length > 5);
  const aiSummary = sentences.slice(0, 2).join('。');

  // Brand proposition detection
  const brandKeywords = ['品牌', '我们', '产品', '服务', '提供', '专注', '致力于', 'brand', 'we', 'product', 'service', 'offer'];
  const hasBrandProp = brandKeywords.some(k => firstChars.toLowerCase().includes(k.toLowerCase()));

  // Coherence check: subject + preheader + first sentence should form a unit
  const combined = [subject, preheader, sentences[0] || ''].filter(Boolean).join(' → ');
  const coherenceLength = combined.length;
  const allThreePresent = !!(subject && preheader && sentences[0]);
  const coherent = allThreePresent && coherenceLength < 300;

  // Offer/CTA detection in first 200 chars
  const offerKeywords = ['折扣', '优惠', '降价', '免费', '限时', '买一', '赠送', '立减', 'off', 'free', 'discount', 'save', '%'];
  const hasOfferInBody = offerKeywords.some(k => firstChars.toLowerCase().includes(k.toLowerCase()));
  const ctaKeywords = ['点击', '购买', '下单', '了解更多', '查看', '立即', '抢购', 'click', 'buy', 'shop', 'order', 'get'];
  const hasCTAInBody = ctaKeywords.some(k => firstChars.toLowerCase().includes(k.toLowerCase()));

  return {
    aiSummary,
    sentences: sentences.length,
    hasBrandProp,
    coherent,
    coherenceLength,
    allThreePresent,
    hasOfferInBody,
    hasCTAInBody,
    snippet: firstChars.slice(0, 100),
  };
}

export default function ScorePanel({ brand }) {
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [body, setBody] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [labVariants, setLabVariants] = useState(null);

  // Gmail 测试邮箱功能
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailEmail, setGmailEmail] = useState(null);
  const [gmailReport, setGmailReport] = useState(null);
  const [gmailError, setGmailError] = useState(null);

  const subjectLab = useMemo(() => subject.trim() ? analyzeSubjectLine(subject) : null, [subject]);
  const inboxPreview = useMemo(() => body.trim() ? simulateAIInbox(body, subject, preheader) : null, [body, subject, preheader]);

  const handleBodyPaste = useCallback((e) => {
    // Try to extract text from HTML clipboard (e.g. copied from Outlook/Gmail)
    const html = e.clipboardData?.getData('text/html');
    if (html) {
      e.preventDefault();
      const div = document.createElement('div');
      div.innerHTML = html;
      // Extract image alt texts and descriptions
      const imgs = div.querySelectorAll('img');
      imgs.forEach(img => {
        const alt = img.getAttribute('alt');
        const replacement = alt ? `[图片: ${alt}]` : '[图片]';
        img.replaceWith(` ${replacement} `);
      });
      const text = div.textContent || div.innerText || '';
      setBody(prev => prev + (prev ? '\n---\n' : '') + text.trim());
    }
  }, []);

  const handleScore = useCallback(async () => {
    if (!subject.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetchScore(subject, body, brand, preheader);
      setResult(r);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [subject, body, brand, preheader]);

  // ── Gmail 测试邮箱逻辑 ──
  useEffect(() => {
    fetchGmailStatus().then(r => setGmailConnected(r.connected)).catch(() => {});
    if (typeof window !== 'undefined' && window.location.search.includes('gmail=connected')) {
      setGmailConnected(true);
    }
  }, []);

  const handleConnectGmail = () => {
    window.location.href = getGmailAuthUrl();
  };

  const handleReadGmail = async () => {
    setGmailLoading(true); setGmailError(null); setGmailEmail(null); setGmailReport(null);
    try {
      const r = await fetchGmailRead();
      if (r.found && r.email) {
        setGmailEmail(r.email);
        setSubject(r.email.subject || '');
        setBody(r.email.plainBody || r.email.htmlBody || '');
      } else if (r.message) {
        setGmailError(r.message);
      }
    } catch (e) {
      setGmailError(e.message);
    }
    setGmailLoading(false);
  };

  const handleAnalyzeGmail = async () => {
    if (!gmailEmail) return;
    setGmailLoading(true); setGmailError(null); setGmailReport(null);
    try {
      const r = await fetchGmailAnalyze({
        subject: gmailEmail.subject,
        from: gmailEmail.from,
        htmlBody: gmailEmail.htmlBody,
        plainBody: gmailEmail.plainBody,
        links: gmailEmail.links,
      });
      setGmailReport(r);
    } catch (e) {
      setGmailError(e.message);
    }
    setGmailLoading(false);
  };

  return (
    <div className="panel active">
      {/* ===== Gmail 测试邮件 ===== */}
      <div className="card gmail-card">
        <h2>📧 Gmail 测试邮件</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          直接从测试邮箱读取最新邮件，自动提取主题、正文、链接和优惠码，并生成审核报告。省去手动复制粘贴。
        </p>
        {!gmailConnected ? (
          <button className="btn btn-primary" onClick={handleConnectGmail}>
            🔗 连接 Gmail（只读权限）
          </button>
        ) : (
          <div className="gmail-actions">
            <button className="btn btn-primary" onClick={handleReadGmail} disabled={gmailLoading}>
              {gmailLoading ? '读取中...' : '📥 读取最新测试邮件'}
            </button>
            {gmailEmail && (
              <button className="btn btn-outline" onClick={handleAnalyzeGmail} disabled={gmailLoading}>
                🤖 生成审核报告
              </button>
            )}
          </div>
        )}

        {gmailError && <div className="gmail-error">⚠️ {gmailError}</div>}

        {gmailEmail && (
          <div className="gmail-email-info" style={{ marginTop: 14 }}>
            <div className="gmail-email-row"><strong>主题：</strong><span>{gmailEmail.subject || '(无)'}</span></div>
            <div className="gmail-email-row"><strong>发件人：</strong><span>{gmailEmail.from || '(无)'}</span></div>
            {gmailEmail.codes.length > 0 && (
              <div className="gmail-email-row"><strong>优惠码：</strong><span>{gmailEmail.codes.join('、')}</span></div>
            )}
            {gmailEmail.links.length > 0 && (
              <div className="gmail-email-row"><strong>链接（{gmailEmail.links.length}）：</strong><span style={{ wordBreak: 'break-all' }}>{gmailEmail.links.slice(0, 5).join(' · ')}</span></div>
            )}
            {gmailEmail.htmlBody && (
              <div style={{ marginTop: 10 }}>
                <EmailPreview subject={gmailEmail.subject} body={gmailEmail.htmlBody} compact />
              </div>
            )}
          </div>
        )}

        {gmailReport && (
          <div className="gmail-report" style={{ marginTop: 14 }}>
            {gmailReport.raw ? (
              <div className="gmail-report-raw" style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7 }}>{gmailReport.raw}</div>
            ) : (
              <>
                {gmailReport.summary && (
                  <div className="gmail-report-summary">📋 {gmailReport.summary}</div>
                )}
                <div className="gmail-report-grid">
                  {[
                    { key: 'links', label: '🔗 链接统一性' },
                    { key: 'spelling', label: '✏️ 拼写语法' },
                    { key: 'copy', label: '📝 文案质量' },
                    { key: 'design', label: '🎨 设计版式' },
                  ].map(d => {
                    const section = gmailReport[d.key];
                    if (!section) return null;
                    return (
                      <div key={d.key} className="gmail-report-section">
                        <div className="gmail-report-head">
                          <strong>{d.label}</strong>
                          <span className="gmail-report-score">{section.score ?? '—'}/100</span>
                        </div>
                        {section.issues && section.issues.length > 0 && (
                          <ul className="gmail-report-list">{section.issues.map((s, i) => <li key={i}>⚠️ {s}</li>)}</ul>
                        )}
                        {section.strengths && section.strengths.length > 0 && (
                          <ul className="gmail-report-list gmail-report-strengths">{section.strengths.map((s, i) => <li key={i}>✅ {s}</li>)}</ul>
                        )}
                        {section.suggestions && section.suggestions.length > 0 && (
                          <ul className="gmail-report-list gmail-report-suggestions">{section.suggestions.map((s, i) => <li key={i}>💡 {s}</li>)}</ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h2>邮件质量打分</h2>
        <div className="score-inputs">
          <input
            type="text"
            className="score-input"
            aria-label="邮件主题行"
            placeholder="输入邮件主题行 (Subject Line)..."
            value={subject}
            onChange={e => setSubject(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleScore()}
          />
          <input
            type="text"
            className="score-input preheader-input"
            aria-label="邮件预览文本"
            placeholder="输入预览文本 (Preheader) — 收件箱里主题行旁边显示的文字..."
            value={preheader}
            onChange={e => setPreheader(e.target.value)}
          />
          <textarea
            className="score-textarea"
            aria-label="邮件正文"
            placeholder="粘贴邮件正文（支持从 Outlook/Gmail 直接复制完整邮件，图片会自动转为标记）..."
            value={body}
            onChange={e => setBody(e.target.value)}
            onPaste={handleBodyPaste}
            rows={4}
          />
          <div className="score-paste-hint">
            💡 提示：可从 Outlook/Gmail 中 Ctrl+A 全选邮件内容，Ctrl+C 复制后在此粘贴。<strong>图片会被自动转换为 [图片: 描述] 标记</strong>参与评分。如需完整保留图片，建议在下方「邮件预览」中查看排版效果。
          </div>
          {(subject || body) && (
            <EmailPreview subject={subject} body={body} preheader={preheader} compact />
          )}
          <button
            className="btn btn-primary"
            disabled={loading || !subject.trim()}
            onClick={handleScore}
          >
            {loading ? '评分中...' : '开始评分'}
          </button>
        </div>
      </div>

      {/* Subject Line Lab */}
      {subjectLab && (
        <div className="card subject-lab-card">
          <h2>主题行实验室 <span className="card-badge">实时分析</span></h2>

          {/* Top metrics */}
          <div className="lab-metrics">
            <div className="lab-metric">
              <span className="lab-metric-val">{subjectLab.len}</span>
              <span className="lab-metric-label">字符</span>
            </div>
            <div className="lab-metric">
              <span className="lab-metric-val">{subjectLab.words}</span>
              <span className="lab-metric-label">单词</span>
            </div>
            <div className="lab-metric">
              <span className="lab-metric-val" style={{ color: subjectLab.mobileSafe ? '#10b981' : '#ef4444' }}>{subjectLab.mobileSafe ? '✓' : '✗'}</span>
              <span className="lab-metric-label">手机安全(≤33)</span>
            </div>
            <div className="lab-metric">
              <span className="lab-metric-val" style={{ color: subjectLab.wordOptimal ? '#10b981' : '#f59e0b' }}>{subjectLab.wordOptimal ? '✓' : subjectLab.words < 4 ? '短' : '长'}</span>
              <span className="lab-metric-label">4-9词最佳</span>
            </div>
            <div className="lab-metric">
              <span className="lab-metric-val">{subjectLab.score}/{subjectLab.maxScore}</span>
              <span className="lab-metric-label">结构分</span>
            </div>
          </div>

          {/* Mobile cutoff preview bar */}
          <div className="lab-mobile-bar">
            <div className="lab-mobile-bar-label">Gmail 手机端截断预览 (33字符)</div>
            <div className="lab-mobile-track">
              <div className="lab-mobile-fill" style={{ width: Math.min(subject.length / MOBILE_CUTOFF * 100, 100) + '%', background: subjectLab.mobileSafe ? '#10b981' : subject.length > MOBILE_CUTOFF * 1.3 ? '#ef4444' : '#f59e0b' }} />
            </div>
            <div className="lab-mobile-split" style={{ left: '100%', maxWidth: '100%' }} />
            <div className="lab-mobile-preview">
              <span className="lab-mobile-preview-text">{subject.slice(0, MOBILE_CUTOFF)}</span>
              {subject.length > MOBILE_CUTOFF && <span className="lab-mobile-cutoff">{subject.slice(MOBILE_CUTOFF)}</span>}
            </div>
          </div>

          {/* Emoji guidance */}
          <div className="lab-emoji-guide">
            <span>Emoji: {subjectLab.hasEmoji ? (subjectLab.emojiAtStart ? '✅ 前置位置好（提高打开率）' : '⚠️ 建议前移，前置emoji打开率更高') : '💡 建议添加1个相关emoji（提升3-8%打开率）'}</span>
            {subjectLab.hasNumber && <span style={{ marginLeft: 12 }}>数字: ✅ 含数字（提升具体感）</span>}
            {subjectLab.hasBracket && <span style={{ marginLeft: 12 }}>括号: ✅ 含括号结构（提升条理感）</span>}
          </div>

          {/* Trigger pattern detection */}
          <div className="lab-patterns">
            <div className="lab-patterns-label">触发模式检测:</div>
            {TRIGGER_PATTERNS.map(p => {
              const active = subjectLab.patterns.find(sp => sp.id === p.id);
              return (
                <span key={p.id} className={`lab-pattern-tag${active ? ' lab-pattern-active' : ''}`}>
                  {p.icon} {p.label}
                  {active && <span className="lab-pattern-hits">({active.hits.length})</span>}
                </span>
              );
            })}
          </div>
          {subjectLab.patterns.length === 0 && (
            <div className="lab-no-patterns">未检测到明显触发模式 — 建议增加紧迫感、好奇心或社交证明元素</div>
          )}

          {/* Variant generator */}
          <div style={{ marginTop: 14 }}>
            <button className="btn btn-outline" style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }} onClick={() => setLabVariants(generateVariants(subject, subjectLab.patterns))}>
              🔄 生成 6 种心理触发变体
            </button>
            {labVariants && (
              <div className="lab-variants" style={{ marginTop: 12 }}>
                {labVariants.map((v, i) => (
                  <div key={i} className="lab-variant-item">
                    <span className="lab-variant-pattern">{v.pattern}</span>
                    <span className="lab-variant-subject">{v.subject}</span>
                    <span className="lab-variant-tip">{v.tip}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="empty">
          <span className="empty-icon">⚠️</span>
          <div className="empty-title">评分失败</div>
          <div className="empty-desc">{error}</div>
          <button className="btn btn-outline btn-sm" style={{marginTop: 12}} onClick={handleScore}>重试</button>
        </div>
      )}

      {result && !error && (
        <div className="card">
          <h2>评分结果</h2>

          {/* AI 综合点评 */}
          <div className="score-verdict">
            <span className="score-verdict-icon">{verdictIcon(result.total)}</span>
            <div>
              <div className="score-verdict-title">{verdictTitle(result.total)}</div>
              <div className="score-verdict-desc">{verdictDetail(result)}</div>
            </div>
          </div>

          <div className="score-total-row">
            <div className="score-total-circle" style={{ '--pct': Math.round((result.total || 0) / 140 * 100) }}>
              <span className="score-total-num">{result.total}</span>
              <span className="score-total-label">/ 140</span>
            </div>
            <div className="score-breakdown">
              {['subject', 'preheader', 'personalization', 'cta', 'readability', 'spam', 'structure'].map(dim => (
                <div key={dim} className="score-dim">
                  <span className="score-dim-label">{dimLabel(dim)}</span>
                  <div className="score-dim-track">
                    <div className="score-dim-fill" style={{ width: ((result[dim] || 0) / 20 * 100) + '%' }} />
                  </div>
                  <span className="score-dim-num">{result[dim] || 0}/20</span>
                </div>
              ))}
            </div>
          </div>

          {result.issues && result.issues.length > 0 && (
            <div className="score-section">
              <h3 className="score-section-title warn">发现的问题</h3>
              <ul className="score-list">
                {result.issues.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {result.suggestions && result.suggestions.length > 0 && (
            <div className="score-section">
              <h3 className="score-section-title tip">优化建议</h3>
              <ul className="score-list">
                {result.suggestions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {result.checklist && result.checklist.length > 0 && (
            <div className="score-section">
              <h3 className="score-section-title">检查清单</h3>
              <div className="checklist-grid">
                {result.checklist.map((item, i) => (
                  <div key={i} className={'checklist-item checklist-' + item.status}>
                    <span className={'checklist-dot ' + item.status} />
                    <span className="checklist-label">{item.item}</span>
                    <span className="checklist-detail">{item.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.benchmarks && (
            <div className="score-section">
              <h3 className="score-section-title">行业基准</h3>
              <div className="benchmarks-grid">
                {Object.entries(result.benchmarks).map(([key, val]) => (
                  <div key={key} className="benchmark-item">
                    <span className="benchmark-label">{val.label || key}</span>
                    <span className="benchmark-value">
                      {val.best ? ('最佳: ' + val.best) : ''}
                      {val.avg ? (val.best ? ' / 平均: ' + val.avg : '平均: ' + val.avg) : ''}
                      {val.top ? (' / 顶尖: ' + val.top + '%') : ''}
                      {val.max ? (' / 上限: ' + val.max + '%') : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Inbox Detection */}
      {inboxPreview && !error && (
        <div className="card inbox-card">
          <h2>AI 收件箱预览 <span className="card-badge">模拟 Google AI 摘要</span></h2>

          {/* Coherence check */}
          <div className="inbox-coherence">
            <div className="inbox-coherence-status">
              <span className={`inbox-dot ${inboxPreview.coherent ? 'inbox-dot-pass' : 'inbox-dot-warn'}`} />
              <span>主题行+预览文本+开头 连贯性: <strong>{inboxPreview.coherent ? '✅ 良好' : '⚠️ 断裂'}</strong></span>
              <span className="inbox-hint">
                {inboxPreview.coherent
                  ? 'AI 能将这三者组合成完整摘要，收件人看到的信息一致'
                  : !inboxPreview.allThreePresent
                    ? '缺少预览文本或正文内容，AI 可能只抓取部分信息'
                    : '三者内容不连贯（总长' + inboxPreview.coherenceLength + '字符），AI 可能产生碎片化摘要'}
              </span>
            </div>
          </div>

          {/* AI Summary simulation */}
          <div className="inbox-summary-card">
            <div className="inbox-summary-label">AI 可能提取的摘要:</div>
            <div className="inbox-summary-text">"{inboxPreview.aiSummary || '(正文太短，AI 无法提取有效摘要)'}"</div>
          </div>

          {/* What Google sees */}
          <div className="inbox-google-view">
            <div className="inbox-google-label">Google AI 看到的 前100字符:</div>
            <div className="inbox-google-snippet">"{inboxPreview.snippet}..."</div>
          </div>

          {/* Checks */}
          <div className="inbox-checks">
            <div className={`inbox-check ${inboxPreview.hasBrandProp ? 'inbox-check-pass' : 'inbox-check-warn'}`}>
              <span>{inboxPreview.hasBrandProp ? '✓' : '⚠'}</span>
              <span>{inboxPreview.hasBrandProp ? '前200字符包含品牌/产品主张 — AI 能识别你是谁' : '前200字符缺少品牌主张 — AI 不知道发件人是谁'}</span>
            </div>
            <div className={`inbox-check ${inboxPreview.hasOfferInBody ? 'inbox-check-pass' : 'inbox-check-info'}`}>
              <span>{inboxPreview.hasOfferInBody ? '✓' : 'ℹ'}</span>
              <span>{inboxPreview.hasOfferInBody ? '前200字符含折扣/优惠信号 — AI 能提取促销信息' : '前200字符无折扣信号 — 如果是促销邮件，建议前置优惠信息'}</span>
            </div>
            <div className={`inbox-check ${inboxPreview.hasCTAInBody ? 'inbox-check-pass' : 'inbox-check-warn'}`}>
              <span>{inboxPreview.hasCTAInBody ? '✓' : '⚠'}</span>
              <span>{inboxPreview.hasCTAInBody ? '前200字符含行动号召 — AI 能识别转化意图' : '前200字符缺少CTA — AI 可能判定为纯信息邮件，不推荐采取行动'}</span>
            </div>
          </div>

          <div className="inbox-tip">
            💡 <strong>2026年现实:</strong> Google/Apple AI 先于人类阅读你的邮件。确保前200字符包含: 你是谁 + 你能提供什么价值 + 下一步做什么。这三者缺一不可。
          </div>
        </div>
      )}

    </div>
  );
}

function dimLabel(dim) {
  const map = { subject: '主题行', preheader: '预览文本', personalization: '个性化', cta: 'CTA', readability: '可读性', spam: '反垃圾', structure: '结构' };
  return map[dim] || dim;
}

function verdictIcon(total) {
  if (total >= 120) return '🌟';
  if (total >= 100) return '👍';
  if (total >= 80) return '📋';
  if (total >= 60) return '🔧';
  return '⚠️';
}

function verdictTitle(total) {
  if (total >= 130) return '行业顶尖水平 — 可直接发送';
  if (total >= 120) return '优秀 — 超过大多数竞品邮件';
  if (total >= 100) return '良好 — 还有小幅优化空间';
  if (total >= 80) return '中等 — 建议针对性优化后再发';
  if (total >= 60) return '偏弱 — 需要较大改动';
  return '需重写 — 核心要素缺失较多';
}

function verdictDetail(result) {
  const parts = [];
  const dims = [
    { key: 'subject', label: '主题行' },
    { key: 'preheader', label: '预览文本' },
    { key: 'personalization', label: '个性化' },
    { key: 'cta', label: 'CTA' },
    { key: 'readability', label: '可读性' },
    { key: 'spam', label: '反垃圾' },
    { key: 'structure', label: '结构' },
  ];
  const weak = dims.filter(d => (result[d.key] || 0) < 12).map(d => d.label);
  const strong = dims.filter(d => (result[d.key] || 0) >= 17).map(d => d.label);

  if (strong.length > 0) parts.push('优势: ' + strong.join('、') + '。');
  if (weak.length > 0) parts.push('薄弱: ' + weak.join('、') + ' — 优先改进。');
  if (parts.length === 0) parts.push('各维度表现均衡，保持当前质量。');

  return 'AI 点评: ' + parts.join(' ');
}
