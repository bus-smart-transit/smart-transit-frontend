import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// D1: no city, province or corridor names in logic or UI code. Region-level
// values come from the server region config; route-level values from route data.
// Scope: the map layer, staff portals, services, config, utils and the whole passenger
// side (booking, timeline, tickets, landing, auth).

const SRC = join(import.meta.dirname, '..')
const LITERAL = /\b(Davao|Tagum|Ecoland|Toril|Panabo|Bankerohan|Mati)\b/

const SCOPE = [
  'components/Map',
  'components/Staff',
  'services',
  'config',
  'utils',
  'api/hooks/Staff',
  'api/hooks/Passenger',
  'components/Passenger',
  'pages/passenger',
]

function* walk(path) {
  const stat = statSync(path)
  if (stat.isFile()) { yield path; return }
  for (const name of readdirSync(path)) {
    if (name === '__tests__' || name === 'node_modules') continue
    yield* walk(join(path, name))
  }
}

describe('no place-name literals in application code', () => {
  it('finds none in the touched areas', () => {
    const offenders = []
    for (const entry of SCOPE) {
      for (const file of walk(join(SRC, entry))) {
        if (!/\.(js|jsx)$/.test(file) || /\.test\./.test(file)) continue
        if (LITERAL.test(readFileSync(file, 'utf8'))) offenders.push(relative(SRC, file))
      }
    }
    expect(offenders).toEqual([])
  })
})
