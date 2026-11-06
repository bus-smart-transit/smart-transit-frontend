import { useState } from 'react';
import { Check, Eye, EyeOff, Lock } from 'lucide-react';
import { STRENGTH_INFO, passwordHints, passwordStrength } from '../../../utils/accountFormRules';

/**
 * Batch 46: the password input with show / hide, shared by sign-up, Add Staff and Change password. `showStrength`
 * adds the strength bar and the four hints (for a new password).
 */
export default function PasswordField({ id, label, value, onChange, error, placeholder, autoComplete = 'new-password', showStrength = false, toggleLabel = 'password' }) {
  const [visible, setVisible] = useState(false);
  const strength = passwordStrength(value);
  const info = STRENGTH_INFO[strength] || STRENGTH_INFO[0];

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-900" htmlFor={id}>{label}</label>
      <div className={`flex items-center gap-2 rounded-lg border bg-white px-3 focus-within:border-transparent focus-within:ring-2 focus-within:ring-teal-500 ${error ? 'border-red-300' : 'border-slate-200'}`}>
        <Lock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="h-11 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center text-slate-400 transition hover:text-slate-600"
          onClick={() => setVisible((shown) => !shown)}
          aria-label={visible ? `Hide ${toggleLabel}` : `Show ${toggleLabel}`}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {showStrength && value && (
        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slate-500">Strength</span>
            <span style={{ color: info.color }}>{info.label}</span>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-1.5 rounded" style={{ background: i <= strength ? info.color : '#e2e8f0' }} />
            ))}
          </div>
        </div>
      )}
      {error && <p id={`${id}-error`} className="mt-1 text-xs text-red-600">{error}</p>}
      {showStrength && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {passwordHints(value).map((hint) => (
            <div key={hint.label} className={`inline-flex items-center gap-2 text-xs ${hint.check ? 'text-teal-600' : 'text-slate-400'}`}>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {hint.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
