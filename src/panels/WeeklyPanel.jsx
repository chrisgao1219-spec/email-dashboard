import useApi from '../hooks/useApi';
import { fetchWeeklyReport } from '../api';
import DataTable from '../components/DataTable';
import { SkeletonTable } from '../components/SkeletonLoader';

function isBoldRow(row) {
  if (!row || !row[0]) return false;
  const s = String(row[0]);
  return s.startsWith('📊') || s.startsWith('💡') || s.startsWith('⭐');
}

export default function WeeklyPanel() {
  const { data, loading, error } = useApi('weekly', fetchWeeklyReport);

  if (loading) return <div className="panel active"><SkeletonTable rows={6} /></div>;
  if (error) return <div className="panel active"><div className="empty"><span className="empty-icon">⚠️</span><div className="empty-title">加载失败</div><div className="empty-desc">{error}</div></div></div>;

  return (
    <div className="panel active">
      <div className="card">
        <h2>竞品周报</h2>
        <DataTable rows={data} maxRows={35} boldRowFn={isBoldRow} />
      </div>
    </div>
  );
}
