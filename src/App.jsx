import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from './api';
import { preloadAll, invalidateAll, setStaticDataUrl, setStaticDataUrls, cachedFetch } from './cache';
import Header from './components/Header';
import StatsBar from './components/StatsBar';
import ActionBar from './components/ActionBar';
import Tabs from './components/Tabs';
import Toast from './components/Toast';
import BackToTop from './components/BackToTop';
import EdmAssistant from './components/EdmAssistant';
import DashboardPanel from './panels/DashboardPanel';
import FormsPanel from './panels/FormsPanel';
import AutomationPanel from './panels/AutomationPanel';
import CampaignsPanel from './panels/CampaignsPanel';
import OverviewPanel from './panels/OverviewPanel';
import ActionPanel from './panels/ActionPanel';
import WeeklyPanel from './panels/WeeklyPanel';
import SubjectsPanel from './panels/SubjectsPanel';
import CalendarPanel from './panels/CalendarPanel';
import SetupPanel from './panels/SetupPanel';
import StrategyPanel from './panels/StrategyPanel';

const TABS = [
  { id: 'dashboard', label: '🏠 首页', group: '主控台' },
  { id: 'forms', label: '📋 订阅表单', group: '主控台' },
  { id: 'automation', label: '🤖 自动流程', group: '主控台' },
  { id: 'campaigns', label: '📢 营销活动', group: '主控台' },
  { id: 'analytics', label: '📊 数据分析', group: '主控台' },
  { id: 'strategy', label: '📧 策略生成', group: '创意' },
  { id: 'setup', label: '🔧 设置', group: '系统' },
];

const FALLBACK_BRANDS = [
  { name: 'Meepo', category: '电动滑板', productName: 'Voyager', specs: '1000W电机 / 38mph / 29mi续航' },
  { name: 'Kukirin', category: '电动滑板车', productName: 'G2 Master', specs: '双1200W电机 / 65km/h / 80km续航' },
  { name: 'Engwe', category: '电动自行车', productName: 'Engine Pro', specs: '750W电机 / 45km/h / 100km续航' },
  { name: 'Heybike', category: '电动自行车', productName: 'Mars 2.0', specs: '750W电机 / 32km/h / 80km续航' },
  { name: 'Hiboy', category: '电动滑板车', productName: 'S2 Pro', specs: '350W电机 / 30km/h / 40km续航' },
];

export default function App() {
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [myBrands, setMyBrands] = useState(FALLBACK_BRANDS);
  const [selectedBrand, setSelectedBrand] = useState(FALLBACK_BRANDS[0].name);
  const [configError, setConfigError] = useState(false);
  const [configReady, setConfigReady] = useState(false);
  const [subTab, setSubTab] = useState({});
  const toastTimerRef = useRef(null);

  // 启动时获取品牌列表
  useEffect(() => {
    api.fetchConfig().then(config => {
      const brands = config.myBrands || [config.myBrand];
      setMyBrands(brands);
      setSelectedBrand(brands[0]?.name || FALLBACK_BRANDS[0].name);
      setConfigError(false);
      if (config.dataUrls) setStaticDataUrls(config.dataUrls);
      if (config.dataUrl) setStaticDataUrl(config.dataUrl);
    }).catch(() => {
      setConfigError(true);
    }).finally(() => {
      setConfigReady(true);
    });
  }, []);

  const loadBrandData = useCallback((brand, force = false) => {
    preloadAll(brand, force)
      .then(bundle => {
        if (bundle?.stats) {
          setStats(bundle.stats);
          setStatsError(null);
          return;
        }
        return cachedFetch('stats', () => api.fetchStats())
          .then(data => { setStats(data); setStatsError(null); });
      })
      .catch(error => setStatsError(error.message));
  }, []);

  // Wait for config so configured static bundles can satisfy the first load.
  useEffect(() => {
    if (!selectedBrand || !configReady) return;
    invalidateAll();
    loadBrandData(selectedBrand);
  }, [configReady, loadBrandData, selectedBrand]);

  const showToast = useCallback((message, type) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const refreshAll = useCallback((opts) => {
    const force = !!(opts && opts.force);
    invalidateAll();
    loadBrandData(selectedBrand, force);
    setRefreshKey(k => k + 1);
  }, [loadBrandData, selectedBrand]);

  const handleFullAnalysis = useCallback(async () => {
    setBusy(true);
    showToast('全流程分析进行中，约1-3分钟...', 'info');
    try {
      const r = await api.runFullAnalysis(selectedBrand);
      if (r.ok) { showToast('分析完成，新采集 ' + (r.newEmails || 0) + ' 封', 'ok'); refreshAll({ force: true }); }
      else showToast(r.error || '分析失败', 'err');
    } catch (e) {
      showToast(e.message, 'err');
    }
    setBusy(false);
  }, [showToast, refreshAll, selectedBrand]);

  const handleQuickCollect = useCallback(async () => {
    setBusy(true);
    try {
      const r = await api.runQuickCollect();
      if (r.ok) { showToast(`采集完成，${r.count} 封新邮件`, 'ok'); refreshAll({ force: true }); }
      else showToast(r.error || '采集失败', 'err');
    } catch (e) {
      showToast(e.message, 'err');
    }
    setBusy(false);
  }, [showToast, refreshAll]);

  const handleRefresh = useCallback(() => {
    showToast('正在刷新数据...', 'info');
    refreshAll({ force: true });
  }, [refreshAll, showToast]);

  const handleOpenSheet = useCallback(async () => {
    try {
      const r = await api.fetchSheetUrl();
      if (r.url) window.open(r.url, '_blank');
    } catch (e) {
      showToast(e.message, 'err');
    }
  }, [showToast]);

  const handleBrandChange = useCallback((brand) => {
    setSelectedBrand(brand);
  }, []);

  const handleRegistered = useCallback(() => {
    api.fetchConfig().then(config => {
      const brands = config.myBrands || [config.myBrand];
      setMyBrands(brands);
      if (!brands.some(b => b.name === selectedBrand)) {
        setSelectedBrand(brands[0]?.name || '');
      }
    }).catch(() => {});
  }, [selectedBrand]);

  const renderPanel = () => {
    const key = refreshKey;
    switch (activeTab) {
      case 'dashboard': return <DashboardPanel key={key} brand={selectedBrand} tools={TABS} onNavigate={(tab, sub) => { setActiveTab(tab); if (sub) setSubTab(s => ({...s, [tab]: sub})); }} />;
      case 'forms': return <FormsPanel />;
      case 'automation': return <AutomationPanel initialExpand={subTab.automation} />;
      case 'campaigns': return <CampaignsPanel key={key} brand={selectedBrand} initialSubTab={subTab.campaigns} />;
      case 'analytics': {
        const st = subTab.analytics || 'overview';
        return (
          <div className="panel active">
            <div className="sub-tabs-bar">
              <button className={`sub-tab-btn ${st === 'overview' ? 'active' : ''}`} onClick={() => setSubTab(s => ({...s, analytics: 'overview'}))}>📊 总览</button>
              <button className={`sub-tab-btn ${st === 'subjects' ? 'active' : ''}`} onClick={() => setSubTab(s => ({...s, analytics: 'subjects'}))}>🏆 主题行</button>
              <button className={`sub-tab-btn ${st === 'calendar' ? 'active' : ''}`} onClick={() => setSubTab(s => ({...s, analytics: 'calendar'}))}>📅 日历</button>
            </div>
            {st === 'overview' && (
              <>
                <OverviewPanel key={key} />
                <ActionPanel key={key + '_action'} brand={selectedBrand} />
                <WeeklyPanel key={key + '_weekly'} />
              </>
            )}
            {st === 'subjects' && <SubjectsPanel key={key} />}
            {st === 'calendar' && <CalendarPanel key={key} brand={selectedBrand} />}
          </div>
        );
      }
      case 'setup': return <SetupPanel key={key} onRegistered={handleRegistered} />;
      case 'strategy': return <StrategyPanel key={key} brand={selectedBrand} />;
      default: return null;
    }
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Header myBrands={myBrands} selectedBrand={selectedBrand} onBrandChange={handleBrandChange} onOpenSheet={handleOpenSheet} configError={configError} />
        <Tabs tabs={TABS} activeTab={activeTab} onSwitch={setActiveTab} />
        <footer className="app-footer">
          <span>作者：Chrisgao · 有任何使用问题请联系</span>
        </footer>
      </aside>
      <main className="main-content">
        {renderPanel()}
      </main>
      {toast && <Toast message={toast.message} type={toast.type} />}
      <BackToTop />
      <EdmAssistant />
    </div>
  );
}
