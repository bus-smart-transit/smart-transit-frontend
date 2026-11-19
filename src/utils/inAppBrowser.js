// In-app browsers (Facebook, Messenger, Instagram, ...) run pages in a WebView where file
// downloads and the share sheet often fail silently. Detect them so the UI can ask the
// passenger to open the page in their real browser instead of showing a dead button.

const IN_APP_PATTERNS = [
  ['Facebook', /\bFBAN\b|\bFBAV\b|\bFB_IAB\b/i],
  ['Messenger', /\bMessenger\b|\bFBAN\/Messenger/i],
  ['Instagram', /\bInstagram\b/i],
  ['Line', /\bLine\//i],
  ['WeChat', /MicroMessenger/i],
  ['TikTok', /musical_ly|BytedanceWebview|\bTikTok\b/i],
  ['Snapchat', /\bSnapchat\b/i],
  ['Twitter', /\bTwitter\b/i],
  ['Viber', /\bViber\b/i],
]

/** The in-app browser's name, or null for a normal browser. */
export function detectInAppBrowser(userAgent = globalThis.navigator?.userAgent || '') {
  const ua = String(userAgent)
  const hit = IN_APP_PATTERNS.find(([, pattern]) => pattern.test(ua))
  return hit ? hit[0] : null
}

/** Phones and tablets (including iPadOS, which reports a Mac user agent). */
export function isMobileDevice(nav = globalThis.navigator) {
  if (!nav) return false
  if (nav.userAgentData && typeof nav.userAgentData.mobile === 'boolean') return nav.userAgentData.mobile
  const ua = String(nav.userAgent || '')
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return true
  return /Macintosh/i.test(ua) && Number(nav.maxTouchPoints) > 1
}
