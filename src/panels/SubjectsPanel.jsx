import useApi from '../hooks/useApi';
import { fetchTopSubjects } from '../api';
import ScoreBadge from '../components/ScoreBadge';
import ToneTag from '../components/ToneTag';
import { SkeletonTable } from '../components/SkeletonLoader';

export default function SubjectsPanel() {
  const { data, loading, error } = useApi('subjects', fetchTopSubjects);

  if (loading) return <div className="panel active"><SkeletonTable rows={8} /></div>;
  if (error) return <div className="panel active"><div className="empty"><span className="empty-icon">⚠️</span><div className="empty-title">加载失败</div><div className="empty-desc">{error}</div></div></div>;
  if (!data || data.length === 0) return <div className="panel active"><div className="empty"><span className="empty-icon">🏆</span><div className="empty-title">暂无数据</div><div className="empty-desc">请先运行「一键全流程」生成主题行评分</div></div></div>;

  return (
    <div className="panel active">
      <div className="card">
        <h2>Top 15 高分主题行</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>品牌</th>
                <th>主题行</th>
                <th>评分</th>
                <th>语调</th>
                <th>框架</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td><strong>{s.brand}</strong></td>
                  <td>{s.subject}</td>
                  <td><ScoreBadge score={s.score} grade={s.grade} /></td>
                  <td><ToneTag tone={s.tone} /></td>
                  <td><span className="fw-badge">{s.framework}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
