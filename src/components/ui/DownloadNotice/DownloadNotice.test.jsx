import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import DownloadNotice from './DownloadNotice';
import { announceDownload } from '../../../utils/downloadNotice';

// 2026-11-13 (user): a pop-up after a file download.
describe('DownloadNotice', () => {
  afterEach(() => vi.useRealTimers());

  it('appears when a file is saved, names it, and closes by itself', () => {
    vi.useFakeTimers();
    render(<DownloadNotice hideAfterMs={5000} />);
    expect(screen.queryByTestId('download-notice')).not.toBeInTheDocument();

    act(() => announceDownload('financial-transactions-2026-11-13.pdf'));
    expect(screen.getByTestId('download-notice')).toHaveTextContent('File downloaded');
    expect(screen.getByText('financial-transactions-2026-11-13.pdf')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByTestId('download-notice')).not.toBeInTheDocument();
  });

  it('can be closed', () => {
    render(<DownloadNotice />);
    act(() => announceDownload('report.csv'));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('download-notice')).not.toBeInTheDocument();
  });
});
