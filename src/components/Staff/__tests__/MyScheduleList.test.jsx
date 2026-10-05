import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import MyScheduleList from '../MyScheduleList';

const block = (id, over = {}) => ({
  shift_block_id: id, block_type: 'morning', scheduled_date: '2026-10-04', status: 'scheduled', lifecycle_status: 'scheduled',
  schedule_section: 'today', fleet: { plate_number: 'AB-123' }, legs: [{}, {}, {}, {}], ...over,
});

describe('MyScheduleList', () => {
  it('shows the one derived status, not the stored block status', () => {
    render(<MyScheduleList today="2026-10-04" blocks={[block(1, { status: 'scheduled', lifecycle_status: 'completed' })]} />);

    expect(screen.getByTestId('schedule-status')).toHaveTextContent(/completed/i);
  });

  it('lists an unfinished past day as Overdue with the reason, and no actions', () => {
    const renderActions = vi.fn((b, section) => (section === 'overdue' ? null : <button type="button">Act</button>));
    render(<MyScheduleList today="2026-10-04" blocks={[block(2, { scheduled_date: '2026-10-01', lifecycle_status: 'delayed', schedule_section: 'overdue' })]} renderActions={renderActions} />);

    const section = screen.getByTestId('schedule-overdue');
    expect(within(section).getByTestId('schedule-status')).toHaveTextContent(/overdue/i);
    expect(section).toHaveTextContent('This date has passed. Contact your operator.');
    expect(screen.queryByRole('button', { name: 'Act' })).not.toBeInTheDocument();
  });

  it('tucks finished earlier days under Past and hides cancelled blocks', () => {
    render(<MyScheduleList today="2026-10-04" blocks={[
      block(3, { scheduled_date: '2026-09-30', lifecycle_status: 'completed', schedule_section: 'past' }),
      block(4, { lifecycle_status: 'cancelled' }),
    ]} />);

    expect(screen.getByTestId('schedule-past')).toHaveTextContent('Past (1)');
    expect(screen.queryByTestId('schedule-today')).not.toBeInTheDocument();
  });

  it('says so when nothing is scheduled', () => {
    render(<MyScheduleList today="2026-10-04" blocks={[]} />);

    expect(screen.getByText('Nothing is scheduled for you.')).toBeInTheDocument();
  });

  it('never shows the old "My Shift Blocks" wording', () => {
    render(<MyScheduleList today="2026-10-04" blocks={[]} />);

    expect(screen.queryByText(/shift blocks/i)).not.toBeInTheDocument();
  });
});
