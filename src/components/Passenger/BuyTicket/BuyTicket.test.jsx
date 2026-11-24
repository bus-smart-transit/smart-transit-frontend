import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import useBuyTicket from '../../../api/hooks/Passenger/useBuyTicket';
import BuyTicket from './BuyTicket';

vi.mock('../../../api/hooks/Passenger/useBuyTicket', () => ({ default: vi.fn() }));
vi.mock('../../Map/RouteMap', () => ({ default: () => null }));
vi.mock('../Timeline/TripTimeline', () => ({ default: ({ footer }) => footer ?? null }));
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

  // Booking page audit (2026-11-19): errors are announced, the points box has a label, the summary date is friendly.
  it('announces errors to screen readers, labels the points box and shows the friendly date', () => {
    const state = bookingState();
    state.error = 'The payment could not be started.';
    state.formErrors = { ticket_quantity: 'Choose 1 to 20 tickets.' };
    state.form = { ...state.form, use_rewards: true, reward_points_to_use: '5' };
    useBuyTicket.mockReturnValue(state);
    render(<MemoryRouter><BuyTicket /></MemoryRouter>);

    const alerts = screen.getAllByRole('alert').map((el) => el.textContent);
    expect(alerts).toEqual(expect.arrayContaining([expect.stringContaining('The payment could not be started.'), 'Choose 1 to 20 tickets.']));
    expect(screen.getByLabelText('Number of tickets')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Number of tickets')).toHaveAccessibleDescription(/Up to 20 tickets per booking.*Choose 1 to 20 tickets/);
    expect(screen.getByLabelText('Points to use')).toHaveValue(5);
    expect(screen.getByText(/Oct 19, 2026 11:36 AM/)).toBeInTheDocument();
  });

  it('has no trip-type or return selector and keeps quantity, fare and rewards', () => {
    const state = bookingState();
    useBuyTicket.mockReturnValue(state);
    render(<MemoryRouter><BuyTicket /></MemoryRouter>);

    expect(screen.queryByRole('group', { name: 'Trip Type' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /roundtrip|one-way/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Return')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Number of tickets')).toHaveValue(2);
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
    expect(screen.getByLabelText('Number of tickets')).toHaveAttribute('max', '8');
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

// Batch 51 item 7 (user): booking for someone else: their name and an email or a mobile number (numbers only once a
// digit is typed); the errors come from the form.
describe('booking for someone else', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the fields when ticked, keeps a number to digits, and shows the errors', () => {
    const state = bookingState();
    useBuyTicket.mockReturnValue({ ...state, form: { ...state.form, for_someone_else: true, traveller_name: '', traveller_contact: '0917' }, formErrors: { traveller_name: 'Enter the name of the person you are booking for.' } });
    render(<MemoryRouter><BuyTicket /></MemoryRouter>);

    const contact = screen.getByLabelText('Their email or mobile number');
    expect(contact).toHaveAttribute('inputmode', 'tel');
    fireEvent.change(contact, { target: { value: '0917abc1234567' } });
    expect(state.handleChange).toHaveBeenCalledWith('traveller_contact', '09171234567');
    expect(screen.getByText('Enter the name of the person you are booking for.')).toBeInTheDocument();
    expect(screen.getByText(/Their ticket is sent to your email/)).toBeInTheDocument();
  });

  it('ticks the option through the form', () => {
    const state = bookingState();
    useBuyTicket.mockReturnValue(state);
    render(<MemoryRouter><BuyTicket /></MemoryRouter>);
    expect(screen.queryByLabelText('Their name')).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Book for someone' }));
    expect(state.handleChange).toHaveBeenCalledWith('for_someone_else', true);
  });
});


// Batch 76 (user, 2026-11-17): one departure list, "Book for someone" first, no seat type, the map in a pop-up, and per
// ticket "Valid for Discount?", a priority seat and baggage. SAMPLE values.
describe('checkout layout and ticket options (Batch 76)', () => {
  beforeEach(() => vi.clearAllMocks());
  const options = () => ({
    ...bookingState(),
    discountTypes: [{ key: 'student', label: 'Student', rate: 0.2 }],
    priorityTypes: [{ key: 'senior', label: 'Senior citizen' }, { key: 'pregnant', label: 'Pregnant' }],
    baggagePercent: 50,
    baggage: { count: 1, total: 118 },
    setDiscountClaim: vi.fn(),
    setTicketExtra: vi.fn(),
    timelineState: { timeline: { trip: { route_id: 3, leg_direction: 'outbound' } } },
    form: { ...bookingState().form, ticket_extras: { 0: { baggage: true } } },
  });

  // 2026-11-24 (user): Book for someone moved next to the ticket email, after the payment method.
  it('puts Book for someone with the ticket email after the payment method and drops Booking Option and Seat Type', () => {
    useBuyTicket.mockReturnValue(options());
    render(<MemoryRouter><BuyTicket /></MemoryRouter>);

    const someone = screen.getByTestId('for-someone-else');
    const payment = screen.getByRole('radiogroup', { name: 'Payment method' });
    expect(payment.compareDocumentPosition(someone) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText('Booking Option')).not.toBeInTheDocument();
    expect(screen.queryByText('Seat Type')).not.toBeInTheDocument();
  });

  it('asks per ticket for a discount, a priority seat and baggage, and passes the choices to the form', () => {
    const state = options();
    useBuyTicket.mockReturnValue(state);
    render(<MemoryRouter><BuyTicket /></MemoryRouter>);

    expect(screen.getAllByText('Valid for Discount?')).toHaveLength(2);
    fireEvent.change(screen.getByTestId('priority-1'), { target: { value: 'pregnant' } });
    expect(state.setTicketExtra).toHaveBeenCalledWith(1, 'priority_type', 'pregnant');
    fireEvent.click(screen.getByTestId('baggage-1'));
    expect(state.setTicketExtra).toHaveBeenCalledWith(1, 'baggage', true);
    expect(screen.getAllByText('(+PHP 118.00)')).toHaveLength(2);
    expect(screen.getByText('Baggage (1)')).toBeInTheDocument();
  });

  it('opens the route map in a pop-up', () => {
    useBuyTicket.mockReturnValue(options());
    render(<MemoryRouter><BuyTicket /></MemoryRouter>);

    expect(screen.queryByRole('dialog', { name: 'Route map' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('view-route-map'));
    expect(screen.getByText('Route map')).toBeInTheDocument();
  });
});

// 2026-11-24 (user): the redesigned page: a ticket stepper, the account email in the ticket slot, and "Book for someone"
// turning that slot into the traveller's details (a guest keeps their own email under them).
describe('Trip Details and Payment redesign', () => {
  beforeEach(() => vi.clearAllMocks());

  it('steps the number of tickets within 1 and the per-booking limit', () => {
    const state = bookingState();
    useBuyTicket.mockReturnValue({ ...state, form: { ...state.form, ticket_quantity: '1' }, maxSeatsPerPurchase: 2 });
    render(<MemoryRouter><BuyTicket /></MemoryRouter>);

    expect(screen.getByRole('button', { name: 'One ticket less' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'One ticket more' }));
    expect(state.handleChange).toHaveBeenCalledWith('ticket_quantity', '2');
  });

  it('shows where a signed-in passenger gets the ticket, and hides it when booking for someone', () => {
    const state = bookingState();
    useBuyTicket.mockReturnValue(state);
    const { rerender } = render(<MemoryRouter><BuyTicket accountEmail="juan@example.com" /></MemoryRouter>);
    expect(screen.getByTestId('account-email')).toHaveTextContent('Your ticket is sent to juan@example.com.');

    useBuyTicket.mockReturnValue({ ...state, form: { ...state.form, for_someone_else: true, traveller_name: '', traveller_contact: '' } });
    rerender(<MemoryRouter><BuyTicket accountEmail="juan@example.com" /></MemoryRouter>);
    expect(screen.queryByTestId('account-email')).toBeNull();
    expect(screen.getByLabelText('Their name')).toBeInTheDocument();
  });

  it('keeps a guest\'s own email under the traveller\'s details', () => {
    const state = bookingState();
    useBuyTicket.mockReturnValue({ ...state, isGuestCheckout: true, form: { ...state.form, for_someone_else: true, traveller_name: '', traveller_contact: '', guest_email: '' } });
    render(<MemoryRouter><BuyTicket /></MemoryRouter>);

    expect(screen.getByLabelText('Their email or mobile number')).toBeInTheDocument();
    expect(screen.getByText('Your email (we send the ticket here)')).toBeInTheDocument();
    expect(screen.queryByText('Rewards applied')).toBeNull();
  });
});
