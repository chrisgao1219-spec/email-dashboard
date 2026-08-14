import { useMemo } from 'react';
import useApi from '../hooks/useApi';
import { fetchStats, fetchDashboard, fetchCalendar, fetchTopSubjects } from '../api';
import { SkeletonCard } from '../components/SkeletonLoader';
import { HOLIDAYS, getDaysUntil, holidayUrgency } from '../utils/holidays';

const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export default function ReportPanel({ brand }) {
  const { data: stats, loading: sL, error: statsError } = useApi('stats', fetchStats, []);
  const { data: dash, loading: dL, error: dashError } = useApi('dashboard', fetchDashboard, []);
  const { data: cal, loading: cL, error: calError } = useApi('calendar_' + (brand || ''), () => fetchCalendar(brand), [brand]);
  const { data: subs, loading: subL, error: subsError } = useApi('subjects', fetchTopSubjects, []);

  const loading = sL || dL || cL || subL;
  const error = statsError || dashError || calError || subsError;
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const weekLabel = `第${Math.ceil((now - new Date(now.getFullYear(),0,1)) / 86400000 / 7)}周`;

  const upcomingHolidays = useMemo(() => {
    return HOLIDAYS
      .map(h => ({ ...h, daysUntil: getDaysUntil(h, now), urgency: holidayUrgency(getDaysUntil(h, now)) }))
      .filter(h => h.urgency !== 'later')
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, []);

  const topDay = cal && cal.advice ? cal.advice.bestDay : '—';
  const topSlot = cal && cal.advice ? cal.advice.bestSlot : '—';

  if (loading) return <div className="panel active"><SkeletonCard lines={10} /><SkeletonCard lines={6} /></div>;
  if (error) return (
    <div className="panel active">
      <div className="empty" role="alert">
        <span className="empty-icon">⚠️</span>
        <div className="empty-title">周报数据加载失败</div>
        <div className="empty-desc">{error}</div>
      </div>
    </div>
  );

  const handlePrint = () => window.print();

  return (
    <div className="panel active report-panel">
      {/* Print controls */}
      <div className="no-print" style={{ marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={handlePrint}>
          打印 / 导出 PDF
        </button>
        <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          按 Ctrl+P 选择「另存为PDF」即可导出
        </span>
      </div>

      {/* Report Content */}
      <div className="report-page">
        <div className="report-header">
          <h1 className="report-title">竞品邮件营销周报</h1>
          <div className="report-meta">
            <span>{dateStr} · {weekLabel}</span>
            <span>品牌: {brand || '全部品牌'}</span>
            <span>作者: Chrisgao</span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="report-section">
          <h2>核心指标</h2>
          <div className="report-metrics">
            <div className="report-metric">
              <div className="report-metric-val">{stats ? stats.total : '—'}</div>
              <div className="report-metric-label">累计邮件</div>
            </div>
            <div className="report-metric">
              <div className="report-metric-val">{stats ? stats.thisWeek : '—'}</div>
              <div className="report-metric-label">本周新增</div>
            </div>
            <div className="report-metric">
              <div className="report-metric-val">{stats ? stats.brands : '—'}</div>
              <div className="report-metric-label">活跃品牌</div>
            </div>
            <div className="report-metric">
              <div className="report-metric-val">{stats ? stats.offerRate + '%' : '—'}</div>
              <div className="report-metric-label">折扣覆盖率</div>
            </div>
            <div className="report-metric">
              <div className="report-metric-val">{topDay} {topSlot}</div>
              <div className="report-metric-label">主力发送窗口</div>
            </div>
          </div>
        </div>

        {/* Brand Activity */}
        {dash && dash.brands && dash.brands.length > 0 && (
          <div className="report-section">
            <h2>品牌活跃度排名</h2>
            <table className="report-table">
              <thead><tr><th>品牌</th><th>总邮件</th><th>本周</th><th>品类</th></tr></thead>
              <tbody>
                {dash.brands.slice(0, 10).map(b => (
                  <tr key={b.name}>
                    <td>{b.name}</td>
                    <td>{b.total}</td>
                    <td>{b.week}</td>
                    <td>{b.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Top Subjects */}
        {subs && subs.length > 0 && (
          <div className="report-section">
            <h2>高分主题行 Top 5</h2>
            <table className="report-table">
              <thead><tr><th>品牌</th><th>主题行</th><th>评分</th><th>语调</th></tr></thead>
              <tbody>
                {subs.slice(0, 5).map((s, i) => (
                  <tr key={i}>
                    <td>{s.brand}</td>
                    <td className="report-subject">{s.subject}</td>
                    <td><strong>{s.score}</strong></td>
                    <td>{s.tone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tone Distribution */}
        {dash && dash.tones && dash.tones.length > 0 && (
          <div className="report-section">
            <h2>竞品语调分布</h2>
            <div className="report-tones">
              {dash.tones.map(([label, count]) => (
                <span key={label} className="report-tone-tag">{label} ({count})</span>
              ))}
            </div>
          </div>
        )}

        {/* Send Timing */}
        {cal && cal.dayStats && (
          <div className="report-section">
            <h2>发送时间分布</h2>
            <div className="report-timing">
              {['周一','周二','周三','周四','周五','周六','周日'].map(d => (
                <div key={d} className="report-timing-bar">
                  <span className="report-timing-label">{d}</span>
                  <div className="report-timing-track">
                    <div className="report-timing-fill" style={{
                      width: ((cal.dayStats[d] || 0) / Math.max(1, ...Object.values(cal.dayStats)) * 100) + '%'
                    }} />
                  </div>
                  <span className="report-timing-val">{cal.dayStats[d] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Holiday Alerts */}
        {upcomingHolidays.length > 0 && (
          <div className="report-section">
            <h2>大促预警</h2>
            <div className="report-holidays">
              {upcomingHolidays.map(h => (
                <div key={h.name} className={`report-holiday-item report-h-${h.urgency}`}>
                  <span>{h.emoji} {h.name}</span>
                  <span>{h.daysUntil}天后 ({h.month}/{h.day})</span>
                  <span>提前{h.rampWeeks}周预热</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="report-section">
          <h2>本周行动建议</h2>
          <div className="report-recs">
            <div className="report-rec-item">
              <strong>发送窗口：</strong>
              建议 {topDay} {topSlot}（竞品最密集时段），错峰可选竞品冷门时段。
            </div>
            <div className="report-rec-item">
              <strong>频率建议：</strong>
              电商 DTC 建议 2-4 封/周（已参与用户），1 封/周（低活跃用户）。
            </div>
            {upcomingHolidays.length > 0 && (
              <div className="report-rec-item report-rec-warn">
                <strong>大促准备：</strong>
                {upcomingHolidays[0].emoji} {upcomingHolidays[0].name} 仅剩 {upcomingHolidays[0].daysUntil} 天，建议立即启动预热邮件序列。
              </div>
            )}
            <div className="report-rec-item">
              <strong>内容策略：</strong>
              竞品 {stats ? stats.offerRate : '—'}% 的邮件含折扣。建议差异化：教育/灵感内容占 50%+，避免纯折扣竞争。
            </div>
          </div>
        </div>

        <div className="report-footer">
          本报告由 AI 竞品邮件营销 Dashboard 自动生成 · {dateStr} · 数据来源：竞品邮件监控系统
        </div>
      </div>
    </div>
  );
}
