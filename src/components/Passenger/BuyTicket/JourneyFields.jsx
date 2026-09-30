import { getBusinessToday } from '../../../utils/dates'

const inputClass = 'min-h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/30'

function StopSelect({ id, label, value, groups, placeholder, disabled, onChange }) {
  return (
    <label htmlFor={id} className="block text-xs font-semibold text-slate-600">
      {label}
      <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={`${inputClass} mt-1.5`}>
        <option value="">{placeholder}</option>
        {groups.map((group) => (
          <optgroup
            key={group.municipality || 'other'}
            label={[group.municipality, group.provinces?.length ? `(${group.provinces.join(' / ')})` : ''].filter(Boolean).join(' ') || 'Other'}
          >
            {group.stops.map((stop) => (
              <option key={stop.stop_id} value={stop.stop_id}>{stop.name}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}

/**
 * Where from, where to, and when. Options come from the server (C3); Book Now
 * needs no date, Book Later needs a future Manila date and time. Only the
 * server decides what is bookable; the date input just stops past dates.
 */
export default function JourneyFields({ value, originGroups, destinationGroups, loadingDestinations, onChange, idPrefix = 'journey' }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <StopSelect
        id={`${idPrefix}-from`}
        label="From"
        value={value.origin_stop_id}
        groups={originGroups}
        placeholder="Choose where you board"
        onChange={(next) => onChange('origin_stop_id', next)}
      />
      <StopSelect
        id={`${idPrefix}-to`}
        label="To"
        value={value.destination_stop_id}
        groups={destinationGroups}
        disabled={!value.origin_stop_id || loadingDestinations}
        placeholder={value.origin_stop_id ? (loadingDestinations ? 'Loading destinations...' : 'Choose where you get off') : 'Choose where you board first'}
        onChange={(next) => onChange('destination_stop_id', next)}
      />

      <fieldset className="sm:col-span-2">
        <legend className="mb-1.5 text-xs font-semibold text-slate-600">When</legend>
        <div className="flex flex-wrap items-center gap-2">
          {[['now', 'Book Now'], ['later', 'Book Later']].map(([option, label]) => (
            <label key={option} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-navy-900">
              <input
                type="radio"
                name={`${idPrefix}-booking-option`}
                value={option}
                checked={value.booking_option === option}
                onChange={() => onChange('booking_option', option)}
              />
              <span>{label}</span>
            </label>
          ))}
          {value.booking_option === 'later' && (
            <>
              <input
                type="date"
                aria-label="Travel date"
                value={value.booking_date}
                min={getBusinessToday()}
                onChange={(e) => onChange('booking_date', e.target.value)}
                className={`${inputClass} w-auto`}
              />
              <input
                type="time"
                aria-label="Earliest departure time"
                value={value.booking_time}
                onChange={(e) => onChange('booking_time', e.target.value)}
                className={`${inputClass} w-auto`}
              />
            </>
          )}
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          {value.booking_option === 'later'
            ? 'We will find the earliest departure on or after this date and time (Manila time).'
            : 'We will find the next departure from now.'}
        </p>
      </fieldset>
    </div>
  )
}
