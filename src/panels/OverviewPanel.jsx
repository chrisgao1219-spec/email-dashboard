import { useState, useEffect } from 'react';
import useApi from '../hooks/useApi';
import { fetchAnalysis, fetchStrategy } from '../api';
import BarChart from '../components/BarChart';
import { SkeletonBars } from '../components/SkeletonLoader';

// 稳定「全集」：用于识别竞品未覆盖的空白（值域与后端分析器一致）
const ALL_TONES = ['好奇心驱动', '紧迫催促', '友好亲切', '权威专业', '兴奋激动', '情感关怀'];
const ALL_CTAS = ['硬性销售', '软性引导', '均衡'];
const OFFER_CATEGORIES = [
  { key: '百分比折扣', test: /%/ },
  { key: '固定金额立减', test: /\$|¥|立减/ },
  { key: '免运费', test: /免运费|free\s*shipping/i },
  { key: '买一送一', test: /买一送一|bogo|buy one/i },
  { key: '赠品', test: /赠品|gift/i },
];

function categorizeOffer(offer) {
  for (const c of OFFER_CATEGORIES) if (c.test.test(offer)) return c.key;
  return null;
}

function sortEntries(obj) {
  return Object.entries(obj || {}).sort((a, b) => b[1] - a[1]);
}

function pct(part, total) {
  return total > 0 ? Math.round(part / total * 100) : 0;
}

export default function OverviewPanel() {
  const { data, loading, error } = useApi('analysis', fetchAnalysis);
  const [strategies, setStrategies] = useState(null);

  useEffect(() => {
    fetchStrategy().then(setStrategies).catch(() => {});
  }, []);

  if (loading) return (
    <div className="panel active">
      <div className="grid-2">
        {[1,2,3,4].map(i => <SkeletonBars key={i} count={5} />)}
      </div>
    </div>
  );

  if (error) return <div className="panel active"><div className="empty"><span className="empty-icon">⚠️</span><div className="empty-title">加载失败</div><div className="empty-desc">{error}</div></div></div>;
  if (!data) return <div className="panel active"><div className="empty"><span className="empty-icon">📊</span><div className="empty-title">暂无数据</div></div></div>;

  const N = data.total || 0;
  const insufficient = N < 3;
  const sourceBadge = `基于 ${N} 封竞品邮件`;

  const brandData = (data.topBrands || []).map(b => ({ label: b.name, value: b.total }));
  const toneEntries = sortEntries(data.byTone);
  const ctaEntries = sortEntries(data.byCta);
  const offerEntries = sortEntries(data.byOffer);
  const typeEntries = sortEntries(data.byType);

  const toneData = toneEntries.map(([label, count]) => ({ label, value: count }));

  // 语调多样性（真实分布）
  const toneTotal = toneEntries.reduce((s, [, c]) => s + c, 0);
  const topTone = toneEntries[0];
  const topShare = pct(topTone ? topTone[1] : 0, toneTotal);
  const diversityLevel = topShare > 60 ? 'low' : topShare > 40 ? 'medium' : 'high';
  const diversityLabel = diversityLevel === 'low' ? '语调趋同 — 建议差异化' : diversityLevel === 'medium' ? '语调适中 — 关注空白区' : '语调多元 — 竞争充分';
  const diversityColor = diversityLevel === 'low' ? '#ef4444' : diversityLevel === 'medium' ? '#f59e0b' : '#10b981';

  // 空白识别（真实值域 + 样本量守卫）
  const usedTones = new Set(toneEntries.map(([k]) => k));
  const usedCtas = new Set(ctaEntries.map(([k]) => k));
  const usedOfferCats = new Set(offerEntries.map(([k]) => categorizeOffer(k)).filter(Boolean));
  const missingTones = ALL_TONES.filter(t => !usedTones.has(t));
  const missingCtas = ALL_CTAS.filter(c => !usedCtas.has(c));
  const missingOfferCats = OFFER_CATEGORIES.map(c => c.key).filter(k => !usedOfferCats.has(k));

  // 数据背书的建议文案
  const topOffer = offerEntries[0];
  const topType = typeEntries[0];
  const offerRate = N ? pct(offerEntries.reduce((s, [, c]) => s + c, 0), N) : 0;
  const avgUrgency = data.urgency?.avg ?? 0;
  const emojiRate = data.emoji?.rate ?? 0;
  const bestDay = data.timing?.bestDay;
  const bestSlot = data.timing?.bestSlot;

  const insightLines = [];
  if (topType) insightLines.push(`竞品主力邮件类型是「${topType[0]}」（${topType[1]} 封，占 ${pct(topType[1], N)}%）`);
  if (topOffer) insightLines.push(`最常用优惠是「${topOffer[0]}」（出现 ${topOffer[1]} 次）；整体 ${offerRate}% 邮件含折扣`);
  if (topTone) insightLines.push(`主导语调「${topTone[0]}」占 ${topShare}%`);
  if (bestDay || bestSlot) insightLines.push(`竞品最活跃于 ${bestDay} ${bestSlot}`);

  const healthScore = computeHealthScore({ N, brandCount: data.brandCount, toneEntries, ctaEntries, offerEntries });

  return (
    <div className="panel active">
      {/* 数据来源标注 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13, color: 'var(--text-muted)' }}>
        <span style={{ background: 'var(--primary)', color: '#fff', padding: '2px 10px', borderRadius: 12, fontWeight: 600 }}>{sourceBadge}</span>
        {data.lastUpdate && <span>最后采集 {data.lastUpdate}</span>}
      </div>

      {/* 竞争力健康分 */}
      <div className="card health-card">
        <div className="health-main">
          <div className="health-score-wrap">
            <div className="health-score-circle" style={{ '--pct': healthScore.total }}>
              <span className="health-score-num">{healthScore.total}</span>
            </div>
            <div className="health-score-label">竞争力健康分</div>
          </div>
          <div className="health-breakdown">
            {healthScore.dims.map(d => (
              <div key={d.label} className="health-dim">
                <span className="health-dim-icon">{d.icon}</span>
                <span className="health-dim-label">{d.label}</span>
                <div className="health-dim-track"><div className="health-dim-fill" style={{ width: d.score + '%', background: d.color }} /></div>
                <span className="health-dim-val">{d.score}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="health-action">{healthScore.action}</div>
      </div>

      <div className="grid-2">
        <div className="card"><h2>品牌发送热度 <span style={hint}>{sourceBadge}</span></h2><BarChart data={brandData} /></div>
        <div className="card"><h2>语调分布 <span style={hint}>{sourceBadge}</span></h2><BarChart data={toneData} color="linear-gradient(90deg,#8b5cf6,#a78bfa)" /></div>
      </div>

      {/* 邮件类型分布（真实数据） */}
      {typeEntries.length > 0 && (
        <div className="card">
          <h2>邮件类型分布 <span style={hint}>{sourceBadge}</span></h2>
          <div className="gap-tags">
            {typeEntries.slice(0, 10).map(([k, c]) => (
              <span key={k} className="gap-tag">{k} · {c}封 ({pct(c, N)}%)</span>
            ))}
          </div>
        </div>
      )}

      {/* 语调多样性 */}
      {!insufficient && toneEntries.length > 0 && (
        <div className="card">
          <h2>语调多样性指数</h2>
          <div className="diversity-bar">
            <div className="diversity-header">
              <span>主导语调: <strong>{topTone[0]}</strong> 占 {topShare}%</span>
              <span className="diversity-level" style={{ color: diversityColor, fontWeight: 700 }}>{diversityLabel}</span>
            </div>
            <div className="diversity-track">
              <div className="diversity-fill" style={{ width: topShare + '%', background: diversityColor }} />
            </div>
          </div>
        </div>
      )}

      {/* 竞品策略识别（AI，基于真实竞品数据） */}
      {strategies && strategies.length > 0 && (
        <div className="card strategy-card">
          <h2>竞品策略识别 <span className="card-badge">AI 分析 · {sourceBadge}</span></h2>
          <div className="strategy-grid">
            {strategies.map(s => (
              <div key={s.brand} className={`strategy-item strategy-${s.level === '高' ? 'high' : s.level === '中' ? 'med' : 'low'}`}>
                <div className="strategy-brand">{s.brand}</div>
                <span className="strategy-type">{s.strategy}</span>
                <span className={`strategy-level level-${s.level === '高' ? 'high' : s.level === '中' ? 'med' : 'low'}`}>{s.level}威胁</span>
                <div className="strategy-note">{s.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 竞品空白 · 差异化机会 */}
      <div className="card gap-card">
        <h2>竞品空白 · 差异化机会 <span style={hint}>{sourceBadge}</span></h2>
        {insufficient ? (
          <div className="diversity-full">数据不足（仅 {N} 封竞品邮件），先采集更多竞品邮件再做空白分析。</div>
        ) : (
          <div className="gap-grid">
            {missingTones.length > 0 && (
              <div className="gap-group">
                <div className="gap-group-header"><span>🎤</span><strong>语调空白</strong><span className="gap-group-tip">竞品未覆盖的语调 → 品牌人格差异化</span></div>
                <div className="gap-tags">{missingTones.map(item => <span key={item} className="gap-tag">{item}</span>)}</div>
              </div>
            )}
            {missingCtas.length > 0 && (
              <div className="gap-group">
                <div className="gap-group-header"><span>🎯</span><strong>CTA 风格空白</strong><span className="gap-group-tip">竞品未使用的 CTA → 你的切入点</span></div>
                <div className="gap-tags">{missingCtas.map(item => <span key={item} className="gap-tag">{item}</span>)}</div>
              </div>
            )}
            {missingOfferCats.length > 0 && (
              <div className="gap-group">
                <div className="gap-group-header"><span>🎁</span><strong>Offer 空白</strong><span className="gap-group-tip">竞品未覆盖的优惠形式 → 降低比价压力</span></div>
                <div className="gap-tags">{missingOfferCats.map(item => <span key={item} className="gap-tag">{item}</span>)}</div>
              </div>
            )}
            {missingTones.length === 0 && missingCtas.length === 0 && missingOfferCats.length === 0 && (
              <div className="diversity-full">竞品已覆盖主要语调/CTA/优惠形式。建议在内容深度和品牌故事上建立壁垒。</div>
            )}
          </div>
        )}
      </div>

      {/* 数据背书的行动建议 */}
      {!insufficient && insightLines.length > 0 && (
        <div className="card">
          <h2>本周竞品洞察 <span style={hint}>{sourceBadge}</span></h2>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9, color: 'var(--text-secondary)', fontSize: 14 }}>
            {insightLines.map((l, i) => <li key={i}>{l}</li>)}
            <li>紧迫感均值 {avgUrgency}/5 · {emojiRate}% 邮件含 emoji</li>
            {topOffer && topOffer[0] && missingOfferCats.length > 0 && (
              <li><strong>差异化建议：</strong>竞品主推「{topOffer[0]}」，你可用「{missingOfferCats[0]}」避开比价</li>
            )}
            {missingTones.length > 0 && (
              <li><strong>语调建议：</strong>竞品少用「{missingTones[0]}」，可作为你的差异化语调</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

const hint = { fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 };

function computeHealthScore({ N, brandCount, toneEntries, ctaEntries, offerEntries }) {
  if (!N) return { total: '—', dims: [], action: '正在采集数据...' };

  const toneCount = toneEntries.length;
  const toneScore = toneCount >= 4 ? 25 : toneCount >= 2 ? 18 : 10;
  const ctaCount = ctaEntries.length;
  const ctaScore = ctaCount >= 3 ? 20 : ctaCount >= 2 ? 12 : 5;
  const offerCount = offerEntries.length;
  const offerScore = offerCount >= 4 ? 20 : offerCount >= 2 ? 12 : 5;
  const usedTones = new Set(toneEntries.map(([k]) => k));
  const gapCount = ALL_TONES.filter(t => !usedTones.has(t)).length;
  const gapScore = gapCount <= 1 ? 15 : gapCount <= 3 ? 8 : 3;
  const dataScore = brandCount >= 5 ? 20 : brandCount >= 2 ? 12 : 5;

  const total = toneScore + ctaScore + offerScore + gapScore + dataScore;

  const action = total >= 85 ? '竞争力优秀，保持监测节奏' :
    total >= 65 ? '竞争力良好，关注空白领域填补' :
    total >= 45 ? '竞争力中等，建议加大差异化投入' :
    '竞争力待提升，优先采集更多竞品数据并差异化定位';

  return {
    total,
    dims: [
      { label: '语调多元', icon: '🎤', score: toneScore, color: '#8b5cf6' },
      { label: 'CTA多样', icon: '🎯', score: ctaScore, color: '#f59e0b' },
      { label: 'Offer丰富', icon: '🎁', score: offerScore, color: '#10b981' },
      { label: '空白机会', icon: '🔍', score: gapScore, color: '#6366f1' },
      { label: '数据覆盖', icon: '📊', score: dataScore, color: '#ec4899' },
    ],
    action,
  };
}
