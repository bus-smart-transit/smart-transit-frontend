import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('../api.js', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

import api from '../api.js'
import { resolveTrackingInput } from '../trackingService'
import { normalizeTrackingCode } from '../../utils/trackingToken'

const TOKEN = 'Ab3_-'.repeat(8) + 'xyz' // 43 characters

// Batch 49 item 5: one way to read what a passenger typed at "Track my bus".
describe('normalizeTrackingCode', () => {
  test('accepts the code in any case, with spaces or a dash', () => {
    expect(normalizeTrackingCode('7kq4 m2xd')).toBe('7KQ4M2XD')
    expect(normalizeTrackingCode(' 7KQ4-M2XD ')).toBe('7KQ4M2XD')
  })

  test('refuses look-alike characters and wrong lengths', () => {
    expect(normalizeTrackingCode('7KQ4M2X0')).toBe('') // zero
    expect(normalizeTrackingCode('7KQ4M2XO')).toBe('') // letter O
    expect(normalizeTrackingCode('7KQ4M2XI')).toBe('')
    expect(normalizeTrackingCode('7KQ4M2XL')).toBe('')
    expect(normalizeTrackingCode('7KQ4M2X1')).toBe('')
    expect(normalizeTrackingCode('7KQ4M2')).toBe('')
    expect(normalizeTrackingCode('')).toBe('')
  })
})

describe('resolveTrackingInput', () => {
  beforeEach(() => vi.clearAllMocks())

  test('uses a tracking link as it is, without asking the server', async () => {
    expect(await resolveTrackingInput(`https://x.example/track/${TOKEN}`)).toBe(TOKEN)
    expect(api.post).not.toHaveBeenCalled()
  })

  test('sends a short code to the server and gets the tracking token back', async () => {
    api.post.mockResolvedValue({ data: { data: { tracking_token: TOKEN } } })
    expect(await resolveTrackingInput('7kq4 m2xd')).toBe(TOKEN)
    expect(api.post).toHaveBeenCalledWith('/track/code', { code: '7KQ4M2XD' })
  })

  test('gives nothing back for input that is neither', async () => {
    expect(await resolveTrackingInput('hello')).toBe('')
    expect(api.post).not.toHaveBeenCalled()
  })
})
