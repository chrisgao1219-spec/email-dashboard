import { useState, useEffect } from 'react';
import { SEQUENCES, TEMPLATE_TYPES } from './SequencePanel';
import { fetchCompetitorEmail } from '../api';

const QUICK_GUIDE = [
  { condition: '有新订阅用户？', action: '先用欢迎系列', seq: 'welcome', icon: '👋', color: '#10b981' },
  { condition: '有加购未付？', action: '先用弃购挽回', seq: 'abandoned', icon: '🛒', color: '#ef4444' },
  { condition: '有浏览未买？', action: '先用浏览召回', seq: 'browse', icon: '👀', color: '#8b5cf6' },
  { condition: '刚完成购买？', action: '开启购后跟进', seq: 'postpurchase', icon: '📦', color: '#6366f1' },
  { condition: '60天没互动？', action: '启动沉默唤醒', seq: 'winback', icon: '💤', color: '#f59e0b' },
];

export default function AutomationPanel({ initialExpand }) {
  const [expanded, setExpanded] = useState(initialExpand || 'welcome');

  // Sync external expand (e.g. Dashboard "弃购挽回" → expand that sequence)
  useEffect(() => {
    if (initialExpand) setExpanded(initialExpand);
  }, [initialExpand]);

  // 竞品邮件模板
  const [templateData, setTemplateData] = useState({});
  const [templateLoading, setTemplateLoading] = useState({});
  const [templateError, setTemplateError] = useState({});

  const loadTemplate = async (seqId) => {
    if (templateData[seqId]) return;
    setTemplateLoading(s => ({ ...s, [seqId]: true }));
    setTemplateError(s => ({ ...s, [seqId]: null }));
    try {
      const type = TEMPLATE_TYPES[seqId] || '弃购挽回';
      const r = await fetchCompetitorEmail(type);
      if (r && r.subject) setTemplateData(s => ({ ...s, [seqId]: r }));
      else setTemplateError(s => ({ ...s, [seqId]: '暂未采集到该类型的竞品邮件' }));
    } catch (e) {
      setTemplateError(s => ({ ...s, [seqId]: e.message || '加载失败' }));
    }
    setTemplateLoading(s => ({ ...s, [seqId]: false }));
  };

  return (
    <div className="panel active">
      {/* Hero */}
      <div className="automation-hero card">
        <div className="automation-hero-icon">🤖</div>
        <h1>自动流程 = 系统自动发的邮件</h1>
        <p>设定触发条件和邮件内容后，系统自动在正确的时间发给正确的人。你只需要设置一次，后面不用管。</p>
      </div>

      {/* Quick guide: which sequence first? */}
      <div className="card">
        <h2>不知道该先做哪条？看这里</h2>
        <div className="automation-guide-grid">
          {QUICK_GUIDE.map((g, i) => (
            <div key={i} className="automation-guide-card" style={{ borderTopColor: g.color }} onClick={() => setExpanded(g.seq)}>
              <span className="automation-guide-icon">{g.icon}</span>
              <div className="automation-guide-text">
                <span className="automation-guide-condition">{g.condition}</span>
                <span className="automation-guide-action">{g.action}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All 6 sequences */}
      <div className="card">
        <h2>7 条自动化邮件序列</h2>
        <p className="seq-intro">每条序列是「发送时间 + 标题公式 + 内容目标 + 操作技巧」的完整日计划。直接照着排进你的 ESP 自动化流程即可。</p>
      </div>

      {SEQUENCES.map(seq => {
        const isOpen = expanded === seq.id;
        return (
          <div key={seq.id} className={`card seq-card${isOpen ? ' seq-open' : ''}`} style={{ borderLeftColor: seq.color }}>
            <div className="seq-header" onClick={() => setExpanded(isOpen ? null : seq.id)}>
              <div className="seq-header-left">
                <span className="seq-icon">{seq.icon}</span>
                <div>
                  <div className="seq-title">{seq.title}</div>
                  <div className="seq-subtitle">{seq.subtitle}</div>
                </div>
              </div>
              <div className="seq-header-right">
                <span className="seq-goal">{seq.goal}</span>
                <span className="seq-kpi">{seq.kpi}</span>
              </div>
              <span className={`seq-arrow${isOpen ? ' open' : ''}`}>▾</span>
            </div>
            {isOpen && (
              <div className="seq-body">
                {seq.rule && <div className="seq-rule">{seq.rule}</div>}
                {seq.note && <div className="seq-note">{seq.note}</div>}
                <div className="seq-timeline">
                  {seq.emails.map((email, j) => (
                    <div key={j} className="seq-step">
                      <div className="seq-step-marker" style={{ background: seq.color }}>
                        <span>{j + 1}</span>
                      </div>
                      <div className="seq-step-line" />
                      <div className="seq-step-card">
                        <div className="seq-step-top">
                          <span className="seq-step-day">{email.day}</span>
                          <span className="seq-step-type">{email.type}</span>
                        </div>
                        <div className="seq-step-subject">
                          <span className="seq-subject-cn">{email.cn}</span>
                          <span className="seq-subject-en">{email.en}</span>
                        </div>
                        <div className="seq-step-goal">目标: {email.goal}</div>
                        <div className="seq-step-tip">技巧: {email.tip}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {seq.setup && <div className="seq-setup">⚙️ {seq.setup}</div>}
                <div className="seq-template">
                  {templateData[seq.id] ? (
                    <div className="seq-template-card">
                      <div className="seq-template-head">
                        <strong>📋 可套用竞品模板（真实邮件原文）</strong>
                        <span className="seq-template-meta">{templateData[seq.id].brand}{templateData[seq.id].date ? ' · ' + templateData[seq.id].date : ''}</span>
                      </div>
                      <div className="seq-template-subject">{templateData[seq.id].subject}</div>
                      {(templateData[seq.id].offer || templateData[seq.id].ctaStyle) && (
                        <div className="seq-template-meta-row">
                          {templateData[seq.id].offer && <span>🏷️ Offer：{templateData[seq.id].offer}</span>}
                          {templateData[seq.id].ctaStyle && <span>👆 CTA：{templateData[seq.id].ctaStyle}</span>}
                        </div>
                      )}
                      {templateData[seq.id].bodyPreview && (
                        <div className="seq-template-body">{templateData[seq.id].bodyPreview}</div>
                      )}
                    </div>
                  ) : templateError[seq.id] ? (
                    <div className="seq-template-error">⚠️ {templateError[seq.id]}</div>
                  ) : (
                    <button className="btn btn-sm btn-outline" onClick={() => loadTemplate(seq.id)} disabled={templateLoading[seq.id]}>
                      {templateLoading[seq.id] ? '加载中...' : '📋 查看竞品邮件模板'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        把这些序列规则复制到你的 ESP（Klaviyo / Mailchimp / Omnisend）自动化设置中即可。
      </div>
    </div>
  );
}
