export default function FilterTabs({ options, value, onChange, className = "" }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((option) => {
        const optValue = typeof option === "string" ? option : option.value;
        const optLabel = typeof option === "string" ? option : option.label;
        const active = value === optValue;
        return (
          <button
            key={optValue}
            type="button"
            onClick={() => onChange(optValue)}
            aria-pressed={active}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              active
                ? "bg-navy-800 text-white shadow-sm"
                : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {optLabel}
          </button>
        );
      })}
    </div>
  );
}
