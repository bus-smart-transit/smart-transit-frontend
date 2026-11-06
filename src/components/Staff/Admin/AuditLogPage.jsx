import { OpPageHeader, OpCard, OpTable } from '../Operator/OperatorUI';
import { OP_SPACE } from '../Operator/operatorUiTokens';
import SearchBar from '../../ui/SearchBar';
import Pagination from '../../ui/Pagination';
import { formatManilaDateTime } from '../../../utils/dates';
import { detailText } from '../../../utils/auditDetails';

const FIELD = 'min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-500';

/**
 * Batch 48 Phase 4: the Super Admin's Audit log. Who did what, to what, and when; filter by action, role and dates;
 * 25 a page. Read only.
 */
export default function AuditLogPage({ auditTab }) {
  const log = auditTab;

  const columns = [
    { key: 'at', header: 'When', className: 'whitespace-nowrap', render: (row) => <span className="font-data text-xs">{formatManilaDateTime(row.at)}</span> },
    {
      key: 'who',
      header: 'Who',
      render: (row) => (
        <span className="text-sm">
          {row.who?.name || row.who?.username || 'Not provided'}
          <span className="block text-xs text-slate-500">{row.who?.role_label}</span>
        </span>
      ),
    },
    { key: 'action', header: 'Action', render: (row) => <code className="text-xs text-slate-800">{row.action}</code> },
    { key: 'subject', header: 'Item', render: (row) => row.subject || <span className="text-slate-400">-</span> },
    { key: 'details', header: 'Details', render: (row) => <span className="break-all text-xs text-slate-600">{detailText(row.details) || '-'}</span> },
  ];

  return (
    <div className={OP_SPACE.stack}>
      <OpPageHeader title="Audit log" subtitle="Changes and sign-in events recorded by SmartTransit, newest first." />
      <OpCard title="Entries">
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_10rem_10rem]">
            <SearchBar value={log.actionText} onChange={log.setActionText} placeholder="Search actions, for example fare or stop" />
            <label className="sr-only" htmlFor="audit-role">Role</label>
            <select id="audit-role" value={log.role} onChange={(event) => log.setRole(event.target.value)} className={FIELD}>
              <option value="">All roles</option>
              <option value="admin">Super Admin</option>
              <option value="operator">Operator</option>
              <option value="driver">Driver</option>
              <option value="conductor">Chauffeur</option>
              <option value="passenger">Passenger</option>
              <option value="system">System</option>
            </select>
            <label className="text-xs text-slate-600">From<input type="date" value={log.from} max={log.to || undefined} onChange={(event) => log.setFrom(event.target.value)} className={`${FIELD} mt-1 w-full`} /></label>
            <label className="text-xs text-slate-600">To<input type="date" value={log.to} min={log.from || undefined} onChange={(event) => log.setTo(event.target.value)} className={`${FIELD} mt-1 w-full`} /></label>
          </div>
          {log.error && <p role="alert" className="text-sm text-rose-700">{log.error}</p>}
          {log.loading && log.entries.length === 0
            ? <p role="status" className="text-sm text-slate-500">Loading...</p>
            : <OpTable caption="Audit log" columns={columns} rows={log.entries} rowKey={(row) => row.audit_id} empty="No entries match these filters." />}
          {log.pagination.total > 0 && (
            <Pagination label="Audit log pages" page={log.pagination.page} perPage={log.pagination.per_page} total={log.pagination.total} lastPage={log.pagination.last_page} onPageChange={log.setPage} />
          )}
        </div>
      </OpCard>
    </div>
  );
}
