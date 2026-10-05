import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import FinancialsPage from './FinancialsPage';

const summary = (over = {}) => ({
  filters: { from: '2026-10-05', to: '2026-10-05' },
  currency: 'PHP',
  kpis: {
    gross: 1000, refunds: 150, net: 850, tickets: 8, average_fare: 125, boarded: 3,
    cash: { gross: 250, refunds: 0, net: 250, tickets: 2, percent: 25 },
    online: { gross: 750, refunds: 150, net: 600, tickets: 6, percent: 75 },
  },
  channels: [
    { method: 'online', channel: 'gcash', label: 'GCash', tickets: 6, gross: 750, refunds: 150, net: 600, percent: 75 },
    { method: 'cash', channel: 'onsite', label: 'Cash', tickets: 2, gross: 250, refunds: 0, net: 250, percent: 25 },
  ],
  by_route: [{ route_id: 1, route_name: 'Route One', tickets: 8, gross: 1000, refunds: 150, net: 850 }],
  by_bus: [{ fleet_id: 4, plate_number: 'XY-123', bus_label: 'Test Lines - B-1', tickets: 8, gross: 1000, refunds: 150, net: 850 }],
  by_trip: [{ trip_id: 9, trip_date: '2026-10-05', departure_time: '08:00', route_name: 'Route One', plate_number: 'XY-123', shift_block_id: 3, direction: 'outbound', tickets: 8, gross: 1000, refunds: 150, net: 850 }],
  by_hour: Array.from({ length: 24 }, (_, hour) => ({ hour, label: `${String(hour).padStart(2, '0')}:00`, tickets: hour === 8 ? 8 : 0, gross: hour === 8 ? 1000 : 0 })),
  daily: [],
  options: {
    routes: [{ route_id: 1, route_name: 'Route One' }],
    fleets: [{ fleet_id: 4, plate_number: 'XY-123', bus_label: 'Test Lines - B-1' }],
    trips: [{ trip_id: 9, label: '2026-10-05 08:00 Route One XY-123' }],
    channels: [{ method: 'online', channel: 'gcash', label: 'GCash' }, { method: 'cash', channel: 'onsite', label: 'Cash' }],
  },
  ...over,
});

const logRow = (over = {}) => ({
  ticket_id: 1, transaction_id: 'TX-ABC', paid_at: '2026-10-05 06:04:44', plate_number: 'XY-123', bus_label: 'Test Lines - B-1', route_name: 'Route One',
  direction: 'outbound', direction_label: 'Alpha to Omega', trip_id: 9, trip_date: '2026-10-05', method: 'online', method_label: 'Online', channel: 'gcash',
  channel_label: 'GCash', service_type: 'regular', seat_type: 'seated', amount: 125, refunded: 0, status: 'paid', status_label: 'Paid', ...over,
});

const logPage = (rows = [logRow()], meta = {}) => ({ data: { data: rows, meta: { page: 1, per_page: 25, total: rows.length, last_page: 1, sort: 'paid_at', dir: 'desc', ...meta } } });

const makeService = (over = {}) => ({
  getFinancials: vi.fn().mockResolvedValue({ data: summary() }),
  getFinancialTransactions: vi.fn().mockResolvedValue(logPage()),
  downloadFinancialExport: vi.fn().mockResolvedValue('a,b\r\n1,2\r\n'),
  ...over,
});

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
});

describe('FinancialsPage', () => {
  it('shows the KPI cards, channels, breakdowns and the log from the server figures, with no raw JSON', async () => {
    const service = makeService();
    const { container } = render(<FinancialsPage service={service} />);

    await waitFor(() => expect(screen.getByTestId('kpi-gross')).toHaveTextContent('1,000.00'));
    expect(screen.getByTestId('kpi-refunds')).toHaveTextContent('150.00');
    expect(screen.getByTestId('kpi-net')).toHaveTextContent('850.00');
    expect(screen.getByTestId('kpi-tickets')).toHaveTextContent('8');
    expect(screen.getByTestId('kpi-tickets')).toHaveTextContent('3 boarded');
    expect(screen.getByTestId('kpi-average')).toHaveTextContent('125.00');
    expect(screen.getByTestId('kpi-split')).toHaveTextContent('25%');
    expect(screen.getByTestId('kpi-split')).toHaveTextContent('75%');

    const channels = screen.getByRole('region', { name: 'Payment channels' });
    expect(within(channels).getByText('GCash')).toBeInTheDocument();
    expect(within(channels).queryByText('Maya')).not.toBeInTheDocument(); // no method without data
    expect(screen.getByRole('region', { name: 'By route' })).toHaveTextContent('Route One');
    expect(screen.getByRole('region', { name: 'By bus' })).toHaveTextContent('Test Lines - B-1');
    expect(screen.getByRole('region', { name: 'By trip' })).toHaveTextContent('Block #3');
    expect(screen.getAllByTestId('hour-bar')).toHaveLength(24);

    await waitFor(() => expect(screen.getByTestId('transaction-row')).toHaveTextContent('Oct 5, 2026 06:04'));
    expect(screen.getByTestId('transaction-row')).toHaveTextContent('Alpha to Omega');
    expect(screen.getByTestId('transaction-row')).toHaveTextContent('Paid');

    expect(container.textContent).not.toMatch(/[{}]|"[a-z_]+":|\[object/);
    expect(container.textContent).not.toMatch(/discount|override|remittance/i); // nothing is built for these: no placeholder cards
  });

  it('says so, with the reason, when the range has no paid tickets', async () => {
    const empty = summary({ kpis: { gross: 0, refunds: 0, net: 0, tickets: 0, average_fare: 0, boarded: 0, cash: { gross: 0, percent: 0 }, online: { gross: 0, percent: 0 } }, channels: [], by_route: [], by_bus: [], by_trip: [] });
    const service = makeService({ getFinancials: vi.fn().mockResolvedValue({ data: empty }), getFinancialTransactions: vi.fn().mockResolvedValue(logPage([])) });
    render(<FinancialsPage service={service} />);

    expect(await screen.findByTestId('financial-empty')).toHaveTextContent('No paid tickets in this range');
    expect(await screen.findByText('No paid tickets match these filters.')).toBeInTheDocument();
  });

  it('shows a loading state, then an error with a way to retry', async () => {
    const getFinancials = vi.fn().mockRejectedValueOnce(new Error('Too many requests. Please slow down.')).mockResolvedValue({ data: summary() });
    render(<FinancialsPage service={makeService({ getFinancials })} />);

    expect(screen.getByText('Loading the figures...')).toBeInTheDocument();
    const alert = await screen.findByText('Too many requests. Please slow down.');
    fireEvent.click(within(alert.closest('[role="alert"]')).getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.getByTestId('kpi-gross')).toHaveTextContent('1,000.00'));
    expect(getFinancials).toHaveBeenCalledTimes(2);
  });

  it('sends the chosen filters to the server and goes back to page 1', async () => {
    const service = makeService();
    render(<FinancialsPage service={service} />);
    await screen.findByTestId('kpi-gross');

    fireEvent.change(screen.getByLabelText('Route'), { target: { value: '1' } });
    await waitFor(() => expect(service.getFinancials).toHaveBeenLastCalledWith(expect.objectContaining({ route_id: '1' })));

    fireEvent.change(screen.getByLabelText('Payment'), { target: { value: 'method:cash' } });
    await waitFor(() => expect(service.getFinancials).toHaveBeenLastCalledWith(expect.objectContaining({ route_id: '1', payment_method: 'cash' })));
    expect(service.getFinancials.mock.lastCall[0]).not.toHaveProperty('channel');

    fireEvent.change(screen.getByLabelText('Payment'), { target: { value: 'channel:gcash' } });
    await waitFor(() => expect(service.getFinancials).toHaveBeenLastCalledWith(expect.objectContaining({ channel: 'gcash' })));
    expect(service.getFinancials.mock.lastCall[0]).not.toHaveProperty('payment_method');

    fireEvent.click(screen.getByRole('button', { name: 'Yesterday' }));
    await waitFor(() => {
      const [{ from, to }] = service.getFinancials.mock.lastCall;
      expect(from).toBe(to);
    });
  });

  it('sorts the log on the server by the clicked column, toggling the direction', async () => {
    const service = makeService();
    render(<FinancialsPage service={service} />);
    await screen.findByTestId('transaction-row');

    fireEvent.click(screen.getByRole('button', { name: 'Fare' }));
    await waitFor(() => expect(service.getFinancialTransactions).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'amount', dir: 'desc', page: 1 })));
    fireEvent.click(screen.getByRole('button', { name: 'Fare' }));
    await waitFor(() => expect(service.getFinancialTransactions).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'amount', dir: 'asc' })));
  });

  it('pages through the log on the server', async () => {
    const service = makeService({ getFinancialTransactions: vi.fn().mockResolvedValue(logPage([logRow()], { total: 60, last_page: 3, per_page: 25 })) });
    render(<FinancialsPage service={service} />);
    await screen.findByText('Page 1 of 3');

    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    await waitFor(() => expect(service.getFinancialTransactions).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
    expect(screen.getByRole('button', { name: /Previous/ })).toBeDisabled();
  });

  it('downloads the CSV the server builds, for the transactions and for the daily summary', async () => {
    const service = makeService();
    render(<FinancialsPage service={service} />);
    await screen.findByTestId('kpi-gross');

    fireEvent.click(screen.getByRole('button', { name: 'Export transactions (CSV)' }));
    await waitFor(() => expect(service.downloadFinancialExport).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'transactions' })));
    fireEvent.click(screen.getByRole('button', { name: 'Export daily summary (CSV)' }));
    await waitFor(() => expect(service.downloadFinancialExport).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'daily' })));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
  });

  it('shows an export failure as a message, not as a file', async () => {
    const service = makeService({ downloadFinancialExport: vi.fn().mockRejectedValue(new Error('Too many requests. Please slow down.')) });
    render(<FinancialsPage service={service} />);
    await screen.findByTestId('kpi-gross');

    fireEvent.click(screen.getByRole('button', { name: 'Export transactions (CSV)' }));
    expect(await screen.findByText('Too many requests. Please slow down.')).toBeInTheDocument();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('marks refunded and partially refunded tickets and shows the refunded amount', async () => {
    const rows = [logRow({ ticket_id: 1, status: 'refunded', status_label: 'Refunded', refunded: 125 }), logRow({ ticket_id: 2, status: 'partially_refunded', status_label: 'Partially refunded', refunded: 40 })];
    render(<FinancialsPage service={makeService({ getFinancialTransactions: vi.fn().mockResolvedValue(logPage(rows)) })} />);

    const table = await screen.findAllByTestId('transaction-row');
    expect(table[0]).toHaveTextContent('Refunded');
    expect(table[1]).toHaveTextContent('Partially refunded');
    expect(table[1]).toHaveTextContent('40.00');
  });
});
