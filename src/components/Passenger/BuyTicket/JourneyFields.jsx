import { CalendarDays } from 'lucide-react'
import { addDaysToDate } from '../../../utils/bookingQuery'
import StopCombobox from './StopCombobox'

/**
 * Where from, where to, and which day, with an optional action (the Search button) beside the date.
 * From and To are type-ahead pickers fed by the server (C3): To is fetched for the chosen From. The
 * date is a Manila calendar date that cannot be in the past or beyond the booking window (both come
 * from the server); only the server decides what is bookable. Book Now / Book Later is not here: it
 * is chosen on the booking page.
 */
export default function JourneyFields({ value, originGroups, destinationGroups, loadingDestinations, today = '', maxAdvanceDays = null, onChange, action = null, idPrefix = 'journey' }) {
  const maxDate = today && maxAdvanceDays ? addDaysToDate(today, maxAdvanceDays) : undefined
  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${action ? 'lg:grid-cols-[1fr_1fr_auto_auto]' : 'lg:grid-cols-3'} lg:items-end`}>
      <StopCombobox
        id={`${idPrefix}-from`}
        label="From"
        value={value.origin_stop_id}
        groups={originGroups}
        placeholder="Search where you board"
        onChange={(next) => onChange('origin_stop_id', next)}
      />
      <StopCombobox
        id={`${idPrefix}-to`}
        label="To"
        value={value.destination_stop_id}
        groups={destinationGroups}
        disabled={!value.origin_stop_id || loadingDestinations}
        placeholder={value.origin_stop_id ? (loadingDestinations ? 'Loading destinations...' : 'Search where you get off') : 'Choose where you board first'}
        onChange={(next) => onChange('destination_stop_id', next)}
      />
      <div>
        <label htmlFor={`${idPrefix}-date`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Date</label>
        <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus-within:border-navy-700 focus-within:ring-2 focus-within:ring-navy-700/30">
          <CalendarDays size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
          <input
            id={`${idPrefix}-date`}
            type="date"
            value={value.booking_date}
            min={today || undefined}
            max={maxDate}
            disabled={!today}
            onChange={(e) => onChange('booking_date', e.target.value)}
            className="w-full bg-transparent text-sm text-ink focus:outline-none"
          />
        </div>
      </div>
      {action}
    </div>
  )
}
