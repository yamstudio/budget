import React, { forwardRef, ForwardedRef, useState } from 'react';
import { CustomCellEditorProps } from 'ag-grid-react';
import { AutoComplete } from 'antd';
import type { BaseSelectRef } from 'rc-select';

type AutoCompleteCellEditorProps = CustomCellEditorProps<unknown, number, unknown>;
type AutoCompleteOption = { label: string, value: string, }

const AutoCompleteCellEditor = forwardRef(({ colDef: { refData }, initialValue, stopEditing, onValueChange, }: AutoCompleteCellEditorProps, ref: ForwardedRef<BaseSelectRef>) => {
    const options: AutoCompleteOption[] = Object.keys(refData || {}).map(value => ({ value, label: refData![value] }));
    const [ value, setValue] = useState<string>(options.find(({ value }) => String(initialValue) === value)?.label || '');
    const filterOption = (inputValue: string, option: AutoCompleteOption | undefined) => option!.label.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1;
    const onSelect = (selectedValue: string) => {
        onValueChange(Number(selectedValue));
        stopEditing();
    };
    return <AutoComplete
        autoFocus={true}
        ref={ref}
        onChange={setValue}
        value={value}
        options={options}
        onSelect={onSelect}
        filterOption={filterOption}
        style={{ width: '100%', height: '100%'}}></AutoComplete>
});

export default AutoCompleteCellEditor;
