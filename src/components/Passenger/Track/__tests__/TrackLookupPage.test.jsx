import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('../../../../api/PassengerService/PassengerService', () => ({ default: { guestLookupTicket: vi.fn() } }));

import PassengerService from '../../../../api/PassengerService/PassengerService';
import TrackLookupPage from '../TrackLookupPage';
import { extractTrackingToken } from '../../../../utils/trackingToken';

const TOKEN = 'Ab3_-'.repeat(8) + 'xyz'; // 43 characters

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}</p>;
}

const renderPage = () => render(
  <MemoryRouter initialEntries={['/track']}>
    <Routes>
      <Route path="/track" element={<TrackLookupPage />} />
      <Route path="/track/:token" element={<Where />} />
      <Route path="/passenger/dashboard" element={<p>dashboard</p>} />
    </Routes>
  </MemoryRouter>,
);

describe('extractTrackingToken', () => {
  test('accepts the bare code and the whole link, with a query, a trailing slash or spaces', () => {
    expect(TOKEN).toHaveLength(43);
    expect(extractTrackingToken(TOKEN)).toBe(TOKEN);
    expect(extractTrackingToken(`  ${TOKEN}  `)).toBe(TOKEN);
    expect(extractTrackingToken(`https://smart-transit-frontend.vercel.app/track/${TOKEN}`)).toBe(TOKEN);
    expect(extractTrackingToken(`http://localhost:5173/track/${TOKEN}/?utm=1`)).toBe(TOKEN);
    expect(extractTrackingToken(`Track my bus: https://x.example/track/${TOKEN} thanks`)).toBe(TOKEN);
  });

  test('rejects anything else', () => {
    ['', '   ', 'abc', TOKEN.slice(1), `${TOKEN}A`, `/track/${TOKEN}A`, 'https://x.example/track/short', 'TXN-123456', '<script>alert(1)</script>']
      .forEach((bad) => expect(extractTrackingToken(bad)).toBe(''));
  });
});

describe('TrackLookupPage', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  test('a pasted code opens the tracking page for it', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Tracking code or link'), { target: { value: `https://x.example/track/${TOKEN}` } });
    fireEvent.click(screen.getByRole('button', { name: /track my bus/i }));

    expect((await screen.findByTestId('where')).textContent).toBe(`/track/${TOKEN}`);
  });

  test('something that is not a code gets a friendly message and goes nowhere', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Tracking code or link'), { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button', { name: /track my bus/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/does not look like a tracking code/i);
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Tracking code or link'), { target: { value: TOKEN } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument(); // the message clears as soon as the field changes
  });

  test('points a signed-in passenger to their tickets', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /open my tickets/i })).toHaveAttribute('href', '/passenger/dashboard?tab=tickets');
  });

  test('a lost link can be found again with the payment reference, and each usable ticket gets a Track button', async () => {
    PassengerService.guestLookupTicket.mockResolvedValue({
      data: [
        { ticket_uuid: 'u1', status: 'valid', tracking_token: TOKEN, origin_stop: { stop_name: 'Alpha' }, destination_stop: { stop_name: 'Beta' }, trip: { trip_date: '2026-10-04' } },
        { ticket_uuid: 'u2', status: 'expired', tracking_token: null, origin_stop: { stop_name: 'Alpha' }, destination_label: 'Near the chapel', trip: { trip_date: '2026-09-01' } },
      ],
    });
    renderPage();
    fireEvent.change(screen.getByLabelText('Payment reference'), { target: { value: ' TXN-ABC ' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'me@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /find my ticket/i }));

    const list = await screen.findByRole('list', { name: 'Your tickets' });
    expect(PassengerService.guestLookupTicket).toHaveBeenCalledWith({ transaction_reference: 'TXN-ABC', email: 'me@example.com' });
    const rows = within(list).getAllByRole('listitem');
    expect(within(rows[0]).getByRole('link', { name: /track this bus/i })).toHaveAttribute('href', `/track/${TOKEN}`);
    expect(within(rows[1]).getByText(/near the chapel/i)).toBeInTheDocument();
    expect(within(rows[1]).getByText(/tracking is not available/i)).toBeInTheDocument();
  });

  test('sends no email when none is given, and asks for the reference first', async () => {
    PassengerService.guestLookupTicket.mockResolvedValue({ data: [] });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /find my ticket/i }));
    expect(screen.getByText(/enter the payment reference/i)).toBeInTheDocument();
    expect(PassengerService.guestLookupTicket).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Payment reference'), { target: { value: 'TXN-1' } });
    fireEvent.click(screen.getByRole('button', { name: /find my ticket/i }));
    await waitFor(() => expect(PassengerService.guestLookupTicket).toHaveBeenCalledWith({ transaction_reference: 'TXN-1' }));
  });

  test.each([
    [404, /no tickets found/i],
    [429, /too many tries/i],
    [500, /could not look that up/i],
  ])('a %i answer from the lookup reads as a friendly message', async (status, message) => {
    PassengerService.guestLookupTicket.mockRejectedValue(new Error('x', { cause: { response: { status } } }));
    renderPage();
    fireEvent.change(screen.getByLabelText('Payment reference'), { target: { value: 'TXN-1' } });
    fireEvent.click(screen.getByRole('button', { name: /find my ticket/i }));

    expect(await screen.findByText(message)).toBeInTheDocument();
  });
});
