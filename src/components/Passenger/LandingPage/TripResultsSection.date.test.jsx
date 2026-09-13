import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import TripResultsSection from './TripResultsSection';

describe('TripResultsSection date normalization', () => {
  test('renders the date-only search date using the local calendar day', () => {
    const trips = [
      {
        trip_id: 42,
        trip_date: '2026-09-09',
        fleet_route: {
          route: {
            origin: 'Davao',
            destination: 'Tagum',
          },
          start_time: '08:00:00',
          end_time: '09:00:00',
          fleet: {
            plate_number: 'ABC-123',
          },
        },
      },
    ];

    const expected = new Date('2026-09-09T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    render(
      <MemoryRouter>
        <TripResultsSection
          trips={trips}
          loading={false}
          error={null}
          searchState={{ from: '', to: '', date: '2026-09-09' }}
          onBookSeat={() => {}}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Travel Date:/i)).toBeInTheDocument();
    expect(screen.getByText((_, element) => {
      const hasText = (node) => node?.textContent?.includes(expected);
      // Only match the deepest element containing the text — without this,
      // every ancestor node's aggregated textContent also "includes" the
      // substring, producing a "multiple elements found" false failure.
      const childrenHaveText = Array.from(element?.children || []).some(hasText);
      return hasText(element) && !childrenHaveText;
    })).toBeInTheDocument();
  });
});
