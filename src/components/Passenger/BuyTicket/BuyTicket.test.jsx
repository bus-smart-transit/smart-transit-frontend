import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import useBuyTicket from '../../../api/hooks/Passenger/useBuyTicket';
import BuyTicket from './BuyTicket';

vi.mock('../../../api/hooks/Passenger/useBuyTicket', () => ({ default: vi.fn() }));
vi.mock('../../Map/RouteMap', () => ({ default: () => null }));
vi.mock('../Timeline/TripTimeline', () => ({ default: () => null }));

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