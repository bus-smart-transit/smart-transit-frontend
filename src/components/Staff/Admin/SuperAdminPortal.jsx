import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, Wrench } from 'lucide-react';
import StaffPortalLayout from '../StaffPortalLayout';
import SuperAdminDashboard from './SuperAdminDashboard';
import { useAdminOverview, useSuperAdminSession } from '../../../api/hooks/Staff/useSuperAdmin';

// Batch 48: the Super Admin portal. Each phase adds its own item here (Companies, Users, Audit log). "Older tools"
// opens the earlier Admin panel until it is replaced (Phase 7, with the user's approval).
const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'tools', label: 'Older tools', icon: Wrench },
];

export default function SuperAdminPortal() {
  const navigate = useNavigate();
  const { profile, signOut } = useSuperAdminSession();
  const { overview, loading, error, reload } = useAdminOverview();

  const onTabChange = (key) => {
    if (key === 'tools') navigate('/employee/admin/tools');
  };

  return (
    <StaffPortalLayout
      brandLabel="Super Admin"
      brandIcon={ShieldCheck}
      navItems={NAV}
      activeTab="dashboard"
      onTabChange={onTabChange}
      profile={profile ? { name: profile?.name || profile?.user?.username || 'Super Admin' } : null}
      profileRoleLabel="Super Admin"
      profileInitialFallback="S"
      onLogout={signOut}
    >
      <div className="w-0 min-w-full">
        <SuperAdminDashboard overview={overview} loading={loading} error={error} onReload={reload} />
      </div>
    </StaffPortalLayout>
  );
}
