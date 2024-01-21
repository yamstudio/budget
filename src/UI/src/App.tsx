import React, { useEffect, useState } from 'react';
import './App.scss';
import { Api, Expense } from './gensrc/Api';

const App = () => {
    const [expenses, setExpenses] = useState<Expense[]>([])
    useEffect(() => {
        new Api().api.getExpenses()
            .then(({ data }) => setExpenses(data));
      }, [])
    return (
        <>
            <div>App</div>
            <div>{expenses?.length.toString()}</div>
        </>
    )
}

export default App;
