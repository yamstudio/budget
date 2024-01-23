import React, { useState, useEffect, useMemo } from 'react';
import { ColDef, GetRowIdFunc } from 'ag-grid-community';
import { Api, Income, IncomeCategory, IncomeSource } from './gensrc/Api';
import { AgGridReact, CustomCellRendererProps } from 'ag-grid-react';
import ButtonCellRenderer from './ButtonCellRenderer';
import { Button } from 'antd';
import { format } from 'date-fns';

type IncomesProps = {
    incomeCategories: IncomeCategory[];
    incomeSources: IncomeSource[];
    fromDate: Date;
    toDate: Date;
}

type IncomeRow = Omit<Income, 'incomeCategory' | 'incomeSource'> & ({
    original: Income | undefined;
})

const Incomes = ({ fromDate, toDate, incomeCategories, incomeSources }: IncomesProps) => {
    const incomeCategoryIDs = useMemo(() => incomeCategories.map(({ incomeCategoryID }) => incomeCategoryID), [incomeCategories]);
    const incomeCategoryIDToDisplayName: { [key: string]: string } = useMemo(() => incomeCategories.reduce((accumulator, { incomeCategoryID, displayName }) => ({
        ...accumulator,
        [incomeCategoryID!]: displayName
    }), {} as { [key: string]: string }), [incomeCategories]);

    const incomeSourceIDs = useMemo(() => incomeSources.map(({ incomeSourceID }) => incomeSourceID), [incomeSources]);
    const incomeSourceIDToDisplayName: { [key: string]: string } = useMemo(() => incomeSources.reduce((accumulator, { incomeSourceID, displayName }) => ({
        ...accumulator,
        [incomeSourceID!]: displayName
    }), {} as { [key: string]: string }), [incomeSources]);

    const [incomeRows, setIncomeRows] = useState<IncomeRow[]>([]);
    const [nextIncomeID, setNextIncomeID] = useState<number>(-1);
    useEffect(() => {
        new Api()
            .api
            .getIncomes({
                fromDate: format(fromDate, 'yyyy-MM-dd'),
                toDate: format(toDate, 'yyyy-MM-dd'),
            })
            .then(({ data }) => 
                setIncomeRows(
                    data.map(income => ({
                        ...income,
                        original: income,
                    }))));
    }, [fromDate, toDate]);

    const colDefs: ColDef<IncomeRow>[] = useMemo(() => [
        {
            colId: 'save',
            headerName: '',
            cellRenderer: ButtonCellRenderer,
            cellRendererParams: {
                text: 'Save',
                isDisabledGetter: ({ original, date, amount, note, incomeCategoryID, incomeSourceID }: IncomeRow) => {
                    if (!(date && amount && incomeCategoryID && incomeSourceID)) {
                        return true;
                    }
                    return original && (
                        date === original.date
                        && amount === original.amount
                        && note === original.note
                        && incomeCategoryID === original.incomeCategoryID
                        && incomeSourceID === original.incomeSourceID);
                },
                clickedHandler: ({ data, api }: CustomCellRendererProps<IncomeRow>) => {
                    const { original, date, amount, note, incomeCategoryID, incomeSourceID, incomeID } = data!;
                    const payload: Income = {
                        incomeID: 0,
                        incomeCategoryID,
                        incomeSourceID,
                        date,
                        amount,
                        note
                    };
                    (
                        original
                            ? new Api().api.updateIncome(incomeID!, payload)
                            : new Api().api.createIncome(payload)
                    )
                    .then((response) => {
                        const newData: IncomeRow = {
                            ...response.data,
                            original: response.data
                        };
                        api.applyTransaction({
                            remove: [data!],
                            add: [newData]
                        })
                        setIncomeRows(rows => [
                            ...rows.filter((row) => row.incomeID !== incomeID),
                            newData,
                        ]);
                    });
                },
            },
            minWidth: 95,
            maxWidth: 95,
        },
        {
            colId: 'delete',
            headerName: '',
            cellRenderer: ButtonCellRenderer,
            cellRendererParams: {
                text: 'Delete',
                isDisabledGetter: () => false,
                clickedHandler: ({ data, api }: CustomCellRendererProps<IncomeRow>) => {
                    (
                        data!.original
                            ? new Api().api.deleteIncome(data!.incomeID!)
                            : Promise.resolve(void 0)
                    ).then(() => {
                        api.applyTransaction({
                            remove: [data!]
                        });
                        setIncomeRows(rows => rows.filter(({ incomeID }) => incomeID !== data!.incomeID));
                    })
                },
            },
            minWidth: 105,
            maxWidth: 105,
        },
        { field: 'date', width: 120, editable: true, },
        {
            field: 'incomeCategoryID',
            headerName: 'Income Category',
            refData: incomeCategoryIDToDisplayName,
            width: 200,
            editable: true,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: {
                values: incomeCategoryIDs
            },
        },
        {
            field: 'incomeSourceID',
            headerName: 'Income Source',
            refData: incomeSourceIDToDisplayName,
            width: 200,
            editable: true,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: {
                values: incomeSourceIDs
            },
        },
        { 
            field: 'amount',
            width: 120,
            editable: true,
            cellEditor: 'agNumberCellEditor',
            cellEditorParams: {
                precision: 2,
            },
        },
        { field: 'note', editable: true, },
    ], [incomeCategoryIDs, incomeCategoryIDToDisplayName, incomeSourceIDs, incomeSourceIDToDisplayName,]);
    const getRowId: GetRowIdFunc<IncomeRow> = ({ data }) => `${data.incomeID}`;

    const addIncomeHandler = () => {
        setIncomeRows(rows => [
            ...rows,
            {
                incomeID: nextIncomeID,
                incomeCategoryID: undefined,
                incomeSourceID: undefined,
                date: undefined,
                amount: undefined,
                note: undefined,
                original: undefined
            }
        ]);
        setNextIncomeID(nextIncomeID - 1);
    };

    return (
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
            <Button disabled={!incomeRows.length} onClick={addIncomeHandler}>New Income</Button>
            <div className="ag-theme-quartz" style={{ flex: 1 }}>
                <AgGridReact
                    rowData={incomeRows}
                    columnDefs={colDefs}
                    getRowId={getRowId}
                ></AgGridReact>
            </div>
        </div>
    );
};

export default Incomes;
