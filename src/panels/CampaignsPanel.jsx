import { useState, useEffect, useMemo } from 'react';
import { MAMBA_SEGMENT_GUIDE, RFM_SEGMENTS, CONTENT_PILLARS } from '../constants/emailPlanning';
import ScorePanel from './ScorePanel';
import AIWorkshopPanel from './AIWorkshopPanel';
import { getBrandProfile, TYPE_TO_AUDIENCE_RULE } from '../utils/brandProfiles';
import { CAMPAIGN_TYPES, TONES, buildPrompt, getAudienceDesc, DEFAULT_FORM, buildRevisionPrompt, REVISION_OPTIONS, REVISION_SECTIONS } from '../utils/emailCampaign';

const INTERNAL_TABS = [
  { id: 'generator', label: '✉️ 活动生成器' },
  { id: 'guide', label: '👥 客户分组' },
  { id: 'score', label: '⭐ 评分' },
  { id: 'aiworkshop', label: '🤖 创意工坊' },
];

const GEN_STEPS = ['选择品牌', '填写邮件方向', '选择展示产品', '系统推荐人群', '生成提示词'];

export default function CampaignsPanel({ brand, initialSubTab }) {
  const [subTab, setSubTab] = useState(initialSubTab || 'generator');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const brandProfile = useMemo(() => getBrandProfile(brand), [brand]);

  // 表单状态
  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedProducts, setSelectedProducts] = useState({}); // {name: sellingPoint}
  const [customName, setCustomName] = useState('');
  const [customPoint, setCustomPoint] = useState('');
  const [customProducts, setCustomProducts] = useState([]); // 手动添加的产品 [{name, sellingPoint}]
  const [selectedSegments, setSelectedSegments] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  // 导入 EDM Copy
  const [importJson, setImportJson] = useState('');
  const [importedCopy, setImportedCopy] = useState([]);
  const [importError, setImportError] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  // 修改 Prompt 生成器
  const [revOption, setRevOption] = useState('Option A');
  const [revSection, setRevSection] = useState('Hero Banner');
  const [revKeep, setRevKeep] = useState('');
  const [revChanges, setRevChanges] = useState('');
  const [revPrompt, setRevPrompt] = useState('');
  const [revCopied, setRevCopied] = useState(false);

  // Sync external navigation
  useEffect(() => {
    if (initialSubTab) setSubTab(initialSubTab);
  }, [initialSubTab]);

  // 品牌切换 → 重置
  useEffect(() => {
    setSelectedProducts({});
    setCustomProducts([]);
    setPrompt('');
    setError(null);
  }, [brand]);

  // 类型变化 → 自动推荐人群（默认全选）
  useEffect(() => {
    const ruleKey = TYPE_TO_AUDIENCE_RULE[form.type] || 'promotion';
    setSelectedSegments(brandProfile.audienceRules[ruleKey] || []);
  }, [form.type, brandProfile]);

  const updateForm = (key, value) => setForm(f => ({ ...f, [key]: value }));

  // 产品版位：勾选/取消
  const toggleProduct = (name, sellingPoint) => {
    setSelectedProducts(prev => {
      const next = { ...prev };
      if (next[name]) delete next[name];
      else next[name] = sellingPoint || '';
      return next;
    });
  };

  // 手动添加产品（加入候选池 + 默认勾选）
  const addCustomProduct = () => {
    if (!customName.trim()) return;
    const name = customName.trim();
    const point = customPoint.trim();
    setCustomProducts(prev => [...prev, { name, sellingPoint: point }]);
    setSelectedProducts(prev => ({ ...prev, [name]: point }));
    setCustomName(''); setCustomPoint('');
  };

  // 删除手动添加的产品
  const removeCustomProduct = (name) => {
    setCustomProducts(prev => prev.filter(p => p.name !== name));
    setSelectedProducts(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  // 品牌池产品 + 手动添加产品（合并展示）
  const allProducts = [...brandProfile.products, ...customProducts];

  const toggleSegment = (label) => {
    setSelectedSegments(prev =>
      prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label]
    );
  };

  const products = useMemo(
    () => Object.entries(selectedProducts).map(([name, sellingPoint]) => ({ name, sellingPoint })),
    [selectedProducts]
  );

  const handleGenerate = () => {
    setGenerating(true);
    setPrompt('');      // 清空旧结果
    setError(null);
    // 模拟生成过程（短暂 loading，让用户感知"生成中"）
    setTimeout(() => {
      try {
        const p = buildPrompt(form, brandProfile, products, selectedSegments);
        setPrompt(p);
      } catch (e) {
        setError(e.message || '生成失败，请重试');
      }
      setGenerating(false);
    }, 500);
  };

  const handleCopy = () => {
    if (!prompt) return;
    try { navigator.clipboard.writeText(prompt); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // 字段名 → 可读标签
  const fieldToLabel = (key) => {
    const map = {
      subject_line: 'Subject Line',
      preview_text: 'Preview Text',
      product_name: 'Product Name',
      eyebrow: 'Eyebrow',
      headline: 'Headline',
      subheadline: 'Subheadline',
      body: 'Body Copy',
      copy: 'Copy',
      cta: 'CTA',
      offer: 'Offer',
    };
    return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const sectionToLabel = (type) => {
    const map = {
      hero: 'Hero 主视觉',
      offer: '优惠区',
      product: '产品区',
      cta: 'CTA 区',
      footer: '页脚',
      section: '正文区',
      social: '社媒证明区',
      final: '最终 CTA',
    };
    return map[type] || type;
  };

  // 解析 Structured Copy JSON
  const handleParseJson = () => {
    setImportError(null);
    setImportedCopy([]);
    try {
      const data = JSON.parse(importJson);
      const items = [];
      if (data.subject_line) items.push({ label: 'Subject Line', text: String(data.subject_line) });
      if (data.preview_text) items.push({ label: 'Preview Text', text: String(data.preview_text) });
      if (Array.isArray(data.sections)) {
        data.sections.forEach((sec, i) => {
          if (!sec || typeof sec !== 'object') return;
          const typeLabel = sectionToLabel(sec.type || `Section ${i + 1}`);
          Object.entries(sec).forEach(([key, val]) => {
            if (key === 'type' || val === null || val === undefined || val === '') return;
            if (typeof val !== 'string') return;
            items.push({ label: `${typeLabel} · ${fieldToLabel(key)}`, text: val });
          });
        });
      }
      if (items.length === 0) {
        setImportError('未解析到文案，请确认粘贴的是 Structured Copy JSON');
      } else {
        setImportedCopy(items);
      }
    } catch {
      setImportError('JSON 解析失败，请确认粘贴的是完整 JSON');
    }
  };

  const copySingle = (key, text) => {
    try { navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const copyAll = () => {
    const text = importedCopy.map(item => `${item.label}\n${item.text}`).join('\n\n');
    try { navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setCopiedKey('all');
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // 生成修改 Prompt
  const handleGenerateRevision = () => {
    if (!revChanges.trim()) { setError('请填写「需要修改」的内容'); return; }
    const p = buildRevisionPrompt(revOption, revSection, revKeep, revChanges);
    setRevPrompt(p);
  };

  const handleCopyRevision = () => {
    if (!revPrompt) return;
    try { navigator.clipboard.writeText(revPrompt); } catch { /* ignore */ }
    setRevCopied(true);
    setTimeout(() => setRevCopied(false), 1500);
  };

  return (
    <div className="panel active">
      {/* Hero */}
      <div className="campaigns-hero card">
        <div className="campaigns-hero-icon">✉️</div>
        <h1>{brandProfile.displayName} 邮件活动生成器</h1>
        <p>围绕 {brandProfile.displayName} 填写邮件方向，系统推荐人群，生成高质量 ChatGPT 提示词。</p>
      </div>

      {/* Internal sub-tab bar */}
      <div className="sub-tabs-bar" style={{ marginBottom: 16 }}>
        {INTERNAL_TABS.map(t => (
          <button key={t.id} className={`sub-tab-btn${subTab === t.id ? ' active' : ''}`} onClick={() => setSubTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== 主流程 ===== */}
      {subTab === 'generator' && (
        <>
          {/* 5 步流程指示 */}
          <div className="gen-steps">
            {GEN_STEPS.map((s, i) => (
              <div key={i} className="gen-step">
                <span className="gen-step-num">{i + 1}</span>
                <span className="gen-step-label">{s}</span>
                {i < GEN_STEPS.length - 1 && <span className="gen-step-arrow">→</span>}
              </div>
            ))}
          </div>

          {/* 表单 */}
          <div className="card gen-form-card">
            <h2>填写邮件方向</h2>
            <div className="gen-form-grid">
              <div className="gen-field">
                <label>邮件主题</label>
                <input type="text" value={form.topic} onChange={e => updateForm('topic', e.target.value)} placeholder="如：Back-to-School Sale" />
              </div>
              <div className="gen-field">
                <label>邮件类型</label>
                <select value={form.type} onChange={e => updateForm('type', e.target.value)}>
                  {CAMPAIGN_TYPES.map(t => <option key={t.value} value={t.value}>{t.en} / {t.zh}</option>)}
                </select>
              </div>
              <div className="gen-field">
                <label>邮件基调</label>
                <select value={form.tone} onChange={e => updateForm('tone', e.target.value)}>
                  {TONES.map(t => <option key={t.value} value={t.value}>{t.value} / {t.zh}</option>)}
                </select>
              </div>
              <div className="gen-field">
                <label>优惠信息</label>
                <input type="text" value={form.offer} onChange={e => updateForm('offer', e.target.value)} placeholder="如：Use code BACK20 for 20% off" />
              </div>
              <div className="gen-field gen-field-full">
                <label>邮件大致内容</label>
                <textarea
                  rows={3}
                  value={form.brief}
                  onChange={e => updateForm('brief', e.target.value)}
                  placeholder="例如：我们想做一封开学季促销邮件，强调通勤方便、限时优惠和适合学生使用。"
                />
              </div>
            </div>

            {/* 邮件中展示的产品 */}
            <div className="gen-segments">
              <div className="gen-segments-title">
                <strong>邮件中展示的产品</strong>
                <span>勾选要在邮件模板里预留展示版位的产品（可选 1-4 个），也可手动添加</span>
              </div>
              <div className="gen-segments-grid">
                {allProducts.map(p => {
                  const active = !!selectedProducts[p.name];
                  const isCustom = customProducts.some(c => c.name === p.name);
                  return (
                    <div key={p.name} className={`gen-segment-chip${active ? ' active' : ''}`} onClick={() => toggleProduct(p.name, p.sellingPoint)}>
                      <span className="gen-segment-check">{active ? '✓' : ''}</span>
                      <div>
                        <strong>{p.name}</strong>
                        <small>{p.sellingPoint || '（无卖点）'}</small>
                      </div>
                      {isCustom && (
                        <button className="gen-product-remove" onClick={(e) => { e.stopPropagation(); removeCustomProduct(p.name); }} title="删除此产品">✕</button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="gen-custom-product">
                <input type="text" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="手动添加产品名" onKeyDown={e => e.key === 'Enter' && addCustomProduct()} />
                <input type="text" value={customPoint} onChange={e => setCustomPoint(e.target.value)} placeholder="一句话卖点（可选）" onKeyDown={e => e.key === 'Enter' && addCustomProduct()} />
                <button className="btn btn-sm btn-outline" onClick={addCustomProduct}>+ 添加</button>
              </div>
              {products.length > 0 && (
                <p className="gen-selected-hint">已选 {products.length} 个产品（进入 ChatGPT 提示词）</p>
              )}
            </div>

            {/* 系统推荐人群 */}
            <div className="gen-segments">
              <div className="gen-segments-title">
                <strong>系统推荐人群</strong>
                <span>根据邮件类型自动推荐，可勾选调整</span>
              </div>
              <div className="gen-segments-grid">
                {selectedSegments.map(label => (
                  <div key={label} className="gen-segment-chip active" onClick={() => toggleSegment(label)}>
                    <span className="gen-segment-check">✓</span>
                    <div>
                      <strong>{label}</strong>
                      <small>{getAudienceDesc(label)}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 生成按钮 */}
            <div className="gen-actions">
              <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
                {generating ? '正在生成...' : '🚀 生成 ChatGPT 提示词'}
              </button>
            </div>
            {error && <div className="gmail-error" style={{ marginTop: 10 }}>⚠️ {error}</div>}
          </div>

          {/* 使用方法 */}
          <div className="card">
            <div className={`card-collapse-header${showGuide ? ' open' : ''}`} onClick={() => setShowGuide(s => !s)}>
              <h2>📖 使用方法</h2>
              <span className="card-collapse-chevron">{showGuide ? '▴' : '▾'}</span>
            </div>
            {showGuide && (
              <div className="gen-guide-steps" style={{ marginTop: 12 }}>
                <div className="gen-guide-step">
                  <span className="gen-guide-num">1</span>
                  <div>
                    <strong>填写活动信息</strong>
                    <p>填写活动主题、优惠、产品等信息，点击生成 Prompt。</p>
                  </div>
                </div>
                <div className="gen-guide-step">
                  <span className="gen-guide-num">2</span>
                  <div>
                    <strong>去 ChatGPT 生成</strong>
                    <p>复制 Prompt 到 ChatGPT，<b>同时上传所选产品的官方图片</b>，生成 A / B / C 三套独立 EDM 视觉方案。</p>
                  </div>
                </div>
                <div className="gen-guide-step">
                  <span className="gen-guide-num">3</span>
                  <div>
                    <strong>在 ChatGPT 修改 ⭐</strong>
                    <p>选一个喜欢的方案。需要修改 Banner、产品区、文字等时，使用页面的「修改 Prompt」，复制后回到<b>原 ChatGPT 对话</b>继续修改。</p>
                    <p className="gen-guide-example">不用重新生成整个 Campaign，只改不满意的地方。</p>
                  </div>
                </div>
                <div className="gen-guide-step">
                  <span className="gen-guide-num">4</span>
                  <div>
                    <strong>定稿使用</strong>
                    <p>确认设计后，把 ChatGPT 输出的 Copy JSON 粘回工作流，即可提取和复制邮件文案；需要发送时再生成 HTML。</p>
                  </div>
                </div>
                <p className="gen-guide-summary">填信息 → Prompt + 产品图给 ChatGPT → 选一个并修改 → JSON 回传</p>
              </div>
            )}
            {!showGuide && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>点击展开查看 4 步使用方法</p>}
          </div>

          {/* 提示词结果 */}
          <div className="card gen-prompt-card">
            <div className="gen-prompt-head">
              <h2>📋 ChatGPT 提示词</h2>
              {prompt && (
                <button className="btn btn-sm btn-outline" onClick={handleCopy}>
                  {copied ? '✓ 已复制' : '复制提示词'}
                </button>
              )}
            </div>

            {generating ? (
              <div className="gen-generating">
                <span className="gen-spinner" />
                <span>正在生成 ChatGPT 提示词，请稍候...</span>
              </div>
            ) : prompt ? (
              <>
                <div className="gen-prompt-box">{prompt}</div>
                <button className="btn btn-primary gen-copy-full" onClick={handleCopy}>
                  {copied ? '✓ 已复制到剪贴板' : '📋 复制提示词'}
                </button>
              </>
            ) : (
              <p className="gen-prompt-empty">
                填写上方信息后，点击「生成 ChatGPT 提示词」。生成的提示词可直接复制到 ChatGPT，让它生成可视化英文邮件模板。
              </p>
            )}
          </div>

          {/* 产品图片提示 */}
          {products.length > 0 && (
            <div className="card gen-img-tip">
              <h2>📎 生成 EDM 时请同时上传产品图</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 10px' }}>
                <b>复制 Prompt 到 ChatGPT 后，请同时上传所选产品的官方产品图片。</b>
              </p>
              <div className="gen-img-list">
                <strong>本次请同时上传：</strong>
                <ul>
                  {products.map(p => <li key={p.name}>{p.name} 官方产品图</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* 修改 Prompt 生成器 */}
          <div className="card gen-revision-card">
            <h2>🔧 修改 Prompt</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 12px' }}>
              选一个喜欢的 EDM 后，用它生成局部修改 Prompt，回到原 ChatGPT 对话继续改。
            </p>
            <div className="gen-form-grid">
              <div className="gen-field">
                <label>选择方案</label>
                <select value={revOption} onChange={e => setRevOption(e.target.value)}>
                  {REVISION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="gen-field">
                <label>修改区域</label>
                <select value={revSection} onChange={e => setRevSection(e.target.value)}>
                  {REVISION_SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="gen-field gen-field-full">
                <label>需要保留</label>
                <textarea rows={2} value={revKeep} onChange={e => setRevKeep(e.target.value)} placeholder="例如：背景、产品、产品位置、整体构图、当前视觉风格" />
              </div>
              <div className="gen-field gen-field-full">
                <label>需要修改</label>
                <textarea rows={3} value={revChanges} onChange={e => setRevChanges(e.target.value)} placeholder='例如：标题改成 "MID-AUTUMN HOLIDAY NOTICE"，让 5% OFF 更明显，CTA 改成 "SHOP & SAVE 5%"' />
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleGenerateRevision}>生成修改 Prompt</button>

            {revPrompt && (
              <div className="gen-revision-result" style={{ marginTop: 12 }}>
                <div className="gen-prompt-box">{revPrompt}</div>
                <button className="btn btn-primary gen-copy-full" onClick={handleCopyRevision}>
                  {revCopied ? '✓ 已复制' : '📋 复制 Prompt'}
                </button>
              </div>
            )}

            <p className="gen-revision-tip">
              复制修改 Prompt 后，请回到生成该 EDM 的<b>原 ChatGPT 对话</b>中发送，不要开启新的对话。这样 ChatGPT 才能基于之前生成的 Option A / B / C 继续修改。
            </p>
          </div>

          {/* 导入 EDM Copy */}
          <div className="card gen-import-card">
            <h2>📥 导入生成结果 Import EDM Result</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
              把 ChatGPT 生成视觉稿时同时输出的 Structured Copy（JSON）粘贴到这里，解析后按 EDM Section 展示，方便复制使用。
            </p>
            <textarea
              className="gen-import-textarea"
              rows={5}
              placeholder="粘贴 ChatGPT Structured Copy（JSON）..."
              value={importJson}
              onChange={e => setImportJson(e.target.value)}
            />
            <button className="btn btn-primary gen-import-btn" onClick={handleParseJson}>解析文案</button>
            {importError && <div className="gmail-error" style={{ marginTop: 10 }}>⚠️ {importError}</div>}

            {importedCopy.length > 0 && (
              <div className="gen-import-result" style={{ marginTop: 14 }}>
                <div className="gen-import-head">
                  <strong>已解析 {importedCopy.length} 条文案</strong>
                  <button className="btn btn-sm btn-outline" onClick={copyAll}>
                    {copiedKey === 'all' ? '✓ 已复制全部' : '复制全部文案'}
                  </button>
                </div>
                <div className="gen-import-list">
                  {importedCopy.map((item, i) => (
                    <div key={i} className="gen-copy-item">
                      <div className="gen-copy-head"><strong>{item.label}</strong></div>
                      <div className="gen-copy-body">
                        <span className="gen-copy-text">{item.text}</span>
                        <button className="gen-copy-btn" onClick={() => copySingle(i, item.text)}>
                          {copiedKey === i ? '✓ 已复制' : '复制'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== 次 tab：客户分组 ===== */}
      {subTab === 'guide' && (
        <>
          <div className="card">
            <h2>客户分组内容指南
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
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="card">
              <div className={`card-collapse-header${showAdvanced ? ' open' : ''}`} onClick={() => setShowAdvanced(a => !a)}>
                <h2>发送频率 + 内容配比 <span className="card-badge">进阶参考</span></h2>
                <span className="card-collapse-chevron">{showAdvanced ? '▴' : '▾'}</span>
              </div>
              {!showAdvanced && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>RFM 分层发送频率、内容类型比例，点击展开</p>}
              {showAdvanced && (
                <div className="grid-2" style={{ marginTop: 14 }}>
                  <div>
                    <h3 style={{ fontSize: 14, marginBottom: 8 }}>发送频率参考</h3>
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
                  <div>
                    <h3 style={{ fontSize: 14, marginBottom: 8 }}>内容类型配比</h3>
                    <div className="planner-pillar-bar">
                      {CONTENT_PILLARS.map(p => (
                        <div key={p.id} className="planner-pillar-seg" style={{ width: p.pct + '%', background: p.color }} title={`${p.label} ${p.pct}%`} />
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
              )}
            </div>
          </div>
        </>
      )}

      {/* ===== 次 tab：评分 ===== */}
      {subTab === 'score' && <ScorePanel brand={brand} />}

      {/* ===== 次 tab：创意工坊 ===== */}
      {subTab === 'aiworkshop' && <AIWorkshopPanel brand={brand} />}
    </div>
  );
}
