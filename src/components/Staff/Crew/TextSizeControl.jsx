/**
 * Batch 61: the crew's text size choice, as three big buttons ("A" in three sizes). `compact` is the small version in
 * the phone's top bar. Renders only; useCrewTextSize keeps the choice.
 */
const SAMPLE = { normal: 'text-sm', large: 'text-base', xlarge: 'text-lg' };

export default function TextSizeControl({ size, sizes, onChange, compact = false }) {
  return (
    <div role="group" aria-label="Text size" className={compact ? 'inline-flex gap-1' : 'grid grid-cols-3 gap-2'} data-testid={compact ? 'text-size-compact' : 'text-size-control'}>
      {sizes.map((entry) => {
        const active = entry.key === size;
        return (
          <button
            key={entry.key}
            type="button"
            aria-pressed={active}
            aria-label={`Text size ${entry.label}`}
            onClick={() => onChange(entry.key)}
            className={`inline-flex items-center justify-center rounded-xl border font-bold transition ${
              compact ? 'h-10 w-10' : 'min-h-14 flex-col gap-0.5 px-2 py-2'
            } ${active ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'}`}
          >
            <span className={SAMPLE[entry.key]} aria-hidden="true">A</span>
            {!compact && <span className="text-xs font-semibold">{entry.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
