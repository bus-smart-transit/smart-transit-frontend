import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

vi.mock('../../api/StaffService/StaffBaseService', () => ({
  default: {
    getPairingToken: vi.fn(async () => ({ data: { token: 'pair-token-abc', token_pin: '123456', fleet_plate: 'PR-001' } })),
    submitPairing: vi.fn(),
  },
}));

import PairingScreen from './PairingScreen';

describe('PairingScreen', () => {
  test('draws the pairing QR locally from the token (no image URL from the server or a third party)', async () => {
    render(<PairingScreen role="driver" onPaired={() => {}} onLogout={() => {}} />);

    const image = await screen.findByAltText('Your pairing QR');
    await waitFor(() => expect(image.getAttribute('src')).toMatch(/^data:image\/png;base64,/));
    expect(image.getAttribute('src')).not.toMatch(/qrserver|https?:/i);
  });
});
