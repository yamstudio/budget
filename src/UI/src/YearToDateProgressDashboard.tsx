import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Spin } from 'antd'
import { ChartDataset, Chart as ChartJS, CategoryScale, Legend, LinearScale, LineElement, ChartData, Tooltip, PointElement } from 'chart.js'
import { format, eachMonthOfInterval, startOfYear } from 'date-fns'
import { Line } from 'react-chartjs-2'
import Colors from './Colors'
import { ApiContext, ExpenseCategoriesContext } from './Context'
import { ExpenseSummaryPeriod } from './gensrc/Api'

ChartJS.register(CategoryScale, Colors, Legend, LinearScale, LineElement, PointElement, Tooltip)

type YearToDateProgressDashboardProps = {
  toDate: Date
}

const YearToDateProgressDashboard = ({ toDate }: YearToDateProgressDashboardProps) => {
  const api = useContext(ApiContext)
  const { expenseCategories } = useContext(ExpenseCategoriesContext)
  const [expenseSummaryPeriods, setExpenseSummaryPeriods] = useState<ExpenseSummaryPeriod[] | undefined>(undefined)
  const fromDate = startOfYear(toDate)
  useEffect(() => {
    api
      ?.getExpenseSummary({
        fromDate: format(fromDate, 'yyyy-MM-dd'),
        toDate: format(toDate, 'yyyy-MM-dd'),
        aggregateExpenseCategoryID: false,
      })
      .then(({ data }) => setExpenseSummaryPeriods(data.periods || []))
  }, [toDate, api])

  const monthlyAmountAggregatedByCategory: ChartData<'line', number[], string> = useMemo(() => {
    if (!expenseCategories || !expenseSummaryPeriods) {
      return { labels: [], datasets: [] }
    }
    const categoryIDToMonthToSum: Record<number, Record<string, number>> = {}
    for (const { expenseCategoryID, fromDate, amount } of expenseSummaryPeriods) {
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
      <Line
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
