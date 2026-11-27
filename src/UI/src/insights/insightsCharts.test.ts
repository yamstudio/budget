import { describe, expect, it } from 'vitest'
import type { BreakdownRow } from '../gensrc/Api'
import {
  FROM_SAVINGS,
  INCOME_HUB,
  LEFT_OVER,
  MAX_GROUPS,
  OTHER_COLOR,
  OTHER_LABEL,
  PALETTE,
  buildFlow,
  colorMap,
  topWithOther,
  totalsByLabel,
  trendsOption,
} from './insightsCharts'

const row = (label: string | null, amount: number, month?: string): BreakdownRow => ({ key: 1, label, amount, month })

describe('totalsByLabel', () => {
  it('sums per label, largest first, ties alphabetical', () => {
    const slices = totalsByLabel([row('b', 5), row('a', 5), row('c', 1), row('c', 20)])
    expect(slices).toEqual([
      { label: 'c', amount: 21 },
      { label: 'a', amount: 5 },
      { label: 'b', amount: 5 },
    ])
  })

  it('drops groups whose total is not positive and names unlabeled rows', () => {
    expect(totalsByLabel([row('refunds', -3), row('zero', 0), row(null, 4)])).toEqual([{ label: '#1', amount: 4 }])
  })
})

describe('topWithOther', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ label: `g${i}`, amount: 100 - i }))

  it('leaves short lists alone', () => {
    expect(topWithOther(many.slice(0, MAX_GROUPS))).toHaveLength(MAX_GROUPS)
  })

  it('folds the tail into Other and conserves the total', () => {
    const folded = topWithOther(many)
    expect(folded).toHaveLength(MAX_GROUPS)
    expect(folded.at(-1)!.label).toBe(OTHER_LABEL)
    expect(folded.reduce((s, x) => s + x.amount, 0)).toBe(many.reduce((s, x) => s + x.amount, 0))
  })
})

describe('colorMap', () => {
  it('assigns palette colors in order and gray to Other', () => {
    const colors = colorMap([
      { label: 'a', amount: 3 },
      { label: 'b', amount: 2 },
      { label: OTHER_LABEL, amount: 1 },
    ])
    expect(colors.get('a')).toBe(PALETTE[0])
    expect(colors.get('b')).toBe(PALETTE[1])
    expect(colors.get(OTHER_LABEL)).toBe(OTHER_COLOR)
  })
})

describe('buildFlow', () => {
  const colors = new Map([['Rent', '#111111']])
  const income = [{ label: 'Job', amount: 1000 }]
  const sum = (flow: ReturnType<typeof buildFlow>, source?: string, target?: string) =>
    flow.links.filter((l) => (!source || l.source === source) && (!target || l.target === target)).reduce((s, l) => s + l.value, 0)

  it('adds a Left over target when income exceeds spending, and balances', () => {
    const flow = buildFlow(income, [{ label: 'Rent', amount: 700 }], colors)
    expect(flow.links.find((l) => l.target === `out:${LEFT_OVER}`)!.value).toBe(300)
    expect(sum(flow, undefined, INCOME_HUB)).toBe(sum(flow, INCOME_HUB))
  })

  it('adds a From savings source when spending exceeds income, and balances', () => {
    const flow = buildFlow(income, [{ label: 'Rent', amount: 1500 }], colors)
    expect(flow.links.find((l) => l.source === `in:${FROM_SAVINGS}`)!.value).toBe(500)
    expect(sum(flow, undefined, INCOME_HUB)).toBe(1500)
    expect(sum(flow, INCOME_HUB)).toBe(1500)
  })

  it('keeps a source and a target with the same name apart', () => {
    const flow = buildFlow([{ label: 'Rent', amount: 10 }], [{ label: 'Rent', amount: 10 }], colors)
    expect(new Set(flow.nodes.map((n) => n.name)).size).toBe(flow.nodes.length)
  })

  it('is empty without data', () => {
    expect(buildFlow([], [], colors)).toEqual({ nodes: [], links: [] })
  })
})

describe('trendsOption', () => {
  const range = { fromDate: new Date(2026, 0, 15), toDate: new Date(2026, 3, 2) }

  it('fills missing months with zero and folds unknown groups into Other', () => {
    const colors = new Map([
      ['a', '#1'],
      [OTHER_LABEL, OTHER_COLOR],
    ])
    const option = trendsOption(
      [row('a', 10, '2026-01-01'), row('a', 5, '2026-03-01'), row('z', 7, '2026-02-01'), row('y', 1, '2026-02-01')],
      range,
      colors
    )
    expect((option.xAxis as { data: string[] }).data).toEqual(['2026-01', '2026-02', '2026-03', '2026-04'])
    const series = option.series as { name: string; data: number[] }[]
    expect(series.find((s) => s.name === 'a')!.data).toEqual([10, 0, 5, 0])
    expect(series.find((s) => s.name === OTHER_LABEL)!.data).toEqual([0, 8, 0, 0])
  })
})
