import React, { forwardRef, ForwardedRef, useState } from 'react'
import { CustomCellEditorProps } from 'ag-grid-react'
import { AutoComplete } from 'antd'
import type { BaseSelectRef } from 'rc-select'

type AutoCompleteCellEditorProps = CustomCellEditorProps<unknown, number, unknown> & {
  addRefData?: (label: string) => Promise<number>
}
type AutoCompleteOption = { label: string; value: string }
const NEW_OPTION_SUFFIX = ' (new option)'

const AutoCompleteCellEditor = forwardRef(
  (
    { colDef: { refData }, initialValue, stopEditing, onValueChange, addRefData }: AutoCompleteCellEditorProps,
    ref: ForwardedRef<BaseSelectRef>
  ) => {
    const refDataOptions: AutoCompleteOption[] = Object.keys(refData || {}).map((value) => ({ value, label: refData![value] }))
    const [options, setOptions] = useState<AutoCompleteOption[]>(refDataOptions)
    const [value, setValue] = useState<string>(refDataOptions.find(({ value }) => String(initialValue) === value)?.label || '')
    const filterOption = (inputValue: string, option: AutoCompleteOption | undefined) =>
      option!.label.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
    const onChange = (inputValue: string) => {
      const found = refDataOptions.find(({ value }) => String(inputValue) === value)?.label
      const newValue = found || inputValue
      setOptions([
        ...refDataOptions,
        ...(addRefData && !found && inputValue
          ? [
              {
                value: '-1',
                label: `${inputValue}${NEW_OPTION_SUFFIX}`,
              },
            ]
          : []),
      ])
      setValue(newValue)
    }
    const onSelect = (selectedValue: string, option: AutoCompleteOption) => {
      if (addRefData && selectedValue === '-1') {
        const cleanLabel = option.label.substring(0, option.label.lastIndexOf(NEW_OPTION_SUFFIX))
        addRefData(cleanLabel)
          .then((newValue) => onValueChange(newValue))
          .then(() => stopEditing())
      } else {
        onValueChange(Number(selectedValue))
        stopEditing()
      }
    }
    return (
      <AutoComplete
        autoFocus={true}
        ref={ref}
        onChange={onChange}
        value={value}
        options={options}
        onSelect={onSelect}
        filterOption={filterOption}
        style={{ width: '100%', height: '100%' }}
      ></AutoComplete>
    )
  }
)
AutoCompleteCellEditor.displayName = 'AutoCompleteCellEditor'

export default AutoCompleteCellEditor
