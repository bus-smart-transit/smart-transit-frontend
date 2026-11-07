// A tracking code is 43 URL-safe characters (256 bits). People paste either the code or the whole
// link (".../track/<code>", sometimes with a query or a trailing slash), so accept both.
const TOKEN = /^[A-Za-z0-9_-]{43}$/

/** The tracking code inside whatever was pasted, or '' when there is none. */
export function extractTrackingToken(input) {
  const text = String(input || '').trim()
  if (!text) return ''
  if (TOKEN.test(text)) return text

  const fromPath = text.match(/\/track\/([A-Za-z0-9_-]{43})(?=$|[/?#\s])/)
  return fromPath ? fromPath[1] : ''
}

// Batch 49 item 5: the short code on a ticket (8 characters, no 0/O/1/I/L). People may type it in lower case or with
// spaces or a dash; the server does the same clean-up and is the only judge of whether it is real.
const SHORT_CODE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/

/** The short tracking code in what was typed, upper case without spaces or dashes, or '' when it is not one. */
export function normalizeTrackingCode(input) {
  const code = String(input || '').replace(/[\s-]+/g, '').toUpperCase()
  return SHORT_CODE.test(code) ? code : ''
}
