import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Form input component matching the design team's reference implementation
 * (rounded-xl, navy focus ring). Keeps the existing icon/required/helpText
 * API so callers (Login, Forgot/Reset Password) don't need to change.
 */
const FormInput = React.forwardRef(({
  label,
  error,
  type = 'text',
  required = false,
  helpText,
  icon: Icon = null,
  disabled = false,
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  return (
    <label className={`block text-sm ${containerClassName}`}>
      {label && (
        <span className="mb-1.5 block font-medium text-navy-900">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </span>
      )}

      <span className="relative flex items-center">
        {Icon && (
          <span className="pointer-events-none absolute left-3.5 text-slate-400">
            <Icon size={18} />
          </span>
        )}
        <input
          ref={ref}
          type={type}
          disabled={disabled}
          className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-navy-700/30 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
            error ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:border-navy-700'
          } ${Icon ? 'pl-10' : ''} ${error ? 'pr-10' : ''} ${className}`}
          {...props}
        />
        {error && (
          <span className="pointer-events-none absolute right-3 text-red-500">
            <AlertCircle size={18} />
          </span>
        )}
      </span>

      {error && <span className="mt-1.5 block text-xs font-medium text-red-600">{error}</span>}
      {!error && helpText && <span className="mt-1.5 block text-xs text-slate-500">{helpText}</span>}
    </label>
  );
});

FormInput.displayName = 'FormInput';

export default FormInput;
