import React from 'react'
import { CustomCellRendererProps } from 'ag-grid-react'
import { Button } from 'antd'

export type ButtonCellRendererProps<TData> = {
  text: string
  isDisabledGetter: (data: TData | undefined) => boolean
  clickedHandler: (props: CustomCellRendererProps<TData>) => void
}

const ButtonCellRenderer = <TData,>(props: CustomCellRendererProps<TData> & ButtonCellRendererProps<TData>) => {
  const { text, isDisabledGetter, clickedHandler, data } = props
  const isDisabled = isDisabledGetter(data)
  return (
    <Button type="primary" disabled={isDisabled} onClick={() => clickedHandler(props)}>
      {text}
    </Button>
  )
}

export default ButtonCellRenderer
