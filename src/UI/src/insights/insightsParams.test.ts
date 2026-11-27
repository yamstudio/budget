import { describe, expect, it } from 'vitest'
import { ExpenseGrouping, ExpenseNecessity } from '../gensrc/Api'
import { DEFAULT_PARAMS, activeFilterCount, formatDate, parseInsightsParams, resolveRange, toSearchParams } from './insightsParams'

const parse = (query: string) => parseInsightsParams(new URLSearchParams(query))

describe('parseInsightsParams', () => {
  it('uses defaults for an empty query', () => {
    expect(parse('')).toEqual({ ...DEFAULT_PARAMS, from: undefined, to: undefined })
  })

  it('falls back to defaults for unknown or malformed values', () => {
    const p = parse('view=nope&range=99y&by=Banana&cat=x&cat=-1&cat=2&cat=2&nec=Maybe&nec=Essential')
    expect(p.view).toBe('breakdown')
    expect(p.range).toBe('6m')
    expect(p.groupBy).toBe(ExpenseGrouping.Category)
    expect(p.categoryIds).toEqual([2])
    expect(p.necessities).toEqual([ExpenseNecessity.Essential])
  })

  it('requires a valid ordered from/to for the custom range', () => {
    expect(parse('range=custom').range).toBe('6m')
    expect(parse('range=custom&from=2026-02-01&to=2026-01-01').range).toBe('6m')
    expect(parse('range=custom&from=2026-02-01&to=junk').range).toBe('6m')
    const ok = parse('range=custom&from=2026-01-01&to=2026-02-01')
    expect([ok.range, ok.from, ok.to]).toEqual(['custom', '2026-01-01', '2026-02-01'])
  })
})

describe('toSearchParams', () => {
  it('omits defaults', () => {
    expect(toSearchParams(DEFAULT_PARAMS).toString()).toBe('')
  })

  it('round-trips a fully specified state', () => {
    const state = {
      view: 'trends' as const,
      range: 'custom' as const,
      from: '2026-01-01',
      to: '2026-03-31',
      groupBy: ExpenseGrouping.Vendor,
      categoryIds: [3, 1],
      vendorIds: [9],
      paymentMethodIds: [2, 4],
      necessities: [ExpenseNecessity.Discretionary],
    }
    expect(parseInsightsParams(toSearchParams(state))).toEqual(state)
  })
})

describe('resolveRange', () => {
  const now = new Date(2026, 10, 27) // 27 Nov 2026
  const resolve = (range: string, extra = {}) => {
    const { fromDate, toDate } = resolveRange({ range: range as never, ...extra }, now)
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

describe('activeFilterCount', () => {
  it('counts filter kinds in use, not values', () => {
    expect(activeFilterCount(DEFAULT_PARAMS)).toBe(0)
    expect(activeFilterCount({ ...DEFAULT_PARAMS, categoryIds: [1, 2, 3], vendorIds: [4] })).toBe(2)
  })
})
