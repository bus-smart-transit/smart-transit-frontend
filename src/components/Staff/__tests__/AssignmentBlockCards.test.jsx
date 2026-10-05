import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import AssignmentBlockCards from '../AssignmentBlockCards';
import AssignmentSection from '../AssignmentSection';
import { cardSection, sectionCards, todaySummary } from '../../../utils/assignmentCards';

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

describe('sectionCards (Batch 29: the server section decides)', () => {
  const cards = [
    block({ key: 'a', scheduled_date: '2026-10-04', section: 'today' }),
    block({ key: 'b', scheduled_date: '2026-10-12', section: 'upcoming' }),
    block({ key: 'c', scheduled_date: '2026-10-01', status: 'completed', section: 'past' }),
    block({ key: 'd', scheduled_date: '2026-10-03', status: 'delayed', section: 'overdue', is_overdue: true }),
    block({ key: 'e', scheduled_date: '2026-10-04', status: 'completed', section: 'today' }),
  ];

  it('keeps an unfinished earlier day in Overdue, never Today, and hides finished ones', () => {
    const { overdue, today, upcoming, past } = sectionCards(cards, 'all', '2026-10-04');
    expect(overdue.map((c) => c.key)).toEqual(['d']);
    expect(today.map((c) => c.key)).toEqual(['a']);
    expect(upcoming.map((c) => c.key)).toEqual(['b']);
    expect(past).toEqual([]);
  });

  it('lists every finished card (today and earlier days) under the completed filter', () => {
    const { past, today, overdue } = sectionCards(cards, 'completed', '2026-10-04');
    expect(past.map((c) => c.key)).toEqual(['c', 'e']);
    expect(today).toEqual([]);
    expect(overdue).toEqual([]);
  });

  it('falls back to the Manila date when an older response has no section', () => {
    expect(cardSection({ scheduled_date: '2026-10-03', status: 'scheduled' }, '2026-10-04')).toBe('overdue');
    expect(cardSection({ scheduled_date: '2026-10-03', status: 'completed' }, '2026-10-04')).toBe('past');
    expect(cardSection({ scheduled_date: '2026-10-04', status: 'scheduled' }, '2026-10-04')).toBe('today');
    expect(cardSection({ scheduled_date: '2026-10-05', status: 'scheduled' }, '2026-10-04')).toBe('upcoming');
  });
});

describe('todaySummary', () => {
  it('reads the plate, route, status and schedule from the same card as the list', () => {
    const summary = todaySummary([block({ section: 'today', scheduled_date: '2026-10-04' })], '2026-10-04');
    expect(summary).toEqual({ plate: 'AB-123', route: 'Alpha-Omega', status: 'scheduled', schedule: '06:00 - 13:30' });
  });

  it('is null when nothing is scheduled today', () => {
    expect(todaySummary([block({ section: 'upcoming', scheduled_date: '2026-10-12' })], '2026-10-04')).toBeNull();
    expect(todaySummary([], '2026-10-04')).toBeNull();
  });

  it('prefers the open card over one already finished today', () => {
    const done = block({ key: 'done', section: 'today', status: 'completed', plate_number: 'OLD-1', scheduled_date: '2026-10-04' });
    const open = block({ key: 'open', section: 'today', plate_number: 'NEW-2', scheduled_date: '2026-10-04' });
    expect(todaySummary([done, open], '2026-10-04').plate).toBe('NEW-2');
  });
});

describe('overdue and unanswerable cards', () => {
  const overdue = block({
    section: 'overdue', is_overdue: true, status: 'scheduled', scheduled_date: '2026-10-03', can_respond: false, can_decline: false,
    overdue_reason: 'This date has passed. Contact your operator.', respond_blocked_reason: 'This date has passed. Contact your operator.',
  });

  it('says Overdue instead of Scheduled, gives the reason, and offers no Accept or Decline', () => {
    render(<AssignmentBlockCards title="Overdue" tone="warning" cards={[overdue]} onAccept={vi.fn()} onDecline={vi.fn()} />);

    expect(screen.getByTestId('card-status')).toHaveTextContent('OVERDUE');
    expect(screen.queryByText('SCHEDULED')).not.toBeInTheDocument();
    expect(screen.getByTestId('card-reason')).toHaveTextContent('This date has passed. Contact your operator.');
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
    expect(screen.queryByText('Awaiting your response')).not.toBeInTheDocument();
  });

  it('never claims "Awaiting your response" for a pending card the server says cannot be answered', () => {
    const stuck = block({ can_respond: false, can_decline: false, respond_blocked_reason: 'The first leg has already started, so this can no longer be answered.' });
    render(<AssignmentBlockCards cards={[stuck]} />);

    expect(screen.queryByText('Awaiting your response')).not.toBeInTheDocument();
    expect(screen.getByTestId('card-reason')).toHaveTextContent('already started');
  });
});

describe('AssignmentSection', () => {
  const base = (over = {}) => ({ cards: [], loaded: true, message: '', setMessage: vi.fn(), error: '', busyKey: null, accept: vi.fn(), setConfirmDecline: vi.fn(), confirmDecline: null, ...over });

  it('shows the confirmation inside one full-width body with a way to dismiss it', () => {
    const setMessage = vi.fn();
    render(<AssignmentSection role="driver" assignments={base({ message: 'Trip accepted.', setMessage })} assignedTrips={[]} filter="all" />);

    const body = screen.getByTestId('assignment-body');
    expect(body.className).toMatch(/col-span-full/);
    expect(within(body).getByRole('status')).toHaveTextContent('Trip accepted.');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss message' }));
    expect(setMessage).toHaveBeenCalledWith('');
  });

  it('puts an unfinished earlier day under Overdue, not under Today', () => {
    const cards = [block({ key: 'old', section: 'overdue', is_overdue: true, scheduled_date: '2026-10-03', can_respond: false, can_decline: false })];
    render(<AssignmentSection role="driver" assignments={base({ cards })} assignedTrips={[]} filter="all" />);

    const sections = screen.getAllByTestId('assignment-section');
    expect(sections[0]).toHaveTextContent('Overdue');
    expect(sections[0]).toHaveTextContent('OVERDUE');
    expect(sections[1]).toHaveTextContent("Today's Assignments");
    expect(sections[1]).toHaveTextContent('Nothing assigned for today.');
  });
});