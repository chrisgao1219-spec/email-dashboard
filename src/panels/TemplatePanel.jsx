import useApi from '../hooks/useApi';
import { fetchTemplates } from '../api';
import DataTable from '../components/DataTable';
import { SkeletonCard } from '../components/SkeletonLoader';

export default function TemplatePanel({ brand }) {
  const cacheKey = 'templates_' + (brand || '');
  const { data, loading, error } = useApi(cacheKey, () => fetchTemplates(brand), [brand]);

  if (loading) return (
    <div className="panel active">
      <SkeletonCard lines={3} />
      <SkeletonCard lines={5} />
    </div>
  );
  if (error) return <div className="panel active"><div className="empty"><span className="empty-icon">⚠️</span><div className="empty-title">加载失败</div><div className="empty-desc">{error}</div></div></div>;
  if (!data || data.length === 0) return (
    <div className="panel active">
      <div className="empty">
        <span className="empty-icon">📝</span>
        <div className="empty-title">暂无模板</div>
        <div className="empty-desc">请先运行「一键全流程」生成邮件模板</div>
      </div>
    </div>
  );

  return (
    <div className="panel active">
      {data.map((t, i) => (
        <div className="card" key={i}>
          <h2>{t.name.replace('邮件模板_', '')}</h2>
          <DataTable rows={t.rows} maxRows={25} truncate={false} />
        </div>
      ))}
    </div>
  );
}
