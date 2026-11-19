import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../Navbar';

const auth = vi.hoisted(() => ({ value: { isAuthenticated: false, isLoading: false, logout: vi.fn() } }));
vi.mock('../../../api/hooks/useAuth', () => ({ useAuth: () => auth.value }));
vi.mock('../ProfileDropdown', () => ({ default: () => <div>profile-menu</div> }));

const renderNav = () => render(<MemoryRouter><Navbar /></MemoryRouter>);

// 2026-11-06 (passenger redesign): the site links, Track Bus for everyone, one Log In button.
describe('Navbar', () => {
  it('links to the Track Bus page and offers Log In to a guest', () => {
    auth.value = { isAuthenticated: false, isLoading: false, logout: vi.fn() };
    renderNav();
    const site = screen.getByRole('navigation', { name: 'Site navigation' });
    expect(within(site).getByRole('link', { name: 'Track Bus' })).toHaveAttribute('href', '/track-bus');
    expect(within(site).getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '/faq');
    expect(screen.getAllByRole('link', { name: 'Log In' })[0]).toHaveAttribute('href', '/passenger/login');
  });

  it('shows the profile menu to a signed-in passenger and account links in the phone menu', () => {
    auth.value = { isAuthenticated: true, isLoading: false, logout: vi.fn() };
    renderNav();
    expect(screen.getByText('profile-menu')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(within(screen.getByRole('navigation', { name: 'Account' })).getByRole('link', { name: 'My Tickets' })).toBeInTheDocument();
  });
});
