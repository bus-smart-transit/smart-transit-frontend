import QRCode from 'qrcode'

// C5: a ticket QR can be saved as an image (PNG or JPEG) instead of only printed.
// The QR is drawn locally from the ticket's own QR payload (no third-party image
// fetch, so the canvas is never tainted) and the image carries the identifiers a
// conductor or the passenger needs. Only tickets whose QR is already active can be
// saved; this never mints or reveals a QR that the PIN/QR gating has not released.

export const IMAGE_FORMATS = {
  png: { mime: 'image/png', extension: 'png', quality: undefined },
  jpeg: { mime: 'image/jpeg', extension: 'jpg', quality: 0.92 },
}

const shortId = (uuid) => String(uuid || '').slice(0, 8).toUpperCase()

/** What the image says, as plain data (drawn by renderTicketCanvas; unit-testable without a canvas). */
export function buildTicketImageModel(ticket, { group = false, groupSize = 1 } = {}) {
  const content = group ? ticket?.group_qr_content : ticket?.qr_content
  const lines = group
    ? [
      { label: 'Group boarding QR', value: `${groupSize} tickets` },
      { label: 'Transaction', value: ticket?.transaction_reference || '-' },
    ]
    : [
      { label: 'Route', value: [ticket?.origin, ticket?.destination].filter(Boolean).join(' to ') || '-' },
      { label: 'Departure', value: ticket?.departure_label || '-' },
      { label: 'Seat', value: ticket?.seat_type || '-' },
      { label: 'Fare paid', value: ticket?.amount != null ? `PHP ${Number(ticket.amount).toFixed(2)}` : '-' },
      { label: 'Ticket ID', value: shortId(ticket?.ticket_uuid) || '-' },
      { label: 'Transaction', value: ticket?.transaction_reference || '-' },
    ]

  return {
    title: group ? 'SmartTransit Group Ticket' : 'SmartTransit Ticket',
    qrContent: content || null,
    lines,
    footer: group ? 'Show this QR once to board everyone in this order' : 'Present this QR code to the conductor when boarding',
  }
}

export function ticketFileName(ticket, format = 'png', { group = false } = {}) {
  const ext = (IMAGE_FORMATS[format] || IMAGE_FORMATS.png).extension
  const id = group
    ? String(ticket?.transaction_reference || 'group').replace(/[^A-Za-z0-9-]/g, '')
    : shortId(ticket?.ticket_uuid) || 'ticket'
  return `smart-transit-${group ? 'group' : 'ticket'}-${id}.${ext}`
}

/** Draws the ticket onto a new canvas (browser only). */
export async function renderTicketCanvas(model) {
  if (!model.qrContent) throw new Error('This ticket has no active QR yet.')

  const width = 900
  const rowHeight = 64
  const height = 250 + 640 + model.lines.length * rowHeight + 120
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Image rendering is not supported on this device.')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#0f766e'
  ctx.fillRect(0, 0, width, 170)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 54px Arial, sans-serif'
  ctx.fillText(model.title, 48, 108)

  const qrSize = 560
  const qrImage = await new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('The QR image could not be prepared.'))
    QRCode.toDataURL(model.qrContent, { width: qrSize, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => { image.src = url })
      .catch(reject)
  })
  ctx.drawImage(qrImage, (width - qrSize) / 2, 220, qrSize, qrSize)

  let y = 220 + qrSize + 70
  model.lines.forEach((line) => {
    ctx.fillStyle = '#64748b'
    ctx.font = '28px Arial, sans-serif'
    ctx.fillText(line.label, 48, y)
    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 30px Arial, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(String(line.value), width - 48, y)
    ctx.textAlign = 'left'
    y += rowHeight
  })

  ctx.fillStyle = '#166534'
  ctx.font = 'bold 26px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(model.footer, width / 2, y + 40)
  ctx.textAlign = 'left'

  return canvas
}

export function canvasToBlob(canvas, format = 'png') {
  const { mime, quality } = IMAGE_FORMATS[format] || IMAGE_FORMATS.png
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The image could not be created.'))), mime, quality)
  })
}

/**
 * Hands the image to the device: the share sheet where files can be shared (on
 * iOS this offers "Save Image"), otherwise a normal file download. Returns
 * 'shared' | 'downloaded' | 'cancelled'.
 */
export async function deliverImage(blob, fileName, env = {}) {
  const nav = env.navigator ?? globalThis.navigator
  const doc = env.document ?? globalThis.document
  const urlApi = env.URL ?? globalThis.URL
  const file = new File([blob], fileName, { type: blob.type })

  if (nav?.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: 'SmartTransit ticket' })
      return 'shared'
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled'
      // Any other share failure falls through to a plain download.
    }
  }

  const href = urlApi.createObjectURL(blob)
  const anchor = doc.createElement('a')
  anchor.href = href
  anchor.download = fileName
  doc.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => urlApi.revokeObjectURL(href), 10000)
  return 'downloaded'
}

/** Render + encode + hand to the device in one call. */
export async function saveTicketImage(ticket, format = 'png', options = {}) {
  const model = buildTicketImageModel(ticket, options)
  const canvas = await renderTicketCanvas(model)
  const blob = await canvasToBlob(canvas, format)
  return deliverImage(blob, ticketFileName(ticket, format, options))
}
