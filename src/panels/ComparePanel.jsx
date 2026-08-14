import { useState } from 'react';
import useApi from '../hooks/useApi';
import { fetchBrandComparison } from '../api';
import DataTable from '../components/DataTable';
import { SkeletonTable } from '../components/SkeletonLoader';

const TYPES = ['促销活动', '弃购挽回', '新品上市', '沉默唤醒', '欢迎系列'];

export default function ComparePanel({ brand }) {
  const [type, setType] = useState('促销活动');
  const { data, loading, error } = useApi('compare_' + type, () => fetchBrandComparison(type, brand), [type, brand]);

  return (
    <div className="panel active">
      <div className="card">
        <h2>
          品牌对比
          <select value={type} onChange={e => setType(e.target.value)}>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </h2>
        {loading ? <SkeletonTable rows={5} /> :
         error ? <div className="empty"><span className="empty-icon">⚠️</span><div className="empty-title">加载失败</div><div className="empty-desc">{error}</div></div> :
         <DataTable rows={data} maxRows={28} />}
      </div>
    </div>
  );
}
