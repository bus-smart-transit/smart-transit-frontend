import { describe, expect, it } from 'vitest'
import { etaLabel, formatDuration, groupTimelineRows, journeyFacts, nodeState, pollIntervalMs } from '../tripTimeline'

const row = (id, extra = {}) => ({
  stop_id: id, type: 'stop', custom: false, is_boarding: false, is_alighting: false, in_journey: true, progress: 'upcoming', ...extra,
})

describe('formatDuration', () => {
  it('formats minutes and hours, and returns null when unknown', () => {
    expect(formatDuration(40)).toBe('40 min')
    expect(formatDuration(95)).toBe('1 h 35 min')
    expect(formatDuration(120)).toBe('2 h')
    expect(formatDuration(null)).toBeNull()
    expect(formatDuration(undefined)).toBeNull()
  })
})

describe('etaLabel', () => {
  it('is null (rendered as "ETA unavailable") when the server has no ETA', () => {
    expect(etaLabel({ eta_time: '08:15' })).toBe('08:15')
    expect(etaLabel({ eta_time: null })).toBeNull()
  })
})

describe('groupTimelineRows', () => {
  it('collapses runs of pass-through rows at or above the threshold only', () => {
    const rows = [row(1), row(2, { type: 'pass_through' }), row(3, { type: 'pass_through' }), row(4, { type: 'pass_through' }), row(5)]
    const items = groupTimelineRows(rows, 3)
    expect(items.map((i) => i.kind)).toEqual(['row', 'group', 'row'])
    expect(items[1].rows).toHaveLength(3)
    expect(items[1].reason).toBe('pass_through')

    const short = groupTimelineRows([row(1), row(2, { type: 'pass_through' }), row(3, { type: 'pass_through' }), row(4)], 3)
    expect(short.every((i) => i.kind === 'row')).toBe(true)
  })

  it('folds rows outside the chosen journey but never the boarding/alighting rows', () => {
    const rows = [
      row(1, { in_journey: false }), row(2, { in_journey: false }), row(3, { in_journey: false }),
      row(4, { is_boarding: true }), row(5), row(6, { is_alighting: true }),
      row(7, { in_journey: false }), row(8, { in_journey: false }), row(9, { in_journey: false }),
    ]
    const items = groupTimelineRows(rows, 3)
    expect(items.map((i) => i.kind)).toEqual(['group', 'row', 'row', 'row', 'group'])
    expect(items[0].reason).toBe('outside')
  })

  it('does not fold outside rows before any journey is chosen', () => {
    const rows = [row(1), row(2), row(3), row(4)]
    expect(groupTimelineRows(rows, 3).every((i) => i.kind === 'row')).toBe(true)
  })

  it('never folds a custom drop-off row', () => {
    const rows = [row(1, { type: 'pass_through' }), row(2, { type: 'pass_through' }), row(0, { type: 'custom', custom: true, stop_id: null }), row(3, { type: 'pass_through' })]
    const items = groupTimelineRows(rows, 2)
    expect(items.some((i) => i.kind === 'row' && i.row.custom)).toBe(true)
  })
})

describe('nodeState / pollIntervalMs / journeyFacts', () => {
  it('maps server progress to a node state', () => {
    expect(nodeState(row(1, { progress: 'passed' }))).toBe('passed')
    expect(nodeState(row(1, { progress: 'current' }))).toBe('current')
    expect(nodeState(row(1))).toBe('upcoming')
    expect(nodeState(row(1, { custom: true }))).toBe('custom')
  })

  it('uses the server poll interval with a floor', () => {
    expect(pollIntervalMs({ poll_interval_seconds: 30 })).toBe(30000)
    expect(pollIntervalMs({ poll_interval_seconds: 1 })).toBe(5000)
    expect(pollIntervalMs(null)).toBe(30000)
  })

  it('omits unknown journey facts', () => {
    expect(journeyFacts({ header: { duration_minutes: null, stops_between: 2, distance_km: 12.34 } }))
      .toEqual([{ label: 'Stops between', value: '2' }, { label: 'Distance', value: '12.3 km' }])
  })
})
