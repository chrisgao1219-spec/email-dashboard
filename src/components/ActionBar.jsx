export default function ActionBar({ onFullAnalysis, onQuickCollect, onRefresh, busy }) {
  return (
    <div className="actions">
      <button
        id="btn-full"
        className={'btn btn-primary' + (busy ? ' btn-busy' : '')}
        disabled={busy}
        onClick={onFullAnalysis}
      >
        {busy ? '⏳ 分析中...' : '一键全流程'}
      </button>
      <button
        id="btn-quick"
        className={'btn btn-secondary' + (busy ? ' btn-busy' : '')}
        disabled={busy}
        onClick={onQuickCollect}
      >
        {busy ? '⏳ 采集...' : '快速采集'}
      </button>
      <button className="btn btn-secondary" onClick={onRefresh} disabled={busy}>
        刷新
      </button>
      <span className="hint">{busy ? '处理中，请稍候...' : '全流程约1-3分钟'}</span>
    </div>
  );
}
