import { useState } from 'react';
import { fetchAIDigest } from '../api';
import { SkeletonCard } from '../components/SkeletonLoader';

export default function AIDigestPanel({ brand }) {
  const [running, setRunning] = useState(false);
  const [digest, setDigest] = useState(null);
  const [error, setError] = useState(null);

  const runDigest = async () => {
    setRunning(true); setError(null);
    try {
      const data = await fetchAIDigest(brand);
      setDigest(data);
    } catch (e) { setError(e.message); }
    setRunning(false);
  };

  return (
    <div className="panel active">
      {/* Hero */}
      <div className="card digest-hero">
        <div className="digest-hero-content">
          <span className="digest-hero-icon">🤖</span>
          <div>
            <div className="digest-hero-title">AI 智能洞察</div>
            <div className="digest-hero-desc">
              DeepSeek AI 自动分析竞品数据，生成可操作的策略建议。
              {digest && digest.meta ? ` 本周共分析 ${digest.meta.weekTotal} 封竞品邮件，覆盖 ${digest.meta.brandCount} 个品牌。` : ' 点击按钮开始分析。'}
            </div>
          </div>
        </div>
        <button className="btn btn-primary digest-run-btn" onClick={runDigest} disabled={running}>
          {running ? 'AI 分析中...' : digest ? '重新分析' : '开始智能分析'}
        </button>
      </div>

      {running && (
        <div className="card">
          <SkeletonCard lines={6} />
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>AI 正在读取竞品数据并生成洞察...</div>
        </div>
      )}

      {error && (
        <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
          <span style={{ color: '#dc2626', fontSize: 13 }}>分析失败: {error}。请确认 AI Key 已配置。</span>
        </div>
      )}

      {digest && digest.insights && !running && (
        <div className="card digest-insights-card">
          <h2>本周竞品洞察</h2>
          <div className="digest-insights">
            {digest.insights.map((insight, i) => (
              <div key={i} className="digest-insight-item">
                <span className="digest-insight-icon">
                  {insight.includes('建议') || insight.includes('应该') ? '🎯' :
                   insight.includes('密集') || insight.includes('风险') || insight.includes('注意') ? '⚠️' :
                   insight.includes('上升') || insight.includes('增长') ? '📈' :
                   insight.includes('下降') ? '📉' : '💡'}
                </span>
                <span>{insight.replace(/^[•\-]\s*/, '')}</span>
              </div>
            ))}
          </div>
          {digest.meta && (
            <div className="digest-meta">
              基于近 30 天 {digest.meta.monthTotal} 封竞品邮件 · {digest.meta.brandCount} 个品牌 · AI 生成
            </div>
          )}
        </div>
      )}
    </div>
  );
}
