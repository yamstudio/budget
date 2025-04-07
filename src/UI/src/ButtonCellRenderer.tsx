import React from 'react'
import { SaveOutlined, DeleteOutlined } from '@ant-design/icons'
import { CustomCellRendererProps } from 'ag-grid-react'
import { Button } from 'antd'

export type ButtonCellRendererProps<TData> = {
  icon: 'save' | 'delete'
  danger?: boolean
  clickedHandler: (props: CustomCellRendererProps<TData>) => void
}

const ButtonCellRenderer = <TData,>(props: CustomCellRendererProps<TData, boolean> & ButtonCellRendererProps<TData>) => {
  const { icon, clickedHandler, danger, value } = props
  return (
    <Button type="primary" danger={danger} disabled={!value} onClick={() => clickedHandler(props)}>
      {icon === 'save' ? <SaveOutlined></SaveOutlined> : <DeleteOutlined></DeleteOutlined>}
    </Button>
  )
}

export default ButtonCellRenderer
