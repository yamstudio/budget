import React, { useState, useEffect, useMemo } from 'react'
import { ColDef, GetRowIdFunc } from 'ag-grid-community'
import { AgGridReact, CustomCellRendererProps } from 'ag-grid-react'
import { Button, Spin } from 'antd'
import AutoCompleteCellEditor from './AutoCompleteCellEditor'
import ButtonCellRenderer, { ButtonCellRendererProps } from './ButtonCellRenderer'
import { useCreateIncome, useDeleteIncome, useIncomeCategories, useIncomes, useIncomeSources, useUpdateIncome } from './Queries'
import { Income } from './gensrc/Api'
import { useQueryClient } from '@tanstack/react-query'

type IncomesProps = {
  fromDate: Date
  toDate: Date
}

type IncomeRow = Omit<Income, 'incomeCategory' | 'incomeSource'> & {
  original: Income | undefined
}

const Incomes = ({ fromDate, toDate }: IncomesProps) => {
  const incomeCategories = useIncomeCategories().data
  const incomeSources = useIncomeSources().data
  const incomes = useIncomes(fromDate, toDate).data
  const queryClient = useQueryClient()
  const createIncome = useCreateIncome(queryClient)
  const updateIncome = useUpdateIncome(queryClient)
  const deleteIncome = useDeleteIncome(queryClient)
  const incomeCategoryIDToDisplayName: { [key: string]: string } = useMemo(
    () =>
      incomeCategories?.reduce(
        (accumulator, { incomeCategoryID, displayName }) => ({
          ...accumulator,
          [incomeCategoryID!]: displayName,
        }),
        {} as { [key: string]: string }
      ) ?? {},
    [incomeCategories]
  )

  const incomeSourceIDToDisplayName: { [key: string]: string } = useMemo(
    () =>
      incomeSources?.reduce(
        (accumulator, { incomeSourceID, displayName }) => ({
          ...accumulator,
          [incomeSourceID!]: displayName,
        }),
        {} as { [key: string]: string }
      ) ?? {},
    [incomeSources]
  )

  const [incomeRows, setIncomeRows] = useState<IncomeRow[] | undefined>(undefined)
  const [nextIncomeID, setNextIncomeID] = useState<number>(-1)
  useEffect(
    () =>
      setIncomeRows((rows) =>
        rows
          ? rows
          : incomes?.map((income) => ({
              ...income,
              original: income,
            }))
      ),
    [incomes]
  )

  const colDefs: ColDef<IncomeRow>[] = useMemo(
    () => [
      {
        colId: 'save',
        headerName: '',
        valueGetter: ({ data }) => {
          if (!data) {
            return false
          }
          const { original, date, amount, note, incomeCategoryID, incomeSourceID } = data
          if (!(date && amount && incomeCategoryID && incomeSourceID)) {
            return false
          }
          return (
            !original ||
            date !== original.date ||
            amount !== original.amount ||
            note !== original.note ||
            incomeCategoryID !== original.incomeCategoryID ||
            incomeSourceID !== original.incomeSourceID
          )
        },
        cellRenderer: ButtonCellRenderer,
        cellRendererParams: {
          text: 'Save',
          clickedHandler: ({ data }: CustomCellRendererProps<IncomeRow>) => {
            const { original, date, amount, note, incomeCategoryID, incomeSourceID, incomeID } = data!
            const promise = original
              ? updateIncome.mutateAsync({
                  incomeID,
                  incomeCategoryID,
                  incomeSourceID,
                  date,
                  amount,
                  note,
                })
              : createIncome.mutateAsync({
                  incomeID: 0,
                  incomeCategoryID,
                  incomeSourceID,
                  date,
                  amount,
                  note,
                })
            promise.then((saved) =>
              setIncomeRows((rows) =>
                rows
                  ? [
                      ...rows.filter((row) => row.incomeID !== incomeID),
                      {
                        ...saved,
                        original: saved,
                      },
                    ]
                  : undefined
              )
            )
          },
        } satisfies ButtonCellRendererProps<IncomeRow>,
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
          clickedHandler: ({ data }: CustomCellRendererProps<IncomeRow>) => {
            const promise = data!.original ? deleteIncome.mutateAsync(data!.incomeID!) : Promise.resolve(void 0)
            promise.then(() => setIncomeRows((rows) => rows?.filter((row) => row.incomeID !== data!.incomeID)))
          },
        } satisfies ButtonCellRendererProps<IncomeRow>,
        minWidth: 105,
        maxWidth: 105,
      },
      { field: 'date', width: 120, editable: true },
      {
        field: 'incomeCategoryID',
        headerName: 'Income Category',
        refData: incomeCategoryIDToDisplayName,
        width: 200,
        editable: true,
        cellEditor: AutoCompleteCellEditor,
      },
      {
        field: 'incomeSourceID',
        headerName: 'Income Source',
        refData: incomeSourceIDToDisplayName,
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
    [incomeCategoryIDToDisplayName, incomeSourceIDToDisplayName]
  )
  const getRowId: GetRowIdFunc<IncomeRow> = ({ data }) => `${data.incomeID}`

  const createIncomeHandler = () => {
    setIncomeRows((rows) =>
      rows
        ? [
            ...rows,
            {
              incomeID: nextIncomeID,
              incomeCategoryID: undefined,
              incomeSourceID: undefined,
              date: undefined,
              amount: undefined,
              note: undefined,
              original: undefined,
            },
          ]
        : undefined
    )
    setNextIncomeID((id) => id - 1)
  }

  if (!incomeCategories || !incomeSources) {
    return (
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
      <Button disabled={!incomes} onClick={createIncomeHandler}>
        New Income
      </Button>
      <div className="ag-theme-quartz" style={{ flex: 1 }}>
        <AgGridReact rowData={incomeRows} columnDefs={colDefs} getRowId={getRowId}></AgGridReact>
      </div>
    </div>
  )
}

export default Incomes
