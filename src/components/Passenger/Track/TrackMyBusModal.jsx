import { Link, useNavigate } from 'react-router-dom';
import Modal from '../../ui/Modal';
import useTrackMyBus from '../../../api/hooks/Passenger/useTrackMyBus';

const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-slate-400 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/30';

/**
 * Batch 45 Feature C: "Track my bus" asks for the tracking code from the ticket, shows which trip it belongs to, and
 * opens the tracking page only after the passenger confirms. A lost code can be found again on /track.
 */
export default function TrackMyBusModal({ open, onClose }) {
  const navigate = useNavigate();
  const t = useTrackMyBus();
  const close = () => { t.reset(); onClose(); };
  const trip = t.view?.trip;

  return (
    <Modal open={open} onClose={close} title="Track my bus">
      {t.step === 'enter' ? (
        <form
          data-testid="track-my-bus-enter"
          onSubmit={(event) => { event.preventDefault(); void t.check(); }}
          className="space-y-3"
        >
          <label className="block text-sm font-medium text-slate-700">
            Tracking code or link from your ticket
            <input value={t.code} onChange={(e) => t.setCode(e.target.value)} placeholder="Paste the code or link" className={`${inputClass} mt-1`} />
          </label>
          {t.error && <p role="alert" className="text-sm text-red-700">{t.error}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={!t.code.trim() || t.loading} className="rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-900 disabled:cursor-not-allowed disabled:bg-slate-300">
              {t.loading ? 'Checking...' : 'Next'}
            </button>
            <Link to="/track" onClick={close} className="text-sm font-semibold text-navy-800 underline">Lost your code? Find your ticket</Link>
          </div>
        </form>
      ) : (
        <div data-testid="track-my-bus-confirm" className="space-y-3">
          <p className="text-sm text-slate-700">Is this your trip?</p>
          <dl className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Route</dt><dd className="text-right font-semibold text-slate-900">{trip?.route_name || 'Not provided'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Date</dt><dd className="text-right font-semibold text-slate-900">{trip?.trip_date || 'Not provided'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Leaves at</dt><dd className="text-right font-semibold text-slate-900">{trip?.departure_time || 'Not provided'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Your stops</dt><dd className="text-right font-semibold text-slate-900">{t.view?.boarding?.name || 'Not provided'} to {t.view?.alighting?.name || 'Not provided'}</dd></div>
          </dl>
          {t.view?.message && <p className="text-xs text-slate-500">{t.view.message}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { const token = t.token; close(); navigate(`/track/${token}`); }} className="rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-900">
              Yes, track this bus
            </button>
            <button type="button" onClick={t.back} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              No, go back
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
