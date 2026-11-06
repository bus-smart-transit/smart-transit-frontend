import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import SystemHealthPage from '../SystemHealthPage';

const health = {
  core: [
    { key: 'database', label: 'Database', status: 'ok', note: 'Answering.' },
    { key: 'scheduler', label: 'Scheduled tasks', status: 'problem', note: 'No beat for more than 3 minutes: the scheduler may have stopped.', at: '2026-11-06T10:00:00Z' },
  ],
  services: [
    { key: 'mail', label: 'Email', status: 'unknown', note: 'Nothing recorded yet.', at: null },
    { key: 'traffic', label: 'Traffic (TomTom)', status: 'problem', note: 'Last call failed (HTTP 429).', at: '2026-11-06T10:00:00Z' },
  ],
};

describe('SystemHealthPage', () => {
  it('shows each part with Working, Problem or No record yet, the note and the last time', () => {
    render(<SystemHealthPage healthTab={{ health, loading: false, error: '', reload: vi.fn() }} />);
    const scheduler = screen.getByText('Scheduled tasks').closest('li');
    expect(within(scheduler).getByText('Problem')).toBeInTheDocument();
    expect(within(scheduler).getByText(/Last: 2026\/11\/06 - 18:00/)).toBeInTheDocument();
    expect(within(screen.getByText('Email').closest('li')).getByText('No record yet')).toBeInTheDocument();
    expect(within(screen.getByText('Database').closest('li')).getByText('Working')).toBeInTheDocument();
  });

  it('asks again with Refresh and says plainly when it could not load', () => {
    const reload = vi.fn();
    render(<SystemHealthPage healthTab={{ health: null, loading: false, error: 'System health could not be loaded. Try again.', reload }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(reload).toHaveBeenCalled();
  });
});
