import { QueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { addMonths, format, startOfMonth } from 'date-fns'
import { Api, Expense, ExpenseCategory, Income, Vendor } from './gensrc/Api'

const api = new Api<never>().api

export const useExpenses = (fromDate: Date, toDate: Date) =>
  useQuery({
    initialData: undefined,
    queryKey: ['expenses', format(fromDate, 'yyyy-MM-dd'), format(toDate, 'yyyy-MM-dd')],
    staleTime: 300_000,
    queryFn: () =>
      api
        .getExpenses({
          fromDate: format(fromDate, 'yyyy-MM-dd'),
          toDate: format(toDate, 'yyyy-MM-dd'),
        })
        .then(({ data }) => data),
  })
const queryExpenses = (queryClient: QueryClient, date: string) =>
  queryClient
    .getQueriesData({
      exact: false,
      queryKey: ['expenses'],
      predicate: ({ queryKey, state }) =>
        queryKey.length === 3 &&
        (queryKey[1] as string).localeCompare(date) <= 0 &&
        (queryKey[2] as string).localeCompare(date) >= 0 &&
        Array.isArray(state.data),
    })
    .map(([queryKey, expenses]) => ({ queryKey: queryKey as string[], expenses: expenses as Expense[] }))
export const useCreateExpense = (queryClient: QueryClient) =>
  useMutation({
    mutationKey: ['createExpense'],
    mutationFn: (createExpenseRequest: Omit<Expense, 'ExpenseID'>) => api.createExpense(createExpenseRequest).then(({ data }) => data),
    onSuccess: (data) => {
      queryExpenses(queryClient, data.date!).forEach(({ queryKey, expenses }) => {
        queryClient.setQueryData(queryKey, [...expenses, data])
      })
      invalidateBreakdowns(queryClient, 'expenseBreakdown')
    },
  })
export const useUpdateExpense = (queryClient: QueryClient) =>
  useMutation({
    mutationKey: ['updateExpense'],
    mutationFn: (updateExpenseRequest: Expense) =>
      api.updateExpense(updateExpenseRequest.expenseID!, updateExpenseRequest).then(({ data }) => data),
    onSuccess: (data) => {
      const { date, expenseID } = data
      queryExpenses(queryClient, date!).forEach(({ queryKey, expenses }) => {
        queryClient.setQueryData(
          queryKey,
          expenses.map((expense) => (expense.expenseID === expenseID ? data : expense))
        )
      })
      invalidateBreakdowns(queryClient, 'expenseBreakdown')
    },
  })
export const useDeleteExpense = (queryClient: QueryClient) =>
  useMutation({
    mutationKey: ['deleteExpense'],
    mutationFn: (expenseID: number) => api.deleteExpense(expenseID).then(({ data }) => data),
    onSuccess: (data) => {
      const { date, expenseID } = data
      queryExpenses(queryClient, date!).forEach(({ queryKey, expenses }) => {
        queryClient.setQueryData(
          queryKey,
          expenses.filter((expense) => expense.expenseID !== expenseID)
        )
      })
      invalidateBreakdowns(queryClient, 'expenseBreakdown')
    },
  })

export const useIncomes = (fromDate: Date, toDate: Date) =>
  useQuery({
    initialData: undefined,
    queryKey: ['incomes', format(fromDate, 'yyyy-MM-dd'), format(toDate, 'yyyy-MM-dd')],
    staleTime: 300_000,
    queryFn: () =>
      api
        .getIncomes({
          fromDate: format(fromDate, 'yyyy-MM-dd'),
          toDate: format(toDate, 'yyyy-MM-dd'),
        })
        .then(({ data }) => data),
  })
const queryIncomes = (queryClient: QueryClient, date: string) =>
  queryClient
    .getQueriesData({
      exact: false,
      queryKey: ['incomes'],
      predicate: ({ queryKey, state }) =>
        queryKey.length === 3 &&
        (queryKey[1] as string).localeCompare(date) <= 0 &&
        (queryKey[2] as string).localeCompare(date) >= 0 &&
        Array.isArray(state.data),
    })
    .map(([queryKey, incomes]) => ({ queryKey: queryKey as string[], incomes: incomes as Income[] }))
export const useCreateIncome = (queryClient: QueryClient) =>
  useMutation({
    mutationKey: ['createIncome'],
    mutationFn: (createIncomeRequest: Omit<Income, 'IncomeID'>) => api.createIncome(createIncomeRequest).then(({ data }) => data),
    onSuccess: (data) => {
      queryIncomes(queryClient, data.date!).forEach(({ queryKey, incomes }) => {
        queryClient.setQueryData(queryKey, [...incomes, data])
      })
      invalidateBreakdowns(queryClient, 'incomeBreakdown')
    },
  })
export const useUpdateIncome = (queryClient: QueryClient) =>
  useMutation({
    mutationKey: ['updateIncome'],
    mutationFn: (updateIncomeRequest: Income) =>
      api.updateIncome(updateIncomeRequest.incomeID!, updateIncomeRequest).then(({ data }) => data),
    onSuccess: (data) => {
      const { date, incomeID } = data
      queryIncomes(queryClient, date!).forEach(({ queryKey, incomes }) => {
        queryClient.setQueryData(
          queryKey,
          incomes.map((income) => (income.incomeID === incomeID ? data : income))
        )
      })
      invalidateBreakdowns(queryClient, 'incomeBreakdown')
    },
  })
export const useDeleteIncome = (queryClient: QueryClient) =>
  useMutation({
    mutationKey: ['deleteIncome'],
    mutationFn: (incomeID: number) => api.deleteIncome(incomeID).then(({ data }) => data),
    onSuccess: (data) => {
      const { date, incomeID } = data
      queryIncomes(queryClient, date!).forEach(({ queryKey, incomes }) => {
        queryClient.setQueryData(
          queryKey,
          incomes.filter((income) => income.incomeID !== incomeID)
        )
      })
      invalidateBreakdowns(queryClient, 'incomeBreakdown')
    },
  })

export const useExpenseCategories = () =>
  useQuery({
    initialData: undefined,
    queryKey: ['expenseCategories'],
    queryFn: () => api.getExpenseCategories().then(({ data }) => data),
    staleTime: Infinity,
  })

const invalidateBreakdowns = (queryClient: QueryClient, kind: 'expenseBreakdown' | 'incomeBreakdown') => {
  if (kind === 'expenseBreakdown') queryClient.invalidateQueries({ queryKey: ['budgetComparison'] })
  return queryClient.invalidateQueries({ queryKey: [kind] })
}

export const useExpenseTemplates = () =>
  useQuery({
    initialData: undefined,
    queryKey: ['expenseTemplates'],
    queryFn: () =>
      api
        .getExpenseTemplates({
          fromDate: format(startOfMonth(addMonths(today, -6)), 'yyyy-MM-dd'),
          toDate: format(today, 'yyyy-MM-dd'),
          groupThreshold: 3,
          maxResults: 10,
          aggregateByAmount: true,
          aggregateByExpenseCategory: true,
          aggregateByPaymentMethod: true,
          aggregateByVendor: true,
        })
        .then(({ data }) => data),
    staleTime: Infinity,
  })

export const useIncomeCategories = () =>
  useQuery({
    initialData: undefined,
    queryKey: ['incomeCategories'],
    queryFn: () => api.getIncomeCategories().then(({ data }) => data),
    staleTime: Infinity,
  })

export const useIncomeSources = () =>
  useQuery({
    initialData: undefined,
    queryKey: ['incomeSources'],
    queryFn: () => api.getIncomeSources().then(({ data }) => data),
    staleTime: Infinity,
  })

export const usePaymentMethods = () =>
  useQuery({
    initialData: undefined,
    queryKey: ['paymentMethods'],
    queryFn: () => api.getPaymentMethods().then(({ data }) => data),
    staleTime: Infinity,
  })

export const useVendors = () =>
  useQuery({ initialData: undefined, queryKey: ['vendors'], queryFn: () => api.getVendors().then(({ data }) => data), staleTime: Infinity })
export const useCreateVendor = (queryClient: QueryClient) =>
  useMutation({
    mutationKey: ['createVendor'],
    mutationFn: (createVendorRequest: Omit<Vendor, 'vendorID'>) => api.createVendor(createVendorRequest).then(({ data }) => data),
    onSuccess: (data) => {
      const vendors = queryClient.getQueryData(['vendors']) as Vendor[] | undefined
      if (vendors) {
        queryClient.setQueryData(['vendors'], [...vendors, data])
      }
    },
  })

export const today = new Date()

export const useUpdateExpenseCategory = (queryClient: QueryClient) =>
  useMutation({
    mutationKey: ['updateExpenseCategory'],
    mutationFn: (category: ExpenseCategory) => api.updateExpenseCategory(category.expenseCategoryID!, category).then(({ data }) => data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseCategories'] })
      invalidateBreakdowns(queryClient, 'expenseBreakdown')
    },
  })

export type ExpenseBreakdownQuery = Parameters<typeof api.getExpenseBreakdown>[0]
export type BudgetComparisonQuery = Parameters<typeof api.getBudgetComparison>[0]
export type IncomeBreakdownQuery = Parameters<typeof api.getIncomeBreakdown>[0]

export const useExpenseBreakdown = (query: ExpenseBreakdownQuery, enabled = true) =>
  useQuery({
    enabled,
    queryKey: ['expenseBreakdown', query],
    staleTime: 300_000,
    queryFn: () => api.getExpenseBreakdown(query).then(({ data }) => data),
  })

export const useIncomeBreakdown = (query: IncomeBreakdownQuery, enabled = true) =>
  useQuery({
    enabled,
    queryKey: ['incomeBreakdown', query],
    staleTime: 300_000,
    queryFn: () => api.getIncomeBreakdown(query).then(({ data }) => data),
  })

export const useBudgetComparison = (query: BudgetComparisonQuery, enabled = true) =>
  useQuery({
    enabled,
    queryKey: ['budgetComparison', query],
    staleTime: 300_000,
    queryFn: () => api.getBudgetComparison(query).then(({ data }) => data),
  })
