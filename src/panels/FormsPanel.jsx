import { useState } from 'react';

// 顶部 4 步流程
const STEPS = [
  { id: 1, icon: '🌐', title: '选择官网获客场景', desc: '先决定在哪个页面收集邮箱，例如首页、产品详情页、促销页或购物车页面。' },
  { id: 2, icon: '📋', title: '选择订阅表单类型', desc: '选择适合电动滑板车买家的表单，例如优惠券弹窗、转盘抽奖、会员专属优惠。' },
  { id: 3, icon: '🎁', title: '设置用户激励', desc: '给用户一个留下邮箱的理由，例如首单折扣、限时优惠、配件礼包、免运费。' },
  { id: 4, icon: '🚀', title: '发布并进入自动流程', desc: '表单上线后，曼巴会自动收集邮箱，并可以触发欢迎邮件、优惠邮件或弃购召回流程。' },
];

// 新手推荐：首单优惠订阅表单 的配置步骤
const POPUP_STEPS = [
  {
    title: '选择出现时机',
    detail: '不要让表单一进页面就弹出。建议先让用户浏览 5-8 秒，等他看过产品或价格后再出现，订阅意愿会更高。',
    choices: ['进入页面 5 秒后', '进入页面 8 秒后', '浏览产品详情页时', '加入购物车后', '滚动到页面 50% 时'],
    recommended: '进入页面 5 秒后',
  },
  {
    title: '选择给用户的好处',
    detail: '电动滑板车用户留下邮箱，通常是因为他们想拿到更好的价格、优惠码或购车福利。新手建议优先使用折扣或礼包类 Offer。',
    choices: ['首单 9 折', '领取 10% OFF', '限时 €50 OFF', '免费配件礼包', '免运费', '新品优惠提醒'],
    recommended: '领取 10% OFF',
  },
  {
    title: '填写弹窗文案',
    detail: '文案要直接告诉用户能获得什么，不要写得太泛。按钮不要写「提交」，要写用户点击后能得到的权益。',
    example: '标题：Get 10% OFF Your First Electric Scooter\n副标题：Subscribe now and receive your exclusive discount code.\n按钮：Claim My Discount',
    extra: '中文解释：标题直接说明用户可以获得首单优惠；副标题说明留下邮箱后会收到专属折扣码；按钮强调用户点击后能领取优惠，而不是单纯提交信息。\n\n错误示例：标题 Welcome、按钮 Submit',
  },
];

// 常见订阅表单类型（只保留 3 种）
const COMMON_FORM_TYPES = [
  { icon: '🎟️', name: '优惠券弹窗', pages: '首页、产品详情页、促销页', goal: '新用户首单转化', desc: '用户浏览电动滑板车时，留下邮箱领取折扣码。', demo: 'Get 10% OFF Your First Electric Scooter', tip: '新手优先使用' },
  { icon: '🎡', name: '转盘抽奖', pages: '促销活动页、黑五活动页、节日活动页', goal: '提升互动率和订阅率', desc: '用户输入邮箱后参与抽奖，可获得折扣、免运费或配件礼包。', demo: 'Spin to Win: Discount, Free Shipping or Accessories', tip: '适合大促活动使用' },
  { icon: '👑', name: '会员专属优惠表单', pages: '首页、品牌页、产品集合页', goal: '沉淀对电动滑板车感兴趣但暂时没有购买的潜在用户', desc: '用户订阅后可获得会员专属优惠、新品上市提醒和限时活动通知。', demo: 'Join Our Club for Exclusive Scooter Deals', tip: '适合长期获客使用' },
];

// 曼巴自动帮你做什么
const AUTO_ACTIONS = [
  { icon: '📥', text: '自动收集官网访客邮箱' },
  { icon: '📋', text: '自动把用户加入订阅名单' },
  { icon: '✉️', text: '自动触发欢迎邮件或优惠码邮件' },
  { icon: '🎯', text: '后续可用于节日促销、新品通知、弃购召回' },
  { icon: '📊', text: '可以在数据分析里查看表单订阅效果' },
];

// 新手设置清单
const SETUP_CHECKLIST = [
  { id: 'delay', label: '弹窗延迟 5-8 秒', detail: '不要让用户一进站就看到弹窗。给点时间浏览内容。' },
  { id: 'mobile', label: '移动端不遮挡主屏', detail: '移动弹窗不要遮挡 Google 要求的主内容区域，否则降权。' },
  { id: 'specific', label: 'Offer 明确具体', detail: '「9折」>「优惠」，「免费送货」>「好礼相送」。数字比形容词有力量。' },
  { id: 'cta', label: 'CTA 用第一人称', detail: '「给我折扣码」>「提交」，「开始省钱」>「了解更多」。' },
  { id: 'onefield', label: '只要邮箱', detail: '一个字段 = 最高转化。每多一个字段转化率降 ~10%。' },
  { id: 'close', label: '关闭按钮清晰', detail: '不要用羞辱性话术「不，我不想要优惠」。正常的 × 就够了。' },
  { id: 'welcome', label: '注册后立即兑现', detail: '自动触发欢迎邮件（Day 0），含承诺的折扣码。体验闭环。' },
  { id: 'abtest', label: 'A/B 测试 Offer', detail: '先测 Offer 类型（折扣 vs 免邮 vs 赠品），再测文案和时机。' },
];

// 常见误区
const MISTAKES = [
  { bad: '用户一进站就弹大窗，看不清关闭按钮', good: '延迟 5-8 秒，关闭按钮清晰可见（正常的 ×）' },
  { bad: '弹窗字段太多：姓名、邮箱、电话、性别...', good: '只要邮箱。其他信息在后续欢迎邮件或偏好中心收集' },
  { bad: '注册后没兑现 Offer，用户觉得被骗', good: '注册后立刻自动发送含折扣码的欢迎邮件（Day 0）' },
  { bad: '所有页面弹一样的 Offer', good: '广告进来的给折扣码，博客进来的给内容合集，匹配意图' },
  { bad: '每次访问都弹窗，用户不胜其烦', good: '关闭后 7 天内不再弹。浏览器拦截插件对频繁弹窗容忍度很低' },
  { bad: '转盘/抽奖概率不均，大奖项永远抽不中', good: '设多层级奖品（9折/8折/免邮/赠品），确保可中但稀有，小奖高频' },
];

// 底部新手推荐组合
const RECOMMENDED_COMBO = [
  { label: '表单类型', value: '优惠券弹窗' },
  { label: '出现页面', value: '官网首页或产品详情页' },
  { label: '出现时机', value: '进入页面 5 秒后' },
  { label: '用户激励', value: '领取 10% OFF' },
  { label: '按钮文案', value: 'Claim My Discount' },
  { label: '后续动作', value: '自动发送欢迎邮件和优惠码邮件' },
];

export default function FormsPanel() {
  const [checkOpen, setCheckOpen] = useState(false);
  const [mistakeOpen, setMistakeOpen] = useState(false);
  const [checkedItems, setCheckedItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('forms_checklist_done') || '[]'); }
    catch { return []; }
  });

  const toggleCheck = (id) => {
    setCheckedItems(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try { localStorage.setItem('forms_checklist_done', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const completedCount = checkedItems.length;
  const progressPct = Math.round(completedCount / SETUP_CHECKLIST.length * 100);

  return (
    <div className="panel active">
      {/* ===== 顶部标题 + 副标题 + 重点提示 ===== */}
      <div className="card forms-wizard-card">
        <div className="forms-wizard-header">
          <span className="forms-wizard-icon">🧙</span>
          <div>
            <h2>用曼巴创建电动滑板车官网订阅表单</h2>
            <p>订阅表单是官网获客的第一步。它可以把正在浏览电动滑板车的访客，转化为可持续触达的邮箱用户。后续的优惠邮件、新品通知、节日促销、弃购召回和欢迎邮件，都可以基于这些订阅用户展开。</p>
            <p className="forms-wizard-keypoint">💡 先收集邮箱，后续才能通过曼巴持续触达潜在买家。</p>
          </div>
        </div>

        {/* 4 步流程概述 */}
        <div className="forms-wizard-steps">
          {STEPS.map(step => (
            <div key={step.id} className="forms-wizard-step forms-wizard-step-static">
              <span className="forms-wizard-step-num">{step.id}</span>
              <span className="forms-wizard-step-icon">{step.icon}</span>
              <div>
                <strong>{step.title}</strong>
                <small>{step.desc}</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 配置区域：新手推荐·首单优惠订阅表单 ===== */}
      <div className="card">
        <div className="forms-step-header">
          <h2>🎟️ 新手推荐：首单优惠订阅表单</h2>
        </div>
        <p className="forms-module-desc">
          这是最适合电动滑板车官网新手使用的订阅表单。访客进入官网后，看到首单优惠提示，留下邮箱后获得优惠码。这个邮箱会进入曼巴订阅名单，后续可以继续发送欢迎邮件、产品推荐、节日促销和弃购召回邮件。
        </p>
        <div className="forms-config-steps">
          {POPUP_STEPS.map((step, si) => (
            <div key={si} className="forms-config-step">
              <div className="forms-config-step-header">
                <span className="forms-config-step-num">{si + 1}</span>
                <strong>{step.title}</strong>
              </div>
              <div className="forms-config-step-body">
                <p>{step.detail}</p>
                {step.choices && (
                  <div className="forms-config-choices">
                    {step.choices.map(c => (
                      <span key={c} className={`forms-config-choice${c === step.recommended ? ' forms-config-choice-recommended' : ''}`}>
                        {c}{c === step.recommended ? ' · 推荐' : ''}
                      </span>
                    ))}
                  </div>
                )}
                {step.example && (
                  <div className="forms-config-example">💡 <strong>推荐文案：</strong>{step.example}</div>
                )}
                {step.extra && (
                  <div className="forms-config-extra">📌 {step.extra}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 常见订阅表单类型 ===== */}
      <div className="card">
        <h2>常见订阅表单类型</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
          不同场景用不同的表单类型。下面是电动滑板车官网最常用的 3 种，供你参考。
        </p>
        <div className="forms-type-examples">
          {COMMON_FORM_TYPES.map((c, i) => (
            <div key={i} className="forms-type-example">
              <span className="forms-type-example-icon">{c.icon}</span>
              <div>
                <strong>{c.name}</strong>
                <p className="forms-type-example-fit">适合页面：{c.pages}</p>
                <p className="forms-type-example-fit">适合目标：{c.goal}</p>
                <p className="forms-type-example-demo">说明：{c.desc}</p>
                <p className="forms-type-example-demo">示例：{c.demo}</p>
                <span className="forms-type-example-tip">⭐ {c.tip}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 曼巴会自动帮你做什么 ===== */}
      <div className="card forms-auto-card">
        <h2>🤖 表单发布后，曼巴会帮你做什么？</h2>
        <div className="forms-auto-grid">
          {AUTO_ACTIONS.map((a, i) => (
            <div key={i} className="forms-auto-item">
              <span className="forms-auto-num">{i + 1}</span>
              <span className="forms-auto-icon">{a.icon}</span>
              <span>{a.text}</span>
            </div>
          ))}
        </div>
        <p className="forms-auto-note">
          你不需要手动整理邮箱。表单上线后，曼巴会把订阅用户沉淀到系统里，后续可以直接用于自动流程和营销活动。
        </p>
      </div>

      {/* ===== 设置清单（带进度追踪） ===== */}
      <div className="card">
        <div className={`card-collapse-header${checkOpen ? ' open' : ''}`} onClick={() => setCheckOpen(!checkOpen)}>
          <h2>新手设置清单（{completedCount}/{SETUP_CHECKLIST.length} 已完成）</h2>
          <span className="card-collapse-chevron">{checkOpen ? '▴' : '▾'}</span>
        </div>
        {checkOpen && (
          <div style={{ marginTop: 14 }}>
            <div className="forms-checklist-progress">
              <div className="forms-checklist-bar"><div className="forms-checklist-fill" style={{ width: `${progressPct}%` }} /></div>
              <span className="forms-checklist-pct">{progressPct}%</span>
            </div>
            <div className="forms-checklist">
              {SETUP_CHECKLIST.map((item, i) => (
                <div key={item.id} className={`forms-checklist-item${checkedItems.includes(item.id) ? ' forms-checklist-done' : ''}`} onClick={() => toggleCheck(item.id)}>
                  <button className={`forms-checklist-check${checkedItems.includes(item.id) ? ' checked' : ''}`}>
                    {checkedItems.includes(item.id) ? '✓' : i + 1}
                  </button>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!checkOpen && <p className="forms-checklist-hint">点击展开，逐项打勾确认</p>}
      </div>

      {/* ===== 常见误区 ===== */}
      <div className="card">
        <div className={`card-collapse-header${mistakeOpen ? ' open' : ''}`} onClick={() => setMistakeOpen(!mistakeOpen)}>
          <h2>❌ 常见误区 vs ✅ 正确做法</h2>
          <span className="card-collapse-chevron">{mistakeOpen ? '▴' : '▾'}</span>
        </div>
        {mistakeOpen && (
          <div className="forms-mistake-grid" style={{ marginTop: 14 }}>
            {MISTAKES.map((m, i) => (
              <div key={i} className="forms-mistake-card">
                <div className="forms-mistake-bad">
                  <span className="forms-mistake-label">❌ 错误做法</span>
                  <span>{m.bad}</span>
                </div>
                <div className="forms-mistake-good">
                  <span className="forms-mistake-label">✅ 正确做法</span>
                  <span>{m.good}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {!mistakeOpen && <p className="forms-checklist-hint">点击展开查看 6 个常见新手错误</p>}
      </div>

      {/* ===== 底部新手推荐组合 ===== */}
      <div className="card forms-combo-card">
        <h2>🌱 第一次配置，建议直接用这个组合</h2>
        <div className="forms-combo-grid">
          {RECOMMENDED_COMBO.map((c, i) => (
            <div key={i} className="forms-combo-item">
              <strong>{c.label}</strong>
              <span>{c.value}</span>
            </div>
          ))}
        </div>
        <p className="forms-combo-note">
          这个组合最适合电动滑板车官网快速验证订阅表单效果。等团队熟悉后，再尝试转盘抽奖、会员专属优惠、退出挽留等更细分的表单。
        </p>
      </div>

      {/* ===== 下一步 ===== */}
      <div className="card forms-next-card">
        <div className="forms-next-content">
          <span className="forms-next-icon">🤖</span>
          <div>
            <strong>下一步：设置自动流程</strong>
            <p>表单收集到邮箱后，曼巴会自动发送欢迎邮件、优惠码邮件、弃购召回等。这是 EDM 的核心自动化能力。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
