import { useState, useMemo } from 'react';
import { fetchAIdeas, fetchAIRewrite, fetchAITemplate, fetchAIDigest, fetchAICustomTemplate } from '../api';
import EmailPreview from '../components/EmailPreview';

const EMAIL_TYPES = ['促销活动', '弃购挽回', '新品上市', '沉默唤醒', '欢迎系列', '购后跟进', '会员/积分', '骑行分享', '保养指南', '户外出行'];

const FRAMEWORKS = [
  { id: 'aida', name: 'AIDA', full: 'Attention → Interest → Desire → Action', cn: '注意→兴趣→渴望→行动', desc: '经典漏斗公式，适合促销和新品发布', bestFor: ['促销活动', '新品上市'], example: { en: 'You\'re one step away from {product}', cn: '你离{产品}只差这一步', body: 'Attention: 3 seconds to grab inbox attention → Interest: {Product} solves the {pain_point} you face daily → Desire: {Number}+ users already switched → Action: Click here, get {offer} within 24h' } },
  { id: 'pas', name: 'PAS', full: 'Problem → Agitation → Solution', cn: '问题→煽动→方案', desc: '痛点驱动，最适合弃购挽回', bestFor: ['弃购挽回', '沉默唤醒'], example: { en: 'Still struggling with {pain_point}?', cn: '{痛点}还在困扰你吗？', body: 'Problem: You spend {time} daily on {pain_point} → Agitation: That\'s {number} hours wasted per year → Solution: {Product}, designed for exactly this' } },
  { id: 'bab', name: 'BAB', full: 'Before → After → Bridge', cn: '之前→之后→桥梁', desc: '前后对比，适合展示产品效果', bestFor: ['新品上市', '欢迎系列', '户外出行'], example: { en: 'Before/After {number} days with {product}', cn: '用了{产品}{数字}天后', body: 'Before: {pain_scene} → After: {ideal_scene} → Bridge: {Product} is what connects the two, start here' } },
  { id: 'slap', name: 'SLAP', full: 'Stop → Look → Act → Purchase', cn: '停住→看→行动→购买', desc: '快节奏抓眼球，适合闪购限时促销', bestFor: ['促销活动'], example: { en: '⏰ 4 hours left', cn: '⏰ 还有4小时', body: 'Stop: Wait! This message lives only 4 hours → Look: {Product} lowest price this year → Act: Click, only {number} left → Purchase: Extra {offer} for orders within 24h' } },
  { id: '4ps', name: '4Ps', full: 'Promise → Picture → Proof → Push', cn: '承诺→画面→证明→推动', desc: '系统说服型，适合建立信任的品类', bestFor: ['会员/积分', '欢迎系列'], example: { en: 'We promise: {experience} or your money back', cn: '承诺：{体验}不然退款', body: 'Promise: {Number}-day trial, full refund → Picture: Imagine {ideal_scene} → Proof: {Number}+ real reviews → Push: Start now, only {price}' } },
  { id: '4us', name: '4Us', full: 'Urgent → Unique → Useful → Ultra-specific', cn: '紧迫→独特→有用→具体', desc: '数据驱动说服力，适合技术型产品', bestFor: ['新品上市', '骑行分享'], example: { en: '{Number} reasons to order {product} today', cn: '{数字}个理由今天下单{产品}', body: 'Urgent: Only {number} left → Unique: The only {differentiator} on the market → Useful: Saves {number} minutes daily → Ultra-specific: {specs}, weighs {number}g, {number}h range' } },
  { id: 'quest', name: 'QUEST', full: 'Qualify → Understand → Educate → Stimulate → Transition', cn: '筛选→理解→教育→激发→转化', desc: '教育引导型，适合高客单价复杂产品', bestFor: ['欢迎系列', '保养指南'], example: { en: '{category} buying guide: what 90% overlook', cn: '{品类}选购指南：90%的人忽略这点', body: 'Qualify: Considering {category}? → Understand: You\'ve noticed {confusion} → Educate: The difference is {key_diff} → Stimulate: Those who know this chose {product} → Transition: Your link is here' } },
  { id: 'acca', name: 'ACCA', full: 'Awareness → Comprehension → Conviction → Action', cn: '认知→理解→信服→行动', desc: '认知阶梯型，适合品牌建设和教育', bestFor: ['沉默唤醒', '户外出行'], example: { en: 'Your understanding of {category} might be wrong', cn: '关于{品类}，你的认知可能错了', body: 'Awareness: {Category} is transforming → Comprehension: The new standard is {trend}, old {model} is phasing out → Conviction: {Brand} leads this change → Action: Join {number}+ who made the switch' } },
  { id: 'pppp', name: 'PPPP', full: 'Picture → Promise → Prove → Push', cn: '画面→承诺→证明→推动', desc: '视觉联想型，适合生活方式品类', bestFor: ['促销活动', '户外出行'], example: { en: 'Open {scene} with one {product}', cn: '用一个{产品}打开{场景}', body: 'Picture: {Scene} on weekends, {product} in {use_case} → Promise: More than {feature}, it\'s a {lifestyle} → Prove: See what {user_type} says → Push: This weekend, your {scene} deserves it' } },
];

export default function AIWorkshopPanel({ brand }) {
  const [tool, setTool] = useState('ideas');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Tool 1: Ideas
  const [ideasType, setIdeasType] = useState('促销活动');
  const [ideasBrand, setIdeasBrand] = useState(brand || '');

  // Tool 2: Rewrite
  const [rewriteSubject, setRewriteSubject] = useState('');
  const [rewriteCompetitor, setRewriteCompetitor] = useState('');
  const [rewriteOffer, setRewriteOffer] = useState('');

  // Tool 3: Template
  const [tmplType, setTmplType] = useState('促销活动');

  // Tool 4: Frameworks
  const [fwType, setFwType] = useState('促销活动');

  // Tool 5: Digest
  const [digestRunning, setDigestRunning] = useState(false);

  // Tool 6: Custom
  const [customType, setCustomType] = useState('促销活动');
  const [customGoal, setCustomGoal] = useState('提升销量');
  const [customDiscount, setCustomDiscount] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [customStyle, setCustomStyle] = useState('现代简洁');
  const [customProduct, setCustomProduct] = useState(brand || '');
  const [customContent, setCustomContent] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  const matchedFrameworks = useMemo(() => {
    return FRAMEWORKS.filter(f => f.bestFor.includes(fwType));
  }, [fwType]);

  const runIdeas = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const data = await fetchAIdeas(ideasType, ideasBrand || brand);
      setResult({ type: 'ideas', data });
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const runRewrite = async () => {
    if (!rewriteSubject.trim()) { setError('请输入竞品主题行'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const data = await fetchAIRewrite(rewriteSubject, rewriteCompetitor || 'Competitor', rewriteOffer, brand);
      setResult({ type: 'rewrite', data: data.result });
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const runTemplate = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const data = await fetchAITemplate(tmplType, brand);
      setResult({ type: 'template', data: data.result });
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const runDigest = async () => {
    setDigestRunning(true); setError(null); setResult(null);
    try {
      const data = await fetchAIDigest(brand);
      setResult({ type: 'digest', data });
    } catch (e) { setError(e.message); }
    setDigestRunning(false);
  };

  const runCustom = async () => {
    if (!customProduct.trim()) { setError('请输入产品信息'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const data = await fetchAICustomTemplate({
        emailType: customType, goal: customGoal,
        discount: customDiscount, discountCode: customCode,
        visualStyle: customStyle, productInfo: customProduct,
        emailContent: customContent, notes: customNotes, brand,
      });
      setResult({ type: 'custom', data: data.result || data });
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="panel active">
      {/* Quick start: Abandoned cart template - most practical use case */}
      <div className="card workshop-quick-card">
        <div className="workshop-quick-header">
          <span className="workshop-quick-icon">⚡</span>
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>快速上手：弃单挽回模板</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
              创意工坊最实用的场景——生成弃购挽回邮件。输入你的产品和品牌，AI 生成完整邮件主题+正文+CTA。
            </p>
          </div>
        </div>
        <div className="workshop-quick-actions">
          <button className="btn btn-primary btn-sm" onClick={() => { setTool('template'); setCustomType('弃购挽回'); }}>
            📧 生成弃单挽回模板
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => { setTool('ideas'); setIdeasType('弃购挽回'); }}>
            💡 获取弃单创意方案
          </button>
          <span className="workshop-quick-tip">生成后建议粘贴到「评分」面板检查质量分数</span>
        </div>
      </div>

      <div className="card">
        <h2>AI 创意工坊
          <span className="card-badge">DeepSeek AI</span>
        </h2>
        <div className="workshop-tabs">
          {[
            { id: 'ideas', icon: '💡', label: '创意方案' },
            { id: 'rewrite', icon: '✏️', label: '主题行改写' },
            { id: 'template', icon: '📝', label: '模板生成' },
            { id: 'framework', icon: '📐', label: '文案框架' },
            { id: 'digest', icon: '🧠', label: '智能洞察' },
          ].map(t => (
            <button key={t.id} className={`workshop-tab-btn${tool === t.id ? ' active' : ''}`} onClick={() => { setTool(t.id); setResult(null); setError(null); }}>
              <span className="workshop-tab-icon">{t.icon}</span>
              <span className="workshop-tab-label">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {tool !== 'framework' && (
      <div className="card">
        {/* Tool 1: Ideas */}
        {tool === 'ideas' && (
          <div>
            <div className="workshop-form">
              <div className="workshop-row">
                <label>邮件类型</label>
                <select value={ideasType} onChange={e => setIdeasType(e.target.value)}>
                  {EMAIL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <button className="btn btn-primary" onClick={runIdeas} disabled={loading}>
                {loading ? 'AI 生成中...' : '生成 3 个创意方案'}
              </button>
            </div>
            {result && result.type === 'ideas' && (
              <div className="workshop-result">
                {result.data && result.data.length > 0 ? result.data.map((idea, i) => (
                  <div key={i} className="workshop-idea-card">
                    <div className="workshop-idea-header">
                      <span className="workshop-idea-num">{i + 1}</span>
                      <span className="workshop-idea-title">{idea.title}</span>
                      <span className="workshop-idea-type">{idea.type}</span>
                    </div>
                    <div className="workshop-idea-subject">主题行: {idea.subject}</div>
                    <div className="workshop-idea-strategy">策略: {idea.content}</div>
                  </div>
                )) : <div className="empty"><span className="empty-icon">🤖</span><div className="empty-desc">AI 未生成结果，请检查 API Key</div></div>}
              </div>
            )}
          </div>
        )}

        {/* Tool 2: Rewrite */}
        {tool === 'rewrite' && (
          <div>
            <div className="workshop-form">
              <div className="workshop-row">
                <label>竞品主题行</label>
                <input type="text" className="score-input" placeholder="粘贴竞品邮件主题行..." value={rewriteSubject} onChange={e => setRewriteSubject(e.target.value)} />
              </div>
              <div className="workshop-row workshop-row-2">
                <div>
                  <label>竞品品牌（可选）</label>
                  <input type="text" className="score-input" placeholder="如: Kukirin" value={rewriteCompetitor} onChange={e => setRewriteCompetitor(e.target.value)} />
                </div>
                <div>
                  <label>竞品优惠（可选）</label>
                  <input type="text" className="score-input" placeholder="如: 20% off" value={rewriteOffer} onChange={e => setRewriteOffer(e.target.value)} />
                </div>
              </div>
              <button className="btn btn-primary" onClick={runRewrite} disabled={loading}>
                {loading ? '改写中...' : '改写为我品牌版本'}
              </button>
            </div>
            {result && result.type === 'rewrite' && (
              <div className="workshop-result">
                <div className="workshop-rewrite-card">
                  <div className="workshop-rewrite-label">改写结果</div>
                  <div className="workshop-rewrite-text">{result.data}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tool 3: Template — now uses custom form */}
        {tool === 'template' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>填写产品信息和活动需求，AI 生成带预览版位的完整邮件模板。</p>
            <div className="workshop-form">
              <div className="workshop-row">
                <label>邮件类型</label>
                <select value={customType} onChange={e => setCustomType(e.target.value)}>
                  {EMAIL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="workshop-row">
                <label>活动目标</label>
                <select value={customGoal} onChange={e => setCustomGoal(e.target.value)}>
                  {['提升销量', '推新品', '清库存', '提升复购', '品牌背书', '用户互动'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="workshop-row workshop-row-2">
                <div><label>优惠折扣</label><input type="text" className="score-input" placeholder="如: €15 OFF" value={customDiscount} onChange={e => setCustomDiscount(e.target.value)} /></div>
                <div><label>优惠码</label><input type="text" className="score-input" placeholder="如: BALL2026" value={customCode} onChange={e => setCustomCode(e.target.value)} /></div>
              </div>
              <div className="workshop-row">
                <label>视觉风格</label>
                <select value={customStyle} onChange={e => setCustomStyle(e.target.value)}>
                  {['现代简洁', '户外运动', '科技感', '温馨家庭', '潮流时尚'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="workshop-row">
                <label>产品信息 *</label>
                <input type="text" className="score-input" placeholder="如: G2 Master 电动滑板车，双电机/65km续航" value={customProduct} onChange={e => setCustomProduct(e.target.value)} />
              </div>
              <div className="workshop-row">
                <label>参考文字内容</label>
                <textarea className="score-textarea" placeholder="粘贴参考文字..." value={customContent} onChange={e => setCustomContent(e.target.value)} rows={3} />
              </div>
              <div className="workshop-row">
                <label>其它补充</label>
                <input type="text" className="score-input" placeholder="如: 强调续航、对比竞品..." value={customNotes} onChange={e => setCustomNotes(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={runCustom} disabled={loading}>
                {loading ? 'AI 生成中...' : '生成完整邮件模板'}
              </button>
            </div>
            {result && (result.type === 'template' || result.type === 'custom') && (
              <div className="workshop-result" style={{ marginTop: 20 }}>
                <div className="workshop-template-card">
                  <div style={{ padding: 10, background: '#f0fdf4', borderRadius: 4, marginBottom: 10, fontSize: 12, color: '#166534' }}>
                    📧 邮件预览效果 — 下方是AI生成的邮件版位和内容，建议复制到「评分」面板检查质量
                  </div>
                  <div className="workshop-template-body" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{result.data}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tool 5: Digest */}
        {tool === 'digest' && (
          <div>
            <div className="workshop-form">
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                基于竞品邮件数据，AI 分析跨品牌趋势、机会空白和战略建议。
              </p>
              <button className="btn btn-primary" onClick={runDigest} disabled={digestRunning}>
                {digestRunning ? 'AI 分析中...' : '生成智能洞察'}
              </button>
            </div>
            {result && result.type === 'digest' && result.data && (
              <div className="workshop-result">
                <div className="workshop-template-card">
                  <div className="workshop-template-body" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                    {typeof result.data === 'string' ? result.data : (result.data.result || '')}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Tool 4: Framework Advisor */}
      {tool === 'framework' && (
        <div className="card">
          <div className="workshop-form">
            <div className="workshop-row">
              <label>邮件类型</label>
              <select value={fwType} onChange={e => setFwType(e.target.value)}>
                {EMAIL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {matchedFrameworks.length > 0 && (
            <div className="workshop-result">
              {matchedFrameworks.map(fw => (
                <div key={fw.id} className="framework-card">
                  <div className="framework-card-header">
                    <span className="framework-name">{fw.name} <span style={{fontSize:12,color:'var(--text-muted)',fontWeight:400}}>{fw.cn}</span></span>
                    <span className="framework-formula">{fw.full}</span>
                    <span className="fw-badge">{fw.desc}</span>
                  </div>
                  <div className="framework-example">
                    <div className="framework-example-label">Example / 示例</div>
                    <div className="framework-example-subject">Subject: {fw.example.en}</div>
                    <div className="framework-example-body">{fw.example.body}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="framework-all">
            <h3>全部 9 种文案框架</h3>
            <div className="framework-grid">
              {FRAMEWORKS.map(fw => (
                <div key={fw.id} className={`framework-mini${matchedFrameworks.some(m => m.id === fw.id) ? ' framework-mini-recommended' : ''}`}>
                  <div className="framework-mini-name">{fw.name} <span style={{fontSize:10,color:'var(--text-muted)',fontWeight:400}}>{fw.cn}</span></div>
                  <div className="framework-mini-formula">{fw.full}</div>
                  <div className="framework-mini-desc">{fw.desc}</div>
                  <div className="framework-mini-types">{fw.bestFor.join(' · ')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && <div className="card" style={{ borderLeft: '4px solid #ef4444' }}><span style={{ color: '#dc2626', fontSize: 13 }}>错误: {error}</span></div>}
    </div>
  );
}
