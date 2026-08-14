export function SkeletonCard({ lines = 4 }) {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-line" style={{ width: '35%', height: 18, marginBottom: 16 }} />
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton skeleton-line" style={{ width: `${85 - i * 10}%` }} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 4 }) {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-line" style={{ width: '30%', height: 18, marginBottom: 16 }} />
      <div className="skeleton skeleton-line" style={{ width: '100%', height: 32, marginBottom: 6 }} />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton skeleton-line" style={{ width: `${95 - i * 3}%`, height: 28, marginBottom: 4 }} />
      ))}
    </div>
  );
}

export function SkeletonBars({ count = 5 }) {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-line" style={{ width: '30%', height: 18, marginBottom: 16 }} />
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton skeleton-bar" style={{ width: `${90 - i * 8}%` }} />
      ))}
    </div>
  );
}
