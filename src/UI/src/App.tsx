import React, { useMemo } from 'react'
import { QueryClient, QueryClientContext } from '@tanstack/react-query'
import type { MenuProps } from 'antd'
import { Flex, Layout, Menu } from 'antd'
import { addDays, addMonths, startOfMonth } from 'date-fns'
import { Navigate, Link, Route, Routes, useLocation, Outlet } from 'react-router-dom'
import Expenses from './Expenses'
import Incomes from './Incomes'
import MonthlyComparisonDashboard from './MonthlyComparisonDashboard'
import YearToDateProgressDashboard from './YearToDateProgressDashboard'

const { Header, Content } = Layout
const queryClient = new QueryClient({})
const today = new Date()
const toDate = addDays(today, 1)
const fromDate = startOfMonth(addMonths(today, -3))

const AppContext = () => {
  return (
    <QueryClientContext.Provider value={queryClient}>
      <Outlet />
    </QueryClientContext.Provider>
  )
}

const AppHeader = () => {
  const navItems: MenuProps['items'] = [
    {
      key: '/expenses',
      label: <Link to="/expenses">Expenses</Link>,
    },
    {
      key: '/incomes',
      label: <Link to="/incomes">Incomes</Link>,
    },
    {
      key: '/dashboards',
      label: 'Dashboards',
      children: [
        {
          key: '/dashboards/monthly-comparison',
          label: <Link to="/dashboards/monthly-comparison">Monthly Comparison</Link>,
        },
        {
          key: '/dashboards/year-to-date-progress',
          label: <Link to="/dashboards/year-to-date-progress">Year-to-Date Progress</Link>,
        },
      ],
    },
  ]
  const { pathname } = useLocation()
  const selectedKeys = useMemo(() => {
    if (pathname === '/expenses' || pathname === '/incomes') {
      return [pathname]
    }
    if (pathname.startsWith('/dashboards')) {
      return ['/dashboards', pathname]
    }
    return []
  }, [pathname])
  return (
    <Header>
      <Menu theme="dark" mode="horizontal" selectedKeys={selectedKeys} items={navItems} style={{ flex: 1, minWidth: 0 }} />
    </Header>
  )
}

const App = () => (
  <Flex>
    <Layout style={{ height: '100vh', display: 'flex' }}>
      <AppHeader />
      <Content style={{ flex: 1, display: 'flex' }}>
        <Routes>
          <Route path="/" element={<AppContext />}>
            <Route path="expenses" element={<Expenses fromDate={fromDate} toDate={toDate} />} />
            <Route path="incomes" element={<Incomes fromDate={fromDate} toDate={toDate} />} />
            <Route path="dashboards">
              <Route path="monthly-comparison" element={<MonthlyComparisonDashboard fromDate={fromDate} toDate={toDate} />} />
              <Route path="year-to-date-progress" element={<YearToDateProgressDashboard toDate={toDate} />} />
            </Route>
            <Route path="/" element={<Navigate to="expenses" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        </Routes>
      </Content>
    </Layout>
  </Flex>
)

export default App
