// 2026-11-13 (user): a file download shows a short notice ("File downloaded"), because the browser's own sign is easy
// to miss. The download helpers announce the file; the one <DownloadNotice /> in App.jsx shows it.

export const DOWNLOAD_EVENT = 'smarttransit:file-downloaded';

/** Tells the page a file was saved. Safe where there is no window (tests, server). */
export function announceDownload(fileName) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent(DOWNLOAD_EVENT, { detail: { fileName: String(fileName || '') } }));
}
