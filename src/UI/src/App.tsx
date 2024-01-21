import React, { useEffect, useState } from 'react';
import './App.scss';

const App = () => {
    const [expenses, setExpenses] = useState<any[]>()
    useEffect(() => {
        fetch('/api/expenses')
          .then(resp => {
            console.log(resp);
            console.log('======success=======');
            return resp.json();
          })
          .then(setExpenses)
          .catch(err => {
            console.log('======failure=======');
            console.log(err);
          });
      }, [])
    return (
        <>
            <div>App</div>
            <div>{expenses?.length.toString()}</div>
        </>
    )
}

export default App;
