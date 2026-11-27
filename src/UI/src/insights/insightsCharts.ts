import { eachMonthOfInterval, format } from 'date-fns'
import type { EChartsOption } from 'echarts'
import type { BreakdownRow, BudgetComparisonRow } from '../gensrc/Api'

/** Validated categorical palette (light surface), fixed order. */
export const PALETTE = ['#257de0', '#f47230', '#00b894', '#f2a600', '#ee7fac', '#008a17', '#6a4ce2', '#ec4647']
export const OTHER_COLOR = '#9c9c9c'
export const OTHER_LABEL = 'Other'
export const MAX_GROUPS = PALETTE.length

export interface Slice {
  label: string
  amount: number
}

const labelOf = (row: BreakdownRow) => row.label ?? `#${row.key}`

/** Sums rows per group label, largest first. Negative or zero totals are dropped (nothing to show in a spending chart). */
export const totalsByLabel = (rows: BreakdownRow[]): Slice[] => {
  const totals = new Map<string, number>()
  for (const row of rows) totals.set(labelOf(row), (totals.get(labelOf(row)) ?? 0) + row.amount)
  return [...totals]
    .map(([label, amount]) => ({ label, amount }))
    .filter((s) => s.amount > 0)
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label))
}

/** Keeps the `max` largest groups and folds the rest into one "Other" slice. */
export const topWithOther = (slices: Slice[], max = MAX_GROUPS): Slice[] => {
  if (slices.length <= max) return slices
  const rest = slices.slice(max - 1)
  return [...slices.slice(0, max - 1), { label: OTHER_LABEL, amount: rest.reduce((sum, s) => sum + s.amount, 0) }]
}

/** One color per label, assigned in rank order; "Other" is always gray. Build it once per view so every chart agrees. */
export const colorMap = (slices: Slice[]): Map<string, string> =>
  new Map(slices.map((s, i) => [s.label, s.label === OTHER_LABEL ? OTHER_COLOR : PALETTE[i % PALETTE.length]]))

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
export const formatMoney = (amount: number) => currency.format(amount)

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const TEXT = '#666666'
const GRID = '#e5e5e5'

/** Horizontal bars, largest on top, with the amount at the end of each bar. */
export const breakdownOption = (slices: Slice[], colors: Map<string, string>): EChartsOption => {
  const shown = [...slices].reverse() // category axes draw bottom-up
  return {
    animation: false,
    grid: { left: 8, right: 64, top: 8, bottom: 8, containLabel: true },
    tooltip: { trigger: 'item', valueFormatter: (v) => formatMoney(Number(v)) },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      data: shown.map((s) => s.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: TEXT, width: 120, overflow: 'truncate' },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 22,
        data: shown.map((s) => ({ value: s.amount, itemStyle: { color: colors.get(s.label), borderRadius: [0, 4, 4, 0] } })),
        label: { show: true, position: 'right', color: TEXT, formatter: (p) => formatMoney(Number(p.value)) },
      },
    ],
  }
}

/** Height in px that gives each bar room, for the vertical bar chart above. */
export const breakdownHeight = (count: number) => Math.max(160, count * 36 + 16)

const monthKey = (date: Date) => format(date, 'yyyy-MM')

/** Stacked monthly columns, one series per group, with empty months filled with zero so gaps are visible. */
export const trendsOption = (
  rows: BreakdownRow[],
  months: { fromDate: Date; toDate: Date },
  colors: Map<string, string>
): EChartsOption => {
  const monthLabels = eachMonthOfInterval({ start: months.fromDate, end: months.toDate }).map(monthKey)
  const kept = new Set(colors.keys())
  const byLabel = new Map<string, Map<string, number>>()
  for (const row of rows) {
    if (!row.month || row.amount <= 0) continue
    const label = kept.has(labelOf(row)) ? labelOf(row) : OTHER_LABEL
    const perMonth = byLabel.get(label) ?? new Map<string, number>()
    const key = row.month.substring(0, 7)
    perMonth.set(key, (perMonth.get(key) ?? 0) + row.amount)
    byLabel.set(label, perMonth)
  }
  const labels = [...colors.keys()].filter((l) => byLabel.has(l))
  return {
    animation: false,
    color: labels.map((l) => colors.get(l)!),
    legend: { bottom: 0, type: 'scroll', textStyle: { color: TEXT } },
    grid: { left: 8, right: 8, top: 16, bottom: 40, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => formatMoney(Number(v)) },
    xAxis: { type: 'category', data: monthLabels, axisLine: { lineStyle: { color: GRID } }, axisLabel: { color: TEXT } },
    yAxis: {
      type: 'value',
      axisLabel: { color: TEXT, formatter: (v: number) => compact.format(v) },
      splitLine: { lineStyle: { color: GRID } },
    },
    series: labels.map((label) => ({
      name: label,
      type: 'bar' as const,
      stack: 'total',
      barMaxWidth: 40,
      itemStyle: { borderColor: '#ffffff', borderWidth: 1 },
      data: monthLabels.map((m) => byLabel.get(label)!.get(m) ?? 0),
    })),
  }
}

export const INCOME_HUB = 'Income'
export const LEFT_OVER = 'Left over'
export const FROM_SAVINGS = 'From savings'
const SOURCE_PREFIX = 'in:'
const TARGET_PREFIX = 'out:'

export interface Flow {
  nodes: { name: string; itemStyle?: { color: string } }[]
  links: { source: string; target: string; value: number }[]
}

/**
 * Income sources -> total income -> spending groups (+ what is left over).
 * When spending exceeds income the gap appears as an extra "From savings" source so every node balances.
 */
export const buildFlow = (incomes: Slice[], spending: Slice[], colors: Map<string, string>): Flow => {
  const incomeTotal = incomes.reduce((sum, s) => sum + s.amount, 0)
  const spendTotal = spending.reduce((sum, s) => sum + s.amount, 0)
  const sources = [...incomes]
  if (spendTotal > incomeTotal) sources.push({ label: FROM_SAVINGS, amount: spendTotal - incomeTotal })
  const targets = [...spending]
  if (incomeTotal > spendTotal) targets.push({ label: LEFT_OVER, amount: incomeTotal - spendTotal })

  const nodes: Flow['nodes'] = [
    ...sources.map((s) => ({ name: SOURCE_PREFIX + s.label, itemStyle: { color: OTHER_COLOR } })),
    { name: INCOME_HUB, itemStyle: { color: '#444444' } },
    ...targets.map((t) => ({ name: TARGET_PREFIX + t.label, itemStyle: { color: colors.get(t.label) ?? OTHER_COLOR } })),
  ]
  const links: Flow['links'] = [
    ...sources.map((s) => ({ source: SOURCE_PREFIX + s.label, target: INCOME_HUB, value: s.amount })),
    ...targets.map((t) => ({ source: INCOME_HUB, target: TARGET_PREFIX + t.label, value: t.amount })),
  ]
  return { nodes: sources.length + targets.length === 0 ? [] : nodes, links }
}

const displayName = (name: string) => name.replace(/^(in:|out:)/, '')

export const flowOption = (flow: Flow, narrow: boolean): EChartsOption => ({
  animation: false,
  tooltip: {
    trigger: 'item',
    formatter: (p) => {
      const item = p as unknown as { name: string; value: number; data: { source?: string; target?: string } }
      const name = item.data.source ? `${displayName(item.data.source)} → ${displayName(item.data.target!)}` : displayName(item.name)
      return `${name}<br/>${formatMoney(item.value)}`
    },
  },
  series: [
    {
      type: 'sankey',
      left: 4,
      right: narrow ? 90 : 140,
      top: 8,
      bottom: 8,
      nodeWidth: 12,
      nodeGap: 10,
      draggable: false,
      emphasis: { focus: 'adjacency' },
      lineStyle: { color: 'gradient', opacity: 0.35 },
      label: { color: TEXT, fontSize: narrow ? 11 : 12, formatter: (p) => displayName((p as unknown as { name: string }).name) },
      data: flow.nodes,
      links: flow.links,
    },
  ],
})

/** Height that keeps the tallest side of the flow readable. */
export const flowHeight = (flow: Flow) => Math.max(260, Math.max(flow.nodes.length, 1) * 30)

export const BUDGET_COLOR = '#c9c9c9'

/** "$1,432 of $1,200 (119%)", or just the amount when there is no budget for the category. */
export const budgetLabel = (row: Pick<BudgetComparisonRow, 'budget' | 'actual'>) =>
  row.budget > 0
    ? `${formatMoney(row.actual)} of ${formatMoney(row.budget)} (${Math.round((row.actual / row.budget) * 100)}%)`
    : `${formatMoney(row.actual)}, no budget`

/** Per category: a gray budget bar above a blue actual bar, so overspending shows as the blue bar outrunning the gray one. */
export const budgetOption = (rows: BudgetComparisonRow[], narrow = false): EChartsOption => {
  const named = rows.map((r) => ({ ...r, label: r.label ?? `#${r.key}` }))
  const shown = named.sort((a, b) => b.actual - a.actual || a.label.localeCompare(b.label)).reverse() // category axes draw bottom-up
  return {
    animation: false,
    grid: { left: 8, right: 8, top: 8, bottom: 32, containLabel: true },
    legend: { bottom: 0, textStyle: { color: TEXT } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => formatMoney(Number(v)) },
    xAxis: {
      type: 'value',
      // Headroom so the label at the end of the longest bar is not cut off (more is needed on a narrow screen).
      max: (v) => v.max * (narrow ? 1.9 : 1.35),
      axisLabel: { color: TEXT, formatter: (v: number) => compact.format(v) },
      splitLine: { lineStyle: { color: GRID } },
    },
    yAxis: {
      type: 'category',
      data: shown.map((r) => r.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: TEXT, width: 100, overflow: 'truncate' },
    },
    series: [
      {
        name: 'Budget',
        type: 'bar',
        barMaxWidth: 14,
        barGap: '10%',
        itemStyle: { color: BUDGET_COLOR, borderRadius: [0, 4, 4, 0] },
        data: shown.map((r) => r.budget),
      },
      {
        name: 'Actual',
        type: 'bar',
        barMaxWidth: 14,
        itemStyle: { color: PALETTE[0], borderRadius: [0, 4, 4, 0] },
        data: shown.map((r) => r.actual),
        label: {
          show: true,
          position: 'right',
          color: TEXT,
          fontSize: 11,
          formatter: (p) => budgetLabel(shown[p.dataIndex]),
        },
      },
    ],
  }
}

export const budgetHeight = (count: number) => Math.max(200, count * 56 + 48)
