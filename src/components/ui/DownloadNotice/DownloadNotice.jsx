import { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { DOWNLOAD_EVENT } from '../../../utils/downloadNotice';

/**
 * 2026-11-13 (user): the pop-up after a file download. It names the file and where to find it, and closes by itself
 * after a few seconds. Mounted once in App.jsx; utils/downloadNotice.js announces each download.
 */
export default function DownloadNotice({ hideAfterMs = 5000 }) {
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const onDownload = (event) => setNotice({ fileName: event?.detail?.fileName || '', at: Date.now() });
    window.addEventListener(DOWNLOAD_EVENT, onDownload);
    return () => window.removeEventListener(DOWNLOAD_EVENT, onDownload);
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(null), hideAfterMs);
    return () => clearTimeout(id);
  }, [notice, hideAfterMs]);

  if (!notice) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="download-notice"
      className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-sm items-start gap-3 rounded-xl border border-emerald-200 bg-white p-4 shadow-lg sm:inset-x-auto sm:right-6 sm:bottom-6"
    >
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">File downloaded</p>
        {notice.fileName && <p className="mt-0.5 wrap-break-word font-data text-xs text-slate-600">{notice.fileName}</p>}
        <p className="mt-1 text-xs text-slate-500">Check your Downloads folder.</p>
      </div>
      <button type="button" aria-label="Close" onClick={() => setNotice(null)} className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
