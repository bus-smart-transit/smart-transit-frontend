import { useEffect, useState } from 'react';
import ViewTabs from '../../ui/ViewTabs';
import FinancialsPage from '../Financials/FinancialsPage';
import RemittancesPage from '../Remittances/RemittancesPage';
import PaymentRefundsPage from '../Refunds/PaymentRefundsPage';

function DiscountTypesPanel({ service }) {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(() => typeof service?.getDiscountTypes === 'function');
  const [savingKey, setSavingKey] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof service?.getDiscountTypes !== 'function') return undefined;
    let active = true;
    service.getDiscountTypes()
      .then((response) => { if (active) setTypes(Array.isArray(response?.data) ? response.data : []); })
      .catch((err) => { if (active) setError(err?.message || 'Discount settings could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [service]);

  const toggle = async (type) => {
    setSavingKey(type.key);
    setError('');
    try {
      const response = await service.setDiscountTypeActive(type.key, !type.active);
      const updated = response?.data ?? response;
      setTypes((current) => current.map((item) => item.key === type.key ? updated : item));
    } catch (err) {
      setError(err?.message || 'Discount setting could not be changed.');
    } finally {
      setSavingKey('');
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4" aria-label="Onsite discounts">
      <div className="mb-3">
        <h3 className="text-base font-bold text-slate-900">Onsite discount eligibility</h3>
        <p className="text-xs text-slate-500">Controls which ID-verified discounts Chauffeurs may apply to cash tickets. Online fares use rewards.</p>
      </div>
      {error && <p role="alert" className="mb-2 text-sm text-red-700">{error}</p>}
      {loading ? <p className="text-sm text-slate-500">Loading discount settings...</p>
        : types.length === 0 ? <p className="text-sm text-slate-500">No discount types are configured.</p>
          : <ul className="divide-y divide-slate-100">
            {types.map((type) => (
              <li key={type.key} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{type.label}</p>
                  <p className="text-xs text-slate-500">{Math.round(Number(type.rate) * 100)}% · Onsite cash only</p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={Boolean(type.active)} disabled={savingKey === type.key || typeof service?.setDiscountTypeActive !== 'function'} onChange={() => void toggle(type)} className="h-4 w-4 accent-teal-700" />
                  {savingKey === type.key ? 'Saving...' : type.active ? 'Active' : 'Inactive'}
                </label>
              </li>
            ))}
          </ul>}
    </section>
  );
}

/**
 * Batch 30: the Finance page. One heading and the tabs the role may see: Overview and Transactions (the Financials
 * page, same filters for both) and Remittances (the cash handed over after each Chauffeur shift). Reports is not
 * here: it holds fleet reports and the forecast, which are not financial, so it stays its own sidebar item.
 */
export default function FinancePage({ views, view, onViewChange, service }) {
  if (!views.length) return null;
  const active = views.some((v) => v.key === view) ? view : views[0].key;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Finance</h2>
      <ViewTabs label="Finance views" tabs={views} value={active} onChange={onViewChange} />
      <div role="tabpanel" aria-label={views.find((v) => v.key === active)?.label}>
        {active === 'remittances'
          ? <RemittancesPage service={service} embedded />
          : active === 'refunds'
            ? <PaymentRefundsPage service={service} embedded />
            : <FinancialsPage service={service} view={active} embedded />}
      </div>
      {active === 'overview' && <DiscountTypesPanel service={service} />}
    </div>
  );
}
