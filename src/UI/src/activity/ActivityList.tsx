import { PALETTE } from '../insights/insightsCharts'
import type { ActivityItem, DayGroup } from './activityItems'
import { formatEntryAmount } from './activityItems'

const INCOME_COLOR = '#008a17'
const MUTED = '#8c8c8c'

/** A small colored dot that is the same for every entry in the same category. */
const dotColor = (item: ActivityItem) =>
  item.kind === 'income' ? INCOME_COLOR : PALETTE[(item.entry.expenseCategoryID ?? 0) % PALETTE.length]

const subtitle = (item: ActivityItem) => [item.category, item.method, item.note].filter(Boolean).join(' · ')

const Row = ({ item, onOpen }: { item: ActivityItem; onOpen: (item: ActivityItem) => void }) => (
  <li style={{ listStyle: 'none', borderBottom: '1px solid rgba(128,128,128,0.18)' }}>
    <button
      type="button"
      onClick={() => onOpen(item)}
      aria-label={`${item.title}, ${formatEntryAmount(item.kind, item.amount)}, ${item.category}. Edit`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '12px 4px',
        background: 'none',
        border: 0,
        font: 'inherit',
        color: 'inherit',
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <span aria-hidden style={{ width: 10, height: 10, borderRadius: '50%', flex: 'none', background: dotColor(item) }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </span>
        <span style={{ display: 'block', fontSize: 13, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {subtitle(item)}
        </span>
      </span>
      <span
        style={{
          flex: 'none',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 500,
          color: item.kind === 'income' ? INCOME_COLOR : undefined,
        }}
      >
        {formatEntryAmount(item.kind, item.amount)}
      </span>
    </button>
  </li>
)

interface ActivityListProps {
  groups: DayGroup[]
  onOpen: (item: ActivityItem) => void
}

/** Entries grouped under day headings, newest first. Each row opens the edit panel. */
const ActivityList = ({ groups, onOpen }: ActivityListProps) => (
  <div>
    {groups.map((group) => (
      <section key={group.date} aria-label={group.label} style={{ marginBottom: 12 }}>
        <h3 style={{ margin: '16px 4px 0', fontSize: 13, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {group.label}
        </h3>
        <ul style={{ margin: 0, padding: 0 }}>
          {group.items.map((item) => (
            <Row key={item.key} item={item} onOpen={onOpen} />
          ))}
        </ul>
      </section>
    ))}
  </div>
)

export default ActivityList
