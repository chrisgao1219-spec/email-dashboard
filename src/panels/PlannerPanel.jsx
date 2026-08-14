import { useMemo } from 'react';
import useApi from '../hooks/useApi';
import { fetchCalendar, fetchStats } from '../api';
import { HOLIDAYS, getDaysUntil, holidayUrgency } from '../utils/holidays';
import { SkeletonCard } from '../components/SkeletonLoader';
import {
  DAY_NAMES,
  WEEK_THEMES,
  CONTENT_PILLARS,
  RFM_SEGMENTS,
  MAMBA_SEGMENT_GUIDE,
  WATERFALL,
  bestSendDays,
  bestSendSlots,
  pillarForDay,
  subjectPrompt,
  segmentForFreq,
  getMonday,
  formatDate,
  weekLabel,
} from '../constants/emailPlanning';

export default function PlannerPanel({ brand }) {
  const cacheKey = 'calendar_' + (brand || '');
  const { data: calData, loading: calLoading, error: calError } = useApi(cacheKey, () => fetchCalendar(brand), [brand]);
  const { data: statsData, loading: statsLoading, error: statsError } = useApi('stats', fetchStats, []);

  const loading = calLoading || statsLoading;
  const error = calError || statsError;

  const { weeks, holidays, dayStats, slotStats, avgFreq } = useMemo(() => {
    const now = new Date();
    const monday = getMonday(now);

    // Build 4 weeks
    const wks = [];
    for (let w = 0; w < 4; w++) {
      const weekStart = new Date(monday);
      weekStart.setDate(weekStart.getDate() + w * 7);
      const days = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + d);
        const isToday = day.toDateString() === now.toDateString();
        const isPast = day < new Date(now.getFullYear(), now.getMonth(), now.getDate());
        days.push({ date: day, dayLabel: DAY_NAMES[day.getDay()], dayOfWeek: day.getDay(), isToday, isPast });
      }
      wks.push({ monday: weekStart, days, label: weekLabel(w, weekStart), weekNum: w, theme: WEEK_THEMES[w % 4] });
    }

    // Upcoming holidays within 60 days
    const upcomingHols = HOLIDAYS
      .map(h => ({ ...h, daysUntil: getDaysUntil(h, now), urgency: holidayUrgency(getDaysUntil(h, now)) }))
      .filter(h => h.urgency !== 'later')
      .sort((a, b) => a.daysUntil - b.daysUntil);

    const dayStatsVal = (calData && calData.dayStats) || {};
    const slotStatsVal = (calData && calData.slotStats) || {};

    // Average send frequency from competitor data
    const recent = (calData && calData.recent) || [];
    const brandDates = {};
    recent.forEach(r => {
      if (!brandDates[r.brand]) brandDates[r.brand] = new Set();
      brandDates[r.brand].add(r.date);
    });
    const freqs = Object.values(brandDates).map(d => d.size);
    const avg = freqs.length > 0 ? (freqs.reduce((s, v) => s + v, 0) / freqs.length).toFixed(1) : null;

    return { weeks: wks, holidays: upcomingHols, dayStats: dayStatsVal, slotStats: slotStatsVal, avgFreq: avg };
  }, [calData]);

  const sendDays = useMemo(() => bestSendDays(dayStats), [dayStats]);
  const sendSlots = useMemo(() => bestSendSlots(slotStats), [slotStats]);

  // Fallback product info
  const productName = brand || '';
  const category = '';

  if (loading) return (
    <div className="panel active">
      <div className="grid-2">
        <SkeletonCard lines={6} />
        <SkeletonCard lines={4} />
      </div>
      <SkeletonCard lines={8} />
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

  return (
    <div className="panel active">
      {/* ======== Section 1: 本周行动速查 ======== */}
      <div className="card planner-hero">
        <div className="planner-hero-week">
          <span className="planner-hero-theme" style={{ background: weeks[0].theme.color }}>
            {weeks[0].theme.icon} {weeks[0].theme.theme}周
          </span>
          <span className="planner-hero-label">{weeks[0].label}</span>
          <span className="planner-hero-goal">{weeks[0].theme.goal}</span>
        </div>

        <div className="planner-send-cards">
          {sendDays.slice(0, 3).map((dayName, i) => {
            const dayOfWeek = DAY_NAMES.indexOf(dayName);
            const pillar = pillarForDay(dayOfWeek === -1 ? i : dayOfWeek, 0);
            const slot = sendSlots[i] || sendSlots[0];
            const seg = segmentForFreq(3);
            const now = new Date();
            const dayDate = new Date(weeks[0].monday);
            dayDate.setDate(dayDate.getDate() + (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            const isPastDay = dayDate < new Date(now.getFullYear(), now.getMonth(), now.getDate());
            return (
              <div key={dayName} className={`planner-send-card${isPastDay ? ' past' : ''}`}>
                <div className="planner-send-card-top">
                  <span className="planner-send-day">{dayName}</span>
                  <span className="planner-send-date">{formatDate(dayDate)}</span>
                  <span className="planner-send-pillar" style={{ background: pillar.color }}>{pillar.icon} {pillar.label}</span>
                </div>
                <div className="planner-send-slot">发送时段 {slot}</div>
                <div className="planner-send-seg">发送给 <strong>{seg.label}</strong></div>
                <div className="planner-send-prompt">{subjectPrompt(pillar.id, productName, category)}</div>
              </div>
            );
          })}
        </div>

        {/* Holiday alerts */}
        {holidays.length > 0 && (
          <div className="planner-holiday-bar">
            {holidays.slice(0, 3).map(h => (
              <span key={h.name} className={`planner-holiday-tag h-${h.urgency}`}>
                {h.emoji} {h.name} 倒计时 {h.daysUntil} 天 · 提前{h.rampWeeks}周预热{h.urgency === 'now' ? ' — 立即邮件预热!' : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ======== Section 2: 受众分层 + 内容配比 ======== */}
      <div className="grid-2">
        <div className="card">
          <h2>受众分层发送指南 <span className="card-badge">{avgFreq ? `竞品平均 ${avgFreq}封/30天` : 'DTC 参考'}</span></h2>
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

        <div className="card">
          <h2>内容柱配比</h2>
          <div className="planner-pillar-bar">
            {CONTENT_PILLARS.map(p => (
              <div
                key={p.id}
                className="planner-pillar-seg"
                style={{ width: p.pct + '%', background: p.color }}
                title={`${p.label} ${p.pct}%`}
              />
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

      {/* ======== Section 3: 4周发送日历 ======== */}
      <div className="card">
        <h2>4周发送日历</h2>
        <div className="planner-calendar">
          {weeks.map((week, wi) => (
            <div key={wi} className={`planner-week-col${wi === 0 ? ' current' : ''}`}>
              <div className="planner-week-header">
                <span className="planner-week-theme" style={{ background: week.theme.color }}>
                  {week.theme.icon} {week.theme.theme}
                </span>
                <span className="planner-week-label">{week.label}</span>
              </div>
              <div className="planner-week-sends">
                {sendDays.slice(0, wi === 0 ? 3 : 2).map((dayName, si) => {
                  const dayOfWeek = DAY_NAMES.indexOf(dayName);
                  const dayDate = new Date(week.monday);
                  dayDate.setDate(dayDate.getDate() + (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                  const isPastDay = dayDate < new Date();
                  const pillar = pillarForDay(dayOfWeek === -1 ? si : dayOfWeek, wi);
                  const slot = sendSlots[si] || sendSlots[0];
                  const seg = segmentForFreq(wi === 0 ? 3 : 2);
                  return (
                    <div key={si} className={`planner-week-badge${isPastDay ? ' past' : ''}`}>
                      <div className="planner-week-badge-top">
                        <span>{dayName} {formatDate(dayDate)}</span>
                        <span className="planner-week-badge-pillar" style={{ background: pillar.color }}>{pillar.icon}</span>
                      </div>
                      <div className="planner-week-badge-slot">{slot}</div>
                      <div className="planner-week-badge-seg">{seg.label}</div>
                    </div>
                  );
                })}
              </div>
              <div className="planner-week-goal">{week.theme.goal}</div>
              {/* Holiday indicator for weeks that overlap */}
              {holidays.filter(h => {
                const hDate = new Date(new Date().getFullYear(), h.month - 1, h.day);
                const weekEnd = new Date(week.monday);
                weekEnd.setDate(weekEnd.getDate() + 6);
                return hDate >= week.monday && hDate <= weekEnd;
              }).map(h => (
                <div key={h.name} className="planner-week-holiday h-soon">{h.emoji} {h.name} ({h.daysUntil}天)</div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ======== Section 4: 发送优先级瀑布流 ======== */}
      <div className="card">
        <h2>发送优先级 · 瀑布流</h2>
        <div className="planner-waterfall">
          {WATERFALL.map(w => (
            <div key={w.priority} className="planner-waterfall-row">
              <span className="planner-waterfall-priority">P{w.priority}</span>
              <div className="planner-waterfall-body">
                <div className="planner-waterfall-type">{w.type} <span className="planner-waterfall-trigger">{w.trigger}</span></div>
                <div className="planner-waterfall-schedule">{w.schedule}</div>
              </div>
              <div className="planner-waterfall-tip">{w.tip}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ======== Section 5: Mamba 场景化内容指南 ======== */}
      <div className="card">
        <h2>场景化内容指南
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
        <div className="mamba-source">内容策略参考自 Mamba 邮件营销工具</div>
      </div>
    </div>
  );
}
