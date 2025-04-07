import React, { useState, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { PlusOutlined } from '@ant-design/icons'
import { ColDef, GetRowIdFunc } from 'ag-grid-community'
import { AgGridReact, CustomCellRendererProps } from 'ag-grid-react'
import { Button, Spin } from 'antd'
import AutoCompleteCellEditor from './AutoCompleteCellEditor'
import ButtonCellRenderer, { ButtonCellRendererProps } from './ButtonCellRenderer'
import { useCreateIncome, useDeleteIncome, useIncomeCategories, useIncomes, useIncomeSources, useUpdateIncome } from './Queries'
import { Income } from './gensrc/Api'

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
      { editable: true, field: 'date', headerName: '🗓️', headerTooltip: 'Date', width: 120 } satisfies ColDef<
        IncomeRow,
        string | undefined
      >,
      {
        cellEditor: AutoCompleteCellEditor,
        editable: true,
        field: 'incomeCategoryID',
        headerName: '🏷️',
        headerTooltip: 'Category',
        refData: incomeCategoryIDToDisplayName,
        width: 150,
      } satisfies ColDef<IncomeRow, number | undefined>,
      {
        cellEditor: AutoCompleteCellEditor,
        editable: true,
        field: 'incomeSourceID',
        headerName: '💰',
        headerTooltip: 'Source',
        refData: incomeSourceIDToDisplayName,
        width: 150,
      } satisfies ColDef<IncomeRow, number | undefined>,
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
      } satisfies ColDef<IncomeRow, number | undefined>,
      { editable: true, field: 'note', headerName: '📓', headerTooltip: 'Note', width: 120 } satisfies ColDef<
        IncomeRow,
        string | null | undefined
      >,
      {
        cellRenderer: ButtonCellRenderer,
        cellRendererParams: {
          icon: 'save',
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
        colId: 'save',
        headerName: '',
        minWidth: 80,
        maxWidth: 80,
        sortable: false,
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
      } satisfies ColDef<IncomeRow, boolean>,
      {
        colId: 'delete',
        cellRenderer: ButtonCellRenderer,
        cellRendererParams: {
          icon: 'delete',
          danger: true,
          clickedHandler: ({ data }: CustomCellRendererProps<IncomeRow>) => {
            const promise = data!.original ? deleteIncome.mutateAsync(data!.incomeID!) : Promise.resolve(void 0)
            promise.then(() => setIncomeRows((rows) => rows?.filter((row) => row.incomeID !== data!.incomeID)))
          },
        } satisfies ButtonCellRendererProps<IncomeRow>,
        headerName: '',
        minWidth: 80,
        maxWidth: 80,
        sortable: false,
        valueGetter: () => true,
      } satisfies ColDef<IncomeRow, boolean>,
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

  const rowData = incomeRows?.filter(({ original }) => original)
  const pinnedTopRowData = incomeRows?.filter(({ original }) => !original)

  return (
    <div className="budget-grid-container">
      {!incomeCategories || !incomeSources ? (
        <Spin size="large" />
      ) : (
        <>
          <Button className="budget-grid-control" disabled={!incomes} onClick={createIncomeHandler}>
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

export default Incomes
