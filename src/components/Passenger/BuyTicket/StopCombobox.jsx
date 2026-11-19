import { useId, useMemo, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'

const norm = (text) => String(text || '').toLowerCase()

/**
 * A stop picker you can type into: the list narrows as you type (stop name or municipality) and is
 * grouped by municipality. Keyboard: arrows move, Enter picks, Escape closes. Options come from the
 * server; nothing here knows a place. `value` is the stop id (string) or ''.
 */
export default function StopCombobox({ id, label, value, groups, placeholder, disabled = false, onChange }) {
  const autoId = useId()
  const listId = `${id || autoId}-list`
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const selected = useMemo(() => {
    for (const group of groups || []) {
      const match = group.stops.find((stop) => String(stop.stop_id) === String(value))
      if (match) return match
    }
    return null
  }, [groups, value])

  // Matching stops, in group order, flattened so one index drives the keyboard.
  const { options, sections } = useMemo(() => {
    const needle = norm(query).trim()
    const flat = []
    const out = []
    for (const group of groups || []) {
      const heading = [group.municipality, group.provinces?.length ? `(${group.provinces.join(' / ')})` : ''].filter(Boolean).join(' ') || 'Other'
      const stops = group.stops.filter((stop) => !needle || norm(stop.name).includes(needle) || norm(group.municipality).includes(needle))
      if (stops.length === 0) continue
      const items = stops.map((stop) => {
        const item = { stop, index: flat.length }
        flat.push(item)
        return item
      })
      out.push({ heading, items })
    }
    return { options: flat, sections: out }
  }, [groups, query])

  const choose = (stop) => {
    onChange(String(stop.stop_id))
    setOpen(false)
    setQuery('')
  }

  const handleKeyDown = (event) => {
    if (disabled) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) { setOpen(true); return }
      setActive((i) => Math.min(options.length - 1, i + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (event.key === 'Enter' && open) {
      event.preventDefault()
      if (options[active]) choose(options[active].stop)
    } else if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
      setQuery('')
    }
  }

  const activeId = open && options[active] ? `${listId}-${options[active].stop.stop_id}` : undefined

  return (
    <div className="relative block">
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <div className={`flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 focus-within:border-navy-700 focus-within:ring-2 focus-within:ring-navy-700/30 ${disabled ? 'border-slate-200 bg-slate-50' : 'border-slate-300'}`}>
        <MapPin size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={open ? query : (selected?.name || '')}
          onFocus={() => { setOpen(true); setQuery(''); setActive(0) }}
          onBlur={() => { setOpen(false); setQuery('') }}
          onChange={(event) => { setQuery(event.target.value); setActive(0); setOpen(true) }}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-sm text-ink placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
        />
      </div>

      {open && !disabled && (
        // mousedown must not blur the input before the click lands on an option.
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          onMouseDown={(event) => event.preventDefault()}
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
        >
          {options.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">No stops match &ldquo;{query}&rdquo;.</li>}
          {sections.map((section) => (
            <li key={section.heading} role="presentation">
              <p className="px-3 pb-1 pt-2 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">{section.heading}</p>
              <ul role="presentation">
                {section.items.map(({ stop, index }) => (
                  <li
                    key={stop.stop_id}
                    id={`${listId}-${stop.stop_id}`}
                    role="option"
                    aria-selected={String(stop.stop_id) === String(value)}
                    onClick={() => choose(stop)}
                    onMouseEnter={() => setActive(index)}
                    className={`cursor-pointer px-3 py-2 text-sm ${index === active ? 'bg-navy-50 text-navy-900' : 'text-ink'} ${String(stop.stop_id) === String(value) ? 'font-semibold' : ''}`}
                  >
                    {stop.name}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
