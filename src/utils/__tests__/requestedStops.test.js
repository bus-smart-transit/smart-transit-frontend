import { describe, expect, it } from 'vitest'
import { groupRequestedStops } from '../requestedStops'

const r = (label, after, known = true) => ({ label, after_stop_sequence: after, position_known: known })

describe('groupRequestedStops', () => {
  it('puts every requested stop somewhere: after its stop, before the first stop, or unknown', () => {
    const groups = groupRequestedStops([r('a', 3), r('b', 0), r('c', null, false), r('d', 3), r('e', 1)])
    expect(groups.before.map((x) => x.label)).toEqual(['b'])
    expect(groups.after[3].map((x) => x.label)).toEqual(['a', 'd'])
    expect(groups.after[1].map((x) => x.label)).toEqual(['e'])
    expect(groups.unknown.map((x) => x.label)).toEqual(['c'])
    const total = groups.before.length + groups.unknown.length + Object.values(groups.after).flat().length
    expect(total).toBe(5)
  })

  it('tolerates a missing list', () => {
    expect(groupRequestedStops(undefined)).toEqual({ before: [], after: {}, unknown: [] })
  })
})
