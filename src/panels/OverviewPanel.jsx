import { useState, useEffect } from 'react';
import useApi from '../hooks/useApi';
import { fetchDashboard, fetchStrategy } from '../api';
import BarChart from '../components/BarChart';
import { SkeletonBars } from '../components/SkeletonLoader';

export default function OverviewPanel() {
  const { data, loading, error } = useApi('dashboard', fetchDashboard);
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

  const brandData = (data.brands || []).map(b => ({ label: b.name, value: b.total }));
  const toneData = (data.tones || []).map(([label, count]) => ({ label, value: count }));
  const ctaData = Object.entries(data.cta || {}).map(([k, v]) => ({ label: k, value: v })).sort((a, b) => b.value - a.value);
  const offerData = Object.entries(data.offer || {}).map(([k, v]) => ({ label: k, value: v })).sort((a, b) => b.value - a.value);

  // Tone diversity analysis
  const toneTotal = toneData.reduce((s, t) => s + t.value, 0);
  const topTone = toneData[0];
  const topShare = toneTotal > 0 ? (topTone.value / toneTotal * 100) : 0;
  const diversityLevel = topShare > 60 ? 'low' : topShare > 40 ? 'medium' : 'high';
  const ALL_TONES = ['好奇心驱动', '紧迫催促', '友好亲切', '权威专业', '兴奋激动', '情感关怀'];
  const usedTones = new Set(toneData.map(t => t.label));
  const missingTones = ALL_TONES.filter(t => !usedTones.has(t) && t !== '中立陈述');
  const diversityLabel = diversityLevel === 'low' ? '语调趋同 — 建议差异化' : diversityLevel === 'medium' ? '语调适中 — 关注空白区' : '语调多元 — 竞争充分';
  const diversityColor = diversityLevel === 'low' ? '#ef4444' : diversityLevel === 'medium' ? '#f59e0b' : '#10b981';

  // Health score computation
  const healthScore = computeHealthScore(data, toneData, ctaData, offerData);

  return (
    <div className="panel active">
      {/* 竞争力健康分 */}
      {data && (
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
      )}

      <div className="grid-2">
        <div className="card"><h2>品牌发送热度</h2><BarChart data={brandData} /></div>
        <div className="card"><h2>语调分布</h2><BarChart data={toneData} color="linear-gradient(90deg,#8b5cf6,#a78bfa)" /></div>
        {/* CTA 风格和 Offer 分布已精简 */}
      </div>

      {/* 语调多样性分析 */}
      {toneData.length > 0 && (
        <div className="card">
          <h2>语调多样性指数</h2>
          <div className="diversity-bar">
            <div className="diversity-header">
              <span>主导语调: <strong>{topTone.label}</strong> 占 {Math.round(topShare)}%</span>
              <span className="diversity-level" style={{ color: diversityColor, fontWeight: 700 }}>{diversityLabel}</span>
            </div>
            <div className="diversity-track">
              <div className="diversity-fill" style={{ width: topShare + '%', background: diversityColor }} />
            </div>
          </div>
          {missingTones.length > 0 && (
            <div className="diversity-missing">
              <span className="diversity-missing-label">机会空白:</span>
              {missingTones.map(t => (
                <span key={t} className="tone-opportunity">{t}</span>
              ))}
              <span className="diversity-tip">竞品未覆盖的语调 → 你的差异化切入点</span>
            </div>
          )}
          {missingTones.length === 0 && (
            <div className="diversity-full">所有语调类型已被竞品覆盖，竞争充分。建议在「友好亲切」或「情感关怀」语调中建立深度优势。</div>
          )}
        </div>
      )}

      {/* 竞品策略识别 */}
      {strategies && strategies.length > 0 && (
        <div className="card strategy-card">
          <h2>竞品策略识别 <span className="card-badge">AI 分析</span></h2>
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

      {/* 竞品空白分析 */}
      {toneData.length > 0 && (
        <div className="card gap-card">
          <h2>竞品空白 · 差异化机会</h2>
          <div className="gap-grid">
            {(() => {
              const ALL_CTAS = ['硬性销售', '软性引导', '内容种草', '社区互动', '限时闪购'];
              const ALL_OFFERS = ['百分比折扣', '固定金额立减', '买一送一', '免运费', '赠品', '会员积分', '早鸟价'];
              const usedCtas = new Set(ctaData.map(t => t.label));
              const usedOffers = new Set(offerData.map(t => t.label));
              const missingCtas = ALL_CTAS.filter(c => !usedCtas.has(c));
              const missingOffers = ALL_OFFERS.filter(o => !usedOffers.has(o));
              const gaps = [];
              if (missingCtas.length > 0) gaps.push({ label: 'CTA 风格空白', items: missingCtas, icon: '🎯', tip: '竞品未使用的 CTA 风格 → 你的切入点' });
              if (missingOffers.length > 0) gaps.push({ label: 'Offer 空白', items: missingOffers, icon: '🎁', tip: '竞品未覆盖的优惠形式 → 降低比价压力' });
              if (missingTones.length > 0 && !gaps.find(g => g.label === '语调空白')) gaps.unshift({ label: '语调空白', items: missingTones, icon: '🎤', tip: '竞品未覆盖的语调 → 品牌人格差异化' });
              if (gaps.length === 0) return <div className="diversity-full">竞品覆盖了主要的 CTA 风格和优惠形式。差异化建议：在内容深度和品牌故事上建立壁垒。</div>;
              return gaps.map(g => (
                <div key={g.label} className="gap-group">
                  <div className="gap-group-header">
                    <span>{g.icon}</span>
                    <strong>{g.label}</strong>
                    <span className="gap-group-tip">{g.tip}</span>
                  </div>
                  <div className="gap-tags">
                    {g.items.map(item => (
                      <span key={item} className="gap-tag">{item}</span>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function computeHealthScore(data, toneData, ctaData, offerData) {
  if (!data) return { total: '—', dims: [], action: '正在采集数据...' };

  const toneTotal = toneData.reduce((s, t) => s + t.value, 0) || 1;
  const topToneShare = toneTotal > 0 ? toneData[0].value / toneTotal * 100 : 0;
  const toneScore = topToneShare > 50 ? 10 : topToneShare > 35 ? 18 : 25;

  const ctaCount = ctaData.length;
  const ctaScore = ctaCount >= 4 ? 20 : ctaCount >= 2 ? 12 : 5;

  const offerCount = offerData.length;
  const offerScore = offerCount >= 4 ? 20 : offerCount >= 2 ? 12 : 5;

  const ALL_TONES = ['好奇心驱动', '紧迫催促', '友好亲切', '权威专业', '兴奋激动', '情感关怀'];
  const usedTones = new Set(toneData.map(t => t.label));
  const gapCount = ALL_TONES.filter(t => !usedTones.has(t) && t !== '中立陈述').length;
  const gapScore = gapCount <= 1 ? 15 : gapCount <= 3 ? 8 : 3;

  const dataScore = data.brands && data.brands.length >= 5 ? 20 : data.brands && data.brands.length >= 2 ? 12 : 5;

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
