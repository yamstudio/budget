import React from 'react';
import { Button } from 'antd';
import { CustomCellRendererProps } from 'ag-grid-react';

type ButtonCellRendererProps<TData> = CustomCellRendererProps<TData> & {
    text: string;
    isDisabledGetter: (data: TData | undefined) => boolean;
    clickedHandler: (props: CustomCellRendererProps<TData>) => any;
};

const ButtonCellRenderer = <TData,>(props: ButtonCellRendererProps<TData>) => {
    const { text, isDisabledGetter, clickedHandler, data } = props;
    const isDisabled = isDisabledGetter(data);
    return (
        <Button type="primary" disabled={isDisabled} onClick={() => clickedHandler(props)}>
            {text}
        </Button>
    );
};

export default ButtonCellRenderer;