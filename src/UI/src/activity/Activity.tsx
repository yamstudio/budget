import { useMemo, useState } from 'react'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Alert, Empty, FloatButton, Grid, Input, Segmented, Spin, Typography } from 'antd'
import { useSearchParams } from 'react-router'
import DateRangeControl from '../DateRangeControl'
import FilterPanel, { filterField, lookupOptions } from '../FilterPanel'
import { formatDate, resolveRange } from '../dateRange'
import {
  useExpenseCategories,
  useExpenses,
  useIncomeCategories,
  useIncomes,
  useIncomeSources,
  usePaymentMethods,
  useVendors,
} from '../Queries'
import ActivityList from './ActivityList'
import EntryDrawer, { addState } from './EntryDrawer'
import type { DrawerState } from './EntryDrawer'
import { buildActivity, filterActivity, groupByDate, hasExpenseFilters, nameMap, summarize } from './activityItems'
import type { ActivityItem, NameMaps, TypeFilter } from './activityItems'
import { activeFilterCount, parseActivityParams, toActivitySearch } from './activityParams'
import type { ActivityParams } from './activityParams'
import { emptyValues } from './entryValues'

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

const Activity = () => {
  const [search, setSearch] = useSearchParams()
  const params = useMemo(() => parseActivityParams(search), [search])
  const update = (patch: Partial<ActivityParams>) => setSearch(toActivitySearch({ ...params, ...patch }), { replace: true })
  const narrow = !Grid.useBreakpoint().md
  const [drawer, setDrawer] = useState<DrawerState | null>(null)

  const { fromDate, toDate } = useMemo(() => resolveRange(params, new Date()), [params])
  const expenses = useExpenses(fromDate, toDate)
  const incomes = useIncomes(fromDate, toDate)
  const expenseCategories = useExpenseCategories().data
  const vendors = useVendors().data
  const paymentMethods = usePaymentMethods().data
  const incomeCategories = useIncomeCategories().data
  const incomeSources = useIncomeSources().data

  const ready = !!(expenses.data && incomes.data && expenseCategories && vendors && paymentMethods && incomeCategories && incomeSources)
  const names: NameMaps = useMemo(
    () => ({
      expenseCategory: nameMap(expenseCategories, (c) => c.expenseCategoryID),
      vendor: nameMap(vendors, (v) => v.vendorID),
      paymentMethod: nameMap(paymentMethods, (m) => m.paymentMethodID),
      incomeCategory: nameMap(incomeCategories, (c) => c.incomeCategoryID),
      incomeSource: nameMap(incomeSources, (s) => s.incomeSourceID),
    }),
    [expenseCategories, vendors, paymentMethods, incomeCategories, incomeSources]
  )
  const visible = useMemo(
    () => filterActivity(buildActivity(expenses.data, incomes.data, names), params),
    [expenses.data, incomes.data, names, params]
  )
  const groups = useMemo(() => groupByDate(visible, new Date()), [visible])
  const { count, spent, earned } = summarize(visible)

  const open = (item: ActivityItem) => setDrawer({ mode: 'edit', item })
  const add = () => setDrawer(addState(emptyValues(params.type === 'income' ? 'income' : 'expense', new Date())))

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: narrow ? 12 : 24, minWidth: 0 }}>
      <div style={{ maxWidth: 820, margin: '0 auto', paddingBottom: 72 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <DateRangeControl value={params} resolved={{ fromDate, toDate }} onChange={update} />
          <Segmented<TypeFilter>
            value={params.type}
            onChange={(type) => update({ type })}
            options={[
              { value: 'all', label: 'All' },
              { value: 'expense', label: 'Expenses' },
              { value: 'income', label: 'Incomes' },
            ]}
          />
        </div>
        <Input
          allowClear
          aria-label="Search entries"
          placeholder="Search vendor, category, note, amount"
          prefix={<SearchOutlined />}
          value={params.q}
          onChange={(e) => update({ q: e.target.value })}
        />

        <div style={{ marginTop: 12 }}>
          <FilterPanel
            narrow={narrow}
            count={activeFilterCount(params)}
            fields={[
              filterField({
                placeholder: 'Payment methods',
                options: lookupOptions(paymentMethods, (m) => m.paymentMethodID),
                value: params.paymentMethodIds,
                onChange: (paymentMethodIds) => update({ paymentMethodIds }),
              }),
              filterField({
                placeholder: 'Vendors',
                options: lookupOptions(vendors, (v) => v.vendorID),
                value: params.vendorIds,
                onChange: (vendorIds) => update({ vendorIds }),
              }),
              filterField({
                placeholder: 'Categories',
                options: lookupOptions(expenseCategories, (c) => c.expenseCategoryID),
                value: params.categoryIds,
                onChange: (categoryIds) => update({ categoryIds }),
              }),
            ]}
          />
        </div>

        {expenses.isError || incomes.isError ? (
          <Alert type="error" showIcon message="Could not load the entries." style={{ marginTop: 16 }} />
        ) : !ready ? (
          <Spin size="large" style={{ display: 'block', margin: '48px auto' }} />
        ) : (
          <>
            <Typography.Text type="secondary" style={{ display: 'block', margin: '12px 4px 0' }}>
              {count} {count === 1 ? 'entry' : 'entries'}, {formatDate(fromDate)} to {formatDate(toDate)}
              {spent > 0 && ` · ${money.format(spent)} spent`}
              {earned > 0 && ` · ${money.format(earned)} earned`}
            </Typography.Text>
            {hasExpenseFilters(params) && params.type !== 'expense' && (
              <Typography.Text type="secondary" style={{ display: 'block', margin: '2px 4px 0' }}>
                Card, vendor and category filters apply to expenses, so incomes are hidden.
              </Typography.Text>
            )}
            {groups.length === 0 ? (
              <Empty description="Nothing here for this range and search." style={{ marginTop: 48 }} />
            ) : (
              <ActivityList groups={groups} onOpen={open} />
            )}
          </>
        )}
      </div>

      <FloatButton type="primary" icon={<PlusOutlined />} aria-label="Add entry" tooltip="Add entry" onClick={add} />
      <EntryDrawer state={drawer} onClose={() => setDrawer(null)} onDuplicate={setDrawer} />
    </div>
  )
}

export default Activity
