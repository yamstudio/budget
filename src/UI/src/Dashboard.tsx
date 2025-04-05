import React, { useContext, useEffect, useMemo, useState } from 'react'
import { ExpenseSummaryPeriod } from './gensrc/Api'
import { format, eachMonthOfInterval } from 'date-fns'
import { ChartDataset, Chart as ChartJS, CategoryScale, Colors, Legend, LinearScale, BarElement, ChartData, Tooltip } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { Spin } from 'antd'
import { ApiContext, ExpenseCategoriesContext } from './Context'

ChartJS.register(CategoryScale, Colors, Legend, LinearScale, BarElement, Tooltip)

type DashboardProps = {
  fromDate: Date
  toDate: Date
}

const Dashboard = ({ fromDate, toDate }: DashboardProps) => {
  const api = useContext(ApiContext)
  const { expenseCategories } = useContext(ExpenseCategoriesContext)
  if (!api || !expenseCategories) {
    return (
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
        <Spin size="large" />
      </div>
    )
  }
  const [expenseSummaryPeriods, setExpenseSummaryPeriods] = useState<ExpenseSummaryPeriod[]>([])
  useEffect(() => {
    if (!expenseCategories.length) {
      return
    }
    api
      .getExpenseSummary({
        fromDate: format(fromDate, 'yyyy-MM-dd'),
        toDate: format(toDate, 'yyyy-MM-dd'),
        aggregateExpenseCategoryID: false,
      })
      .then(({ data }) => setExpenseSummaryPeriods(data.periods || []))
  }, [fromDate, toDate, expenseCategories])

  const monthlyAmountAggregatedByCategory: ChartData<'bar', number[], string> = useMemo(() => {
    const labels = eachMonthOfInterval({ start: fromDate, end: toDate }).map((month) => format(month, 'yyyy-MM'))
    const categoryIDToMonthToSum: Record<number, Record<string, number>> = {}
    for (const { expenseCategoryID, fromDate, amount } of expenseSummaryPeriods) {
      const month = fromDate!.substring(0, 7)
      categoryIDToMonthToSum[expenseCategoryID!] = categoryIDToMonthToSum[expenseCategoryID!] || {}
      categoryIDToMonthToSum[expenseCategoryID!][month] = amount
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
  }, [expenseSummaryPeriods, fromDate, toDate, expenseCategories])

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
