import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';

// Dashboard renders <ProfileDropdown /> in its topbar, which independently
// calls useAuth() (separate from the usePassengerDashboard mock below), so
// it needs its own mock to avoid the "must be used within an AuthProvider" error.
vi.mock('../../../../api/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { name: 'Test User', email: 'test@example.com' },
    isAuthenticated: true,
    logout: vi.fn(),
  }),
}));

vi.mock('../../../../api/hooks/Passenger/usePassengerDashboard', () => ({
  default: () => ({
    closeTicketModal: vi.fn(),
    formatDateTime: (value) => value ?? '-',
    getDestinationLabel: (ticket) => ticket?.destination ?? 'Destination',
    getOriginLabel: (ticket) => ticket?.origin ?? 'Origin',
    handleLogout: vi.fn(),
    handleTabChange: vi.fn(),
    isAuthenticated: true,
    isLoadingPrivate: false,
    lastSync: null,
    loadPrivateData: vi.fn(),
    loadingTicketQr: false,
    menuOpen: false,
    navigate: vi.fn(),
    paymentNotice: '',
    points: 0,
    privateError: '',
    profile: { name: 'Test User' },
    rewards: [],
    selectedTicket: null,
    selectedTicketQr: null,
    setMenuOpen: vi.fn(),
    ticketModalOpen: false,
    // Two tickets share transaction_reference 'grp-ref-1' (a real multi-ticket
    // group purchase); a third is a standalone ticket that should be excluded.
    tickets: [
      { ticket_id: 1, status: 'valid', origin: 'Origin A', destination: 'Destination A', payment: { transaction_reference: 'grp-ref-1' }, created_at: '2026-09-10T08:00:00Z' },
      { ticket_id: 2, status: 'valid', origin: 'Origin A', destination: 'Destination A', payment: { transaction_reference: 'grp-ref-1' }, created_at: '2026-09-10T08:00:00Z' },
      { ticket_id: 3, status: 'valid', origin: 'Origin B', destination: 'Destination B', payment: { transaction_reference: 'solo-ref-1' }, created_at: '2026-09-11T08:00:00Z' },
    ],
    transactions: [],
    user: { name: 'Test User' },
    visibleTab: 'tickets',
    openTicketModal: vi.fn(),
    printSelectedTicket: vi.fn(),
  }),
}));

describe('Passenger dashboard Group filter', () => {
  test('selecting the Group filter renders a Group QR block without crashing', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    const filterSelect = screen.getByRole('combobox', { name: /filter/i });
    fireEvent.change(filterSelect, { target: { value: 'group' } });

    expect(screen.getByText(/Group Boarding QR/i)).toBeInTheDocument();
    expect(screen.getByText(/Transaction grp-ref-1/i)).toBeInTheDocument();
    expect(screen.queryByText(/Destination B/i)).not.toBeInTheDocument();
  });
});
