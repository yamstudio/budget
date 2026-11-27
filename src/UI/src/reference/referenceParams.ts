export const TABLE_KEYS = ['vendors', 'payment-methods', 'expense-categories', 'income-categories', 'income-sources'] as const
export type TableKey = (typeof TABLE_KEYS)[number]

export interface ReferenceParams {
  table: TableKey
  q: string
}

export const DEFAULT_TABLE: TableKey = 'vendors'

export const parseReferenceParams = (search: URLSearchParams): ReferenceParams => {
  const table = search.get('table')
  return { table: TABLE_KEYS.includes(table as TableKey) ? (table as TableKey) : DEFAULT_TABLE, q: search.get('q') ?? '' }
}

/** Inverse of parseReferenceParams; omits defaults so the URL stays short. */
export const toReferenceSearch = (params: ReferenceParams): URLSearchParams => {
  const search = new URLSearchParams()
  if (params.table !== DEFAULT_TABLE) search.set('table', params.table)
  if (params.q.trim() !== '') search.set('q', params.q)
  return search
}
