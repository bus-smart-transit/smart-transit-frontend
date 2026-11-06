import { useState } from 'react';
import { Activity, Banknote, Building2, ClipboardList, LayoutDashboard, ShieldCheck, Users } from 'lucide-react';
import StaffPortalLayout from '../StaffPortalLayout';
import SuperAdminDashboard from './SuperAdminDashboard';
import CompaniesPage from './CompaniesPage';
import UsersPage from './UsersPage';
import AuditLogPage from './AuditLogPage';
import PaymentsPage from './PaymentsPage';
import SystemHealthPage from './SystemHealthPage';
import { getBusinessToday } from '../../../utils/dates';
import { useAdminAuditLog, useAdminCompanies, useAdminHealth, useAdminPayments, useAdminOverview, useAdminUsers, useSuperAdminSession } from '../../../api/hooks/Staff/useSuperAdmin';

// Batch 48: the Super Admin portal. Each phase added its own item here (Phase 7 removed the earlier Admin panel).
const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'companies', label: 'Companies', icon: Building2 },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'payments', label: 'Payments', icon: Banknote },
  { key: 'audit', label: 'Audit log', icon: ClipboardList },
  { key: 'health', label: 'System health', icon: Activity },
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

function HealthTab() {
  return <SystemHealthPage healthTab={useAdminHealth()} />;
}

function AuditTab() {
  return <AuditLogPage auditTab={useAdminAuditLog()} />;
}

function UsersTab() {
  return <UsersPage usersTab={useAdminUsers()} />;
}

export default function SuperAdminPortal() {
  const { profile, signOut } = useSuperAdminSession();
  const [tab, setTab] = useState('dashboard');

  return (
    <StaffPortalLayout
      brandLabel="Super Admin"
      brandIcon={ShieldCheck}
      navItems={NAV}
      activeTab={tab}
      onTabChange={setTab}
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
        {tab === 'health' && <HealthTab />}
      </div>
    </StaffPortalLayout>
  );
}
