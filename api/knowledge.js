// Email Strategy Tool — Knowledge Base
// Ported from email-strategy/knowledge.py

export const BRANDS = {
  MeepoBoard: {
    name: "MeepoBoard",
    category: "电动滑板",
    url: "meepoboard.com",
    recommended_archetype: "Editorial",
    tone: "周末 warrior 语调，UGC 内容驱动",
    keywords: ["ride", "skate", "electric skateboard", "commute", "freedom"],
    color_hex: "#e8590c",
    mission: "让每个人都能体验到电动滑板的自由与乐趣",
  },
  OBE: {
    name: "OBE",
    category: "投影仪",
    url: "obe-projector.com",
    recommended_archetype: "Lookbook",
    tone: "家庭影院场景叙事，科技温暖",
    keywords: ["home theater", "cinema", "4K", "projector", "movie night"],
    color_hex: "#1a1a2e",
    mission: "把电影院搬进每个家庭",
  },
  custom: {
    name: "自定义品牌",
    category: "",
    url: "",
    recommended_archetype: "Editorial",
    tone: "",
    keywords: [],
    color_hex: "#6C5CE7",
    mission: "",
  },
};

export const DTC_BENCHMARKS = [
  { metric: "点击率 CTR", target: "2-3%", excellent: "4%+", warning: "<1%" },
  { metric: "点击打开率 CTOR", target: "10-15%", excellent: "20%+", warning: "<5%" },
  { metric: "退订率", target: "<0.2%", excellent: "<0.1%", warning: ">0.5%" },
  { metric: "弹回率", target: "<2%", excellent: "<1%", warning: ">3%" },
  { metric: "垃圾投诉率", target: "<0.1%", excellent: "<0.05%", warning: ">0.3%" },
  { metric: "列表增长率", target: "3-5%/月", excellent: "5%+/月", warning: "负数" },
];

export const EMAIL_TYPE_BENCHMARKS = [
  { type: "Welcome 欢迎", open_rate: "50-60%", click_rate: "5-8%", rpr: "基准 2.5x" },
  { type: "弃购挽回", open_rate: "40-50%", click_rate: "5-10%", rpr: "前十 $3.07" },
  { type: "促销 Campaign", open_rate: "15-20%", click_rate: "2-3%", rpr: "基准" },
  { type: "Newsletter", open_rate: "20-30%", click_rate: "3-5%", rpr: "—" },
  { type: "交易邮件", open_rate: "60-80%", click_rate: "5-15%", rpr: "—" },
];

export const ENGAGEMENT_TIERS = [
  { tier: 1, condition: "最近 30 天有点击", send_ratio: "100%", action: "每封 campaign 都发" },
  { tier: 2, condition: "最近 60 天有点击", send_ratio: "75%", action: "75% 的发送量" },
  { tier: 3, condition: "最近 90 天有点击", send_ratio: "50%", action: "只发最好内容" },
  { tier: 4, condition: "90-180 天无互动", send_ratio: "0%", action: "仅 re-engagement flow" },
  { tier: 5, condition: "180 天+", send_ratio: "0%", action: "sunset flow，停止发送" },
];

export const COMPLIANCE_RULES = [
  "所有邮件含退订链接（一键退订 RFC 8058）",
  "Footer 含物理地址（CAN-SPAM 强制）",
  "主题行不得误导收件人（禁止 Re: Fwd: 伪装）",
  "退订请求 10 个工作日内处理",
  "不要购买邮件列表 — 毁送达率",
  "新域名/新 IP 需预热 2-4 周",
];

export const SEQUENCE_TYPES = [
  { priority: 1, name: "Welcome 欢迎", email_count: "4-6", duration: "1-2 周", trigger: "用户注册/订阅", rpr: "每封收入 3.2x 基准" },
  { priority: 2, name: "弃购挽回", email_count: "3", duration: "48h", trigger: "加购未付款", rpr: "挽回率 17%" },
  { priority: 3, name: "浏览未购", email_count: "2-3", duration: "3-5 天", trigger: "浏览产品未购买", rpr: "中等" },
  { priority: 4, name: "售后序列", email_count: "4-5", duration: "30 天", trigger: "订单完成", rpr: "高（交叉销售）" },
  { priority: 5, name: "Win-back 召回", email_count: "3-4", duration: "2-3 周", trigger: "60-90 天不活跃", rpr: "中等" },
];

export const SEQUENCE_TEMPLATES = {
  "Welcome 欢迎": [
    { num: 1, timing: "即时", purpose: "交付承诺 + 一句话使命 + 一个提问", subject_hint: "Welcome to {brand} — 你的第一步" },
    { num: 2, timing: "Day 2", purpose: "品牌故事 / 为什么存在", subject_hint: "{brand} 是怎么来的" },
    { num: 3, timing: "Day 4", purpose: "社交证明 / 真实评价", subject_hint: "已经有 {N}+ 人在用了" },
    { num: 4, timing: "Day 7", purpose: "最佳内容 / 产品使用场景", subject_hint: "周末骑行路线推荐" },
    { num: 5, timing: "Day 10", purpose: "软性转化 + 偏好中心", subject_hint: "找到最适合你的那块板" },
    { num: 6, timing: "Day 14", purpose: "设定期望 + 下次内容预告", subject_hint: "接下来你会收到什么" },
  ],
  "弃购挽回": [
    { num: 1, timing: "1-4h", purpose: "简单提醒 — 不打折！", subject_hint: "你的购物车里还有东西" },
    { num: 2, timing: "24h", purpose: "解决顾虑 — 评价、物流、售后保证", subject_hint: "担心什么？我们解答" },
    { num: 3, timing: "48h", purpose: "小额激励（仅首次弃购，保利润）", subject_hint: "为你保留的小礼物" },
  ],
  "浏览未购": [
    { num: 1, timing: "24h", purpose: "你浏览过的产品 + 亮点", subject_hint: "刚才看的那款，了解更多" },
    { num: 2, timing: "Day 3", purpose: "社交证明 / 用户评价", subject_hint: "别人用 {product} 的真实体验" },
    { num: 3, timing: "Day 5", purpose: "限时提醒 / 库存提醒", subject_hint: "这款快没了" },
  ],
  "售后序列": [
    { num: 1, timing: "即时", purpose: "订单确认 + 感谢", subject_hint: "你的订单已确认！" },
    { num: 2, timing: "Day 2-3", purpose: "物流更新 / 在路上", subject_hint: "你的包裹正在路上" },
    { num: 3, timing: "Day 7-10", purpose: "使用指南 / 开箱体验（跨境加物流焦虑安抚）", subject_hint: "让你的 {product} 发挥最大价值" },
    { num: 4, timing: "Day 14-21", purpose: "满意度检查 + 交叉销售推荐", subject_hint: "用得怎么样？" },
    { num: 5, timing: "Day 21-30", purpose: "评价请求（对接 Trustpilot）", subject_hint: "帮我们做得更好" },
  ],
  "Win-back 召回": [
    { num: 1, timing: "Day 60", purpose: "真诚关心 — '想你了'", subject_hint: "好久不见" },
    { num: 2, timing: "Day 63", purpose: "价值提醒 + 新品亮点", subject_hint: "你离开后的这些变化" },
    { num: 3, timing: "Day 67", purpose: "特别 offer / 专属折扣", subject_hint: "专门给你留的" },
    { num: 4, timing: "Day 74", purpose: "Breakup — 回复率最高的邮件", subject_hint: "我们该说再见了吗？" },
  ],
};

export const SUBJECT_LINE_FORMULAS = [
  { name_cn: "好奇", name_en: "Curiosity", example: "这个滑板和你想的不一样", best_for: "Newsletter, 品牌邮件" },
  { name_cn: "How-to", name_en: "How-to", example: "如何在10分钟内上手新板", best_for: "教育内容, 使用指南" },
  { name_cn: "问题", name_en: "Question", example: "还在为投影仪选型头疼？", best_for: "培育序列, 痛点触发" },
  { name_cn: "社交证明", name_en: "Social Proof", example: "2000+ riders 已经换板了", best_for: "转化邮件, 信任建立" },
  { name_cn: "直接", name_en: "Direct", example: "{Name}，你的推荐在这", best_for: "Welcome, 个性化推荐" },
  { name_cn: "紧迫", name_en: "Urgency", example: "限量配色还剩12小时", best_for: "促销, 限时活动" },
];

export const BODY_FRAMEWORKS = [
  {
    name: "AIDA", full: "Attention → Interest → Desire → Action",
    steps: [
      "Attention — 抓住注意力的第一句话",
      "Interest — 为什么这对你很重要",
      "Desire — 真实案例 / 效果 / 使用场景",
      "Action — 单一 CTA，动作 + 结果",
    ],
    best_for: "促销邮件、转化邮件",
  },
  {
    name: "PAS", full: "Problem → Agitate → Solution",
    steps: [
      "Problem — 点出具体痛点",
      "Agitate — 让痛点更痛（不处理的后果）",
      "Solution — 你的产品/方案登场",
    ],
    best_for: "培育序列、冷邮件、痛点触发",
  },
  {
    name: "BAB", full: "Before → After → Bridge",
    steps: [
      "Before — 使用前的状态（痛点场景）",
      "After — 使用后的改变（理想状态）",
      "Bridge — 你的产品如何连接两个世界",
    ],
    best_for: "案例故事、新品发布、品牌叙事",
  },
];

export const CTA_RULES = [
  "一封邮件一个主 CTA",
  "按钮文字：动作 + 结果（'看你的推荐' > '点击这里'）",
  "CTA 位置：折叠线上方 + 正文下方各一个（总点击 +35%）",
  "弃购首封邮件不打折 — 先提醒，再解决顾虑，最后才给激励",
];

export const COPY_CHECKLIST = [
  "读出来像人话吗？",
  "'你/你的' > '我/我们'？",
  "每段 ≤ 3 句？",
  "全邮件 1 个主 CTA？",
  "长度合适？（交易 50-125词 / 教育 150-300词 / 故事 300-500词）",
  "Preview 不重复主题行？",
  "主题行 ≤ 45 字符？",
];

export const VISUAL_ARCHETYPES = [
  { name: "Editorial", when: "Newsletter、品牌故事", hallmarks: "衬线标题、全幅照片、慷慨行距、单列、声音为王", reference: "Patagonia, Tracksmith, Lucy Folk", icon: "📰" },
  { name: "Bold Mono", when: "促销、新品发布、声明", hallmarks: "一种高饱和色铺满、超大字、极少文案", reference: "Absolut, Liquid Death, Fly By Jing", icon: "🎯" },
  { name: "Minimal Lux", when: "高端产品、交易邮件", hallmarks: "淡色中性、472-520px 窄宽、一个强调色、大量呼吸感", reference: "Stripe, Apple, Aesop, MoMA", icon: "✨" },
  { name: "Founder Letter", when: "Welcome、Win-back、需要回复时", hallmarks: "纯文本感、第一人称、短段落、签名落款、无模板铬", reference: "Ugmonk, Superhuman, Tracksmith CEO", icon: "✍️" },
  { name: "Punk/Character", when: "品牌个性强烈的邮件", hallmarks: "品牌角色/吉祥物主导、不羁文案、自定义图像", reference: "Frank Body, Duolingo, Liquor Loot, Chubbies", icon: "🎸" },
  { name: "Lookbook", when: "产品展示、时尚、美食", hallmarks: "编辑级产品照 > 文案、画廊式布局、全幅 hero", reference: "Dior, Clare Paint, Starbucks 季节性", icon: "📸" },
];

export const COLOR_STRATEGIES = [
  { name: "Restrained", ratio: "≤10%", when: "交易邮件、Minimal Lux 原型", desc: "淡色中性 + 单色强调。强调色仅在关键 CTA 出现。" },
  { name: "Committed", ratio: "30-60%", when: "品牌识别邮件、Editorial 原型", desc: "一种饱和色覆盖 30-60% 表面。品牌一眼可辨。" },
  { name: "Drenched", ratio: "整面 = 颜色", when: "Hero、Bold Mono 原型、发布声明", desc: "邮件表面 = 一个颜色。极少文案，最强视觉冲击。" },
];

export const TYPOGRAPHY_RULES = {
  max_width: "472-600px（单列）",
  body_size: "14-16px",
  heading_size: "22-34px",
  line_length: "50-65 字符/行",
  font_rule: "一套字体。加第二套需有明确功能理由。",
  touch_target: "≥44×44px",
};

export const DESIGN_FORBIDDEN = [
  "纯黑 #000 或纯白 #fff — 朝品牌色偏一点",
  "行业刻板配色：金融=蓝金、健康=白绿、AI=黑荧光",
  "连续两个 spacer section",
  "双 <br> 或同方向 margin+padding",
  "空 text section 当 spacer 用",
  "AI 生成图 / stock 图 / 平面几何装饰",
  "渐变文字、background-clip: text",
  "嵌套卡片",
  "超过 2 个 CTA",
  "Em dash (—) 在正文中",
];

export const IMAGE_RULES = [
  "真实摄影或定制插画 — 不用 AI 生成图/stock 图",
  "Hero 必须有目的：产品、人物、场景、时刻。纯装饰不够",
  "每张 ≤ 200KB，总负载 ≤ 800KB",
  "每张都要 alt text（33% 用户屏蔽图片）",
  "暗黑模式：透明 PNG logo + 非纯白背景",
];

export const FOOTER_REQUIREMENTS = [
  "使命语句（从品牌字段摘取，禁止编造）",
  "社交图标（3-5个，真实链接）",
  "物理地址（CAN-SPAM 强制，一行）",
  "退订链接（可见，非微小字，[unsubscribe] 非 [preferences]）",
  "小字号 12-13px，中性偏淡文字，足量内部留白",
];

// Scenario presets for quick start
export const SCENARIO_PRESETS = [
  {
    id: "welcome", icon: "👋", name: "欢迎新用户",
    desc: "新订阅者注册后自动发 4-6 封欢迎邮件，建立信任、引导首单",
    when: "有邮件订阅/注册流程的品牌",
    sequence: "Welcome 欢迎", email_count: 4, framework: "AIDA", tone: "friendly",
    archetype: "Editorial", color: "Committed",
    tip: "Welcome 序列是所有自动化中 ROI 最高的 — 每封带来的收入是促销邮件的 3.2 倍",
  },
  {
    id: "cart", icon: "🛒", name: "弃购挽回",
    desc: "用户加了购物车但没付款，3 封邮件把 ta 拉回来完成购买",
    when: "有购物车功能的电商",
    sequence: "弃购挽回", email_count: 3, framework: "PAS", tone: "friendly",
    archetype: "Minimal Lux", color: "Restrained",
    tip: "首封邮件绝对不要打折 — 70% 的人只是忘了，提醒就够了",
  },
  {
    id: "newsletter", icon: "📰", name: "品牌 Newsletter",
    desc: "定期发品牌故事、产品使用技巧、用户故事，保持用户粘性",
    when: "想持续跟用户保持联系的品牌",
    sequence: "Welcome 欢迎", email_count: 3, framework: "BAB", tone: "warrior",
    archetype: "Editorial", color: "Committed",
    tip: "Newsletter 的核心不是卖货 — 是让用户每次打开都觉得'这封邮件值得读'",
  },
  {
    id: "winback", icon: "💔", name: "沉默用户唤醒",
    desc: "用户 60 天没互动了？4 封邮件尝试把 ta 叫回来",
    when: "有一段时间没打开邮件的用户",
    sequence: "Win-back 召回", email_count: 4, framework: "PAS", tone: "friendly",
    archetype: "Founder Letter", color: "Restrained",
    tip: "最后一封 Breakup 邮件是整个序列里回复率最高的 — 真诚比套路管用",
  },
  {
    id: "launch", icon: "🚀", name: "新品发布",
    desc: "新产品/新配色上市，造势→预告→开售→追单",
    when: "即将推出新产品的品牌",
    sequence: "Welcome 欢迎", email_count: 4, framework: "AIDA", tone: "warrior",
    archetype: "Bold Mono", color: "Drenched",
    tip: "Bold Mono 原型 + Drenched 色彩 = 新品发布的视觉冲击力拉满",
  },
  {
    id: "postpurchase", icon: "📦", name: "售后跟进",
    desc: "下单后 30 天内的跟进序列：感谢→物流→使用→评价→复购",
    when: "有跨境物流的品牌（特别适合你）",
    sequence: "售后序列", email_count: 5, framework: "BAB", tone: "warm",
    archetype: "Editorial", color: "Committed",
    tip: "跨境电商物流 7-20 天，中间加'包裹在路上'安抚邮件，减少客服压力",
  },
];
