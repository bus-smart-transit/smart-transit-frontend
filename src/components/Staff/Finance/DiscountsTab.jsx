import { useEffect, useState } from 'react';
import { CheckCircle2, Hourglass, Percent, Undo2 } from 'lucide-react';
import Card from '../../ui/Card';
import { BarList } from '../Financials/FinancialCharts';
import { PRESETS, formatCount, formatPeso, presetRange } from '../../../utils/financials';
import { getBusinessToday } from '../../../utils/dates';
import { SkeletonList } from '../../ui/Skeleton';

const FIELD = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500';
const ICON_TILE = 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700';

const STATUS = {
  claimed: { label: 'Waiting for the Chauffeur', className: 'bg-amber-50 text-amber-800 ring-amber-200' },
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  rejected: { label: 'Not approved', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
  lapsed: { label: 'Not checked (trip ended)', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
};
const REFUND = { pending: 'Refund on its way', succeeded: 'Refunded', failed: 'Refund failed, being retried' };

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <Card padding="sm" className="min-w-0 p-4!">
      <div className="flex items-start gap-3">
        <span className={ICON_TILE} aria-hidden="true"><Icon className="h-5 w-5" /></span>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-slate-500">{label}</p>
          <p className="mt-1 font-display text-xl font-bold tabular-nums text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
      </div>
    </Card>
  );
}

/**
 * Batch 81 (user, 2026-11-19): Finance > Discounts. For a date range: the onsite discounts given on cash tickets (by type,
 * from the financial report), the online discount claims (Batch 75: claimed when booking, checked by the Chauffeur, the
 * difference refunded) with their outcome, and the onsite discount on/off settings (`settings`, kept from Batch 61).
 * Every figure is the server's.
 */
export default function DiscountsTab({ service, settings = null }) {
  const today = getBusinessToday();
  const [range, setRange] = useState({ from: today, to: today });
  const [state, setState] = useState({ key: null, summary: null, claims: null, error: '' });
  const key = `${range.from}|${range.to}`;

  useEffect(() => {
    let cancelled = false;
    const params = { from: range.from, to: range.to };
    Promise.all([
      service.getFinancials(params),
      typeof service.getFinancialDiscountClaims === 'function' ? service.getFinancialDiscountClaims(params) : Promise.resolve({ data: null }),
    ])
      .then(([summary, claims]) => { if (!cancelled) setState({ key, summary: summary?.data ?? null, claims: claims?.data ?? null, error: '' }); })
      .catch((err) => { if (!cancelled) setState({ key, summary: null, claims: null, error: err?.message || 'The discounts could not be loaded.' }); });
    return () => { cancelled = true; };
  }, [key, range.from, range.to, service]);

  const loading = state.key !== key;
  const onsite = state.summary?.discounts;
  const claims = state.claims;
  const totals = claims?.totals;

  return (
    <div className="space-y-4" data-testid="discounts-tab">
      <Card as="section" aria-label="Discount date range" className="space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Quick date ranges">
          {PRESETS.map((preset) => (
            <button key={preset.key} type="button" onClick={() => setRange(presetRange(preset.key, getBusinessToday()))} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              {preset.label}
            </button>
          ))}
        </div>
        <div className="grid max-w-md grid-cols-2 gap-3">
          <label className="text-xs font-medium text-slate-600">From
            <input type="date" value={range.from} max={range.to} onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))} className={`${FIELD} mt-1`} />
          </label>
          <label className="text-xs font-medium text-slate-600">To
            <input type="date" value={range.to} min={range.from} onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))} className={`${FIELD} mt-1`} />
          </label>
        </div>
      </Card>

      {state.error && state.key === key && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {loading ? <SkeletonList label="Loading the discounts..." rows={4} /> : !state.error && (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Stat icon={Percent} label="Onsite discounts given" value={formatPeso(onsite?.total ?? 0)} hint={`${formatCount(onsite?.tickets ?? 0)} cash tickets`} />
            <Stat icon={CheckCircle2} label="Online claims approved" value={totals ? formatCount(totals.approved) : 'Not provided'} hint={totals ? `of ${formatCount(totals.claims)} claims` : null} />
            <Stat icon={Undo2} label="Refunded to e-wallets" value={totals ? formatPeso(totals.refunded) : 'Not provided'} hint="The discount of approved online claims" />
            <Stat icon={Hourglass} label="Refunds on their way" value={totals ? formatPeso(totals.refund_pending) : 'Not provided'} hint={totals ? `${formatCount(totals.claimed)} ${Number(totals.claimed) === 1 ? 'claim' : 'claims'} still waiting for a check` : null} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <Card as="section" aria-label="Onsite discounts by type" className="min-w-0 space-y-3">
              <div>
                <h3 className="font-display text-[1.0625rem] font-semibold text-slate-900">Onsite discounts by type</h3>
                <p className="mt-0.5 text-[13px] text-slate-500">Given on cash tickets after the Chauffeur checked the ID.</p>
              </div>
              {(onsite?.by_type ?? []).length === 0
                ? <p className="text-sm text-slate-500">No onsite discounts were given in this range.</p>
                : <BarList rows={onsite.by_type.map((d) => ({ key: d.type_key, label: d.label, value: d.amount, sublabel: `${formatCount(d.tickets)} ticket${d.tickets === 1 ? '' : 's'} · ${Math.round(Number(d.rate) * 100)}%` }))} />}
            </Card>

            <Card as="section" aria-label="Online discount claims" className="min-w-0 space-y-3">
              <div>
                <h3 className="font-display text-[1.0625rem] font-semibold text-slate-900">Online discount claims</h3>
                <p className="mt-0.5 text-[13px] text-slate-500">Claimed when booking online; the Chauffeur checks the ID and the difference goes back to the e-wallet.</p>
              </div>
              {(claims?.rows ?? []).length === 0 ? <p className="text-sm text-slate-500">No online discount claims in this range.</p> : (
                <div className="-mx-1 overflow-x-auto">
                  <table className="w-full min-w-[34rem] text-left text-sm" data-testid="discount-claims">
                    <caption className="sr-only">Online discount claims</caption>
                    <thead className="text-xs text-slate-500">
                      <tr>
                        <th scope="col" className="px-1 py-2 font-medium">Trip</th>
                        <th scope="col" className="px-1 py-2 font-medium">Discount</th>
                        <th scope="col" className="px-1 py-2 font-medium">Outcome</th>
                        <th scope="col" className="px-1 py-2 text-right font-medium">Given back</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {claims.rows.map((row) => {
                        const status = STATUS[row.status] ?? STATUS.claimed;
                        return (
                          <tr key={row.id}>
                            <td className="px-1 py-2.5">
                              <span className="block font-semibold text-slate-900">{row.route_name || 'Route not provided'}</span>
                              <span className="block text-xs text-slate-500">{row.trip_date} {row.departure_time} · Ticket {row.ticket_code}</span>
                            </td>
                            <td className="px-1 py-2.5 text-slate-700">{row.label} ({Math.round(Number(row.rate) * 100)}%)</td>
                            <td className="px-1 py-2.5">
                              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${status.className}`}>{status.label}</span>
                              {row.refund_status && <span className="mt-0.5 block text-xs text-slate-500">{REFUND[row.refund_status] ?? row.refund_status}</span>}
                            </td>
                            <td className="px-1 py-2.5 text-right font-semibold tabular-nums text-slate-900">{row.refund_amount !== null ? formatPeso(row.refund_amount) : '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {settings}
    </div>
  );
}
