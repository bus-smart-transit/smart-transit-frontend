import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BusInfoCard from '../BusInfoCard';

// 2026-11-21 (user): the card of a clicked bus on Track Bus. SAMPLE values.
const view = {
  title: 'Sample Shuttle', bodyNo: 'SS-04', type: 'Public', route: 'Sample Terminal to East Town', place: 'Near Bravo', routeId: 3,
  next: { label: 'Next stop', place: 'Bravo', time: '9:00 AM', minutes: 'In ~2 min', live: true },
  chips: [{ key: 'service', label: 'Regular' }, { key: 'class', label: 'Aircon' }],
};

describe('BusInfoCard', () => {
  it('shows the bus, where it is, its next stop with the minutes, its type and chips, and links to the route', () => {
    const onClose = vi.fn();
    render(<MemoryRouter><BusInfoCard view={view} onClose={onClose} /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Sample Shuttle' })).toBeInTheDocument();
    expect(screen.getByTestId('bus-card-body-no')).toHaveTextContent('SS-04');
    expect(screen.getByTestId('bus-card-place')).toHaveTextContent('Near Bravo');
    expect(screen.getByTestId('bus-card-next')).toHaveTextContent('Next stopBravo9:00 AMIn ~2 minLive estimate');
    expect(screen.getByTestId('bus-card-type')).toHaveTextContent('Type: Public');
    expect(screen.getByTestId('bus-card-chips')).toHaveTextContent('Regular');
    expect(screen.getByTestId('bus-card-view-route')).toHaveAttribute('href', '/routes/3');

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing without a bus', () => {
    const { container } = render(<MemoryRouter><BusInfoCard view={null} onClose={() => {}} /></MemoryRouter>);
    expect(container).toBeEmptyDOMElement();
  });
});
