import { describe, expect, it } from 'vitest'
import { addDraftRow, canSave, removeRow, replaceSavedRow, seedRows, toRefData } from './gridRows'
import type { EditableRow } from './gridRows'

type Item = { id?: number; name?: string; amount?: number; note?: string | null }
const idOf = (item: Item) => item.id

describe('toRefData', () => {
  it('maps ids to display names', () => {
    const items = [
      { id: 1, name: 'Food' },
      { id: 2, name: 'Rent' },
    ]
    expect(
      toRefData(
        items,
        (i) => i.id,
        (i) => i.name
      )
    ).toEqual({ '1': 'Food', '2': 'Rent' })
  })

  it('is empty while the lookup has not loaded, and tolerates missing names', () => {
    expect(
      toRefData(
        undefined,
        (i: Item) => i.id,
        (i) => i.name
      )
    ).toEqual({})
    expect(
      toRefData(
        [{ id: 3 } as Item],
        (i: Item) => i.id,
        (i) => i.name
      )
    ).toEqual({ '3': '' })
  })
})

describe('row reducers', () => {
  const saved: Item[] = [
    { id: 1, name: 'a' },
    { id: 2, name: 'b' },
  ]

  it('seedRows keeps each entity as its own original, and waits for data', () => {
    const rows = seedRows(saved)!
    expect(rows.map((r) => r.original)).toEqual(saved)
    expect(seedRows<Item>(undefined)).toBeUndefined()
  })

  it('addDraftRow appends an unsaved row without mutating the input', () => {
    const rows = seedRows(saved)!
    const next = addDraftRow(rows, { id: -1 })
    expect(next).toHaveLength(3)
    expect(next[2]).toEqual({ id: -1, original: undefined })
    expect(rows).toHaveLength(2)
  })

  it('replaceSavedRow swaps a draft for the saved entity, appended last', () => {
    const rows = addDraftRow(seedRows(saved)!, { id: -1, name: 'draft' })
    const next = replaceSavedRow(rows, -1, { id: 9, name: 'draft' }, idOf)
    expect(next.map((r) => r.id)).toEqual([1, 2, 9])
    expect(next[2].original).toEqual({ id: 9, name: 'draft' })
  })

  it('replaceSavedRow re-appends an edited saved row with its new values', () => {
    const next = replaceSavedRow(seedRows(saved)!, 1, { id: 1, name: 'renamed' }, idOf)
    expect(next.map((r) => r.id)).toEqual([2, 1])
    expect(next[1].name).toBe('renamed')
  })

  it('removeRow drops only the matching row', () => {
    expect(removeRow(seedRows(saved)!, 1, idOf).map((r) => r.id)).toEqual([2])
  })
})

describe('canSave', () => {
  const required: (keyof Item)[] = ['name', 'amount']
  const compared: (keyof Item)[] = ['name', 'amount', 'note']
  const row = (fields: Item, original?: Item): EditableRow<Item> => ({ ...fields, original })

  it('refuses a row with a missing required field, new or not', () => {
    expect(canSave(row({ name: 'x' }), required, compared)).toBe(false)
    expect(canSave(row({ name: 'x' }, { name: 'x', amount: 1 }), required, compared)).toBe(false)
  })

  it('allows a complete new row', () => {
    expect(canSave(row({ name: 'x', amount: 5 }), required, compared)).toBe(true)
  })

  it('allows a saved row only after a compared field changes (including the note)', () => {
    const original = { name: 'x', amount: 5, note: null }
    expect(canSave(row({ ...original }, original), required, compared)).toBe(false)
    expect(canSave(row({ ...original, amount: 6 }, original), required, compared)).toBe(true)
    expect(canSave(row({ ...original, note: 'hi' }, original), required, compared)).toBe(true)
  })

  it('treats an amount of 0 as not filled in (existing behavior)', () => {
    expect(canSave(row({ name: 'x', amount: 0 }), required, compared)).toBe(false)
  })
})
