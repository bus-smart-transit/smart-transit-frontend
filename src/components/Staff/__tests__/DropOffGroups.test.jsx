import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DropOffGroups from '../DropOffGroups';

const groups = [
  { key: 'stop:2', destination: 'Maa', alighting_count: 2, not_boarded_count: 1, ticket_ids: [10, 11] },
  { key: 'stop:3', destination: 'Tagum', alighting_count: 1, not_boarded_count: 0, ticket_ids: [12] },
];
const passengers = [
  { ticket_id: 10, passenger_name: 'Ana' },
  { ticket_id: 11, passenger_name: 'Ben' },
  { ticket_id: 12, passenger_name: 'Cy' },
];

describe('DropOffGroups', () => {
  it('shows each destination with how many get off there', () => {
    render(<DropOffGroups groups={groups} passengers={passengers} onConfirm={vi.fn()} />);

    const rows = screen.getAllByTestId('drop-off-group');
    expect(rows[0]).toHaveTextContent('Maa');
    expect(rows[0]).toHaveTextContent('2 passengers get off here');
    expect(rows[0]).toHaveTextContent('1 ticket not scanned yet');
    expect(rows[1]).toHaveTextContent('1 passenger gets off here');
  });

  it('confirms the whole group in one action', async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);
    render(<DropOffGroups groups={groups} passengers={passengers} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: 'Confirm 2 got off at Maa' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(groups[0], [10, 11]));
  });

  it('leaves out a passenger who stayed on', async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);
    render(<DropOffGroups groups={groups} passengers={passengers} onConfirm={onConfirm} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Someone stayed on?' })[0]);
    fireEvent.click(screen.getByLabelText(/Ben/));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm 1 got off at Maa' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(groups[0], [10]));
  });

  it('cannot confirm before pairing', () => {
    render(<DropOffGroups groups={groups} passengers={passengers} disabled disabledReason="Pair first." onConfirm={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Confirm 2 got off at Maa' })).toBeDisabled();
  });
});
