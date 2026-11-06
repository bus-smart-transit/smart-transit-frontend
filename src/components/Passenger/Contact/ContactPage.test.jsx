import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ContactPage from './ContactPage';

vi.mock('../../Layout/Navbar', () => ({ default: () => null }));
vi.mock('../../Layout/Footer', () => ({ default: () => null }));
vi.mock('../../../api/hooks/useRegion', () => ({ useRegion: () => ({ name: 'Sample Region' }) }));

// 2026-11-07: Contact is a sample for the test period; it never claims a message was sent.
describe('ContactPage', () => {
  it('marks the page and details as samples', () => {
    render(<MemoryRouter><ContactPage /></MemoryRouter>);
    expect(screen.getByText('Sample page for the test period')).toBeInTheDocument();
    expect(screen.getByText('Phone (sample)')).toBeInTheDocument();
    expect(screen.getByText('Serving terminals across Sample Region')).toBeInTheDocument();
  });

  it('checks the form, then says it is a sample instead of claiming it was sent', () => {
    render(<MemoryRouter><ContactPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));
    expect(screen.getByText('Enter your full name.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Full Name/), { target: { value: 'Ana Reyes' } });
    fireEvent.change(screen.getByLabelText(/Email Address/), { target: { value: 'ana@example.com' } });
    fireEvent.change(screen.getByLabelText(/Subject/), { target: { value: 'Lost bag' } });
    fireEvent.change(screen.getByLabelText(/Message/), { target: { value: 'I left my bag on the bus.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));

    expect(screen.getByRole('status')).toHaveTextContent('This form is a sample');
    expect(screen.queryByText(/Message sent/i)).toBeNull();
  });
});
