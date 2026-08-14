import { useState, useEffect, useCallback } from 'react';
import { fetchConfig, registerBrand, removeBrand, fetchRegisteredConfigs } from '../api';

const CATEGORIES = ['电动滑板', '电动自行车', '电动滑板车', '其他出行'];

export default function SetupPanel({ onRegistered }) {
  const [competitors, setCompetitors] = useState([]);
  const [registered, setRegistered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // form state
  const [brandName, setBrandName] = useState('');
  const [category, setCategory] = useState('');
  const [productName, setProductName] = useState('');
  const [specs, setSpecs] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [selectedCompetitors, setSelectedCompetitors] = useState({});
  const [customName, setCustomName] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [customList, setCustomList] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const cfg = await fetchConfig();
      setCompetitors(cfg.competitors || []);
    } catch (e) { /* ignore */ }
    try {
      const reg = await fetchRegisteredConfigs();
      setRegistered(reg || []);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const groupedCompetitors = {};
  competitors.forEach(c => {
    const cat = c.category || '其他';
    if (!groupedCompetitors[cat]) groupedCompetitors[cat] = [];
    groupedCompetitors[cat].push(c);
  });

  const toggleCompetitor = (name) => {
    setSelectedCompetitors(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const addCustom = () => {
    if (!customName.trim() || !customDomain.trim()) return;
    setCustomList(prev => [...prev, { name: customName.trim(), domain: customDomain.trim(), category: customCategory || category || '' }]);
    setCustomName('');
    setCustomDomain('');
    setCustomCategory('');
  };

  const removeCustom = (idx) => {
    setCustomList(prev => prev.filter((_, i) => i !== idx));
  };

  const handleRegister = useCallback(async () => {
    if (!brandName.trim()) { setMsg({ type: 'err', text: '请填写品牌名称' }); return; }
    const selected = competitors
      .filter(c => selectedCompetitors[c.name])
      .map(c => ({ name: c.name, domain: c.domain, category: c.category }));
    const allCompetitors = [...selected, ...customList];
    if (allCompetitors.length === 0 && !confirm('你没有选择任何竞品品牌。\n\n注册后系统只能分析基本数据，无法做竞品对比。\n\n确定要继续注册吗？')) return;

    setLoading(true);
    setMsg(null);
    try {
      const r = await registerBrand({
        myBrand: { name: brandName.trim(), category: category || '其他', productName: productName.trim(), specs: specs.trim() },
        competitors: allCompetitors,
        createdBy: createdBy.trim()
      });
      if (r.ok) {
        setMsg({ type: 'ok', text: `品牌「${r.brand.name}」注册成功！已关联 ${r.competitorCount} 个竞品。` });
        setBrandName(''); setCategory(''); setProductName(''); setSpecs(''); setCreatedBy('');
        setSelectedCompetitors({}); setCustomList([]);
        loadData();
        if (onRegistered) onRegistered();
      } else {
        setMsg({ type: 'err', text: r.error || '注册失败' });
      }
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    }
    setLoading(false);
  }, [brandName, category, productName, specs, createdBy, selectedCompetitors, competitors, customList, loadData, onRegistered]);

  const handleDelete = async (brandNameToDelete) => {
    if (!confirm(`确定要删除品牌「${brandNameToDelete}」及其竞品配置吗？`)) return;
    try {
      const r = await removeBrand(brandNameToDelete);
      if (r.ok) {
        setMsg({ type: 'ok', text: `已删除品牌「${brandNameToDelete}」` });
        loadData();
        if (onRegistered) onRegistered();
      } else {
        setMsg({ type: 'err', text: r.error || '删除失败' });
      }
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    }
  };

  const registeredBrandNames = new Set(registered.map(r => r.myBrand && r.myBrand.name).filter(Boolean));

  return (
    <div className="setup-panel">
      {msg && (
        <div className={`setup-msg setup-msg-${msg.type}`} onClick={() => setMsg(null)}>
          {msg.text}
        </div>
      )}

      <div className="setup-section">
        <h3>注册新品牌</h3>
        <div className="setup-form">
          <div className="setup-field">
            <label>品牌名称 <span className="req">*</span></label>
            <input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="例如: Meepo, Kukirin" />
          </div>
          <div className="setup-field">
            <label>品类</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">-- 选择品类 --</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="setup-field">
            <label>主打产品</label>
            <input value={productName} onChange={e => setProductName(e.target.value)} placeholder="例如: G2 Master" />
          </div>
          <div className="setup-field">
            <label>核心卖点</label>
            <input value={specs} onChange={e => setSpecs(e.target.value)} placeholder="例如: 双1200W电机 / 65km/h" />
          </div>
          <div className="setup-field">
            <label>你的名字（选填）</label>
            <input value={createdBy} onChange={e => setCreatedBy(e.target.value)} placeholder="方便识别是谁的项目" />
          </div>
        </div>
      </div>

      <div className="setup-section">
        <h3>选择竞品品牌</h3>
        <p className="setup-hint">勾选你想要分析的竞品品牌，系统会从 Gmail 中采集这些品牌发送的营销邮件。</p>
        {Object.entries(groupedCompetitors).map(([cat, list]) => (
          <div key={cat} className="setup-comp-cat">
            <div className="setup-comp-cat-title">{cat}</div>
            <div className="setup-comp-list">
              {list.map(c => (
                <label key={c.name} className={`setup-comp-item ${selectedCompetitors[c.name] ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={!!selectedCompetitors[c.name]}
                    onChange={() => toggleCompetitor(c.name)}
                  />
                  <span className="setup-comp-name">{c.name}</span>
                  <span className="setup-comp-tier">{c.tier}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="setup-custom">
          <div className="setup-custom-title">添加自定义竞品（如果上面列表里没有，可添加多个）</div>
          <div className="setup-custom-row">
            <input aria-label="自定义竞品品牌名" placeholder="品牌名" value={customName} onChange={e => setCustomName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustom()} />
            <input aria-label="自定义竞品域名" placeholder="域名 (如 brand.com)" value={customDomain} onChange={e => setCustomDomain(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustom()} />
            <input aria-label="自定义竞品品类" placeholder="品类" value={customCategory} onChange={e => setCustomCategory(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustom()} />
            <button className="btn btn-sm btn-outline" onClick={addCustom}>添加</button>
          </div>
          {customList.length > 0 && (
            <div className="setup-custom-tags">
              <span className="setup-custom-count">{customList.length} 个自定义竞品：</span>
              {customList.map((c, i) => (
                <span key={i} className="setup-tag">
                  {c.name} ({c.domain})
                  <button className="setup-tag-remove" aria-label={`删除自定义竞品 ${c.name}`} onClick={() => removeCustom(i)}>x</button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <button className="btn btn-primary setup-submit" onClick={handleRegister} disabled={loading}>
        {loading ? '注册中...' : '注册品牌'}
      </button>

      {registered.length > 0 && (
        <div className="setup-section">
          <h3>已注册品牌 ({registered.length})</h3>
          <div className="setup-registered-list">
            {registered.map((r, i) => (
              <div key={i} className="setup-registered-item">
                <div className="setup-registered-info">
                  <strong>{r.myBrand ? r.myBrand.name : '?'}</strong>
                  <span className="setup-registered-cat">{r.myBrand ? r.myBrand.category : ''}</span>
                  <span className="setup-registered-product">{r.myBrand ? r.myBrand.productName : ''}</span>
                  {r.createdBy && <span className="setup-registered-by">by {r.createdBy}</span>}
                  <span className="setup-registered-comp">竞品: {(r.competitors || []).map(c => c.name).join(', ')}</span>
                </div>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(r.myBrand?.name || '')}>删除</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
