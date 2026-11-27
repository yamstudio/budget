import { DatePicker, Segmented } from 'antd'
import dayjs from 'dayjs'
import { DateRangeKey, DateRangeParams, formatDate } from './dateRange'

interface DateRangeControlProps {
  value: DateRangeParams
  /** The dates `value` currently resolves to, shown in the picker and used to seed a new custom range. */
  resolved: { fromDate: Date; toDate: Date }
  onChange: (next: DateRangeParams) => void
}

/** Preset buttons plus a date picker for a custom range. */
const DateRangeControl = ({ value, resolved, onChange }: DateRangeControlProps) => (
  <>
    <Segmented<DateRangeKey>
      value={value.range}
      onChange={(range) =>
        onChange(range === 'custom' ? { range, from: formatDate(resolved.fromDate), to: formatDate(resolved.toDate) } : { range })
      }
      options={[
        { value: '3m', label: '3M' },
        { value: '6m', label: '6M' },
        { value: '12m', label: '12M' },
        { value: 'ytd', label: 'YTD' },
        { value: 'custom', label: 'Custom' },
      ]}
    />
    {value.range === 'custom' && (
      <DatePicker.RangePicker
        value={[dayjs(resolved.fromDate), dayjs(resolved.toDate)]}
        allowClear={false}
        onChange={(dates) =>
          dates?.[0] && dates[1] && onChange({ range: 'custom', from: dates[0].format('YYYY-MM-DD'), to: dates[1].format('YYYY-MM-DD') })
        }
      />
    )}
  </>
)

export default DateRangeControl
