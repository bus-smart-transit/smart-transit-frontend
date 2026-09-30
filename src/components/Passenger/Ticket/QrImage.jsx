import useQrDataUrl from '../../../api/hooks/useQrDataUrl';

/** A QR drawn locally from its payload (shared renderer, nothing fetched). */
export default function QrImage({ content, alt = 'Ticket QR', size = 300, className = 'h-31 w-31 object-contain' }) {
  const { url, failed } = useQrDataUrl(content, size);
  if (!content) return null;
  if (failed) return <span className="text-xs text-slate-500">QR unavailable</span>;
  if (!url) return <span className="text-xs text-slate-400">Loading QR...</span>;
  return <img src={url} alt={alt} className={className} style={{ imageRendering: 'pixelated' }} />;
}
