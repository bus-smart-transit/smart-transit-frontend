import ViewTabs from '../../ui/ViewTabs';
import FinancialsPage from '../Financials/FinancialsPage';
import RemittancesPage from '../Remittances/RemittancesPage';

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
          : <FinancialsPage service={service} view={active} embedded />}
      </div>
    </div>
  );
}
