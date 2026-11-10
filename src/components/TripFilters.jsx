import { useEffect, useState } from "react";
import { applyFilters, BUS_TYPES, countActiveFilters, defaultFilters, TIME_SLOTS } from "../utils/tripFilters.js";
import { BusIcon, ClockIcon, CloseIcon, FilterIcon } from "./Icons.jsx";
import Button from "./ui/Button.jsx";

const toggle = (list, value) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

const GROUPS = [
  { key: "times", label: "Departure Time", icon: ClockIcon, items: TIME_SLOTS },
  { key: "busTypes", label: "Bus Type", icon: BusIcon, items: BUS_TYPES },
];

// Plain checkboxes: tick one or more options in each group.
function FilterFields({ filters, onChange, stacked }) {
  return (
    <div className={stacked ? "space-y-5" : "flex flex-wrap items-start gap-x-12 gap-y-4"}>
      {GROUPS.map(({ key, label, icon: Icon, items }) => (
        <fieldset key={key} className="space-y-2.5">
          <legend className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Icon size={14} />
            {label}
          </legend>
          <div className={stacked ? "grid gap-3" : "flex flex-wrap gap-x-5 gap-y-2.5"}>
            {items.map((item) => (
              <label
                key={item.id}
                title={item.hint}
                className="flex cursor-pointer items-center gap-2 text-sm font-medium text-navy-950"
              >
                <input
                  type="checkbox"
                  checked={filters[key].includes(item.id)}
                  onChange={() => onChange({ [key]: toggle(filters[key], item.id) })}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-navy-800"
                />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

export default function TripFilters({ trips, filters, onChange, onClear }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const active = countActiveFilters(filters);

  useEffect(() => {
    if (!sheetOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setSheetOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

  return (
    <>
      {/* Desktop / tablet: compact toolbar */}
      <div className="hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-card md:block">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <FilterFields filters={filters} onChange={onChange} />
          {active > 0 && (
            <button type="button" onClick={onClear} className="text-sm font-semibold text-navy-700 underline-offset-2 hover:underline">
              Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* Mobile: button + bottom sheet */}
      <div className="flex items-center gap-2 md:hidden">
        <button
          type="button"
          onClick={() => {
            setDraft(filters);
            setSheetOpen(true);
          }}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-navy-800 bg-white px-4 py-2.5 text-sm font-semibold text-navy-800 shadow-sm transition-colors hover:bg-navy-50"
        >
          <FilterIcon size={16} /> Filter Trips
          {active > 0 && <span className="rounded-full bg-navy-800 px-2 py-0.5 text-xs text-white">{active}</span>}
        </button>
        {active > 0 && (
          <button type="button" onClick={onClear} className="px-2 text-sm font-semibold text-navy-700">
            Clear All
          </button>
        )}
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Filter trips">
          <div className="absolute inset-0 animate-fade-in bg-navy-950/50" onClick={() => setSheetOpen(false)} />
          <div className="sheet-up absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-3xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="font-display text-lg font-bold text-navy-950">Filter Trips</h2>
              <button type="button" onClick={() => setSheetOpen(false)} aria-label="Close" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
                <CloseIcon size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <FilterFields filters={draft} onChange={(c) => setDraft((d) => ({ ...d, ...c }))} stacked />
            </div>
            <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
              <Button variant="outline" className="flex-1" onClick={() => setDraft(defaultFilters())}>
                Clear All
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => {
                  onChange(draft);
                  setSheetOpen(false);
                }}
              >
                Apply Filters ({applyFilters(trips, draft).length})
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
