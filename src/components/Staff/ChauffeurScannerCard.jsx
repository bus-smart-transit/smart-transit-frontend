import { Camera, CheckCircle2, QrCode } from 'lucide-react';

const PHASE_CHIP = {
  idle: { label: 'Ready', css: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  captured: { label: 'QR captured', css: 'border-sky-200 bg-sky-50 text-sky-700' },
  validating: { label: 'Checking', css: 'border-sky-200 bg-sky-50 text-sky-700' },
  success: { label: 'Boarded', css: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  failed: { label: 'Not boarded', css: 'border-red-200 bg-red-50 text-red-700' },
};

/**
 * Batch 51 item 9 (user's design, 2026-11-09): the Chauffeur's "Digital Fare / QR Scanner" card on Ticketing & Fares,
 * in place of the capacity card. The camera view sits inside a frame; under it the Ticket ID box boards a passenger who
 * cannot show the QR (Batch 51 item 8). Renders only; the scanning and checks stay in useConductorDashboard.
 */
export default function ChauffeurScannerCard({
  videoRef,
  scannerRunning,
  scannerBusy,
  scannerPhase = 'idle',
  scannerStatus,
  scannerError,
  canScan,
  blockedReason = '',
  onStart,
  onStop,
  ticketCode,
  onTicketCodeChange,
  onBoardByCode,
  scanResult,
  groupScanResult,
}) {
  const chip = PHASE_CHIP[scannerPhase] ?? PHASE_CHIP.idle;
  const corner = 'absolute h-5 w-5 rounded-md border-2 border-teal-600 bg-white/70';

  return (
    <article className="staff-card" data-testid="scanner-card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Digital Fare / QR Scanner</h3>
          <p className="text-xs text-slate-500">Align the QR code within the frame. Scans are logged automatically.</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${chip.css}`} data-testid="scanner-chip">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> {chip.label}
        </span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl border-2 border-teal-600 bg-slate-100">
          <video ref={videoRef} className={`h-full w-full object-cover ${scannerRunning ? '' : 'invisible'}`} muted playsInline autoPlay />
          {!scannerRunning && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
              <QrCode className="h-28 w-28" aria-hidden="true" />
            </div>
          )}
          <span className={`${corner} left-2 top-2`} aria-hidden="true" />
          <span className={`${corner} right-2 top-2`} aria-hidden="true" />
          <span className={`${corner} bottom-2 left-2`} aria-hidden="true" />
          <span className={`${corner} bottom-2 right-2`} aria-hidden="true" />
          <span className="absolute inset-x-0 top-1/2 h-0.5 bg-teal-600" aria-hidden="true" />
          {scannerBusy && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/70">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-sky-300" />
              <p className="text-xs font-semibold text-sky-200">Checking...</p>
            </div>
          )}
        </div>
        <p className="mt-2 text-center text-xs text-slate-500">Place the QR code inside the frame</p>

        <div className="mt-3 flex justify-center">
          {!scannerRunning ? (
            <button type="button" onClick={onStart} disabled={!canScan} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">
              <Camera className="h-4 w-4" aria-hidden="true" /> Start camera
            </button>
          ) : (
            <button type="button" onClick={onStop} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-700 hover:bg-amber-100">
              <Camera className="h-4 w-4" aria-hidden="true" /> Stop camera
            </button>
          )}
        </div>
        {!canScan && blockedReason && <p className="mt-2 text-center text-xs text-amber-700">{blockedReason}</p>}
        {scannerStatus && <p className="mt-2 text-center text-xs text-slate-500">{scannerStatus}</p>}
        {scannerError && <p className="mt-2 text-center text-xs text-red-600">{scannerError}</p>}
      </div>

      <form className="mt-3" onSubmit={(event) => { event.preventDefault(); onBoardByCode(); }}>
        <label htmlFor="chauffeur-ticket-id" className="block text-xs font-semibold text-slate-600">No QR? Type the Ticket ID</label>
        <div className="mt-1 flex gap-2">
          <input
            id="chauffeur-ticket-id"
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            placeholder="Ticket ID, e.g. 3F9A12BC"
            value={ticketCode}
            onChange={(event) => onTicketCodeChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-data text-sm uppercase tracking-widest text-slate-900 outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-teal-500"
          />
          <button type="submit" disabled={scannerBusy || !canScan} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50">
            <QrCode className="h-4 w-4" aria-hidden="true" /> Board
          </button>
        </div>
      </form>

      {scanResult && (
        <p role="status" data-testid="scan-result" className={`mt-3 rounded-xl border px-4 py-3 text-sm font-semibold ${scanResult.success ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {scanResult.msg}
        </p>
      )}
      {groupScanResult && (
        <div role="status" className={`mt-3 rounded-xl border px-4 py-3 text-sm ${groupScanResult.success && groupScanResult.info ? 'border-sky-200 bg-sky-50 text-sky-700' : groupScanResult.success ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          <p className="font-semibold">{groupScanResult.msg || 'Group scan processed.'}</p>
          {groupScanResult.success && (
            <p className="mt-1 text-xs">Boarded {groupScanResult?.data?.boarded_count ?? 0} of {groupScanResult?.data?.total_tickets ?? 0} ticket(s).</p>
          )}
        </div>
      )}
    </article>
  );
}
