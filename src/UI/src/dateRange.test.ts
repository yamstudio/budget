import { describe, expect, it } from 'vitest'
import { formatDate, parseDateRange, resolveRange, writeDateRange } from './dateRange'
import type { DateRangeKey } from './dateRange'

const parse = (query: string, fallback: DateRangeKey = '6m') => parseDateRange(new URLSearchParams(query), fallback)

describe('parseDateRange', () => {
  it('uses the fallback for missing or unknown ranges', () => {
    expect(parse('')).toEqual({ range: '6m', from: undefined, to: undefined })
    expect(parse('range=99y', '3m').range).toBe('3m')
  })

  it('requires a valid ordered from/to for the custom range', () => {
    expect(parse('range=custom').range).toBe('6m')
    expect(parse('range=custom&from=2026-02-01&to=2026-01-01').range).toBe('6m')
    expect(parse('range=custom&from=2026-02-01&to=junk').range).toBe('6m')
    expect(parse('range=custom&from=2026-01-01&to=2026-02-01')).toEqual({ range: 'custom', from: '2026-01-01', to: '2026-02-01' })
  })
})

describe('writeDateRange', () => {
  it('omits the default and round-trips the rest', () => {
    const write = (p: Parameters<typeof writeDateRange>[1]) => {
      const search = new URLSearchParams()
      writeDateRange(search, p, '6m')
      return search
    }
    expect(write({ range: '6m' }).toString()).toBe('')
    const custom = { range: 'custom' as const, from: '2026-01-01', to: '2026-03-31' }
    expect(parseDateRange(write(custom), '6m')).toEqual(custom)
    expect(parseDateRange(write({ range: 'ytd' }), '6m').range).toBe('ytd')
  })
})

describe('resolveRange', () => {
  const now = new Date(2026, 10, 27) // 27 Nov 2026
  const resolve = (range: DateRangeKey, extra = {}) => {
    const { fromDate, toDate } = resolveRange({ range, ...extra }, now)
    return [formatDate(fromDate), formatDate(toDate)]
  }

  it('presets start at the first of the month and include the current month', () => {
    expect(resolve('3m')).toEqual(['2026-09-01', '2026-11-27'])
    expect(resolve('12m')).toEqual(['2025-12-01', '2026-11-27'])
  })

  it('ytd starts on January 1st', () => {
    expect(resolve('ytd')).toEqual(['2026-01-01', '2026-11-27'])
  })

  it('custom uses the given dates', () => {
    expect(resolve('custom', { from: '2026-02-03', to: '2026-02-09' })).toEqual(['2026-02-03', '2026-02-09'])
  })
})
