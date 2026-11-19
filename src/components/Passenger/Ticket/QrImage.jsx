import useQrDataUrl from '../../../api/hooks/useQrDataUrl';

import { SkeletonSquare } from '../../ui/Skeleton';
/** A QR drawn locally from its payload (shared renderer, nothing fetched). */
export default function QrImage({ content, alt = 'Ticket QR', size = 300, className = 'h-31 w-31 object-contain' }) {
  const { url, failed } = useQrDataUrl(content, size);
  if (!content) return null;
  if (failed) return <span className="text-xs text-slate-500">QR unavailable</span>;
  if (!url) return <SkeletonSquare label="Loading QR..." className="h-40 w-40" />;
  return <img src={url} alt={alt} className={className} style={{ imageRendering: 'pixelated' }} />;
}
