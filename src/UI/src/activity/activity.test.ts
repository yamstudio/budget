import { describe, expect, it } from 'vitest'
import type { Expense, ExpenseTemplate, Income } from '../gensrc/Api'
import {
  buildActivity,
  dateLabel,
  filterActivity,
  formatEntryAmount,
  groupByDate,
  hasExpenseFilters,
  nameMap,
  summarize,
} from './activityItems'
import type { NameMaps } from './activityItems'
import { activeFilterCount, parseActivityParams, toActivitySearch } from './activityParams'
import {
  duplicateValues,
  emptyValues,
  expenseSuggestions,
  incomeSuggestions,
  itemToValues,
  missingFields,
  toExpense,
  toIncome,
} from './entryValues'

const names: NameMaps = {
  expenseCategory: new Map([[1, 'Groceries']]),
  vendor: new Map([
    [1, 'Corner Market'],
    [2, 'Noodle House (downtown)'],
  ]),
  paymentMethod: new Map([[1, 'Visa Platinum']]),
  incomeCategory: new Map([[1, 'Salary']]),
  incomeSource: new Map([[1, 'Employer Inc']]),
}
const today = new Date(2026, 10, 27, 15, 0)

const expense = (expenseID: number, date: string, amount = 10, extra: Partial<Expense> = {}): Expense => ({
  expenseID,
  expenseCategoryID: 1,
  vendorID: 1,
  paymentMethodID: 1,
  amount,
  date,
  ...extra,
})
const income = (incomeID: number, date: string, amount = 2500, extra: Partial<Income> = {}): Income => ({
  incomeID,
  incomeCategoryID: 1,
  incomeSourceID: 1,
  amount,
  date,
  ...extra,
})

describe('nameMap', () => {
  it('maps ids to names and ignores rows without an id', () => {
    const map = nameMap(
      [{ id: 1, displayName: 'a' }, { displayName: 'no id' }, { id: 3, displayName: null }] as {
        id?: number
        displayName: string | null
      }[],
      (r) => r.id
    )
    expect([...map]).toEqual([
      [1, 'a'],
      [3, ''],
    ])
  })
})

describe('buildActivity', () => {
  it('merges both kinds newest first with resolved names', () => {
    const items = buildActivity([expense(1, '2026-11-01'), expense(2, '2026-11-20')], [income(5, '2026-11-15')], names)
    expect(items.map((i) => i.key)).toEqual(['expense-2', 'income-5', 'expense-1'])
    expect(items[0]).toMatchObject({ kind: 'expense', title: 'Corner Market', category: 'Groceries', method: 'Visa Platinum' })
    expect(items[1]).toMatchObject({ kind: 'income', title: 'Employer Inc', category: 'Salary', method: null })
  })

  it('breaks ties on the same date by id (higher first), then incomes before expenses', () => {
    const items = buildActivity([expense(3, '2026-11-02'), expense(4, '2026-11-02')], [income(4, '2026-11-02')], names)
    expect(items.map((i) => i.key)).toEqual(['income-4', 'expense-4', 'expense-3'])
  })

  it('shows a dangling reference as #id instead of blank', () => {
    const [item] = buildActivity([expense(1, '2026-11-01', 5, { vendorID: 99 })], [], names)
    expect(item.title).toBe('#99')
  })

  it('handles no data', () => {
    expect(buildActivity(undefined, undefined, names)).toEqual([])
  })
})

describe('filterActivity', () => {
  const items = buildActivity(
    [expense(1, '2026-11-01', 12.5, { note: 'Birthday cake' }), expense(2, '2026-11-02', 40, { vendorID: 2 })],
    [income(3, '2026-11-03')],
    names
  )
  const none = { categoryIds: [], vendorIds: [], paymentMethodIds: [] }
  const keys = (type: 'all' | 'expense' | 'income', q = '', extra: Partial<typeof none> = {}) =>
    filterActivity(items, { type, q, ...none, ...extra }).map((i) => i.key)

  it('filters by kind', () => {
    expect(keys('income')).toEqual(['income-3'])
    expect(keys('expense')).toEqual(['expense-2', 'expense-1'])
  })

  it('searches title, category, payment method, note and amount, case-insensitively', () => {
    expect(keys('all', 'NOODLE')).toEqual(['expense-2'])
    expect(keys('all', 'salary')).toEqual(['income-3'])
    expect(keys('all', 'visa')).toEqual(['expense-2', 'expense-1'])
    expect(keys('all', 'cake')).toEqual(['expense-1'])
    expect(keys('all', '12.50')).toEqual(['expense-1'])
    expect(keys('all', '  ')).toHaveLength(3)
  })

  it('filters expenses by card, vendor and category, and then leaves incomes out', () => {
    const two = buildActivity(
      [expense(1, '2026-11-01', 5, { paymentMethodID: 1 }), expense(2, '2026-11-02', 6, { paymentMethodID: 2, vendorID: 2 })],
      [income(3, '2026-11-03')],
      names
    )
    const k = (extra: Partial<Parameters<typeof filterActivity>[1]>) =>
      filterActivity(two, { type: 'all', q: '', categoryIds: [], vendorIds: [], paymentMethodIds: [], ...extra }).map((i) => i.key)
    expect(k({})).toEqual(['income-3', 'expense-2', 'expense-1'])
    expect(k({ paymentMethodIds: [2] })).toEqual(['expense-2'])
    expect(k({ paymentMethodIds: [1, 2] })).toEqual(['expense-2', 'expense-1'])
    expect(k({ vendorIds: [1] })).toEqual(['expense-1'])
    expect(k({ vendorIds: [1], paymentMethodIds: [2] })).toEqual([]) // filters combine with AND
    expect(k({ categoryIds: [1], q: 'noodle' })).toEqual(['expense-2'])
    expect(k({ paymentMethodIds: [99] })).toEqual([])
  })
})

describe('summarize', () => {
  it('totals spending and earnings separately', () => {
    const items = buildActivity([expense(1, '2026-11-01', 10.25), expense(2, '2026-11-02', 4.75)], [income(3, '2026-11-03', 100)], names)
    expect(summarize(items)).toEqual({ count: 3, spent: 15, earned: 100 })
  })
})

describe('dates', () => {
  it('labels relative days, then weekday and date, with the year only when it differs', () => {
    const now = new Date()
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    expect(dateLabel(iso(now), now)).toBe('Today')
    expect(dateLabel(iso(yesterday), now)).toBe('Yesterday')
    expect(dateLabel('2020-03-04', new Date(2026, 10, 27))).toBe('Wed, Mar 4, 2020')
    expect(dateLabel('2026-03-04', new Date(2026, 10, 27))).toBe('Wed, Mar 4')
  })

  it('groups consecutive items by date', () => {
    const items = buildActivity([expense(1, '2026-03-04'), expense(2, '2026-03-04'), expense(3, '2026-03-01')], [], names)
    const groups = groupByDate(items, new Date(2026, 10, 27))
    expect(groups.map((g) => [g.date, g.items.length])).toEqual([
      ['2026-03-04', 2],
      ['2026-03-01', 1],
    ])
  })
})

describe('formatEntryAmount', () => {
  it('shows cents and marks incomes with a plus', () => {
    expect(formatEntryAmount('expense', 1234.5)).toBe('$1,234.50')
    expect(formatEntryAmount('income', 2500)).toBe('+$2,500.00')
  })
})

describe('entry values', () => {
  const [exp] = buildActivity([expense(7, '2026-11-01', 12.5, { note: 'n' })], [], names)
  const [inc] = buildActivity([], [income(8, '2026-11-02')], names)

  it('round-trips an expense and an income through the form values', () => {
    expect(toExpense(itemToValues(exp), 7)).toEqual({ ...exp.entry, note: 'n' })
    expect(toIncome(itemToValues(inc), 8)).toEqual({ ...inc.entry, note: null })
  })

  it('duplicates into a new entry dated today, keeping the rest', () => {
    expect(duplicateValues(inc, today)).toEqual({ ...itemToValues(inc), date: '2026-11-27' })
  })

  it('starts empty on today', () => {
    expect(emptyValues('expense', today)).toEqual({ kind: 'expense', date: '2026-11-27' })
  })

  it('reports missing required fields per kind', () => {
    expect(missingFields(emptyValues('expense', today))).toEqual(['amount', 'category', 'vendor', 'payment method'])
    expect(missingFields(emptyValues('income', today))).toEqual(['amount', 'category', 'source'])
    expect(missingFields({ ...itemToValues(exp), amount: 0 })).toEqual(['amount'])
    expect(missingFields({ ...itemToValues(exp), date: undefined })).toEqual(['date'])
    expect(missingFields(itemToValues(exp))).toEqual([])
  })

  it('refuses to build an entry from incomplete values and trims blank notes to null', () => {
    expect(() => toExpense(emptyValues('expense', today))).toThrow(/Missing amount/)
    expect(toIncome({ ...itemToValues(inc), note: '   ' }).note).toBeNull()
  })
})

describe('suggestions', () => {
  const template = (extra: Partial<ExpenseTemplate> = {}): ExpenseTemplate => ({
    expenseCategoryID: 1,
    vendorID: 2,
    paymentMethodID: 1,
    amount: 12,
    ...extra,
  })

  it('labels expense templates as Card@Vendor with the amount and prefills the form', () => {
    const [s] = expenseSuggestions([template()], names, today)
    expect(s.label).toBe('Visa@Noodle House $12.00')
    expect(s.values).toEqual({ kind: 'expense', date: '2026-11-27', categoryId: 1, vendorId: 2, paymentMethodId: 1, amount: 12 })
  })

  it('skips templates that point at missing lookups and copes with no amount', () => {
    expect(expenseSuggestions([template({ vendorID: 99 }), template({ paymentMethodID: null })], names, today)).toEqual([])
    expect(expenseSuggestions([template({ amount: null })], names, today)[0].label).toBe('Visa@Noodle House')
    expect(expenseSuggestions(undefined, names, today)).toEqual([])
  })

  it('offers each distinct recent income once, newest first, capped', () => {
    const incomes = [
      income(1, '2026-09-10', 2500),
      income(2, '2026-10-10', 2500),
      income(3, '2026-11-10', 2600),
      income(4, '2026-08-10', 50),
    ]
    const result = incomeSuggestions(incomes, names, today)
    expect(result.map((s) => s.label)).toEqual(['Employer Inc +$2,600.00', 'Employer Inc +$2,500.00', 'Employer Inc +$50.00'])
    expect(result[0].values).toEqual({ kind: 'income', date: '2026-11-27', categoryId: 1, sourceId: 1, amount: 2600 })
    expect(incomeSuggestions(incomes, names, today, 1)).toHaveLength(1)
  })
})

describe('activity params', () => {
  const parse = (q: string) => parseActivityParams(new URLSearchParams(q))

  it('defaults to the last three months, everything, no search', () => {
    expect(parse('')).toMatchObject({ range: '3m', type: 'all', q: '' })
  })

  it('ignores unknown values', () => {
    expect(parse('type=bogus&range=nope')).toMatchObject({ range: '3m', type: 'all' })
  })

  it('round-trips and omits defaults', () => {
    expect(toActivitySearch(parse('')).toString()).toBe('')
    const state = {
      range: 'custom' as const,
      from: '2026-01-01',
      to: '2026-02-01',
      type: 'expense' as const,
      q: 'pay check',
      categoryIds: [4],
      vendorIds: [2, 3],
      paymentMethodIds: [1],
    }
    expect(parseActivityParams(toActivitySearch(state))).toEqual(state)
  })

  it('counts filter kinds, not values, and knows when incomes are excluded', () => {
    expect(activeFilterCount(parse(''))).toBe(0)
    expect(activeFilterCount(parse('pay=1&pay=2&vendor=3'))).toBe(2)
    expect(hasExpenseFilters(parse('pay=1'))).toBe(true)
    expect(hasExpenseFilters(parse('type=income&q=x'))).toBe(false)
  })
})
