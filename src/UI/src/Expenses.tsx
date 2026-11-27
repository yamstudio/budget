import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import AddExpenseButtons from './AddExpenseButtons'
import BudgetGrid from './BudgetGrid'
import { amountColumn, dateColumn, deleteColumn, lookupColumn, noteColumn, saveColumn } from './gridColumns'
import { canSave, toRefData } from './gridRows'
import type { EditableRow } from './gridRows'
import {
  useCreateExpense,
  useCreateVendor,
  useDeleteExpense,
  useExpenseCategories,
  useExpenses,
  usePaymentMethods,
  useUpdateExpense,
  useVendors,
} from './Queries'
import { useEditableRows } from './useEditableRows'
import type { Expense, ExpenseTemplate } from './gensrc/Api'

type ExpensesProps = {
  fromDate: Date
  toDate: Date
}

type ExpenseRow = EditableRow<Expense>

const idOf = (expense: Expense) => expense.expenseID
const REQUIRED: (keyof Expense)[] = ['date', 'amount', 'expenseCategoryID', 'vendorID', 'paymentMethodID']
const COMPARED: (keyof Expense)[] = [...REQUIRED, 'note']

const Expenses = ({ fromDate, toDate }: ExpensesProps) => {
  const queryClient = useQueryClient()
  const expenseCategories = useExpenseCategories().data
  const vendors = useVendors().data
  const paymentMethods = usePaymentMethods().data
  const expenses = useExpenses(fromDate, toDate).data
  const { mutateAsync: createVendor } = useCreateVendor(queryClient)
  const { mutateAsync: createExpense } = useCreateExpense(queryClient)
  const { mutateAsync: updateExpense } = useUpdateExpense(queryClient)
  const { mutateAsync: deleteExpense } = useDeleteExpense(queryClient)
  const { rows, addDraft, save, remove } = useEditableRows(expenses, idOf)

  const colDefs = useMemo(
    () => [
      dateColumn<ExpenseRow>(),
      lookupColumn<ExpenseRow>({
        field: 'expenseCategoryID',
        headerName: '🏷️',
        headerTooltip: 'Category',
        refData: toRefData(
          expenseCategories,
          (c) => c.expenseCategoryID,
          (c) => c.displayName
        ),
        width: 150,
      }),
      lookupColumn<ExpenseRow>({
        field: 'vendorID',
        headerName: '🏪',
        headerTooltip: 'Vendor',
        refData: toRefData(
          vendors,
          (v) => v.vendorID,
          (v) => v.displayName
        ),
        width: 200,
        addRefData: (displayName) => createVendor({ displayName, description: displayName }).then(({ vendorID }) => vendorID),
      }),
      lookupColumn<ExpenseRow>({
        field: 'paymentMethodID',
        headerName: '💳',
        headerTooltip: 'Payment Method',
        refData: toRefData(
          paymentMethods,
          (m) => m.paymentMethodID,
          (m) => m.displayName
        ),
        width: 200,
      }),
      amountColumn<ExpenseRow>(),
      noteColumn<ExpenseRow>(),
      saveColumn<ExpenseRow>(
        (row) => canSave(row, REQUIRED, COMPARED),
        (row) =>
          save(row, ({ original, expenseID, expenseCategoryID, vendorID, paymentMethodID, date, amount, note }) => {
            const fields = { expenseCategoryID, vendorID, paymentMethodID, date, amount, note }
            return original ? updateExpense({ expenseID, ...fields }) : createExpense({ expenseID: 0, ...fields })
          })
      ),
      deleteColumn<ExpenseRow>((row) => remove(row, ({ expenseID }) => deleteExpense(expenseID!))),
    ],
    [expenseCategories, vendors, paymentMethods, createVendor, createExpense, updateExpense, deleteExpense, save, remove]
  )

  const addExpenseRow = ({ expenseCategoryID, vendorID, paymentMethodID, amount }: ExpenseTemplate) =>
    addDraft((expenseID) => ({
      expenseID,
      expenseCategoryID: expenseCategoryID ?? undefined,
      vendorID: vendorID ?? undefined,
      paymentMethodID: paymentMethodID ?? undefined,
      amount: amount ?? undefined,
    }))

  return (
    <BudgetGrid
      loading={!expenseCategories || !vendors || !paymentMethods}
      toolbar={<AddExpenseButtons disabled={!expenses} addExpenseRow={addExpenseRow} />}
      rows={rows}
      columnDefs={colDefs}
      idOf={idOf}
    />
  )
}

export default Expenses
