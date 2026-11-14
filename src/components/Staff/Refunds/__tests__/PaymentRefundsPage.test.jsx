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

// 2026-11-08 (user): the Refunds tab is one table (GET operator/refunds). The server turns each payment into a row
// like this; the row's button opens the same details and forms as before.
const statusOf = (p) => (p.reconciliation_status === 'outcome_unknown' ? 'check_paymongo'
  : p.status === 'refunded' ? 'refunded' : p.automatic_refund_pending ? 'in_progress' : 'needs_refund');
const listRow = (p) => ({
  key: `payment-${p.payment_id}`, kind: 'payment', date: p.paid_at, transaction_reference: p.transaction_reference,
  passenger: p.payer.is_guest ? 'Guest' : (p.payer.name || 'Passenger'), email: p.payer.email,
  trip: 'Davao - Tagum, 2026-10-05 08:00', reason: p.reconciliation_status === 'outcome_unknown' ? 'Checkout unclear' : 'Paid, but no ticket was made',
  amount: p.amount, status: statusOf(p), needs_action: ['needs_refund', 'check_paymongo'].includes(statusOf(p)), detail: p,
});
const ticketRow = {
  key: 'ticket-5', kind: 'ticket', date: '2026-11-07T01:00:00Z', transaction_reference: 'TXN-REF1', passenger: 'Rider One', email: null,
  trip: 'Davao - Tagum, 2026-11-07 08:00', reason: 'Trip cancelled', amount: 57, status: 'refunded', needs_action: false,
  detail: { id: 5, ticket_uuid: 'u-1', route_name: 'Davao - Tagum', trip_date: '2026-11-07', departure_time: '08:00', passenger_name: 'Rider One', guest_email: null, transaction_reference: 'TXN-REF1', method: 'gateway', status: 'succeeded', amount: 47, fee_amount: 10, requested_at: '2026-11-07T01:00:00Z', completed_at: '2026-11-07T01:05:00Z', failure_reason: null },
};

const reply = (rows, status = 'all', counts = { all: rows.length, needs_action: rows.filter((r) => r.needs_action).length, in_progress: 0, refunded: 0, failed: 0 }) => ({
  data: { data: rows, meta: { page: 1, per_page: 20, total: rows.length, last_page: 1, status, counts } },
});

const makeService = (payments = [row()], extra = []) => ({
  getRefunds: vi.fn().mockResolvedValue(reply([...payments.map(listRow), ...extra])),
  recordPaymentRefund: vi.fn().mockResolvedValue({ data: row({ status: 'refunded' }) }),
  reconcileCheckoutNotCharged: vi.fn().mockResolvedValue({ data: { status: 'failed' } }),
});

/** Opens a row's details (the pop-up with the card and its form). */
const openRow = async (index = 0) => {
  const rows = await screen.findAllByTestId('refund-row');
  fireEvent.click(within(rows[index]).getByRole('button'));
  return screen.findByTestId(/^(refund-card|ticket-refund-card)$/);
};

describe('PaymentRefundsPage', () => {
  it('shows who was charged, for which trip, and the PayMongo references to find it by', async () => {
    render(<PaymentRefundsPage service={makeService()} embedded />);

    const tableRow = (await screen.findAllByTestId('refund-row'))[0];
    expect(tableRow).toHaveTextContent('TXN-ABC123DEF4');
    expect(tableRow).toHaveTextContent('Rider One');
    expect(within(tableRow).getByTestId('refund-row-status')).toHaveTextContent('Needs refund');

    const card = await openRow();
    expect(card).toHaveTextContent('TXN-ABC123DEF4');
    expect(card).toHaveTextContent('Rider One');
    expect(card).toHaveTextContent('rider@example.com');
    expect(card).toHaveTextContent('GCash');
    expect(card).toHaveTextContent('47.00');
    expect(card).toHaveTextContent('Davao - Tagum, 2026-10-05 08:00 (2 tickets)');
    expect(card).toHaveTextContent('pay_abc456');
    expect(card).toHaveTextContent('cs_checkout123');
    expect(within(card).getByTestId('refund-status')).toHaveTextContent('Needs refund');
  });

  it('says plainly that the passenger was charged, and that this screen does not move money', async () => {
    render(<PaymentRefundsPage service={makeService()} embedded />);
    await openRow();

    const reason = screen.getByTestId('refund-reason');
    expect(reason).toHaveTextContent('The passenger was charged');
    expect(reason).toHaveTextContent('does not move money');
  });

  // Batch 49 item 1: a "bus filled up" payment is refunded through PayMongo automatically.
  it('shows an automatic refund in progress with nothing to record by hand', async () => {
    render(<PaymentRefundsPage service={makeService([row({ automatic_refund_pending: true })])} embedded />);

    expect((await screen.findAllByTestId('refund-row-status'))[0]).toHaveTextContent('Refund in progress');
    const card = await openRow();
    expect(within(card).getByTestId('refund-status')).toHaveTextContent('Refund in progress');
    expect(screen.getByTestId('refund-automatic')).toHaveTextContent('sent back through PayMongo automatically');
    expect(within(card).queryByRole('button', { name: 'Record refund' })).not.toBeInTheDocument();
  });

  it('shows why an automatic refund needs a hand refund, and the form to record it', async () => {
    render(<PaymentRefundsPage service={makeService([row({ refund_note: 'Automatic refund failed. Refund it by hand.' })])} embedded />);
    const card = await openRow();

    expect(within(card).getByTestId('refund-reason')).toHaveTextContent('Automatic refund failed. Refund it by hand.');
    expect(within(card).getByRole('button', { name: 'Record refund' })).toBeInTheDocument();
  });

  it('says a refund was made automatically through PayMongo', async () => {
    const done = row({ status: 'refunded', refunded_automatically: true, refunded_at: '2026-10-05T03:00:00+00:00', refund_note: 'Refunded automatically through PayMongo (ref_1).' });
    render(<PaymentRefundsPage service={makeService([done])} embedded />);
    await openRow();

    expect(screen.getByTestId('refund-recorded')).toHaveTextContent('Refunded automatically through PayMongo on');
  });

  it('shows a guest by the email they paid with', async () => {
    const service = makeService([row({ payer: { is_guest: true, name: null, email: 'guest@example.com' } })]);
    render(<PaymentRefundsPage service={service} embedded />);

    expect((await screen.findAllByTestId('refund-row'))[0]).toHaveTextContent('Guestguest@example.com');
    expect(await openRow()).toHaveTextContent('Guest · guest@example.com');
  });

  it('will not record a refund without a reference, then sends the note once one is typed', async () => {
    const service = makeService();
    render(<PaymentRefundsPage service={service} embedded />);
    const card = await openRow();
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
    const card = await openRow();

    fireEvent.change(within(card).getByPlaceholderText('e.g. rf_...'), { target: { value: 'rf_abc789' } });
    fireEvent.click(within(card).getByRole('button', { name: 'Record refund' }));
    expect(await within(card).findByRole('alert')).toHaveTextContent('This payment is not waiting for a refund.');
    expect(service.getRefunds).toHaveBeenCalledTimes(1);

    fireEvent.click(within(card).getByRole('button', { name: 'Record refund' }));
    await waitFor(() => expect(service.getRefunds).toHaveBeenCalledTimes(2));
  });

  it('shows a refunded payment as recorded, with who and the reference, and no form', async () => {
    const service = makeService([row({ status: 'refunded', refunded_at: '2026-10-06T03:00:00+00:00', refund_note: 'rf_done999', refunded_by_name: 'Op Erator' })]);
    render(<PaymentRefundsPage service={service} embedded />);

    expect((await screen.findAllByTestId('refund-row-status'))[0]).toHaveTextContent('Refunded');
    await openRow();
    const recorded = screen.getByTestId('refund-recorded');
    expect(recorded).toHaveTextContent('Op Erator');
    expect(recorded).toHaveTextContent('rf_done999');
    expect(screen.queryByRole('button', { name: 'Record refund' })).toBeNull();
  });

  it('puts the counts on the filters, and asks the server for the chosen status', async () => {
    const service = makeService();
    service.getRefunds.mockResolvedValue(reply([listRow(row())], 'all', { all: 9, needs_action: 3, in_progress: 1, refunded: 5, failed: 0 }));
    render(<PaymentRefundsPage service={service} embedded />);

    expect(await screen.findByRole('option', { name: 'Needs action (3)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Refunded (5)' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'refunded' } });
    await waitFor(() => expect(service.getRefunds).toHaveBeenLastCalledWith({ status: 'refunded', page: 1 }));
  });

  it('requires verification before releasing an unknown checkout hold', async () => {
    const unknown = row({ status: 'pending', reconciliation_status: 'outcome_unknown', gateway_reference: null });
    const service = makeService([unknown]);
    render(<PaymentRefundsPage service={service} embedded />);

    expect((await screen.findAllByTestId('refund-row-status'))[0]).toHaveTextContent('Check PayMongo');
    const card = await openRow();
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
    expect(await screen.findByTestId('refunds-empty')).toHaveTextContent('No refunds yet');
    unmount();

    const failing = makeService();
    failing.getRefunds.mockRejectedValueOnce(new Error('Network down'));
    render(<PaymentRefundsPage service={failing} embedded />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Network down');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByTestId('refunds-table')).toBeInTheDocument();
  });
});

// 2026-11-08 (user): a cancelled-trip refund that succeeded was listed nowhere; now it is a row of the same table.
describe('PaymentRefundsPage: Cancelled trips', () => {
  it('lists the ticket refunds of cancelled trips, done ones included', async () => {
    const service = makeService([row()], [ticketRow]);
    render(<PaymentRefundsPage service={service} embedded />);

    const rows = await screen.findAllByTestId('refund-row');
    expect(rows[1]).toHaveTextContent('Trip cancelled');
    expect(within(rows[1]).getByTestId('refund-row-status')).toHaveTextContent('Refunded');

    const card = await openRow(1);
    expect(card).toHaveTextContent('Davao - Tagum, 2026-11-07 08:00');
    expect(card).toHaveTextContent('Rider One');
    expect(card).toHaveTextContent('57.00');
    expect(within(card).getByTestId('ticket-refund-status')).toHaveTextContent('Refunded');
    expect(screen.queryByTestId('ticket-refund-review')).not.toBeInTheDocument(); // a finished refund has no action
  });

  it('handles a refund waiting for review in the Review pop-up, filled in with the 90 percent amount (2026-11-14)', async () => {
    const review = {
      ...ticketRow, key: 'ticket-16', status: 'needs_review', needs_action: true, amount: 10,
      detail: { ...ticketRow.detail, id: 16, status: 'needs_review', amount: null, fare_paid: 138, suggested_amount: 124, completed_at: null },
    };
    const service = { ...makeService([], [review]), reviewRefund: vi.fn().mockResolvedValue({}) };
    render(<PaymentRefundsPage service={service} embedded />);

    const rows = await screen.findAllByTestId('refund-row');
    fireEvent.click(within(rows[0]).getByRole('button', { name: 'Review' }));
    const form = await screen.findByTestId('ticket-refund-review');
    expect(form).toHaveTextContent('PHP 138.00');
    expect(within(form).getByLabelText(/Refund amount/)).toHaveValue(124);
    fireEvent.click(within(form).getByRole('button', { name: 'Save and refund' }));
    await waitFor(() => expect(service.reviewRefund).toHaveBeenCalledWith(16, 124, expect.stringContaining('10%')));
    await waitFor(() => expect(service.getRefunds).toHaveBeenCalledTimes(2)); // the table reloads
  });
});
