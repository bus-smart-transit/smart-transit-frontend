import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RefreshButton from './RefreshButton';

// 2026-11-24 (user): a refresh always shows that it ran: Refreshing…, then Updated (or Couldn't refresh).

describe('RefreshButton', () => {
  it('spins while it refreshes, then says Updated', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(<RefreshButton onRefresh={onRefresh} />);
    const button = screen.getByTestId('refresh-button');

    fireEvent.click(button);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(button).toHaveTextContent('Refreshing…');
    expect(button).toBeDisabled();

    await waitFor(() => expect(button).toHaveTextContent('Updated'), { timeout: 2000 });
    expect(button).toHaveAttribute('data-state', 'done');
  });

  it("says Couldn't refresh when the refresh fails", async () => {
    render(<RefreshButton label="Refresh Load" onRefresh={() => Promise.reject(new Error('offline'))} />);
    const button = screen.getByTestId('refresh-button');
    expect(button).toHaveTextContent('Refresh Load');

    fireEvent.click(button);
    await waitFor(() => expect(button).toHaveTextContent("Couldn't refresh"), { timeout: 2000 });
  });
});
