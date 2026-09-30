import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../utils/ticketImage', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, renderTicketFile: vi.fn(async (model, name) => new File(['png'], name, { type: 'image/png' })) };
});

import { renderTicketFile } from '../../../utils/ticketImage';
import SaveQrButton from './SaveQrButton';

const ticket = {
  ticket_uuid: 'abcdef12-3456-7890-abcd-ef1234567890',
  qr_content: 'abcdef12-3456-7890-abcd-ef1234567890',
  origin: 'Alpha',
  destination: 'Beta',
  trip_date: '2026-10-01',
};

const setUserAgent = (ua, extra = {}) => {
  vi.stubGlobal('navigator', { userAgent: ua, ...extra });
};

describe('SaveQrButton', () => {
  beforeEach(() => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0) Chrome/120');
  });
  afterEach(() => vi.unstubAllGlobals());

  test('pre-renders the image when the ticket opens, before any click', async () => {
    render(<SaveQrButton ticket={ticket} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /save qr to device/i })).toBeEnabled());
    expect(renderTicketFile).toHaveBeenCalledTimes(1);
  });

  test('is disabled and draws nothing when the QR is not active (same flag as the screen)', () => {
    render(<SaveQrButton ticket={ticket} active={false} />);
    expect(screen.getByRole('button', { name: /save qr to device/i })).toBeDisabled();
    expect(renderTicketFile).not.toHaveBeenCalled();
  });

  test('on a phone, the click shares the already-rendered file straight away', async () => {
    const share = vi.fn().mockResolvedValue();
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari', { canShare: () => true, share });
    render(<SaveQrButton ticket={ticket} />);

    const button = await screen.findByRole('button', { name: /save qr to device/i });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    expect(share).toHaveBeenCalledTimes(1);
    expect(share.mock.calls[0][0].files[0].name).toBe('smart-transit-ticket-ABCDEF12.png');
  });

  test('inside an in-app browser it asks the passenger to open their browser instead of showing a dead button', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0]');
    render(<SaveQrButton ticket={ticket} />);

    expect(screen.queryByRole('button', { name: /save qr to device/i })).not.toBeInTheDocument();
    expect(screen.getByText(/open this page in your browser/i)).toBeInTheDocument();
    expect(renderTicketFile).not.toHaveBeenCalled();
  });
});
