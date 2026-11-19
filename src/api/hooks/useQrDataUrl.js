import { useEffect, useState } from 'react';
import { qrDataUrl } from '../../utils/qr';

/** The locally drawn QR for `content` as a data URL, or null while drawing / with no content. */
export default function useQrDataUrl(content, size = 300) {
  const [result, setResult] = useState({ key: null, url: null, failed: false });
  const key = content ? `${size}|${content}` : null;

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    qrDataUrl(content, size)
      .then((url) => { if (!cancelled) setResult({ key, url, failed: false }); })
      .catch(() => { if (!cancelled) setResult({ key, url: null, failed: true }); });
    return () => { cancelled = true; };
    // `key` encodes content and size.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = result.key === key;
  return { url: current ? result.url : null, failed: current && result.failed };
}
