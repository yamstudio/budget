import { useMemo, useState } from 'react'
import { Alert, Badge, Button, Empty, Grid, Modal, Select, Spin, Table, Tabs, Typography } from 'antd'
import { useSearchParams } from 'react-router'
import DateRangeControl from '../DateRangeControl'
import { formatDate, resolveRange } from '../dateRange'
import { ExpenseCategory, ExpenseGrouping, ExpenseNecessity, IncomeGrouping, PaymentMethod, Vendor } from '../gensrc/Api'
import {
  useBudgetComparison,
  useExpenseBreakdown,
  useExpenseCategories,
  useIncomeBreakdown,
  usePaymentMethods,
  useUpdateExpenseCategory,
  useVendors,
} from '../Queries'
import EChart from './EChart'
import {
  breakdownHeight,
  budgetHeight,
  budgetOption,
  breakdownOption,
  buildFlow,
  colorMap,
  flowHeight,
  flowOption,
  formatMoney,
  topWithOther,
  totalsByLabel,
  trendsOption,
} from './insightsCharts'
import { InsightsParams, InsightsView, activeFilterCount, parseInsightsParams, toSearchParams } from './insightsParams'
import { QueryClient } from '@tanstack/react-query'

const GROUP_LABELS: Record<ExpenseGrouping, string> = {
  [ExpenseGrouping.Category]: 'Category',
  [ExpenseGrouping.Vendor]: 'Vendor',
  [ExpenseGrouping.PaymentMethod]: 'Payment method',
  [ExpenseGrouping.Necessity]: 'Essential vs. discretionary',
}
const NECESSITY_OPTIONS = Object.values(ExpenseNecessity).map((value) => ({ value, label: value }))
const lookupOptions = <T extends { displayName: string | null }>(items: T[] | undefined, id: (item: T) => number | undefined) =>
  (items ?? []).map((item) => ({ value: id(item)!, label: item.displayName ?? '' })).sort((a, b) => a.label.localeCompare(b.label))

interface InsightsProps {
  queryClient: QueryClient
}

const Insights = ({ queryClient }: InsightsProps) => {
  const [search, setSearch] = useSearchParams()
  const params = useMemo(() => parseInsightsParams(search), [search])
  const update = (patch: Partial<InsightsParams>) => setSearch(toSearchParams({ ...params, ...patch }), { replace: true })
  const narrow = !Grid.useBreakpoint().md
  const [classifying, setClassifying] = useState(false)

  const { fromDate, toDate } = useMemo(() => resolveRange(params, new Date()), [params])
  const range = { fromDate: formatDate(fromDate), toDate: formatDate(toDate) }
  const isFlow = params.view === 'flow'
  const isBudget = params.view === 'budget'
  const expenseQuery = useExpenseBreakdown(
    {
      ...range,
      groupBy: params.groupBy,
      byMonth: params.view === 'trends',
      expenseCategoryIds: params.categoryIds,
      vendorIds: params.vendorIds,
      paymentMethodIds: params.paymentMethodIds,
      necessities: params.necessities,
    },
    !isBudget
  )
  const incomeQuery = useIncomeBreakdown({ ...range, groupBy: IncomeGrouping.Source }, isFlow)

  const categories = useExpenseCategories().data
  const vendors = useVendors().data
  const paymentMethods = usePaymentMethods().data

  const slices = useMemo(() => topWithOther(totalsByLabel(expenseQuery.data ?? [])), [expenseQuery.data])
  const colors = useMemo(() => colorMap(slices), [slices])
  const total = slices.reduce((sum, s) => sum + s.amount, 0)

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: narrow ? 12 : 24, minWidth: 0 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <DateRangeControl value={params} resolved={{ fromDate, toDate }} onChange={update} />
        {!isBudget && (
          <Select
            aria-label="Group by"
            value={params.groupBy}
            onChange={(groupBy) => update({ groupBy })}
            style={{ minWidth: 170 }}
            options={Object.entries(GROUP_LABELS).map(([value, label]) => ({ value, label: `By ${label.toLowerCase()}` }))}
          />
        )}
        <Button onClick={() => setClassifying(true)}>Classify categories</Button>
      </div>

      <Filters params={params} update={update} categories={categories} vendors={vendors} paymentMethods={paymentMethods} narrow={narrow} />

      <Tabs
        activeKey={params.view}
        onChange={(view) => update({ view: view as InsightsView })}
        items={[
          { key: 'breakdown', label: 'Breakdown' },
          { key: 'flow', label: 'Flow' },
          { key: 'trends', label: 'Trends' },
          { key: 'budget', label: 'Budget' },
        ]}
      />

      {isBudget ? (
        <BudgetView params={params} range={range} narrow={narrow} />
      ) : expenseQuery.isError || incomeQuery.isError ? (
        <Alert type="error" showIcon message="Could not load the data." />
      ) : expenseQuery.isPending || (isFlow && incomeQuery.isPending) ? (
        <Spin size="large" />
      ) : slices.length === 0 ? (
        <Empty description="No spending in this range with these filters." />
      ) : (
        <>
          <Typography.Text type="secondary">
            {formatMoney(total)} spent, {range.fromDate} to {range.toDate}
          </Typography.Text>
          {params.view === 'breakdown' && (
            <EChart
              option={breakdownOption(slices, colors)}
              height={breakdownHeight(slices.length)}
              label={`Spending by ${GROUP_LABELS[params.groupBy]}`}
            />
          )}
          {params.view === 'trends' && (
            <EChart
              option={trendsOption(expenseQuery.data ?? [], { fromDate, toDate }, colors)}
              height={narrow ? 320 : 420}
              label="Monthly spending"
            />
          )}
          {isFlow && (
            <FlowChart
              income={totalsByLabel(incomeQuery.data ?? [])}
              slices={slices}
              colors={colors}
              narrow={narrow}
              filtered={activeFilterCount(params) > 0}
            />
          )}
        </>
      )}

      <ClassifyCategories open={classifying} onClose={() => setClassifying(false)} queryClient={queryClient} />
    </div>
  )
}

const BudgetView = ({
  params,
  range,
  narrow,
}: {
  params: InsightsParams
  range: { fromDate: string; toDate: string }
  narrow: boolean
}) => {
  const query = useBudgetComparison({
    ...range,
    expenseCategoryIds: params.categoryIds,
    vendorIds: params.vendorIds,
    paymentMethodIds: params.paymentMethodIds,
    necessities: params.necessities,
  })
  const rows = query.data ?? []
  const budget = rows.reduce((sum, r) => sum + r.budget, 0)
  const actual = rows.reduce((sum, r) => sum + r.actual, 0)
  if (query.isError) return <Alert type="error" showIcon message="Could not load the data." />
  if (query.isPending) return <Spin size="large" />
  if (rows.length === 0) return <Empty description="No budgets or spending in this range with these filters." />
  return (
    <>
      <Typography.Text type="secondary">
        {formatMoney(actual)} spent of {formatMoney(budget)} budgeted, {range.fromDate} to {range.toDate}
      </Typography.Text>
      {(params.vendorIds.length > 0 || params.paymentMethodIds.length > 0) && (
        <Alert
          type="info"
          showIcon
          style={{ margin: '8px 0' }}
          message="Budgets are per category, so vendor and payment-method filters narrow only the spending."
        />
      )}
      <EChart option={budgetOption(rows, narrow)} height={budgetHeight(rows.length)} label="Budget versus actual spending by category" />
    </>
  )
}

const FlowChart = ({
  income,
  slices,
  colors,
  narrow,
  filtered,
}: {
  income: { label: string; amount: number }[]
  slices: { label: string; amount: number }[]
  colors: Map<string, string>
  narrow: boolean
  filtered: boolean
}) => {
  const flow = useMemo(() => buildFlow(income, slices, colors), [income, slices, colors])
  return (
    <>
      {filtered && (
        <Alert
          type="info"
          showIcon
          style={{ margin: '8px 0' }}
          message="Filters narrow the spending side only, so “Left over” is overstated."
        />
      )}
      <EChart option={flowOption(flow, narrow)} height={flowHeight(flow)} label="Income to spending flow" />
    </>
  )
}

const Filters = ({
  params,
  update,
  categories,
  vendors,
  paymentMethods,
  narrow,
}: {
  params: InsightsParams
  update: (patch: Partial<InsightsParams>) => void
  categories?: ExpenseCategory[]
  vendors?: Vendor[]
  paymentMethods?: PaymentMethod[]
  narrow: boolean
}) => {
  const [open, setOpen] = useState(false)
  const count = activeFilterCount(params)
  const field = <V extends number | string>(
    placeholder: string,
    options: { value: V; label: string }[],
    value: V[],
    onChange: (v: V[]) => void
  ) => (
    <Select<V[]>
      mode="multiple"
      allowClear
      showSearch={{ optionFilterProp: 'label' }}
      maxTagCount="responsive"
      placeholder={placeholder}
      value={value}
      options={options}
      onChange={onChange}
      style={{ minWidth: narrow ? '100%' : 200, flex: narrow ? undefined : 1 }}
    />
  )
  return (
    <div style={{ marginBottom: 8 }}>
      <Badge count={count} size="small">
        <Button onClick={() => setOpen(!open)}>{open ? 'Hide filters' : 'Filters'}</Button>
      </Badge>
      {open && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {field(
            'Categories',
            lookupOptions(categories, (c) => c.expenseCategoryID),
            params.categoryIds,
            (categoryIds) => update({ categoryIds })
          )}
          {field(
            'Vendors',
            lookupOptions(vendors, (v) => v.vendorID),
            params.vendorIds,
            (vendorIds) => update({ vendorIds })
          )}
          {field(
            'Payment methods',
            lookupOptions(paymentMethods, (p) => p.paymentMethodID),
            params.paymentMethodIds,
            (paymentMethodIds) => update({ paymentMethodIds })
          )}
          {field('Essential / discretionary', NECESSITY_OPTIONS, params.necessities, (necessities) => update({ necessities }))}
        </div>
      )}
    </div>
  )
}

const ClassifyCategories = ({ open, onClose, queryClient }: { open: boolean; onClose: () => void; queryClient: QueryClient }) => {
  const categories = useExpenseCategories().data
  const mutation = useUpdateExpenseCategory(queryClient)
  return (
    <Modal open={open} onCancel={onClose} onOk={onClose} footer={null} title="Classify categories" destroyOnHidden>
      <Typography.Paragraph type="secondary">
        Mark each category as essential or discretionary. This powers the “Essential / discretionary” grouping and filter.
      </Typography.Paragraph>
      <Table
        size="small"
        pagination={false}
        rowKey="expenseCategoryID"
        dataSource={[...(categories ?? [])].sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? ''))}
        columns={[
          { title: 'Category', dataIndex: 'displayName' },
          {
            title: 'Kind',
            render: (_, category) => (
              <Select
                aria-label={`Kind of ${category.displayName}`}
                value={category.necessity ?? ExpenseNecessity.Unclassified}
                options={NECESSITY_OPTIONS}
                loading={mutation.isPending && mutation.variables?.expenseCategoryID === category.expenseCategoryID}
                onChange={(necessity) => mutation.mutate({ ...category, necessity })}
                style={{ width: 160 }}
              />
            ),
          },
        ]}
      />
      {mutation.isError && <Alert type="error" showIcon message="Could not save." />}
    </Modal>
  )
}

export default Insights
