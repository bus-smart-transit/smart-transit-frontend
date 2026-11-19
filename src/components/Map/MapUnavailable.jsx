/**
 * Visible failure state for any map (Batch 25, Issue 1).
 * blocking: the basemap could not be drawn (covers the map, with Retry).
 * non-blocking: the map is usable but part of it is missing (small banner).
 */
export default function MapUnavailable({ message, onRetry, blocking = true }) {
  const retry = onRetry && (
    <button
      type="button"
      onClick={onRetry}
      className="rounded-full bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-500"
    >
      Retry
    </button>
  )

  if (!blocking) {
    return (
      <div
        role="status"
        className="absolute inset-x-3 bottom-3 z-10 flex items-center justify-between gap-3 rounded-lg bg-slate-900/90 px-3 py-2 text-xs text-slate-100"
      >
        <span>{message}</span>
        {retry}
      </div>
    )
  }

  return (
    <div
      role="alert"
      className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/80 p-4 text-center"
    >
      <div className="max-w-xs space-y-3">
        <p className="text-sm font-bold text-white">Map unavailable</p>
        <p className="text-xs text-slate-300">{message}</p>
        {retry}
      </div>
    </div>
  )
}
