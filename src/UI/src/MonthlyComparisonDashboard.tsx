import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Spin } from 'antd'
import { ChartDataset, Chart as ChartJS, CategoryScale, Legend, LinearScale, BarElement, ChartData, Tooltip } from 'chart.js'
import { format, eachMonthOfInterval } from 'date-fns'
import { Bar } from 'react-chartjs-2'
import Colors from './Colors'
import { ApiContext, ExpenseCategoriesContext } from './Context'
import { ExpenseSummaryPeriod } from './gensrc/Api'

ChartJS.register(CategoryScale, Colors, Legend, LinearScale, BarElement, Tooltip)

type MonthlyComparisonDashboardProps = {
  fromDate: Date
  toDate: Date
}

const MonthlyComparisonDashboard = ({ fromDate, toDate }: MonthlyComparisonDashboardProps) => {
  const api = useContext(ApiContext)
  const { expenseCategories } = useContext(ExpenseCategoriesContext)
  const [expenseSummaryPeriods, setExpenseSummaryPeriods] = useState<ExpenseSummaryPeriod[] | undefined>(undefined)
  useEffect(() => {
    api
      ?.getExpenseSummary({
        fromDate: format(fromDate, 'yyyy-MM-dd'),
        toDate: format(toDate, 'yyyy-MM-dd'),
        aggregateExpenseCategoryID: false,
      })
      .then(({ data }) => setExpenseSummaryPeriods(data.periods || []))
  }, [fromDate, toDate, api])

  const monthlyAmountAggregatedByCategory: ChartData<'bar', number[], string> = useMemo(() => {
    if (!expenseCategories || !expenseSummaryPeriods) {
      return { labels: [], datasets: [] }
    }
    const labels = eachMonthOfInterval({ start: fromDate, end: toDate }).map((month) => format(month, 'yyyy-MM'))
    const categoryIDToMonthToSum: Record<number, Record<string, number>> = {}
    for (const { expenseCategoryID, fromDate, amount } of expenseSummaryPeriods) {
      const month = fromDate!.substring(0, 7)
      categoryIDToMonthToSum[expenseCategoryID!] = categoryIDToMonthToSum[expenseCategoryID!] || {}
      categoryIDToMonthToSum[expenseCategoryID!][month] = amount
    }
    const datasets: ChartDataset<'bar', number[]>[] = Object.entries(categoryIDToMonthToSum)
      .map(([expenseCategoryID, monthToSum]) => ({
        label: expenseCategories.find((category) => category.expenseCategoryID === +expenseCategoryID)!.displayName!,
        data: labels.map((month) => monthToSum[month] || 0),
      }))
      .toSorted((a, b) => a.label!.localeCompare(b.label!))
    return {
      labels,
      datasets,
    }
  }, [expenseSummaryPeriods, fromDate, toDate, expenseCategories])

  if (!expenseSummaryPeriods || !expenseCategories) {
    return (
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <>
      <Bar
        datasetIdKey="label"
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
            legend: { position: 'bottom' },
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

export default MonthlyComparisonDashboard
