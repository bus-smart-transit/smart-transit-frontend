import { qrDataUrl } from './qr';
import { isMobileDevice } from './inAppBrowser';

// One-click "Save QR to device". The image is drawn with the same qrDataUrl() as the
// on-screen QR, rendered ahead of the click (useTicketImage), and handed to the device
// with the share sheet on phones (iOS offers "Save Image") or a normal download.
// Only a ticket whose QR the screen would show can produce an image: no payload, no image.

const shortId = (uuid) => String(uuid || '').slice(0, 8).toUpperCase();

const MANILA = 'Asia/Manila';

/** "2026-10-01 06:30 (Manila)". Stored trip values are already Manila wall-clock. */
export function manilaDepartureLabel(ticket) {
  if (ticket?.trip_date) {
    const time = ticket.departure_time ? ` ${String(ticket.departure_time).slice(0, 5)}` : '';
    return `${ticket.trip_date}${time} (Manila)`;
  }
  const instant = ticket?.valid_from ? new Date(ticket.valid_from) : null;
  if (!instant || Number.isNaN(instant.getTime())) return '-';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: MANILA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(instant).map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} (Manila)`;
}

/** What the image says, as plain data (drawn by renderTicketCanvas; testable without a canvas). */
export function buildTicketImageModel(ticket, { group = false, groupSize = 1 } = {}) {
  const content = group ? ticket?.group_qr_content : ticket?.qr_content;
  const journey = [
    { label: 'Boarding', value: ticket?.origin || '-' },
    { label: 'Alighting', value: ticket?.destination || '-' },
    { label: 'Departs', value: manilaDepartureLabel(ticket) },
  ];
  const lines = group
    ? [
      { label: 'Group ID', value: ticket?.transaction_reference || '-' },
      { label: 'Passengers', value: String(groupSize) },
      ...journey,
    ]
    : [
      { label: 'Ticket ID', value: shortId(ticket?.ticket_uuid) || '-' },
      ...journey,
      { label: 'Seat', value: ticket?.seat_type || '-' },
      { label: 'Fare paid', value: ticket?.amount != null ? `PHP ${Number(ticket.amount).toFixed(2)}` : '-' },
      { label: 'Transaction', value: ticket?.transaction_reference || '-' },
    ];

  return {
    title: group ? 'SmartTransit Group Ticket' : 'SmartTransit Ticket',
    qrContent: content || null,
    lines,
    footer: group ? 'Show this QR once to board everyone in this order' : 'Present this QR code to the conductor when boarding',
  };
}

export function ticketFileName(ticket, { group = false } = {}) {
  const id = group
    ? String(ticket?.transaction_reference || 'group').replace(/[^A-Za-z0-9-]/g, '')
    : shortId(ticket?.ticket_uuid) || 'ticket';
  return `smart-transit-${group ? 'group' : 'ticket'}-${id}.png`;
}

const fit = (ctx, text, maxWidth) => {
  let out = String(text);
  if (ctx.measureText(out).width <= maxWidth) return out;
  while (out.length > 1 && ctx.measureText(`${out}...`).width > maxWidth) out = out.slice(0, -1);
  return `${out}...`;
};

const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('The QR image could not be prepared.'));
  image.src = src;
});

/** Draws the ticket onto a new canvas (browser only). */
export async function renderTicketCanvas(model) {
  if (!model.qrContent) throw new Error('This ticket has no QR to save yet.');

  // Text metrics are wrong until the fonts are ready; draw only after they are.
  if (document.fonts?.ready) await document.fonts.ready;

  const width = 900;
  const rowHeight = 64;
  const qrSize = 600; // quiet zone is part of the generated image
  const height = 220 + qrSize + 40 + model.lines.length * rowHeight + 120;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image rendering is not supported on this device.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#0f766e';
  ctx.fillRect(0, 0, width, 170);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 54px Arial, sans-serif';
  ctx.fillText(model.title, 48, 108);

  const qrImage = await loadImage(await qrDataUrl(model.qrContent, qrSize));
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qrImage, (width - qrSize) / 2, 200, qrSize, qrSize);

  let y = 200 + qrSize + 60;
  model.lines.forEach((line) => {
    ctx.fillStyle = '#64748b';
    ctx.font = '28px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(line.label, 48, y);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 30px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(fit(ctx, line.value, width - 96 - 220), width - 48, y);
    y += rowHeight;
  });

  ctx.fillStyle = '#166534';
  ctx.font = 'bold 26px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(fit(ctx, model.footer, width - 96), width / 2, y + 40);

  return canvas;
}

/** Draws the model and returns a PNG File. */
export async function renderTicketFile(model, fileName) {
  const canvas = await renderTicketCanvas(model);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('The image could not be created.'))), 'image/png');
  });
  return new File([blob], fileName, { type: 'image/png' });
}

/** True when this device should get the share sheet rather than a download. */
export function canShareFile(file, env = {}) {
  const nav = env.navigator ?? globalThis.navigator;
  return Boolean(nav && isMobileDevice(nav) && typeof nav.share === 'function' && nav.canShare?.({ files: [file] }));
}

function download(file, env = {}) {
  const doc = env.document ?? globalThis.document;
  const urlApi = env.URL ?? globalThis.URL;
  const href = urlApi.createObjectURL(file);
  const anchor = doc.createElement('a');
  anchor.href = href;
  anchor.download = file.name;
  doc.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => urlApi.revokeObjectURL(href), 10000);
}

/**
 * Hands a ready File to the device. Call it straight from the click handler with an
 * already-rendered file: Safari can reject navigator.share if image generation was awaited
 * first. Returns 'shared' | 'downloaded' | 'cancelled'. A dismissed share sheet
 * (AbortError) is a cancel, not a failure.
 */
export async function deliverFile(file, env = {}) {
  const nav = env.navigator ?? globalThis.navigator;
  if (canShareFile(file, env)) {
    try {
      await nav.share({ files: [file], title: 'SmartTransit ticket' });
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
      // Any other share failure falls through to a plain download.
    }
  }
  download(file, env);
  return 'downloaded';
}
