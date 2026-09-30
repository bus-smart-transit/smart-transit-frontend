import { describe, expect, it, vi } from 'vitest'
import QRCode from 'qrcode'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { groupQrPayload, qrDataUrl, QR_RENDER_OPTIONS } from '../qr'

describe('QR payloads are unchanged (the conductor scanner still reads them)', () => {
  it('group payload is grp:<transaction reference>', () => {
    expect(groupQrPayload('TXN-ABC')).toBe('grp:TXN-ABC')
    expect(groupQrPayload(null)).toBeNull()
  })

  it('the QR encodes exactly the payload string it is given, with a 4-module quiet zone', async () => {
    const uuid = '3f1c2d4e-0a9b-4c6d-8e7f-1234567890ab'
    const spy = vi.spyOn(QRCode, 'toDataURL')

    const url = await qrDataUrl(uuid, 300)
    // The encoder receives the payload string untouched (no wrapping, no URL, no prefix).
    expect(spy.mock.calls[0][0]).toBe(uuid)
    expect(url.startsWith('data:image/png;base64,')).toBe(true)
    expect(QR_RENDER_OPTIONS.margin).toBe(4)
  })

  it('refuses to draw an empty payload', async () => {
    await expect(qrDataUrl('')).rejects.toThrow()
  })
})

describe('no ticket id or URL is sent to a third-party QR host', () => {
  const SRC = join(import.meta.dirname, '..', '..')
  function* walk(path) {
    if (statSync(path).isFile()) { yield path; return }
    for (const name of readdirSync(path)) {
      if (name === 'node_modules') continue
      yield* walk(join(path, name))
    }
  }

  it('finds no external QR image service anywhere in the frontend source', () => {
    const offenders = []
    for (const file of walk(SRC)) {
      if (!/\.(js|jsx)$/.test(file) || /__tests__|\.test\./.test(file)) continue
      if (/qrserver|chart\.googleapis|api\.qrserver/i.test(readFileSync(file, 'utf8'))) offenders.push(relative(SRC, file))
    }
    expect(offenders).toEqual([])
  })
})

describe('qrDataUrl is the single renderer', () => {
  it('uses the shared options for every size', async () => {
    const spy = vi.spyOn(QRCode, 'toDataURL')
    await qrDataUrl('payload', 400)
    expect(spy).toHaveBeenCalledWith('payload', expect.objectContaining({ errorCorrectionLevel: 'M', margin: 4, width: 400 }))
  })
})
