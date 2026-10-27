import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import LegTimeEditor from '../LegTimeEditor';

const legs = [
  { trip_id: 12, departure_time: '07:10:00', status: 'scheduled' },
  { trip_id: 11, departure_time: '06:00:00', status: 'boarding' },
];

describe('LegTimeEditor', () => {
  it('lists the legs in time order and lets only a leg that has not started be moved', () => {
    render(<LegTimeEditor legs={legs} onSave={vi.fn()} />);

    expect(screen.getByLabelText('Leg 1')).toHaveValue('06:00');
    expect(screen.getByLabelText('Leg 1')).toBeDisabled();
    expect(screen.getByText('Started, cannot be moved')).toBeInTheDocument();
    expect(screen.getByLabelText('Leg 2')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Save time' })).toBeDisabled();
  });

  it('sends the new time and shows the answer beside the leg', async () => {
    const onSave = vi.fn().mockResolvedValue({ ok: true, message: 'Leg moved to 07:30. The crew was told.' });
    render(<LegTimeEditor legs={legs} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('Leg 2'), { target: { value: '07:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save time' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Leg moved to 07:30');
    expect(onSave).toHaveBeenCalledWith(12, '07:30');
  });

  it('shows the server reason when the move is refused', async () => {
    const onSave = vi.fn().mockResolvedValue({ ok: false, message: 'The legs must stay in order. Move the next leg first.' });
    render(<LegTimeEditor legs={legs} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('Leg 2'), { target: { value: '05:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save time' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('must stay in order');
  });
});
