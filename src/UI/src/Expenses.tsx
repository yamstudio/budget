import React, { useState, useEffect, useMemo } from 'react';
import { ColDef, GetRowIdFunc } from 'ag-grid-community';
import { Api, Expense, ExpenseCategory, PaymentMethod, Vendor } from './gensrc/Api';
import { AgGridReact, CustomCellRendererProps } from 'ag-grid-react';
import AutoCompleteCellEditor from './AutoCompleteCellEditor';
import ButtonCellRenderer from './ButtonCellRenderer';
import { Button } from 'antd';
import { format } from 'date-fns';

type ExpensesProps = {
    expenseCategories: ExpenseCategory[];
    vendors: Vendor[];
    paymentMethods: PaymentMethod[];
    fromDate: Date;
    toDate: Date;
}

type ExpenseRow = Omit<Expense, 'expenseCategory' | 'vendor' | 'paymentMethod'> & ({
    original: Expense | undefined;
})

const Expenses = ({ fromDate, toDate, expenseCategories, vendors, paymentMethods }: ExpensesProps) => {
    const expenseCategoryIDToDisplayName: { [key: string]: string } = useMemo(() => expenseCategories.reduce((accumulator, { expenseCategoryID, displayName }) => ({
        ...accumulator,
        [expenseCategoryID!]: displayName
    }), {} as { [key: string]: string }), [expenseCategories]);

    const paymentMethodIDToDisplayName: { [key: string]: string } = useMemo(() => paymentMethods.reduce((accumulator, { paymentMethodID, displayName }) => ({
        ...accumulator,
        [paymentMethodID!]: displayName
    }), {} as { [key: string]: string }), [paymentMethods]);

    const vendorIDToDisplayName: { [key: string]: string } = useMemo(() => vendors.reduce((accumulator, { vendorID, displayName }) => ({
        ...accumulator,
        [vendorID!]: displayName
    }), {} as { [key: string]: string }), [vendors]);

    const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);
    const [nextExpenseID, setNextExpenseID] = useState<number>(-1);
    useEffect(() => {
        new Api()
            .api
            .getExpenses({
                fromDate: format(fromDate, 'yyyy-MM-dd'),
                toDate: format(toDate, 'yyyy-MM-dd'),
            })
            .then(({ data }) => 
                setExpenseRows(
                    data.map(expense => ({
                        ...expense,
                        original: expense,
                    }))));
    }, [fromDate, toDate]);

    const colDefs: ColDef<ExpenseRow>[] = useMemo(() => [
        {
            colId: 'save',
            headerName: '',
            cellRenderer: ButtonCellRenderer,
            cellRendererParams: {
                text: 'Save',
                isDisabledGetter: ({ original, date, amount, note, expenseCategoryID, vendorID, paymentMethodID }: ExpenseRow) => {
                    if (!(date && amount && expenseCategoryID && vendorID && paymentMethodID)) {
                        return true;
                    }
                    return original && (
                        date === original.date
                        && amount === original.amount
                        && note === original.note
                        && expenseCategoryID === original.expenseCategoryID
                        && vendorID === original.vendorID
                        && paymentMethodID === original.paymentMethodID);
                },
                clickedHandler: ({ data, api }: CustomCellRendererProps<ExpenseRow>) => {
                    const { original, date, amount, note, expenseCategoryID, vendorID, paymentMethodID, expenseID } = data!;
                    const payload: Expense = {
                        expenseID: 0,
                        expenseCategoryID,
                        paymentMethodID,
                        vendorID,
                        date,
                        amount,
                        note
                    };
                    (
                        original
                            ? new Api().api.updateExpense(expenseID!, payload)
                            : new Api().api.createExpense(payload)
                    )
                    .then((response) => {
                        const newData: ExpenseRow = {
                            ...response.data,
                            original: response.data
                        };
                        api.applyTransaction({
                            remove: [data!],
                            add: [newData]
                        })
                        setExpenseRows(rows => [
                            ...rows.filter((row) => row.expenseID !== expenseID),
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
                clickedHandler: ({ data, api }: CustomCellRendererProps<ExpenseRow>) => {
                    (
                        data!.original
                            ? new Api().api.deleteExpense(data!.expenseID!)
                            : Promise.resolve(void 0)
                    ).then(() => {
                        api.applyTransaction({
                            remove: [data!]
                        });
                        setExpenseRows(rows => rows.filter(({ expenseID }) => expenseID !== data!.expenseID));
                    })
                },
            },
            minWidth: 105,
            maxWidth: 105,
        },
        { field: 'date', width: 120, editable: true, },
        {
            field: 'expenseCategoryID',
            headerName: 'Expense Category',
            refData: expenseCategoryIDToDisplayName,
            width: 200,
            editable: true,
            cellEditor: AutoCompleteCellEditor,
        },
        {
            field: 'vendorID',
            headerName: 'Vendor',
            refData: vendorIDToDisplayName,
            width: 200,
            editable: true,
            cellEditor: AutoCompleteCellEditor,
        },
        {
            field: 'paymentMethodID',
            headerName: 'Payment Method',
            refData: paymentMethodIDToDisplayName,
            width: 200,
            editable: true,
            cellEditor: AutoCompleteCellEditor,
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
    ], [expenseCategoryIDToDisplayName, paymentMethodIDToDisplayName, vendorIDToDisplayName]);
    const getRowId: GetRowIdFunc<ExpenseRow> = ({ data }) => `${data.expenseID}`;

    const addExpenseHandler = () => {
        setExpenseRows(rows => [
            ...rows,
            {
                expenseID: nextExpenseID,
                expenseCategoryID: undefined,
                vendorID: undefined,
                paymentMethodID: undefined,
                date: undefined,
                amount: undefined,
                note: undefined,
                original: undefined
            }
        ]);
        setNextExpenseID(nextExpenseID - 1);
    };

    return (
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
            <Button disabled={!expenseRows.length} onClick={addExpenseHandler}>New Expense</Button>
            <div className="ag-theme-quartz" style={{ flex: 1 }}>
                <AgGridReact
                    rowData={expenseRows}
                    columnDefs={colDefs}
                    getRowId={getRowId}
                    reactiveCustomComponents={true}
                ></AgGridReact>
            </div>
        </div>
    );
};

export default Expenses;
