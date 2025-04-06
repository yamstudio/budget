import React, { forwardRef, ForwardedRef, useState } from 'react'
import { CustomCellEditorProps } from 'ag-grid-react'
import { AutoComplete } from 'antd'
import type { BaseSelectRef } from 'rc-select'

type AutoCompleteCellEditorProps = CustomCellEditorProps<unknown, number, unknown> & {
  addRefData?: (label: string) => Promise<number>
}
type AutoCompleteOption = { label: string; value: string }
const OPTION_VALUE_PREFIX = '__opt__'
const NEW_OPTION_VALUE = OPTION_VALUE_PREFIX + '-1'
const NEW_OPTION_LABEL_SUFFIX = ' (new option)'

const AutoCompleteCellEditor = forwardRef(
  (
    { colDef: { refData }, initialValue, stopEditing, onValueChange, addRefData }: AutoCompleteCellEditorProps,
    ref: ForwardedRef<BaseSelectRef>
  ) => {
    const refDataOptions: AutoCompleteOption[] = Object.keys(refData || {}).map((value) => ({
      value: OPTION_VALUE_PREFIX + value,
      label: refData![value],
    }))
    const [options, setOptions] = useState<AutoCompleteOption[]>(refDataOptions)
    const [value, setValue] = useState<string>(
      (initialValue && refDataOptions.find(({ value }) => OPTION_VALUE_PREFIX + initialValue === value)?.label) || ''
    )
    const filterOption = (inputValue: string, option: AutoCompleteOption | undefined) =>
      option!.label.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
    const onChange = (inputValue: string, option?: AutoCompleteOption[] | AutoCompleteOption) => {
      // confusingly, inputValue can be a value (on select) or a label (when typing)
      const newValue = (typeof option === 'object' && !Array.isArray(option) && option.label) || inputValue
      const addNewOption = newValue && addRefData && !refDataOptions.some(({ label }) => newValue === label)
      setOptions([
        ...refDataOptions,
        ...(addNewOption
          ? [
              {
                value: NEW_OPTION_VALUE,
                label: `${newValue}${NEW_OPTION_LABEL_SUFFIX}`,
              },
            ]
          : []),
      ])
      setValue(newValue)
    }
    const onSelect = (selectedValue: string, option: AutoCompleteOption) => {
      if (addRefData && selectedValue === NEW_OPTION_VALUE) {
        const cleanLabel = option.label.substring(0, option.label.lastIndexOf(NEW_OPTION_LABEL_SUFFIX))
        addRefData(cleanLabel).then((newValue) => {
          onValueChange(newValue)
          stopEditing()
        })
      } else {
        onValueChange(Number(selectedValue.replace(OPTION_VALUE_PREFIX, '')))
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
