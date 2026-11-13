import { ChevronDownIcon } from "../Icons.jsx";

export const CALLING_CODES = [
  { code: "+63", country: "PH" },
  { code: "+1", country: "US" },
  { code: "+65", country: "SG" },
  { code: "+60", country: "MY" },
  { code: "+81", country: "JP" },
  { code: "+971", country: "AE" },
];

// Returns the full number (e.g. "+639171234567") or null when it isn't valid.
// PH numbers must be 10 digits starting with 9; a leading 0 is dropped.
export function formatPhone(callingCode, local) {
  let digits = local.replace(/\D/g, "");
  if (callingCode === "+63") {
    if (digits.startsWith("0")) digits = digits.slice(1);
    return /^9\d{9}$/.test(digits) ? `+63${digits}` : null;
  }
  return /^\d{6,14}$/.test(digits) ? `${callingCode}${digits}` : null;
}

function PhFlag() {
  return (
    <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true" className="shrink-0 rounded-[2px]">
      <rect width="22" height="7" fill="#0038a8" />
      <rect y="7" width="22" height="7" fill="#ce1126" />
      <path d="M0 0 L12 7 L0 14 Z" fill="#fff" />
      <circle cx="4.2" cy="7" r="1.8" fill="#fcd116" />
    </svg>
  );
}

export default function PhoneInput({ id, label = "Phone", required, callingCode, local, onChange, error }) {
  return (
    <div className="text-sm">
      <label htmlFor={id} className="mb-1.5 block font-medium text-navy-900">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <div
        className={`flex overflow-hidden rounded-xl border bg-white transition duration-200 focus-within:ring-2 ${
          error
            ? "border-red-400 focus-within:ring-red-200"
            : "border-slate-300 focus-within:border-navy-700 focus-within:ring-navy-700/30"
        }`}
      >
        <span className="relative flex items-center gap-2 border-r border-slate-200 bg-slate-50 pl-3 pr-2">
          {callingCode === "+63" && <PhFlag />}
          <select
            aria-label="Country code"
            value={callingCode}
            onChange={(e) => onChange({ callingCode: e.target.value, local })}
            className="cursor-pointer appearance-none bg-transparent pr-5 text-sm font-medium text-ink focus:outline-none"
          >
            {CALLING_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} {c.country}
              </option>
            ))}
          </select>
          <ChevronDownIcon size={14} className="pointer-events-none absolute right-2 text-slate-500" />
        </span>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={callingCode === "+63" ? "917 123 4567" : "Phone number"}
          value={local}
          onChange={(e) => onChange({ callingCode, local: e.target.value })}
          className="w-full bg-transparent px-3.5 py-2.5 text-sm tracking-wide text-ink placeholder:text-slate-400 focus:outline-none"
        />
      </div>
      {error && <span className="mt-1.5 block text-xs font-medium text-red-600">{error}</span>}
    </div>
  );
}
