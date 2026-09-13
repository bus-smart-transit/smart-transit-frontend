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
    tickets: [
      { ticket_id: 1, status: 'valid', origin: 'Origin A', destination: 'Destination A', payment: { transaction_reference: 'ref-1' }, created_at: '2026-09-10T08:00:00Z' },
      { ticket_id: 2, status: 'alighted', origin: 'Origin B', destination: 'Destination B', payment: { transaction_reference: 'ref-2' }, created_at: '2026-09-08T08:00:00Z' },
    ],
    transactions: [],
    user: { name: 'Test User' },
    visibleTab: 'tickets',
    openTicketModal: vi.fn(),
    printSelectedTicket: vi.fn(),
  }),
}));

describe('Passenger dashboard ticket filters', () => {
  test('shows scheduled and completed filters and narrows results by status', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /scheduled/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /completed/i })).toBeInTheDocument();

    expect(screen.getByText(/Destination A/i)).toBeInTheDocument();
    expect(screen.getByText(/Destination B/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^completed$/i }));

    expect(screen.queryByText(/Destination A/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Destination B/i)).toBeInTheDocument();
  });
});
