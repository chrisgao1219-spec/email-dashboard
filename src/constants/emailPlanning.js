export const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export const WEEK_THEMES = [
  { theme: '教育', icon: '📚', goal: '建立专业认知，降低选择焦虑', color: '#6366f1' },
  { theme: '促销', icon: '🔥', goal: '主推产品，驱动转化', color: '#ef4444' },
  { theme: '互动', icon: '💬', goal: '社区 UGC，品牌故事', color: '#f59e0b' },
  { theme: '维护', icon: '💎', goal: '忠诚度 VIP，复购激励', color: '#10b981' },
];

export const CONTENT_PILLARS = [
  { id: 'edu', label: '教育', pct: 30, color: '#6366f1', icon: '📖' },
  { id: 'insp', label: '灵感', pct: 25, color: '#f59e0b', icon: '💡' },
  { id: 'entertain', label: '娱乐', pct: 25, color: '#ec4899', icon: '🎮' },
  { id: 'sales', label: '销售', pct: 15, color: '#ef4444', icon: '🏷️' },
  { id: 'comm', label: '社区', pct: 5, color: '#10b981', icon: '🤝' },
];

export const RFM_SEGMENTS = [
  { tier: '活跃', range: '0-30天未互动', freq: '3封/周', content: '完整内容 · 新品+促销+教育', style: 'active' },
  { tier: '温和', range: '31-90天未互动', freq: '2封/周', content: '75%内容 · 教育+促销各半', style: 'warm' },
  { tier: '冷却', range: '91-180天未互动', freq: '1封/周', content: '品类教育+低门槛回归 Offer', style: 'cool' },
  { tier: '流失', range: '180天+', freq: '4封/14天', content: '赢回序列 · 情感+大促+分手', style: 'lost' },
];

export const MAMBA_SEGMENT_GUIDE = [
  {
    segment: '7天内注册用户', icon: '🆕', color: '#6366f1',
    trigger: '注册 ≤ 7天',
    content: ['品牌故事', '产品功能拆解', '用户真实案例'],
    tip: '建立认知，让用户知道你是谁、为什么值得信任',
  },
  {
    segment: '30天内浏览过产品', icon: '👀', color: '#8b5cf6',
    trigger: '30天内有浏览、未购买',
    content: ['用户评价 UGC', '限时折扣', '免费赠品'],
    dynamic: '浏览过 {商品名}',
    tip: '兴趣还在，用社交证明+利益刺激推动首单',
  },
  {
    segment: '30天内加购未付', icon: '🛒', color: '#ef4444',
    trigger: '30天内有加购、购物车非空',
    content: ['限时折扣', '赠品', '售后政策', '用户评价'],
    dynamic: '购物车商品 = {商品名}',
    tip: '离购买只差临门一脚，消除最后顾虑',
  },
  {
    segment: '30天内已结账', icon: '✅', color: '#10b981',
    trigger: '30天内有下单',
    content: ['搭配推荐', '会员权益介绍', '鼓励评价'],
    tip: '刚建立信任，趁热交叉销售 + 收集UGC',
  },
  {
    segment: '30天内打开未点击', icon: '📬', color: '#f59e0b',
    trigger: '30天内有打开、无点击',
    content: ['行业干货', '独家资讯', '精选商品', '小活动'],
    tip: '对品牌有兴趣但没找到打动点，换内容类型测试',
  },
  {
    segment: '30天内有点击', icon: '👆', color: '#06b6d4',
    trigger: '30天内有点击行为',
    content: ['针对点击商品的跟进', '热销榜', '限时促销'],
    dynamic: '点击过 {商品名}',
    tip: '明确兴趣信号，围绕点击商品精准推进',
  },
  {
    segment: '30天内打开过未下单', icon: '📧', color: '#ec4899',
    trigger: '30天内打开邮件、未购买',
    content: ['首单折扣', '成功案例', '真实用户故事', '紧迫感'],
    tip: '多次触达未转化，需要信任+利益双重驱动',
  },
  {
    segment: '浏览→结账→打开', icon: '🔄', color: '#84cc16',
    trigger: '浏览+结账+打开均有行为',
    content: ['夏季保养类活动', '季节性主题促销'],
    tip: '高活跃全链路用户，用季节话题激活复购',
  },
];

export const WATERFALL = [
  { priority: 1, type: '弃购挽回', trigger: '触发式', schedule: '加购后 1h / 24h / 48h · 共3封', tip: '竞品弃购邮件越少，抢占窗口越大' },
  { priority: 2, type: '购后跟进', trigger: '触发式', schedule: '下单后第1天 / 7天 / 14天 / 21天 / 30天', tip: '插评价请求 + 交叉销售' },
  { priority: 3, type: '浏览召回', trigger: '触发式', schedule: '浏览后 4h / 第2天 / 第5天 · 共3封', tip: '浏览未购说明有兴趣，趁热打铁' },
  { priority: 4, type: '沉默唤醒', trigger: '定时 · 60天', schedule: '第60天 / 63天 / 67天 / 74天 · 共4封', tip: '分手邮件回复率最高，认真写' },
  { priority: 5, type: '促销推广', trigger: '定时 · 每周', schedule: '活跃2-4封/周 · 温和1-2封/周', tip: '控制频率，挤水分保证送达率' },
];

export const SUBJECT_PROMPTS = {
  edu: [
    '「{product}」使用中容易忽视的3个技巧',
    '为什么资深玩家都选{category}？深度分析',
    '{product} vs 同类产品：差距在哪儿？',
    '一个被90%人忽视的{category}选购要点',
  ],
  insp: [
    '看看其他人用{product}做了什么',
    '从入门到精通：{product}的进阶玩法',
    '这周的{category}灵感，颠覆你的想象',
    '达人的{product}使用日志 · 第X期',
  ],
  entertain: [
    '测测你是哪种{category}玩家？',
    '这周{category}圈最好笑的事',
    '我们问100个人「为什么喜欢{product}」',
    '「{product}」背后的故事，你知道吗',
  ],
  sales: [
    '限时特惠：{product}本周专属折扣',
    '清仓闪购 · 仅限48小时',
    '新品首发：{product}抢先体验价',
    '会员专享：{product}史低价仅此一次',
  ],
  comm: [
    '你的{product}故事，我们想听',
    '本周社区精选 · 用户作品展示',
    '加入{category}社群，和1000+玩家交流',
    '你的反馈，让{product}更好用',
  ],
};

export function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDate(d) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function weekLabel(weekIdx, monday) {
  const sun = new Date(monday);
  sun.setDate(sun.getDate() + 6);
  return `第${weekIdx + 1}周 · ${formatDate(monday)}-${formatDate(sun)}`;
}

export function bestSendDays(dayStats) {
  if (!dayStats || Object.keys(dayStats).length === 0) return ['周二', '周四', '周三'];
  return Object.entries(dayStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([d]) => d);
}

export function bestSendSlots(slotStats) {
  const slots = slotStats && Object.keys(slotStats).length > 0
    ? Object.entries(slotStats).sort((a, b) => b[1] - a[1])
    : [];
  if (slots.length > 0) return slots.slice(0, 3).map(([s]) => s);
  return ['上午 08:00-10:00', '下午 19:00-21:00', '上午 10:00-12:00'];
}

export function pillarForDay(dayIndex, weekNum) {
  const seq = (weekNum * 7 + dayIndex) % 5;
  const order = ['edu', 'insp', 'entertain', 'sales', 'comm'];
  return CONTENT_PILLARS.find(p => p.id === order[seq]);
}

export function subjectPrompt(pillarId, productName, category) {
  const prompts = SUBJECT_PROMPTS[pillarId] || SUBJECT_PROMPTS.edu;
  const idx = Math.floor(Math.random() * prompts.length);
  return prompts[idx].replace('{product}', productName || '产品').replace('{category}', category || '品类');
}

export function segmentForFreq(freqPerWeek) {
  if (freqPerWeek >= 3) return { label: '活跃 + 温和', className: 's-active' };
  if (freqPerWeek >= 2) return { label: '活跃', className: 's-active' };
  return { label: '全部', className: 's-all' };
}
