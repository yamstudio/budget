import React, { useState, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ColDef, GetRowIdFunc } from 'ag-grid-community'
import { AgGridReact, CustomCellRendererProps } from 'ag-grid-react'
import { Button, Spin } from 'antd'
import AutoCompleteCellEditor from './AutoCompleteCellEditor'
import ButtonCellRenderer, { ButtonCellRendererProps } from './ButtonCellRenderer'
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
import { Expense } from './gensrc/Api'

type ExpensesProps = {
  fromDate: Date
  toDate: Date
}

type ExpenseRow = Omit<Expense, 'expenseCategory' | 'vendor' | 'paymentMethod'> & {
  original: Expense | undefined
}

const Expenses = ({ fromDate, toDate }: ExpensesProps) => {
  const expenseCategories = useExpenseCategories().data
  const queryClient = useQueryClient()
  const vendors = useVendors().data
  const createVendor = useCreateVendor(queryClient)
  const paymentMethods = usePaymentMethods().data
  const expenses = useExpenses(fromDate, toDate).data
  const createExpense = useCreateExpense(queryClient)
  const updateExpense = useUpdateExpense(queryClient)
  const deleteExpense = useDeleteExpense(queryClient)
  const expenseCategoryIDToDisplayName: { [key: string]: string } = useMemo(
    () =>
      expenseCategories?.reduce(
        (accumulator, { expenseCategoryID, displayName }) => ({
          ...accumulator,
          [expenseCategoryID!]: displayName,
        }),
        {} as { [key: string]: string }
      ) ?? {},
    [expenseCategories]
  )
  const paymentMethodIDToDisplayName: { [key: string]: string } = useMemo(
    () =>
      paymentMethods?.reduce(
        (accumulator, { paymentMethodID, displayName }) => ({
          ...accumulator,
          [paymentMethodID!]: displayName,
        }),
        {} as { [key: string]: string }
      ) ?? {},
    [paymentMethods]
  )
  const vendorIDToDisplayName: { [key: string]: string } = useMemo(
    () =>
      vendors?.reduce(
        (accumulator, { vendorID, displayName }) => ({
          ...accumulator,
          [vendorID!]: displayName,
        }),
        {} as { [key: string]: string }
      ) ?? {},
    [vendors]
  )

  const [expenseRows, setExpenseRows] = useState<ExpenseRow[] | undefined>(undefined)
  const [nextExpenseID, setNextExpenseID] = useState<number>(-1)
  useEffect(
    () =>
      setExpenseRows((rows) =>
        rows
          ? rows
          : expenses?.map((expense) => ({
              ...expense,
              original: expense,
            }))
      ),
    [expenses]
  )

  const colDefs: ColDef<ExpenseRow>[] = useMemo(
    () => [
      {
        colId: 'save',
        headerName: '',
        valueGetter: ({ data }) => {
          if (!data) {
            return false
          }
          const { original, date, amount, note, expenseCategoryID, vendorID, paymentMethodID } = data
          if (!(date && amount && expenseCategoryID && vendorID && paymentMethodID)) {
            return false
          }
          return (
            !original ||
            date !== original.date ||
            amount !== original.amount ||
            note !== original.note ||
            expenseCategoryID !== original.expenseCategoryID ||
            vendorID !== original.vendorID ||
            paymentMethodID !== original.paymentMethodID
          )
        },
        cellRenderer: ButtonCellRenderer,
        cellRendererParams: {
          text: 'Save',
          clickedHandler: ({ data }: CustomCellRendererProps<ExpenseRow>) => {
            const { original, date, amount, note, expenseCategoryID, vendorID, paymentMethodID, expenseID } = data!
            const promise = original
              ? updateExpense.mutateAsync({
                  expenseID,
                  expenseCategoryID,
                  paymentMethodID,
                  vendorID,
                  date,
                  amount,
                  note,
                })
              : createExpense.mutateAsync({
                  expenseID: 0,
                  expenseCategoryID,
                  paymentMethodID,
                  vendorID,
                  date,
                  amount,
                  note,
                })
            promise.then((saved) =>
              setExpenseRows((rows) =>
                rows
                  ? [
                      ...rows.filter((row) => row.expenseID !== expenseID),
                      {
                        ...saved,
                        original: saved,
                      },
                    ]
                  : undefined
              )
            )
          },
        } satisfies ButtonCellRendererProps<ExpenseRow>,
        minWidth: 95,
        maxWidth: 95,
      },
      {
        colId: 'delete',
        headerName: '',
        valueGetter: () => true,
        cellRenderer: ButtonCellRenderer,
        cellRendererParams: {
          text: 'Delete',
          danger: true,
          clickedHandler: ({ data }: CustomCellRendererProps<ExpenseRow>) => {
            const promise = data!.original ? deleteExpense.mutateAsync(data!.expenseID!) : Promise.resolve(void 0)
            promise.then(() => setExpenseRows((rows) => rows?.filter((row) => row.expenseID !== data!.expenseID)))
          },
        } satisfies ButtonCellRendererProps<ExpenseRow>,
        minWidth: 105,
        maxWidth: 105,
      },
      { field: 'date', width: 120, editable: true },
      {
        field: 'expenseCategoryID',
        headerName: 'Expense Category',
        refData: expenseCategoryIDToDisplayName,
        width: 200,
        editable: true,
        cellEditor: AutoCompleteCellEditor,
      },
      {
        field: 'vendorID',
        headerName: 'Vendor',
        refData: vendorIDToDisplayName,
        width: 200,
        editable: true,
        cellEditor: AutoCompleteCellEditor,
        cellEditorParams: {
          addRefData: (vendorDisplayName: string) =>
            createVendor.mutateAsync({ displayName: vendorDisplayName, description: vendorDisplayName }).then(({ vendorID }) => vendorID),
        },
      },
      {
        field: 'paymentMethodID',
        headerName: 'Payment Method',
        refData: paymentMethodIDToDisplayName,
        width: 200,
        editable: true,
        cellEditor: AutoCompleteCellEditor,
      },
      {
        field: 'amount',
        width: 120,
        editable: true,
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: {
          precision: 2,
        },
      },
      { field: 'note', editable: true },
    ],
    [expenseCategoryIDToDisplayName, paymentMethodIDToDisplayName, vendorIDToDisplayName]
  )
  const getRowId: GetRowIdFunc<ExpenseRow> = ({ data }) => `${data.expenseID}`

  const addExpenseHandler = () => {
    setExpenseRows((rows) =>
      rows
        ? [
            ...rows,
            {
              expenseID: nextExpenseID,
              expenseCategoryID: undefined,
              vendorID: undefined,
              paymentMethodID: undefined,
              date: undefined,
              amount: undefined,
              note: undefined,
              original: undefined,
            },
          ]
        : undefined
    )
    setNextExpenseID((id) => id - 1)
  }

  if (!expenseCategories || !vendors || !paymentMethods) {
    return (
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
      <Button disabled={!expenses} onClick={addExpenseHandler}>
        New Expense
      </Button>
      <div className="ag-theme-quartz" style={{ flex: 1 }}>
        <AgGridReact rowData={expenseRows} columnDefs={colDefs} getRowId={getRowId} reactiveCustomComponents={true}></AgGridReact>
      </div>
    </div>
  )
}

export default Expenses
