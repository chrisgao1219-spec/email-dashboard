import { useState, useEffect } from 'react';
import { MAMBA_SEGMENT_GUIDE, RFM_SEGMENTS, CONTENT_PILLARS } from '../constants/emailPlanning';
import InspirePanel from './InspirePanel';
import CopyPanel from './CopyPanel';
import ScorePanel from './ScorePanel';
import AIWorkshopPanel from './AIWorkshopPanel';

const INTERNAL_TABS = [
  { id: 'guide', label: '👥 客户分组' },
  { id: 'content', label: '📚 内容库' },
  { id: 'score', label: '⭐ 评分' },
  { id: 'aiworkshop', label: '🤖 创意工坊' },
];

export default function CampaignsPanel({ brand, initialSubTab }) {
  const [subTab, setSubTab] = useState(initialSubTab || 'guide');
  const [contentSubTab, setContentSubTab] = useState('templates');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync external navigation (e.g. Dashboard "去评分" → score sub-tab)
  useEffect(() => {
    if (initialSubTab) setSubTab(initialSubTab);
  }, [initialSubTab]);

  return (
    <div className="panel active">
      {/* Hero */}
      <div className="campaigns-hero card">
        <div className="campaigns-hero-icon">📢</div>
        <h1>营销活动 = 客户分层 × 内容匹配</h1>
        <p>给你手里不同的客户群，发不同内容的邮件。下面是 Mamba 推荐的分层内容匹配指南，直接照着用。</p>
      </div>

      {/* Internal sub-tab bar */}
      <div className="sub-tabs-bar" style={{ marginBottom: 16 }}>
        {INTERNAL_TABS.map(t => (
          <button key={t.id} className={`sub-tab-btn${subTab === t.id ? ' active' : ''}`} onClick={() => setSubTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-tab: Guide (Mamba segment guide + RFM + content pillars) */}
      {subTab === 'guide' && (
        <>
          {/* Mamba segment guide */}
          <div className="card">
            <h2>客户分组内容指南
              <span className="card-badge">Mamba 推荐 · 按用户行为匹配邮件内容</span>
            </h2>
            <p className="mamba-intro">不知道给什么样的客户发什么邮件？按用户近期行为分层，匹配最有效的邮件内容类型。</p>
            <div className="mamba-grid">
              {MAMBA_SEGMENT_GUIDE.map((item, i) => (
                <div key={i} className="mamba-card" style={{ borderLeftColor: item.color }}>
                  <div className="mamba-card-header">
                    <span className="mamba-card-icon">{item.icon}</span>
                    <div className="mamba-card-titles">
                      <span className="mamba-card-segment">{item.segment}</span>
                      <span className="mamba-card-trigger">{item.trigger}</span>
                    </div>
                  </div>
                  <div className="mamba-card-content">
                    {item.content.map((c, ci) => (
                      <span key={ci} className="mamba-tag">{c}</span>
                    ))}
                  </div>
                  {item.dynamic && (
                    <div className="mamba-card-dynamic">
                      💡 可动态插入: <code>{item.dynamic}</code>
                    </div>
                  )}
                  <div className="mamba-card-tip">{item.tip}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RFM segments + Content pillars (collapsible) */}
          <div style={{ marginTop: 16 }}>
            <div className="card">
              <div className={`card-collapse-header${showAdvanced ? ' open' : ''}`} onClick={() => setShowAdvanced(a => !a)}>
                <h2>发送频率 + 内容配比 <span className="card-badge">进阶参考</span></h2>
                <span className="card-collapse-chevron">{showAdvanced ? '▴' : '▾'}</span>
              </div>
              {!showAdvanced && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>RFM 分层发送频率、内容类型比例，点击展开</p>}
              {showAdvanced && (
                <div className="grid-2" style={{ marginTop: 14 }}>
                  <div>
                    <h3 style={{ fontSize: 14, marginBottom: 8 }}>发送频率参考</h3>
                    <div className="planner-segment-table">
                      {RFM_SEGMENTS.map(seg => (
                        <div key={seg.tier} className={`planner-seg-row seg-${seg.style}`}>
                          <div className="planner-seg-tier">{seg.tier}</div>
                          <div className="planner-seg-range">{seg.range}</div>
                          <div className="planner-seg-freq">{seg.freq}</div>
                          <div className="planner-seg-content">{seg.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 style={{ fontSize: 14, marginBottom: 8 }}>内容类型配比</h3>
                    <div className="planner-pillar-bar">
                      {CONTENT_PILLARS.map(p => (
                        <div key={p.id} className="planner-pillar-seg" style={{ width: p.pct + '%', background: p.color }} title={`${p.label} ${p.pct}%`} />
                      ))}
                    </div>
                    <div className="planner-pillar-legend">
                      {CONTENT_PILLARS.map(p => (
                        <span key={p.id} className="planner-pillar-legend-item">
                          <span className="planner-pillar-dot" style={{ background: p.color }} /> {p.icon} {p.label} {p.pct}%
                        </span>
                      ))}
                    </div>
                    <div className="planner-pillar-tip">
                      每周 2-4 封中，按比例分配内容类型，避免连续两封销售邮件
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Sub-tab: Content Library (templates + inspire + copy merged) */}
      {subTab === 'content' && (
        <>
          <div className="sub-tabs-bar" style={{ marginBottom: 16 }}>
            {[
              { id: 'inspire', label: '💡 灵感' },
              { id: 'copy', label: '✏️ 话术' },
            ].map(t => (
              <button key={t.id} className={`sub-tab-btn${contentSubTab === t.id ? ' active' : ''}`} onClick={() => setContentSubTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          {contentSubTab === 'inspire' && <InspirePanel brand={brand} />}
          {contentSubTab === 'copy' && <CopyPanel />}
        </>
      )}

      {/* Sub-tab: Score */}
      {subTab === 'score' && <ScorePanel brand={brand} />}

      {/* Sub-tab: AI Workshop */}
      {subTab === 'aiworkshop' && <AIWorkshopPanel brand={brand} />}
    </div>
  );
}
