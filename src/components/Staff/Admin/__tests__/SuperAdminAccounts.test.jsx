import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import CompaniesPage from '../CompaniesPage';
import UsersPage from '../UsersPage';

const company = { company_id: 1, company_name: 'Davao Metro Shuttle', operators: 2, drivers: 2, chauffeurs: 2, buses: 2, company_admins: [{ name: 'Murcia', email: 'm@example.com', deactivated: false }] };
const empty = { ...company, company_id: 2, company_name: 'Test_Company', operators: 0, drivers: 0, chauffeurs: 0, buses: 0, company_admins: [] };

const companiesTab = (extra = {}) => ({ companies: [company, empty], loading: false, error: '', createCompany: vi.fn().mockResolvedValue({}), renameCompany: vi.fn().mockResolvedValue({}), addCompanyAdmin: vi.fn().mockResolvedValue({}), ...extra });

const user = (extra) => ({ user_id: 1, name: 'Pia', username: 'pia', email: 'pia@example.com', role: 'passenger', role_label: 'Passenger', company_name: null, is_company_admin: false, deactivated: false, deletion: null, is_you: false, ...extra });
const usersTab = (rows, extra = {}) => ({ users: rows, pagination: { page: 1, per_page: 15, total: rows.length, last_page: 1 }, loading: false, error: '', search: '', setSearch: vi.fn(), role: '', setRole: vi.fn(), setPage: vi.fn(), deactivate: vi.fn().mockResolvedValue({}), reactivate: vi.fn().mockResolvedValue({}), setCompanyAdmin: vi.fn().mockResolvedValue({}), ...extra });

beforeEach(() => { vi.restoreAllMocks(); });

describe('CompaniesPage', () => {
  it('lists companies with counts and flags one with no Company Admin yet', () => {
    render(<CompaniesPage companiesTab={companiesTab()} />);
    const row = screen.getByText('Test_Company').closest('tr');
    expect(within(row).getByText('None yet')).toBeInTheDocument();
    expect(within(screen.getByText('Davao Metro Shuttle').closest('tr')).getByText('Murcia')).toBeInTheDocument();
  });

  it('adds a company, and shows a refused name plainly', async () => {
    const tab = companiesTab({ createCompany: vi.fn().mockRejectedValueOnce(Object.assign(new Error('Invalid'), { cause: { response: { data: { errors: { company_name: ['A company with this name already exists.'] } } } } })).mockResolvedValueOnce({}) });
    render(<CompaniesPage companiesTab={tab} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add company' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Company name'), { target: { value: 'Davao Metro Shuttle' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add company' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('A company with this name already exists.');
    fireEvent.change(within(dialog).getByLabelText('Company name'), { target: { value: 'New Co' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add company' }));
    await waitFor(() => expect(tab.createCompany).toHaveBeenLastCalledWith('New Co'));
    expect(await screen.findByText('Company added. Next, add its Company Admin.')).toBeInTheDocument();
  });

  it('opens Add Company Admin without a role choice', () => {
    render(<CompaniesPage companiesTab={companiesTab()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Company Admin to Test_Company' }));
    const dialog = screen.getByRole('dialog', { name: 'Add Company Admin to Test_Company' });
    expect(within(dialog).queryByLabelText('Role')).toBeNull();
    expect(within(dialog).getByRole('button', { name: 'Add Company Admin' })).toBeInTheDocument();
  });
});

describe('UsersPage', () => {
  it('turns an account off after asking, and never offers buttons on your own row', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const tab = usersTab([user({}), user({ user_id: 2, name: 'Me', username: 'me', role: 'admin', role_label: 'Super Admin', is_you: true })]);
    render(<UsersPage usersTab={tab} />);
    expect(within(screen.getByText('Me').closest('tr')).queryByRole('button')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Turn off Pia' }));
    await waitFor(() => expect(tab.deactivate).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Account turned off.')).toBeInTheDocument();
  });

  it('offers Company Admin only to an Operator of a company, and shows a refusal plainly', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const refused = Object.assign(new Error('Invalid'), { cause: { response: { data: { errors: { user: ['This is the last Super Admin account that is on. It cannot be turned off.'] } } } } });
    const tab = usersTab([
      user({ user_id: 3, name: 'Dina', role: 'operator', role_label: 'Operator', company_name: 'Davao Metro Shuttle' }),
      user({ user_id: 4, name: 'Other Admin', role: 'admin', role_label: 'Super Admin' }),
    ], { deactivate: vi.fn().mockRejectedValue(refused) });
    render(<UsersPage usersTab={tab} />);
    fireEvent.click(screen.getByRole('button', { name: 'Make Company Admin' }));
    await waitFor(() => expect(tab.setCompanyAdmin).toHaveBeenCalledWith(3, true));
    expect(within(screen.getByText('Other Admin').closest('tr')).queryByRole('button', { name: /Company Admin/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Turn off Other Admin' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('last Super Admin');
  });
});
