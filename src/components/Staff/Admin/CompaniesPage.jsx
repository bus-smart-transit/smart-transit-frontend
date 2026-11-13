import { useState } from 'react';
import { Plus, Pencil, UserPlus } from 'lucide-react';
import { OpPageHeader, OpCard, OpChip, OpTable } from '../Operator/OperatorUI';
import { OP_SPACE } from '../Operator/operatorUiTokens';
import Modal from '../../ui/Modal';
import StaffFormModal from '../Operator/StaffFormModal';
import { adminErrorText } from '../../../api/hooks/Staff/useSuperAdmin';

import { SkeletonTable } from '../../ui/Skeleton';
const BUTTON = 'inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50';

/** Add or rename: one field. */
function CompanyNameModal({ company, onClose, onSave }) {
  const [name, setName] = useState(company?.company_name ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError('Enter the company name.');
      return;
    }
    setSaving(true);
    try {
      await onSave(name.trim());
    } catch (err) {
      setError(adminErrorText(err, 'Could not save. Please try again.'));
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={company ? `Rename ${company.company_name}` : 'Add company'} fullScreenOnMobile>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium text-slate-900">
          Company name
          <input value={name} onChange={(event) => { setName(event.target.value); setError(''); }} maxLength={120} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
        </label>
        {company && <p className="text-xs text-slate-500">Passengers see the new name on this company&apos;s buses.</p>}
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={BUTTON}>Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">{company ? 'Save name' : 'Add company'}</button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Batch 48 Phase 3: the Super Admin's Companies page. A list with counts, Add company, Rename, and Add Company Admin
 * (the company's first manager; they then add their own Operators, Drivers and Chauffeurs).
 */
export default function CompaniesPage({ companiesTab }) {
  const { companies, loading, error, createCompany, renameCompany, addCompanyAdmin } = companiesTab;
  const [nameModal, setNameModal] = useState(null); // { company } | { company: null } | null
  const [adminFor, setAdminFor] = useState(null);
  const [notice, setNotice] = useState('');

  const columns = [
    { key: 'name', header: 'Company', render: (row) => <strong className="text-slate-900">{row.company_name}</strong> },
    {
      key: 'admins',
      header: 'Company Admin',
      render: (row) => (row.company_admins.length
        ? <span className="text-xs">{row.company_admins.map((admin) => admin.name).join(', ')}</span>
        : <OpChip tone="warning">None yet</OpChip>),
    },
    { key: 'operators', header: 'Operators', render: (row) => row.operators },
    { key: 'crew', header: 'Drivers / Chauffeurs', render: (row) => `${row.drivers} / ${row.chauffeurs}` },
    { key: 'buses', header: 'Buses', render: (row) => row.buses },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <span className="inline-flex flex-wrap gap-2">
          <button type="button" onClick={() => { setNotice(''); setNameModal({ company: row }); }} aria-label={`Rename ${row.company_name}`} className={BUTTON}><Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Rename</button>
          <button type="button" onClick={() => { setNotice(''); setAdminFor(row); }} aria-label={`Add Company Admin to ${row.company_name}`} className={BUTTON}><UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> Add Company Admin</button>
        </span>
      ),
    },
  ];

  return (
    <div className={OP_SPACE.stack}>
      <OpPageHeader
        title="Companies"
        subtitle="Bus companies on SmartTransit. Each Company Admin adds their own Operators, Drivers and Chauffeurs."
        action={<button type="button" onClick={() => { setNotice(''); setNameModal({ company: null }); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-700"><Plus className="h-4 w-4" aria-hidden="true" /> Add company</button>}
      />
      {notice && <p role="status" className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm text-teal-800">{notice}</p>}
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <OpCard title="Company list">
        {loading && companies.length === 0
          ? <SkeletonTable label="Loading..." cols={4} />
          : <OpTable caption="Companies" columns={columns} rows={companies} rowKey={(row) => row.company_id} empty="No companies yet. Use Add company." />}
      </OpCard>

      {nameModal && (
        <CompanyNameModal
          company={nameModal.company}
          onClose={() => setNameModal(null)}
          onSave={async (name) => {
            if (nameModal.company) {
              await renameCompany(nameModal.company.company_id, name);
              setNotice('Company renamed.');
            } else {
              await createCompany(name);
              setNotice('Company added. Next, add its Company Admin.');
            }
            setNameModal(null);
          }}
        />
      )}

      {adminFor && (
        <StaffFormModal
          fixedRole="operator"
          addTitle={`Add Company Admin to ${adminFor.company_name}`}
          submitLabel="Add Company Admin"
          onClose={() => setAdminFor(null)}
          onSubmit={async (payload) => {
            await addCompanyAdmin(adminFor.company_id, payload);
            setAdminFor(null);
            setNotice('Company Admin added. Give them their username and first password.');
          }}
        />
      )}
    </div>
  );
}
