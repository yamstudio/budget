import { DateRangeParams, parseDateRange, writeDateRange } from '../dateRange'
import { parseIds, writeIds } from '../urlParams'
import type { TypeFilter } from './activityItems'

export const TYPES: readonly TypeFilter[] = ['all', 'expense', 'income']
export const DEFAULT_RANGE = '3m'

export interface ActivityParams extends DateRangeParams {
  type: TypeFilter
  q: string
  categoryIds: number[]
  vendorIds: number[]
  paymentMethodIds: number[]
}

export const parseActivityParams = (search: URLSearchParams): ActivityParams => {
  const type = search.get('type')
  return {
    ...parseDateRange(search, DEFAULT_RANGE),
    type: TYPES.includes(type as TypeFilter) ? (type as TypeFilter) : 'all',
    q: search.get('q') ?? '',
    categoryIds: parseIds(search, 'cat'),
    vendorIds: parseIds(search, 'vendor'),
    paymentMethodIds: parseIds(search, 'pay'),
  }
}

/** Inverse of parseActivityParams; omits defaults so the URL stays short. */
export const toActivitySearch = (params: ActivityParams): URLSearchParams => {
  const search = new URLSearchParams()
  writeDateRange(search, params, DEFAULT_RANGE)
  if (params.type !== 'all') search.set('type', params.type)
  if (params.q.trim() !== '') search.set('q', params.q)
  writeIds(search, 'cat', params.categoryIds)
  writeIds(search, 'vendor', params.vendorIds)
  writeIds(search, 'pay', params.paymentMethodIds)
  return search
}

/** How many filter kinds are narrowing the feed beyond range, type and search (for a badge). */
export const activeFilterCount = (params: ActivityParams) =>
  [params.categoryIds, params.vendorIds, params.paymentMethodIds].filter((ids) => ids.length > 0).length
