import React, { useState, useEffect, useMemo } from 'react'
import { PlusOutlined } from '@ant-design/icons'
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
      { editable: true, field: 'date', headerName: '🗓️', headerTooltip: 'Date', width: 120 } satisfies ColDef<
        ExpenseRow,
        string | undefined
      >,
      {
        cellEditor: AutoCompleteCellEditor,
        editable: true,
        field: 'expenseCategoryID',
        headerName: '🏷️',
        headerTooltip: 'Category',
        refData: expenseCategoryIDToDisplayName,
        width: 150,
      } satisfies ColDef<ExpenseRow, number | undefined>,
      {
        cellEditor: AutoCompleteCellEditor,
        cellEditorParams: {
          addRefData: (vendorDisplayName: string) =>
            createVendor.mutateAsync({ displayName: vendorDisplayName, description: vendorDisplayName }).then(({ vendorID }) => vendorID),
        },
        editable: true,
        field: 'vendorID',
        headerName: '🏪',
        headerTooltip: 'Vendor',
        refData: vendorIDToDisplayName,
        width: 200,
      } satisfies ColDef<ExpenseRow, number | undefined>,
      {
        cellEditor: AutoCompleteCellEditor,
        editable: true,
        field: 'paymentMethodID',
        headerName: '💳',
        headerTooltip: 'Payment Method',
        refData: paymentMethodIDToDisplayName,
        width: 200,
      } satisfies ColDef<ExpenseRow, number | undefined>,
      {
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: {
          precision: 2,
        },
        editable: true,
        field: 'amount',
        headerName: '💶',
        headerTooltip: 'Amount',
        width: 90,
      } satisfies ColDef<ExpenseRow, number | undefined>,
      { editable: true, field: 'note', headerName: '📓', headerTooltip: 'Note', width: 120 } satisfies ColDef<
        ExpenseRow,
        string | null | undefined
      >,
      {
        cellRenderer: ButtonCellRenderer,
        cellRendererParams: {
          icon: 'save',
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
        colId: 'save',
        headerName: '',
        minWidth: 80,
        maxWidth: 80,
        sortable: false,
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
      } satisfies ColDef<ExpenseRow, boolean>,
      {
        cellRenderer: ButtonCellRenderer,
        cellRendererParams: {
          icon: 'delete',
          danger: true,
          clickedHandler: ({ data }: CustomCellRendererProps<ExpenseRow>) => {
            const promise = data!.original ? deleteExpense.mutateAsync(data!.expenseID!) : Promise.resolve(void 0)
            promise.then(() => setExpenseRows((rows) => rows?.filter((row) => row.expenseID !== data!.expenseID)))
          },
        } satisfies ButtonCellRendererProps<ExpenseRow>,
        colId: 'delete',
        headerName: '',
        minWidth: 80,
        maxWidth: 80,
        sortable: false,
        valueGetter: () => true,
      } satisfies ColDef<ExpenseRow, boolean>,
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

  const rowData = expenseRows?.filter(({ original }) => original)
  const pinnedTopRowData = expenseRows?.filter(({ original }) => !original)

  return (
    <div className="budget-grid-container">
      {!expenseCategories || !vendors || !paymentMethods ? (
        <Spin size="large" />
      ) : (
        <>
          <Button className="budget-grid-control" disabled={!expenses} onClick={addExpenseHandler}>
            <PlusOutlined></PlusOutlined>
          </Button>
          <div className="ag-theme-quartz" style={{ flex: 1 }}>
            <AgGridReact rowData={rowData} pinnedTopRowData={pinnedTopRowData} columnDefs={colDefs} getRowId={getRowId}></AgGridReact>
          </div>
        </>
      )}
    </div>
  )
}

export default Expenses
