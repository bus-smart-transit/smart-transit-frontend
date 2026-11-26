import { AlertTriangle, CheckCircle2, Info, Luggage, MapPin, Users, XCircle } from 'lucide-react';
import Modal from '../../ui/Modal';
import { baggageLine, baggageTarget, baggageToCollect, pieces } from '../../../utils/scanResult';

function Line({ icon: Icon, label, children, testId }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 py-2 last:border-b-0">
      {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" aria-hidden="true" />}
      <dt className="w-28 shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="min-w-0 text-base font-semibold text-slate-900" data-testid={testId}>{children}</dd>
    </div>
  );
}

function Header({ tone, title, subtitle }) {
  const Icon = tone === 'ok' ? CheckCircle2 : tone === 'info' ? Info : XCircle;
  const color = tone === 'ok' ? 'text-emerald-600' : tone === 'info' ? 'text-sky-600' : 'text-red-600';
  return (
    <div className="flex flex-col items-center text-center">
      <Icon className={`h-14 w-14 ${color}`} aria-hidden="true" />
      <p className="mt-2 text-2xl font-bold text-slate-900" data-testid="scan-dialog-title">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
    </div>
  );
}

/**
 * 2026-11-26 (user): after a scan, the Chauffeur sees who was boarded and what to do: where they get off, a priority
 * seat, and baggage to collect (with its pieces, "2x baggage"). A group QR shows GROUP TICKET, "(n)x tickets" and each
 * passenger. A refused scan shows why, in red. Scanning already boards the ticket, so there is no confirm step: "Scan
 * next" (or the close button) closes it and the camera reads the next ticket.
 */
export default function ScanResultDialog({ scanResult, groupScanResult, onClose, onCollectBaggage }) {
  const result = groupScanResult || scanResult;
  if (!result) return null;
  const isGroup = Boolean(groupScanResult);

  const footer = (extra = null) => (
    <div className="mt-4 grid gap-2">
      {extra}
      <button type="button" onClick={onClose} className="min-h-12 rounded-xl bg-teal-600 px-4 text-base font-bold text-white hover:bg-teal-700" data-testid="scan-next">
        Scan next ticket
      </button>
    </div>
  );

  // Refused (or not checked): the reason, in red.
  if (!result.success) {
    return (
      <Modal open title="Scan result" onClose={onClose} size="sm">
        <div data-testid="scan-dialog" data-outcome="refused">
          <Header tone="bad" title="Not boarded" />
          <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-700">{result.msg || 'This ticket cannot be boarded.'}</p>
          {footer()}
        </div>
      </Modal>
    );
  }

  if (!isGroup) {
    const t = result.data || {};
    const claim = t.discount_claim;
    return (
      <Modal open title="Scan result" onClose={onClose} size="sm">
        <div data-testid="scan-dialog" data-outcome="boarded">
          <Header tone="ok" title="Boarded" subtitle={t.passenger_name && t.passenger_name !== 'Guest' ? t.passenger_name : 'Passenger'} />
          <dl className="mt-4 rounded-xl border border-slate-200 px-3">
            <Line icon={MapPin} label="Gets off at" testId="scan-destination">{t.destination || 'Not provided'}</Line>
            <Line label="Priority seat" testId="scan-priority">{t.priority_label || 'No'}</Line>
            <Line icon={Luggage} label="Baggage" testId="scan-baggage">{baggageLine(t)}</Line>
            {claim && <Line label="Discount" testId="scan-discount">{claim.label || 'Claimed'}{claim.status === 'claimed' ? ', check the ID' : ''}</Line>}
          </dl>
          {footer(baggageToCollect(t) && onCollectBaggage ? (
            <button type="button" onClick={() => onCollectBaggage(baggageTarget(t))} className="min-h-12 rounded-xl bg-amber-500 px-4 text-base font-bold text-white hover:bg-amber-600" data-testid="scan-collect-baggage">
              Collect baggage
            </button>
          ) : null)}
        </div>
      </Modal>
    );
  }

  // Group ticket.
  const data = result.data || {};
  const rows = Array.isArray(data.tickets) ? data.tickets : [];
  const total = Number(data.total_tickets) || rows.length;
  const boarded = rows.filter((row) => !row.skipped);
  const destinations = [...new Set(rows.map((row) => row.destination).filter(Boolean))];
  const priorityCount = boarded.filter((row) => row.priority_label).length;
  const withBaggage = boarded.filter((row) => pieces(row) > 0);
  const totalPieces = withBaggage.reduce((sum, row) => sum + pieces(row), 0);

  return (
    <Modal open title="Scan result" onClose={onClose} size="sm">
      <div data-testid="scan-dialog" data-outcome={result.info ? 'info' : 'group'}>
        <div className="flex items-center gap-3 rounded-xl bg-teal-50 px-4 py-3">
          <Users className="h-10 w-10 shrink-0 text-teal-700" aria-hidden="true" />
          <div>
            <p className="text-2xl font-extrabold tracking-wide text-slate-900">GROUP TICKET</p>
            <p className="text-lg font-bold text-teal-800" data-testid="scan-group-count">{total}x tickets</p>
          </div>
        </div>
        {result.info ? (
          <p role="status" className="mt-3 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{result.msg}
          </p>
        ) : (
          <>
            <p className={`mt-3 text-center text-base font-bold ${boarded.length === total ? 'text-emerald-700' : 'text-amber-700'}`} data-testid="scan-group-boarded">
              {boarded.length} of {total} boarded
            </p>
            <dl className="mt-2 rounded-xl border border-slate-200 px-3">
              <Line icon={MapPin} label="Gets off at">{destinations.length === 1 ? destinations[0] : destinations.length > 1 ? destinations.join(', ') : 'Not provided'}</Line>
              <Line label="Priority seat" testId="scan-group-priority">{priorityCount > 0 ? `${priorityCount} of ${boarded.length}` : 'No'}</Line>
              <Line icon={Luggage} label="Baggage" testId="scan-group-baggage">{withBaggage.length > 0 ? `${withBaggage.length} with baggage (${totalPieces}x)` : 'None'}</Line>
            </dl>
          </>
        )}
        <ul className="mt-3 space-y-2" aria-label="Passengers in this group">
          {rows.map((row, index) => (
            <li key={row.ticket_id ?? row.ticket_uuid ?? index} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm" data-testid="scan-group-row">
              <span className="font-semibold text-slate-900">{row.passenger_name && row.passenger_name !== 'Guest' ? row.passenger_name : `Passenger ${index + 1}`}</span>
              {row.skipped ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-red-700"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />{row.skip_reason || 'Not boarded'}</span>
              ) : (
                <>
                  {row.priority_label && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">Priority: {row.priority_label}</span>}
                  {pieces(row) > 0 && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${baggageToCollect(row) ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'}`}>{baggageLine(row)}</span>}
                  {baggageToCollect(row) && onCollectBaggage && (
                    <button type="button" onClick={() => onCollectBaggage(baggageTarget(row))} className="ml-auto rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-600" data-testid={`scan-group-collect-${row.ticket_id}`}>
                      Collect
                    </button>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
        {footer()}
      </div>
    </Modal>
  );
}
