import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../../api/StaffService/OperatorService', () => ({
  default: { getCrewShiftRange: vi.fn() },
}));

import OperatorService from '../../../../api/StaffService/OperatorService';
import CrewShiftTimes from '../CrewShiftTimes';
import { hoursWorked, rangeDays, rangeProblem, shiftLength } from '../../../../utils/crewShift';

// §4.8 and Batch 46: the crew's time in (Start Shift) and time out (End Shift) over a range, read only.

const shifts = [
  { staff_id: 3, role: 'Driver', name: 'Dina Driver', route: 'Tagum - Panabo', bus: 'DEMO-101', shift: 'Morning', date: '2026-10-07', time_in: '07:05', time_out: '13:20', ended_on: null, minutes: 375, open: false },
  { staff_id: 3, role: 'Driver', name: 'Dina Driver', route: 'Tagum - Panabo', bus: 'DEMO-101', shift: 'Single trip', date: '2026-10-08', time_in: '20:00', time_out: '01:00', ended_on: '2026-10-09', minutes: 300, open: false },
  { staff_id: 5, role: 'Chauffeur', name: 'Carl Chauffeur', route: 'Tagum - Panabo', bus: 'DEMO-101', shift: 'Afternoon', date: '2026-10-08', time_in: '12:10', time_out: null, ended_on: null, minutes: null, open: true },
];
const totals = [
  { staff_id: 5, role: 'Chauffeur', name: 'Carl Chauffeur', shifts: 1, minutes: 0, still_open: true },
  { staff_id: 3, role: 'Driver', name: 'Dina Driver', shifts: 2, minutes: 675, still_open: false },
];

beforeEach(() => {
  vi.clearAllMocks();
  OperatorService.getCrewShiftRange.mockResolvedValue({ data: { shifts, totals, pagination: { page: 1, per_page: 20, total: 3, last_page: 1 } } });
});

describe('CrewShiftTimes', () => {
  test('lists shift, time in, time out and hours, marks a running shift and a shift past midnight, and totals per person', async () => {
    render(<CrewShiftTimes staff={[{ company_user_id: 3, name: 'Dina Driver' }]} />);

    expect(await screen.findAllByText('Dina Driver')).not.toHaveLength(0);
    expect(screen.getByText('6 h 15 min')).toBeInTheDocument();
    expect(screen.getAllByText('In progress').length).toBeGreaterThan(0);
    expect(screen.getByText('Morning')).toBeInTheDocument();
    expect(screen.getByText('Single trip')).toBeInTheDocument();
    expect(screen.getByText(/Oct 9/)).toBeInTheDocument();
    expect(screen.getByText('11 h 15 min in 2 shifts')).toBeInTheDocument();
    expect(screen.getByText('Showing 1 to 3 of 3')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit|delete|save/i })).toBeNull(); // read only
  });

  test('asks for the range and the person the Operator picks', async () => {
    render(<CrewShiftTimes staff={[{ company_user_id: 3, name: 'Dina Driver' }]} />);
    await screen.findByText('Morning');

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-07' } });
    fireEvent.change(screen.getByLabelText('Staff'), { target: { value: '3' } });
    await waitFor(() => expect(OperatorService.getCrewShiftRange).toHaveBeenLastCalledWith({ from: '2026-10-01', to: '2026-10-07', staffId: '3', page: 1 }));
  });

  test('refuses a range over 31 days without asking the server', async () => {
    render(<CrewShiftTimes />);
    await screen.findByText('Morning');
    const calls = OperatorService.getCrewShiftRange.mock.calls.length;

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-08-01' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-01' } });

    expect(await screen.findByRole('alert')).toHaveTextContent('Choose at most 31 days.');
    expect(OperatorService.getCrewShiftRange.mock.calls.length).toBe(calls);
  });

  test('says so when nobody worked, and shows a load error', async () => {
    OperatorService.getCrewShiftRange.mockResolvedValueOnce({ data: { shifts: [], totals: [], pagination: { page: 1, per_page: 20, total: 0, last_page: 1 } } });
    const { unmount } = render(<CrewShiftTimes />);
    expect(await screen.findByText(/No Driver or Chauffeur started a shift/)).toBeInTheDocument();
    unmount();

    OperatorService.getCrewShiftRange.mockRejectedValueOnce(new Error('Network down'));
    render(<CrewShiftTimes />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Network down');
  });
});

test('shiftLength, hoursWorked and the range rules', () => {
  expect(shiftLength(375)).toBe('6h 15m');
  expect(shiftLength(45)).toBe('45m');
  expect(shiftLength(null)).toBe('-');
  expect(hoursWorked(450)).toBe('7 h 30 min');
  expect(hoursWorked(120)).toBe('2 h');
  expect(hoursWorked(0)).toBe('0 min');
  expect(rangeDays('2026-10-01', '2026-10-31')).toBe(31);
  expect(rangeProblem('2026-10-01', '2026-11-01')).toBe('Choose at most 31 days.');
  expect(rangeProblem('2026-10-05', '2026-10-01')).toBe('The end date must be on or after the start date.');
  expect(rangeProblem('2026-10-01', '2026-10-31')).toBe('');
});
