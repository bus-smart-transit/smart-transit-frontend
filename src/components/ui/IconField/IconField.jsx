/**
 * Batch 46: the labelled input with a leading icon used by passenger sign-up and the Operator's Add / Edit Staff
 * form (one look, one behaviour). `error` shows under the field and is linked for screen readers.
 */
export default function IconField({ id, label, icon: Icon, error, hint, className = '', inputClassName = '', ...inputProps }) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-slate-900" htmlFor={id}>{label}</label>
      <div className={`flex items-center gap-2 rounded-lg border bg-white px-3 focus-within:border-transparent focus-within:ring-2 focus-within:ring-teal-500 ${error ? 'border-red-300' : 'border-slate-200'}`}>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`h-11 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 ${inputClassName}`}
          {...inputProps}
        />
      </div>
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
