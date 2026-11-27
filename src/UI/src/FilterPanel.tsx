import { useState } from 'react'
import { Badge, Button, Select } from 'antd'

interface FilterFieldProps<V extends number | string> {
  placeholder: string
  options: { value: V; label: string }[]
  value: V[]
  onChange: (value: V[]) => void
}

/** One multi-select filter. Build with `filterField`, which hides the value type so fields of different types can share a list. */
export interface FilterField {
  placeholder: string
  render: (narrow: boolean) => React.ReactNode
}

export const filterField = <V extends number | string>({ placeholder, options, value, onChange }: FilterFieldProps<V>): FilterField => ({
  placeholder,
  render: (narrow) => (
    <Select<V[]>
      key={placeholder}
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
  ),
})

/** Lookup rows as sorted select options. */
export const lookupOptions = <T extends { displayName: string | null }>(items: T[] | undefined, id: (item: T) => number | undefined) =>
  (items ?? []).map((item) => ({ value: id(item)!, label: item.displayName ?? '' })).sort((a, b) => a.label.localeCompare(b.label))

interface FilterPanelProps {
  fields: FilterField[]
  /** How many filters are narrowing the data; shown as a badge, and the panel starts open when it is not zero. */
  count: number
  narrow: boolean
}

/** A "Filters" button with a badge that reveals a row of multi-selects. */
const FilterPanel = ({ fields, count, narrow }: FilterPanelProps) => {
  const [open, setOpen] = useState(count > 0)
  return (
    <div style={{ marginBottom: 8 }}>
      <Badge count={count} size="small">
        <Button onClick={() => setOpen(!open)}>{open ? 'Hide filters' : 'Filters'}</Button>
      </Badge>
      {open && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>{fields.map((field) => field.render(narrow))}</div>}
    </div>
  )
}

export default FilterPanel
