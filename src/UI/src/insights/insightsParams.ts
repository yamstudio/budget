import { addMonths, format, parseISO, startOfMonth, startOfYear } from 'date-fns'
import { ExpenseGrouping, ExpenseNecessity } from '../gensrc/Api'

export const VIEWS = ['breakdown', 'flow', 'trends', 'budget'] as const
export type InsightsView = (typeof VIEWS)[number]

export const RANGES = ['3m', '6m', '12m', 'ytd', 'custom'] as const
export type InsightsRange = (typeof RANGES)[number]

export interface InsightsParams {
  view: InsightsView
  range: InsightsRange
  /** yyyy-MM-dd; only used when range is custom. */
  from?: string
  to?: string
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

const DATE = /^\d{4}-\d{2}-\d{2}$/
const oneOf = <T extends string>(allowed: readonly T[], value: string | null, fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback
const ids = (values: string[]) => [...new Set(values.map(Number).filter((n) => Number.isInteger(n) && n >= 0))]

/** Reads the page state from the URL; unknown or malformed values fall back to defaults so a hand-edited link never breaks the page. */
export const parseInsightsParams = (search: URLSearchParams): InsightsParams => {
  const range = oneOf(RANGES, search.get('range'), DEFAULT_PARAMS.range)
  const from = search.get('from')
  const to = search.get('to')
  const customOk = from !== null && to !== null && DATE.test(from) && DATE.test(to) && from <= to
  return {
    view: oneOf(VIEWS, search.get('view'), DEFAULT_PARAMS.view),
    range: range === 'custom' && !customOk ? DEFAULT_PARAMS.range : range,
    from: customOk ? from : undefined,
    to: customOk ? to : undefined,
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
  if (params.range !== DEFAULT_PARAMS.range) search.set('range', params.range)
  if (params.range === 'custom' && params.from && params.to) {
    search.set('from', params.from)
    search.set('to', params.to)
  }
  if (params.groupBy !== DEFAULT_PARAMS.groupBy) search.set('by', params.groupBy)
  params.categoryIds.forEach((id) => search.append('cat', String(id)))
  params.vendorIds.forEach((id) => search.append('vendor', String(id)))
  params.paymentMethodIds.forEach((id) => search.append('pay', String(id)))
  params.necessities.forEach((n) => search.append('nec', n))
  return search
}

/** The inclusive date range (local dates) the params describe, relative to `now`. */
export const resolveRange = (params: Pick<InsightsParams, 'range' | 'from' | 'to'>, now: Date): { fromDate: Date; toDate: Date } => {
  switch (params.range) {
    case 'custom':
      return { fromDate: parseISO(params.from!), toDate: parseISO(params.to!) }
    case 'ytd':
      return { fromDate: startOfYear(now), toDate: now }
    default:
      return { fromDate: startOfMonth(addMonths(now, 1 - parseInt(params.range, 10))), toDate: now }
  }
}

export const formatDate = (date: Date) => format(date, 'yyyy-MM-dd')

/** How many filters are narrowing the data (for a "Filters (2)" badge). */
export const activeFilterCount = (params: InsightsParams) =>
  [params.categoryIds, params.vendorIds, params.paymentMethodIds, params.necessities].filter((f) => f.length > 0).length
