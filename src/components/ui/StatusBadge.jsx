const STYLES = {
  confirmed: "bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200",
  upcoming: "bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200",
  "on time": "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  paid: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  completed: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
  delayed: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  boarding: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  cancelled: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  refunded: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
};

const DEFAULT_STYLE = "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200";

export default function StatusBadge({ status, className = "" }) {
  const style = STYLES[status?.toLowerCase()] || DEFAULT_STYLE;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${style} ${className}`}
    >
      {status}
    </span>
  );
}
