import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LandingHero from './LandingHero';

// Regression test for a Batch 7 timezone fix that was applied to
// Dashboard.jsx/LandingPage.jsx/OperatorDashboard.jsx but missed
// LandingHero.jsx, which previously computed its own "today" using the
// device's local clock (`new Date()`) instead of the Manila business
// timezone (`getBusinessToday()`). When a passenger's device timezone is
// behind/ahead of Asia/Manila, the mismatch caused the search form to
// submit the wrong date, making today's/near-boundary trips appear
// "missing" from Available Trips even though they were correctly
// scheduled.
vi.mock('../../../utils/dates', () => ({
  getBusinessToday: () => '2099-01-01',
}));

describe('LandingHero date default', () => {
  test('defaults the search date input to the business-timezone-aware today, not device-local time', () => {
    render(
      <MemoryRouter>
        <LandingHero onSearch={() => {}} searchState={{ from: '', to: '' }} />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/^Date$/i)).toHaveValue('2099-01-01');
  });
});
