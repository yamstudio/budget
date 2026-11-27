import { QueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { Api } from '../gensrc/Api'
import type { TableKey } from './referenceParams'
import type { ReferenceRow } from './referenceRows'

const api = new Api<never>().api

/** One editable lookup table. `queryKey` is the same key the pickers use, so edits show up everywhere without a reload. */
export interface ReferenceTable {
  key: TableKey
  label: string
  singular: string
  /** What blocks a delete, for the error message. */
  usedBy: string
  queryKey: string[]
  necessity?: boolean
  fetch: () => Promise<ReferenceRow[]>
  idOf: (row: ReferenceRow) => number
  create: (row: ReferenceRow) => Promise<unknown>
  update: (id: number, row: ReferenceRow) => Promise<unknown>
  remove: (id: number) => Promise<unknown>
}

interface TableDefinition<Raw extends ReferenceRow> extends Omit<ReferenceTable, 'fetch' | 'idOf' | 'create' | 'update'> {
  fetch: () => Promise<Raw[]>
  idOf: (row: Raw) => number | undefined
  create: (row: Raw) => Promise<unknown>
  update: (id: number, row: Raw) => Promise<unknown>
}

/** Each table's API types differ only in their id field, so the shared shape is asserted once, here. */
const defineTable = <Raw extends ReferenceRow>(definition: TableDefinition<Raw>) => definition as unknown as ReferenceTable

export const REFERENCE_TABLES: ReferenceTable[] = [
  defineTable({
    key: 'vendors',
    label: 'Vendors',
    singular: 'vendor',
    usedBy: 'expenses',
    queryKey: ['vendors'],
    fetch: () => api.getVendors().then(({ data }) => data),
    idOf: (row) => (row as { vendorID?: number }).vendorID,
    create: (row) => api.createVendor(row),
    update: (id, row) => api.updateVendor(id, row),
    remove: (id) => api.deleteVendor(id),
  }),
  defineTable({
    key: 'payment-methods',
    label: 'Payment methods',
    singular: 'payment method',
    usedBy: 'expenses',
    queryKey: ['paymentMethods'],
    fetch: () => api.getPaymentMethods().then(({ data }) => data),
    idOf: (row) => (row as { paymentMethodID?: number }).paymentMethodID,
    create: (row) => api.createPaymentMethod(row),
    update: (id, row) => api.updatePaymentMethod(id, row),
    remove: (id) => api.deletePaymentMethod(id),
  }),
  defineTable({
    key: 'expense-categories',
    label: 'Expense categories',
    singular: 'expense category',
    usedBy: 'expenses or budgets',
    queryKey: ['expenseCategories'],
    necessity: true,
    fetch: () => api.getExpenseCategories().then(({ data }) => data),
    idOf: (row) => (row as { expenseCategoryID?: number }).expenseCategoryID,
    create: (row) => api.createExpenseCategory(row),
    update: (id, row) => api.updateExpenseCategory(id, row),
    remove: (id) => api.deleteExpenseCategory(id),
  }),
  defineTable({
    key: 'income-categories',
    label: 'Income categories',
    singular: 'income category',
    usedBy: 'incomes',
    queryKey: ['incomeCategories'],
    fetch: () => api.getIncomeCategories().then(({ data }) => data),
    idOf: (row) => (row as { incomeCategoryID?: number }).incomeCategoryID,
    create: (row) => api.createIncomeCategory(row),
    update: (id, row) => api.updateIncomeCategory(id, row),
    remove: (id) => api.deleteIncomeCategory(id),
  }),
  defineTable({
    key: 'income-sources',
    label: 'Income sources',
    singular: 'income source',
    usedBy: 'incomes',
    queryKey: ['incomeSources'],
    fetch: () => api.getIncomeSources().then(({ data }) => data),
    idOf: (row) => (row as { incomeSourceID?: number }).incomeSourceID,
    create: (row) => api.createIncomeSource(row),
    update: (id, row) => api.updateIncomeSource(id, row),
    remove: (id) => api.deleteIncomeSource(id),
  }),
]

export const tableByKey = (key: TableKey) => REFERENCE_TABLES.find((table) => table.key === key)!

export const useReferenceRows = (table: ReferenceTable) => useQuery({ queryKey: table.queryKey, queryFn: table.fetch, staleTime: Infinity })

/** Names appear in server-side aggregates too, so a rename or delete must refresh those. */
const INSIGHT_KEYS = ['expenseBreakdown', 'incomeBreakdown', 'budgetComparison']
const refresh = (queryClient: QueryClient, table: ReferenceTable) => {
  queryClient.invalidateQueries({ queryKey: table.queryKey })
  queryClient.invalidateQueries({ predicate: ({ queryKey }) => INSIGHT_KEYS.includes(queryKey[0] as string) })
}

/** Create (no id) or rename/update (with id) a row. */
export const useSaveReferenceRow = (queryClient: QueryClient, table: ReferenceTable) =>
  useMutation({
    mutationKey: ['saveReference', table.key],
    mutationFn: ({ id, row }: { id?: number; row: ReferenceRow }) => (id === undefined ? table.create(row) : table.update(id, row)),
    onSuccess: () => refresh(queryClient, table),
  })

export const useDeleteReferenceRow = (queryClient: QueryClient, table: ReferenceTable) =>
  useMutation({
    mutationKey: ['deleteReference', table.key],
    mutationFn: (id: number) => table.remove(id),
    onSuccess: () => refresh(queryClient, table),
  })

/** A message for a failed save or delete. The API answers 409 when a row is still in use. */
export const referenceErrorMessage = (error: unknown, table: ReferenceTable, action: 'save' | 'delete') =>
  (error as { status?: number } | null)?.status === 409
    ? `This ${table.singular} is still used by ${table.usedBy}, so it can't be deleted. Change or delete those first.`
    : `Could not ${action} the ${table.singular}. Check your connection and try again.`
