import { useState } from 'react';
import useApi from '../hooks/useApi';
import { fetchCalendar, fetchGenerateCalendar, fetchStatsQuick, fetchTopSubjectsQuick } from '../api';
import BarChart from '../components/BarChart';
import { SkeletonTable, SkeletonBars } from '../components/SkeletonLoader';
import { HOLIDAYS, getDaysUntil, holidayUrgency } from '../utils/holidays';

const DAY_LABELS = { '周一': 'Mon', '周二': 'Tue', '周三': 'Wed', '周四': 'Thu', '周五': 'Fri', '周六': 'Sat', '周日': 'Sun' };
const DAY_ORDER = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const EVENT_TYPES = ['月初迎新', '选车教育', '用户故事', '节日促销', '假期通知', '售后保养', '新品上新', '弃购召回'];
const CONTENT_LEVELS = ['L1 转化', 'L2 教育', 'L3 信任', 'L4 通知'];

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

  // AI 月度排期
  const [genMonth, setGenMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [calendarResult, setCalendarResult] = useState(null);
  const [generatingCalendar, setGeneratingCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState(null);
  // 手动添加活动
  const [customEvents, setCustomEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({ date: '', type: '月初迎新', contentLevel: 'L2 教育', title: '', content: '', cta: '' });

  const monthOptions = (() => {
    const opts = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      opts.push({
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: `${d.getFullYear()}年${d.getMonth() + 1}月`,
      });
    }
    return opts;
  })();

  const handleGenerateCalendar = async () => {
    setGeneratingCalendar(true);
    setCalendarError(null);
    setCalendarResult(null);
    try {
      const [year, month] = genMonth.split('-').map(Number);
      // 并行拉取竞品数据，各自 8s 快速失败降级（GAS 慢不阻塞）
      const [stats, subjects] = await Promise.all([
        fetchStatsQuick().catch(() => null),
        fetchTopSubjectsQuick().catch(() => []),
      ]);
      const result = await fetchGenerateCalendar({ year, month, stats, subjects });
      if (result && result.error) setCalendarError(result.error);
      else setCalendarResult(result);
    } catch (e) {
      setCalendarError(e.message || '生成失败');
    }
    setGeneratingCalendar(false);
  };

  // 手动添加活动
  const updateNewEvent = (key, value) => setNewEvent(ev => ({ ...ev, [key]: value }));
  const addCustomEvent = () => {
    if (!newEvent.date || !newEvent.title.trim()) return;
    setCustomEvents(prev => [...prev, { ...newEvent, isHoliday: false, holidayName: '' }]);
    setNewEvent({ date: '', type: '月初迎新', contentLevel: 'L2 教育', title: '', content: '', cta: '' });
  };
  const removeCustomEvent = (index) => {
    setCustomEvents(prev => prev.filter((_, i) => i !== index));
  };

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

      {/* AI 月度排期生成器 */}
      <div className="card ai-calendar-card">
        <h2>🤖 AI 月度排期生成器</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          读取竞品邮件数据，AI 分析竞品策略，生成结构化月度运营排期（8-10 封主邮件 + 节日标注 + 竞品洞察）。
        </p>
        <div className="ai-calendar-controls">
          <select value={genMonth} onChange={e => setGenMonth(e.target.value)}>
            {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <button className="btn btn-primary" onClick={handleGenerateCalendar} disabled={generatingCalendar}>
            {generatingCalendar ? '🤖 生成中...' : '🚀 生成月度排期'}
          </button>
        </div>
        {calendarError && <div className="gmail-error" style={{ marginTop: 10 }}>⚠️ {calendarError}</div>}

        {calendarResult && calendarResult.calendarTemplate && (
          <div className="ai-calendar-result" style={{ marginTop: 16 }}>
            {calendarResult.competitorInsights && (
              <div className="ai-calendar-insights">
                <h3>🔍 竞品洞察</h3>
                <div className="ai-insight-row"><strong>总结：</strong>{calendarResult.competitorInsights.summary}</div>
                <div className="ai-insight-row"><strong>发送频率：</strong>{calendarResult.competitorInsights.sendFrequency}</div>
                <div className="ai-insight-row"><strong>常用类型：</strong>{(calendarResult.competitorInsights.dominantEmailTypes || []).join('、')}</div>
                <div className="ai-insight-row"><strong>优惠方式：</strong>{calendarResult.competitorInsights.promotionPattern}</div>
                <div className="ai-insight-row"><strong>节日预热：</strong>{calendarResult.competitorInsights.holidayTiming}</div>
                {(calendarResult.competitorInsights.contentGaps || []).length > 0 && (
                  <div className="ai-insight-row"><strong>内容空白：</strong>{calendarResult.competitorInsights.contentGaps.join('、')}</div>
                )}
                {(calendarResult.competitorInsights.followStrategy || []).length > 0 && (
                  <div className="ai-insight-row"><strong>跟随：</strong>{calendarResult.competitorInsights.followStrategy.join('；')}</div>
                )}
                {(calendarResult.competitorInsights.differentiateStrategy || []).length > 0 && (
                  <div className="ai-insight-row"><strong>错位：</strong>{calendarResult.competitorInsights.differentiateStrategy.join('；')}</div>
                )}
              </div>
            )}

            <div className="ai-calendar-theme">
              <div className="ai-theme-line"><strong>月度主题：</strong>{calendarResult.calendarTemplate.monthlyTheme}</div>
              <div className="ai-theme-line"><strong>月度重点：</strong>{calendarResult.calendarTemplate.monthlyFocus}</div>
              {calendarResult.calendarTemplate.sellerNote && (
                <div className="ai-seller-note">📦 卖家提醒：{calendarResult.calendarTemplate.sellerNote}</div>
              )}
            </div>

            {(calendarResult.calendarTemplate.holidays || []).length > 0 && (
              <div className="ai-holidays">
                <h4>📅 本月节日</h4>
                {(calendarResult.calendarTemplate.holidays || []).map((h, i) => (
                  <div key={i} className="ai-holiday-item">
                    <span className="ai-holiday-date">{h.date}</span>
                    <strong>{h.name}</strong>
                    <span className="ai-holiday-action">{h.recommendedAction}</span>
                    {h.preheatDays > 0 && <span className="ai-holiday-preheat">提前 {h.preheatDays} 天预热</span>}
                  </div>
                ))}
              </div>
            )}

            {(calendarResult.calendarTemplate.events || []).length > 0 && (
              <div className="ai-events">
                <h4>📧 邮件排期（{(calendarResult.calendarTemplate.events || []).length} 封）</h4>
                {(calendarResult.calendarTemplate.events || []).map((ev, i) => (
                  <div key={i} className={`ai-event-item${ev.isHoliday ? ' ai-event-holiday' : ''}`}>
                    <div className="ai-event-date">{ev.date}</div>
                    <div className="ai-event-body">
                      <div className="ai-event-head">
                        <span className="ai-event-type">{ev.type}</span>
                        <span className="ai-event-level">{ev.contentLevel}</span>
                        {ev.isHoliday && <span className="ai-event-holiday-tag">🎯 {ev.holidayName}</span>}
                        {ev.offerNeeded && <span className="ai-event-offer">🏷️ {ev.offerType}</span>}
                      </div>
                      <div className="ai-event-title">{ev.title}</div>
                      <div className="ai-event-content">{ev.content}</div>
                      <div className="ai-event-cta">CTA：{ev.cta}</div>
                      <div className="ai-event-reason">竞品依据：{ev.competitorReason}</div>
                      <div className="ai-event-reason">排期依据：{ev.scheduleReason}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 手动添加活动 */}
      <div className="card ai-custom-card">
        <h3>✏️ 手动添加活动</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 12px' }}>
          除了 AI 生成的排期，你也可以手动添加自定义活动日期和内容。
        </p>
        <div className="ai-custom-form">
          <input type="date" value={newEvent.date} onChange={e => updateNewEvent('date', e.target.value)} />
          <select value={newEvent.type} onChange={e => updateNewEvent('type', e.target.value)}>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={newEvent.contentLevel} onChange={e => updateNewEvent('contentLevel', e.target.value)}>
            {CONTENT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <input type="text" value={newEvent.title} onChange={e => updateNewEvent('title', e.target.value)} placeholder="活动标题" />
          <textarea rows={2} value={newEvent.content} onChange={e => updateNewEvent('content', e.target.value)} placeholder="活动内容（可选）" />
          <input type="text" value={newEvent.cta} onChange={e => updateNewEvent('cta', e.target.value)} placeholder="CTA（可选）" />
          <button className="btn btn-primary" onClick={addCustomEvent}>+ 添加活动</button>
        </div>

        {customEvents.length > 0 && (
          <div className="ai-custom-list" style={{ marginTop: 12 }}>
            <strong>已添加 {customEvents.length} 个自定义活动</strong>
            {customEvents.map((ev, i) => (
              <div key={i} className="ai-event-item">
                <div className="ai-event-date">{ev.date}</div>
                <div className="ai-event-body">
                  <div className="ai-event-head">
                    <span className="ai-event-type">{ev.type}</span>
                    <span className="ai-event-level">{ev.contentLevel}</span>
                    <button className="gen-product-remove" onClick={() => removeCustomEvent(i)} title="删除">✕</button>
                  </div>
                  <div className="ai-event-title">{ev.title}</div>
                  {ev.content && <div className="ai-event-content">{ev.content}</div>}
                  {ev.cta && <div className="ai-event-cta">CTA：{ev.cta}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
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
