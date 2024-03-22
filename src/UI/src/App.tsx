import React, { useEffect, useMemo, useState } from 'react'
import Expenses from './Expenses'
import { Flex, Layout, Menu } from 'antd'
import type { MenuProps } from 'antd'
import { addDays, addMonths, startOfMonth } from 'date-fns'
import { Navigate, Link, Route, Routes, useLocation } from 'react-router-dom'
import Incomes from './Incomes'
import Dashboard from './Dashboard'
import { Api, ExpenseCategory, IncomeCategory, IncomeSource, PaymentMethod, Vendor } from './gensrc/Api'
const { Header, Footer, Content } = Layout

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
  const pathname = useLocation().pathname
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

  const [today] = useState<Date>(new Date())
  const toDate = useMemo(() => addDays(today, 1), [today])
  const fromDate = useMemo(() => startOfMonth(addMonths(today, -3)), [today])

  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  useEffect(() => {
    new Api().api.getExpenseCategories().then(({ data }) => setExpenseCategories(data))
  }, [])

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  useEffect(() => {
    new Api().api.getPaymentMethods().then(({ data }) => setPaymentMethods(data))
  }, [])

  const [vendors, setVendors] = useState<Vendor[]>([])
  useEffect(() => {
    new Api().api.getVendors().then(({ data }) => setVendors(data))
  }, [])

  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([])
  useEffect(() => {
    new Api().api.getIncomeCategories().then(({ data }) => setIncomeCategories(data))
  }, [])

  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([])
  useEffect(() => {
    new Api().api.getIncomeSources().then(({ data }) => setIncomeSources(data))
  }, [])

  return (
    <Flex>
      <Layout style={{ height: '100vh', display: 'flex' }}>
        <Header>
          <Menu theme="dark" mode="horizontal" selectedKeys={selectedKeys} items={navItems} style={{ flex: 1, minWidth: 0 }} />
        </Header>
        <Content style={{ flex: 1, display: 'flex' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/expenses" />} />
            <Route
              path="/expenses"
              element={
                <Expenses
                  fromDate={fromDate}
                  toDate={toDate}
                  expenseCategories={expenseCategories}
                  vendors={vendors}
                  paymentMethods={paymentMethods}
                />
              }
            />
            <Route
              path="/incomes"
              element={<Incomes fromDate={fromDate} toDate={toDate} incomeSources={incomeSources} incomeCategories={incomeCategories} />}
            />
            <Route path="/dashboard" element={<Dashboard fromDate={fromDate} toDate={toDate} expenseCategories={expenseCategories} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Content>
        <Footer></Footer>
      </Layout>
    </Flex>
  )
}

export default App
