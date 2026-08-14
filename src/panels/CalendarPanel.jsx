import { useState } from 'react';
import useApi from '../hooks/useApi';
import { fetchCalendar } from '../api';
import BarChart from '../components/BarChart';
import { SkeletonTable, SkeletonBars } from '../components/SkeletonLoader';
import { HOLIDAYS, getDaysUntil, holidayUrgency } from '../utils/holidays';

const DAY_LABELS = { '周一': 'Mon', '周二': 'Tue', '周三': 'Wed', '周四': 'Thu', '周五': 'Fri', '周六': 'Sat', '周日': 'Sun' };
const DAY_ORDER = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const TIMEZONES = [
  { id: 'auto', label: '竞品原始时间', desc: '不做转换' },
  { id: 'est', label: '美东 EST (UTC-5)', desc: '美国东部 · 纽约/迈阿密', peakDay: '周二~周四', peakSlot: '上午 8-11点' },
  { id: 'pdt', label: '美西 PDT (UTC-8)', desc: '美国西部 · 洛杉矶/旧金山', peakDay: '周二~周四', peakSlot: '上午 8-11点' },
  { id: 'cet', label: '欧洲 CET (UTC+1)', desc: '欧洲 · 巴黎/柏林/伦敦', peakDay: '周二~周四', peakSlot: '上午 9-11点' },
];

const FREQ_BENCHMARKS = { high: 5, medium: 3, low: 1 };

export default function CalendarPanel({ brand }) {
  const [tz, setTz] = useState('auto');
  const cacheKey = 'calendar_' + (brand || '');
  const { data, loading, error } = useApi(cacheKey, () => fetchCalendar(brand), [brand]);

  if (loading) return (
    <div className="panel active">
      <div className="card"><SkeletonBars count={7} /></div>
      <div className="card"><SkeletonTable rows={6} /></div>
    </div>
  );
  if (error) return (
    <div className="panel active">
      <div className="empty">
        <span className="empty-icon">⚠️</span>
        <div className="empty-title">加载失败</div>
        <div className="empty-desc">{error}</div>
      </div>
    </div>
  );
  if (!data || !data.dayStats) return (
    <div className="panel active">
      <div className="empty">
        <span className="empty-icon">📅</span>
        <div className="empty-title">暂无数据</div>
        <div className="empty-desc">请先采集邮件数据</div>
      </div>
    </div>
  );

  const { dayStats, slotStats, advice, brands, recent } = data;

  // 按顺序排列星期
  const dayEntries = DAY_ORDER
    .filter(d => dayStats[d])
    .map(d => ({ label: d + ' (' + (DAY_LABELS[d] || d) + ')', value: dayStats[d] }));

  const slotEntries = Object.entries(slotStats || {})
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ label: k, value: v }));

  // 按日期分组 recent
  const calMap = {};
  (recent || []).forEach(r => {
    if (!calMap[r.date]) calMap[r.date] = [];
    calMap[r.date].push(r);
  });

  // 频率分析
  const freqByBrand = {};
  (recent || []).forEach(r => {
    if (!freqByBrand[r.brand]) freqByBrand[r.brand] = new Set();
    freqByBrand[r.brand].add(r.date);
  });
  const freqEntries = Object.entries(freqByBrand)
    .map(([name, dates]) => ({ label: name, value: dates.size }))
    .sort((a, b) => b.value - a.value);
  const avgFreq = freqEntries.length > 0
    ? (freqEntries.reduce((s, e) => s + e.value, 0) / freqEntries.length).toFixed(1)
    : '—';

  const selTz = TIMEZONES.find(t => t.id === tz) || TIMEZONES[0];

  // 节日计算
  const now = new Date();
  const upcoming = HOLIDAYS
    .map(h => ({ ...h, daysUntil: getDaysUntil(h, now) }))
    .sort((a, b) => a.daysUntil - b.daysUntil);
  const urgentHolidays = upcoming.filter(h => holidayUrgency(h.daysUntil) !== 'later');

  // 检查近期发送记录中是否有围绕节日的活跃度
  const holidayActivity = {};
  HOLIDAYS.forEach(h => {
    const hDateStr = `${now.getFullYear()}-${String(h.month).padStart(2,'0')}-${String(h.day).padStart(2,'0')}`;
    const nearbyEmails = (recent || []).filter(r => {
      if (!r.date) return false;
      const diff = Math.abs(new Date(r.date) - new Date(hDateStr));
      return diff < 7 * 86400000; // 7天内
    });
    if (nearbyEmails.length > 0) holidayActivity[h.name] = nearbyEmails.length;
  });

  // 热力图：日 × 时段交叉矩阵
  const ALL_SLOTS = ['上午', '下午', '晚上', '深夜'];
  const heatMap = {};
  DAY_ORDER.forEach(d => { heatMap[d] = {}; ALL_SLOTS.forEach(s => { heatMap[d][s] = 0; }); });
  (recent || []).forEach(r => {
    if (heatMap[r.day] && heatMap[r.day][r.slot] !== undefined) heatMap[r.day][r.slot]++;
    else if (heatMap[r.day]) {
      const slot = r.slot || '';
      if (slot.includes('上午')) heatMap[r.day]['上午']++;
      else if (slot.includes('下午')) heatMap[r.day]['下午']++;
      else if (slot.includes('晚上')) heatMap[r.day]['晚上']++;
      else heatMap[r.day]['深夜']++;
    }
  });
  const heatMax = Math.max(1, ...Object.values(heatMap).flatMap(d => Object.values(d)));

  return (
    <div className="panel active">
      {/* 时区选择器 + 最佳窗口 */}
      <div className="calendar-advice">
        <span className="calendar-advice-icon">⏰</span>
        <div style={{flex: 1}}>
          <div className="calendar-advice-title">
            发送时间优化
            <select className="tz-select" aria-label="选择发送时区" value={tz} onChange={e => setTz(e.target.value)}>
              {TIMEZONES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div className="calendar-advice-desc">
            {tz === 'auto' ? (
              <>竞品最活跃: <strong>{advice?.bestDay || '周二'}</strong> <strong>{advice?.bestSlot || '上午'}</strong> — {advice?.summary || ''}</>
            ) : (
              <>{selTz.desc} · 推荐发送: <strong>{selTz.peakDay}</strong> <strong>{selTz.peakSlot}</strong>（当地时间）</>
            )}
          </div>
        </div>
      </div>

      {/* 各时区推荐速查 */}
      <div className="grid-4 tz-grid">
        {TIMEZONES.filter(t => t.id !== 'auto').map(t => (
          <div key={t.id} className={`tz-card ${t.id === tz ? 'tz-active' : ''}`} onClick={() => setTz(t.id)}>
            <div className="tz-card-market">{t.id.toUpperCase()}</div>
            <div className="tz-card-day">{t.peakDay}</div>
            <div className="tz-card-slot">{t.peakSlot}</div>
            <div className="tz-card-desc">{t.desc}</div>
          </div>
        ))}
      </div>

      {/* 月度邮件规划 */}
      <div className="card">
        <h2>📅 月度邮件规划 <span className="card-badge">{now.getMonth() + 1}月</span></h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          基于竞品节奏、节日和最佳发送窗口，自动生成本月邮件规划建议
        </p>
        <div className="monthly-plan-grid">
          {(() => {
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const weeks = [];
            let currentWeek = { label: '', days: [] };
            for (let d = 1; d <= daysInMonth; d++) {
              const date = new Date(year, month, d);
              const dayOfWeek = date.getDay();
              const dayName = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dayOfWeek];
              if (d === 1 && dayOfWeek !== 1) {
                currentWeek.label = `第${weeks.length + 1}周 (${month + 1}/${d})`;
              }
              if (dayOfWeek === 1 && d !== 1) {
                weeks.push(currentWeek);
                currentWeek = { label: `第${weeks.length + 1}周 (${month + 1}/${d})`, days: [] };
              }
              // Check for holiday
              const holiday = HOLIDAYS.find(h => h.month === month + 1 && h.day === d);
              // Check competitor activity
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const dayActivity = (recent || []).filter(r => r.date === dateStr).length;
              // Recommend type
              // Product-specific recommendations based on brand category
              const productRecs = {
                sales: (brand || '').toLowerCase().includes('滑板') ? '滑板车特价 / 配件捆绑' : '主推产品折扣 / 组合套餐',
                edu: (brand || '').toLowerCase().includes('滑板') ? '保养指南 / 骑行安全' : '产品使用技巧 / 行业科普',
                insp: (brand || '').toLowerCase().includes('滑板') ? '骑行分享 / 用户故事' : 'UGC征集 / 使用场景',
              };
              let recType = '';
              if (holiday) recType = `🎯 ${holiday.name}促销`;
              else if (dayOfWeek === 2 || dayOfWeek === 4) recType = '📤 ' + productRecs.sales;
              else if (dayOfWeek === 3) recType = '📖 ' + productRecs.edu;
              else if (dayOfWeek === 6) recType = '💡 ' + productRecs.insp;
              currentWeek.days.push({ d, dayName, holiday, dayActivity, recType, isToday: d === today.getDate() });
              if (d === daysInMonth) weeks.push(currentWeek);
            }
            return weeks.map((week, wi) => (
              <div key={wi} className="monthly-week">
                <div className="monthly-week-label">{week.label}</div>
                <div className="monthly-week-days">
                  {week.days.map(day => (
                    <div key={day.d} className={`monthly-day${day.isToday ? ' today' : ''}${day.holiday ? ' has-holiday' : ''}${day.recType ? ' has-recommendation' : ''}`}>
                      <span className="monthly-day-num">{day.d}</span>
                      <span className="monthly-day-name">{day.dayName}</span>
                      {day.holiday && <span className="monthly-day-holiday" title={day.holiday.name}>{day.holiday.emoji} {day.holiday.name}</span>}
                      {day.recType && !day.holiday && <span className="monthly-day-rec">{day.recType}</span>}
                      {day.dayActivity > 0 && <span className="monthly-day-activity">{day.dayActivity}封竞品</span>}
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>
        <div className="monthly-plan-tip">
          💡 每周2-4封：周二/周四发销售型，周三发教育内容，周六发灵感。避开竞品密集日期。
        </div>
      </div>

      {/* 大促节日倒计时 */}
      {urgentHolidays.length > 0 && (
        <div className="card holiday-card">
          <h2>大促节点倒计时</h2>
          <div className="holiday-grid">
            {urgentHolidays.map(h => {
              const urg = holidayUrgency(h.daysUntil);
              return (
                <div key={h.name} className={`holiday-item holiday-${urg}`}>
                  <div className="holiday-top">
                    <span className="holiday-emoji">{h.emoji}</span>
                    <span className="holiday-name">{h.name}</span>
                    <span className="holiday-region">{h.region}</span>
                  </div>
                  <div className="holiday-countdown">
                    <span className="holiday-days">{h.daysUntil <= 0 ? '今天!' : h.daysUntil + '天'}</span>
                    <span className="holiday-date">
                      {h.month}月{h.day}日
                    </span>
                  </div>
                  <div className="holiday-action">
                    {urg === 'now' ? (
                      <span className="holiday-tag holiday-tag-now">立即行动</span>
                    ) : urg === 'soon' ? (
                      <span className="holiday-tag holiday-tag-soon">准备预热 · 提前{h.rampWeeks}周开始</span>
                    ) : (
                      <span className="holiday-tag holiday-tag-ahead">提前规划 · {h.rampWeeks}周预热期</span>
                    )}
                  </div>
                  <div className="holiday-desc">{h.desc}</div>
                  {holidayActivity[h.name] && (
                    <div className="holiday-activity">
                      竞品活跃: 节日前后已采集 {holidayActivity[h.name]} 封
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h2>发送时段热力图</h2>
          {recent && recent.length > 0 ? (
            <div className="heatmap">
              <div className="heatmap-header">
                <span className="heatmap-corner" />
                {ALL_SLOTS.map(s => <span key={s} className="heatmap-col-label">{s}</span>)}
              </div>
              {DAY_ORDER.map(day => (
                <div key={day} className="heatmap-row">
                  <span className="heatmap-row-label">{day}<br/>({DAY_LABELS[day]})</span>
                  {ALL_SLOTS.map(slot => {
                    const val = heatMap[day] ? heatMap[day][slot] : 0;
                    const intensity = val / heatMax;
                    const hot = intensity > 0.6;
                    return (
                      <div key={slot} className={`heatmap-cell${intensity > 0 ? ' has-data' : ''}`}
                        style={{ background: intensity > 0 ? `rgba(79,70,229,${Math.max(0.08, intensity.toFixed(2))})` : undefined }}
                        title={`${day} ${slot}: ${val} 封`}
                      >
                        <span className={`heatmap-val${hot ? ' hot' : ''}`}>{val || '-'}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div className="heatmap-legend">
                <span className="heatmap-legend-label">少</span>
                <span className="heatmap-legend-bar" />
                <span className="heatmap-legend-label">多</span>
                <span className="heatmap-legend-hint">颜色越深 = 竞品越密集 → 错峰发送</span>
              </div>
            </div>
          ) : (
            <div className="empty"><span className="empty-icon">🔥</span><div className="empty-desc">暂无竞品数据</div><div style={{fontSize:11,color:'var(--text-muted)',marginTop:4}}>请点击顶部「全流程分析」采集竞品邮件</div></div>
          )}
        </div>
        <div className="card">
          <h2>星期分布</h2>
          {dayEntries.length > 0 ? <BarChart data={dayEntries} /> : <div className="empty"><span className="empty-icon">📊</span><div className="empty-desc">暂无数据</div></div>}
        </div>
      </div>

      {/* 发送频率分析 */}
      {freqEntries.length > 0 && (
        <div className="card">
          <h2>近30天各品牌发送频率 <span className="card-badge">平均 {avgFreq} 封</span></h2>
          <div className="freq-grid">
            {freqEntries.slice(0, 10).map(({ label, value }) => {
              const level = value >= FREQ_BENCHMARKS.high ? 'high' : value >= FREQ_BENCHMARKS.medium ? 'medium' : 'low';
              const levelLabel = level === 'high' ? '高频' : level === 'medium' ? '中频' : '低频';
              return (
                <div key={label} className={`freq-item freq-${level}`}>
                  <div className="freq-brand">{label}</div>
                  <div className="freq-bar-wrap">
                    <div className="freq-bar" style={{ width: Math.min(100, (value / Math.max(1, ...freqEntries.map(e => e.value))) * 100) + '%' }} />
                  </div>
                  <div className="freq-num">{value}封 <span className="freq-level">{levelLabel}</span></div>
                </div>
              );
            })}
          </div>
          <div className="freq-legend">
            <span className="freq-legend-item"><span className="freq-dot freq-dot-high" /> 高频 (≥5封/周·品牌)</span>
            <span className="freq-legend-item"><span className="freq-dot freq-dot-medium" /> 中频 (3-4封)</span>
            <span className="freq-legend-item"><span className="freq-dot freq-dot-low" /> 低频 (≤2封)</span>
            <span className="freq-legend-hint">💡 电商DTC建议2-4封/周 (engaged), 1封/周 (less engaged)</span>
          </div>
        </div>
      )}

      {brands && brands.length > 0 && (
        <div className="card">
          <h2>各品牌发送习惯</h2>
          <div className="calendar-brand-grid">
            {brands.map(b => (
              <div key={b.name} className="calendar-brand-card">
                <div className="calendar-brand-name">{b.name}</div>
                <div className="calendar-brand-stat">
                  <span className="calendar-brand-label">主力日</span>
                  <span className="calendar-brand-value">{b.topDay || '-'}</span>
                </div>
                <div className="calendar-brand-stat">
                  <span className="calendar-brand-label">主力时段</span>
                  <span className="calendar-brand-value">{b.topSlot || '-'}</span>
                </div>
                <div className="calendar-brand-stat">
                  <span className="calendar-brand-label">总邮件</span>
                  <span className="calendar-brand-value">{b.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(calMap).length > 0 && (
        <div className="card">
          <h2>最近发送记录</h2>
          <div className="calendar-list">
            {Object.entries(calMap).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 30).map(([date, items]) => (
              <div key={date} className="calendar-day-group">
                <div className="calendar-day-header">
                  <span className="calendar-day-date">{date}</span>
                  <span className="calendar-day-count">{items.length} 封</span>
                </div>
                <div className="calendar-day-items">
                  {items.map((r, i) => (
                    <div key={i} className="calendar-item">
                      <span className="calendar-item-brand">{r.brand}</span>
                      <span className="calendar-item-type">{r.type}</span>
                      <span className="calendar-item-slot">{r.day} {r.slot}</span>
                      <span className="calendar-item-subject">{r.subject}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
