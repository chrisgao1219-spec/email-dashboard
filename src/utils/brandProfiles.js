// 品牌配置 — 品牌切换的全局上下文来源

export const brandProfiles = {
  Kukirin: {
    displayName: 'KuKirin',
    category: 'Electric Scooters',
    brandTone: 'sporty, energetic, performance-driven, ecommerce',
    visualStyle: 'dark cinematic, neon green accents, urban mobility, speed, riding scenes, product-focused layouts',
    products: [
      { name: 'KuKirin G2', sellingPoint: 'Entry-level electric scooter for daily city rides, lightweight, easy to control, suitable for new riders.' },
      { name: 'KuKirin G4', sellingPoint: 'Long-range electric scooter with strong performance, suitable for commuting and longer urban rides.' },
      { name: 'KuKirin G2 Max', sellingPoint: 'Balanced performance and comfort, upgraded range, stable riding experience for everyday use.' },
      { name: 'KuKirin G2 Master', sellingPoint: 'Dual-motor power, stronger climbing ability, enhanced suspension, built for riders who want more performance.' },
    ],
    audienceRules: {
      promotion: ['新订阅用户', '高意向访客', '加购未购买用户', '历史购买用户', '价格敏感用户'],
      maintenance: ['已购买滑板车用户', '购买 3-6 个月的用户', '注册保修用户', '售后服务用户'],
      launch: ['历史购买用户', 'VIP 用户', '高意向访客', '对高性能产品感兴趣的用户'],
      holidayNotice: ['所有活跃客户', '近期购买用户', '有未完成订单的用户', '咨询过客服的用户'],
      welcome: ['新订阅用户', '首次购买用户', '新注册账户'],
      holidayCampaign: ['所有活跃客户', '历史购买用户', 'VIP 用户', '高互动订阅用户'],
      winback: ['沉默客户', '90 天未购买用户', '高订单价值用户', '停止阅读用户'],
      member: ['VIP 用户', '忠实复购用户', '有积分的会员', '高生命周期价值用户'],
      clearance: ['价格敏感用户', '历史购买用户', '加购未购买用户', '爱淘便宜的用户'],
      teaser: ['高互动订阅用户', '历史购买用户', '预约等待用户', '社媒关注用户'],
    },
  },
  Meepo: {
    displayName: 'Meepo',
    category: 'Electric Skateboards',
    brandTone: 'young, fast, street-style, adventurous',
    visualStyle: 'urban street, energetic motion, bold product visuals, youth lifestyle',
    products: [
      { name: 'Meepo Board', sellingPoint: 'Electric skateboard for fast urban rides' },
      { name: 'Meepo Accessories', sellingPoint: 'Parts and accessories for better riding experience' },
      { name: 'Maintenance Service', sellingPoint: 'Care reminders for electric skateboard owners' },
    ],
    audienceRules: {
      promotion: ['新订阅用户', '高意向访客', '加购未购买用户', '历史购买用户'],
      maintenance: ['已购买滑板用户', '购买 3-6 个月的用户', '售后服务用户'],
      launch: ['历史购买用户', 'VIP 用户', '新品预约用户'],
      holidayNotice: ['所有活跃客户', '近期购买用户', '有未完成订单的用户'],
      welcome: ['新订阅用户', '首次购买用户', '新注册账户'],
      holidayCampaign: ['所有活跃客户', '历史购买用户', 'VIP 用户'],
      winback: ['沉默客户', '90 天未购买用户', '高订单价值用户'],
      member: ['VIP 用户', '忠实复购用户', '有积分的会员'],
      clearance: ['价格敏感用户', '历史购买用户', '爱淘便宜的用户'],
      teaser: ['高互动订阅用户', '历史购买用户', '预约等待用户'],
    },
  },
};

// 邮件类型 → audienceRules key 的映射
export const TYPE_TO_AUDIENCE_RULE = {
  'Promotion': 'promotion',
  'New Product Launch': 'launch',
  'Maintenance Reminder': 'maintenance',
  'Welcome Email': 'welcome',
  'Holiday Notice': 'holidayNotice',
  'Holiday Campaign': 'holidayCampaign',
  'Customer Winback': 'winback',
  'Member Exclusive': 'member',
  'Clearance Sale': 'clearance',
  'Product Teaser': 'teaser',
};

// 获取品牌配置（大小写不敏感；无匹配时返回通用 fallback）
export function getBrandProfile(brand) {
  if (!brand) return brandProfiles.Meepo;
  const key = Object.keys(brandProfiles).find(k => k.toLowerCase() === String(brand).toLowerCase());
  if (key) return brandProfiles[key];
  return {
    displayName: brand,
    category: 'Outdoor Mobility',
    brandTone: 'professional, trustworthy, ecommerce',
    visualStyle: 'clean, modern, product-focused',
    products: [],
    audienceRules: brandProfiles.Meepo.audienceRules,
  };
}
