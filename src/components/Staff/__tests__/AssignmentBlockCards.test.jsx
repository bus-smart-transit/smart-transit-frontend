import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import AssignmentBlockCards from '../AssignmentBlockCards';
import AssignmentSection from '../AssignmentSection';
import { sectionCards } from '../../../utils/assignmentCards';

const leg = (id, over = {}) => ({ trip_id: id, leg_direction: 'outbound', departure_time: '06:00', status: 'scheduled', origin: 'Alpha', destination: 'Omega', service_type: 'regular', ...over });

const block = (over = {}) => ({
  key: 'block-5', kind: 'block', shift_block_id: 5, trip_id: null, route_name: 'Alpha-Omega', origin: 'Alpha', destination: 'Omega',
  scheduled_date: '2026-10-12', start_time: '06:00', end_time: '13:30', legs_count: 4, status: 'scheduled', service_type: 'regular',
  plate_number: 'AB-123', assignment_status: 'pending', can_respond: true, can_decline: true,
  legs: [leg(1), leg(2, { leg_direction: 'reverse', departure_time: '08:30' }), leg(3, { departure_time: '11:00' }), leg(4, { leg_direction: 'reverse', departure_time: '13:30' })],
  ...over,
});

const single = (over = {}) => block({
  key: 'trip-9', kind: 'trip', shift_block_id: null, trip_id: 9, legs_count: 1, start_time: '09:00', end_time: '09:00', legs: [leg(9, { departure_time: '09:00' })], ...over,
});

describe('AssignmentBlockCards', () => {
  it('shows ONE card for a four-leg block, with the route, date, time range, legs and status', () => {
    render(<AssignmentBlockCards title="Today" cards={[block()]} onAccept={vi.fn()} onDecline={vi.fn()} />);

    const cards = screen.getAllByTestId('assignment-card');
    expect(cards).toHaveLength(1);
    expect(within(cards[0]).getByText('Alpha-Omega')).toBeInTheDocument();
    expect(within(cards[0]).getByText('Departures 06:00 to 13:30')).toBeInTheDocument();
    expect(within(cards[0]).getByTestId('assignment-legs-count')).toHaveTextContent('4 legs');
    expect(within(cards[0]).getByText('SCHEDULED')).toBeInTheDocument();
    // The legs are NOT listed on the card itself.
    expect(screen.queryByTestId('assignment-legs')).not.toBeInTheDocument();
  });

  it('lists the legs in the modal and offers Accept and Decline once, on the card', () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    const card = block();
    render(<AssignmentBlockCards cards={[card]} onAccept={onAccept} onDecline={onDecline} />);

    expect(screen.getAllByRole('button', { name: 'Accept' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Decline' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'View legs' }));
    const legs = within(screen.getByTestId('assignment-legs')).getAllByRole('listitem');
    expect(legs).toHaveLength(4);
    expect(legs[1]).toHaveTextContent('Leg 2: Omega'.replace('Omega', 'Alpha')); // reverse leg runs Omega -> Alpha
    // No second set of buttons inside the modal.
    expect(screen.getAllByRole('button', { name: 'Accept' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(onAccept).toHaveBeenCalledWith(card);
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(onDecline).toHaveBeenCalledWith(card);
  });

  it('treats a one-way trip as a block of one leg: the same card, a single leg in the modal', () => {
    render(<AssignmentBlockCards cards={[single()]} />);

    expect(screen.getByTestId('assignment-legs-count')).toHaveTextContent('1 leg');
    expect(screen.getByText('Departs 09:00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(within(screen.getByTestId('assignment-legs')).getAllByRole('listitem')).toHaveLength(1);
  });

  it('keeps "For Approval" as the assignment badge and removes Accept and Decline', () => {
    render(<AssignmentBlockCards cards={[block({ assignment_status: 'for_approval', can_respond: false, can_decline: false })]} />);

    expect(screen.getByTestId('assignment-badge')).toHaveTextContent('For Approval');
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
  });

  it('after a rejection offers Accept but not Decline, and says to proceed', () => {
    render(<AssignmentBlockCards cards={[block({ assignment_status: 'rejected', can_respond: true, can_decline: false })]} />);

    expect(screen.getByTestId('assignment-badge')).toHaveTextContent('Request rejected: please proceed');
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
  });

  it('shows no buttons once the first leg has started or the block is accepted', () => {
    render(<AssignmentBlockCards cards={[block({ assignment_status: 'accepted', can_respond: false, can_decline: false, status: 'in_progress' })]} />);

    expect(screen.getByTestId('assignment-badge')).toHaveTextContent('Accepted');
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
  });

  it('operator mode shows both roles, a replacement notice, and no response buttons', () => {
    const card = block({
      assignments: {
        driver: { name: 'Dina', status: 'for_approval', needs_replacement: false },
        conductor: { name: null, status: 'released', needs_replacement: true },
      },
    });
    render(<AssignmentBlockCards mode="operator" cards={[card]} />);

    const roles = screen.getByTestId('assignment-roles');
    expect(roles).toHaveTextContent('Driver: Dina');
    expect(roles).toHaveTextContent('Chauffeur: Needs a replacement');
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
  });

  it('highlights the card a notification pointed at', () => {
    render(<AssignmentBlockCards cards={[block(), single()]} focusKey="block-5" />);

    expect(screen.getAllByTestId('assignment-card')[0].className).toMatch(/ring-2/);
    expect(screen.getAllByTestId('assignment-card')[1].className).not.toMatch(/ring-2/);
  });

  it('renders the operator-entered reason as plain text', () => {
    render(<AssignmentBlockCards mode="operator" cards={[block({ reason_text: '<img src=x onerror=alert(1)>' })]} />);
    fireEvent.click(screen.getByRole('button', { name: 'View legs' }));

    expect(screen.getByText(/Reason given: <img src=x onerror=alert\(1\)>/)).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });
});

describe('sectionCards', () => {
  const cards = [block({ key: 'a', scheduled_date: '2026-10-04' }), block({ key: 'b', scheduled_date: '2026-10-12' }), block({ key: 'c', scheduled_date: '2026-10-01', status: 'completed' }), block({ key: 'd', scheduled_date: '2026-10-03', status: 'delayed' })];

  it('puts today and any unfinished earlier block in Today, later ones in Upcoming, and hides finished ones', () => {
    const { today, upcoming } = sectionCards(cards, 'all', '2026-10-04');
    expect(today.map((c) => c.key)).toEqual(['a', 'd']);
    expect(upcoming.map((c) => c.key)).toEqual(['b']);
  });

  it('lists only the finished ones under the completed filter', () => {
    expect(sectionCards(cards, 'completed', '2026-10-04').today.map((c) => c.key)).toEqual(['c']);
  });
});

describe('AssignmentSection', () => {
  const make = (over = {}) => ({
    cards: [block({ scheduled_date: '2099-01-01' })], loaded: true, error: '', message: '', busyKey: null,
    accept: vi.fn(), setConfirmDecline: vi.fn(), confirmDecline: null, declineErrors: {}, declineSubmitting: false, submitDecline: vi.fn(), cancelDecline: vi.fn(), ...over,
  });

  it('opens the decline dialog and keeps the typed Others text visible with the server error on a 422', () => {
    const decline = block();
    render(<AssignmentSection role="driver" assignments={make({ cards: [decline], confirmDecline: decline, declineErrors: { reason_text: 'Please describe your reason.' } })} assignedTrips={[]} />);

    expect(screen.getByText(/Request to Decline This Trip/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'other' } });
    const box = screen.getByLabelText(/Describe your reason/);
    fireEvent.change(box, { target: { value: 'Family emergency' } });
    expect(box).toHaveValue('Family emergency');
    expect(screen.getByText('Please describe your reason.')).toBeInTheDocument();
  });

  it('sends the reason from the dialog once for the whole block', () => {
    const decline = block();
    const submitDecline = vi.fn();
    render(<AssignmentSection role="driver" assignments={make({ cards: [decline], confirmDecline: decline, submitDecline })} assignedTrips={[]} />);

    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'other' } });
    fireEvent.change(screen.getByLabelText(/Describe your reason/), { target: { value: 'Family emergency' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));

    expect(submitDecline).toHaveBeenCalledTimes(1);
    expect(submitDecline).toHaveBeenCalledWith({ reasonCode: 'other', reasonText: 'Family emergency' });
  });

  it('tells the person a block from a notification is no longer theirs, without an error', () => {
    render(<AssignmentSection role="driver" assignments={make({ cards: [] })} assignedTrips={[]} focusBlockId={77} onDismissFocus={vi.fn()} />);

    expect(screen.getByTestId('trip-focus-notice')).toHaveAttribute('data-state', 'unavailable');
    expect(screen.getByText(/Shift block #77 is no longer on your list/)).toBeInTheDocument();
  });

  it('shows the pending notice and highlights the block when a notification opens it', () => {
    render(<AssignmentSection role="driver" assignments={make()} assignedTrips={[]} focusBlockId={5} onDismissFocus={vi.fn()} />);

    expect(screen.getByTestId('trip-focus-notice')).toHaveAttribute('data-state', 'pending');
    expect(screen.getByTestId('assignment-card').className).toMatch(/ring-2/);
  });

  it('shows no notice until the cards have loaded', () => {
    render(<AssignmentSection role="driver" assignments={make({ cards: [], loaded: false })} assignedTrips={[]} focusBlockId={5} onDismissFocus={vi.fn()} />);

    expect(screen.queryByTestId('trip-focus-notice')).not.toBeInTheDocument();
  });
});
