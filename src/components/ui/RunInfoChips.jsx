import ServiceTypeChip from './ServiceTypeChip';
import { runPatternLabel, servedStopsText } from '../../utils/runInfo';

/**
 * Batch 28 Stage 3, item 8: the run pattern chip ("One-way run" / "Round-trip run"), the service chip (Regular,
 * Express, Express - Non-stop) and, when asked, the stops an express serves. Renders nothing for a fact the server
 * did not send, so a missing value is never invented. Built on the shared ServiceTypeChip.
 */
export default function RunInfoChips({ runPattern = null, service = null, serviceType, showStops = false, className = '' }) {
  const pattern = runPatternLabel(runPattern)
  const stops = showStops ? servedStopsText(service) : ''
  const type = service?.type ?? serviceType

  return (
    <>
      {pattern && (
        <span
          data-testid="run-pattern-chip"
          data-run-pattern={runPattern?.key}
          className={`inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800 ${className}`}
        >
          {pattern}
        </span>
      )}
      {type && <ServiceTypeChip serviceType={type} label={service?.label} className={className} />}
      {stops && <span data-testid="served-stops" className="block w-full text-xs text-slate-500">{stops}</span>}
    </>
  )
}
