import { describe, expect, it } from 'vitest'
import { parseReferenceParams, toReferenceSearch } from './referenceParams'
import { NAME_MAX, searchRows, sortedByName, toRow, validateName, visibleDescription } from './referenceRows'
import type { ReferenceRow } from './referenceRows'

const row = (displayName: string | null, description: string | null = displayName): ReferenceRow => ({ displayName, description })

describe('sortedByName', () => {
  it('sorts case-insensitively, tolerates missing names and does not mutate', () => {
    const input = [row('banana'), row('Apple'), row(null), row('cherry')]
    expect(sortedByName(input).map((r) => r.displayName)).toEqual([null, 'Apple', 'banana', 'cherry'])
    expect(input[0].displayName).toBe('banana')
    expect(sortedByName(undefined)).toEqual([])
  })
})

describe('searchRows', () => {
  const rows = [row('Corner Market', 'groceries nearby'), row('Noodle House'), row('Metro', 'bus and train')]
  it('matches name or description, case-insensitively', () => {
    expect(searchRows(rows, 'NOODLE').map((r) => r.displayName)).toEqual(['Noodle House'])
    expect(searchRows(rows, 'train').map((r) => r.displayName)).toEqual(['Metro'])
  })
  it('keeps everything for a blank query and nothing for no match', () => {
    expect(searchRows(rows, '  ')).toHaveLength(3)
    expect(searchRows(rows, 'zzz')).toEqual([])
  })
})

describe('validateName', () => {
  const rows = [row('Visa'), row('Cash')]
  it('requires a name within the length limit', () => {
    expect(validateName('   ', rows)).toBe('Enter a name')
    expect(validateName('x'.repeat(NAME_MAX), rows)).toBeNull()
    expect(validateName('x'.repeat(NAME_MAX + 1), rows)).toMatch(/under 64/)
  })
  it('rejects a name another row already has, ignoring case and padding', () => {
    expect(validateName(' visa ', rows)).toBe('That name already exists')
    expect(validateName('Debit', rows)).toBeNull()
  })
  it('lets a row keep its own name when editing it', () => {
    expect(validateName('Visa', rows, 0)).toBeNull()
    expect(validateName('Visa', rows, 1)).toBe('That name already exists')
  })
})

describe('toRow', () => {
  it('trims, and falls back to the name for a blank description', () => {
    expect(toRow({ displayName: '  Visa  ', description: '   ' })).toEqual({ displayName: 'Visa', description: 'Visa' })
    expect(toRow({ displayName: 'Visa', description: ' main card ' })).toEqual({ displayName: 'Visa', description: 'main card' })
  })
  it('copes with a description that was never filled in', () => {
    expect(toRow({ displayName: 'Visa' })).toEqual({ displayName: 'Visa', description: 'Visa' })
  })
  it('carries the necessity only when there is one', () => {
    expect(toRow({ displayName: 'Rent', description: '', necessity: 'Essential' as never })).toHaveProperty('necessity', 'Essential')
    expect(toRow({ displayName: 'Rent', description: '' })).not.toHaveProperty('necessity')
  })
})

describe('visibleDescription', () => {
  it('hides a description that only repeats the name', () => {
    expect(visibleDescription(row('Visa'))).toBe('')
    expect(visibleDescription(row('Visa', 'main card'))).toBe('main card')
    expect(visibleDescription(row('Visa', null))).toBe('')
  })
})

describe('reference params', () => {
  const parse = (q: string) => parseReferenceParams(new URLSearchParams(q))
  it('defaults to vendors and ignores unknown tables', () => {
    expect(parse('')).toEqual({ table: 'vendors', q: '' })
    expect(parse('table=bogus').table).toBe('vendors')
  })
  it('round-trips and omits defaults', () => {
    expect(toReferenceSearch(parse('')).toString()).toBe('')
    const state = { table: 'payment-methods' as const, q: 'vis' }
    expect(parseReferenceParams(toReferenceSearch(state))).toEqual(state)
  })
})
