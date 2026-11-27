import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { PlusOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import BudgetGrid from './BudgetGrid'
import { amountColumn, dateColumn, deleteColumn, lookupColumn, noteColumn, saveColumn } from './gridColumns'
import { canSave, toRefData } from './gridRows'
import type { EditableRow } from './gridRows'
import { useCreateIncome, useDeleteIncome, useIncomeCategories, useIncomes, useIncomeSources, useUpdateIncome } from './Queries'
import { useEditableRows } from './useEditableRows'
import type { Income } from './gensrc/Api'

type IncomesProps = {
  fromDate: Date
  toDate: Date
}

type IncomeRow = EditableRow<Income>

const idOf = (income: Income) => income.incomeID
const REQUIRED: (keyof Income)[] = ['date', 'amount', 'incomeCategoryID', 'incomeSourceID']
const COMPARED: (keyof Income)[] = [...REQUIRED, 'note']

const Incomes = ({ fromDate, toDate }: IncomesProps) => {
  const queryClient = useQueryClient()
  const incomeCategories = useIncomeCategories().data
  const incomeSources = useIncomeSources().data
  const incomes = useIncomes(fromDate, toDate).data
  const { mutateAsync: createIncome } = useCreateIncome(queryClient)
  const { mutateAsync: updateIncome } = useUpdateIncome(queryClient)
  const { mutateAsync: deleteIncome } = useDeleteIncome(queryClient)
  const { rows, addDraft, save, remove } = useEditableRows(incomes, idOf)

  const colDefs = useMemo(
    () => [
      dateColumn<IncomeRow>(),
      lookupColumn<IncomeRow>({
        field: 'incomeCategoryID',
        headerName: '🏷️',
        headerTooltip: 'Category',
        refData: toRefData(
          incomeCategories,
          (c) => c.incomeCategoryID,
          (c) => c.displayName
        ),
        width: 150,
      }),
      lookupColumn<IncomeRow>({
        field: 'incomeSourceID',
        headerName: '💰',
        headerTooltip: 'Source',
        refData: toRefData(
          incomeSources,
          (s) => s.incomeSourceID,
          (s) => s.displayName
        ),
        width: 150,
      }),
      amountColumn<IncomeRow>(),
      noteColumn<IncomeRow>(),
      saveColumn<IncomeRow>(
        (row) => canSave(row, REQUIRED, COMPARED),
        (row) =>
          save(row, ({ original, incomeID, incomeCategoryID, incomeSourceID, date, amount, note }) => {
            const fields = { incomeCategoryID, incomeSourceID, date, amount, note }
            return original ? updateIncome({ incomeID, ...fields }) : createIncome({ incomeID: 0, ...fields })
          })
      ),
      deleteColumn<IncomeRow>((row) => remove(row, ({ incomeID }) => deleteIncome(incomeID!))),
    ],
    [incomeCategories, incomeSources, createIncome, updateIncome, deleteIncome, save, remove]
  )

  const addIncomeRow = () => addDraft((incomeID) => ({ incomeID }))

  return (
    <BudgetGrid
      loading={!incomeCategories || !incomeSources}
      toolbar={
        <Button className="budget-grid-control" disabled={!incomes} onClick={addIncomeRow}>
          <PlusOutlined></PlusOutlined>
        </Button>
      }
      rows={rows}
      columnDefs={colDefs}
      idOf={idOf}
    />
  )
}

export default Incomes
