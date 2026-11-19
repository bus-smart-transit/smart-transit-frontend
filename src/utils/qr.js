import QRCode from 'qrcode'

// The one place a ticket QR is drawn. The on-screen QR (TicketQr), the saved image and
// the print view all call qrDataUrl(), so they cannot diverge, and nothing is sent to a
// third-party image service: the QR is computed in the browser from the payload string.

// Payload strings are what the conductor scanner has always read: the ticket uuid for a
// single ticket and "grp:<transaction_reference>" for a group ticket.
export const GROUP_QR_PREFIX = 'grp:'

export const groupQrPayload = (transactionReference) => (
  transactionReference ? `${GROUP_QR_PREFIX}${transactionReference}` : null
)

// Error correction M and the standard 4-module quiet zone keep the code scannable.
export const QR_RENDER_OPTIONS = Object.freeze({ errorCorrectionLevel: 'M', margin: 4 })

/** PNG data URL of the QR for `content`, `size` pixels square (quiet zone included). */
export function qrDataUrl(content, size = 300) {
  if (!content) return Promise.reject(new Error('There is no QR payload to draw.'))
  return QRCode.toDataURL(String(content), { ...QR_RENDER_OPTIONS, width: size })
}

/**
 * Opens a print window immediately (so the browser allows it) and fills it once the QR is
 * drawn: buildHtml(qrSrc) returns the page. The QR is a local data URL, never a remote one.
 */
export function openPrintWindow(content, buildHtml) {
  const popup = window.open('', '_blank', 'width=900,height=700')
  if (!popup) return
  qrDataUrl(content, 300)
    .then((qrSrc) => {
      popup.document.write(buildHtml(qrSrc))
      popup.document.close()
    })
    .catch(() => popup.close())
}
