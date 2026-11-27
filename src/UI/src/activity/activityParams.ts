import { DateRangeParams, parseDateRange, writeDateRange } from '../dateRange'
import type { TypeFilter } from './activityItems'

export const TYPES: readonly TypeFilter[] = ['all', 'expense', 'income']
export const DEFAULT_RANGE = '3m'

export interface ActivityParams extends DateRangeParams {
  type: TypeFilter
  q: string
}

export const parseActivityParams = (search: URLSearchParams): ActivityParams => {
  const type = search.get('type')
  return {
    ...parseDateRange(search, DEFAULT_RANGE),
    type: TYPES.includes(type as TypeFilter) ? (type as TypeFilter) : 'all',
    q: search.get('q') ?? '',
  }
}

/** Inverse of parseActivityParams; omits defaults so the URL stays short. */
export const toActivitySearch = (params: ActivityParams): URLSearchParams => {
  const search = new URLSearchParams()
  writeDateRange(search, params, DEFAULT_RANGE)
  if (params.type !== 'all') search.set('type', params.type)
  if (params.q.trim() !== '') search.set('q', params.q)
  return search
}
