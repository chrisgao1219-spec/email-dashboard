import { useState, useMemo } from 'react';
import useApi from '../hooks/useApi';
import useCompetitorAlerts from '../hooks/useCompetitorAlerts';
import { fetchCalendar, fetchStats, fetchDashboard } from '../api';
import { HOLIDAYS, getDaysUntil, holidayUrgency } from '../utils/holidays';
import { SkeletonCard } from '../components/SkeletonLoader';

const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const PHASE_LABELS = { mon: '规划周', tue: '发送日', wed: '内容日', thu: '发送日', fri: '收尾日', sat: '复盘日', sun: '休息日' };
const PHASE_ICONS = { mon: '📋', tue: '📤', wed: '✍️', thu: '📤', fri: '🏁', sat: '📊', sun: '☀️' };
const PRESEND_CHECKLIST = [
  { id: 'unsub', label: '退订链接', detail: '邮件底部必须有可见的退订链接 — CAN-SPAM/GDPR 法律要求，缺了可能被罚款', icon: '⚖️' },
  { id: 'mobile', label: '移动端预览', detail: '62% 邮件在手机上打开 — 发送前在手机上实际看一遍，图片/按钮/字号是否正常', icon: '📱' },
  { id: 'images', label: '图片 Alt 文本', detail: '30% 用户默认屏蔽图片 — Alt 文本是图片被拦截后唯一能看到的内容', icon: '🖼️' },
  { id: 'cta', label: 'CTA 可点击', detail: '按钮至少 44×44px，链接和按钮都要点一遍确认跳转正确', icon: '👆' },
  { id: 'subject', label: '主题行 ≤33字符', detail: 'Gmail 手机端 33 字符后截断 — 核心信息必须在前 33 个字符内', icon: '✂️' },
  { id: 'links', label: '所有链接有效', detail: '每个链接都要点开验证 — 坏链接=信任崩塌+退订，是新手最容易犯的错', icon: '🔗' },
  { id: 'plaintext', label: '纯文本版本', detail: '发送 HTML 邮件时必须附带纯文本版本 — 否则部分邮件客户端直接进垃圾箱', icon: '📝' },
  { id: 'spamwords', label: '无垃圾触发词', detail: '避免 FREE/100%/Act Now/!!! 等全大写垃圾词 — 在标题和正文中都要检查', icon: '🚫' },
];

const QUICK_CREATE_TYPES = [
  { value: 'promo', label: '促销活动', icon: '🔥', subject: ['限时特惠：{产品} {折扣}', '这可能是今年最低价', '仅限今天：{场景}必备 {产品}'], framework: 'AIDA', outline: '① 开门送优惠 → ② 产品亮点（解决什么痛点）→ ③ 限时+限量 → ④ 明确CTA按钮', tip: '一个邮件只说一个优惠，不要塞多个活动' },
  { value: 'abandoned', label: '弃购挽回', icon: '🛒', subject: ['你的购物车还在等你', '还在犹豫？看看别人怎么说', '最后机会：不买就恢复原价了'], framework: 'PAS', outline: '① 温和提醒（不催促）→ ② 消除顾虑（FAQ+好评）→ ③ 小激励促成', tip: '不在这封给大折扣，培养等折扣的习惯很危险' },
  { value: 'new', label: '新品上市', icon: '✨', subject: ['终于来了：{新品名称}', '这件东西改变了{场景}', '{数字}人已经在等了'], framework: 'BAB', outline: '① Before: 现在的痛点 → ② After: 用了之后的样子 → ③ Bridge: 产品介绍+首购优惠', tip: '新品首发前 48 小时打开率最高，趁热度发' },
  { value: 'winback', label: '沉默唤醒', icon: '💤', subject: ['好久不见，我们变了很多', '你走后，{品牌}做了这3件事', '最后一封：你还要我们吗？'], framework: 'ACCA', outline: '① 真诚关心（不推销）→ ② 品牌最近的变化 → ③ 新品/新内容亮点 → ④ 专属回归福利', tip: '最后一封「分手信」回复率最高，真诚说再见' },
  { value: 'welcome', label: '欢迎系列', icon: '👋', subject: ['欢迎加入{品牌}！这是你的礼物', '第一步：{产品}快速上手', '你知道{品牌}背后的故事吗？'], framework: '4Ps', outline: '① 兑现承诺（折扣码/赠品）→ ② 品牌故事+差异 → ③ 社会证明 → ④ 首购引导', tip: '第一封用纯文本格式，创始人语气，打开率最高' },
  { value: 'post', label: '购后跟进', icon: '📦', subject: ['你的{产品}快到了', '用了一周，怎么样？', '推荐给朋友，各得$10'], framework: 'QUEST', outline: '① 确认+发货通知 → ② 使用指南/开箱 → ③ 满意度调查 → ④ 推荐裂变', tip: '购后第 21 天是交叉销售的黄金窗口' },
];

const PLAN_COPY = {
  promo: { objective: '用一个清晰优惠推动当日转化', audience: '近 30 天浏览或加购过产品、但还没有购买的人', angle: '不要先讲折扣，先讲这个产品解决的具体场景，再给限时理由', cta: 'Shop the limited offer', guardrail: '只放一个主优惠和一个主按钮，避免像清仓邮件' },
  abandoned: { objective: '把犹豫用户拉回购物车', audience: '24-72 小时内加购未下单的人', angle: '先降低压力，再用评价、FAQ 或保障消除顾虑', cta: 'Return to your cart', guardrail: '第一封不要给过大折扣，否则用户会学会等折扣' },
  new: { objective: '让老用户知道新品为什么值得关注', audience: '过去 180 天购买过或高互动用户', angle: '用 Before/After 讲变化，不要只堆参数', cta: 'See what is new', guardrail: '新品邮件要解释"为什么现在需要"，而不是只说"新品来了"' },
  winback: { objective: '唤醒 60 天以上没有互动的用户', audience: '长期未打开、未点击、未购买的人', angle: '用真诚更新和小福利重新建立关系', cta: 'Take another look', guardrail: '语气要像朋友回访，不要像硬推销' },
  welcome: { objective: '把新订阅用户引导到第一次购买', audience: '刚订阅、刚注册或刚领取折扣的人', angle: '先兑现承诺，再讲品牌差异和最适合入门的产品', cta: 'Start here', guardrail: '欢迎邮件不要太长，第一屏必须出现承诺过的福利' },
  post: { objective: '提升购后体验，并为复购或推荐铺垫', audience: '刚下单、刚签收或购买后 7-21 天的人', angle: '先帮用户用好产品，再自然引导评价、复购或推荐', cta: 'Get the most from your order', guardrail: '购后邮件不要马上推第二单，先解决使用问题' },
};

// 阶段定义
const STAGES = [
  { id: 1, icon: '🌱', title: '小白基础配置', goal: '了解 EDM 是什么，完善基础配置', desc: '适合：刚开始做邮件营销，还没设置过表单和自动流程', items: '订阅表单（新用户订阅弹窗）· 自动化（欢迎系列 + 弃购挽回 + 弃单挽回）· 新手8项清单' },
  { id: 2, icon: '📈', title: '进阶完善', goal: '独立完成营销活动和完整 Flow 制作', desc: '适合：已跑通基础流程，想提升邮件质量和营销效果', items: '扩展自动化（浏览召回 + 复购 + 邀评）· 退出意图弹窗 · Milled.com 模板 · 一键生成方案' },
  { id: 3, icon: '🚀', title: '高级运营', goal: '独立完成活动规划、A/B Test 和数据分析', desc: '适合：想做系统化运营，用数据驱动决策', items: '本周发送计划 · 活动日历 · A/B 测试 · 竞品分析 · 数据分析' },
];

// 阶段1：基础自动化序列
const STAGE1_SEQUENCES = [
  { id: 'welcome', icon: '👋', title: '欢迎系列', desc: '新订阅用户 · 5封/7天', color: '#10b981' },
  { id: 'abandoned', icon: '🛒', title: '弃购挽回', desc: '加购未付款 · 3封/48小时', color: '#ef4444' },
  { id: 'abandoned_checkout', icon: '💳', title: '弃单挽回', desc: '发起结账未完成 · 3封/24小时', color: '#dc2626' },
];

// 阶段2：扩展自动化序列
const STAGE2_SEQUENCES = [
  { id: 'browse', icon: '👀', title: '浏览召回', desc: '浏览未购 · 3封/5天', color: '#8b5cf6' },
  { id: 'postpurchase', icon: '📦', title: '购后跟进（复购）', desc: '已购买 · 5封/60天', color: '#6366f1' },
  { id: 'review_invite', icon: '⭐', title: '邀评序列', desc: '签收后 · 2封/14天', color: '#f59e0b' },
  { id: 'winback', icon: '💤', title: '沉默唤醒', desc: '60天+未互动 · 4封/14天', color: '#f59e0b' },
];

// Milled.com 分类链接
const MILLED_LINKS = [
  { label: '促销活动', icon: '🔥', url: 'https://milled.com/search/promotion' },
  { label: '弃购挽回', icon: '🛒', url: 'https://milled.com/search/abandoned-cart' },
  { label: '新品上市', icon: '✨', url: 'https://milled.com/search/new-arrival' },
  { label: '欢迎邮件', icon: '👋', url: 'https://milled.com/search/welcome-email' },
  { label: '购后跟进', icon: '📦', url: 'https://milled.com/search/post-purchase' },
  { label: '浏览召回', icon: '👀', url: 'https://milled.com/search/browse-abandonment' },
];

const WORKFLOW_STEPS = [
  { id: 'goal', title: '选目标', desc: '确定这封邮件的类型和目标。' },
  { id: 'draft', title: '创意工坊', desc: '跳转创意工坊，填产品信息自动生成邮件。' },
  { id: 'check', title: '评分检查', desc: 'AI 从 7 个维度打分，检查垃圾词和移动端风险。' },
  { id: 'schedule', title: '排期发送', desc: '选择发送窗口，放进日历。' },
];

function getPhaseKey(dayOfWeek) {
  const map = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 0: 'sun' };
  return map[dayOfWeek];
}

function buildEmailPlan(type, brand, bestSlot, marketSignal) {
  const meta = QUICK_CREATE_TYPES.find(item => item.value === type) || QUICK_CREATE_TYPES[0];
  const copy = PLAN_COPY[type] || PLAN_COPY.promo;
  const brandName = brand || '你的品牌';

  return {
    type: meta.label, framework: meta.framework,
    objective: copy.objective, audience: copy.audience,
    timing: bestSlot ? `建议发送：${bestSlot}` : '建议发送：本地时间上午 8:00-10:00',
    angle: copy.angle,
    subjects: meta.subject.map(subject => subject
      .replaceAll('{品牌}', brandName).replaceAll('{产品}', '主推产品')
      .replaceAll('{新品名称}', '新品').replaceAll('{场景}', '日常通勤')
      .replaceAll('{折扣}', '限时优惠').replaceAll('{数字}', '100+')
    ),
    preheaders: [`给 ${brandName} 用户的本周优先推荐。`, '一个清晰理由，一个明确下一步。', marketSignal],
    body: [
      `开头：点出用户正在面对的场景，并说明这封邮件为什么值得看。`,
      `中段：用 ${meta.framework} 框架展开，突出 1 个核心卖点 + 1 个信任证明。`,
      `结尾：给出明确 CTA，不增加第二个主目标。`,
    ],
    cta: copy.cta,
    test: 'A/B 测试：主题行情绪强度（直接利益 vs 场景痛点），其余内容保持一致。',
    guardrail: copy.guardrail,
  };
}

export default function DashboardPanel({ brand, tools = [], onNavigate }) {
  const calCacheKey = 'dashboard_cal_' + (brand || '');
  const { data: cal, loading: cL, error: calErr } = useApi(calCacheKey, () => fetchCalendar(brand).catch(() => null), [brand]);
  const { data: stats, loading: sL, error: statsErr } = useApi('stats', fetchStats, []);
  const { data: dash } = useApi('dash_for_alerts', fetchDashboard, []);
  const alerts = useCompetitorAlerts(stats, dash, brand);

  // 3阶段系统
  const [stage, setStage] = useState(1);
  const [planType, setPlanType] = useState('promo');
  const [emailPlan, setEmailPlan] = useState(null);
  const [workflowGoal, setWorkflowGoal] = useState('promo');
  const [workflowStep, setWorkflowStep] = useState(0);
  const [workflowDone, setWorkflowDone] = useState({ goal: false, draft: false, check: false, schedule: false });
  const [abOpenRate, setAbOpenRate] = useState(20);
  const [abLift, setAbLift] = useState(20);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showAbTest, setShowAbTest] = useState(false);
  const taskStorageKey = `email_dash_completed_tasks_${brand || 'default'}_${new Date().toISOString().slice(0, 10)}`;
  const [completedTaskIds, setCompletedTaskIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(taskStorageKey) || '[]'); }
    catch { return []; }
  });
  const [showTools, setShowTools] = useState(false);

  const abSampleSize = useMemo(() => {
    const baseRate = (abOpenRate || 20) / 100;
    const mde = (abLift || 20) / 100;
    const z = 1.96;
    const p = baseRate;
    const d = p * mde;
    const n = Math.ceil(2 * z * z * p * (1 - p) / (d * d));
    return { perVariant: n, total: n * 2, days: Math.ceil(n * 2 / 500) };
  }, [abOpenRate, abLift]);

  const { phaseKey, phaseLabel, phaseIcon, dayName } = useMemo(() => {
    const now = new Date();
    const d = now.getDay();
    const k = getPhaseKey(d);
    return { phaseKey: k, phaseLabel: PHASE_LABELS[k], phaseIcon: PHASE_ICONS[k], dayName: DAY_NAMES[d] };
  }, []);

  const directive = useMemo(() => {
    const now = new Date();
    const urgentHoliday = HOLIDAYS
      .map(h => ({ ...h, daysUntil: getDaysUntil(h, now), urgency: holidayUrgency(getDaysUntil(h, now)) }))
      .filter(h => h.urgency === 'now' || h.urgency === 'soon')
      .sort((a, b) => a.daysUntil - b.daysUntil)[0];

    if (urgentHoliday) {
      if (urgentHoliday.urgency === 'now') {
        return {
          type: 'holiday-urgent',
          text: `${urgentHoliday.emoji} ${urgentHoliday.name} 仅剩 ${urgentHoliday.daysUntil} 天！立即启动预热邮件序列。`,
          sub: `建议提前 ${urgentHoliday.rampWeeks} 周开始预热 → 今天就应该发第一封预热邮件`,
          action: '立即规划预热序列',
        };
      }
      return {
        type: 'holiday-soon',
        text: `${urgentHoliday.emoji} ${urgentHoliday.name} 还有 ${urgentHoliday.daysUntil} 天，现在启动预热正好。`,
        sub: `预热期 ${urgentHoliday.rampWeeks} 周，内容节奏：教育 (40%) + 预告 (40%) + 倒计时 (20%)`,
        action: '查看大促预热指南',
      };
    }

    const phases = {
      mon: { text: `${dayName}好！这是规划日 — 今天确定本周3封邮件的内容方向，周二/四/六发送。`, sub: '规划比写更重要。花 10 分钟定方向，剩下 5 天执行。', action: '打开 SOP 规划面板' },
      tue: { text: `今天是最佳发送日，建议上午 10 点前发出本周第一封。`, sub: cal?.advice?.bestSlot ? `竞品主力时段: ${cal.advice.bestSlot}，错峰发送效果更好` : '上午 8-10 点是电商 DTC 最佳发送窗口', action: '查看今日发送建议' },
      wed: { text: '今天是内容日 — 准备周四的邮件内容，建议做教育/灵感类内容。', sub: '竞品多在周二/四/六发送，周三准备正合适。', action: '打开创意工坊' },
      thu: { text: `今天是最佳发送日，建议上午 10 点前发出本周第二封。`, sub: cal?.advice?.bestSlot ? `竞品主力时段: ${cal.advice.bestSlot}` : '周四发送内容建议：教育+灵感为主，避免纯促销', action: '查看今日发送建议' },
      fri: { text: '周末前最后一天 — 发出本周最后一封或准备周末自动发送。', sub: '周五下午打开率开始下降，建议上午发完。', action: '安排周末发送' },
      sat: { text: '周末复盘日 — 回顾本周 3 封邮件的打开率和转化。', sub: stats?.thisWeek ? `本周竞品共发 ${stats.thisWeek} 封新邮件，注意对比` : '记下这周哪封打开率最高，下周一规划时参考', action: '查看本周数据' },
      sun: { text: '休息日！你也可以安排周一的自动发送。', sub: '提前准备好周一上午的邮件，周末安心休息。', action: '准备周一发送' },
    };
    return phases[phaseKey] || phases.mon;
  }, [phaseKey, dayName, cal, stats]);

  const weekPlan = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const sendDays = [];
    const primaryDays = [2, 4, 6];
    const pillars = [
      { id: 'sales', label: '销售', icon: '🏷️', color: '#ef4444' },
      { id: 'edu', label: '教育', icon: '📖', color: '#6366f1' },
      { id: 'insp', label: '灵感', icon: '💡', color: '#f59e0b' },
    ];

    primaryDays.forEach((targetDay, i) => {
      const diff = targetDay - currentDay;
      const date = new Date(now);
      date.setDate(date.getDate() + (diff < 0 ? diff + 7 : diff));
      const month = date.getMonth() + 1;
      const dom = date.getDate();
      const isPast = diff < 0;
      const isToday = diff === 0;
      const pillar = pillars[i];
      const bestSlot = cal?.advice?.bestSlot || (targetDay === 2 ? '08:00-10:00' : targetDay === 4 ? '10:00-12:00' : '14:00-16:00');
      const segs = ['活跃用户', '温和用户', '活跃+温和'];

      sendDays.push({
        dayName: DAY_NAMES[targetDay], dateStr: `${month}/${dom}`, isPast, isToday,
        pillar, slot: bestSlot, segment: segs[i],
        hint: i === 0 ? '主推产品+优惠' : i === 1 ? '深度内容+信任' : 'UGC+社区互动',
      });
    });
    return sendDays;
  }, [cal]);

  const marketSignal = useMemo(() => {
    if (!stats) return '竞品数据还在加载，先用稳妥的教育型内容启动。';
    const offerRate = Number(stats.offerRate || 0);
    const avgUrgency = Number(stats.avgUrgency || 0);
    const thisWeek = Number(stats.thisWeek || 0);
    if (offerRate >= 45) return '竞品近期促销密度偏高，建议避开单纯价格战，用信任证明和场景价值突围。';
    if (avgUrgency >= 4) return '竞品紧迫感偏强，你可以用更克制的语气建立信任，避免用户疲劳。';
    if (thisWeek >= 12) return '竞品本周发信频率偏高，建议减少噪音，用更明确的单一主题发送。';
    return '竞品节奏相对平稳，适合测试一个清晰的内容角度。';
  }, [stats]);

  const smartTasks = useMemo(() => {
    const tasks = [];
    const todayPlan = weekPlan.find(day => day.isToday);
    const nextPlan = weekPlan.find(day => !day.isPast) || weekPlan[0];
    if (todayPlan) {
      tasks.push({
        id: 'send-today', priority: 'P0',
        title: `今天发 ${todayPlan.pillar.label} 邮件`,
        reason: `${todayPlan.slot} 是推荐窗口，目标人群：${todayPlan.segment}`,
        action: '生成今天这封',
        onClick: () => { setPlanType(todayPlan.pillar.id === 'sales' ? 'promo' : 'new'); setEmailPlan(buildEmailPlan(todayPlan.pillar.id === 'sales' ? 'promo' : 'new', brand, todayPlan.slot, marketSignal)); },
      });
    } else {
      tasks.push({
        id: 'prep-next', priority: 'P0',
        title: `准备 ${nextPlan?.dayName || '下次'} 的邮件`,
        reason: nextPlan ? `方向：${nextPlan.pillar.label}，建议发送窗口：${nextPlan.slot}` : directive.sub,
        action: '生成邮件方案',
        onClick: () => { const type = nextPlan?.pillar.id === 'sales' ? 'promo' : 'new'; setPlanType(type); setEmailPlan(buildEmailPlan(type, brand, nextPlan?.slot || cal?.advice?.bestSlot, marketSignal)); },
      });
    }
    tasks.push({
      id: 'read-market', priority: 'P1', title: '先看一句竞品判断', reason: marketSignal, action: '看总览',
      onClick: () => onNavigate && onNavigate('analytics'),
    });
    tasks.push({
      id: phaseKey === 'mon' ? 'plan-week' : 'score-copy', priority: 'P1',
      title: phaseKey === 'mon' ? '排好本周 3 封邮件' : '发前检查标题和正文',
      reason: phaseKey === 'mon' ? '先定节奏，小白最容易卡在"今天写什么"。' : '先用评分面板排除垃圾词、弱 CTA 和移动端截断风险。',
      action: phaseKey === 'mon' ? '打开 SOP' : '去评分',
      onClick: () => onNavigate && onNavigate('campaigns', 'score'),
    });
    return tasks;
  }, [brand, cal, directive.sub, marketSignal, onNavigate, phaseKey, weekPlan]);

  const completedTaskCount = smartTasks.filter(task => completedTaskIds.includes(task.id)).length;

  const toggleTaskComplete = (taskId) => {
    setCompletedTaskIds(current => {
      const next = current.includes(taskId) ? current.filter(id => id !== taskId) : [...current, taskId];
      try { localStorage.setItem(taskStorageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const workflowProgress = useMemo(() => {
    const done = WORKFLOW_STEPS.filter(step => workflowDone[step.id]).length;
    return Math.round(done / WORKFLOW_STEPS.length * 100);
  }, [workflowDone]);

  const workflowNextAction = useMemo(() => {
    if (!workflowDone.goal) return '先选一个目标';
    if (!workflowDone.draft) return '去创意工坊生成邮件';
    if (!workflowDone.check) return '去评分检查';
    if (!workflowDone.schedule) return '排发送时间';
    return '流程完成';
  }, [workflowDone]);

  const handleGeneratePlan = () => {
    const todayPlan = weekPlan.find(day => day.isToday);
    const nextPlan = weekPlan.find(day => !day.isPast) || weekPlan[0];
    setEmailPlan(buildEmailPlan(planType, brand, todayPlan?.slot || nextPlan?.slot || cal?.advice?.bestSlot, marketSignal));
  };

  const markWorkflowDone = (id) => { setWorkflowDone(done => ({ ...done, [id]: true })); };

  const handleWorkflowGoal = (value) => {
    setWorkflowGoal(value); setPlanType(value); setEmailPlan(null);
    markWorkflowDone('goal'); setWorkflowStep(1);
  };

  const handleWorkflowDraft = () => {
    const todayPlan = weekPlan.find(day => day.isToday);
    const nextPlan = weekPlan.find(day => !day.isPast) || weekPlan[0];
    const plan = buildEmailPlan(workflowGoal, brand, todayPlan?.slot || nextPlan?.slot || cal?.advice?.bestSlot, marketSignal);
    setPlanType(workflowGoal); setEmailPlan(plan);
    markWorkflowDone('goal'); markWorkflowDone('draft');
    setWorkflowStep(2);
  };

  const handleWorkflowNavigate = (target, stepId, nextStep, subTab) => {
    markWorkflowDone(stepId); setWorkflowStep(nextStep);
    if (onNavigate) onNavigate(target, subTab);
  };

  return (
    <div className="panel active">
      {(calErr || statsErr) && (
        <div className="data-error-hint">
          ⚠️ 竞品数据加载失败，请检查网络或 VPN 连接。
          <button className="btn btn-sm btn-outline" onClick={() => window.location.reload()}>重试</button>
        </div>
      )}
      {/* ===== 竞品变更告警 ===== */}
      {alerts.length > 0 && (
        <div className="alerts-strip">
          {alerts.map(a => (
            <div key={a.id} className={`alert-item alert-${a.severity}`}>
              <span className="alert-icon">{a.type === 'frequency_spike' ? '📈' : a.type === 'gone_silent' ? '🔇' : a.type === 'new_competitor' ? '🆕' : a.type === 'discount_surge' ? '🏷️' : a.type === 'urgency_spike' ? '⏰' : '📊'}</span>
              <div className="alert-body"><strong>{a.title}</strong><span>{a.message}</span></div>
            </div>
          ))}
        </div>
      )}

      {/* ===== 三阶段选择器 ===== */}
      <div className="stage-selector">
        {STAGES.map(s => (
          <button
            key={s.id}
            type="button"
            className={`stage-btn${stage === s.id ? ' active' : ''}${stage >= s.id ? ' unlocked' : ''}`}
            onClick={() => setStage(s.id)}
          >
            <span className="stage-btn-icon">{s.icon}</span>
            <div className="stage-btn-text">
              <strong>阶段{s.id}：{s.title}</strong>
              <small>{s.goal}</small>
            </div>
            <span className={`stage-btn-check${stage >= s.id ? '' : ' locked'}`}>{stage >= s.id ? '✅' : '🔒'}</span>
          </button>
        ))}
      </div>

      {/* 当前阶段信息条 */}
      <div className="stage-info-bar">
        <span className="stage-info-icon">{STAGES[stage - 1].icon}</span>
        <div>
          <strong>阶段{stage}：{STAGES[stage - 1].title}</strong>
          <span>— {STAGES[stage - 1].goal}</span>
        </div>
        <span className="stage-info-items">{STAGES[stage - 1].items}</span>
      </div>

      {/* ==================================== */}
      {/* 阶段 1：小白基础配置                    */}
      {/* ==================================== */}
      {stage === 1 && (
        <>
          {/* 1. EDM 是什么 */}
          <div className="card stage-intro-card">
            <h2>📧 EDM 是什么？</h2>
            <p className="edm-explain">
              EDM 可以理解为<strong>「有计划地给客户发邮件」</strong>。
              它不是随便群发广告，而是把合适的内容，发给合适的人，并通过打开率、点击率等数据判断效果。
              在公司内部，你可以用它做<strong>新品通知、活动邀约、客户唤醒、内容推送和长期用户运营</strong>。
            </p>
            <div className="edm-points">
              <div className="edm-point"><span>🎯</span><strong>精准触达</strong><small>按用户来源、兴趣或行为分组，给不同人发送不同内容。</small></div>
              <div className="edm-point"><span>⚙️</span><strong>自动发送</strong><small>用户订阅、点击或未打开时，系统可以自动发送对应邮件。</small></div>
              <div className="edm-point"><span>💰</span><strong>成本更低</strong><small>相比广告投放，邮件适合长期维护客户关系，重复触达成本更低。</small></div>
              <div className="edm-point"><span>📈</span><strong>效果可复盘</strong><small>可以看到打开率、点击率、退订率，知道哪类内容更有效。</small></div>
            </div>
            <div className="edm-ai-guide">🤖 看不懂？点右下角 AI 助手，随时提问</div>
          </div>

          {/* 2. 需要做的 3 件事 */}
          <div className="card stage-3steps-card">
            <h2>需要做的 3 件事</h2>
            <div className="stage-3steps">
              <div className="stage-3step">
                <span className="stage-3step-num">①</span>
                <div><strong>设置订阅表单</strong><p>收集访客邮箱，建立用户池</p></div>
              </div>
              <span className="stage-3step-arrow">→</span>
              <div className="stage-3step">
                <span className="stage-3step-num">②</span>
                <div><strong>配置自动流程</strong><p>系统自动发送邮件</p></div>
              </div>
              <span className="stage-3step-arrow">→</span>
              <div className="stage-3step">
                <span className="stage-3step-num">③</span>
                <div><strong>检查是否能启用</strong><p>测试后正式上线</p></div>
              </div>
            </div>
          </div>

          {/* 3. 基础配置：订阅表单 + 自动流程 */}
          <div className="card">
            <h2>基础配置（按顺序做）</h2>

            <div className="stage-form-card stage-numbered">
              <span className="stage-big-num">1</span>
              <span className="stage-form-icon">📋</span>
              <div>
                <strong>订阅表单 — 新用户订阅弹窗</strong>
                <p>用户首次访问网站时弹出，收集邮箱。设置进入页面 5-8 秒后触发，配合折扣码/免邮吸引订阅。</p>
                <div className="stage-form-tip">💡 只需邮箱一个字段，CTA 用第一人称「给我折扣码」转化率更高</div>
              </div>
              <button className="btn btn-sm btn-primary" onClick={() => onNavigate && onNavigate('forms', 'popup')}>去设置 →</button>
            </div>

            <div className="stage-auto-numbered">
              <span className="stage-big-num">2</span>
              <div className="stage-auto-content">
                <strong>自动流程 — 3 条基础序列</strong>
                <p>设置好后系统自动发送，你只需配置一次。</p>
                <div className="stage-seq-grid">
                  {STAGE1_SEQUENCES.map(seq => (
                    <div key={seq.id} className="stage-seq-card" style={{ borderLeftColor: seq.color }} onClick={() => onNavigate && onNavigate('automation', seq.id)}>
                      <span className="stage-seq-icon">{seq.icon}</span>
                      <div>
                        <strong>{seq.title}</strong>
                        <small>{seq.desc}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. 完成发送前检查 */}
          <div className="card stage-check-card">
            <h2>✅ 完成发送前检查</h2>
            <p className="stage-check-sub">上线前对照下面两项快速检查，避开新手最常见的坑。</p>
            <div className="stage-check-grid">
              <div className="stage-check-col">
                <h3>📋 检查订阅表单</h3>
                <ul className="stage-check-list">
                  <li><span className="stage-check-ok">✓</span>弹窗延迟 5-8 秒，别一进站就弹</li>
                  <li><span className="stage-check-ok">✓</span>只需邮箱一个字段（First Name 可选）</li>
                  <li><span className="stage-check-ok">✓</span>Offer 明确具体：「9折」&gt;「优惠」</li>
                  <li><span className="stage-check-ok">✓</span>CTA 第一人称：「给我折扣码」&gt;「提交」</li>
                  <li><span className="stage-check-ok">✓</span>关闭按钮清晰可见，别用羞辱性话术</li>
                  <li><span className="stage-check-ok">✓</span>手机端弹窗不遮挡主内容</li>
                </ul>
              </div>
              <div className="stage-check-col">
                <h3>🤖 检查自动流程</h3>
                <ul className="stage-check-list">
                  <li><span className="stage-check-ok">✓</span>欢迎邮件 Day 0 立即发送（兑现 Offer）</li>
                  <li><span className="stage-check-ok">✓</span>发件人用品牌名，不是 no-reply</li>
                  <li><span className="stage-check-ok">✓</span>每封邮件底部有退订链接（法律要求）</li>
                  <li><span className="stage-check-ok">✓</span>用测试邮箱走一遍完整流程</li>
                  <li><span className="stage-check-ok">✓</span>触发条件正确：新订阅触发欢迎系列</li>
                  <li><span className="stage-check-ok">✓</span>邮件在手机上正常显示</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ==================================== */}
      {/* 阶段 2：进阶完善                      */}
      {/* ==================================== */}
      {stage === 2 && (
        <>
          {/* ① 扩展自动化 + ② 扩展表单 */}
          <div className="grid-2">
            <div className="card">
              <h2>① 扩展自动流程 <span className="card-badge">3 条进阶序列</span></h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>基础跑通后，添加这些覆盖更多场景</p>
              <div className="stage-seq-grid">
                {STAGE2_SEQUENCES.map(seq => (
                  <div key={seq.id} className="stage-seq-card" style={{ borderLeftColor: seq.color }} onClick={() => onNavigate && onNavigate('automation', seq.id)}>
                    <span className="stage-seq-icon">{seq.icon}</span>
                    <div><strong>{seq.title}</strong><small>{seq.desc}</small></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <h2>② 扩展表单 <span className="card-badge">退出意图挽留弹窗</span></h2>
              <div className="stage-form-card" style={{flexDirection:'column',alignItems:'flex-start'}}>
                <span className="stage-form-icon" style={{fontSize:28,marginBottom:8}}>🚪</span>
                <strong>退出意图挽留弹窗</strong>
                <p style={{fontSize:12,margin:'4px 0'}}>检测用户准备离开时弹出。Offer 力度比普通弹窗大 20-30%</p>
                <button className="btn btn-sm btn-outline" onClick={() => onNavigate && onNavigate('forms', 'exit')}>去设置 →</button>
              </div>
            </div>
          </div>

          {/* ③ 一键邮件方案 */}
          <div className="card">
            <h2>③ 一键邮件方案</h2>
            <div className="dash-oneclick-controls">
              <select value={planType} onChange={e => { setPlanType(e.target.value); setEmailPlan(null); }} className="dash-create-select">
                {QUICK_CREATE_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleGeneratePlan}>生成完整方案</button>
            </div>
            {emailPlan ? (
              <div className="dash-email-plan">
                <div className="dash-plan-summary"><span>{emailPlan.type}</span><strong>{emailPlan.framework}</strong></div>
                <div className="dash-plan-lines"><div><b>目标</b><span>{emailPlan.objective}</span></div><div><b>人群</b><span>{emailPlan.audience}</span></div><div><b>时机</b><span>{emailPlan.timing}</span></div><div><b>角度</b><span>{emailPlan.angle}</span></div></div>
                <div className="dash-plan-block"><b>主题行</b>{emailPlan.subjects.map((s, i) => <span key={i}>{s}</span>)}</div>
                <div className="dash-plan-footer"><span><b>CTA</b> {emailPlan.cta}</span><span><b>测试</b> {emailPlan.test}</span><span><b>提醒</b> {emailPlan.guardrail}</span></div>
                <div className="dash-oneclick-actions">
                  <button className="btn btn-sm btn-outline" onClick={() => onNavigate && onNavigate('campaigns', 'aiworkshop')}>去创意工坊生成</button>
                  <button className="btn btn-sm btn-outline" onClick={() => onNavigate && onNavigate('analytics', 'calendar')}>排发送时间</button>
                </div>
              </div>
            ) : (<div className="dash-oneclick-empty">选择邮件类型，点击生成。系统会自动套用当前品牌、发送窗口和竞品信号。</div>)}
          </div>

          {/* 4步完成一封邮件 */}
          <div className="card">
            <h2>4 步完成一封邮件</h2>
            <div className="dash-flow-steps">
              {WORKFLOW_STEPS.map((step, i) => (
                <button key={step.id} type="button" className={`dash-flow-step${workflowDone[step.id] ? ' done' : ''}${workflowStep === i ? ' active' : ''}`} onClick={() => setWorkflowStep(i)}>
                  <span className="dash-flow-num">{workflowDone[step.id] ? '✓' : i + 1}</span>
                  <strong>{step.title}</strong><small>{step.desc}</small>
                </button>
              ))}
            </div>
            <div className="dash-flow-panel" style={{ marginTop: 10 }}>
              {workflowStep === 0 && (
                <>
                  <div className="dash-flow-title">这封邮件最想达成什么？</div>
                  <div className="dash-goal-grid">
                    {QUICK_CREATE_TYPES.map(type => (
                      <button key={type.value} type="button" className={`dash-goal-card${workflowGoal === type.value ? ' active' : ''}`} onClick={() => handleWorkflowGoal(type.value)}>
                        <span>{type.icon}</span><strong>{type.label}</strong><small>{PLAN_COPY[type.value]?.objective}</small>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {workflowStep === 1 && (
                <>
                  <div className="dash-flow-title">目标：{QUICK_CREATE_TYPES.find(t => t.value === workflowGoal)?.label}</div>
                  <p className="dash-flow-copy">去创意工坊生成这封邮件 →</p>
                  <button className="btn btn-primary" onClick={() => { markWorkflowDone('draft'); setWorkflowStep(2); onNavigate && onNavigate('campaigns', 'aiworkshop'); }}>去创意工坊生成 →</button>
                </>
              )}
              {workflowStep === 2 && (
                <>
                  <div className="dash-flow-title">生成后做评分检查</div>
                  <p className="dash-flow-copy">评分面板检查标题/CTA/垃圾词/移动端风险</p>
                  <div className="dash-flow-actions">
                    <button className="btn btn-secondary" onClick={() => { onNavigate && onNavigate('campaigns', 'aiworkshop'); }}>去创意工坊生成</button>
                    <button className="btn btn-primary" onClick={() => handleWorkflowNavigate('campaigns', 'check', 3, 'score')}>去评分检查</button>
                  </div>
                </>
              )}
              {workflowStep === 3 && (
                <>
                  <div className="dash-flow-title">排发送时间</div>
                  <p className="dash-flow-copy">{cal?.advice?.bestSlot || '建议上午 8:00-10:00'}</p>
                  <div className="dash-flow-actions">
                    <button className="btn btn-primary" onClick={() => handleWorkflowNavigate('analytics', 'schedule', 3, 'calendar')}>打开日历排期</button>
                    <button className="btn btn-secondary" onClick={() => setWorkflowStep(0)}>再做一封</button>
                  </div>
                </>
              )}
            </div>
            <div className="dash-flow-next">下一步：{workflowNextAction}</div>
          </div>

          {/* Milled.com 模板资源 */}
          <div className="card stage-milled-card">
            <h2>📬 Milled.com 邮件模板</h2>
            <div className="stage-milled-grid">
              {MILLED_LINKS.map(link => (
                <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" className="stage-milled-item">
                  <span>{link.icon}</span><span>{link.label}</span><span className="stage-milled-arrow">↗</span>
                </a>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ==================================== */}
      {/* 阶段 3：高级运营                      */}
      {/* ==================================== */}
      {stage === 3 && (
        <>
          {/* 本周发送计划 */}
          <div className="card">
            <h2>本周发送计划</h2>
            <div className="dash-plan-cards">
              {weekPlan.map((day, i) => (
                <div key={i} className={`dash-plan-item${day.isToday ? ' dash-plan-today' : ''}${day.isPast ? ' dash-plan-past' : ''}`}>
                  <div className="dash-plan-top">
                    <span className="dash-plan-day">{day.dayName}</span>
                    <span className="dash-plan-date">{day.dateStr}</span>
                    {day.isToday && <span className="dash-plan-badge">今天</span>}
                    {day.isPast && <span className="dash-plan-badge past">已过</span>}
                  </div>
                  <div className="dash-plan-pillar" style={{ color: day.pillar.color }}>{day.pillar.icon} {day.pillar.label}</div>
                  <div className="dash-plan-info"><span>🕐 {day.slot}</span><span>👥 {day.segment}</span></div>
                  <div className="dash-plan-hint">{day.hint}</div>
                </div>
              ))}
            </div>
            <div className="dash-plan-tip">💡 一周 3 封 là 黄金频率（2 销售 + 1 内容），低于 2 封用户忘记你，高于 5 封触发退订</div>
          </div>

          {/* 活动日历 + 数据分析 */}
          <div className="grid-2">
            <div className="card" style={{ textAlign: 'center' }}>
              <h2>📅 活动日历</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '8px 0' }}>查看竞品发送节奏，规划你的发送窗口，错峰发送效果更好。</p>
              <button className="btn btn-primary btn-sm" onClick={() => onNavigate && onNavigate('analytics', 'calendar')}>打开活动日历 →</button>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <h2>📊 数据分析</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '8px 0' }}>竞品对比、周报、主题行排行、品牌对比等完整数据分析工具。</p>
              <button className="btn btn-primary btn-sm" onClick={() => onNavigate && onNavigate('analytics')}>打开数据分析 →</button>
            </div>
          </div>

          {/* A/B 测试 */}
          <div className="card">
            <div className={`card-collapse-header${showAbTest ? ' open' : ''}`} onClick={() => setShowAbTest(c => !c)}>
              <h2>A/B 测试协议 <span className="card-badge">科学验证</span></h2>
              <span className="card-collapse-chevron">{showAbTest ? '▴' : '▾'}</span>
            </div>
            {showAbTest && (
              <div style={{ marginTop: 14 }}>
                <div className="dash-ab-top">
                  <div className="dash-ab-priority">
                    <div className="dash-ab-priority-title">测试优先级（按收益排序）</div>
                    <div className="dash-ab-priority-list">
                      <div className="dash-ab-prio-item"><span>1</span><span>主题行</span><span>影响打开率</span></div>
                      <div className="dash-ab-prio-item"><span>2</span><span>发送时间</span><span>找最佳窗口</span></div>
                      <div className="dash-ab-prio-item"><span>3</span><span>CTA 文案/颜色</span><span>影响点击率</span></div>
                      <div className="dash-ab-prio-item"><span>4</span><span>Offer 力度</span><span>测利润最优</span></div>
                      <div className="dash-ab-prio-item"><span>5</span><span>发件人名称</span><span>测信任感</span></div>
                    </div>
                  </div>
                  <div className="dash-ab-calc">
                    <div className="dash-ab-calc-title">样本量计算器</div>
                    <div className="dash-ab-calc-row">
                      <label>当前打开率</label>
                      <select value={abOpenRate} onChange={e => setAbOpenRate(Number(e.target.value))}>
                        <option value={10}>10%</option><option value={15}>15%</option><option value={20}>20% (行业均值)</option><option value={25}>25%</option><option value={30}>30%</option>
                      </select>
                    </div>
                    <div className="dash-ab-calc-row">
                      <label>想检测的提升</label>
                      <select value={abLift} onChange={e => setAbLift(Number(e.target.value))}>
                        <option value={10}>10% (细微)</option><option value={20}>20% (显著)</option><option value={30}>30% (大幅)</option>
                      </select>
                    </div>
                    <div className="dash-ab-calc-result">
                      <div className="dash-ab-calc-stat"><span className="dash-ab-calc-val">{abSampleSize.perVariant.toLocaleString()}</span><span className="dash-ab-calc-unit">每版本需发送</span></div>
                      <div className="dash-ab-calc-stat"><span className="dash-ab-calc-val">{abSampleSize.total.toLocaleString()}</span><span className="dash-ab-calc-unit">总样本量</span></div>
                      <div className="dash-ab-calc-stat"><span className="dash-ab-calc-val">~{abSampleSize.days}</span><span className="dash-ab-calc-unit">天（按500封/天）</span></div>
                    </div>
                    <div className="dash-ab-calc-tip">95% 置信度 · 等结果出来之前不要提前看、不要提前停</div>
                  </div>
                </div>
                <div className="dash-ab-rules">
                  <div className="dash-ab-rules-title">A/B 测试黄金法则</div>
                  <div className="dash-ab-rules-grid">
                    <div className="dash-ab-rule"><span className="dash-ab-rule-icon">1️⃣</span><span><strong>一次只测一个变量</strong> — 同时改标题+图片，你不知道是哪个起作用</span></div>
                    <div className="dash-ab-rule"><span className="dash-ab-rule-icon">2️⃣</span><span><strong>随机分流</strong> — 两组用户画像必须相同</span></div>
                    <div className="dash-ab-rule"><span className="dash-ab-rule-icon">3️⃣</span><span><strong>样本量够了再下结论</strong> — 50 封的 5% 差异是噪音</span></div>
                    <div className="dash-ab-rule"><span className="dash-ab-rule-icon">4️⃣</span><span><strong>不要中途停止</strong> — 等样本量达标再判断</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 竞品速递 */}
          <div className="card">
            <h2>竞品速递 · 本周摘要</h2>
            <div className="dash-comp-content">
              {stats ? (
                <>
                  <span className="dash-comp-stat">📊 竞品共发 <strong>{stats.thisWeek || '...'}</strong> 封</span>
                  <span className="dash-comp-stat">🏷️ <strong>{stats.offerRate || '...'}%</strong> 含折扣</span>
                  <span className="dash-comp-stat">🔥 紧迫感 <strong>{stats.avgUrgency || '...'}/5</strong></span>
                  <span className="dash-comp-stat">📱 <strong>{stats.emojiRate || '...'}%</strong> 含 emoji</span>
                  <button className="btn btn-sm btn-outline" style={{ marginLeft: 'auto', color: 'var(--primary)', borderColor: 'var(--primary)' }} onClick={() => onNavigate && onNavigate('analytics')}>📊 查看详情</button>
                </>
              ) : <span className="dash-comp-empty">数据加载中...</span>}
            </div>
          </div>

          {/* 竞品邮件建议 */}
          <div className="card stage-comp-suggest">
            <h2>🎯 本周值得借鉴的邮件策略</h2>
            {stats ? (
              <div className="comp-suggest-grid">
                <div className="comp-suggest-item">
                  <span className="comp-suggest-icon">
                    {Number(stats.offerRate || 0) > 40 ? '⚠️' : '✅'}
                  </span>
                  <div>
                    <strong>促销密度 {Number(stats.offerRate || 0) > 40 ? '偏高' : '正常'}</strong>
                    <p>
                      {Number(stats.offerRate || 0) > 40
                        ? '竞品大面积打折，建议避开纯价格战，改用赠品/免邮/独家内容做差异化'
                        : '竞品促销力度适中，适合发销售型邮件，用限时+独家优惠推动转化'}
                    </p>
                  </div>
                </div>
                <div className="comp-suggest-item">
                  <span className="comp-suggest-icon">
                    {Number(stats.avgUrgency || 0) > 3 ? '🔍' : '💡'}
                  </span>
                  <div>
                    <strong>{Number(stats.avgUrgency || 0) > 3 ? '竞品都在制造紧迫感' : '紧迫感偏低，你来做领头羊'}</strong>
                    <p>
                      {Number(stats.avgUrgency || 0) > 3
                        ? '建议用更克制的语气建立信任——冷静反而突出。主打产品价值+长期服务保障'
                        : '竞品节奏松散，正是抢占用户注意力的时候。用限时+限量快速收割'}
                    </p>
                  </div>
                </div>
                <div className="comp-suggest-item">
                  <span className="comp-suggest-icon">📧</span>
                  <div>
                    <strong>推荐邮件类型</strong>
                    <p>
                      {Number(stats.offerRate || 0) > 40
                        ? '教育内容+品牌故事 → 建立差异化认知 → 再推专属优惠'
                        : Number(stats.avgUrgency || 0) > 3
                          ? '用户评价+案例分享 → 信任建设 → 温和CTA'
                          : '限时促销+新品首发 → 抓住窗口期 → 配合社交媒体'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="dash-comp-empty">采集竞品数据后，这里会自动生成邮件策略建议</div>
            )}
            <div style={{ marginTop: 10 }}>
              <button className="btn btn-sm btn-outline" style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}
                onClick={() => { setStage(2); setTimeout(() => window.scrollTo({ top: 600, behavior: 'smooth' }), 100); }}>
                📬 查看竞品邮件模板（Milled.com）→
              </button>
            </div>
          </div>

        </>
      )}

      {/* 阶段切换按钮（底部） */}
      <div className="stage-nav-bottom">
        {stage > 1 && (
          <button className="btn btn-outline" onClick={() => setStage(s => s - 1)}>← 阶段{stage - 1}：{STAGES[stage - 2].title}</button>
        )}
        <span style={{ flex: 1 }} />
        {stage < 3 && (
          <button className="btn btn-primary" onClick={() => setStage(s => s + 1)}>进入阶段{stage + 1}：{STAGES[stage].title} →</button>
        )}
      </div>

    </div>
  );
}
