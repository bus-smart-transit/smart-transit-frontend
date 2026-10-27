import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Bus, CalendarDays, Wallet } from 'lucide-react';
import StaffPortalLayout from '../StaffPortalLayout';
import { navForRole } from '../../../utils/operatorNav';

const ICONS = { dashboard: Bus, schedule: CalendarDays, finance: Wallet };
const items = navForRole('operator').map((item) => ({ ...item, icon: ICONS[item.key] || Bus }));

const setup = (activeTab = 'schedule', over = {}) => {
  const onTabChange = vi.fn();
  const onLogout = vi.fn();
  const utils = render(
    <StaffPortalLayout brandLabel="Operator Portal" brandIcon={Bus} navItems={items} activeTab={activeTab} onTabChange={onTabChange} profile={{ name: 'Olive Operator' }} profileRoleLabel="Operator" onLogout={onLogout} {...over}>
      <p>page body</p>
    </StaffPortalLayout>,
  );
  const aside = utils.container.querySelector('aside');
  return { ...utils, aside, onTabChange, onLogout };
};

const sidebarButton = (aside, label) => [...aside.querySelectorAll('nav button')].find((b) => b.textContent.trim() === label);

describe('Operator sidebar in the shared staff layout', () => {
  it('lists the merged items in order, with no Trips, Calendar, Shift Blocks, Financials or Remittances', () => {
    const { aside } = setup();
    const labels = [...aside.querySelectorAll('nav button')].map((b) => b.textContent.trim());
    expect(labels).toEqual(['Dashboard', 'Staffs', 'Fleets', 'Routes', 'Schedule', 'Finance', 'Reports', 'Account']);
  });

  it('highlights only the active item', () => {
    const { aside } = setup('finance');
    expect(sidebarButton(aside, 'Finance').className).toMatch(/bg-teal-500/);
    expect(sidebarButton(aside, 'Schedule').className).not.toMatch(/bg-teal-500/);
    expect([...aside.querySelectorAll('nav button')].filter((b) => /bg-teal-500/.test(b.className))).toHaveLength(1);
  });

  it('moves the highlight when the active item changes', () => {
    const { aside, rerender, onTabChange } = setup('schedule');
    expect(sidebarButton(aside, 'Schedule').className).toMatch(/bg-teal-500/);
    rerender(
      <StaffPortalLayout brandLabel="Operator Portal" brandIcon={Bus} navItems={items} activeTab="reports" onTabChange={onTabChange} profile={{ name: 'Olive Operator' }} profileRoleLabel="Operator" onLogout={vi.fn()}>
        <p>page body</p>
      </StaffPortalLayout>,
    );
    expect(sidebarButton(aside, 'Reports').className).toMatch(/bg-teal-500/);
    expect(sidebarButton(aside, 'Schedule').className).not.toMatch(/bg-teal-500/);
  });

  it('calls onTabChange with the item key', () => {
    const { aside, onTabChange } = setup('dashboard');
    fireEvent.click(sidebarButton(aside, 'Finance'));
    expect(onTabChange).toHaveBeenCalledWith('finance');
  });
});

describe('mobile menu', () => {
  it('is closed at first, opens with the menu button, and closes after choosing an item', () => {
    const { aside, onTabChange } = setup('dashboard');
    expect(aside.className).toMatch(/\bhidden\b/);

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(aside.className).toMatch(/translate-x-0/);
    expect(aside.className).not.toMatch(/\bhidden\b/);

    fireEvent.click(sidebarButton(aside, 'Schedule'));
    expect(onTabChange).toHaveBeenCalledWith('schedule');
    expect(aside.className).toMatch(/\bhidden\b/);
  });

  it('closes with the close button and with the backdrop', () => {
    const { aside } = setup('dashboard');
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close navigation' }));
    expect(aside.className).toMatch(/\bhidden\b/);

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close navigation drawer' }));
    expect(aside.className).toMatch(/\bhidden\b/);
  });
});

// 2026-10-27: the Operator's notification bell sits in the sidebar, beside the profile.
describe('profile action in the sidebar', () => {
  it('shows the action beside the profile name', () => {
    const { aside } = setup('dashboard', { profileAction: <button type="button">Notifications</button> });
    const action = aside.querySelector('[data-testid="profile-action"]');
    expect(action).not.toBeNull();
    expect(action.parentElement.textContent).toContain('Olive Operator');
    expect(action.textContent).toBe('Notifications');
  });

  it('shows nothing extra when no action is given', () => {
    const { aside } = setup('dashboard');
    expect(aside.querySelector('[data-testid="profile-action"]')).toBeNull();
  });
});
