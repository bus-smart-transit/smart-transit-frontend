import { useState } from 'react';

/**
 * 2026-10-27 (smarttransit_prompt.md §7): the Chauffeur's passengers by where they get off. The groups come from the
 * server (they change as tickets are sold and people get off). One button confirms a whole group got off; "Someone
 * stayed on?" lets the Chauffeur untick a passenger first (the exception path). Ticket records are never changed
 * beyond being marked off the bus.
 */
export default function DropOffGroups({ groups, passengers, disabled, disabledReason, onConfirm }) {
  const [openKey, setOpenKey] = useState(null);
  const [stayed, setStayed] = useState({});
  const [busyKey, setBusyKey] = useState(null);
  const list = Array.isArray(groups) ? groups : [];
  const nameOf = (ticketId) => (Array.isArray(passengers) ? passengers.find((p) => p.ticket_id === ticketId) : null)?.passenger_name || 'Guest';

  if (list.length === 0) return null;

  const confirm = async (group) => {
    const ids = group.ticket_ids.filter((id) => !stayed[`${group.key}:${id}`]);
    setBusyKey(group.key);
    const ok = await onConfirm(group, ids);
    setBusyKey(null);
    if (ok) {
      setOpenKey(null);
      setStayed({});
    }
  };

  return (
    <section aria-label="Drop-offs by destination" className="space-y-3" data-testid="drop-off-groups">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Getting off, by destination</h3>
      <ul className="space-y-2">
        {list.map((group) => {
          const getting = group.ticket_ids.filter((id) => !stayed[`${group.key}:${id}`]).length;
          return (
            <li key={group.key} className="rounded-xl border border-slate-200 bg-white p-3" data-testid="drop-off-group">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-base font-bold text-slate-900">{group.destination}</p>
                  <p className="text-sm text-slate-600">
                    {group.alighting_count} {group.alighting_count === 1 ? 'passenger gets' : 'passengers get'} off here
                    {group.not_boarded_count > 0 && <span className="text-slate-500"> · {group.not_boarded_count} ticket{group.not_boarded_count === 1 ? '' : 's'} not scanned yet</span>}
                  </p>
                </div>
                {group.alighting_count > 0 && (
                  <button
                    type="button"
                    onClick={() => void confirm(group)}
                    disabled={disabled || busyKey !== null || getting === 0}
                    title={disabled ? disabledReason : undefined}
                    className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyKey === group.key ? 'Saving...' : `Confirm ${getting} got off at ${group.destination}`}
                  </button>
                )}
              </div>
              {group.alighting_count > 0 && (
                <button
                  type="button"
                  onClick={() => setOpenKey(openKey === group.key ? null : group.key)}
                  className="mt-2 text-xs font-semibold text-slate-600 underline"
                  aria-expanded={openKey === group.key}
                >
                  Someone stayed on?
                </button>
              )}
              {openKey === group.key && (
                <ul className="mt-2 space-y-1" aria-label={`Passengers for ${group.destination}`}>
                  {group.ticket_ids.map((id) => (
                    <li key={id}>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={!stayed[`${group.key}:${id}`]}
                          onChange={(event) => setStayed((current) => ({ ...current, [`${group.key}:${id}`]: !event.target.checked }))}
                          className="h-4 w-4 accent-teal-700"
                        />
                        {nameOf(id)} <span className="text-xs text-slate-500">(ticket {id})</span>
                      </label>
                    </li>
                  ))}
                  <li className="text-xs text-slate-500">Untick anyone who is staying on the bus.</li>
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
