import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ChauffeurScannerCard from './ChauffeurScannerCard';

// Batch 51 items 8 and 9 (user's design, 2026-11-09): the scanner card on Ticketing & Fares, with a Ticket ID box for a
// passenger who cannot show the QR.
const base = (over = {}) => ({
  videoRef: createRef(),
  scannerRunning: false,
  scannerBusy: false,
  scannerPhase: 'idle',
  canScan: true,
  onStart: vi.fn(),
  onStop: vi.fn(),
  ticketCode: '',
  onTicketCodeChange: vi.fn(),
  onBoardByCode: vi.fn(),
  ...over,
});

describe('ChauffeurScannerCard', () => {
  it('shows the scanner frame ready, starts the camera and boards by Ticket ID', () => {
    const props = base({ ticketCode: '3F9A12BC' });
    render(<ChauffeurScannerCard {...props} />);

    expect(screen.getByText('Digital Fare / QR Scanner')).toBeInTheDocument();
    expect(screen.getByText('Align the QR code within the frame. Scans are logged automatically.')).toBeInTheDocument();
    expect(screen.getByTestId('scanner-chip')).toHaveTextContent('Ready');
    expect(screen.getByText('Place the QR code inside the frame')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Start camera/ }));
    expect(props.onStart).toHaveBeenCalledOnce();

    fireEvent.change(screen.getByLabelText('No QR? Type the Ticket ID'), { target: { value: '3f9a' } });
    expect(props.onTicketCodeChange).toHaveBeenCalledWith('3f9a');
    fireEvent.click(screen.getByRole('button', { name: /Board/ }));
    expect(props.onBoardByCode).toHaveBeenCalledOnce();
  });

  it('says why scanning is blocked, and shows the result', () => {
    render(<ChauffeurScannerCard {...base({ canScan: false, blockedReason: 'Pair with your Driver first to scan tickets.', scanResult: { success: false, msg: 'Ticket not found.' }, scannerPhase: 'failed' })} />);

    expect(screen.getByRole('button', { name: /Start camera/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Board/ })).toBeDisabled();
    expect(screen.getByText('Pair with your Driver first to scan tickets.')).toBeInTheDocument();
    expect(screen.getByTestId('scan-result')).toHaveTextContent('Ticket not found.');
    expect(screen.getByTestId('scanner-chip')).toHaveTextContent('Not boarded');
  });

  // 2026-11-11 (user: no camera picture): qr-scanner shrinks a video that is hidden when the scanner is made, so the
  // video is never hidden, before or after the camera starts.
  it('never hides the camera video, so the scanner can show the picture', () => {
    const { rerender } = render(<ChauffeurScannerCard {...base({ scannerRunning: false })} />);
    const video = screen.getByTestId('scanner-video');
    expect(video.className).not.toMatch(/(invisible|hidden)/);
    expect(video).not.toHaveAttribute('hidden');
    rerender(<ChauffeurScannerCard {...base({ scannerRunning: true })} />);
    expect(screen.getByTestId('scanner-video').className).not.toMatch(/(invisible|hidden)/);
  });
});

