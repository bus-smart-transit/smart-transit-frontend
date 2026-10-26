import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../../api/StaffService/OperatorService', () => ({
  default: { getCrewShifts: vi.fn() },
}));

import OperatorService from '../../../../api/StaffService/OperatorService';
import CrewShiftTimes from '../CrewShiftTimes';
import { shiftLength } from '../../../../utils/crewShift';

// §4.8: the crew's time in (Start Shift) and time out (End Shift), read only.

const shifts = [
  { role: 'Driver', name: 'Dina Driver', route: 'Tagum - Panabo', bus: 'DEMO-101', time_in: '07:05', time_out: '13:20', minutes: 375, open: false },
  { role: 'Chauffeur', name: 'Carl Chauffeur', route: 'Tagum - Panabo', bus: 'DEMO-101', time_in: '07:10', time_out: null, minutes: null, open: true },
];

beforeEach(() => {
  vi.clearAllMocks();
  OperatorService.getCrewShifts.mockResolvedValue({ data: { date: '2026-10-07', shifts } });
});

describe('CrewShiftTimes', () => {
  test('lists each crew member\'s time in, time out and length, with an open shift marked', async () => {
    render(<CrewShiftTimes />);

    expect(await screen.findByText('Dina Driver')).toBeInTheDocument();
    expect(screen.getByText('13:20')).toBeInTheDocument();
    expect(screen.getByText('6h 15m')).toBeInTheDocument();
    expect(screen.getByText('Still on shift')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit|delete|save/i })).toBeNull(); // read only
  });

  test('asks for the day the Operator picks', async () => {
    render(<CrewShiftTimes />);
    await screen.findByText('Dina Driver');

    fireEvent.change(screen.getByLabelText('Day'), { target: { value: '2026-10-05' } });
    await waitFor(() => expect(OperatorService.getCrewShifts).toHaveBeenLastCalledWith('2026-10-05'));
  });

  test('says so when nobody worked, and shows a load error', async () => {
    OperatorService.getCrewShifts.mockResolvedValueOnce({ data: { shifts: [] } });
    const { unmount } = render(<CrewShiftTimes />);
    expect(await screen.findByText(/No Driver or Chauffeur started a shift/)).toBeInTheDocument();
    unmount();

    OperatorService.getCrewShifts.mockRejectedValueOnce(new Error('Network down'));
    render(<CrewShiftTimes />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Network down');
  });
});

test('shiftLength', () => {
  expect(shiftLength(375)).toBe('6h 15m');
  expect(shiftLength(45)).toBe('45m');
  expect(shiftLength(null)).toBe('-');
});
