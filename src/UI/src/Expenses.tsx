import React, { useState, useEffect, useMemo, useContext } from 'react'
import { ColDef, GetRowIdFunc } from 'ag-grid-community'
import { AgGridReact, CustomCellRendererProps } from 'ag-grid-react'
import { Button, Spin } from 'antd'
import { format } from 'date-fns'
import AutoCompleteCellEditor from './AutoCompleteCellEditor'
import ButtonCellRenderer, { ButtonCellRendererProps } from './ButtonCellRenderer'
import { ApiContext, ExpenseCategoriesContext, PaymentMethodsContext, VendorsContext } from './Context'
import { Expense } from './gensrc/Api'

type ExpensesProps = {
  fromDate: Date
  toDate: Date
}

type ExpenseRow = Omit<Expense, 'expenseCategory' | 'vendor' | 'paymentMethod'> & {
  original: Expense | undefined
}

const Expenses = ({ fromDate, toDate }: ExpensesProps) => {
  const expenseApi = useContext(ApiContext)
  const { expenseCategories } = useContext(ExpenseCategoriesContext)
  const { vendors, addVendor } = useContext(VendorsContext)
  const { paymentMethods, addPaymentMethod } = useContext(PaymentMethodsContext)
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

  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([])
  const [nextExpenseID, setNextExpenseID] = useState<number>(-1)
  useEffect(() => {
    expenseApi
      ?.getExpenses({
        fromDate: format(fromDate, 'yyyy-MM-dd'),
        toDate: format(toDate, 'yyyy-MM-dd'),
      })
      .then(({ data }) =>
        setExpenseRows(
          data.map((expense) => ({
            ...expense,
            original: expense,
          }))
        )
      )
  }, [expenseApi, fromDate, toDate])

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
          clickedHandler: ({ data, api }: CustomCellRendererProps<ExpenseRow>) => {
            if (!expenseApi) {
              return
            }
            const { original, date, amount, note, expenseCategoryID, vendorID, paymentMethodID, expenseID } = data!
            const payload: Expense = {
              expenseID: 0,
              expenseCategoryID,
              paymentMethodID,
              vendorID,
              date,
              amount,
              note,
            }
            const promise = original ? expenseApi.updateExpense(expenseID!, payload) : expenseApi.createExpense(payload)
            promise.then((response) => {
              const newData: ExpenseRow = {
                ...response.data,
                original: response.data,
              }
              api.applyTransaction({
                remove: [data!],
                add: [newData],
              })
              setExpenseRows((rows) => [...rows.filter((row) => row.expenseID !== expenseID), newData])
            })
          },
        } satisfies ButtonCellRendererProps<ExpenseRow>,
        minWidth: 95,
        maxWidth: 95,
      },
      {
        colId: 'delete',
        headerName: '',
        valueGetter: ({ data }) => !!data?.original,
        cellRenderer: ButtonCellRenderer,
        cellRendererParams: {
          text: 'Delete',
          danger: true,
          clickedHandler: ({ data, api }: CustomCellRendererProps<ExpenseRow>) => {
            if (!expenseApi) {
              return
            }
            const promise = data!.original ? expenseApi.deleteExpense(data!.expenseID!) : Promise.resolve(void 0)
            promise.then(() => {
              api.applyTransaction({
                remove: [data!],
              })
              setExpenseRows((rows) => rows.filter(({ expenseID }) => expenseID !== data!.expenseID))
            })
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
          addRefData: (vendorDisplayName: string) => addVendor(vendorDisplayName).then(({ vendorID }) => vendorID),
        },
      },
      {
        field: 'paymentMethodID',
        headerName: 'Payment Method',
        refData: paymentMethodIDToDisplayName,
        width: 200,
        editable: true,
        cellEditor: AutoCompleteCellEditor,
        cellEditorParams: {
          addRefData: (paymentMethodDisplayName: string) =>
            addPaymentMethod(paymentMethodDisplayName).then(({ paymentMethodID }) => paymentMethodID),
        },
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
    setExpenseRows((rows) => [
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
    ])
    setNextExpenseID(nextExpenseID - 1)
  }

  if (!expenseApi || !expenseCategories || !vendors || !paymentMethods) {
    return (
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
      <Button disabled={!expenseRows.length} onClick={addExpenseHandler}>
        New Expense
      </Button>
      <div className="ag-theme-quartz" style={{ flex: 1 }}>
        <AgGridReact rowData={expenseRows} columnDefs={colDefs} getRowId={getRowId} reactiveCustomComponents={true}></AgGridReact>
      </div>
    </div>
  )
}

export default Expenses
