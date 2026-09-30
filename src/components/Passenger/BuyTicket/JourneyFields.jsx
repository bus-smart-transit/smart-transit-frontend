import { addDaysToDate } from '../../../utils/bookingQuery'

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
 * Where from, where to, and which day. Options come from the server (C3): To is fetched for the
 * chosen From. The date is a Manila calendar date that cannot be in the past or beyond the booking
 * window (both come from the server); only the server decides what is bookable. Book Now / Book Later
 * is not here: it is chosen on the booking page.
 */
export default function JourneyFields({ value, originGroups, destinationGroups, loadingDestinations, today = '', maxAdvanceDays = null, onChange, idPrefix = 'journey' }) {
  const maxDate = today && maxAdvanceDays ? addDaysToDate(today, maxAdvanceDays) : undefined
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
      <label htmlFor={`${idPrefix}-date`} className="block text-xs font-semibold text-slate-600">
        Date
        <input
          id={`${idPrefix}-date`}
          type="date"
          value={value.booking_date}
          min={today || undefined}
          max={maxDate}
          disabled={!today}
          onChange={(e) => onChange('booking_date', e.target.value)}
          className={`${inputClass} mt-1.5`}
        />
      </label>
    </div>
  )
}