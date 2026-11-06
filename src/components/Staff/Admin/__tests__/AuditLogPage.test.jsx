import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import AuditLogPage from '../AuditLogPage';
import { detailText } from '../../../../utils/auditDetails';

const entries = [
  { audit_id: 2, at: '2026-11-05T01:00:00Z', action: 'company.rename', who: { name: 'Ada Admin', username: 'ada', role_label: 'Super Admin' }, subject: 'Company 1', details: { from: 'Old Co', to: 'New Co' } },
  { audit_id: 1, at: '2026-11-03T01:00:00Z', action: 'refund.reconcile', who: { name: 'System', username: null, role_label: 'System' }, subject: null, details: null },
];
const tab = (extra = {}) => ({ entries, pagination: { page: 1, per_page: 25, total: 2, last_page: 1 }, loading: false, error: '', actionText: '', setActionText: vi.fn(), role: '', setRole: vi.fn(), from: '', setFrom: vi.fn(), to: '', setTo: vi.fn(), setPage: vi.fn(), ...extra });

describe('AuditLogPage', () => {
  it('shows when (Manila time), who, the action, the item and the details', () => {
    render(<AuditLogPage auditTab={tab()} />);
    const row = screen.getByText('company.rename').closest('tr');
    expect(within(row).getByText('2026/11/05 - 09:00')).toBeInTheDocument();
    expect(within(row).getByText('Ada Admin')).toBeInTheDocument();
    expect(within(row).getByText('from: Old Co · to: New Co')).toBeInTheDocument();
    expect(within(screen.getByText('refund.reconcile').closest('tr')).getAllByText('-').length).toBeGreaterThan(0);
  });

  it('passes the filters to the hook', () => {
    const t = tab();
    render(<AuditLogPage auditTab={t} />);
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'system' } });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-11-01' } });
    expect(t.setRole).toHaveBeenCalledWith('system');
    expect(t.setFrom).toHaveBeenCalledWith('2026-11-01');
  });

  it('writes details as short lines and nothing for none', () => {
    expect(detailText({ role: 'operator', ids: { userId: 3 }, empty: null })).toBe('role: operator · ids: {"userId":3}');
    expect(detailText(null)).toBe('');
  });
});
