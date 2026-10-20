import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PaymentRefundsPage from '../PaymentRefundsPage';

const row = (over = {}) => ({
  payment_id: 31,
  transaction_reference: 'TXN-ABC123DEF4',
  status: 'needs_refund',
  amount: 47,
  payment_channel: 'gcash',
  paid_at: '2026-10-05T02:10:00+00:00',
  payer: { is_guest: false, name: 'Rider One', email: 'rider@example.com' },
  trips: [{ trip_id: 5, trip_date: '2026-10-05', departure_time: '08:00:00', trip_status: 'scheduled', route_name: 'Davao - Tagum', tickets: 2 }],
  gateway_reference: 'cs_checkout123',
  gateway_payment_id: 'pay_abc456',
  reason: 'The payment arrived after the seats were released and no ticket could be issued.',
  refunded_at: null,
  refund_note: null,
  refunded_by_name: null,
  ...over,
});

const reply = (rows, status = 'needs_refund', counts = { needs_refund: rows.length, refunded: 0, outcome_unknown: 0 }) => ({
  data: { data: rows, meta: { page: 1, per_page: 20, total: rows.length, last_page: 1, status, counts } },
});

const makeService = (rows = [row()]) => ({
  getUnfulfilledPayments: vi.fn().mockResolvedValue(reply(rows)),
  recordPaymentRefund: vi.fn().mockResolvedValue({ data: row({ status: 'refunded' }) }),
  reconcileCheckoutNotCharged: vi.fn().mockResolvedValue({ data: { status: 'failed' } }),
});

describe('PaymentRefundsPage', () => {
  it('shows who was charged, for which trip, and the PayMongo references to find it by', async () => {
    render(<PaymentRefundsPage service={makeService()} embedded />);

    const card = await screen.findByTestId('refund-card');
    expect(card).toHaveTextContent('TXN-ABC123DEF4');
    expect(card).toHaveTextContent('Rider One');
    expect(card).toHaveTextContent('rider@example.com');
    expect(card).toHaveTextContent('GCash');
    expect(card).toHaveTextContent('47.00');
    expect(card).toHaveTextContent('Davao - Tagum, 2026-10-05 08:00 (2 tickets)');
    expect(card).toHaveTextContent('pay_abc456');
    expect(card).toHaveTextContent('cs_checkout123');
    expect(screen.getByTestId('refund-status')).toHaveTextContent('Needs refund');
  });

  it('says plainly that the passenger was charged, and that this screen does not move money', async () => {
    render(<PaymentRefundsPage service={makeService()} embedded />);

    const reason = await screen.findByTestId('refund-reason');
    expect(reason).toHaveTextContent('The passenger was charged');
    expect(reason).toHaveTextContent('does not move money');
  });

  it('shows a guest by the email they paid with', async () => {
    const service = makeService([row({ payer: { is_guest: true, name: null, email: 'guest@example.com' } })]);
    render(<PaymentRefundsPage service={service} embedded />);

    expect(await screen.findByTestId('refund-card')).toHaveTextContent('Guest · guest@example.com');
  });

  it('will not record a refund without a reference, then sends the note once one is typed', async () => {
    const service = makeService();
    render(<PaymentRefundsPage service={service} embedded />);
    const card = await screen.findByTestId('refund-card');
    const button = within(card).getByRole('button', { name: 'Record refund' });

    expect(button).toBeDisabled();
    fireEvent.change(within(card).getByPlaceholderText('e.g. rf_...'), { target: { value: '  rf_abc789  ' } });
    expect(button).toBeEnabled();
    fireEvent.click(button);

    await waitFor(() => expect(service.recordPaymentRefund).toHaveBeenCalledWith(31, { note: 'rf_abc789' }));
  });

  it('reloads the list after recording, and shows the server message when it is refused', async () => {
    const service = makeService();
    service.recordPaymentRefund.mockRejectedValueOnce(new Error('This payment is not waiting for a refund.'));
    render(<PaymentRefundsPage service={service} embedded />);
    const card = await screen.findByTestId('refund-card');

    fireEvent.change(within(card).getByPlaceholderText('e.g. rf_...'), { target: { value: 'rf_abc789' } });
    fireEvent.click(within(card).getByRole('button', { name: 'Record refund' }));
    expect(await within(card).findByRole('alert')).toHaveTextContent('This payment is not waiting for a refund.');
    expect(service.getUnfulfilledPayments).toHaveBeenCalledTimes(1);

    fireEvent.click(within(card).getByRole('button', { name: 'Record refund' }));
    await waitFor(() => expect(service.getUnfulfilledPayments).toHaveBeenCalledTimes(2));
  });

  it('shows a refunded payment as recorded, with who and the reference, and no form', async () => {
    const service = makeService();
    service.getUnfulfilledPayments.mockResolvedValue(reply([row({ status: 'refunded', refunded_at: '2026-10-06T03:00:00+00:00', refund_note: 'rf_done999', refunded_by_name: 'Op Erator' })], 'refunded', { needs_refund: 0, refunded: 1 }));
    render(<PaymentRefundsPage service={service} embedded />);

    fireEvent.click(await screen.findByRole('button', { name: /^Refunded/ }));
    const recorded = await screen.findByTestId('refund-recorded');
    expect(recorded).toHaveTextContent('Op Erator');
    expect(recorded).toHaveTextContent('rf_done999');
    expect(screen.queryByRole('button', { name: 'Record refund' })).toBeNull();
  });

  it('puts the counts on the filters, and asks the server for the chosen status', async () => {
    const service = makeService();
    service.getUnfulfilledPayments.mockResolvedValue(reply([row()], 'needs_refund', { needs_refund: 3, refunded: 5 }));
    render(<PaymentRefundsPage service={service} embedded />);

    expect(await screen.findByRole('button', { name: 'Needs refund (3)' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refunded (5)' }));
    await waitFor(() => expect(service.getUnfulfilledPayments).toHaveBeenLastCalledWith({ status: 'refunded', page: 1 }));
  });

  it('requires verification before releasing an unknown checkout hold', async () => {
    const service = makeService([]);
    const unknown = row({ status: 'pending', reconciliation_status: 'outcome_unknown', gateway_reference: null });
    service.getUnfulfilledPayments.mockResolvedValue(reply([unknown], 'outcome_unknown', { needs_refund: 0, refunded: 0, outcome_unknown: 1 }));
    render(<PaymentRefundsPage service={service} embedded />);

    fireEvent.click(await screen.findByRole('button', { name: 'Unknown checkout (1)' }));
    const card = await screen.findByTestId('refund-card');
    expect(within(card).getByTestId('refund-status')).toHaveTextContent('Outcome unknown');
    expect(within(card).getByTestId('checkout-outcome-warning')).toHaveTextContent('signed webhooks alone mark payments paid');

    const submit = within(card).getByRole('button', { name: 'Confirm not charged and release hold' });
    const note = within(card).getByPlaceholderText('What did you verify in PayMongo?');
    const confirmation = within(card).getByLabelText('I verified this checkout was not charged and has no active session.');
    expect(submit).toBeDisabled();

    fireEvent.change(note, { target: { value: 'Verified no charge in PayMongo' } });
    expect(submit).toBeDisabled();
    fireEvent.click(confirmation);
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await waitFor(() => expect(service.reconcileCheckoutNotCharged).toHaveBeenCalledWith(31, { note: 'Verified no charge in PayMongo' }));
    expect(service.recordPaymentRefund).not.toHaveBeenCalled();
  });

  it('says nothing needs a refund when the list is empty, and offers a retry when loading fails', async () => {
    const empty = makeService([]);
    const { unmount } = render(<PaymentRefundsPage service={empty} embedded />);
    expect(await screen.findByTestId('refunds-empty')).toHaveTextContent('Nothing needs a refund');
    unmount();

    const failing = makeService();
    failing.getUnfulfilledPayments.mockRejectedValueOnce(new Error('Network down'));
    render(<PaymentRefundsPage service={failing} embedded />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Network down');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByTestId('refund-card')).toBeInTheDocument();
  });
});
