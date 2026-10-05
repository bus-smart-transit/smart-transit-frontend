import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('../../../../api/StaffService/OperatorService', () => ({
  default: {
    getShiftBlocks: vi.fn(),
    getAssignmentBlocks: vi.fn(),
    getOperatorFleetRoutes: vi.fn().mockResolvedValue({ data: [] }),
    cancelShiftBlock: vi.fn().mockResolvedValue({}),
    overrideShiftBlockHandoff: vi.fn().mockResolvedValue({}),
    markShiftBlockReviewed: vi.fn().mockResolvedValue({}),
  },
}));

import OperatorService from '../../../../api/StaffService/OperatorService';
import ShiftBlocksView from '../ShiftBlocksView';

const leg = (id, over = {}) => ({ trip_id: id, leg_direction: 'outbound', departure_time: '06:00', status: 'scheduled', origin: 'Alpha', destination: 'Omega', service_type: 'regular', ...over });
const who = (id, name, status = 'pending', over = {}) => ({ staff_id: id, name, status, needs_replacement: false, ...over });

const card = (over = {}) => ({
  key: `block-${over.shift_block_id ?? 1}`, kind: 'block', shift_block_id: 1, trip_id: null, route_name: 'Alpha-Omega', origin: 'Alpha', destination: 'Omega',
  scheduled_date: '2026-10-05', start_time: '06:00', end_time: '12:30', legs_count: 2, status: 'scheduled', service_type: 'regular',
  plate_number: 'AB-123', section: 'today', is_overdue: false, answerable: true,
  legs: [leg(1), leg(2, { leg_direction: 'reverse', departure_time: '12:30', origin: 'Omega', destination: 'Alpha' })],
  assignments: { driver: who(6, 'Dina Driver'), conductor: who(7, 'Carl Chauffeur', 'accepted') },
  ...over,
});

const index = (over = {}) => ({ shift_block_id: 1, status: 'scheduled', lifecycle_status: 'scheduled', audit_status: 'not_applicable', ...over });

// The Oct 5 case from the screenshot: stored "scheduled", the legs say completed, both staff rows still "pending".
const screenshotCard = card({
  shift_block_id: 7, route_name: 'Alpha-Omega', scheduled_date: '2026-10-05', status: 'completed', section: 'past', answerable: false,
  legs: [leg(50, { status: 'completed' }), leg(51, { status: 'cancelled' })],
  assignments: { driver: who(6, 'Dina Driver', 'pending'), conductor: who(7, 'Carl Chauffeur', 'pending') },
});

function load(cards, blocks = cards.map((c) => index({ shift_block_id: c.shift_block_id }))) {
  OperatorService.getShiftBlocks.mockResolvedValue({ data: blocks });
  OperatorService.getAssignmentBlocks.mockResolvedValue({ data: cards });
}

beforeEach(() => {
  vi.clearAllMocks();
  OperatorService.getOperatorFleetRoutes.mockResolvedValue({ data: [] });
  OperatorService.cancelShiftBlock.mockResolvedValue({});
});

describe('ShiftBlocksView sections', () => {
  it('opens on Today and Upcoming and hides Overdue and Past', async () => {
    load([
      card({ shift_block_id: 1, section: 'today' }),
      card({ shift_block_id: 2, section: 'upcoming', scheduled_date: '2026-10-09' }),
      card({ shift_block_id: 3, section: 'overdue', scheduled_date: '2026-10-01', status: 'delayed', is_overdue: true, answerable: false }),
      screenshotCard,
    ]);
    render(<ShiftBlocksView />);

    await screen.findAllByTestId('shift-block-card');
    expect(within(screen.getByTestId('section-today')).getAllByTestId('shift-block-card')).toHaveLength(1);
    expect(within(screen.getByTestId('section-upcoming')).getAllByTestId('shift-block-card')).toHaveLength(1);
    expect(screen.queryByTestId('section-overdue')).not.toBeInTheDocument();
    expect(screen.queryByTestId('section-past')).not.toBeInTheDocument();
  });

  it('announces overdue blocks on the default view and shows them on request', async () => {
    load([card({ shift_block_id: 3, section: 'overdue', scheduled_date: '2026-10-01', status: 'delayed', is_overdue: true, answerable: false })]);
    render(<ShiftBlocksView />);

    expect(await screen.findByTestId('overdue-strip')).toHaveTextContent('1 overdue block');
    fireEvent.click(screen.getByRole('button', { name: 'Show overdue' }));
    expect(within(screen.getByTestId('section-overdue')).getAllByTestId('shift-block-card')).toHaveLength(1);
    expect(screen.queryByTestId('section-today')).not.toBeInTheDocument();
  });

  it('lists every section under All', async () => {
    load([card({ shift_block_id: 1 }), card({ shift_block_id: 2, section: 'upcoming', scheduled_date: '2026-10-09' }), card({ shift_block_id: 3, section: 'overdue', status: 'delayed', answerable: false }), screenshotCard]);
    render(<ShiftBlocksView />);
    await screen.findAllByTestId('shift-block-card');

    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    for (const key of ['today', 'upcoming', 'overdue', 'past']) expect(screen.getByTestId(`section-${key}`)).toBeInTheDocument();
    expect(within(screen.getByTestId('section-past')).getAllByTestId('shift-block-card')).toHaveLength(1);
  });

  it('shows an empty state for each section and a loading state while it loads', async () => {
    let resolve;
    OperatorService.getShiftBlocks.mockReturnValue(new Promise((r) => { resolve = r; }));
    OperatorService.getAssignmentBlocks.mockResolvedValue({ data: [] });
    render(<ShiftBlocksView />);

    expect(await screen.findByTestId('loading-today')).toBeInTheDocument();
    expect(screen.getByTestId('loading-upcoming')).toBeInTheDocument();

    resolve({ data: [] });
    expect(await screen.findByTestId('empty-today')).toHaveTextContent('Nothing is scheduled for today.');
    expect(screen.getByTestId('empty-upcoming')).toHaveTextContent('No upcoming blocks.');
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByTestId('empty-overdue')).toHaveTextContent('No overdue blocks.');
    expect(screen.getByTestId('empty-past')).toBeInTheDocument();
  });
});

describe('assignment indicators', () => {
  it('shows one line per person with the role and a small state while the block can be answered', async () => {
    load([card()]);
    render(<ShiftBlocksView />);

    const rows = await screen.findAllByTestId('staff-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Dina Driver');
    expect(rows[0]).toHaveTextContent('Driver');
    expect(rows[1]).toHaveTextContent('Carl Chauffeur');
    expect(rows[1]).toHaveTextContent('Chauffeur');
    const states = screen.getAllByTestId('assignment-indicator').map((el) => el.getAttribute('data-state'));
    expect(states).toEqual(['pending', 'accepted']);
    expect(screen.getAllByTestId('assignment-indicator')[0]).toHaveTextContent('Awaiting response');
  });

  it('shows For approval for a release request', async () => {
    load([card({ assignments: { driver: who(6, 'Dina Driver', 'for_approval'), conductor: who(7, 'Carl Chauffeur', 'accepted') } })]);
    render(<ShiftBlocksView />);
    await screen.findAllByTestId('staff-row');
    expect(screen.getAllByTestId('assignment-indicator')[0]).toHaveTextContent('For Approval');
  });

  it('the screenshot case: a completed block dated Oct 5 shows its status, not "Awaiting response", for both staff', async () => {
    load([screenshotCard], [index({ shift_block_id: 7, status: 'scheduled', lifecycle_status: 'completed' })]);
    render(<ShiftBlocksView />);
    await screen.findByTestId('empty-today');

    fireEvent.click(await screen.findByRole('button', { name: /^Past/ }));
    const cardEl = await screen.findByTestId('shift-block-card');
    expect(within(cardEl).getByTestId('card-status')).toHaveTextContent('COMPLETED');
    expect(within(cardEl).queryAllByTestId('assignment-indicator')).toHaveLength(0);
    expect(cardEl).not.toHaveTextContent('Awaiting');
    // Both people are still listed, one line each.
    expect(within(cardEl).getAllByTestId('staff-row')).toHaveLength(2);
    // No Cancel on a block whose legs are done.
    expect(within(cardEl).queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('hides the states on cancelled and on past-dated blocks, and says "Overdue - date has passed" on an overdue one', async () => {
    load([
      card({ shift_block_id: 3, section: 'overdue', scheduled_date: '2026-10-01', status: 'boarding', is_overdue: true, answerable: false }),
      card({ shift_block_id: 4, section: 'past', scheduled_date: '2026-10-02', status: 'cancelled', answerable: false }),
    ]);
    render(<ShiftBlocksView />);
    await screen.findByTestId('overdue-strip');
    fireEvent.click(screen.getByRole('button', { name: 'All' }));

    expect(screen.queryAllByTestId('assignment-indicator')).toHaveLength(0);
    const overdueCard = within(screen.getByTestId('section-overdue')).getByTestId('shift-block-card');
    expect(within(overdueCard).getByTestId('overdue-note')).toHaveTextContent('Overdue - date has passed');
    expect(within(overdueCard).getByTestId('card-status')).toHaveTextContent('BOARDING'); // the server's derived status
    expect(within(screen.getByTestId('section-past')).getByTestId('card-status')).toHaveTextContent('CANCELLED');
  });

  it('names an unfilled seat "Needs a replacement" without a state', async () => {
    load([card({ assignments: { driver: who(null, null, 'released', { needs_replacement: true }), conductor: who(7, 'Carl Chauffeur', 'accepted') } })]);
    render(<ShiftBlocksView />);
    const rows = await screen.findAllByTestId('staff-row');
    expect(rows[0]).toHaveTextContent('Needs a replacement');
    expect(within(rows[0]).queryByTestId('assignment-indicator')).not.toBeInTheDocument();
  });
});

describe('filters', () => {
  const cards = [
    card({ shift_block_id: 1, route_name: 'Alpha-Omega', status: 'scheduled', section: 'today' }),
    card({ shift_block_id: 2, route_name: 'Beta-Gamma', status: 'boarding', section: 'today', assignments: { driver: who(8, 'Ben Driver'), conductor: who(9, 'Cora Chauffeur') } }),
    card({ shift_block_id: 3, route_name: 'Alpha-Omega', status: 'scheduled', section: 'upcoming', scheduled_date: '2026-10-09' }),
    screenshotCard,
  ];

  it('has named filters (no unlabeled "All" dropdown) built from the loaded cards', async () => {
    load(cards);
    render(<ShiftBlocksView />);
    await screen.findAllByTestId('shift-block-card');

    for (const name of ['Status', 'Route', 'Driver or Chauffeur', 'From', 'To']) expect(screen.getByLabelText(name)).toBeInTheDocument();
    const routes = within(screen.getByLabelText('Route')).getAllByRole('option').map((o) => o.textContent);
    expect(routes).toEqual(['All routes', 'Alpha-Omega', 'Beta-Gamma']);
    const people = within(screen.getByLabelText('Driver or Chauffeur')).getAllByRole('option').map((o) => o.textContent);
    expect(people).toContain('Ben Driver (Driver)');
    expect(people).toContain('Carl Chauffeur (Chauffeur)');
  });

  it('filters by status, route and person, and resets', async () => {
    load(cards);
    render(<ShiftBlocksView />);
    await screen.findAllByTestId('shift-block-card');
    const shown = () => screen.getAllByTestId('shift-block-card').map((el) => el.getAttribute('data-card-key'));
    expect(shown()).toEqual(['block-1', 'block-2', 'block-3']);

    fireEvent.change(screen.getByLabelText('Route'), { target: { value: 'Alpha-Omega' } });
    expect(shown()).toEqual(['block-1', 'block-3']);

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'in_progress' } });
    expect(screen.queryAllByTestId('shift-block-card')).toHaveLength(0);
    expect(screen.getByTestId('empty-today')).toHaveTextContent('No blocks match these filters.');

    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(shown()).toEqual(['block-1', 'block-2', 'block-3']);

    fireEvent.change(screen.getByLabelText('Driver or Chauffeur'), { target: { value: 'driver:8' } });
    expect(shown()).toEqual(['block-2']);
  });

  it('a date range looks at every section, including past ones', async () => {
    load(cards);
    render(<ShiftBlocksView />);
    await screen.findAllByTestId('shift-block-card');

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-05' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-05' } });
    expect(screen.getByTestId('section-past')).toBeInTheDocument();
    expect(screen.getAllByTestId('shift-block-card').map((el) => el.getAttribute('data-card-key'))).toEqual(['block-1', 'block-2', 'block-7']);
  });
});

describe('the card', () => {
  it('keeps View legs, and has no second "+ Schedule" button', async () => {
    load([card()]);
    render(<ShiftBlocksView />);

    fireEvent.click(await screen.findByRole('button', { name: 'View legs' }));
    expect(within(screen.getByTestId('assignment-legs')).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /\+\s*Schedule/ })).not.toBeInTheDocument();
  });

  it('keeps the block actions: Cancel while nothing has run, and Mark Reviewed once completed', async () => {
    load(
      [card({ shift_block_id: 1 }), card({ shift_block_id: 2, key: 'block-2', status: 'completed', section: 'today', answerable: false })],
      [index({ shift_block_id: 1 }), index({ shift_block_id: 2, status: 'completed', lifecycle_status: 'completed', audit_status: 'pending_review' })],
    );
    render(<ShiftBlocksView />);
    const cards = await screen.findAllByTestId('shift-block-card');

    fireEvent.click(within(cards[0]).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(OperatorService.cancelShiftBlock).toHaveBeenCalledWith(1));
    expect(within(cards[1]).getByTestId('audit-chip')).toHaveTextContent('Pending review');
    expect(within(cards[1]).getByRole('button', { name: 'Mark Reviewed' })).toBeInTheDocument();
  });
});
