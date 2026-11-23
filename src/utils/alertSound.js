/**
 * 2026-11-23 (advisor): a short alarm when a crew member raises an emergency alert (breakdown, accident, road blocked),
 * played on the Operator's page. The sound is made by the browser (Web Audio), so there is no audio file to load.
 * Browsers only allow sound after the person has clicked or typed somewhere on the page; before that it stays silent.
 * The Operator can turn it off; the choice is kept in this browser only.
 */

const STORAGE_KEY = 'operatorAlertSound'
let context = null

export function alertSoundEnabled() {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setAlertSoundEnabled(enabled) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, enabled ? 'on' : 'off')
  } catch {
    // private window or blocked storage: the choice lasts until the page is reloaded
  }
}

/** Three short two-tone beeps (about one second). Returns false when the browser cannot play it. */
export function playAlertSound() {
  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext
  if (!AudioContextClass) return false
  try {
    context = context || new AudioContextClass()
    if (context.state === 'suspended') void context.resume()
    const start = context.currentTime + 0.05
    for (let i = 0; i < 6; i += 1) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'square'
      oscillator.frequency.value = i % 2 === 0 ? 880 : 660
      const at = start + i * 0.18
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.18, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(at)
      oscillator.stop(at + 0.17)
    }
    return true
  } catch {
    return false
  }
}

/** The ids of open alerts that were not open the last time the list was read (none on the first read). */
export function newlyOpenedAlertIds(previousIds, alerts) {
  if (previousIds === null) return []
  return (alerts || [])
    .filter((alert) => alert?.status === 'open' && !previousIds.has(alert.alert_id))
    .map((alert) => alert.alert_id)
}
