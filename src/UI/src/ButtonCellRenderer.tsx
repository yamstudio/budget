import React from 'react'
import { CustomCellRendererProps } from 'ag-grid-react'
import { Button } from 'antd'

export type ButtonCellRendererProps<TData> = {
  text: string
  danger?: boolean
  clickedHandler: (props: CustomCellRendererProps<TData>) => void
}

const ButtonCellRenderer = <TData,>(props: CustomCellRendererProps<TData, boolean> & ButtonCellRendererProps<TData>) => {
  const { text, clickedHandler, danger, value } = props
  return (
    <Button type="primary" danger={danger} disabled={!value} onClick={() => clickedHandler(props)}>
      {text}
    </Button>
  )
}

export default ButtonCellRenderer
