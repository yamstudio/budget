import { useCallback, useMemo, useRef, useState } from 'react'
import { addDraftRow, removeRow, replaceSavedRow, seedRows } from './gridRows'
import type { EditableRow } from './gridRows'

/**
 * Local row state for an editable grid. Until the user first changes something the rows follow the
 * server data (`entities`); after that the local copy wins, so unsaved drafts and edits are never
 * clobbered by a refetch. Drafts get decreasing negative ids. `idOf` must be a stable function.
 * The returned callbacks only change when `entities` changes, so they are safe in dependency lists.
 */
export const useEditableRows = <T>(entities: T[] | undefined, idOf: (entity: T) => number | undefined) => {
  const seeded = useMemo(() => seedRows(entities), [entities])
  const [local, setLocal] = useState<EditableRow<T>[] | undefined>(undefined)
  const nextDraftIdRef = useRef(-1)

  const update = useCallback(
    (change: (rows: EditableRow<T>[]) => EditableRow<T>[]) =>
      setLocal((current) => {
        const base = current ?? seeded
        return base ? change(base) : undefined
      }),
    [seeded]
  )

  /** Adds an unsaved draft row; `make` receives the draft's temporary id. */
  const addDraft = useCallback(
    (make: (draftId: number) => T) => {
      const draft = make(nextDraftIdRef.current--)
      update((current) => addDraftRow(current, draft))
    },
    [update]
  )

  /** Persists a row (create or update decided by the caller) and swaps in the saved entity. */
  const save = useCallback(
    (row: EditableRow<T>, persist: (row: EditableRow<T>) => Promise<T>) =>
      persist(row).then((saved) => update((current) => replaceSavedRow(current, idOf(row), saved, idOf))),
    [update, idOf]
  )

  /** Deletes a row; only rows that exist on the server are sent to `destroy`. */
  const remove = useCallback(
    (row: EditableRow<T>, destroy: (row: EditableRow<T>) => Promise<unknown>) =>
      (row.original ? destroy(row) : Promise.resolve()).then(() => update((current) => removeRow(current, idOf(row), idOf))),
    [update, idOf]
  )

  return { rows: local ?? seeded, addDraft, save, remove }
}
