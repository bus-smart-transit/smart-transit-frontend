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
