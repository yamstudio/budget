import { addMonths, format, parseISO, startOfMonth, startOfYear } from 'date-fns'

export const RANGES = ['3m', '6m', '12m', 'ytd', 'custom'] as const
export type DateRangeKey = (typeof RANGES)[number]

/** A date range as kept in the URL: a preset, or custom with explicit yyyy-MM-dd bounds. */
export interface DateRangeParams {
  range: DateRangeKey
  from?: string
  to?: string
}

const DATE = /^\d{4}-\d{2}-\d{2}$/

/** Reads `range`, `from` and `to`; anything unknown or malformed falls back to `fallback` so a hand-edited link never breaks the page. */
export const parseDateRange = (search: URLSearchParams, fallback: DateRangeKey): DateRangeParams => {
  const requested = search.get('range')
  const range = RANGES.includes(requested as DateRangeKey) ? (requested as DateRangeKey) : fallback
  const from = search.get('from')
  const to = search.get('to')
  const customOk = from !== null && to !== null && DATE.test(from) && DATE.test(to) && from <= to
  if (range === 'custom' && !customOk) return { range: fallback }
  return { range, from: customOk ? from : undefined, to: customOk ? to : undefined }
}

/** Writes the range into `search`, omitting the default so the URL stays short. */
export const writeDateRange = (search: URLSearchParams, params: DateRangeParams, fallback: DateRangeKey) => {
  if (params.range !== fallback) search.set('range', params.range)
  if (params.range === 'custom' && params.from && params.to) {
    search.set('from', params.from)
    search.set('to', params.to)
  }
}

/** The inclusive date range (local dates) the params describe, relative to `now`. */
export const resolveRange = (params: DateRangeParams, now: Date): { fromDate: Date; toDate: Date } => {
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
