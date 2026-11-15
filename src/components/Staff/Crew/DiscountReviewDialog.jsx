import Modal from '../../ui/Modal';
import { ratePercent } from '../../../utils/discountClaim';

/**
 * Batch 75 (panel and user, 2026-11-15): the Chauffeur checks the valid ID of a passenger who claimed a discount online.
 * Approve sends the discount back to the passenger's e-wallet; Reject keeps the full fare. Nothing about the ID is kept.
 */
export default function DiscountReviewDialog({ target, busy = false, error = '', onDecide, onClose }) {
  const claim = target?.claim;
  if (!claim) return null;
  const fare = Number(claim.fare);
  const discounted = Math.round(fare * (1 - Number(claim.rate)));

  return (
    <Modal open title="Review discount" onClose={busy ? () => {} : onClose} size="sm">
      <div className="space-y-3 text-sm text-slate-700" data-testid="discount-review">
        <p className="text-base font-semibold text-slate-900">{target.passengerName || 'Passenger'}</p>
        <p>
          Claimed a <strong>{claim.label}</strong> discount ({ratePercent(claim.rate)}). Ask for a valid {claim.label} ID and check the name and photo.
        </p>
        <dl className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <dt className="text-slate-500">Paid online</dt>
          <dd className="text-right font-semibold">PHP {fare.toFixed(2)}</dd>
          <dt className="text-slate-500">Fare with discount</dt>
          <dd className="text-right font-semibold">about PHP {discounted.toFixed(2)}</dd>
        </dl>
        <p className="text-xs text-slate-500">Approve: the difference goes back to the passenger&apos;s e-wallet. Reject: the full fare stays. You can decide once.</p>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button type="button" disabled={busy} onClick={() => onDecide('reject')} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60" data-testid="discount-reject">
            No valid ID, reject
          </button>
          <button type="button" disabled={busy} onClick={() => onDecide('approve')} className="rounded-lg bg-teal-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60" data-testid="discount-approve">
            {busy ? 'Saving...' : 'ID checked, approve'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
