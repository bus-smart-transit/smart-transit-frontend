import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import FinancePage from '../FinancePage';
import { viewsForRole } from '../../../../utils/operatorNav';

const summary = () => ({
  filters: { from: '2026-10-05', to: '2026-10-05' },
  currency: 'PHP',
  kpis: {
    gross: 1000, refunds: 0, net: 1000, tickets: 8, average_fare: 125, boarded: 3,
    cash: { gross: 250, refunds: 0, net: 250, tickets: 2, percent: 25 },
    online: { gross: 750, refunds: 0, net: 750, tickets: 6, percent: 75 },
  },
  channels: [{ method: 'cash', channel: 'onsite', label: 'Cash', tickets: 2, gross: 250, refunds: 0, net: 250, percent: 25 }],
  by_route: [{ route_id: 1, route_name: 'Route One', tickets: 8, gross: 1000, refunds: 0, net: 1000 }],
  by_bus: [], by_trip: [],
  by_hour: Array.from({ length: 24 }, (_, hour) => ({ hour, label: `${String(hour).padStart(2, '0')}:00`, tickets: 0, gross: 0 })),
  daily: [],
  options: { routes: [], fleets: [], trips: [], channels: [] },
});

const remittance = () => ({
  id: 1, status: 'pending', declaration: 'declared', no_declaration: false,
  shift: { shift_log_id: 7, shift_date: '2026-10-05', started_at: '2026-10-05 06:00:00', ended_at: '2026-10-05 09:30:00', end_source: 'dashboard', conductor_name: 'Test Conductor', plate_number: 'XY-123', bus_label: 'Test Lines - B-1', route_name: 'Route One' },
  opening_cash: 100, cash_sales: 60, cash_refunds: 0, expected_cash: 160, expected_now: 160, declared_cash: 160, declared_at: '2026-10-05 09:30:00', confirmed_amount: null, confirmed_at: null, confirmed_by_name: null, note: null,
});

const makeService = () => ({
  getFinancials: vi.fn().mockResolvedValue({ data: summary() }),
  getFinancialTransactions: vi.fn().mockResolvedValue({ data: { data: [], meta: { page: 1, per_page: 25, total: 0, last_page: 1, sort: 'paid_at', dir: 'desc' } } }),
  downloadFinancialExport: vi.fn(),
  getRemittances: vi.fn().mockResolvedValue({ data: { data: [remittance()], meta: { page: 1, per_page: 20, total: 1, last_page: 1, status: 'pending' } } }),
  confirmRemittance: vi.fn(),
});

const views = viewsForRole('finance', 'operator');
const renderPage = (view, service = makeService(), v = views) => {
  const onViewChange = vi.fn();
  const utils = render(<FinancePage views={v} view={view} onViewChange={onViewChange} service={service} />);
  return { ...utils, service, onViewChange };
};

describe('FinancePage', () => {
  it('has one heading and the Overview, Transactions, Remittances and Refunds tabs', async () => {
    renderPage('overview');
    expect(screen.getByRole('heading', { name: 'Finance' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Overview', 'Transactions', 'Remittances', 'Refunds']);
    await screen.findByTestId('kpi-gross');
  });

  it('Overview shows the figures and charts, not the transaction log', async () => {
    renderPage('overview');
    expect(await screen.findByTestId('kpi-gross')).toHaveTextContent('1,000.00');
    expect(screen.getByRole('region', { name: 'Filters' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'By route' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Transactions' })).not.toBeInTheDocument();
  });

  it('Transactions shows the log under the same filters, without the figures', async () => {
    renderPage('transactions');
    expect(await screen.findByRole('region', { name: 'Transactions' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Filters' })).toBeInTheDocument();
    expect(screen.queryByTestId('kpi-gross')).not.toBeInTheDocument();
  });

  it('Remittances shows the existing remittance list, with no second heading', async () => {
    renderPage('remittances');
    const card = await screen.findByTestId('remittance-card');
    expect(card).toHaveTextContent('Test Conductor');
    expect(card).toHaveTextContent('160.00');
    expect(screen.queryByText('Not yet available')).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
  });

  it('Refunds shows the payments that need a refund, with no second heading', async () => {
    const service = makeService();
    service.getUnfulfilledPayments = vi.fn().mockResolvedValue({ data: { data: [], meta: { page: 1, per_page: 20, total: 0, last_page: 1, status: 'needs_refund', counts: { needs_refund: 0, refunded: 0 } } } });
    renderPage('refunds', service);
    expect(await screen.findByTestId('refunds-empty')).toHaveTextContent('Nothing needs a refund');
    expect(service.getUnfulfilledPayments).toHaveBeenCalledWith({ status: 'needs_refund', page: 1 });
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
  });

  it('asks the parent to switch tab when one is clicked', async () => {
    const { onViewChange } = renderPage('overview');
    await screen.findByTestId('kpi-gross');
    fireEvent.click(screen.getByRole('tab', { name: 'Remittances' }));
    expect(onViewChange).toHaveBeenCalledWith('remittances');
  });

  it('shows only the tabs the role may see, and nothing at all when there are none', async () => {
    const { container, service } = renderPage('remittances', makeService(), views.filter((v) => v.key !== 'remittances'));
    expect(screen.queryByRole('tab', { name: 'Remittances' })).not.toBeInTheDocument();
    await waitFor(() => expect(service.getFinancials).toHaveBeenCalled()); // falls back to the first permitted tab
    expect(service.getRemittances).not.toHaveBeenCalled();
    expect(screen.queryByTestId('remittance-card')).not.toBeInTheDocument();

    const none = render(<FinancePage views={viewsForRole('finance', 'conductor')} view="overview" onViewChange={vi.fn()} service={makeService()} />);
    expect(none.container).toBeEmptyDOMElement();
    expect(container).not.toBeEmptyDOMElement();
  });
});
