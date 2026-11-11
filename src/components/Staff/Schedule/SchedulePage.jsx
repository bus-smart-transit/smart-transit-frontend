import ViewTabs from '../../ui/ViewTabs';

/**
 * Batch 30: the Schedule page shell. One heading, one "+ Schedule" button (it opens the existing create form, from any
 * view), and the views the role may see: Calendar, Blocks, Trips. The active view's content comes from `children(view)`.
 */
export default function SchedulePage({ views, view, onViewChange, onCreate, children }) {
  if (!views.length) return null;
  const active = views.some((v) => v.key === view) ? view : views[0].key;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">Schedule</h2>
        <button type="button" onClick={onCreate} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700">
          + Schedule
        </button>
      </div>
      <ViewTabs label="Schedule views" tabs={views} value={active} onChange={onViewChange} />
      <div role="tabpanel" aria-label={views.find((v) => v.key === active)?.label} className="space-y-4">
        {children(active)}
      </div>
    </div>
  );
}
