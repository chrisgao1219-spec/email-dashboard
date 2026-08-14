export default function BarChart({ data, color }) {
  if (!data || data.length === 0) {
    return <div className="empty">暂无数据</div>;
  }

  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div>
      {data.map((d, i) => (
        <div className="bar-row" key={i}>
          <div className="bar-label">{d.label}</div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: Math.max((d.value / max) * 100, 2) + '%',
                background: color || undefined
              }}
            >
              {d.value > 0 ? d.value : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
