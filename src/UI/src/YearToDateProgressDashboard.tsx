import React, { useMemo } from 'react'
import { Spin } from 'antd'
import { ChartDataset, Chart as ChartJS, CategoryScale, Legend, LinearScale, LineElement, ChartData, Tooltip, PointElement } from 'chart.js'
import { format, eachMonthOfInterval, startOfYear } from 'date-fns'
import { Line } from 'react-chartjs-2'
import Colors from './Colors'
import { useExpenseCategories, useExpenseSummary } from './Queries'

ChartJS.register(CategoryScale, Colors, Legend, LinearScale, LineElement, PointElement, Tooltip)

type YearToDateProgressDashboardProps = {
  toDate: Date
}

const YearToDateProgressDashboard = ({ toDate }: YearToDateProgressDashboardProps) => {
  const expenseCategories = useExpenseCategories().data
  const fromDate = startOfYear(toDate)
  const expenseSummary = useExpenseSummary(fromDate, toDate).data

  const monthlyAmountAggregatedByCategory: ChartData<'line', number[], string> = useMemo(() => {
    if (!expenseCategories || !expenseSummary) {
      return { labels: [], datasets: [] }
    }
    const categoryIDToMonthToSum: Record<number, Record<string, number>> = {}
    for (const { expenseCategoryID, fromDate, amount } of expenseSummary.periods!) {
      const month = fromDate!.substring(0, 7)
      categoryIDToMonthToSum[expenseCategoryID!] = categoryIDToMonthToSum[expenseCategoryID!] || {}
      categoryIDToMonthToSum[expenseCategoryID!][month] = amount
    }
    const labels = eachMonthOfInterval({ start: fromDate, end: toDate }).map((month) => format(month, 'yyyy-MM'))
    const datasets: ChartDataset<'line', number[]>[] = []
    for (const [expenseCategoryID, monthToSum] of Object.entries(categoryIDToMonthToSum)) {
      const label = expenseCategories.find((category) => category.expenseCategoryID === +expenseCategoryID)!.displayName!
      const data: number[] = []
      for (const month of labels) {
        // cumulative sum
        if (data.length === 0) {
          data.push(monthToSum[month] || 0)
        } else {
          data.push(data[data.length - 1] + (monthToSum[month] || 0))
        }
      }
      datasets.push({ label, data })
    }
    return {
      labels,
      datasets: datasets.toSorted((a, b) => a.label!.localeCompare(b.label!)),
    }
  }, [expenseSummary, fromDate, toDate, expenseCategories])

  if (!expenseSummary || !expenseCategories) {
    return (
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <>
      <Line
        datasetIdKey="label"
        data={monthlyAmountAggregatedByCategory}
        options={{
          maintainAspectRatio: false,
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
              title: {
                text: 'Month',
              },
            },
            y: {
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

export default YearToDateProgressDashboard
