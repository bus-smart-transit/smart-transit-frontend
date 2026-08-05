import { SearchIcon } from "../Icons.jsx";

export default function SearchBar({ value, onChange, placeholder = "Search...", className = "" }) {
  return (
    <label className={`relative flex items-center ${className}`}>
      <SearchIcon size={18} className="pointer-events-none absolute left-3.5 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3.5 text-sm text-ink placeholder:text-slate-400 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/30"
      />
    </label>
  );
}
