export default function StatsBar({ stats, error }) {
  const items = [
    { id: 'total', icon: '📬', label: '邮件总数', value: stats ? stats.total : '-', loading: !stats && !error },
    { id: 'week', icon: '📅', label: '本周新增', value: stats ? stats.thisWeek : '-', loading: !stats && !error },
    { id: 'month', icon: '📊', label: '近30天', value: stats ? stats.thisMonth : '-', loading: !stats && !error },
    { id: 'brands', icon: '🏷️', label: '活跃品牌', value: stats ? stats.brands : '-', loading: !stats && !error },
    { id: 'offerRate', icon: '🏪', label: '折扣覆盖率', value: stats && stats.offerRate !== undefined ? stats.offerRate + '%' : '-', loading: !stats && !error },
    { id: 'urgency', icon: '🔥', label: '平均紧迫感', value: stats && stats.avgUrgency !== undefined ? (stats.avgUrgency + '/5') : '-', loading: !stats && !error },
    { id: 'emoji', icon: '😀', label: '平均Emoji数', value: stats && stats.emojiRate !== undefined ? stats.emojiRate : '-', loading: !stats && !error },
    { id: 'update', icon: '🕐', label: '最近更新', value: stats ? stats.lastUpdate : '-', loading: !stats && !error },
  ];

  return (
    <div className="stats">
      {error && (
        <div className="stat-card" style={{gridColumn: '1 / -1', borderLeftColor: '#ef4444'}}>
          <div className="stat-icon">⚠️</div>
          <div className="num" style={{fontSize:13, color:'#dc2626'}}>数据加载失败</div>
          <div className="label">{error}</div>
        </div>
      )}
      {items.map(item => (
        <div className="stat-card" key={item.id}>
          <div className="stat-icon">{item.icon}</div>
          <div className="num">{item.value}</div>
          <div className="label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
