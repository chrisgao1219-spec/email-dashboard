import useApi from '../hooks/useApi';
import { fetchActionReport } from '../api';
import DataTable from '../components/DataTable';
import { SkeletonTable } from '../components/SkeletonLoader';

const EMOJI_MARKERS = /[\u{1F3C6}\u{1F4A1}\u{23F0}\u{1F3AF}\u{1F4B0}\u{1F9E0}]/u;

function isBoldRow(row) {
  if (!row || !row[0]) return false;
  return EMOJI_MARKERS.test(String(row[0]));
}

export default function ActionPanel({ brand }) {
  const cacheKey = 'action_' + (brand || '');
  const { data, loading, error } = useApi(cacheKey, () => fetchActionReport(brand), [brand]);

  if (loading) return <div className="panel active"><SkeletonTable rows={8} /></div>;
  if (error) return <div className="panel active"><div className="empty"><span className="empty-icon">⚠️</span><div className="empty-title">加载失败</div><div className="empty-desc">{error}</div></div></div>;

  return (
    <div className="panel active">
      <div className="card">
        <h2>{(brand || '品牌') + ' 竞品行动建议'}</h2>
        <DataTable rows={data} maxRows={55} boldRowFn={isBoldRow} />
      </div>
    </div>
  );
}
