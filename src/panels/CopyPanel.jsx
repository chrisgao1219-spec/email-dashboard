import useApi from '../hooks/useApi';
import { fetchCopywriting } from '../api';
import DataTable from '../components/DataTable';
import { SkeletonTable } from '../components/SkeletonLoader';

export default function CopyPanel() {
  const { data, loading, error } = useApi('copy', fetchCopywriting);

  if (loading) return <div className="panel active"><SkeletonTable rows={6} /></div>;
  if (error) return <div className="panel active"><div className="empty"><span className="empty-icon">⚠️</span><div className="empty-title">加载失败</div><div className="empty-desc">{error}</div></div></div>;

  return (
    <div className="panel active">
      <div className="card">
        <h2>竞品话术库</h2>
        <DataTable rows={data} maxRows={20} truncate={true} />
      </div>
    </div>
  );
}
