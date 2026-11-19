import { useState } from 'react';
import { Power, ShieldCheck } from 'lucide-react';
import { OpPageHeader, OpCard, OpChip, OpTable } from '../Operator/OperatorUI';
import { OP_SPACE } from '../Operator/operatorUiTokens';
import SearchBar from '../../ui/SearchBar';
import Pagination from '../../ui/Pagination';
import { adminErrorText } from '../../../api/hooks/Staff/useSuperAdmin';

import { SkeletonTable } from '../../ui/Skeleton';
const BUTTON = 'inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold';

function StatusChip({ user }) {
  if (user.deletion === 'erased') return <OpChip tone="neutral">Erased</OpChip>;
  if (user.deactivated) return <OpChip tone="danger">Turned off</OpChip>;
  if (user.deletion === 'requested') return <OpChip tone="warning">Deletion requested</OpChip>;
  return <OpChip tone="success">Active</OpChip>;
}

/**
 * Batch 48 Phase 3: the Super Admin's Users page. Every account; search, role filter, pages. Turn an account off or
 * on (never deleted), and give or take Company Admin for a company's Operator. Each change is asked first.
 */
export default function UsersPage({ usersTab }) {
  const users = usersTab;
  const [notice, setNotice] = useState({ text: '', failed: false });

  const act = async (question, call, done) => {
    if (!window.confirm(question)) return;
    try {
      await call();
      setNotice({ text: done, failed: false });
    } catch (err) {
      setNotice({ text: adminErrorText(err, 'Could not save. Please try again.'), failed: true });
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Account',
      render: (row) => (
        <span className="font-semibold text-slate-900">
          {row.name || 'Not provided'}
          <span className="block text-xs font-normal text-slate-500">{row.username || 'Not provided'}</span>
        </span>
      ),
    },
    { key: 'role', header: 'Role', render: (row) => <OpChip tone="info">{row.role_label}</OpChip> },
    { key: 'company', header: 'Company', render: (row) => row.company_name || <span className="text-slate-400">-</span> },
    { key: 'email', header: 'Email', render: (row) => <span className="break-all">{row.email || 'Not provided'}</span> },
    { key: 'status', header: 'Status', render: (row) => <StatusChip user={row} /> },
    {
      key: 'actions',
      header: '',
      render: (row) => (row.is_you ? <span className="text-xs text-slate-500">You</span> : row.deletion === 'erased' ? null : (
        <span className="inline-flex flex-wrap gap-2">
          <button
            type="button"
            aria-label={row.deactivated ? `Turn on ${row.name || row.username}` : `Turn off ${row.name || row.username}`}
            onClick={() => (row.deactivated
              ? act(`Turn on ${row.name || row.username}? They can sign in again.`, () => users.reactivate(row.user_id), 'Account turned on again.')
              : act(`Turn off ${row.name || row.username}? They can no longer sign in. You can turn it on again later.`, () => users.deactivate(row.user_id), 'Account turned off.'))}
            className={`${BUTTON} ${row.deactivated ? 'border-teal-200 text-teal-700 hover:bg-teal-50' : 'border-rose-200 text-rose-700 hover:bg-rose-50'}`}
          >
            <Power className="h-3.5 w-3.5" aria-hidden="true" /> {row.deactivated ? 'Turn on' : 'Turn off'}
          </button>
          {row.role === 'operator' && row.company_name && (
            <button
              type="button"
              onClick={() => (row.is_company_admin
                ? act(`Remove Company Admin from ${row.name}? They stay an Operator.`, () => users.setCompanyAdmin(row.user_id, false), 'They are no longer a Company Admin.')
                : act(`Make ${row.name} a Company Admin of ${row.company_name}?`, () => users.setCompanyAdmin(row.user_id, true), 'They are now a Company Admin.'))}
              className={`${BUTTON} border-slate-200 text-slate-700 hover:bg-slate-50`}
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> {row.is_company_admin ? 'Remove Company Admin' : 'Make Company Admin'}
            </button>
          )}
        </span>
      )),
    },
  ];

  return (
    <div className={OP_SPACE.stack}>
      <OpPageHeader title="Users" subtitle="Every account on SmartTransit. Turning one off blocks sign-in; nothing is deleted." />
      <OpCard title="Accounts">
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchBar value={users.search} onChange={users.setSearch} placeholder="Search by name, username or email" className="flex-1" />
            <label className="sr-only" htmlFor="admin-user-role">Role</label>
            <select id="admin-user-role" value={users.role} onChange={(event) => users.setRole(event.target.value)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">All roles</option>
              <option value="passenger">Passenger</option>
              <option value="driver">Driver</option>
              <option value="conductor">Chauffeur</option>
              <option value="operator">Operator</option>
              <option value="admin">Super Admin</option>
            </select>
          </div>
          {notice.text && <p role={notice.failed ? 'alert' : 'status'} className={`rounded-lg border px-4 py-2 text-sm ${notice.failed ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-teal-200 bg-teal-50 text-teal-800'}`}>{notice.text}</p>}
          {users.error && <p role="alert" className="text-sm text-rose-700">{users.error}</p>}
          {users.loading && users.users.length === 0
            ? <SkeletonTable label="Loading..." cols={5} />
            : <OpTable caption="Accounts" columns={columns} rows={users.users} rowKey={(row) => row.user_id} empty="No accounts match your search." />}
          {users.pagination.total > 0 && (
            <Pagination label="Account pages" page={users.pagination.page} perPage={users.pagination.per_page} total={users.pagination.total} lastPage={users.pagination.last_page} onPageChange={users.setPage} />
          )}
        </div>
      </OpCard>
    </div>
  );
}
