export default function DataTable({ rows, maxRows = 30, boldRowFn, truncate = true, hideCols = [], header = true }) {
  if (!rows || rows.length < 2) {
    return (
      <div className="empty">
        <span className="empty-icon">📋</span>
        <div className="empty-title">暂无数据</div>
        <div className="empty-desc">请先运行「一键全流程」生成分析报告</div>
      </div>
    );
  }

  const headerRow = header ? rows[0] : null;
  const dataRows = header ? rows.slice(1, maxRows + 1) : rows.slice(0, maxRows);

  const visibleCols = headerRow
    ? headerRow.map((_, i) => i).filter(i => !hideCols.includes(i))
    : (dataRows[0] || []).map((_, i) => i).filter(i => !hideCols.includes(i));

  const esc = (s) => {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  return (
    <div className="table-wrap">
      <table className="data-table">
        {headerRow && (
          <thead>
            <tr>
              {visibleCols.map((ci, i) => (
                <th key={i}>{headerRow[ci] != null ? esc(headerRow[ci]) : ''}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {dataRows.map((row, ri) => {
            const bold = boldRowFn ? boldRowFn(row) : false;
            return (
              <tr key={ri} className={bold ? 'bold-row' : ''}>
                {visibleCols.map((ci, ci2) => {
                  const val = row[ci];
                  const text = val != null ? esc(val) : '';
                  const useTruncate = truncate && text.length > 80;
                  return (
                    <td key={ci2} className={useTruncate ? 'rich-cell' : ''} title={useTruncate ? text : undefined}>
                      {useTruncate ? text : text}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
