import { forwardRef } from "react";

const FormInput = forwardRef(function FormInput(
  {
    label,
    error,
    hint,
    rightSlot,
    icon: Icon = null,
    optional = false,
    as: As = "input",
    className = "",
    containerClassName = "",
    ...props
  },
  ref
) {
  return (
    <label className={`block text-sm ${containerClassName}`}>
      {label && (
        <span className="mb-1.5 block font-medium text-navy-900">
          {label}
          {props.required && <span className="ml-1 text-red-500">*</span>}
          {optional && <span className="ml-1 text-xs font-normal text-slate-400">(optional)</span>}
        </span>
      )}
      <span className="relative flex items-center">
        {Icon && (
          <span className="pointer-events-none absolute left-3.5 text-slate-400">
            <Icon size={18} />
          </span>
        )}
        <As
          ref={ref}
          className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-400 transition duration-200 focus:outline-none focus:ring-2 focus:ring-navy-700/30 ${
            error ? "border-red-400 focus:ring-red-200" : "border-slate-300 focus:border-navy-700"
          } ${Icon ? "pl-10" : ""} ${rightSlot ? "pr-11" : ""} ${className}`}
          {...props}
        />
        {rightSlot && <span className="absolute right-3 flex items-center">{rightSlot}</span>}
      </span>
      {error && <span className="mt-1.5 block text-xs font-medium text-red-600">{error}</span>}
      {!error && hint && <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
});

export default FormInput;
