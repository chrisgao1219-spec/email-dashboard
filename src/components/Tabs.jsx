export default function Tabs({ tabs, activeTab, onSwitch }) {
  // 按 group 分组渲染垂直导航
  const groups = [];
  const groupMap = {};
  tabs.forEach(t => {
    const g = t.group || '其他';
    if (!groupMap[g]) {
      groupMap[g] = { name: g, items: [] };
      groups.push(groupMap[g]);
    }
    groupMap[g].items.push(t);
  });

  return (
    <nav className="tabs" aria-label="主要工具导航">
      {groups.map(group => (
        <div key={group.name} className="tab-group">
          <div className="tab-group-label">{group.name}</div>
          {group.items.map(t => (
            <button
              key={t.id}
              className={'tab' + (t.id === activeTab ? ' active' : '')}
              onClick={() => onSwitch(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}
