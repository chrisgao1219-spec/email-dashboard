import { useState } from 'react';

export const SEQUENCES = [
  {
    id: 'welcome',
    icon: '👋',
    title: '欢迎系列：给客户的第一品牌印象',
    subtitle: 'Welcome series | 5 emails · 7 days',
    goal: '给客户的第一品牌印象。重点是建立专业、可靠、懂出行场景的认知，而不是第一时间促销。',
    kpi: '行业参考：打开率约 30%，点击率约 1%；欢迎系列通常高于均值，需按品牌历史数据校准。',
    setup: '按需配置：新品牌先做第 1、2、4 封，等数据稳定后再补完整序列。',
    color: '#10b981',
    emails: [
      { day: '立即 (Day 0)', cn: '欢迎加入，这是你的专属礼遇', en: 'Welcome — your exclusive offer is inside', goal: '兑现订阅承诺，建立第一印象', type: '价值交付', tip: '纯文本、创始人语气，兑现承诺的折扣码或权益' },
      { day: '第1天', cn: '我们和其他品牌差在哪', en: 'Why riders choose us over the rest', goal: '品牌差异 + 产品价值', type: '教育', tip: '用对比说明核心差异，不要堆参数' },
      { day: '第3天', cn: '真实用户的出行故事', en: 'Real riders, real stories', goal: '社交证明 + 使用场景', type: '灵感', tip: '真实用户内容 > 精修产品图' },
      { day: '第5天', cn: '选购前必须知道的一件事', en: 'One thing to know before you buy', goal: '深度教育 + 降低决策门槛', type: '教育+销售', tip: '讲安全/续航/质保等关键点，建立信任后自然引导' },
      { day: '第7天', cn: '接下来，你想收到什么内容？', en: 'What would you like to hear about?', goal: '偏好收集 + 互动分流', type: '互动', tip: '2-3 个选项的轻量投票，点击即投票' },
    ],
  },
  {
    id: 'browse',
    icon: '👀',
    title: '弃浏览：把浅层兴趣变成比较意向',
    subtitle: 'Browse abandonment | 3 emails · 5 days',
    goal: '把浅层兴趣变成明确比较意向。用户还没加购，所以重点是车型对比、真实评价、使用场景。',
    kpi: '行业参考：打开率约 30%，点击率约 1%；自动化表现需按品牌历史数据校准。',
    setup: '按需配置：先做 1-2 封即可，等有浏览数据后再决定是否扩展。',
    rule: '用户只浏览产品页 → 进入此流程；一旦加购，退出本流程，进入「弃购」。',
    color: '#8b5cf6',
    emails: [
      { day: '浏览后 1-4小时', cn: '你刚看的那款，还在犹豫什么？', en: 'Still deciding? Here is what you missed', goal: '共情开篇 + 打消常见顾虑', type: '提醒', tip: '展示浏览过的具体商品；深度浏览用户（2+页面）主动提供对比表' },
      { day: '浏览后 第2天', cn: '关于这款，真实用户的评价', en: 'What real riders say about it', goal: '社交证明 + FAQ 消除顾虑', type: '信任', tip: '真实好评 + 退换政策，降低风险感' },
      { day: '浏览后 第5天', cn: '再帮你理一理选购要点', en: 'A quick buying guide', goal: '教育 + 温和推动决策', type: '教育', tip: '对比车型关键参数，不急着给折扣' },
    ],
  },
  {
    id: 'abandoned',
    icon: '🛒',
    title: '弃购：把购物车意向变成购买信心',
    subtitle: 'Cart abandonment | 3 emails · 48 hours',
    goal: '把购物车意向变成购买信心。用户已经认可产品，但还在犹豫价格、安全、物流、质保。',
    kpi: '行业参考：打开率约 30%，点击率约 1%；弃购是高意向场景，通常高于普通 campaign，需校准。',
    setup: '按需配置：建议 3 封完整配置，第一封不要给折扣。',
    rule: '用户加购 → 退出「弃浏览」进入本流程；进入 checkout → 退出本流程进入「弃单」。',
    color: '#ef4444',
    emails: [
      { day: '加购后 1-4小时', cn: '你的购物车还在等你', en: 'Your cart is still waiting', goal: '温和提醒，不催促', type: '提醒', tip: '不提供折扣！展示购物车商品，强调质保/退换' },
      { day: '加购后 24小时', cn: '关于价格、安全和质保的说明', en: 'Pricing, safety and warranty explained', goal: '消除核心顾虑', type: '信任', tip: '回答 Top3 顾虑：安全、续航、质保、退换' },
      { day: '加购后 48小时', cn: '最后的顾虑，我们帮你打消', en: 'Let us resolve your last concerns', goal: '风险逆转 + 温和激励', type: '优惠', tip: '强调退换保障/延保；可用免运或配件替代百分比折扣' },
    ],
  },
  {
    id: 'abandoned_checkout',
    icon: '💳',
    title: '弃单挽回：把临门一脚变成成交',
    subtitle: 'Checkout abandonment | 3 emails · 24 hours',
    goal: '把临门一脚变成成交。用户已经进入 checkout，重点是支付、分期、税费、配送和退换保障。',
    kpi: '行业参考：打开率约 30%，点击率约 1%；弃单是最高意图场景，需按品牌数据校准。',
    setup: '按需配置：建议 2-3 封完整配置，优先级最高。',
    rule: '用户进入 checkout → 退出「弃购」进入本流程；完成购买 → 退出所有挽回流程。',
    color: '#dc2626',
    emails: [
      { day: '弃单后 1小时', cn: '你的订单还没完成', en: 'Your order is not complete yet', goal: '温和提醒 + 一键返回结账', type: '提醒', tip: '直接链接结账页（预填信息），强调库存但不给折扣' },
      { day: '弃单后 6小时', cn: '支付遇到问题？我们帮你', en: 'Payment issue? We can help', goal: '消除支付/物流顾虑', type: '信任', tip: '列出支付方式、分期、税费、配送时效、退换政策' },
      { day: '弃单后 24小时', cn: '最后一步，别错过', en: 'One last step before checkout', goal: '紧迫感 + 完成订单', type: '优惠', tip: '可给免运或配件，不用百分比折扣' },
    ],
  },
  {
    id: 'postpurchase',
    icon: '📦',
    title: '购后跟进：把一次购买变成好体验',
    subtitle: 'Post-purchase | 5 emails · 60 days',
    goal: '把一次购买变成好体验。降低装配/使用问题、减少退款和客服压力，为配件、推荐、邀评铺路。',
    kpi: '行业参考：打开率约 30%，点击率约 1%；购后邮件通常高于均值，需校准。',
    setup: '按需配置：先做开箱/首次骑行/满意度，其余按产品消耗周期补充。',
    color: '#6366f1',
    note: '💡 下单确认和发货通知建议用店铺自带的通知系统，此序列聚焦购后体验和复购驱动。',
    emails: [
      { day: '第3-5天', cn: '开箱与首次骑行指南', en: 'Unboxing & first-ride guide', goal: '使用指南 + 降低售后咨询', type: '教育', tip: '视频/图文教程，主动解决常见装配问题' },
      { day: '第7-10天', cn: '用了一周，感觉怎么样？', en: 'How is your first week going?', goal: '满意度 + 收集反馈', type: '互动', tip: '简单 NPS 量表，开放式问题附赠小额优惠' },
      { day: '第21天', cn: '推荐给朋友，各得奖励', en: 'Refer a friend, you both win', goal: '评价 + 推荐裂变', type: '推荐', tip: '同时推评价链接 + 推荐码' },
      { day: '第30天', cn: '这款配件，和你的产品是绝配', en: 'The perfect add-on for your ride', goal: '交叉销售 / 配件推荐', type: '销售', tip: '基于购买记录推荐互补配件，不是随机推荐' },
      { day: '第45-60天', cn: '保养清单 & 补货提醒', en: 'Maintenance checklist & restock reminder', goal: '保养教育 + 复购', type: '复购', tip: '按消耗周期提醒；非消耗品推同品牌新品/升级款' },
    ],
  },
  {
    id: 'review_invite',
    icon: '⭐',
    title: '邀评：把好体验变成信任资产',
    subtitle: 'Review request | 2 emails · 14 days',
    goal: '把好体验变成可复用信任资产。真实评价、图片、骑行故事可以反哺产品页、广告和后续 EDM。',
    kpi: '行业参考：评价收集率约 5-10%，带图评价转化率更高，需按品牌数据校准。',
    setup: '按需配置：必须等客户实际使用后再触发，先 check-in 再要评价。',
    color: '#f59e0b',
    emails: [
      { day: '签收后 第7天', cn: '用了一周，感觉如何？', en: 'How is it after a week?', goal: '温和 check-in，不直接要评价', type: '互动', tip: '先问使用体验（开放式），体验好的人更愿意写好评' },
      { day: '签收后 第14天', cn: '分享你的骑行故事', en: 'Share your riding story', goal: '激励图片 / UGC 评价', type: '激励', tip: '鼓励上传图片/视频，奖励优惠券/积分/抽奖资格' },
    ],
  },
  {
    id: 'winback',
    icon: '💤',
    title: '沉默唤醒：判断名单是否还有价值',
    subtitle: 'Winback | 4 emails · 14 days',
    goal: '判断名单是否还有价值。能唤醒的继续培养，不能唤醒的降频或清理，保护发信信誉。',
    kpi: '行业参考：赢回率约 5-10%，分手邮件回复率最高，需校准。',
    setup: '按需配置：名单量不大时可以暂缓，先跑通前面的流程。',
    color: '#f59e0b',
    emails: [
      { day: '第60天', cn: '好久不见，我们想你', en: 'We miss you', goal: '真诚关怀，不推销', type: '情感', tip: '创始人语气，展示最近 3 个月的产品/内容升级' },
      { day: '第63天', cn: '这些新品，你可能会感兴趣', en: 'New arrivals you might like', goal: '新品亮点展示', type: '灵感', tip: '用数据说话，展示最受欢迎的新品' },
      { day: '第67天', cn: '回来看看，专属权益', en: 'Come back — exclusive perks', goal: '优惠促成回归', type: '优惠', tip: '可用赠品/配件替代百分比折扣' },
      { day: '第74天', cn: '这是我们的最后一封邮件', en: 'This is our last email', goal: '分手邮件 → 清理名单', type: '分手', tip: '真诚说再见，给最后选择权，未回应则降频/清理' },
    ],
  },
];

// 前端序列 → GAS 竞品邮件类型 的映射（供「可套用模板」使用）
export const TEMPLATE_TYPES = {
  welcome: '欢迎系列',
  browse: '教程/内容',
  abandoned: '弃购挽回',
  abandoned_checkout: '弃购挽回',
  postpurchase: '购后培育',
  review_invite: '评论/口碑',
  winback: '沉默唤醒',
};

// 我的竞品邮件截图（本地 public/email-templates/，按 1.1、2.1 前缀归属流程）
export const MY_EMAIL_REFERENCES = {
  welcome: [
    { image: '/email-templates/1.1.png', label: '参考截图 1.1', note: '欢迎系列参考邮件' },
    { image: '/email-templates/1.2.png', label: '参考截图 1.2', note: '欢迎系列参考邮件' },
    { image: '/email-templates/1.3.png', label: '参考截图 1.3', note: '欢迎系列参考邮件' },
    { image: '/email-templates/1.4.png', label: '参考截图 1.4', note: '欢迎系列参考邮件' },
  ],
  browse: [
    { image: '/email-templates/2.1.png', label: '参考截图 2.1', note: '弃浏览参考邮件' },
    { image: '/email-templates/2.2.png', label: '参考截图 2.2', note: '弃浏览参考邮件' },
  ],
  abandoned: [
    { image: '/email-templates/3.1.png', label: '参考截图 3.1', note: '弃购参考邮件' },
    { image: '/email-templates/3.2.png', label: '参考截图 3.2', note: '弃购参考邮件' },
    { image: '/email-templates/3.3.png', label: '参考截图 3.3', note: '弃购参考邮件' },
  ],
  abandoned_checkout: [
    { image: '/email-templates/4.1.png', label: '参考截图 4.1', note: '弃单参考邮件' },
  ],
  postpurchase: [
    { image: '/email-templates/5.1.png', label: '参考截图 5.1', note: '购后跟进参考邮件' },
  ],
  review_invite: [
    { image: '/email-templates/6.1.png', label: '参考截图 6.1', note: '邀评参考邮件' },
  ],
  winback: [
    { image: '/email-templates/7.1.png', label: '参考截图 7.1', note: '沉默唤醒参考邮件' },
  ],
};

export default function SequencePanel() {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="panel active">
      <div className="card">
        <h2>邮件序列蓝图
          <span className="card-badge">按用户行为轨迹 · 7 条核心序列</span>
        </h2>
        <div className="seq-intro">
          每条序列是「发送时间 + 标题公式 + 内容目标 + 操作技巧」的完整日计划，按用户从订阅到复购的行为轨迹排列。直接照着排进你的 ESP 自动化流程即可。
        </div>
      </div>

      {/* 挽回流程组合说明 */}
      <div className="card seq-rule-card">
        <h2>📌 弃浏览 / 弃购 / 弃单 怎么组合收益最大化</h2>
        <p className="seq-rule-intro">这三条不是重复发送，而是按行为深度<b>互斥触发</b>：</p>
        <div className="seq-rule-list">
          <div className="seq-rule-item"><span>①</span>用户只浏览产品页 → 进入「弃浏览」</div>
          <div className="seq-rule-item"><span>②</span>用户加购 → 退出「弃浏览」，进入「弃购」</div>
          <div className="seq-rule-item"><span>③</span>用户进入 checkout → 退出「弃购」，进入「弃单」</div>
          <div className="seq-rule-item"><span>④</span>用户完成购买 → 退出所有挽回流程，进入「购后跟进」</div>
        </div>
        <p className="seq-rule-tip">
          规则：同一天不要让用户收到多条相似挽回邮件；优先级 <b>弃单 &gt; 弃购 &gt; 弃浏览</b>。
          收益最大化逻辑：越接近支付，邮件越短、越直接、越强调完成订单；越早期，越应该教育和建立信任，不要急着给折扣。
        </p>
      </div>

      {SEQUENCES.map(seq => {
        const isOpen = expanded === seq.id;
        return (
          <div key={seq.id} className={`card seq-card${isOpen ? ' seq-open' : ''}`} style={{ borderLeftColor: seq.color }}>
            <div className="seq-header" onClick={() => setExpanded(isOpen ? null : seq.id)}>
              <div className="seq-header-left">
                <span className="seq-icon">{seq.icon}</span>
                <div>
                  <div className="seq-title">{seq.title}</div>
                  <div className="seq-subtitle">{seq.subtitle}</div>
                </div>
              </div>
              <div className="seq-header-right">
                <span className="seq-goal">{seq.goal}</span>
                <span className="seq-kpi">{seq.kpi}</span>
              </div>
              <span className={`seq-arrow${isOpen ? ' open' : ''}`}>▾</span>
            </div>
            {isOpen && (
              <div className="seq-body">
                {seq.rule && <div className="seq-rule">{seq.rule}</div>}
                {seq.note && <div className="seq-note">{seq.note}</div>}
                <div className="seq-timeline">
                  {seq.emails.map((email, i) => (
                    <div key={i} className="seq-step">
                      <div className="seq-step-marker" style={{ background: seq.color }}>
                        <span>{i + 1}</span>
                      </div>
                      <div className="seq-step-line" />
                      <div className="seq-step-card">
                        <div className="seq-step-top">
                          <span className="seq-step-day">{email.day}</span>
                          <span className="seq-step-type">{email.type}</span>
                        </div>
                        <div className="seq-step-subject">
                          <span className="seq-subject-cn">{email.cn}</span>
                          <span className="seq-subject-en">{email.en}</span>
                        </div>
                        <div className="seq-step-goal">目标: {email.goal}</div>
                        <div className="seq-step-tip">技巧: {email.tip}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {seq.setup && <div className="seq-setup">⚙️ {seq.setup}</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
