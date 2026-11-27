import { format, isSameYear, isToday, isYesterday, parseISO } from 'date-fns'
import type { Expense, Income } from '../gensrc/Api'

export type EntryKind = 'expense' | 'income'
export type TypeFilter = 'all' | EntryKind

/** id -> display name, per lookup table. Unknown ids are shown as "#id" so a dangling reference is visible, not blank. */
export interface NameMaps {
  expenseCategory: ReadonlyMap<number, string>
  vendor: ReadonlyMap<number, string>
  paymentMethod: ReadonlyMap<number, string>
  incomeCategory: ReadonlyMap<number, string>
  incomeSource: ReadonlyMap<number, string>
}

export const nameMap = <T extends { displayName: string | null }>(items: T[] | undefined, id: (item: T) => number | undefined) =>
  new Map((items ?? []).flatMap((item) => (id(item) === undefined ? [] : [[id(item)!, item.displayName ?? ''] as const])))

const nameOf = (names: ReadonlyMap<number, string>, id: number | undefined) => (id === undefined ? '' : (names.get(id) ?? `#${id}`))

interface Common {
  /** Unique across kinds, usable as a React key. */
  key: string
  date: string
  amount: number
  /** The vendor (expenses) or source (incomes). */
  title: string
  category: string
  /** The payment method; incomes have none. */
  method: string | null
  note: string
}
export type ActivityItem = (Common & { kind: 'expense'; entry: Expense }) | (Common & { kind: 'income'; entry: Income })

const toExpenseItem = (entry: Expense, names: NameMaps): ActivityItem => ({
  kind: 'expense',
  key: `expense-${entry.expenseID}`,
  date: entry.date ?? '',
  amount: entry.amount ?? 0,
  title: nameOf(names.vendor, entry.vendorID),
  category: nameOf(names.expenseCategory, entry.expenseCategoryID),
  method: nameOf(names.paymentMethod, entry.paymentMethodID),
  note: entry.note ?? '',
  entry,
})

const toIncomeItem = (entry: Income, names: NameMaps): ActivityItem => ({
  kind: 'income',
  key: `income-${entry.incomeID}`,
  date: entry.date ?? '',
  amount: entry.amount ?? 0,
  title: nameOf(names.incomeSource, entry.incomeSourceID),
  category: nameOf(names.incomeCategory, entry.incomeCategoryID),
  method: null,
  note: entry.note ?? '',
  entry,
})

/** The id of the underlying expense or income row (0 for an unsaved one). */
export const entryId = (item: ActivityItem) => (item.kind === 'expense' ? item.entry.expenseID : item.entry.incomeID) ?? 0

/** Expenses and incomes as one feed, newest first (ties: higher id first, then incomes before expenses). */
export const buildActivity = (expenses: Expense[] = [], incomes: Income[] = [], names: NameMaps): ActivityItem[] =>
  [...expenses.map((e) => toExpenseItem(e, names)), ...incomes.map((i) => toIncomeItem(i, names))].sort(
    (a, b) => b.date.localeCompare(a.date) || entryId(b) - entryId(a) || (a.kind === b.kind ? 0 : a.kind === 'income' ? -1 : 1)
  )

export const filterActivity = (items: ActivityItem[], { type, q }: { type: TypeFilter; q: string }): ActivityItem[] => {
  const needle = q.trim().toLowerCase()
  return items.filter(
    (item) =>
      (type === 'all' || item.kind === type) &&
      (needle === '' ||
        [item.title, item.category, item.method ?? '', item.note, item.amount.toFixed(2)].some((text) =>
          text.toLowerCase().includes(needle)
        ))
  )
}

export const summarize = (items: ActivityItem[]) => ({
  count: items.length,
  spent: items.filter((i) => i.kind === 'expense').reduce((sum, i) => sum + i.amount, 0),
  earned: items.filter((i) => i.kind === 'income').reduce((sum, i) => sum + i.amount, 0),
})

/** "Today", "Yesterday", "Fri, Nov 27", and with the year when it is not the current one. */
export const dateLabel = (date: string, today: Date): string => {
  const day = parseISO(date)
  if (isToday(day)) return 'Today'
  if (isYesterday(day)) return 'Yesterday'
  return format(day, isSameYear(day, today) ? 'EEE, MMM d' : 'EEE, MMM d, yyyy')
}

export interface DayGroup {
  date: string
  label: string
  items: ActivityItem[]
}

/** Splits an already-sorted feed into consecutive same-date groups. */
export const groupByDate = (items: ActivityItem[], today: Date): DayGroup[] => {
  const groups: DayGroup[] = []
  for (const item of items) {
    const last = groups.at(-1)
    if (last?.date === item.date) last.items.push(item)
    else groups.push({ date: item.date, label: dateLabel(item.date, today), items: [item] })
  }
  return groups
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

/** Expenses plain, incomes with a leading plus, so the sign carries the meaning and color is only a hint. */
export const formatEntryAmount = (kind: EntryKind, amount: number) =>
  kind === 'income' ? `+${money.format(amount)}` : money.format(amount)
