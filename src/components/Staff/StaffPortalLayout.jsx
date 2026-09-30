import { useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';

/**
 * Batch 20 Item 1: shared sidebar/shell layout for all three staff portals
 * (Driver, Conductor, Operator). Each portal previously hand-rolled its own
 * `<aside>` with a different fixed width (Driver 260px, Conductor 240px,
 * Operator 224px/w-56) and slightly different structure, so the sidebar's
 * apparent size differed depending on which portal/page was open. This
 * component defines that shell ONCE — width/structure is fixed here, only
 * `navItems`/`activeTab`/`children` vary per portal.
 */
export default function StaffPortalLayout({
  brandLabel,
  brandIcon: BrandIcon,
  navItems,
  activeTab,
  onTabChange,
  profile,
  profileRoleLabel,
  profileInitialFallback = '?',
  onLogout,
  children,
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="relative grid min-h-screen grid-cols-1 bg-slate-100 text-slate-900 lg:grid-cols-[260px_1fr]">
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation drawer"
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Batch 20 follow-up: `<aside>` and `<main>` are grid siblings with
          the default `align-items: stretch`, so without an explicit,
          viewport-locked height the sidebar's rendered height/box just
          stretches to match whatever the tallest tab's content is —
          making it visibly grow/shrink per page even though its CSS never
          changed. `lg:sticky lg:top-0 lg:h-screen` pins it to exactly one
          viewport height, decoupled from `<main>`'s content length, with
          its own internal scroll if the nav ever overflows. */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-65 transform flex-col justify-between overflow-y-auto bg-[#0D1B2A] p-4 transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:flex lg:h-screen lg:translate-x-0 ${mobileNavOpen ? 'flex translate-x-0' : 'hidden -translate-x-full'}`}>
        <div>
          <div className="mb-2 flex justify-end lg:hidden">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 text-slate-200"
              aria-label="Close navigation"
              onClick={() => setMobileNavOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-6 flex items-center gap-3 px-2 pt-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500">
              {BrandIcon && <BrandIcon className="h-5 w-5 text-white" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-none text-white">SMARTTRANSIT</p>
              <p className="truncate text-xs text-slate-400">{brandLabel}</p>
            </div>
          </div>

          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-500 text-white'
                      : 'text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                  onClick={() => {
                    onTabChange(item.key);
                    setMobileNavOpen(false);
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: profile + logout */}
        <div className="space-y-3">
          {profile && (
            <div className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500 text-sm font-bold text-white">
                {(profile.name || profileInitialFallback)[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{profile.name}</p>
                <p className="truncate text-xs text-slate-400">{profileRoleLabel}</p>
              </div>
            </div>
          )}
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-white/10 hover:text-red-300"
            onClick={() => {
              setMobileNavOpen(false);
              onLogout();
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="min-h-screen bg-white p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm lg:hidden">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">{brandLabel}</p>
            <p className="truncate text-sm font-bold text-slate-900">SMARTTRANSIT</p>
          </div>
          <button
            type="button"
            aria-label="Open navigation"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        <div className="staff-stack">
          {children}
        </div>
      </main>
    </div>
  );
}
