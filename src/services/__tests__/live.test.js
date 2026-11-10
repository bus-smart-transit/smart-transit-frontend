import { afterEach, describe, expect, test, vi } from 'vitest'

// Batch 58: the shared live connection, against a stand-in for Laravel Echo (no network).
const made = []
vi.mock('laravel-echo', () => ({
  default: class FakeEcho {
    constructor(options) {
      this.options = options
      this.subscriptions = []
      this.connector = { pusher: { connection: { state: 'connecting', bind: (name, fn) => { this.onState = fn } } } }
      made.push(this)
    }

    channel(name) { return this.subscribe(name, false) }

    private(name) { return this.subscribe(name, true) }

    subscribe(name, isPrivate) {
      const sub = { name, isPrivate, handlers: {}, listen(event, fn) { this.handlers[event] = fn; return this }, stopListening(event) { delete this.handlers[event]; return this } }
      this.subscriptions.push(sub)
      return sub
    }

    disconnect() {}
  },
}))
vi.mock('pusher-js', () => ({ default: function Pusher() {} }))
const post = vi.fn()
vi.mock('../api', () => ({ default: { post: (...args) => post(...args) } }))

import { getEcho, listen, liveConfigured, liveState, onLiveState, resetLiveForTests } from '../live'

afterEach(() => {
  resetLiveForTests()
  made.length = 0
  vi.unstubAllEnvs()
  sessionStorage.clear()
})

describe('live connection', () => {
  test('is off without a Reverb key: listening does nothing and nothing is made', () => {
    vi.stubEnv('VITE_REVERB_APP_KEY', '')
    expect(liveConfigured()).toBe(false)
    expect(getEcho()).toBeNull()
    expect(listen({ channel: 'fleet-positions', event: 'bus.moved', handler: () => {} })).toBeTypeOf('function')
    expect(made).toHaveLength(0)
  })

  test('connects once to the configured server and listens to public and private channels', () => {
    vi.stubEnv('VITE_REVERB_APP_KEY', 'pub-key')
    vi.stubEnv('VITE_REVERB_HOST', 'api.example.test')
    vi.stubEnv('VITE_REVERB_PORT', '443')
    vi.stubEnv('VITE_REVERB_SCHEME', 'https')
    const handler = vi.fn()

    const stop = listen({ channel: 'fleet-positions', event: 'bus.moved', handler })
    listen({ channel: 'user.7', event: 'notification', handler, isPrivate: true })

    expect(made).toHaveLength(1)
    expect(made[0].options).toMatchObject({ broadcaster: 'reverb', key: 'pub-key', wsHost: 'api.example.test', wsPort: 443, forceTLS: true })
    const [publicSub, privateSub] = made[0].subscriptions
    expect(publicSub).toMatchObject({ name: 'fleet-positions', isPrivate: false })
    expect(privateSub).toMatchObject({ name: 'user.7', isPrivate: true })
    publicSub.handlers['.bus.moved']({ fleet_id: 3 })
    expect(handler).toHaveBeenCalledWith({ fleet_id: 3 })
    stop()
    expect(publicSub.handlers['.bus.moved']).toBeUndefined()
  })

  test('signs private channels in with the staff token, and reports the connection state', () => {
    vi.stubEnv('VITE_REVERB_APP_KEY', 'pub-key')
    sessionStorage.setItem('staff_token', 'staff-123')
    post.mockResolvedValue({ data: { auth: 'signed' } })
    const states = []
    onLiveState((s) => states.push(s))
    const echo = getEcho()

    const callback = vi.fn()
    echo.options.authorizer({ name: 'private-user.7' }).authorize('1.2', callback)
    expect(post).toHaveBeenCalledWith('/broadcasting/auth', { socket_id: '1.2', channel_name: 'private-user.7' }, { headers: { Authorization: 'Bearer staff-123' } })

    echo.onState({ current: 'connected' })
    expect(liveState()).toBe('connected')
    expect(states).toContain('connected')
  })
})
