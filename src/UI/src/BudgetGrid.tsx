import type { ReactNode } from 'react'
import type { ColDef, GetRowIdFunc } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import { Spin } from 'antd'
import type { EditableRow } from './gridRows'

type BudgetGridProps<T> = {
  /** Show a spinner instead of the grid (lookups still loading). */
  loading: boolean
  /** The "add" controls shown above the grid. */
  toolbar: ReactNode
  rows: EditableRow<T>[] | undefined
  columnDefs: ColDef<EditableRow<T>>[]
  idOf: (entity: T) => number | undefined
}

/** Shared layout for the editable grids. Unsaved drafts are pinned to the top. */
const BudgetGrid = <T,>({ loading, toolbar, rows, columnDefs, idOf }: BudgetGridProps<T>) => {
  const getRowId: GetRowIdFunc<EditableRow<T>> = ({ data }) => `${idOf(data)}`
  return (
    <div className="budget-grid-container">
      {loading ? (
        <Spin size="large" />
      ) : (
        <>
          {toolbar}
          <div className="ag-theme-quartz" style={{ flex: 1 }}>
            <AgGridReact
              rowData={rows?.filter(({ original }) => original)}
              pinnedTopRowData={rows?.filter(({ original }) => !original)}
              columnDefs={columnDefs}
              getRowId={getRowId}
            ></AgGridReact>
          </div>
        </>
      )}
    </div>
  )
}

export default BudgetGrid
