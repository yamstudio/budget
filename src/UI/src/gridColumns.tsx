import type { ColDef, ColDefField } from 'ag-grid-community'
import AutoCompleteCellEditor from './AutoCompleteCellEditor'
import ButtonCellRenderer from './ButtonCellRenderer'
import type { ButtonCellRendererProps } from './ButtonCellRenderer'

type WithCommonFields = { date?: string; amount?: number; note?: string | null }

export const dateColumn = <R extends WithCommonFields>(): ColDef<R> => ({
  editable: true,
  field: 'date' as ColDefField<R>,
  headerName: '🗓️',
  headerTooltip: 'Date',
  width: 120,
})

export const amountColumn = <R extends WithCommonFields>(): ColDef<R> => ({
  cellEditor: 'agNumberCellEditor',
  cellEditorParams: { precision: 2 },
  editable: true,
  field: 'amount' as ColDefField<R>,
  headerName: '💶',
  headerTooltip: 'Amount',
  width: 90,
})

export const noteColumn = <R extends WithCommonFields>(): ColDef<R> => ({
  editable: true,
  field: 'note' as ColDefField<R>,
  headerName: '📓',
  headerTooltip: 'Note',
  width: 120,
})

type LookupColumnOptions = {
  field: string
  headerName: string
  headerTooltip: string
  refData: Record<string, string>
  width: number
  /** When given, typing an unknown value offers to create it. Must resolve to the new id. */
  addRefData?: (label: string) => Promise<number | undefined>
}

/** A dropdown-with-autocomplete column that maps ids to display names. */
export const lookupColumn = <R,>({ field, headerName, headerTooltip, refData, width, addRefData }: LookupColumnOptions): ColDef<R> => ({
  cellEditor: AutoCompleteCellEditor,
  cellEditorParams: addRefData ? { addRefData } : undefined,
  editable: true,
  field: field as ColDefField<R>,
  headerName,
  headerTooltip,
  refData,
  width,
})

const buttonColumn = <R,>(colId: string, renderer: ButtonCellRendererProps<R>, enabled: (row: R) => boolean): ColDef<R, boolean> => ({
  cellRenderer: ButtonCellRenderer,
  cellRendererParams: renderer,
  colId,
  headerName: '',
  minWidth: 80,
  maxWidth: 80,
  sortable: false,
  valueGetter: ({ data }) => !!data && enabled(data),
})

export const saveColumn = <R,>(isSavable: (row: R) => boolean, onSave: (row: R) => void): ColDef<R, boolean> =>
  buttonColumn<R>('save', { icon: 'save', clickedHandler: ({ data }) => onSave(data!) }, isSavable)

export const deleteColumn = <R,>(onDelete: (row: R) => void): ColDef<R, boolean> =>
  buttonColumn<R>('delete', { icon: 'delete', danger: true, clickedHandler: ({ data }) => onDelete(data!) }, () => true)
