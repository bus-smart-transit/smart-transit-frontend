import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../../api/StaffService/OperatorService', () => ({
  default: {
    getStaffPage: vi.fn(),
    createEmployeeAccount: vi.fn(),
    updateStaff: vi.fn(),
    deactivateStaff: vi.fn(),
    reactivateStaff: vi.fn(),
  },
}));

import OperatorService from '../../../../api/StaffService/OperatorService';
import StaffDirectory from '../StaffDirectory';
import { CompanyAdminContext } from '../companyAdmin';
import { SEARCH_DEBOUNCE_MS } from '../../../../api/hooks/Staff/useStaffDirectory';

// Batch 46: the Operator's Staff Directory.

const juan = { company_user_id: 7, name: 'Juan Dela Cruz', username: 'juan', email: 'juan@example.com', phone_num: '+639171234567', role: 'driver', role_label: 'Driver', is_available: true, deactivated: false, joined_at: '2026-11-01T02:00:00Z' };
const ana = { company_user_id: 8, name: 'Ana Reyes', username: 'ana', email: 'ana@example.com', phone_num: '+639170001111', role: 'conductor', role_label: 'Chauffeur', is_available: false, deactivated: false, joined_at: '2026-11-02T02:00:00Z' };

const page = (staff, total = staff.length, extra = {}) => ({
  data: { staff, pagination: { page: 1, per_page: 10, total, last_page: Math.max(1, Math.ceil(total / 10)) }, totals: { driver: 12, conductor: 3 }, ...extra },
});

beforeEach(() => {
  vi.clearAllMocks();
  OperatorService.getStaffPage.mockResolvedValue(page([juan, ana], 15));
});
afterEach(() => vi.useRealTimers());

describe('StaffDirectory', () => {
  test('shows the roster counts of the whole list, the page footer, Chauffeur and the read-only availability', async () => {
    render(<StaffDirectory fleetCount={4} />);

    expect(await screen.findByText('Juan Dela Cruz')).toBeInTheDocument();
    const roster = screen.getByTestId('staff-roster');
    expect(within(roster).getByText('12')).toBeInTheDocument();
    expect(within(roster).getByText('3')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText('Chauffeur')).toBeInTheDocument();
    expect(within(table).queryByText(/conductor/i)).toBeNull();
    expect(within(table).getByText('Not Available')).toBeInTheDocument();
    expect(within(table).getByText('+63 917 123 4567')).toBeInTheDocument();
    expect(screen.getByText('Showing 1 to 10 of 15')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).toBeNull(); // the crew member sets availability, not the Operator
  });

  test('searches after a short pause, with the role filter, from page 1', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<StaffDirectory fleetCount={0} />);
    await screen.findByText('Juan Dela Cruz');

    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'conductor' } });
    fireEvent.change(screen.getByPlaceholderText('Search by username, email or role'), { target: { value: 'ana' } });
    await act(async () => { vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS + 10); });

    await waitFor(() => expect(OperatorService.getStaffPage).toHaveBeenLastCalledWith({ page: 1, search: 'ana', role: 'conductor' }));
  });

  test('tells "no match" apart from "no staff yet"', async () => {
    OperatorService.getStaffPage.mockResolvedValueOnce(page([], 0, { totals: { driver: 0, conductor: 0 } }));
    const { unmount } = render(<StaffDirectory fleetCount={0} />);
    expect(await screen.findByText(/No staff yet/)).toBeInTheDocument();
    unmount();

    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<StaffDirectory fleetCount={0} />);
    await screen.findByText('Juan Dela Cruz');
    OperatorService.getStaffPage.mockResolvedValueOnce(page([], 0));
    fireEvent.change(screen.getByPlaceholderText('Search by username, email or role'), { target: { value: 'zzz' } });
    await act(async () => { vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS + 10); });
    expect(await screen.findByText('No staff match your search.')).toBeInTheDocument();
  });

  test('edits only what changed and reloads', async () => {
    OperatorService.updateStaff.mockResolvedValue({ data: juan });
    const onChanged = vi.fn();
    render(<StaffDirectory fleetCount={0} onChanged={onChanged} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Juan Dela Cruz' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByLabelText('First Name')).toBeNull();
    fireEvent.change(within(dialog).getByLabelText('Username (for signing in)'), { target: { value: 'juan.new' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(OperatorService.updateStaff).toHaveBeenCalledWith(7, { username: 'juan.new' }));
    expect(await screen.findByText('Staff details saved.')).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });

  test('asks before turning an account off, and lists the trips when it is refused', async () => {
    const refusal = new Error('Replace this person on their trips first. They still have 1 trip to work.', {
      cause: { response: { data: { errors: { staff: ['x'], trips: ['Nov 9 8:00 AM, Tagum - Panabo, bus DEMO-101'] } } } },
    });
    OperatorService.deactivateStaff.mockRejectedValueOnce(refusal);
    render(<StaffDirectory fleetCount={0} />);
    fireEvent.click(await screen.findByRole('button', { name: "Turn off Juan Dela Cruz's account" }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('They cannot sign in, and they are signed out now.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Turn off account' }));

    expect(await within(dialog).findByText(/Replace this person on their trips first/)).toBeInTheDocument();
    expect(within(dialog).getByText('Nov 9 8:00 AM, Tagum - Panabo, bus DEMO-101')).toBeInTheDocument();
  });

  test('adds a staff member with the sign-up rules and the +63 phone', async () => {
    OperatorService.createEmployeeAccount.mockResolvedValue({ data: {} });
    render(<StaffDirectory fleetCount={0} />);
    await screen.findByText('Juan Dela Cruz');
    fireEvent.click(screen.getByRole('button', { name: 'Add Staff' }));
    const dialog = screen.getByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Staff' }));
    expect(await within(dialog).findByText('First name is required')).toBeInTheDocument();
    expect(OperatorService.createEmployeeAccount).not.toHaveBeenCalled();

    const set = (id, value) => fireEvent.change(dialog.querySelector(`#${id}`), { target: { value } });
    set('staff-role', 'conductor');
    set('staff-firstName', 'Ana');
    set('staff-lastName', 'Reyes');
    set('staff-username', 'ana.reyes');
    set('staff-email', 'ana.reyes@example.com');
    set('staff-phone', '917 000 1111');
    set('staff-birthDate', '1995-02-03');
    set('staff-address', 'Panabo');
    set('staff-password', 'Strong-pass1');
    set('staff-confirm', 'Strong-pass1');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Staff' }));

    await waitFor(() => expect(OperatorService.createEmployeeAccount).toHaveBeenCalledWith(expect.objectContaining({
      role: 'conductor', name: 'Ana Reyes', phone_num: '+639170001111', birth_date: '1995-02-03',
    })));
  });

  test('shows a dispatcher (not a company admin) the list without Add, Edit or Turn off', async () => {
    render(<CompanyAdminContext.Provider value={false}><StaffDirectory fleetCount={0} /></CompanyAdminContext.Provider>);

    expect(await screen.findByText('Juan Dela Cruz')).toBeInTheDocument();
    expect(screen.getByTestId('read-only-note')).toHaveTextContent('Only your company admin can change these.');
    expect(screen.queryByRole('button', { name: 'Add Staff' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Edit Juan/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Turn off/ })).toBeNull();
  });

  test('lists the company Operators; a Company Admin manages plain Operators but not themselves or another Company Admin', async () => {
    const me = { company_user_id: 1, name: 'Boss', username: 'boss', email: 'boss@example.com', phone_num: '+639171230000', role: 'operator', role_label: 'Company Admin', is_company_admin: true, is_you: true, manageable: false, deactivated: false, joined_at: '2026-11-01T02:00:00Z' };
    const coOwner = { ...me, company_user_id: 2, name: 'Co Owner', username: 'co', is_you: false };
    const dispatcher = { ...me, company_user_id: 3, name: 'Dina Dispatcher', username: 'dina', role_label: 'Operator', is_company_admin: false, is_you: false, manageable: true };
    OperatorService.getStaffPage.mockResolvedValue(page([me, coOwner, dispatcher]));
    render(<StaffDirectory fleetCount={0} />);

    const row = async (name) => (await screen.findByText(name)).closest('tr');
    expect(within(await row('Dina Dispatcher')).getByRole('button', { name: "Turn off Dina Dispatcher's account" })).toBeInTheDocument();
    expect(within(await row('Dina Dispatcher')).getByText('Active')).toBeInTheDocument();
    expect(within(await row('Boss')).getByText('You')).toBeInTheDocument();
    expect(within(await row('Boss')).queryByRole('button')).toBeNull();
    expect(within(await row('Co Owner')).getByText('Changed by the Super Admin')).toBeInTheDocument();
    expect(screen.getAllByText('Company Admin')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Add Staff' }));
    fireEvent.change(await screen.findByLabelText('Role', { selector: '#staff-role' }), { target: { value: 'operator' } });
    expect(screen.getByText(/Only the Super Admin can make someone a Company Admin/)).toBeInTheDocument();
  });
});
