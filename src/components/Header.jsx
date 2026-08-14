import { useState } from 'react';

export default function Header({ myBrands, selectedBrand, onBrandChange, onOpenSheet, configError }) {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="header">
      <div className="header-brand">
        <h1>
          <span className="brand-name">{selectedBrand || '品牌'}</span>
        </h1>
        <span className="brand-subtitle">竞品邮件营销分析</span>
        {myBrands && myBrands.length > 1 && (
          <select
            className="brand-select"
            aria-label="选择品牌"
            value={selectedBrand}
            onChange={e => onBrandChange(e.target.value)}
          >
            {myBrands.map(b => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="header-actions">
        <button className="btn btn-outline btn-sm" onClick={onOpenSheet}>
          打开完整表格
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => setShowGuide(true)}>
          使用说明
        </button>
      </div>

      <div className="header-author">
        <img className="author-avatar" src="/avatar.jpg" alt="Chrisgao" />
        <div className="author-info">
          <span className="author-name">Chrisgao</span>
          <span className="author-role">作者{configError ? ' · 离线模式' : ''}</span>
        </div>
      </div>

      {showGuide && (
        <div className="guide-overlay" onClick={e => { if (e.target.className === 'guide-overlay') setShowGuide(false); }}>
          <div className="guide-modal">
            <div className="guide-modal-header">
              <h2>竞品分析 — 使用说明</h2>
              <button className="guide-modal-close" aria-label="关闭使用说明" onClick={() => setShowGuide(false)}>✕</button>
            </div>
            <div className="guide-modal-body">
              <p><strong>🎯 这个系统做什么？</strong><br/>自动从你的 Gmail 中采集竞品品牌的营销邮件，分析它们的策略、话术、发送节奏，然后生成：</p>
              <ul>
                <li><strong>📊 总览</strong> — 竞品发送热度、语调、CTA风格、折扣策略</li>
                <li><strong>🎯 行动建议</strong> — 基于竞品数据的具体可执行建议</li>
                <li><strong>📰 周报</strong> — 本周竞品动态总结</li>
                <li><strong>🏆 主题行</strong> — 高分主题行排名 + 评分体系</li>
                <li><strong>📊 品牌对比</strong> — 不同竞品在同一邮件类型下的表现对比</li>
                <li><strong>💡 灵感</strong> — 竞品主题行改写为适合你的版本</li>
                <li><strong>✏ 话术</strong> — 竞品文案直接抓取</li>
                <li><strong>📝 模板</strong> — 为你生成的邮件模板</li>
                <li><strong>⭐ 评分</strong> — AI 给你的邮件内容打分+检查清单</li>
                <li><strong>📅 日历</strong> — 竞品发送时间分布</li>
                <li><strong>🔧 注册品牌</strong> — 同事自助注册自己的品牌和竞品</li>
              </ul>
              <p><strong>🚀 怎么用？</strong></p>
              <ol>
                <li>点击 <strong>🔄 一键全流程</strong>（约1-3分钟），系统自动采集+分析</li>
                <li>点击各个标签查看不同维度的分析结果</li>
                <li>左上角可以切换品牌（如果是多品牌系统）</li>
                <li>新同事点 <strong>🔧 注册品牌</strong> 填入自己的品牌和竞品</li>
                <li>系统每天 8:00 自动运行</li>
              </ol>
              <p><strong>💡 小技巧</strong></p>
              <ul>
                <li>确保 Gmail 订阅了竞品品牌的邮件</li>
                <li>一键全流程可以随时手动触发，不限于每天一次</li>
                <li>点击 <strong>打开完整表格</strong> 可以查看 Google Sheets 原始数据</li>
              </ul>
              <hr/>
              <p style={{textAlign:'center', color:'#888', fontSize:13, marginTop:12}}>
                有任何使用问题，请联系作者 <strong>Chrisgao</strong>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
