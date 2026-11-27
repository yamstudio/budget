/** Pure helpers for the editable expense/income grids. No React or AG Grid in here, so they are easy to test. */

/** A grid row: the entity's fields plus the last saved copy (undefined while it is an unsaved draft). */
export type EditableRow<T> = T & { original: T | undefined }

/** Builds an AG Grid `refData` map (id -> display name) from a list of lookup entities. */
export const toRefData = <T>(
  items: T[] | undefined,
  getId: (item: T) => number | undefined,
  getName: (item: T) => string | null | undefined
) => Object.fromEntries((items ?? []).map((item) => [String(getId(item)), getName(item) ?? ''])) as Record<string, string>

export const seedRows = <T>(entities: T[] | undefined): EditableRow<T>[] | undefined =>
  entities?.map((entity) => ({ ...entity, original: entity }))

export const addDraftRow = <T>(rows: EditableRow<T>[], draft: T): EditableRow<T>[] => [...rows, { ...draft, original: undefined }]

/** Replaces the row with `rowId` by the saved entity (appended last, as the grids always did). */
export const replaceSavedRow = <T>(rows: EditableRow<T>[], rowId: number | undefined, saved: T, idOf: (row: T) => number | undefined) => [
  ...rows.filter((row) => idOf(row) !== rowId),
  { ...saved, original: saved } as EditableRow<T>,
]

export const removeRow = <T>(rows: EditableRow<T>[], rowId: number | undefined, idOf: (row: T) => number | undefined) =>
  rows.filter((row) => idOf(row) !== rowId)

/**
 * A row can be saved when every required field is filled in (truthy, so an amount of 0 does not
 * count as filled) and it is either new or differs from its saved copy in a compared field.
 */
export const canSave = <T extends object>(row: EditableRow<T>, required: (keyof T)[], compared: (keyof T)[]) => {
  if (!required.every((key) => row[key])) {
    return false
  }
  const { original } = row
  return !original || compared.some((key) => row[key] !== original[key])
}
