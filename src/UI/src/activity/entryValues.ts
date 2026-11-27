import { format } from 'date-fns'
import type { Expense, ExpenseTemplate, Income } from '../gensrc/Api'
import type { ActivityItem, EntryKind, NameMaps } from './activityItems'
import { formatEntryAmount } from './activityItems'

/** What the entry form edits. Dates are yyyy-MM-dd strings; ids are lookup ids. */
export interface EntryValues {
  kind: EntryKind
  amount?: number | null
  date?: string
  categoryId?: number
  vendorId?: number
  paymentMethodId?: number
  sourceId?: number
  note?: string
}

export const todayString = (today: Date) => format(today, 'yyyy-MM-dd')

export const emptyValues = (kind: EntryKind, today: Date): EntryValues => ({ kind, date: todayString(today) })

export const itemToValues = (item: ActivityItem): EntryValues =>
  item.kind === 'expense'
    ? {
        kind: 'expense',
        amount: item.entry.amount,
        date: item.entry.date,
        categoryId: item.entry.expenseCategoryID,
        vendorId: item.entry.vendorID,
        paymentMethodId: item.entry.paymentMethodID,
        note: item.entry.note ?? undefined,
      }
    : {
        kind: 'income',
        amount: item.entry.amount,
        date: item.entry.date,
        categoryId: item.entry.incomeCategoryID,
        sourceId: item.entry.incomeSourceID,
        note: item.entry.note ?? undefined,
      }

/** A new entry that starts as a copy of an existing one, dated today (e.g. this month's paycheck). */
export const duplicateValues = (item: ActivityItem, today: Date): EntryValues => ({ ...itemToValues(item), date: todayString(today) })

/** The names of required fields that are empty or invalid; empty means the values can be saved. */
export const missingFields = (v: EntryValues): string[] => {
  const missing: string[] = []
  if (!(typeof v.amount === 'number' && v.amount > 0)) missing.push('amount')
  if (!v.date) missing.push('date')
  if (v.categoryId === undefined) missing.push('category')
  if (v.kind === 'expense') {
    if (v.vendorId === undefined) missing.push('vendor')
    if (v.paymentMethodId === undefined) missing.push('payment method')
  } else if (v.sourceId === undefined) {
    missing.push('source')
  }
  return missing
}

/** Throws if required fields are missing: callers validate with missingFields first. */
const assertComplete = (v: EntryValues) => {
  const missing = missingFields(v)
  if (missing.length > 0) throw new Error(`Missing ${missing.join(', ')}`)
}

export const toExpense = (v: EntryValues, expenseID = 0): Expense => {
  assertComplete(v)
  return {
    expenseID,
    expenseCategoryID: v.categoryId,
    vendorID: v.vendorId,
    paymentMethodID: v.paymentMethodId,
    amount: v.amount!,
    date: v.date,
    note: v.note?.trim() || null,
  }
}

export const toIncome = (v: EntryValues, incomeID = 0): Income => {
  assertComplete(v)
  return {
    incomeID,
    incomeCategoryID: v.categoryId,
    incomeSourceID: v.sourceId,
    amount: v.amount!,
    date: v.date,
    note: v.note?.trim() || null,
  }
}

export interface Suggestion {
  key: string
  label: string
  values: EntryValues
}

/**
 * One-tap starting points from frequent past expenses, e.g. "Visa@Corner Market $12.00".
 * Templates that reference a lookup row that no longer exists are skipped.
 */
export const expenseSuggestions = (templates: ExpenseTemplate[] | undefined, names: NameMaps, today: Date): Suggestion[] =>
  (templates ?? []).flatMap((t) => {
    const category = t.expenseCategoryID == null ? undefined : names.expenseCategory.get(t.expenseCategoryID)
    const method = t.paymentMethodID == null ? undefined : names.paymentMethod.get(t.paymentMethodID)
    const vendor = t.vendorID == null ? undefined : names.vendor.get(t.vendorID)
    if (!category || !method || !vendor) return []
    const label = `${method.split(' ')[0]}@${vendor.replace(/\s\(.*\)$/g, '')}`
    return [
      {
        key: `${t.expenseCategoryID}-${t.paymentMethodID}-${t.vendorID}-${t.amount}`,
        label: t.amount ? `${label} ${formatEntryAmount('expense', t.amount)}` : label,
        values: {
          kind: 'expense' as const,
          date: todayString(today),
          categoryId: t.expenseCategoryID!,
          vendorId: t.vendorID!,
          paymentMethodId: t.paymentMethodID!,
          amount: t.amount,
        },
      },
    ]
  })

/** Distinct recent income entries (same source, category and amount count once), newest first, to repeat a paycheck in one tap. */
export const incomeSuggestions = (incomes: Income[] | undefined, names: NameMaps, today: Date, max = 5): Suggestion[] => {
  const seen = new Set<string>()
  const result: Suggestion[] = []
  for (const income of [...(incomes ?? [])].sort(
    (a, b) => (b.date ?? '').localeCompare(a.date ?? '') || (b.incomeID ?? 0) - (a.incomeID ?? 0)
  )) {
    const key = `${income.incomeSourceID}-${income.incomeCategoryID}-${income.amount}`
    const source = income.incomeSourceID === undefined ? undefined : names.incomeSource.get(income.incomeSourceID)
    if (seen.has(key) || !source || income.incomeCategoryID === undefined) continue
    seen.add(key)
    result.push({
      key,
      label: `${source} ${formatEntryAmount('income', income.amount ?? 0)}`,
      values: {
        kind: 'income',
        date: todayString(today),
        categoryId: income.incomeCategoryID,
        sourceId: income.incomeSourceID,
        amount: income.amount,
      },
    })
    if (result.length === max) break
  }
  return result
}
