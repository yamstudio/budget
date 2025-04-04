import React, { useEffect, useMemo, useState } from 'react'
import { Api, Expense, ExpenseCategory } from './gensrc/Api'
import { format, eachMonthOfInterval } from 'date-fns'
import { ChartDataset, Chart as ChartJS, CategoryScale, Colors, Legend, LinearScale, BarElement, ChartData, Tooltip } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { Spin } from 'antd'

ChartJS.register(CategoryScale, Colors, Legend, LinearScale, BarElement, Tooltip)

type DashboardProps = {
  expenseCategories: ExpenseCategory[] | undefined
  fromDate: Date
  toDate: Date
}

const Dashboard = ({ fromDate, toDate, expenseCategories }: DashboardProps) => {
  if (!expenseCategories) {
    return (
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
        <Spin size="large" />
      </div>
    )
  }
  const [expenses, setExpenses] = useState<Expense[]>([])
  useEffect(() => {
    if (!expenseCategories.length) {
      return
    }
    new Api().api
      .getExpenses({
        fromDate: format(fromDate, 'yyyy-MM-dd'),
        toDate: format(toDate, 'yyyy-MM-dd'),
      })
      .then(({ data }) => setExpenses(data))
  }, [fromDate, toDate, expenseCategories])

  const monthlyAmountAggregatedByCategory: ChartData<'bar', number[], string> = useMemo(() => {
    const labels = eachMonthOfInterval({ start: fromDate, end: toDate }).map((month) => format(month, 'yyyy-MM'))
    const categoryIDToMonthToSum: Record<number, Record<string, number>> = {}
    for (const { expenseCategoryID, date, amount } of expenses) {
      const month = date!.substring(0, 7)
      categoryIDToMonthToSum[expenseCategoryID!] = categoryIDToMonthToSum[expenseCategoryID!] || {}
      categoryIDToMonthToSum[expenseCategoryID!][month] = (categoryIDToMonthToSum[expenseCategoryID!][month] || 0) + amount!
    }
    const datasets: ChartDataset<'bar', number[]>[] = Object.entries(categoryIDToMonthToSum).map(([expenseCategoryID, monthToSum]) => ({
      expenseCategoryID,
      label: expenseCategories.find((category) => category.expenseCategoryID === +expenseCategoryID)!.displayName!,
      data: labels.map((month) => monthToSum[month] || 0),
    }))
    return {
      labels,
      datasets,
    }
  }, [expenses, fromDate, toDate, expenseCategories])

  return (
    <>
      <Bar
        datasetIdKey="expenseCategoryID"
        data={monthlyAmountAggregatedByCategory}
        options={{
          responsive: true,
          hover: {
            mode: 'nearest',
            intersect: true,
          },
          plugins: {
            tooltip: {
              enabled: true,
              mode: 'nearest',
            },
            legend: { position: 'right' },
          },
          scales: {
            x: {
              stacked: true,
              title: {
                text: 'Month',
              },
            },
            y: {
              stacked: true,
              title: {
                text: 'Amount',
              },
            },
          },
        }}
      />
    </>
  )
}

export default Dashboard
