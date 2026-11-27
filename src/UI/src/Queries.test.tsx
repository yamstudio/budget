import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Expense, Vendor } from './gensrc/Api'

const api = vi.hoisted(() => ({
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
  createVendor: vi.fn(),
  createIncome: vi.fn(),
}))
vi.mock('./gensrc/Api', () => ({
  Api: class {
    api = api
  },
}))

const { useCreateExpense, useCreateIncome, useCreateVendor, useDeleteExpense, useUpdateExpense } = await import('./Queries')

const JAN = ['expenses', '2025-01-01', '2025-01-31']
const FEB = ['expenses', '2025-02-01', '2025-02-28']
// Insights caches: any expense edit can change expense and budget figures; only income edits change income figures.
const EXPENSE_INSIGHTS = [
  ['expenseBreakdown', { groupBy: 'Category' }],
  ['budgetComparison', { fromDate: '2025-01-01' }],
]
const INCOME_INSIGHTS = [['incomeBreakdown', { groupBy: 'Source' }]]

const expense = (expenseID: number, date: string, amount = 10): Expense => ({
  expenseID,
  expenseCategoryID: 1,
  vendorID: 1,
  paymentMethodID: 1,
  amount,
  date,
})

let queryClient: QueryClient
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>

beforeEach(() => {
  vi.resetAllMocks()
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(JAN, [expense(1, '2025-01-05'), expense(2, '2025-01-20')])
  queryClient.setQueryData(FEB, [expense(3, '2025-02-10')])
  for (const key of [...EXPENSE_INSIGHTS, ...INCOME_INSIGHTS]) queryClient.setQueryData(key, [])
})

const isInvalidated = (key: unknown[]) => queryClient.getQueryState(key)?.isInvalidated
const expenseInsightsInvalidated = () => EXPENSE_INSIGHTS.map(isInvalidated)
const incomeInsightsInvalidated = () => INCOME_INSIGHTS.map(isInvalidated)

describe('expense mutations keep cached date ranges in sync', () => {
  it('create appends to the cached range containing the date and invalidates expense insights, not income insights', async () => {
    const created = expense(4, '2025-01-15')
    api.createExpense.mockResolvedValue({ data: created })
    const { result } = renderHook(() => useCreateExpense(queryClient), { wrapper })

    await act(() => result.current.mutateAsync({ ...created }))

    expect(queryClient.getQueryData<Expense[]>(JAN)?.map((e) => e.expenseID)).toEqual([1, 2, 4])
    expect(queryClient.getQueryData<Expense[]>(FEB)?.map((e) => e.expenseID)).toEqual([3])
    expect(expenseInsightsInvalidated()).toEqual([true, true])
    expect(incomeInsightsInvalidated()).toEqual([false])
  })

  it('create on a range boundary date is included in the range (inclusive)', async () => {
    const created = expense(5, '2025-01-31')
    api.createExpense.mockResolvedValue({ data: created })
    const { result } = renderHook(() => useCreateExpense(queryClient), { wrapper })

    await act(() => result.current.mutateAsync({ ...created }))

    expect(queryClient.getQueryData<Expense[]>(JAN)?.map((e) => e.expenseID)).toContain(5)
  })

  it('update replaces only the matching row', async () => {
    const updated = expense(2, '2025-01-20', 99)
    api.updateExpense.mockResolvedValue({ data: updated })
    const { result } = renderHook(() => useUpdateExpense(queryClient), { wrapper })

    await act(() => result.current.mutateAsync(updated))

    const jan = queryClient.getQueryData<Expense[]>(JAN)!
    expect(jan.find((e) => e.expenseID === 2)?.amount).toBe(99)
    expect(jan.find((e) => e.expenseID === 1)?.amount).toBe(10)
    expect(expenseInsightsInvalidated()).toEqual([true, true])
  })

  it('delete removes the row from the cache', async () => {
    api.deleteExpense.mockResolvedValue({ data: expense(1, '2025-01-05') })
    const { result } = renderHook(() => useDeleteExpense(queryClient), { wrapper })

    await act(() => result.current.mutateAsync(1))

    expect(queryClient.getQueryData<Expense[]>(JAN)?.map((e) => e.expenseID)).toEqual([2])
    expect(expenseInsightsInvalidated()).toEqual([true, true])
    expect(incomeInsightsInvalidated()).toEqual([false])
  })

  it('a failed create leaves the cache untouched', async () => {
    api.createExpense.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useCreateExpense(queryClient), { wrapper })

    await act(async () => {
      await result.current.mutateAsync(expense(9, '2025-01-15')).catch(() => undefined)
    })

    expect(queryClient.getQueryData<Expense[]>(JAN)).toHaveLength(2)
    expect(expenseInsightsInvalidated()).toEqual([false, false])
  })
})

describe('income mutations', () => {
  it('create invalidates income insights, not expense insights', async () => {
    const created = { incomeID: 1, incomeCategoryID: 1, incomeSourceID: 1, amount: 5, date: '2025-01-15' }
    api.createIncome.mockResolvedValue({ data: created })
    const { result } = renderHook(() => useCreateIncome(queryClient), { wrapper })

    await act(() => result.current.mutateAsync({ ...created }))

    expect(incomeInsightsInvalidated()).toEqual([true])
    expect(expenseInsightsInvalidated()).toEqual([false, false])
  })
})

describe('vendor creation', () => {
  const vendor: Vendor = { vendorID: 7, displayName: 'New', description: '' }

  it('appends to the cached vendor list', async () => {
    queryClient.setQueryData(['vendors'], [{ vendorID: 1, displayName: 'Old', description: '' }])
    api.createVendor.mockResolvedValue({ data: vendor })
    const { result } = renderHook(() => useCreateVendor(queryClient), { wrapper })

    await act(() => result.current.mutateAsync({ displayName: 'New', description: '' }))

    expect(queryClient.getQueryData<Vendor[]>(['vendors'])?.map((v) => v.vendorID)).toEqual([1, 7])
  })

  it('does not create a cache entry when vendors were never loaded', async () => {
    api.createVendor.mockResolvedValue({ data: vendor })
    const { result } = renderHook(() => useCreateVendor(queryClient), { wrapper })

    await act(() => result.current.mutateAsync({ displayName: 'New', description: '' }))

    expect(queryClient.getQueryData(['vendors'])).toBeUndefined()
  })
})
