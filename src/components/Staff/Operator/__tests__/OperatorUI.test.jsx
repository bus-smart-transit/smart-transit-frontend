import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { OpPageHeader, OpCard, OpChip, OpStat, OpBar, OpStackedBar, OpTable, OpEmpty } from '../OperatorUI';
import { toneOf, OP_TONES } from '../operatorUiTokens';

describe('Operator UI primitives', () => {
  it('page header renders the title, subtitle and a single action', () => {
    render(<OpPageHeader title="Fleets" subtitle="Your buses" action={<button type="button">Add fleet</button>} />);
    expect(screen.getByRole('heading', { name: 'Fleets' })).toBeInTheDocument();
    expect(screen.getByText('Your buses')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('card shows its title and badge', () => {
    render(<OpCard title="Alerts" badge={<OpChip tone="warning">2 open</OpChip>}>body</OpCard>);
    expect(screen.getByRole('heading', { name: 'Alerts' })).toBeInTheDocument();
    expect(screen.getByText('2 open')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('stat shows label, value and hint', () => {
    render(<OpStat label="Tickets sold" value={42} hint="today" />);
    expect(screen.getByText('Tickets sold')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('today')).toBeInTheDocument();
  });

  it('bar exposes its percentage and caps it at 100', () => {
    render(<><OpBar label="Route A" value={30} max={40} valueLabel="30 of 40" /><OpBar label="Route B" value={50} max={40} /></>);
    expect(screen.getByRole('progressbar', { name: 'Route A' })).toHaveAttribute('aria-valuenow', '75');
    expect(screen.getByRole('progressbar', { name: 'Route B' })).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('30 of 40')).toBeInTheDocument();
  });

  it('bar with no maximum shows 0 instead of dividing by zero', () => {
    render(<OpBar label="Empty" value={5} max={0} />);
    expect(screen.getByRole('progressbar', { name: 'Empty' })).toHaveAttribute('aria-valuenow', '0');
  });

  it('stacked bar writes every count in its legend', () => {
    render(<OpStackedBar segments={[{ key: 'a', label: 'Completed', value: 3, tone: 'success' }, { key: 'b', label: 'Delayed', value: 0, tone: 'danger' }]} />);
    const legend = screen.getByRole('list');
    expect(within(legend).getByText('Completed')).toBeInTheDocument();
    expect(within(legend).getByText('Delayed')).toBeInTheDocument();
  });

  it('table renders rows, custom cells and the empty state', () => {
    const columns = [{ key: 'name', header: 'Name' }, { key: 'n', header: 'Count', render: (row) => `${row.n} trips` }];
    const { rerender } = render(<OpTable columns={columns} rows={[{ id: 1, name: 'Davao - Tagum', n: 4 }]} rowKey={(row) => row.id} />);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByText('4 trips')).toBeInTheDocument();
    rerender(<OpTable columns={columns} rows={[]} rowKey={(row) => row.id} empty="No routes." />);
    expect(screen.getByText('No routes.')).toBeInTheDocument();
  });

  it('empty state is plain text', () => {
    render(<OpEmpty>Nothing here.</OpEmpty>);
    expect(screen.getByText('Nothing here.')).toBeInTheDocument();
  });

  it('unknown tones fall back to neutral', () => {
    expect(toneOf('nope')).toBe(OP_TONES.neutral);
  });
});
