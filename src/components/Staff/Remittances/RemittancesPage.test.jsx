import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import RemittancesPage from './RemittancesPage';

const row = (over = {}) => ({
  id: 1, status: 'pending', declaration: 'declared', no_declaration: false,
  shift: { shift_log_id: 7, shift_date: '2026-10-05', started_at: '2026-10-05 06:00:00', ended_at: '2026-10-05 09:30:00', end_source: 'dashboard', conductor_name: 'Test Conductor', plate_number: 'XY-123', bus_label: 'Test Lines - B-1', route_name: 'Route One' },
  opening_cash: 100, cash_sales: 60, cash_refunds: 0, expected_cash: 160, expected_now: 160,
  declared_cash: 160, declared_at: '2026-10-05 09:30:00', confirmed_amount: null, confirmed_at: null, confirmed_by_name: null, note: null, ...over,
});

const page = (rows, meta = {}) => ({ data: { data: rows, meta: { page: 1, per_page: 20, total: rows.length, last_page: 1, status: 'pending', ...meta } } });

const makeService = (over = {}) => ({
  getRemittances: vi.fn().mockResolvedValue(page([row()])),
  confirmRemittance: vi.fn().mockResolvedValue({ data: row({ status: 'confirmed' }) }),
  ...over,
});

describe('RemittancesPage', () => {
  it('lists a pending batch with the shift, the figures and the Chauffeur\'s declared count', async () => {
    render(<RemittancesPage service={makeService()} />);

    const card = await screen.findByTestId('remittance-card');
    expect(card).toHaveTextContent('Test Conductor');
    expect(card).toHaveTextContent('XY-123');
    expect(card).toHaveTextContent('Test Lines - B-1');
    expect(card).toHaveTextContent('Route One');
    expect(card).toHaveTextContent('Oct 5, 2026 06:00');
    expect(card).toHaveTextContent('ended by the Chauffeur');
    expect(card).toHaveTextContent('160.00');
    expect(card).toHaveTextContent('The Chauffeur declared');
    expect(screen.queryByTestId('no-declaration')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Amount counted (PHP)')).toHaveValue(160); // prefilled: accept it as it is
  });

  it('confirms with the amount the Operator counted and the note', async () => {
    const service = makeService();
    render(<RemittancesPage service={service} />);
    await screen.findByTestId('remittance-card');

    fireEvent.change(screen.getByLabelText('Amount counted (PHP)'), { target: { value: '158.5' } });
    fireEvent.change(screen.getByLabelText('Note (optional)'), { target: { value: 'Counted at the office' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm remittance' }));

    await waitFor(() => expect(service.confirmRemittance).toHaveBeenCalledWith(1, { counted_amount: 158.5, note: 'Counted at the office' }));
    await waitFor(() => expect(service.getRemittances).toHaveBeenCalledTimes(2)); // the list reloads after confirming
  });

  it('shows a batch with no Conductor count apart, and makes the Operator enter the amount', async () => {
    const none = row({ declaration: 'none', no_declaration: true, declared_cash: null, shift: { ...row().shift, end_source: 'trip_status_change' } });
    render(<RemittancesPage service={makeService({ getRemittances: vi.fn().mockResolvedValue(page([none])) })} />);

    expect(await screen.findByTestId('no-declaration')).toHaveTextContent('No count from the Chauffeur');
    expect(screen.getByTestId('remittance-card')).toHaveTextContent('closed automatically');
    expect(screen.getByLabelText('Amount counted (PHP)')).toHaveValue(null);
    expect(screen.getByRole('button', { name: 'Confirm remittance' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Amount counted (PHP)'), { target: { value: '0' } });
    expect(screen.getByRole('button', { name: 'Confirm remittance' })).toBeEnabled(); // an honest 0 is allowed
    fireEvent.change(screen.getByLabelText('Amount counted (PHP)'), { target: { value: '-4' } });
    expect(screen.getByRole('button', { name: 'Confirm remittance' })).toBeDisabled();
  });

  it('shows a confirmed batch with who confirmed and when, and warns when the expected cash has moved since', async () => {
    const done = row({ status: 'confirmed', confirmed_amount: 158.5, confirmed_at: '2026-10-06 08:15:00', confirmed_by_name: 'Test Operator', expected_cash: 160, expected_now: 100, note: 'Counted at the office' });
    render(<RemittancesPage service={makeService({ getRemittances: vi.fn().mockResolvedValue(page([done], { status: 'confirmed' })) })} />);

    const card = await screen.findByTestId('remittance-card');
    expect(card).toHaveTextContent('Confirmed');
    expect(card).toHaveTextContent('158.50');
    expect(card).toHaveTextContent('Test Operator');
    expect(card).toHaveTextContent('Oct 6, 2026 08:15');
    expect(card).toHaveTextContent('Counted at the office');
    expect(card).toHaveTextContent('A refund was paid out after this was confirmed');
    expect(within(card).queryByRole('button', { name: 'Confirm remittance' })).not.toBeInTheDocument();
  });

  it('asks the server for the chosen status and says plainly when nothing is waiting', async () => {
    const service = makeService({ getRemittances: vi.fn().mockResolvedValue(page([])) });
    render(<RemittancesPage service={service} />);

    expect(await screen.findByTestId('remittances-empty')).toHaveTextContent('Nothing is waiting for you');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmed' }));
    await waitFor(() => expect(service.getRemittances).toHaveBeenLastCalledWith({ status: 'confirmed', page: 1 }));
    expect(await screen.findByText('No remittances to show.')).toBeInTheDocument();
  });

  it('shows a server refusal on the card, and a load error with a way to retry', async () => {
    const service = makeService({ confirmRemittance: vi.fn().mockRejectedValue(new Error('This remittance has already been confirmed.')) });
    render(<RemittancesPage service={service} />);
    await screen.findByTestId('remittance-card');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm remittance' }));
    expect(await screen.findByText('This remittance has already been confirmed.')).toBeInTheDocument();

    const failing = makeService({ getRemittances: vi.fn().mockRejectedValueOnce(new Error('Too many requests. Please slow down.')).mockResolvedValue(page([row()])) });
    render(<RemittancesPage service={failing} />);
    const alert = (await screen.findAllByText('Too many requests. Please slow down.'))[0];
    fireEvent.click(within(alert.closest('[role="alert"]')).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(failing.getRemittances).toHaveBeenCalledTimes(2));
  });
});
