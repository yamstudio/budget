import React, { useState, useEffect, useMemo, useContext } from 'react'
import { ColDef, GetRowIdFunc } from 'ag-grid-community'
import { AgGridReact, CustomCellRendererProps } from 'ag-grid-react'
import { Button, Spin } from 'antd'
import { format } from 'date-fns'
import AutoCompleteCellEditor from './AutoCompleteCellEditor'
import ButtonCellRenderer, { ButtonCellRendererProps } from './ButtonCellRenderer'
import { ApiContext, IncomeCategoriesContext, IncomeSourcesContext } from './Context'
import { Income } from './gensrc/Api'

type IncomesProps = {
  fromDate: Date
  toDate: Date
}

type IncomeRow = Omit<Income, 'incomeCategory' | 'incomeSource'> & {
  original: Income | undefined
}

const Incomes = ({ fromDate, toDate }: IncomesProps) => {
  const incomeApi = useContext(ApiContext)
  const { incomeCategories } = useContext(IncomeCategoriesContext)
  const { incomeSources } = useContext(IncomeSourcesContext)
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

  const [incomeRows, setIncomeRows] = useState<IncomeRow[]>([])
  const [nextIncomeID, setNextIncomeID] = useState<number>(-1)
  useEffect(() => {
    incomeApi
      ?.getIncomes({
        fromDate: format(fromDate, 'yyyy-MM-dd'),
        toDate: format(toDate, 'yyyy-MM-dd'),
      })
      .then(({ data }) =>
        setIncomeRows(
          data.map((income) => ({
            ...income,
            original: income,
          }))
        )
      )
  }, [incomeApi, fromDate, toDate])

  const colDefs: ColDef<IncomeRow>[] = useMemo(
    () => [
      {
        colId: 'save',
        headerName: '',
        cellRenderer: ButtonCellRenderer,
        cellRendererParams: {
          text: 'Save',
          isDisabledGetter: (incomeRow: IncomeRow | undefined) => {
            if (!incomeRow) {
              return true
            }
            const { original, date, amount, note, incomeCategoryID, incomeSourceID } = incomeRow
            if (!(date && amount && incomeCategoryID && incomeSourceID)) {
              return true
            }
            return (
              !!original &&
              date === original.date &&
              amount === original.amount &&
              note === original.note &&
              incomeCategoryID === original.incomeCategoryID &&
              incomeSourceID === original.incomeSourceID
            )
          },
          clickedHandler: ({ data, api }: CustomCellRendererProps<IncomeRow>) => {
            if (!incomeApi) {
              return
            }
            const { original, date, amount, note, incomeCategoryID, incomeSourceID, incomeID } = data!
            const payload: Income = {
              incomeID: 0,
              incomeCategoryID,
              incomeSourceID,
              date,
              amount,
              note,
            }
            const promise = original ? incomeApi.updateIncome(incomeID!, payload) : incomeApi.createIncome(payload)
            promise.then((response) => {
              const newData: IncomeRow = {
                ...response.data,
                original: response.data,
              }
              api.applyTransaction({
                remove: [data!],
                add: [newData],
              })
              setIncomeRows((rows) => [...rows.filter((row) => row.incomeID !== incomeID), newData])
            })
          },
        } satisfies ButtonCellRendererProps<IncomeRow>,
        minWidth: 95,
        maxWidth: 95,
      },
      {
        colId: 'delete',
        headerName: '',
        cellRenderer: ButtonCellRenderer,
        cellRendererParams: {
          text: 'Delete',
          isDisabledGetter: (incomeRow: IncomeRow | undefined) => !incomeRow?.original,
          clickedHandler: ({ data, api }: CustomCellRendererProps<IncomeRow>) => {
            if (!incomeApi) {
              return
            }
            const promise = data!.original ? incomeApi.deleteIncome(data!.incomeID!) : Promise.resolve(void 0)
            promise.then(() => {
              api.applyTransaction({
                remove: [data!],
              })
              setIncomeRows((rows) => rows.filter(({ incomeID }) => incomeID !== data!.incomeID))
            })
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

  const addIncomeHandler = () => {
    setIncomeRows((rows) => [
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
    ])
    setNextIncomeID(nextIncomeID - 1)
  }

  if (!incomeApi || !incomeCategories || !incomeSources) {
    return (
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
      <Button disabled={!incomeRows.length} onClick={addIncomeHandler}>
        New Income
      </Button>
      <div className="ag-theme-quartz" style={{ flex: 1 }}>
        <AgGridReact rowData={incomeRows} columnDefs={colDefs} getRowId={getRowId} reactiveCustomComponents={true}></AgGridReact>
      </div>
    </div>
  )
}

export default Incomes
