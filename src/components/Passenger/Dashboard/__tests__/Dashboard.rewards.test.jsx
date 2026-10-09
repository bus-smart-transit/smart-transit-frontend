import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';

// The Rewards tab says only what the system does: points are earned on what is paid, worth PHP 1 each, and applied at
// checkout. There is no reward catalog and no tier (neither exists on the server), and nothing on the tab to "redeem".

vi.mock('../../../../api/hooks/useAuth', () => ({
  useAuth: () => ({ user: { name: 'Test User', email: 'test@example.com' }, isAuthenticated: true, logout: vi.fn() }),
}));

const navigate = vi.fn();

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
    navigate,
    paymentNotice: '',
    points: 120,
    privateError: '',
    profile: { name: 'Test User', reward_points: 120 },
    rewards: [
      { reward_transaction_id: 1, points: 2, description: 'Earned from ticket purchase', created_at: '2026-10-05' },
      { reward_transaction_id: 2, points: -10, description: 'Redeemed during checkout: TXN-1', created_at: '2026-10-05' },
    ],
    selectedTicket: null,
    selectedTicketQr: null,
    setMenuOpen: vi.fn(),
    ticketModalOpen: false,
    tickets: [],
    transactions: [],
    user: { name: 'Test User' },
    visibleTab: 'rewards',
    openTicketModal: vi.fn(),
    printSelectedTicket: vi.fn(),
  }),
}));

const renderTab = () => render(<MemoryRouter><Dashboard /></MemoryRouter>);

describe('Passenger dashboard Rewards tab', () => {
  test('shows the balance and what it is worth, at PHP 1 a point', () => {
    renderTab();

    expect(screen.getAllByText('120 pts').length).toBeGreaterThan(0); // the balance card, and the one in the top bar
    expect(screen.getByText(/Worth .*120\.00 off an online one-way booking/)).toBeInTheDocument();
  });

  test('explains earning at 1 point per PHP 20 paid and using points at checkout', () => {
    renderTab();

    expect(screen.getByText(/1 SmartPoint for every ₱20 you pay/)).toBeInTheDocument();
    expect(screen.getByText(/1 SmartPoint = ₱1 off/)).toBeInTheDocument();
    expect(screen.getByText(/Use reward points/)).toBeInTheDocument();
    expect(screen.getByText(/points you used are given back/)).toBeInTheDocument();
  });

  test('has no invented tier, no reward catalog and no Redeem buttons', () => {
    renderTab();

    for (const gone of [/Silver Rider/, /Gold Rider/, /Available Rewards/, /Free One-Way Ticket/, /Seat Reservation Fee/, /Fare Discount/, /Not enough points/]) {
      expect(screen.queryByText(gone)).not.toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: /redeem/i })).not.toBeInTheDocument();
  });

  test('sends the passenger to book a trip, where points are applied', () => {
    renderTab();

    expect(screen.getByText(/There is nothing to redeem here/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Book a trip' }));
    expect(navigate).toHaveBeenCalledWith('/passenger/book');
  });

  test('still lists the points activity', () => {
    renderTab();

    expect(screen.getByText('Earned from ticket purchase')).toBeInTheDocument();
    expect(screen.getByText('Redeemed during checkout: TXN-1')).toBeInTheDocument();
    expect(screen.getByText('-10 pts')).toBeInTheDocument();
  });
});
