import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PairWithCrewCard from '../PairWithCrewCard';
import { readDeepLink } from '../../../utils/notificationTarget';

describe('PairWithCrewCard (Batch 45 Feature B)', () => {
  it('asks a crew member who is not paired yet to pair, with the reason', () => {
    const onOpen = vi.fn();
    render(<PairWithCrewCard paired={false} reason="Pairing opens at 7:00 AM." partner="Chauffeur" onOpen={onOpen} />);

    expect(screen.getByText('Not paired with your Chauffeur yet')).toBeInTheDocument();
    expect(screen.getByText(/Pairing opens at 7:00 AM\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pair with crew' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  // Batch 53 item 9 (user): once paired the card is not shown (it used to offer the Daily PIN).
  it('is not shown once paired', () => {
    const { container } = render(<PairWithCrewCard paired reason="" partner="Driver" onOpen={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('still understands old ?tab=pin links, which now open the pop-up', () => {
    expect(readDeepLink('?tab=pin', 'driver').tab).toBe('pin');
    expect(readDeepLink('?tab=pin', 'conductor').tab).toBe('pin');
  });
});
