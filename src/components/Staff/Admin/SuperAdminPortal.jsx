import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banknote, Building2, ClipboardList, LayoutDashboard, ShieldCheck, Users, Wrench } from 'lucide-react';
import StaffPortalLayout from '../StaffPortalLayout';
import SuperAdminDashboard from './SuperAdminDashboard';
import CompaniesPage from './CompaniesPage';
import UsersPage from './UsersPage';
import AuditLogPage from './AuditLogPage';
import PaymentsPage from './PaymentsPage';
import { getBusinessToday } from '../../../utils/dates';
import { useAdminAuditLog, useAdminCompanies, useAdminPayments, useAdminOverview, useAdminUsers, useSuperAdminSession } from '../../../api/hooks/Staff/useSuperAdmin';

// Batch 48: the Super Admin portal. Each phase adds its own item here. "Older tools" opens the earlier Admin panel
// until it is replaced (Phase 7, with the user's approval).
const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'companies', label: 'Companies', icon: Building2 },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'payments', label: 'Payments', icon: Banknote },
  { key: 'audit', label: 'Audit log', icon: ClipboardList },
  { key: 'tools', label: 'Older tools', icon: Wrench },
];

// Each page loads its own data only when it is open.
function DashboardTab() {
  const { overview, loading, error, reload } = useAdminOverview();
  return <SuperAdminDashboard overview={overview} loading={loading} error={error} onReload={reload} />;
}

function CompaniesTab() {
  return <CompaniesPage companiesTab={useAdminCompanies()} />;
}

function PaymentsTab() {
  const today = getBusinessToday();
  return <PaymentsPage paymentsTab={useAdminPayments(today)} today={today} />;
}

function AuditTab() {
  return <AuditLogPage auditTab={useAdminAuditLog()} />;
}

function UsersTab() {
  return <UsersPage usersTab={useAdminUsers()} />;
}

export default function SuperAdminPortal() {
  const navigate = useNavigate();
  const { profile, signOut } = useSuperAdminSession();
  const [tab, setTab] = useState('dashboard');

  const onTabChange = (key) => {
    if (key === 'tools') {
      navigate('/employee/admin/tools');
      return;
    }
    setTab(key);
  };

  return (
    <StaffPortalLayout
      brandLabel="Super Admin"
      brandIcon={ShieldCheck}
      navItems={NAV}
      activeTab={tab}
      onTabChange={onTabChange}
      profile={profile ? { name: profile?.name || profile?.user?.username || 'Super Admin' } : null}
      profileRoleLabel="Super Admin"
      profileInitialFallback="S"
      onLogout={signOut}
    >
      <div className="w-0 min-w-full">
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'companies' && <CompaniesTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'payments' && <PaymentsTab />}
        {tab === 'audit' && <AuditTab />}
      </div>
    </StaffPortalLayout>
  );
}
