import React, { useEffect, useMemo } from 'react'
import { QueryClient, QueryClientContext } from '@tanstack/react-query'
import {
  ModuleRegistry,
  ClientSideRowModelModule,
  NumberEditorModule,
  TextEditorModule,
  ValidationModule,
  DateEditorModule,
  PinnedRowModule,
  CustomEditorModule,
} from 'ag-grid-community'
import type { MenuProps } from 'antd'
import { Flex, Layout, Menu } from 'antd'
import { addDays, addMonths, startOfMonth } from 'date-fns'
import { Navigate, Link, Route, Routes, useLocation, Outlet } from 'react-router'
import Expenses from './Expenses'
import Incomes from './Incomes'
import Insights from './insights/Insights'
import { today } from './Queries'

const { Header, Content } = Layout
const queryClient = new QueryClient({})
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
      key: '/insights',
      label: <Link to="/insights">Insights</Link>,
    },
  ]
  const { pathname } = useLocation()
  const selectedKeys = useMemo(() => {
    if (pathname === '/expenses' || pathname === '/incomes' || pathname === '/insights') {
      return [pathname]
    }
    return []
  }, [pathname])
  return (
    <Header>
      <Menu theme="dark" mode="horizontal" selectedKeys={selectedKeys} items={navItems} style={{ flex: 1, minWidth: 0 }} />
    </Header>
  )
}

const App = () => {
  useEffect(() => {
    ModuleRegistry.registerModules([
      ClientSideRowModelModule,
      CustomEditorModule,
      DateEditorModule,
      NumberEditorModule,
      PinnedRowModule,
      TextEditorModule,
      ValidationModule,
    ])
  }, [])

  return (
    <Flex>
      <Layout style={{ height: '100vh', display: 'flex', width: '100%', minWidth: 0 }}>
        <AppHeader />
        <Content style={{ flex: 1, display: 'flex', minWidth: 0 }}>
          <Routes>
            <Route path="/" element={<AppContext />}>
              <Route path="expenses" element={<Expenses fromDate={fromDate} toDate={toDate} />} />
              <Route path="incomes" element={<Incomes fromDate={fromDate} toDate={toDate} />} />
              <Route path="insights" element={<Insights queryClient={queryClient} />} />
              <Route path="dashboards/*" element={<Navigate to="/insights" replace />} />
              <Route path="/" element={<Navigate to="expenses" />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Route>
          </Routes>
        </Content>
      </Layout>
    </Flex>
  )
}

export default App
