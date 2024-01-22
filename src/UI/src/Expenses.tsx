import React, { useState, useEffect, useMemo } from 'react';
import { ColDef, GetRowIdFunc } from 'ag-grid-community';
import { Api, Expense, ExpenseCategory, PaymentMethod, Vendor } from './gensrc/Api';
import { AgGridReact, CustomCellRendererProps } from 'ag-grid-react';
import ButtonCellRenderer from './ButtonCellRenderer';
import { Button } from 'antd';

type ExpenseRow = Omit<Expense, 'expenseCategory' | 'vendor' | 'paymentMethod'> & ({
    original: Expense | undefined;
})

const Expenses = () => {
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
    const expenseCategoryIDs = useMemo(() => expenseCategories.map(({ expenseCategoryID }) => expenseCategoryID), [expenseCategories]);
    const expenseCategoryIDToDisplayName: { [key: string]: string } = useMemo(() => expenseCategories.reduce((accumulator, { expenseCategoryID, displayName }) => ({
        ...accumulator,
        [expenseCategoryID!]: displayName
    }), {} as { [key: string]: string }), [expenseCategories]);
    useEffect(() => {
        new Api().api.getExpenseCategories().then(({ data }) => setExpenseCategories(data))
    }, []);

    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const paymentMethodIDs = useMemo(() => paymentMethods.map(({ paymentMethodID }) => paymentMethodID), [paymentMethods]);
    const paymentMethodIDToDisplayName: { [key: string]: string } = useMemo(() => paymentMethods.reduce((accumulator, { paymentMethodID, displayName }) => ({
        ...accumulator,
        [paymentMethodID!]: displayName
    }), {} as { [key: string]: string }), [paymentMethods]);
    useEffect(() => {
        new Api().api.getPaymentMethods().then(({ data }) => setPaymentMethods(data))
    }, []);

    const [vendors, setVendors] = useState<Vendor[]>([]);
    const vendorIDs = useMemo(() => vendors.map(({ vendorID }) => vendorID), [vendors]);
    const vendorIDToDisplayName: { [key: string]: string } = useMemo(() => vendors.reduce((accumulator, { vendorID, displayName }) => ({
        ...accumulator,
        [vendorID!]: displayName
    }), {} as { [key: string]: string }), [vendors]);
    useEffect(() => {
        new Api().api.getVendors().then(({ data }) => setVendors(data))
    }, []);

    const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);
    const [nextExpenseID, setNextExpenseID] = useState<number>(-1);
    useEffect(() => {
        new Api().api.getExpenses().then(({ data }) => setExpenseRows(
            data.map(expense => ({
                ...expense,
                original: expense,
            }))))
    }, []);

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
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: {
                values: expenseCategoryIDs
            },
        },
        {
            field: 'vendorID',
            headerName: 'Vendor',
            refData: vendorIDToDisplayName,
            width: 200,
            editable: true,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: {
                values: vendorIDs
            },
        },
        {
            field: 'paymentMethodID',
            headerName: 'Payment Method',
            refData: paymentMethodIDToDisplayName,
            width: 200,
            editable: true,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: {
                values: paymentMethodIDs
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
    ], [expenseCategoryIDs, expenseCategoryIDToDisplayName, paymentMethodIDs, paymentMethodIDToDisplayName, vendorIDs, vendorIDToDisplayName]);
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
                ></AgGridReact>
            </div>
        </div>
    );
};

export default Expenses;
