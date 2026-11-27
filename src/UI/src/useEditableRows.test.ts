import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useEditableRows } from './useEditableRows'

type Item = { id?: number; name?: string }
const idOf = (item: Item) => item.id

describe('useEditableRows', () => {
  it('has no rows until the server data arrives, and cannot add drafts before then', () => {
    const { result, rerender } = renderHook(({ entities }) => useEditableRows(entities, idOf), {
      initialProps: { entities: undefined as Item[] | undefined },
    })
    expect(result.current.rows).toBeUndefined()
    act(() => result.current.addDraft((id) => ({ id })))
    expect(result.current.rows).toBeUndefined()

    rerender({ entities: [{ id: 1 }] })
    expect(result.current.rows?.map((r) => r.id)).toEqual([1])
  })

  it('adds drafts with decreasing negative ids', () => {
    const { result } = renderHook(() => useEditableRows<Item>([{ id: 1 }], idOf))
    act(() => result.current.addDraft((id) => ({ id })))
    act(() => result.current.addDraft((id) => ({ id })))
    expect(result.current.rows?.map((r) => r.id)).toEqual([1, -1, -2])
    expect(result.current.rows?.slice(1).every((r) => r.original === undefined)).toBe(true)
  })

  it('save swaps the draft for the persisted entity', async () => {
    const { result } = renderHook(() => useEditableRows<Item>([{ id: 1 }], idOf))
    act(() => result.current.addDraft((id) => ({ id, name: 'new' })))
    const draft = result.current.rows!.find((r) => r.id === -1)!
    await act(() => result.current.save(draft, async (row) => ({ id: 7, name: row.name })))
    expect(result.current.rows?.map((r) => r.id)).toEqual([1, 7])
    expect(result.current.rows?.[1].original).toEqual({ id: 7, name: 'new' })
  })

  it('remove only calls the server for saved rows', async () => {
    const { result } = renderHook(() => useEditableRows([{ id: 1 }, { id: 2 }], idOf))
    act(() => result.current.addDraft((id) => ({ id })))
    const calls: (number | undefined)[] = []
    const destroy = async (row: Item) => void calls.push(row.id)

    await act(() => result.current.remove(result.current.rows!.find((r) => r.id === -1)!, destroy))
    await act(() => result.current.remove(result.current.rows!.find((r) => r.id === 1)!, destroy))

    expect(calls).toEqual([1])
    expect(result.current.rows?.map((r) => r.id)).toEqual([2])
  })

  it('a failed save leaves the draft in place', async () => {
    const { result } = renderHook(() => useEditableRows<Item>([{ id: 1 }], idOf))
    act(() => result.current.addDraft((id) => ({ id })))
    await act(async () => {
      await result.current.save(result.current.rows![1], () => Promise.reject(new Error('boom'))).catch(() => undefined)
    })
    expect(result.current.rows?.map((r) => r.id)).toEqual([1, -1])
  })

  it('keeps local edits when the server data is refetched', () => {
    const { result, rerender } = renderHook(({ entities }) => useEditableRows(entities, idOf), {
      initialProps: { entities: [{ id: 1 }] as Item[] },
    })
    act(() => result.current.addDraft((id) => ({ id })))
    rerender({ entities: [{ id: 1 }, { id: 2 }] })
    expect(result.current.rows?.map((r) => r.id)).toEqual([1, -1])
  })
})
