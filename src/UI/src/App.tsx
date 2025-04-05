import React, { useEffect, useMemo, useState } from 'react'
import {
  ApiContext,
  ExpenseCategoriesContext,
  IncomeCategoriesContext,
  VendorsContext,
  PaymentMethodsContext,
  IncomeSourcesContext,
} from './Context'
import Expenses from './Expenses'
import { Flex, Layout, Menu } from 'antd'
import type { MenuProps } from 'antd'
import { addDays, addMonths, startOfMonth } from 'date-fns'
import { Navigate, Link, Route, Routes, useLocation, Outlet } from 'react-router-dom'
import Incomes from './Incomes'
import Dashboard from './Dashboard'
import { Api, ExpenseCategory, IncomeCategory, IncomeSource, PaymentMethod, Vendor } from './gensrc/Api'
const { Header, Footer, Content } = Layout

const api = new Api<never>().api
const today = new Date()

const AppContext = () => {
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[] | undefined>(undefined)
  useEffect(() => {
    api.getExpenseCategories().then(({ data }) => setExpenseCategories(data))
  }, [])

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[] | undefined>(undefined)
  useEffect(() => {
    api.getPaymentMethods().then(({ data }) => setPaymentMethods(data))
  }, [])

  const [vendors, setVendors] = useState<Vendor[] | undefined>(undefined)
  useEffect(() => {
    api.getVendors().then(({ data }) => setVendors(data))
  }, [])

  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[] | undefined>(undefined)
  useEffect(() => {
    api.getIncomeCategories().then(({ data }) => setIncomeCategories(data))
  }, [])

  const [incomeSources, setIncomeSources] = useState<IncomeSource[] | undefined>(undefined)
  useEffect(() => {
    api.getIncomeSources().then(({ data }) => setIncomeSources(data))
  }, [])

  const addVendor = (vendorDisplayName: string) =>
    api
      .createVendor({
        displayName: vendorDisplayName,
        description: vendorDisplayName,
      })
      .then(({ data }) => {
        setVendors([...(vendors || []), data])
        return data
      })

  const addPaymentMethod = (paymentMethodDisplayName: string) =>
    api
      .createPaymentMethod({
        displayName: paymentMethodDisplayName,
        description: paymentMethodDisplayName,
      })
      .then(({ data }) => {
        setPaymentMethods([...(paymentMethods || []), data])
        return data
      })
  return (
    <ApiContext.Provider value={api}>
      <ExpenseCategoriesContext.Provider value={{ expenseCategories }}>
        <VendorsContext.Provider value={{ vendors, addVendor }}>
          <IncomeCategoriesContext.Provider value={{ incomeCategories }}>
            <IncomeSourcesContext.Provider value={{ incomeSources }}>
              <PaymentMethodsContext.Provider value={{ paymentMethods, addPaymentMethod }}>
                <Outlet />
              </PaymentMethodsContext.Provider>
            </IncomeSourcesContext.Provider>
          </IncomeCategoriesContext.Provider>
        </VendorsContext.Provider>
      </ExpenseCategoriesContext.Provider>
    </ApiContext.Provider>
  )
}

const App = () => {
  const navItems: MenuProps['items'] = [
    {
      key: 'expenses',
      label: <Link to="/expenses">Expenses</Link>,
    },
    {
      key: 'incomes',
      label: <Link to="/incomes">Incomes</Link>,
    },
    {
      key: 'dashboard',
      label: <Link to="/dashboard">Dashboard</Link>,
    },
  ]
  const { pathname } = useLocation()
  const selectedKeys = useMemo(() => {
    if (pathname === '/expenses') {
      return ['expenses']
    }
    if (pathname === '/incomes') {
      return ['incomes']
    }
    if (pathname === '/dashboard') {
      return ['dashboard']
    }
    return []
  }, [pathname])

  const toDate = useMemo(() => addDays(today, 1), [today])
  const fromDate = useMemo(() => startOfMonth(addMonths(today, -3)), [today])

  return (
    <Flex>
      <Layout style={{ height: '100vh', display: 'flex' }}>
        <Header>
          <Menu theme="dark" mode="horizontal" selectedKeys={selectedKeys} items={navItems} style={{ flex: 1, minWidth: 0 }} />
        </Header>
        <Content style={{ flex: 1, display: 'flex' }}>
          <Routes>
            <Route path="/" element={<AppContext />}>
              <Route path="/expenses" element={<Expenses fromDate={fromDate} toDate={toDate} />} />
              <Route path="/incomes" element={<Incomes fromDate={fromDate} toDate={toDate} />} />
              <Route path="/dashboard" element={<Dashboard fromDate={fromDate} toDate={toDate} />} />
              <Route path="/" element={<Navigate to="/expenses" />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Route>
          </Routes>
        </Content>
        <Footer></Footer>
      </Layout>
    </Flex>
  )
}

export default App
