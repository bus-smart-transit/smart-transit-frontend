import { useState } from 'react';
import Modal from '../../ui/Modal';

const peso = (value) => `PHP ${Number(value || 0).toFixed(2)}`;

/**
 * 2026-11-25 (user): the Chauffeur looks at a passenger's baggage, picks its size, takes the cash and can note the paper
 * stub's number. Payments already taken for this passenger are listed, and one taken by mistake can be taken back.
 * The prices come from the bus company (the Operator sets them).
 */
export default function BaggageChargeDialog({ target, fees = [], busy = false, error = '', onRecord, onTakeBack, onClose }) {
  const [size, setSize] = useState('');
  const [stub, setStub] = useState('');
  if (!target) return null;

  const charges = Array.isArray(target.baggage_charges) ? target.baggage_charges : [];
  const chosen = fees.find((fee) => fee.key === size) || null;
  const close = () => {
    if (busy) return;
    setSize('');
    setStub('');
    onClose();
  };
  const save = async () => {
    if (!chosen) return;
    const ok = await onRecord(chosen.key, stub.trim());
    if (ok) {
      setSize('');
      setStub('');
    }
  };

  return (
    <Modal open title="Baggage" onClose={close} size="sm">
      <div className="space-y-3 text-sm text-slate-700" data-testid="baggage-dialog">
        <div>
          <p className="text-base font-semibold text-slate-900">{target.passenger_name || 'Passenger'}</p>
          <p className="text-xs text-slate-500">
            Pick-up: {target.origin_stop || 'Not provided'}
            {target.baggage && charges.length === 0 ? ' · Said they bring baggage' : ''}
          </p>
        </div>

        {charges.length > 0 && (
          <ul className="space-y-1 rounded-lg border border-emerald-200 bg-emerald-50 p-2" data-testid="baggage-paid-list">
            {charges.map((charge) => (
              <li key={charge.baggage_charge_id} className="flex items-center justify-between gap-2">
                <span className="text-emerald-900">
                  {charge.size_label} · <span className="font-semibold">{peso(charge.amount)}</span>
                  {charge.stub_number ? ` · Stub ${charge.stub_number}` : ''}
                </span>
                <button type="button" disabled={busy} onClick={() => onTakeBack(charge.baggage_charge_id)} className="rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60">
                  Take back
                </button>
              </li>
            ))}
          </ul>
        )}

        <fieldset>
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{charges.length > 0 ? 'Add more baggage' : 'Size'}</legend>
          {fees.length === 0 ? (
            <p className="text-xs text-slate-500">Baggage prices are not loaded yet.</p>
          ) : (
            <div className="grid gap-2">
              {fees.map((fee) => (
                <label key={fee.key} className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 ${size === fee.key ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <span className="flex items-center gap-2">
                    <input type="radio" name="baggage-size" value={fee.key} checked={size === fee.key} onChange={() => setSize(fee.key)} className="h-4 w-4 accent-teal-700" data-testid={`baggage-size-${fee.key}`} />
                    <span>
                      <span className="block font-semibold text-slate-900">{fee.label}</span>
                      <span className="block text-xs text-slate-500">{fee.hint}</span>
                    </span>
                  </span>
                  <span className="font-data font-semibold text-slate-900">{peso(fee.amount)}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Stub number (optional)</span>
          <input type="text" value={stub} maxLength={30} onChange={(e) => setStub(e.target.value)} placeholder="From the paper baggage stub" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600" data-testid="baggage-stub" />
        </label>

        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button type="button" disabled={busy} onClick={close} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Done
          </button>
          <button type="button" disabled={busy || !chosen} onClick={save} className="rounded-lg bg-teal-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60" data-testid="baggage-save">
            {busy ? 'Saving...' : chosen ? `Collected ${peso(chosen.amount)}` : 'Pick a size'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
