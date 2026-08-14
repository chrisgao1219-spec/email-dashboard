import { useState, useEffect, useCallback } from 'react';
import * as api from '../api';

const TONES = [
  { key: 'friendly', label: '😊 友好', desc: '像朋友间对话' },
  { key: 'warrior', label: '🔥 Warrior', desc: '户外运动能量' },
  { key: 'premium', label: '✨ 精致', desc: '克制不叫卖' },
  { key: 'warm', label: '🏠 温暖', desc: '科技感家庭场景' },
];

const SUBJECT_FORMULAS = ['好奇', 'How-to', '问题', '社交证明', '直接', '紧迫'];

function CopyBtn({ text, label = '📋 Copy' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <button onClick={handleCopy} className="btn btn-sm" style={{ padding: '2px 10px', fontSize: 12 }}>
        {label}
      </button>
      {copied && <span style={{ color: '#00b894', fontSize: 12 }}>Copied!</span>}
    </span>
  );
}

function MarkdownBlock({ content }) {
  return (
    <div style={{
      background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 8,
      padding: '16px 20px', fontFamily: 'monospace', fontSize: 13,
      whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 500, overflow: 'auto',
      marginBottom: 12, color: 'var(--text)',
    }}>
      {content}
    </div>
  );
}

export default function StrategyPanel({ brand: currentBrand }) {
  const [mode, setMode] = useState('quick'); // 'quick' | 'expert'
  const [brands, setBrands] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [brandKey, setBrandKey] = useState('MeepoBoard');
  const [customBrand, setCustomBrand] = useState({ name: '', category: '', tone: '', color_hex: '#6C5CE7', keywords: [] });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ phase1: '', phase2: '', phase3: '', phase4: '', emails: [] });
  const [scenarioId, setScenarioId] = useState('');

  // Expert mode state
  const [selectedTiers, setSelectedTiers] = useState([1, 2, 3]);
  const [targetCtr, setTargetCtr] = useState(3.0);
  const [targetCtor, setTargetCtor] = useState(15.0);
  const [sequenceType, setSequenceType] = useState('Welcome 欢迎');
  const [emailCount, setEmailCount] = useState(4);
  const [bodyFramework, setBodyFramework] = useState('AIDA');
  const [tone, setTone] = useState('friendly');
  const [selFormulas, setSelFormulas] = useState(['好奇', '直接']);
  const [archetype, setArchetype] = useState('Editorial');
  const [colorStrategy, setColorStrategy] = useState('Committed');
  const [primaryColor, setPrimaryColor] = useState('#e8590c');

  useEffect(() => {
    api.fetchStrategyBrands().then(setBrands).catch(() => {});
    api.fetchStrategyScenarios().then(setScenarios).catch(() => {});
  }, []);

  useEffect(() => {
    if (currentBrand) setBrandKey(currentBrand);
  }, [currentBrand]);

  const brand = brands.find(b => b.key === brandKey) || {};
  const brandName = brandKey === 'custom' ? (customBrand.name || '自定义品牌') : (brand.name || brandKey);

  const handleQuickGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.quickGenerate({
        scenarioId,
        brandKey,
        customConfig: brandKey === 'custom' ? customBrand : undefined,
      });
      setResults(data);
    } catch (e) { alert('生成失败: ' + e.message); }
    setLoading(false);
  }, [scenarioId, brandKey, customBrand]);

  const handleExpertGenerate = useCallback(async (action) => {
    setLoading(true);
    try {
      const cfg = brandKey === 'custom' ? customBrand : undefined;
      const data = await api.generateStrategy({
        action,
        brandKey,
        customConfig: cfg,
        selectedTiers,
        targetCtr,
        targetCtor,
        sequenceType,
        emailCount,
        bodyFramework,
        tone,
        selectedFormulas: selFormulas,
        brandKeywords: brand.keywords || [],
        ctaStyle: '按钮 + 文字',
        archetypeName: archetype,
        colorStrategyName: colorStrategy,
        primaryColor,
      });
      if (action === 'emails') setResults(r => ({ ...r, emails: data.emails }));
      else if (action === 'strategy') setResults(r => ({ ...r, phase1: data.markdown }));
      else if (action === 'sequence') setResults(r => ({ ...r, phase2: data.markdown }));
      else if (action === 'copy') setResults(r => ({ ...r, phase3: data.markdown }));
      else if (action === 'design') setResults(r => ({ ...r, phase4: data.markdown }));
    } catch (e) { alert('生成失败: ' + e.message); }
    setLoading(false);
  }, [brandKey, customBrand, selectedTiers, targetCtr, targetCtor, sequenceType, emailCount, bodyFramework, tone, selFormulas, archetype, colorStrategy, primaryColor, brand]);

  const sequenceTypes = ['Welcome 欢迎', '弃购挽回', '浏览未购', '售后序列', 'Win-back 召回'];
  const frameworks = ['AIDA', 'PAS', 'BAB'];
  const archetypes = ['Editorial', 'Bold Mono', 'Minimal Lux', 'Founder Letter', 'Punk/Character', 'Lookbook'];
  const colorStrategies = ['Restrained', 'Committed', 'Drenched'];

  return (
    <div className="panel active" style={{ padding: '24px 32px' }}>
      {/* Mode switch */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button className={`btn ${mode === 'quick' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setMode('quick')}>🚀 快速模式（三步出策略）</button>
        <button className={`btn ${mode === 'expert' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setMode('expert')}>🔧 专业模式（四步精细调参）</button>
      </div>

      {/* Brand selector — shared */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600 }}>品牌:</span>
        {brands.map(b => (
          <button key={b.key}
            className={`btn btn-sm ${brandKey === b.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setBrandKey(b.key)}>
            {b.key === 'MeepoBoard' ? '🛹' : b.key === 'OBE' ? '📽️' : '✨'} {b.name}
          </button>
        ))}
        <button className={`btn btn-sm ${brandKey === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setBrandKey('custom')}>✨ 自定义</button>
      </div>

      {brandKey === 'custom' && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <input className="input" placeholder="品牌名" value={customBrand.name}
            onChange={e => setCustomBrand({ ...customBrand, name: e.target.value })} />
          <input className="input" placeholder="品类（如：电动滑板）" value={customBrand.category}
            onChange={e => setCustomBrand({ ...customBrand, category: e.target.value })} />
          <input className="input" placeholder="关键词（逗号分隔）" value={customBrand.keywords.join(',')}
            onChange={e => setCustomBrand({ ...customBrand, keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean) })} />
          <input type="color" value={customBrand.color_hex}
            onChange={e => setCustomBrand({ ...customBrand, color_hex: e.target.value })} style={{ width: 40, height: 32 }} />
        </div>
      )}

      {/* ===== QUICK MODE ===== */}
      {mode === 'quick' && (
        <div>
          <h3 style={{ marginBottom: 16 }}>📋 选择场景</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
            {scenarios.map(sc => (
              <div key={sc.id}
                onClick={() => setScenarioId(sc.id)}
                style={{
                  padding: 14, borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${scenarioId === sc.id ? '#6C5CE7' : '#333'}`,
                  background: scenarioId === sc.id ? 'rgba(108,92,231,0.08)' : 'transparent',
                  transition: 'all 0.2s',
                }}>
                <div style={{ fontSize: 24 }}>{sc.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14, margin: '4px 0' }}>{sc.name}</div>
                <div style={{ fontSize: 11, color: '#aaa', lineHeight: 1.3 }}>{sc.desc}</div>
              </div>
            ))}
          </div>

          {scenarioId && (
            <div style={{ background: '#eef2ff', borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <div style={{ color: '#4f46e5', fontSize: 13, marginBottom: 8 }}>
                💡 {scenarios.find(s => s.id === scenarioId)?.tip}
              </div>
              <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
                <span>序列: <strong>{scenarios.find(s => s.id === scenarioId)?.sequence}</strong></span>
                <span>邮件数: <strong>{scenarios.find(s => s.id === scenarioId)?.email_count} 封</strong></span>
                <span>框架: <strong>{scenarios.find(s => s.id === scenarioId)?.framework}</strong></span>
                <span>原型: <strong>{scenarios.find(s => s.id === scenarioId)?.archetype}</strong></span>
                <span>语调: <strong>{scenarios.find(s => s.id === scenarioId)?.tone}</strong></span>
              </div>
            </div>
          )}

          <button className="btn btn-primary" style={{ padding: '12px 32px', fontSize: 16, width: '100%' }}
            disabled={!scenarioId || loading}
            onClick={handleQuickGenerate}>
            {loading ? '⏳ 生成中...' : '🎯 一键生成全部内容'}
          </button>
        </div>
      )}

      {/* ===== EXPERT MODE ===== */}
      {mode === 'expert' && (
        <div>
          {/* Phase 1: Strategy */}
          <div style={{ border: '1px solid #333', borderRadius: 10, padding: 20, marginBottom: 16 }}>
            <h4>📊 Phase 1: 策略</h4>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>目标 CTR (%)</label>
                <input type="number" className="input" value={targetCtr} step={0.5}
                  onChange={e => setTargetCtr(parseFloat(e.target.value))} style={{ width: 100 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>目标 CTOR (%)</label>
                <input type="number" className="input" value={targetCtor} step={0.5}
                  onChange={e => setTargetCtor(parseFloat(e.target.value))} style={{ width: 100 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>分层 (Tier)</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1,2,3,4,5].map(t => (
                    <button key={t} className={`btn btn-sm ${selectedTiers.includes(t) ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSelectedTiers(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}>
                      T{t}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn btn-primary" disabled={loading}
                onClick={() => handleExpertGenerate('strategy')}>生成策略</button>
            </div>
            {results.phase1 && <div style={{ marginTop: 12 }}><MarkdownBlock content={results.phase1} /><CopyBtn text={results.phase1} /></div>}
          </div>

          {/* Phase 2: Sequence */}
          <div style={{ border: '1px solid #333', borderRadius: 10, padding: 20, marginBottom: 16 }}>
            <h4>📅 Phase 2: 邮件序列</h4>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>序列类型</label>
                <select className="input" value={sequenceType} onChange={e => setSequenceType(e.target.value)}>
                  {sequenceTypes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>邮件数量</label>
                <input type="number" className="input" value={emailCount} min={1} max={10}
                  onChange={e => setEmailCount(parseInt(e.target.value))} style={{ width: 70 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>语调</label>
                <select className="input" value={tone} onChange={e => setTone(e.target.value)}>
                  {TONES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>正文框架</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {frameworks.map(f => (
                    <button key={f} className={`btn btn-sm ${bodyFramework === f ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setBodyFramework(f)}>{f}</button>
                  ))}
                </div>
              </div>
              <button className="btn btn-primary" disabled={loading}
                onClick={() => handleExpertGenerate('sequence')}>生成序列</button>
              <button className="btn btn-primary" disabled={loading}
                onClick={() => handleExpertGenerate('emails')} style={{ background: '#00b894', borderColor: '#00b894' }}>生成完整邮件</button>
            </div>
            {results.phase2 && <div style={{ marginTop: 12 }}><MarkdownBlock content={results.phase2} /><CopyBtn text={results.phase2} /></div>}
            {results.emails && results.emails.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <h5>📧 生成的邮件内容</h5>
                {results.emails.map((email, i) => (
                  <div key={i} style={{ border: '1px solid #333', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                    <strong>Email {email.num}: {email.purpose}</strong> <span style={{ color: '#888', fontSize: 12 }}>— {email.timing}</span>
                    <div style={{ marginTop: 8 }}>
                      <div><strong>Subject:</strong> {email.subject}</div>
                      <div><strong>Preview:</strong> {email.preview}</div>
                      <MarkdownBlock content={email.body} />
                      <div><strong>CTA:</strong> {email.cta} | <strong>Design:</strong> {email.design_note}</div>
                      <CopyBtn text={`Subject: ${email.subject}\n\nPreview: ${email.preview}\n\n${email.body}\n\nCTA: ${email.cta}`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Phase 3: Copy */}
          <div style={{ border: '1px solid #333', borderRadius: 10, padding: 20, marginBottom: 16 }}>
            <h4>✍️ Phase 3: 文案</h4>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>主题行公式</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 500 }}>
                  {SUBJECT_FORMULAS.map(f => (
                    <button key={f} className={`btn btn-sm ${selFormulas.includes(f) ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSelFormulas(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn btn-primary" disabled={loading}
                onClick={() => handleExpertGenerate('copy')}>生成文案指南</button>
            </div>
            {results.phase3 && <div style={{ marginTop: 12 }}><MarkdownBlock content={results.phase3} /><CopyBtn text={results.phase3} /></div>}
          </div>

          {/* Phase 4: Design */}
          <div style={{ border: '1px solid #333', borderRadius: 10, padding: 20, marginBottom: 16 }}>
            <h4>🎨 Phase 4: 设计</h4>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>美学原型</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 600 }}>
                  {archetypes.map(a => (
                    <button key={a} className={`btn btn-sm ${archetype === a ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setArchetype(a)}>{a}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>色彩策略</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {colorStrategies.map(c => (
                    <button key={c} className={`btn btn-sm ${colorStrategy === c ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setColorStrategy(c)}>{c}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>主色</label>
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ width: 36, height: 32 }} />
              </div>
              <button className="btn btn-primary" disabled={loading}
                onClick={() => handleExpertGenerate('design')}>生成设计规范</button>
            </div>
            {results.phase4 && <div style={{ marginTop: 12 }}><MarkdownBlock content={results.phase4} /><CopyBtn text={results.phase4} /></div>}
          </div>
        </div>
      )}

      {/* Results: quick mode output */}
      {mode === 'quick' && results.phase1 && (
        <div style={{ marginTop: 24 }}>
          <h3>📄 生成结果</h3>
          {results.phase1 && (
            <details open style={{ marginBottom: 12 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, padding: '8px 0' }}>📊 Phase 1: 策略</summary>
              <MarkdownBlock content={results.phase1} />
              <CopyBtn text={results.phase1} />
            </details>
          )}
          {results.phase2 && (
            <details style={{ marginBottom: 12 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, padding: '8px 0' }}>📅 Phase 2: 序列</summary>
              <MarkdownBlock content={results.phase2} />
              <CopyBtn text={results.phase2} />
            </details>
          )}
          {results.emails && results.emails.length > 0 && (
            <details style={{ marginBottom: 12 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, padding: '8px 0' }}>📧 完整邮件 ({results.emails.length} 封)</summary>
              {results.emails.map((email, i) => (
                <div key={i} style={{ border: '1px solid #333', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                  <strong>Email {email.num}: {email.purpose}</strong> <span style={{ color: '#888', fontSize: 12 }}>— {email.timing}</span>
                  <div><strong>Subject:</strong> {email.subject}</div>
                  <div><strong>Preview:</strong> {email.preview}</div>
                  <MarkdownBlock content={email.body} />
                  <div style={{ marginBottom: 8 }}>
                    <strong>CTA:</strong> {email.cta} | <strong>Design:</strong> {email.design_note}
                  </div>
                  <CopyBtn text={`Subject: ${email.subject}\n\nPreview: ${email.preview}\n\n${email.body}\n\nCTA: ${email.cta}`} />
                </div>
              ))}
            </details>
          )}
          {results.phase3 && (
            <details style={{ marginBottom: 12 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, padding: '8px 0' }}>✍️ Phase 3: 文案</summary>
              <MarkdownBlock content={results.phase3} />
              <CopyBtn text={results.phase3} />
            </details>
          )}
          {results.phase4 && (
            <details style={{ marginBottom: 12 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, padding: '8px 0' }}>🎨 Phase 4: 设计</summary>
              <MarkdownBlock content={results.phase4} />
              <CopyBtn text={results.phase4} />
            </details>
          )}
        </div>
      )}
    </div>
  );
}
