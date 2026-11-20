import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditRouteModal from '../EditRouteModal';

// 2026-11-20 (user): Edit route sends only what changed. SAMPLE places.
const route = {
  route_id: 7, route_name: 'Old Name', origin: 'Alpha', destination: 'Gamma',
  route_stops: [
    { id: 30, stop_id: 3, stop_order: 3, stop: { stop_name: 'Gamma Stop' } },
    { id: 10, stop_id: 1, stop_order: 1, stop: { stop_name: 'Alpha Stop' } },
    { id: 20, stop_id: 2, stop_order: 2, stop: { stop_name: 'Beta Stop' } },
  ],
};

const renderModal = (onSave = vi.fn().mockResolvedValue(undefined)) => {
  render(<EditRouteModal open route={route} onClose={() => {}} onSave={onSave} />);
  return onSave;
};

describe('EditRouteModal', () => {
  it('lists the stops in order and keeps Save off until something changes', () => {
    renderModal();
    const items = screen.getByTestId('edit-route-stops').querySelectorAll('li');
    expect([...items].map((li) => li.textContent)).toEqual(['1Alpha Stop', '2Beta Stop', '3Gamma Stop']);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Alpha Stop up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Gamma Stop down' })).toBeDisabled();
  });

  it('sends the new name only when the stop order did not change', async () => {
    const onSave = renderModal();
    fireEvent.change(screen.getByLabelText('Route name'), { target: { value: 'New Name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ details: { route_name: 'New Name' }, order: null }));
  });

  it('sends the new stop order after a move', async () => {
    const onSave = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Move Gamma Stop up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ details: {}, order: [10, 30, 20] }));
  });

  it('shows the server message when saving fails', async () => {
    renderModal(vi.fn().mockRejectedValue(new Error('1 upcoming trip of this route already has tickets sold.')));
    fireEvent.click(screen.getByRole('button', { name: 'Move Beta Stop down' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('1 upcoming trip of this route already has tickets sold.');
  });
});
