import { useState, useEffect } from 'react';

const STORAGE_KEY = 'email_dash_snapshot';
const THRESHOLDS = {
  freqSpikeMultiplier: 2,    // 2x normal = alert
  freqSpikeMin: 5,           // must be at least 5/week to matter
  goneSilentMin: 3,          // was sending 3+, now 0
  discountSurgePp: 15,       // offerRate jump >15 percentage points
  urgencySpike: 1.5,         // avgUrgency jump >1.5 points
  highCompetition: 40,       // total weekly emails >40
};

export default function useCompetitorAlerts(stats, dash, brand) {
  const storageKey = brand ? STORAGE_KEY + '_' + brand : STORAGE_KEY;
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!stats || !dash) return;

    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    let prev = null;
    try {
      const raw = localStorage.getItem(storageKey);
      prev = raw ? JSON.parse(raw) : null;
    } catch { /* ignore */ }

    // Build current snapshot
    const current = {
      timestamp: now,
      dateStr: today,
      brands: {},
      aggregate: {
        totalBrands: (dash.brands || []).length,
        totalWeek: stats.thisWeek || 0,
        offerRate: stats.offerRate || 0,
        avgUrgency: stats.avgUrgency || 0,
      },
    };

    (dash.brands || []).forEach(b => {
      current.brands[b.name] = {
        week: b.week || 0,
        total: b.total || 0,
      };
    });

    const detected = [];

    // Only compare if we have a previous snapshot from a different date
    if (prev && prev.dateStr !== today) {
      // 1. Per-brand frequency spike / gone silent
      Object.entries(current.brands).forEach(([name, cur]) => {
        const prevBrand = prev.brands[name];
        if (prevBrand && prevBrand.week > 0 && cur.week >= prevBrand.week * THRESHOLDS.freqSpikeMultiplier && cur.week >= THRESHOLDS.freqSpikeMin) {
          detected.push({
            id: 'spike_' + name,
            type: 'frequency_spike',
            severity: 'high',
            title: `${name} 发送频率飙升`,
            message: `本周 ${cur.week} 封（上周 ${prevBrand.week} 封），增加 ${Math.round((cur.week / prevBrand.week - 1) * 100)}%`,
            brand: name,
          });
        }
        if (prevBrand && prevBrand.week >= THRESHOLDS.goneSilentMin && cur.week === 0) {
          detected.push({
            id: 'silent_' + name,
            type: 'gone_silent',
            severity: 'medium',
            title: `${name} 突然安静`,
            message: `上周还发了 ${prevBrand.week} 封，本周一封没有 — 可能在调整策略或准备大促`,
            brand: name,
          });
        }
      });

      // 2. New competitor appeared
      Object.keys(current.brands).forEach(name => {
        if (!prev.brands[name] && current.brands[name].week >= 3) {
          detected.push({
            id: 'new_' + name,
            type: 'new_competitor',
            severity: 'medium',
            title: `新竞品出现: ${name}`,
            message: `本周首次采集到 ${name} 的邮件，已发 ${current.brands[name].week} 封`,
            brand: name,
          });
        }
      });

      // 3. Aggregate discount surge
      if (prev.aggregate.offerRate > 0 && current.aggregate.offerRate - prev.aggregate.offerRate >= THRESHOLDS.discountSurgePp) {
        detected.push({
          id: 'discount_surge',
          type: 'discount_surge',
          severity: 'high',
          title: '竞品促销密度激增',
          message: `折扣覆盖率从 ${prev.aggregate.offerRate}% 跳至 ${current.aggregate.offerRate}%（+${current.aggregate.offerRate - prev.aggregate.offerRate}pp）— 价格战风险`,
        });
      }

      // 4. Urgency escalation
      if (prev.aggregate.avgUrgency > 0 && current.aggregate.avgUrgency - prev.aggregate.avgUrgency >= THRESHOLDS.urgencySpike) {
        detected.push({
          id: 'urgency_spike',
          type: 'urgency_spike',
          severity: 'medium',
          title: '竞品紧迫感升级',
          message: `平均紧迫感从 ${prev.aggregate.avgUrgency}/5 升至 ${current.aggregate.avgUrgency}/5 — 竞品在制造稀缺信号`,
        });
      }

      // 5. High absolute competition
      if (current.aggregate.totalWeek > THRESHOLDS.highCompetition) {
        const prevTotal = prev.aggregate.totalWeek || 0;
        const pctChange = prevTotal > 0 ? Math.round((current.aggregate.totalWeek / prevTotal - 1) * 100) : 0;
        detected.push({
          id: 'high_volume',
          type: 'high_competition',
          severity: pctChange > 20 ? 'high' : 'low',
          title: '竞品邮件总量很高',
          message: `本周已采集 ${current.aggregate.totalWeek} 封${pctChange > 0 ? `（+${pctChange}%）` : ''}，用户收件箱竞争激烈`,
        });
      }
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(current));
    } catch { /* quota exceeded */ }
    setAlerts(detected);
  }, [stats, dash, storageKey]);

  return alerts;
}
