import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

vi.mock('../../api/StaffService/StaffBaseService', () => ({
  default: {
    getPairingToken: vi.fn(async () => ({ data: { token: 'pair-token-abc', token_pin: '123456', fleet_plate: 'PR-001' } })),
    submitPairing: vi.fn(),
  },
}));

import PairingScreen from './PairingScreen';
import StaffService from '../../api/StaffService/StaffBaseService';

describe('PairingScreen', () => {
  test('waits until pairing opens: says when, asks the server for nothing, and keeps pairing disabled', () => {
    StaffService.getPairingToken.mockClear();
    const inAnHour = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    render(<PairingScreen role="driver" onPaired={() => {}} onLogout={() => {}} pairingOpensAt={inAnHour} />);

    expect(screen.getByTestId('pairing-not-open').textContent).toMatch(/^Pairing opens (at|on) .+\. Your pairing QR and PIN appear then\.$/);
    expect(screen.getByRole('button', { name: /Start Camera/ })).toBeDisabled();
    expect(StaffService.getPairingToken).not.toHaveBeenCalled();
  });

  test('loads the pairing code once the opening time has passed', async () => {
    StaffService.getPairingToken.mockClear();
    const aMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    render(<PairingScreen role="driver" onPaired={() => {}} onLogout={() => {}} pairingOpensAt={aMinuteAgo} />);

    expect(await screen.findByAltText('Your pairing QR')).toBeTruthy();
    expect(screen.queryByTestId('pairing-not-open')).toBeNull();
    expect(StaffService.getPairingToken).toHaveBeenCalledTimes(1);
  });

  test('draws the pairing QR locally from the token (no image URL from the server or a third party)', async () => {
    render(<PairingScreen role="driver" onPaired={() => {}} onLogout={() => {}} />);

    const image = await screen.findByAltText('Your pairing QR');
    await waitFor(() => expect(image.getAttribute('src')).toMatch(/^data:image\/png;base64,/));
    expect(image.getAttribute('src')).not.toMatch(/qrserver|https?:/i);
  });
});
