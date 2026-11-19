import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { COUNTRIES } from '../../../utils/phone';

/** A small flag picture (public/flags, from the MIT-licensed flag-icons). Emoji flags do not show on Windows. */
function Flag({ iso }) {
  return <img src={`/flags/${iso.toLowerCase()}.svg`} alt="" className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(15,23,42,0.08)]" />;
}

/**
 * Batch 46 / Batch 47 part B: the phone field with a calling-code choice (+63 by default). The person types only
 * the local number. Controlled by { callingCode, local }; utils/phone.js turns it into the stored E.164 form.
 * 2026-11-06 (passenger redesign): the choice shows each country's flag, so it is a small list button instead of a
 * plain drop-down (a drop-down cannot show pictures). Keyboard: arrows move, Enter picks, Escape closes.
 * The choice and the number share one visible label (a fieldset legend), so they are announced together.
 */
export default function PhoneInput({ id, label = 'Phone', callingCode, local, onChange, error }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const listId = useId();
  const current = COUNTRIES.find((country) => country.code === callingCode) ?? COUNTRIES[0];

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => { if (!wrapRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const openList = () => {
    setActive(Math.max(0, COUNTRIES.findIndex((country) => country.code === current.code)));
    setOpen(true);
  };

  const choose = (country) => {
    onChange({ callingCode: country.code, local });
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onKeyDown = (event) => {
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      openList();
      return;
    }
    if (!open) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => Math.min(i + 1, COUNTRIES.length - 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (event.key === 'Home') { event.preventDefault(); setActive(0); }
    else if (event.key === 'End') { event.preventDefault(); setActive(COUNTRIES.length - 1); }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(COUNTRIES[active]); }
    else if (event.key === 'Escape' || event.key === 'Tab') { setOpen(false); }
  };

  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-medium text-slate-900">{label}</legend>
      <div ref={wrapRef} className={`relative flex items-stretch rounded-lg border bg-white focus-within:border-transparent focus-within:ring-2 focus-within:ring-teal-500 ${error ? 'border-red-300' : 'border-slate-200'}`}>
        <button
          ref={buttonRef}
          id={`${id}-code`}
          type="button"
          aria-label={`${label}: country calling code`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open ? `${listId}-${active}` : undefined}
          onClick={() => (open ? setOpen(false) : openList())}
          onKeyDown={onKeyDown}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-l-lg border-r border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-900 outline-none"
        >
          <Flag iso={current.iso} />
          <span>{current.code}</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
        </button>
        {open && (
          <ul id={listId} role="listbox" aria-label={`${label}: country calling code`} className="absolute left-0 top-full z-30 mt-1 max-h-64 w-72 max-w-[85vw] overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {COUNTRIES.map((country, index) => (
              <li
                key={country.iso}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={country.code === current.code}
                onMouseDown={(event) => { event.preventDefault(); choose(country); }}
                onMouseEnter={() => setActive(index)}
                className={`flex min-h-11 cursor-pointer items-center gap-2.5 px-3 text-sm ${index === active ? 'bg-teal-50' : ''} ${country.code === current.code ? 'font-semibold text-navy-900' : 'text-slate-700'}`}
              >
                <Flag iso={country.iso} />
                <span className="flex-1">{country.name}</span>
                <span className="text-slate-500">{country.code}</span>
              </li>
            ))}
          </ul>
        )}
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
          className="font-data h-11 w-full min-w-0 rounded-r-lg bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>
      {error && <p id={`${id}-error`} className="mt-1 text-xs text-red-600">{error}</p>}
    </fieldset>
  );
}
