import type { ExpenseNecessity } from '../gensrc/Api'

export const NAME_MAX = 64
export const DESCRIPTION_MAX = 256

/** What every lookup table has in common (vendor, payment method, categories, income source). */
export interface ReferenceRow {
  displayName: string | null
  description: string | null
  /** Only expense categories have one. */
  necessity?: ExpenseNecessity
}

export interface ReferenceValues {
  displayName: string
  /** Undefined when the field was never touched (a new row). */
  description?: string
  necessity?: ExpenseNecessity
}

export const sortedByName = <T extends ReferenceRow>(rows: T[] | undefined): T[] =>
  [...(rows ?? [])].sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? '', undefined, { sensitivity: 'base' }))

/** Case-insensitive match on name or description; an empty query keeps everything. */
export const searchRows = <T extends ReferenceRow>(rows: T[], q: string): T[] => {
  const needle = q.trim().toLowerCase()
  return needle === '' ? rows : rows.filter((row) => `${row.displayName ?? ''} ${row.description ?? ''}`.toLowerCase().includes(needle))
}

/**
 * An error message for a name, or null when it is acceptable: required, within the column limit, and not already used by another row
 * (compared case-insensitively, since "Visa" and "visa " are the same card to a person).
 */
export const validateName = (name: string, rows: ReferenceRow[], editingIndex?: number): string | null => {
  const trimmed = name.trim()
  if (trimmed === '') return 'Enter a name'
  if (trimmed.length > NAME_MAX) return `Keep it under ${NAME_MAX} characters`
  const duplicate = rows.some((row, i) => i !== editingIndex && (row.displayName ?? '').trim().toLowerCase() === trimmed.toLowerCase())
  return duplicate ? 'That name already exists' : null
}

/** The request body for saving: names are trimmed, and a blank description falls back to the name (the API requires one). */
export const toRow = (values: ReferenceValues): ReferenceRow => {
  const displayName = values.displayName.trim()
  const description = (values.description ?? '').trim()
  return {
    displayName,
    description: description === '' ? displayName : description,
    ...(values.necessity === undefined ? {} : { necessity: values.necessity }),
  }
}

/** A description that merely repeats the name is noise in a list. */
export const visibleDescription = (row: ReferenceRow) => (row.description === row.displayName ? '' : (row.description ?? ''))
