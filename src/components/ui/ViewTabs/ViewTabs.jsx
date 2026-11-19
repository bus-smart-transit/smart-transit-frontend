/**
 * Batch 30: tabs for the views inside one sidebar item (Schedule, Finance). The tab list is built from the views the
 * role may see, so a view that is not permitted is not rendered at all.
 */
export default function ViewTabs({ label, tabs, value, onChange, className = '' }) {
  const move = (event, index) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    onChange(tabs[next].key);
  };

  return (
    <div role="tablist" aria-label={label} className={`flex gap-1 overflow-x-auto border-b border-slate-200 ${className}`}>
      {tabs.map((tab, index) => {
        const active = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.key)}
            onKeyDown={(event) => move(event, index)}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              active ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
