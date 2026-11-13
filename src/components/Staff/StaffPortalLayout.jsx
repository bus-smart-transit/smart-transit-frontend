import { useState } from 'react';
import BrandLogo from '../ui/BrandLogo';
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
  profileAction = null,
  mainClassName = 'bg-white',
  // Batch 61 (advisor, 2026-11-13): the crew portals use a bottom bar on phones instead of the menu button.
  bottomNav = false,
  mobileAction = null,
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
          <div className="mb-6 space-y-2 px-2 pt-2">
            <BrandLogo light className="h-10" />
            <p className="flex items-center gap-2 truncate text-sm text-slate-400">
              {BrandIcon && <BrandIcon className="h-4 w-4 shrink-0" aria-hidden="true" />}
              {brandLabel}
            </p>
          </div>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-[15px] lg:py-3 font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-500 text-white'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                  onClick={() => {
                    onTabChange(item.key);
                    setMobileNavOpen(false);
                  }}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: profile + logout */}
        <div className="space-y-3">
          {/* 2026-10-27: profileAction (the Operator's notification bell) sits beside the profile. */}
          {(profile || profileAction) && (
            <div className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5">
              {profile && (
                <>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-500 text-base font-bold text-white">
                    {(profile.name || profileInitialFallback)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 break-words text-sm font-semibold leading-snug text-white">{profile.name}</p>
                    {/* Batch 46: the company this person works for, next to the role. */}
                    <p className="truncate text-[13px] text-slate-400" data-testid="profile-company-line">
                      {profile.company?.company_name ? `${profileRoleLabel} · ${profile.company.company_name}` : profileRoleLabel}
                    </p>
                  </div>
                </>
              )}
              {profileAction && <div className="ml-auto shrink-0" data-testid="profile-action">{profileAction}</div>}
            </div>
          )}
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-medium text-red-400 transition hover:bg-white/10 hover:text-red-300"
            onClick={() => {
              setMobileNavOpen(false);
              onLogout();
            }}
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className={`min-h-screen p-4 sm:p-6 ${bottomNav ? 'pb-28 lg:pb-6' : ''} ${mainClassName}`}>
        <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm lg:hidden">
          <div className="min-w-0">
            <BrandLogo className="h-8" />
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">{brandLabel}</p>
          </div>
          {bottomNav ? mobileAction : (
            <button
              type="button"
              aria-label="Open navigation"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="staff-stack">
          {children}
        </div>
      </main>

      {/* Batch 61: on a phone the crew switch pages with big buttons along the bottom, always in reach of a thumb. */}
      {bottomNav && (
        <nav aria-label="Bottom navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_rgba(15,23,42,0.08)] lg:hidden">
          <ul className="grid" style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => onTabChange(item.key)}
                    className={`flex min-h-16 w-full flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-bold transition ${isActive ? 'text-teal-700' : 'text-slate-600'}`}
                  >
                    <span className={`inline-flex h-8 w-12 items-center justify-center rounded-full ${isActive ? 'bg-teal-100' : ''}`}>
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <span className="leading-tight">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
