import { useState } from 'react';
import useApi from '../hooks/useApi';
import { fetchInspiration } from '../api';
import DataTable from '../components/DataTable';
import { SkeletonTable } from '../components/SkeletonLoader';

const TYPES = ['促销活动', '弃购挽回', '新品上市', '沉默唤醒'];

export default function InspirePanel({ brand }) {
  const [type, setType] = useState('促销活动');
  const cacheKey = 'inspire_' + (brand || '') + '_' + type;
  const { data, loading, error } = useApi(cacheKey, () => fetchInspiration(type, brand), [type, brand]);

  return (
    <div className="panel active">
      <div className="card">
        <h2>
          {brand || '品牌'} 灵感
          <select value={type} onChange={e => setType(e.target.value)}>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </h2>
        <div className="inspire-source-hint">
          💡 灵感内容由 AI 基于{type}类邮件的最佳实践自动生成，每24小时刷新一次。
          如需实时竞品邮件抓取，请使用「数据分析 → 全流程分析」触发采集。
        </div>
        {loading ? <SkeletonTable rows={5} /> :
         error ? <div className="empty"><span className="empty-icon">⚠️</span><div className="empty-title">加载失败</div><div className="empty-desc">{error}</div></div> :
         <DataTable rows={data} maxRows={32} />}
      </div>
    </div>
  );
}
