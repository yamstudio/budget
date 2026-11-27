import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import {
  ClientSideRowModelModule,
  CustomEditorModule,
  DateEditorModule,
  ModuleRegistry,
  NumberEditorModule,
  PinnedRowModule,
  TextEditorModule,
} from 'ag-grid-community'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Smoke tests: the grids mount with their lookups and rows, and show the right columns.
const mutation = () => ({ mutateAsync: vi.fn() })
const query = <T,>(data: T) => ({ data })
vi.mock('./Queries', () => ({
  useExpenseCategories: () => query([{ expenseCategoryID: 1, displayName: 'Food', description: '' }]),
  useVendors: () => query([{ vendorID: 1, displayName: 'Market', description: '' }]),
  usePaymentMethods: () => query([{ paymentMethodID: 1, displayName: 'Card', description: '' }]),
  useExpenses: () =>
    query([{ expenseID: 10, expenseCategoryID: 1, vendorID: 1, paymentMethodID: 1, amount: 12.5, date: '2025-01-05', note: 'groceries' }]),
  useExpenseTemplates: () => query([]),
  useCreateVendor: mutation,
  useCreateExpense: mutation,
  useUpdateExpense: mutation,
  useDeleteExpense: mutation,
  useIncomeCategories: () => query([{ incomeCategoryID: 1, displayName: 'Salary', description: '' }]),
  useIncomeSources: () => query([{ incomeSourceID: 1, displayName: 'Employer', description: '' }]),
  useIncomes: () => query([{ incomeID: 20, incomeCategoryID: 1, incomeSourceID: 1, amount: 2000, date: '2025-01-01', note: 'pay' }]),
  useCreateIncome: mutation,
  useUpdateIncome: mutation,
  useDeleteIncome: mutation,
}))

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  CustomEditorModule,
  DateEditorModule,
  NumberEditorModule,
  PinnedRowModule,
  TextEditorModule,
])

const { default: Expenses } = await import('./Expenses')
const { default: Incomes } = await import('./Incomes')
const range = { fromDate: new Date(2025, 0, 1), toDate: new Date(2025, 0, 31) }
const renderWithClient = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>)

afterEach(cleanup)

describe('editable grids', () => {
  it('Expenses shows its columns', async () => {
    renderWithClient(<Expenses {...range} />)
    await waitFor(() => expect(screen.getAllByText('🏪').length).toBeGreaterThan(0))
    expect(screen.getAllByText('💳').length).toBeGreaterThan(0)
    expect(screen.getAllByText('💶').length).toBeGreaterThan(0)
  })

  it('Incomes shows its columns (no vendor or payment method)', async () => {
    renderWithClient(<Incomes {...range} />)
    await waitFor(() => expect(screen.getAllByText('💰').length).toBeGreaterThan(0))
    expect(screen.queryAllByText('🏪')).toHaveLength(0)
  })
})
