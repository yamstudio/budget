import { DateRangeParams, parseDateRange, writeDateRange } from '../dateRange'
import { ExpenseGrouping, ExpenseNecessity } from '../gensrc/Api'

export const VIEWS = ['breakdown', 'flow', 'trends', 'budget'] as const
export type InsightsView = (typeof VIEWS)[number]

export interface InsightsParams extends DateRangeParams {
  view: InsightsView
  groupBy: ExpenseGrouping
  categoryIds: number[]
  vendorIds: number[]
  paymentMethodIds: number[]
  necessities: ExpenseNecessity[]
}

export const DEFAULT_PARAMS: InsightsParams = {
  view: 'breakdown',
  range: '6m',
  groupBy: ExpenseGrouping.Category,
  categoryIds: [],
  vendorIds: [],
  paymentMethodIds: [],
  necessities: [],
}

const oneOf = <T extends string>(allowed: readonly T[], value: string | null, fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback
const ids = (values: string[]) => [...new Set(values.map(Number).filter((n) => Number.isInteger(n) && n >= 0))]

/** Reads the page state from the URL; unknown or malformed values fall back to defaults so a hand-edited link never breaks the page. */
export const parseInsightsParams = (search: URLSearchParams): InsightsParams => {
  return {
    view: oneOf(VIEWS, search.get('view'), DEFAULT_PARAMS.view),
    ...parseDateRange(search, DEFAULT_PARAMS.range),
    groupBy: oneOf(Object.values(ExpenseGrouping), search.get('by'), DEFAULT_PARAMS.groupBy),
    categoryIds: ids(search.getAll('cat')),
    vendorIds: ids(search.getAll('vendor')),
    paymentMethodIds: ids(search.getAll('pay')),
    necessities: [
      ...new Set(
        search.getAll('nec').filter((n): n is ExpenseNecessity => Object.values(ExpenseNecessity).includes(n as ExpenseNecessity))
      ),
    ],
  }
}

/** Inverse of parseInsightsParams; omits defaults so the URL stays short. */
export const toSearchParams = (params: InsightsParams): URLSearchParams => {
  const search = new URLSearchParams()
  if (params.view !== DEFAULT_PARAMS.view) search.set('view', params.view)
  writeDateRange(search, params, DEFAULT_PARAMS.range)
  if (params.groupBy !== DEFAULT_PARAMS.groupBy) search.set('by', params.groupBy)
  params.categoryIds.forEach((id) => search.append('cat', String(id)))
  params.vendorIds.forEach((id) => search.append('vendor', String(id)))
  params.paymentMethodIds.forEach((id) => search.append('pay', String(id)))
  params.necessities.forEach((n) => search.append('nec', n))
  return search
}

/** How many filters are narrowing the data (for a "Filters (2)" badge). */
export const activeFilterCount = (params: InsightsParams) =>
  [params.categoryIds, params.vendorIds, params.paymentMethodIds, params.necessities].filter((f) => f.length > 0).length
