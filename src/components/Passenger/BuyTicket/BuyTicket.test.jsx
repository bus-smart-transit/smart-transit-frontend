import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import useBuyTicket from '../../../api/hooks/Passenger/useBuyTicket';
import BuyTicket from './BuyTicket';

vi.mock('../../../api/hooks/Passenger/useBuyTicket', () => ({ default: vi.fn() }));
vi.mock('../../Map/RouteMap', () => ({ default: () => null }));
vi.mock('../Timeline/TripTimeline', () => ({ default: () => null }));
vi.mock('../Ticket/SaveQrButton', () => ({ default: ({ onSaved }) => <button type="button" onClick={() => onSaved?.()}>Save QR (test)</button> }));

const bookingState = () => ({
  bookingLink: { status: 'ok' },
  bookingMode: 'later',
  canProceedToOnlinePayment: true,
  departuresState: { departures: [] },
  checkoutStatus: 'idle',
  form: { origin_stop_id: '1', destination_stop_id: '15', seat_type: 'seated', payment_channel: 'gcash', ticket_quantity: '2', use_rewards: false },
  formErrors: {},
  grossTotal: 472,
  netTotal: 472,
  unitFare: 236,
  totalTickets: 2,
  hasFareQuote: true,
  hasRewardPoints: true,
  availableRewardPoints: 20,
  rewardPointsToApply: 0,
  maxRedeemableRewardPoints: 20,
  maxSeatsPerPurchase: 20,
  isGuestCheckout: false,
  handleChange: vi.fn(),
  handleSubmit: vi.fn(event => event.preventDefault()),
  qrTickets: [],
  resolution: { ready: true },
  stopsData: { originGroups: [{ stops: [{ stop_id: 1, name: 'Ecoland' }] }], destinationGroups: [{ stops: [{ stop_id: 15, name: 'Tagum' }] }] },
  timelineState: { timeline: null },
  travelDate: '2026-10-19',
  trip: { trip_id: 15, trip_date: '2026-10-19', boarding_time: '11:36', seats_left: 50, bus_label: 'DMS - 000001' },
});

describe('single-journey booking', () => {
  beforeEach(() => vi.clearAllMocks());

  it('has no trip-type or return selector and keeps quantity, fare and rewards', () => {
    const state = bookingState();
    useBuyTicket.mockReturnValue(state);
    render(<MemoryRouter><BuyTicket /></MemoryRouter>);

    expect(screen.queryByRole('group', { name: 'Trip Type' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /roundtrip|one-way/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Return')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Ticket Quantity')).toHaveValue(2);
    expect(screen.getByText('PHP 236.00')).toBeInTheDocument();
    expect(screen.getByText('Use reward points')).toBeInTheDocument();
    const paymentButton = screen.getByRole('button', { name: 'Continue to Payment' });
    expect(paymentButton).toBeEnabled();
    fireEvent.submit(paymentButton.closest('form'));
    expect(state.handleSubmit).toHaveBeenCalledOnce();
  });

  // Batch 49 item 1: seats are taken only when the payment is confirmed (the user's wording), and the purchase limit
  // comes from the server.
  it('says the seat is saved at checkout and shows the server purchase limit', () => {
    useBuyTicket.mockReturnValue({ ...bookingState(), maxSeatsPerPurchase: 8 });
    render(<MemoryRouter><BuyTicket /></MemoryRouter>);

    expect(screen.getByText('Proceed to checkout to save the seat.')).toBeInTheDocument();
    expect(screen.getByText('Up to 8 tickets per booking.')).toBeInTheDocument();
    expect(screen.getByLabelText('Ticket Quantity')).toHaveAttribute('max', '8');
  });

  it('blocks payment until the single-journey fare is ready or rewards are valid', () => {
    const state = bookingState();
    useBuyTicket.mockReturnValue({ ...state, canProceedToOnlinePayment: false });
    const { rerender } = render(<MemoryRouter><BuyTicket /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Continue to Payment' })).toBeDisabled();

    useBuyTicket.mockReturnValue({ ...state, isRewardRequestInsufficient: true });
    rerender(<MemoryRouter><BuyTicket /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Continue to Payment' })).toBeDisabled();
  });
});

describe('group QR choice (§4.10)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('offers one group QR for several tickets, ticked by default, and passes an untick to the form', () => {
    const state = bookingState();
    useBuyTicket.mockReturnValue(state);
    render(<MemoryRouter><BuyTicket /></MemoryRouter>);

    const box = screen.getByRole('checkbox', { name: /Send one group QR for all tickets/ });
    expect(box).toBeChecked();
    fireEvent.click(box);
    expect(state.handleChange).toHaveBeenCalledWith('email_group_qr', false);
  });

  it('shows the choice unticked when the passenger unticked it, and not at all for one ticket', () => {
    const state = bookingState();
    useBuyTicket.mockReturnValue({ ...state, form: { ...state.form, email_group_qr: false } });
    const { rerender } = render(<MemoryRouter><BuyTicket /></MemoryRouter>);
    expect(screen.getByRole('checkbox', { name: /Send one group QR/ })).not.toBeChecked();

    useBuyTicket.mockReturnValue({ ...state, form: { ...state.form, ticket_quantity: '1' } });
    rerender(<MemoryRouter><BuyTicket /></MemoryRouter>);
    expect(screen.queryByRole('checkbox', { name: /Send one group QR/ })).not.toBeInTheDocument();
  });
});

// Batch 50 item 7 (user): a guest is asked once before leaving an unsaved ticket; closing goes home (guest) or to
// My Tickets (account). The guest email is required.
describe('after paying', () => {
  const paidTicket = { ticket_uuid: 'u-1', origin: 'Ecoland', destination: 'Tagum', seat_type: 'seated', qr_content: 'u-1', tracking_code: '7KQ4M2XD', tracking_token: 't'.repeat(43) };
  const paidState = (over = {}) => ({ ...bookingState(), checkoutStatus: 'success', qrTickets: [paidTicket], loadingQr: false, formatDateTime: () => '2026-11-09 08:00', printQrTicket: vi.fn(), ...over });
  const renderAt = () => render(
    <MemoryRouter initialEntries={['/passenger/book']}>
      <Routes>
        <Route path="/passenger/book" element={<BuyTicket />} />
        <Route path="/" element={<p>home page</p>} />
        <Route path="/passenger/dashboard" element={<p>my tickets page</p>} />
      </Routes>
    </MemoryRouter>,
  );

  it('asks a guest to save the ticket before leaving, then goes home', () => {
    useBuyTicket.mockReturnValue(paidState({ isGuestCheckout: true }));
    renderAt();

    fireEvent.click(screen.getAllByRole('button', { name: 'Close' }).at(-1)); // the footer button (the X does the same)
    const warning = screen.getByTestId('save-ticket-warning');
    expect(warning).toHaveTextContent('You have not saved your ticket.');
    expect(screen.queryByText('home page')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Leave anyway' }));
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('lets a guest who saved the ticket close without asking', () => {
    useBuyTicket.mockReturnValue(paidState({ isGuestCheckout: true }));
    renderAt();

    fireEvent.click(screen.getAllByRole('button', { name: 'Save QR (test)' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' }).at(-1)); // the footer button (the X does the same)
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('takes a signed-in passenger to My Tickets without asking', () => {
    useBuyTicket.mockReturnValue(paidState({ isGuestCheckout: false }));
    renderAt();

    fireEvent.click(screen.getAllByRole('button', { name: 'Close' }).at(-1)); // the footer button (the X does the same)
    expect(screen.getByText('my tickets page')).toBeInTheDocument();
  });

  it('shows the required guest email and its error', () => {
    useBuyTicket.mockReturnValue({ ...bookingState(), isGuestCheckout: true, form: { ...bookingState().form, guest_email: '' }, formErrors: { guest_email: 'Enter your email. Your ticket and tracking code are sent there.' } });
    render(<MemoryRouter><BuyTicket /></MemoryRouter>);

    expect(screen.getByText('Your ticket and tracking code are sent here. You need it to find your ticket again.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your email. Your ticket and tracking code are sent there.');
  });
});
