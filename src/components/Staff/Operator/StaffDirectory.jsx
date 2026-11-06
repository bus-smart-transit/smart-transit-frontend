import { useState } from 'react';
import { Loader2, Pencil, Plus, Power, RefreshCw } from 'lucide-react';
import { OpCard, OpChip, OpEmpty, OpTable } from './OperatorUI';
import StaffRoster from './StaffRoster';
import StaffFormModal from './StaffFormModal';
import { READ_ONLY_NOTE, useCanManageCompany } from './companyAdmin';
import SearchBar from '../../ui/SearchBar';
import Pagination from '../../ui/Pagination';
import Modal from '../../ui/Modal';
import useStaffDirectory from '../../../api/hooks/Staff/useStaffDirectory';
import { roleLabel } from '../../../utils/staffForm';
import { formatPhone } from '../../../utils/phone';
import { parseAppDate } from '../../../utils/dates';

const joined = (value) => {
  const date = value ? parseAppDate(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Not provided';
};

function AvailabilityChip({ member }) {
  if (member.deactivated) return <OpChip tone="danger">Turned off</OpChip>;
  // Availability is for crews; an Operator account is just on.
  if (member.role === 'operator') return <OpChip tone="success">Active</OpChip>;
  return member.is_available
    ? <OpChip tone="success">Available</OpChip>
    : <OpChip tone="neutral">Not Available</OpChip>;
}

/** Turn off / turn on, asked first in plain words. A refusal (trips still to work) lists the trips. */
function ConfirmPowerDialog({ member, onCancel, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [trips, setTrips] = useState([]);
  const turningOff = !member.deactivated;

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm();
    } catch (err) {
      setError(err?.message || 'Could not save. Please try again.');
      setTrips(err?.cause?.response?.data?.errors?.trips ?? []);
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onCancel} title={turningOff ? `Turn off ${member.name}'s account?` : `Turn on ${member.name}'s account?`}>
      <div className="space-y-3 text-sm text-slate-700">
        {turningOff ? (
          <ul className="list-disc space-y-1 pl-5">
            <li>They cannot sign in, and they are signed out now.</li>
            <li>You cannot pick them for trips or shift blocks.</li>
            <li>Their past trips and shift times stay.</li>
            <li>You can turn the account on again later.</li>
          </ul>
        ) : (
          <p>They can sign in again with their username or email, and you can pick them for trips.</p>
        )}
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800">
            <p>{error}</p>
            {trips.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs" aria-label="Trips to reassign first">
                {trips.map((line) => <li key={line}>{line}</li>)}
              </ul>
            )}
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="min-h-11 rounded-lg border border-slate-200 px-4 font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 font-semibold text-white disabled:opacity-60 ${turningOff ? 'bg-rose-600 hover:bg-rose-700' : 'bg-teal-600 hover:bg-teal-700'}`}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {turningOff ? 'Turn off account' : 'Turn on account'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Batch 46: the Operator's Staff Directory. Only this company's Drivers and Chauffeurs and (2026-11-06) Operators (the
 * server scopes it). A Company Admin adds and turns off Operators too, but not their own account or another Company Admin.
 * Search by username, email, name or role, a role filter, 10 per page, Edit (username, phone, email) and turning an
 * account off or on. Availability is set by each crew member on their own profile and only shown here.
 */
export default function StaffDirectory({ fleetCount, onChanged }) {
  const directory = useStaffDirectory();
  const canManage = useCanManageCompany();
  const [form, setForm] = useState(null);
  const [power, setPower] = useState(null);
  const [notice, setNotice] = useState('');

  const done = (message) => {
    setNotice(message);
    onChanged?.();
  };

  const columns = [
    {
      key: 'name',
      header: 'Staff',
      render: (row) => (
        <span className="font-semibold text-slate-900">
          {row.name || 'Not provided'}
          <span className="block text-xs font-normal text-slate-500">{row.username || 'Not provided'}</span>
        </span>
      ),
    },
    { key: 'role', header: 'Role', render: (row) => <OpChip tone="info">{row.role_label || roleLabel(row.role)}</OpChip> },
    {
      key: 'contact',
      header: 'Contact',
      render: (row) => (
        <span className="break-all">
          {row.email || 'Not provided'}
          <span className="block font-data text-xs text-slate-500">{formatPhone(row.phone_num)}</span>
        </span>
      ),
    },
    { key: 'availability', header: 'Availability', render: (row) => <AvailabilityChip member={row} /> },
    { key: 'joined', header: 'Joined', render: (row) => <span className="text-slate-500">{joined(row.joined_at)}</span> },
    {
      key: 'actions',
      header: '',
      className: 'md:text-right',
      render: (row) => (canManage && (row.manageable === false ? (
        // 2026-11-06: your own account (My Account) and Company Admins (the Super Admin) are changed elsewhere.
        <span className="text-xs text-slate-500">{row.is_you ? 'You' : 'Changed by the Super Admin'}</span>
      ) : (
        <span className="inline-flex gap-2">
          <button type="button" onClick={() => setForm({ mode: 'edit', member: row })} aria-label={`Edit ${row.name}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
          </button>
          <button
            type="button"
            onClick={() => setPower(row)}
            aria-label={row.deactivated ? `Turn on ${row.name}'s account` : `Turn off ${row.name}'s account`}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold ${row.deactivated ? 'border-teal-200 text-teal-700 hover:bg-teal-50' : 'border-rose-200 text-rose-700 hover:bg-rose-50'}`}
          >
            <Power className="h-3.5 w-3.5" aria-hidden="true" /> {row.deactivated ? 'Turn on' : 'Turn off'}
          </button>
        </span>
      ))),
    },
  ];

  const noStaffYet = !directory.loading && directory.pagination.total === 0 && !directory.searching && !directory.role;

  return (
    <div className="space-y-4">
      <StaffRoster drivers={directory.totals.driver} conductors={directory.totals.conductor} fleets={fleetCount} />

      <OpCard
        title="Staff Directory"
        subtitle={`${directory.company?.company_name ? `Drivers, Chauffeurs and Operators of ${directory.company.company_name}. Only your company's Operators can see them.` : 'Your company\'s Drivers, Chauffeurs and Operators.'} Drivers and Chauffeurs set Available or Not Available on their profile.`}
        badge={(
          <span className="flex flex-wrap gap-2">
            <button type="button" onClick={directory.reload} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50">
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
            </button>
            {canManage && (
              <button type="button" onClick={() => { setNotice(''); setForm({ mode: 'add' }); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-700">
                <Plus className="h-4 w-4" aria-hidden="true" /> Add Staff
              </button>
            )}
          </span>
        )}
      >
        {!canManage && <p className="mb-3 text-xs text-slate-500" data-testid="read-only-note">{READ_ONLY_NOTE}</p>}
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchBar value={directory.search} onChange={directory.setSearch} placeholder="Search by username, email or role" className="flex-1" />
            <label className="sr-only" htmlFor="staff-role-filter">Role</label>
            <select id="staff-role-filter" value={directory.role} onChange={(event) => directory.setRole(event.target.value)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">All roles</option>
              <option value="driver">Driver</option>
              <option value="conductor">Chauffeur</option>
              <option value="operator">Operator</option>
            </select>
          </div>

          {notice && <p role="status" className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm text-teal-800">{notice}</p>}
          {directory.error && <p role="alert" className="text-sm text-rose-700">{directory.error}</p>}

          {directory.loading ? (
            <p role="status" className="text-sm text-slate-500">Loading your staff...</p>
          ) : noStaffYet ? (
            <OpEmpty>No staff yet. Choose Add Staff to add your first Driver or Chauffeur.</OpEmpty>
          ) : (
            <OpTable
              caption="Staff Directory"
              columns={columns}
              rows={directory.staff}
              rowKey={(row) => row.company_user_id}
              empty="No staff match your search."
            />
          )}

          {!directory.loading && directory.pagination.total > 0 && (
            <Pagination
              label="Staff pages"
              page={directory.pagination.page}
              perPage={directory.pagination.per_page}
              total={directory.pagination.total}
              lastPage={directory.pagination.last_page}
              onPageChange={directory.setPage}
            />
          )}
        </div>
      </OpCard>

      {form && (
        <StaffFormModal
          mode={form.mode}
          member={form.member}
          defaultRole={directory.role || 'driver'}
          onClose={() => setForm(null)}
          onSubmit={async (payload) => {
            if (form.mode === 'edit') {
              await directory.updateStaff(form.member.company_user_id, payload);
              done('Staff details saved.');
            } else {
              await directory.createStaff(payload);
              done('Staff account created. Give them their username and first password.');
            }
            setForm(null);
          }}
        />
      )}

      {power && (
        <ConfirmPowerDialog
          member={power}
          onCancel={() => setPower(null)}
          onConfirm={async () => {
            if (power.deactivated) {
              await directory.reactivateStaff(power.company_user_id);
              done(`${power.name}'s account is on again.`);
            } else {
              await directory.deactivateStaff(power.company_user_id);
              done(`${power.name}'s account is turned off.`);
            }
            setPower(null);
          }}
        />
      )}
    </div>
  );
}
