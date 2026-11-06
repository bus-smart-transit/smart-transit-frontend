import { COUNTRIES } from '../../../utils/phone';

/**
 * Batch 46 / Batch 47 part B: the phone field with a calling-code drop-down (+63 by default). The person types only
 * the local number. Controlled by { callingCode, local }; utils/phone.js turns it into the stored E.164 form.
 * The drop-down and the number share one visible label (a fieldset legend), so they are announced together.
 */
export default function PhoneInput({ id, label = 'Phone', callingCode, local, onChange, error }) {
  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-medium text-slate-900">{label}</legend>
      <div className={`flex items-stretch overflow-hidden rounded-lg border bg-white focus-within:border-transparent focus-within:ring-2 focus-within:ring-teal-500 ${error ? 'border-red-300' : 'border-slate-200'}`}>
        <select
          id={`${id}-code`}
          aria-label={`${label}: country calling code`}
          value={callingCode}
          onChange={(event) => onChange({ callingCode: event.target.value, local })}
          className="h-11 min-w-[5.5rem] shrink-0 border-r border-slate-200 bg-slate-50 px-2 text-sm text-slate-900 outline-none"
        >
          {COUNTRIES.map((country) => (
            <option key={country.iso} value={country.code}>{`${country.iso} ${country.code}`}</option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          aria-label={`${label}: number`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          placeholder={callingCode === '+63' ? '917 123 4567' : 'Number'}
          value={local}
          onChange={(event) => onChange({ callingCode, local: event.target.value })}
          className="font-data h-11 w-full min-w-0 bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>
      {error && <p id={`${id}-error`} className="mt-1 text-xs text-red-600">{error}</p>}
    </fieldset>
  );
}
