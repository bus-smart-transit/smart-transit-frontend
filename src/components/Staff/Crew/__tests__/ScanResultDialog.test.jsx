import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ScanResultDialog from '../ScanResultDialog';
import { baggageLine } from '../../../../utils/scanResult';

// 2026-11-26 (user): the Chauffeur's scan pop-up. SAMPLE values.
const single = {
  success: true,
  data: { ticket_id: 5, passenger_name: 'Ana', origin: 'Ecoland Terminal', destination: 'Panacan', priority_label: 'Senior citizen', has_baggage: true, baggage_count: 2, baggage_paid: 0, baggage_charges: [] },
};

describe('ScanResultDialog', () => {
  it('shows where the passenger gets off, the priority seat and 2x baggage to collect', () => {
    const onCollect = vi.fn();
    render(<ScanResultDialog scanResult={single} onClose={vi.fn()} onCollectBaggage={onCollect} />);

    expect(screen.getByTestId('scan-dialog-title')).toHaveTextContent('Boarded');
    expect(screen.getByTestId('scan-destination')).toHaveTextContent('Panacan');
    expect(screen.getByTestId('scan-priority')).toHaveTextContent('Senior citizen');
    expect(screen.getByTestId('scan-baggage')).toHaveTextContent('2x baggage, collect on board');
    fireEvent.click(screen.getByTestId('scan-collect-baggage'));
    expect(onCollect).toHaveBeenCalledWith({ ticket_id: 5, passenger_name: 'Ana', origin_stop: 'Ecoland Terminal', baggage: true, baggage_charges: [] });
  });

  it('closes with Scan next and with the close button', () => {
    const onClose = vi.fn();
    render(<ScanResultDialog scanResult={single} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('scan-next'));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('scan-collect-baggage')).toBeNull();
  });

  it('shows a group ticket with its count, priority seats, baggage and each passenger', () => {
    const group = {
      success: true,
      data: {
        total_tickets: 3, boarded_count: 2, tickets: [
          { ticket_id: 1, passenger_name: 'Guest', destination: 'Panacan', priority_label: 'Pregnant', has_baggage: false, baggage_count: 0, skipped: false },
          { ticket_id: 2, passenger_name: 'Guest', destination: 'Panacan', has_baggage: true, baggage_count: 3, baggage_paid: 0, skipped: false },
          { ticket_id: 3, passenger_name: 'Guest', destination: 'Panacan', skipped: true, skip_reason: 'This ticket is not valid or has already been used.' },
        ],
      },
    };
    const onCollect = vi.fn();
    render(<ScanResultDialog groupScanResult={group} onClose={vi.fn()} onCollectBaggage={onCollect} />);

    expect(screen.getByText('GROUP TICKET')).toBeInTheDocument();
    expect(screen.getByTestId('scan-group-count')).toHaveTextContent('3x tickets');
    expect(screen.getByTestId('scan-group-boarded')).toHaveTextContent('2 of 3 boarded');
    expect(screen.getByTestId('scan-group-priority')).toHaveTextContent('1 of 2');
    expect(screen.getByTestId('scan-group-baggage')).toHaveTextContent('1 with baggage (3x)');
    const rows = screen.getAllByTestId('scan-group-row');
    expect(rows[0]).toHaveTextContent('Passenger 1');
    expect(within(rows[2]).getByText(/already been used/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('scan-group-collect-2'));
    expect(onCollect).toHaveBeenCalledWith(expect.objectContaining({ ticket_id: 2 }));
  });

  it('shows a refused scan in red with the reason', () => {
    render(<ScanResultDialog scanResult={{ success: false, msg: 'Ticket is already boarded.' }} onClose={vi.fn()} />);
    expect(screen.getByTestId('scan-dialog-title')).toHaveTextContent('Not boarded');
    expect(screen.getByRole('alert')).toHaveTextContent('Ticket is already boarded.');
  });

  it('says what was paid and how many pieces', () => {
    expect(baggageLine({ has_baggage: true, baggage_count: 2, baggage_paid: 70 })).toBe('2x baggage, paid ₱70.00');
    expect(baggageLine({ has_baggage: false, baggage_count: 0 })).toBe('None');
  });
});
