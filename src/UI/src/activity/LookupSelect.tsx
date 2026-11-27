import { useState } from 'react'
import { Select } from 'antd'

/** Sentinel option value for "Add <typed text>"; ids are never negative. */
const ADD_NEW = -1

interface LookupSelectProps {
  value?: number
  onChange?: (value: number | undefined) => void
  options: { value: number; label: string }[]
  placeholder: string
  /** When given, typing a name that does not exist offers to create it. Must resolve to the new id. */
  onCreate?: (label: string) => Promise<number | undefined>
}

/** A searchable dropdown of lookup rows (vendor, category, ...) that can create a missing row on the fly. */
const LookupSelect = ({ value, onChange, options, placeholder, onCreate }: LookupSelectProps) => {
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const typed = search.trim()
  const canAdd = !!onCreate && typed !== '' && !options.some((o) => o.label.toLowerCase() === typed.toLowerCase())

  return (
    <Select<number>
      value={value}
      loading={creating}
      disabled={creating}
      placeholder={placeholder}
      options={canAdd ? [...options, { value: ADD_NEW, label: `Add “${typed}”` }] : options}
      showSearch={{
        onSearch: setSearch,
        filterOption: (input, option) => option?.value === ADD_NEW || (option?.label as string).toLowerCase().includes(input.toLowerCase()),
      }}
      onBlur={() => setSearch('')}
      onChange={async (next) => {
        if (next !== ADD_NEW) return onChange?.(next)
        setCreating(true)
        try {
          onChange?.(await onCreate!(typed))
        } finally {
          setCreating(false)
          setSearch('')
        }
      }}
    />
  )
}

export default LookupSelect
