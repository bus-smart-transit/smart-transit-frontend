import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Bus, Gauge, User } from 'lucide-react';
import NextStepCard from '../NextStepCard';
import TextSizeControl from '../TextSizeControl';
import CrewTodayCard from '../CrewTodayCard';
import useCrewTextSize from '../../../../api/hooks/Staff/useCrewTextSize';
import StaffPortalLayout from '../../StaffPortalLayout';

// Batch 61 (advisor, via the user, 2026-11-13): the crew portals for a phone, easy to read.

function SizeHarness() {
  const { size, sizes, setSize } = useCrewTextSize();
  return <TextSizeControl size={size} sizes={sizes} onChange={setSize} />;
}

describe('NextStepCard', () => {
  it('shows one big button for the step and says why when it cannot be pressed yet', () => {
    const onPress = vi.fn();
    const { rerender } = render(<NextStepCard step={{ key: 'depart', title: 'Leave the terminal', label: 'Depart', hint: 'Leave when everyone is on board.' }} onPress={onPress} />);
    fireEvent.click(screen.getByRole('button', { name: /Depart/ }));
    expect(onPress).toHaveBeenCalledWith('depart');

    rerender(<NextStepCard step={{ key: 'boarding', title: 'Let passengers on', label: 'Start boarding', disabled: true, reason: 'Start Boarding opens at 06:30' }} onPress={onPress} />);
    expect(screen.getByRole('button', { name: /Start boarding/ })).toBeDisabled();
    expect(screen.getByTestId('next-step-reason')).toHaveTextContent('Start Boarding opens at 06:30');

    rerender(<NextStepCard step={{ key: 'none', title: 'No trip today', label: null }} onPress={onPress} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('text size', () => {
  let store;
  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } });
    document.documentElement.style.fontSize = '';
  });
  afterEach(() => vi.unstubAllGlobals());

  it('starts Large, scales the page, remembers the choice and puts the page back on leaving', () => {
    const { unmount } = render(<SizeHarness />);
    expect(screen.getByRole('button', { name: 'Text size Large' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.style.fontSize).toBe('18px');

    fireEvent.click(screen.getByRole('button', { name: 'Text size Extra large' }));
    expect(document.documentElement.style.fontSize).toBe('20px');
    expect(store['smarttransit.crewTextSize']).toBe('xlarge');

    unmount();
    expect(document.documentElement.style.fontSize).toBe('');
    render(<SizeHarness />);
    expect(screen.getByRole('button', { name: 'Text size Extra large' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('still works when the phone blocks storage', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } });
    render(<SizeHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Text size Normal' }));
    expect(document.documentElement.style.fontSize).toBe('16px');
  });
});

describe('CrewTodayCard', () => {
  it('says "Not provided" for anything missing', () => {
    render(<CrewTodayCard route={null} rows={[['Bus', null], ['Leaves', '2026/11/13 - 07:00']]} />);
    expect(screen.getAllByText('Not provided')).toHaveLength(2);
    expect(screen.getByText('2026/11/13 - 07:00')).toBeInTheDocument();
  });
});

describe('bottom navigation', () => {
  const items = [{ key: 'dashboard', label: 'Home', icon: Gauge }, { key: 'activeTrip', label: 'Trip', icon: Bus }, { key: 'account', label: 'Account', icon: User }];

  it('replaces the menu button with a bottom bar for the crew, marking the open page', () => {
    const onTabChange = vi.fn();
    render(
      <StaffPortalLayout brandLabel="Driver Portal" brandIcon={Bus} navItems={items} activeTab="activeTrip" onTabChange={onTabChange} onLogout={vi.fn()} bottomNav mobileAction={<span>size</span>}>
        <p>body</p>
      </StaffPortalLayout>,
    );
    expect(screen.queryByRole('button', { name: 'Open navigation' })).not.toBeInTheDocument();
    const bar = screen.getByRole('navigation', { name: 'Bottom navigation' });
    expect(bar.querySelector('[aria-current="page"]')).toHaveTextContent('Trip');
    fireEvent.click(screen.getAllByRole('button', { name: 'Home' }).find((b) => bar.contains(b)));
    expect(onTabChange).toHaveBeenCalledWith('dashboard');
  });

  it('keeps the menu button for the Operator (no bottom bar)', () => {
    render(<StaffPortalLayout brandLabel="Operator Portal" brandIcon={Bus} navItems={items} activeTab="dashboard" onTabChange={vi.fn()} onLogout={vi.fn()}><p>body</p></StaffPortalLayout>);
    expect(screen.getByRole('button', { name: 'Open navigation' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Bottom navigation' })).not.toBeInTheDocument();
  });
});
