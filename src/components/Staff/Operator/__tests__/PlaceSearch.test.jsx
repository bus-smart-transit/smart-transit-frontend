import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PlaceSearch from '../PlaceSearch';

const mocks = vi.hoisted(() => ({ searchPlaces: vi.fn() }));
vi.mock('../../../../api/StaffService/OperatorService', () => ({ default: mocks }));

const twoAcacias = { data: { source: 'photon', available: true, results: [
  { name: 'Acacia', detail: 'Indangan Road, Indangan', latitude: 7.12, longitude: 125.61 },
  { name: 'Acacia', detail: 'Poblacion', latitude: 7.07, longitude: 125.6 },
] } };

const type = async (value) => {
  fireEvent.change(screen.getByRole('combobox'), { target: { value } });
  await act(async () => { vi.advanceTimersByTime(400); });
};

describe('PlaceSearch', () => {
  beforeEach(() => { vi.useFakeTimers(); mocks.searchPlaces.mockReset(); });
  afterEach(() => { vi.useRealTimers(); });

  it('waits for 3 letters and a pause, then lists places with a detail line', async () => {
    mocks.searchPlaces.mockResolvedValue(twoAcacias);
    render(<PlaceSearch onPick={vi.fn()} />);
    await type('Ac');
    expect(mocks.searchPlaces).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Acac' } });
    await type('Acacia');
    expect(mocks.searchPlaces).toHaveBeenCalledTimes(1);
    expect(mocks.searchPlaces).toHaveBeenCalledWith('Acacia', 'suggest');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['AcaciaIndangan Road, Indangan', 'AcaciaPoblacion']);
  });

  it('picks with the arrow keys and Enter, and hands back the place', async () => {
    mocks.searchPlaces.mockResolvedValue(twoAcacias);
    const onPick = vi.fn();
    render(<PlaceSearch onPick={onPick} />);
    await type('Acacia');
    const box = screen.getByRole('combobox');
    fireEvent.keyDown(box, { key: 'ArrowDown' });
    fireEvent.keyDown(box, { key: 'ArrowDown' });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onPick).toHaveBeenCalledWith(twoAcacias.data.results[1]);
    expect(box).toHaveValue('Acacia, Poblacion');
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(mocks.searchPlaces).toHaveBeenCalledTimes(1);
  });

  it('Search asks the wider search, and says plainly when nothing or no service is found', async () => {
    mocks.searchPlaces.mockResolvedValueOnce({ data: { results: [], available: true } });
    render(<PlaceSearch onPick={vi.fn()} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Nowhere street' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Search' })); });
    expect(mocks.searchPlaces).toHaveBeenCalledWith('Nowhere street', 'search');
    expect(screen.getByText(/No place found/)).toBeInTheDocument();

    mocks.searchPlaces.mockRejectedValueOnce(new Error('down'));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Search' })); });
    expect(screen.getByText(/Place search is not working right now/)).toBeInTheDocument();
  });
});
