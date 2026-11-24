import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Toaster from './Toaster';
import { clearToasts, getToasts, newItemsSince, showToast } from '../../../utils/toastStore';

// 2026-11-24 (user): one toast for the whole website; an emergency stays until dismissed.

afterEach(() => { act(() => clearToasts()); vi.useRealTimers(); });

describe('toast store', () => {
  it('announces only what arrived after the first read', () => {
    const id = (item) => item.id;
    expect(newItemsSince(null, [{ id: 1 }], id)).toEqual([]);
    expect(newItemsSince(new Set([1]), [{ id: 1 }, { id: 2 }], id)).toEqual([{ id: 2 }]);
  });

  it('keeps at most four, dropping the oldest that is not an emergency', () => {
    showToast({ title: 'Emergency', tone: 'danger', sticky: true });
    for (let i = 1; i <= 4; i += 1) showToast({ title: `Note ${i}` });
    expect(getToasts().map((toast) => toast.title)).toEqual(['Emergency', 'Note 2', 'Note 3', 'Note 4']);
  });

  it('replaces a toast with the same key instead of stacking it', () => {
    showToast({ key: 'a', title: 'First' });
    showToast({ key: 'a', title: 'Second' });
    expect(getToasts().map((toast) => toast.title)).toEqual(['Second']);
  });
});

describe('Toaster', () => {
  it('shows a toast, runs its action and closes it', () => {
    const onAction = vi.fn();
    render(<Toaster />);
    act(() => { showToast({ title: 'New notification', body: 'You have a new schedule.', actionLabel: 'Open', onAction }); });

    expect(screen.getByRole('status')).toHaveTextContent('You have a new schedule.');
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
  });

  it('lets an ordinary toast leave by itself but keeps an emergency', () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => {
      showToast({ title: 'Saved', duration: 1000 });
      showToast({ title: 'Emergency: Breakdown', tone: 'danger', sticky: true });
    });
    expect(screen.getAllByTestId('toast')).toHaveLength(2);

    act(() => { vi.advanceTimersByTime(1500); });
    expect(screen.getAllByTestId('toast')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent('Emergency: Breakdown');

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
  });
});
