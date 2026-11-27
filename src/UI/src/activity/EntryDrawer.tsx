import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, Button, DatePicker, Drawer, Form, Grid, Input, InputNumber, Popconfirm, Segmented, Space, Tag } from 'antd'
import dayjs from 'dayjs'
import {
  useCreateExpense,
  useCreateIncome,
  useCreateVendor,
  useDeleteExpense,
  useDeleteIncome,
  useExpenseCategories,
  useExpenseTemplates,
  useIncomeCategories,
  useIncomes,
  useIncomeSources,
  usePaymentMethods,
  useUpdateExpense,
  useUpdateIncome,
  useVendors,
} from '../Queries'
import { resolveRange } from '../dateRange'
import LookupSelect from './LookupSelect'
import type { ActivityItem, EntryKind, NameMaps } from './activityItems'
import { entryId, nameMap } from './activityItems'
import { duplicateValues, expenseSuggestions, incomeSuggestions, itemToValues, missingFields, toExpense, toIncome } from './entryValues'
import type { EntryValues } from './entryValues'

export type DrawerState = { mode: 'add'; values: EntryValues; id: number } | { mode: 'edit'; item: ActivityItem }

interface EntryDrawerProps {
  state: DrawerState | null
  onClose: () => void
  /** Called with the copy to open next when "Duplicate" is pressed. */
  onDuplicate: (state: DrawerState) => void
}

const options = <T extends { displayName: string | null }>(items: T[] | undefined, id: (item: T) => number | undefined) =>
  (items ?? []).map((item) => ({ value: id(item)!, label: item.displayName ?? '' })).sort((a, b) => a.label.localeCompare(b.label))

let drawerCounter = 0
export const addState = (values: EntryValues): DrawerState => ({ mode: 'add', values, id: ++drawerCounter })

const EntryDrawer = ({ state, onClose, onDuplicate }: EntryDrawerProps) => {
  const wide = !!Grid.useBreakpoint().md
  return (
    <Drawer
      open={state !== null}
      onClose={onClose}
      destroyOnHidden
      title={state?.mode === 'edit' ? 'Edit entry' : 'Add entry'}
      placement={wide ? 'right' : 'bottom'}
      size={wide ? 440 : '88%'}
    >
      {state && (
        <EntryForm key={state.mode === 'edit' ? state.item.key : state.id} state={state} onClose={onClose} onDuplicate={onDuplicate} />
      )}
    </Drawer>
  )
}

const EntryForm = ({ state, onClose, onDuplicate }: Omit<EntryDrawerProps, 'state'> & { state: DrawerState }) => {
  const queryClient = useQueryClient()
  const [form] = Form.useForm<EntryValues>()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [now] = useState(() => new Date()) // "today" for this form, fixed when it opens
  const editing = state.mode === 'edit' ? state.item : null
  const initial: EntryValues = state.mode === 'edit' ? itemToValues(state.item) : state.values
  const kind: EntryKind = Form.useWatch('kind', form) ?? initial.kind

  const expenseCategories = useExpenseCategories().data
  const vendors = useVendors().data
  const paymentMethods = usePaymentMethods().data
  const incomeCategories = useIncomeCategories().data
  const incomeSources = useIncomeSources().data
  const templates = useExpenseTemplates().data
  const { fromDate, toDate } = resolveRange({ range: '3m' }, now)
  const recentIncomes = useIncomes(fromDate, toDate).data

  const createExpense = useCreateExpense(queryClient).mutateAsync
  const updateExpense = useUpdateExpense(queryClient).mutateAsync
  const deleteExpense = useDeleteExpense(queryClient).mutateAsync
  const createIncome = useCreateIncome(queryClient).mutateAsync
  const updateIncome = useUpdateIncome(queryClient).mutateAsync
  const deleteIncome = useDeleteIncome(queryClient).mutateAsync
  const createVendor = useCreateVendor(queryClient).mutateAsync

  const names: NameMaps = {
    expenseCategory: nameMap(expenseCategories, (c) => c.expenseCategoryID),
    vendor: nameMap(vendors, (v) => v.vendorID),
    paymentMethod: nameMap(paymentMethods, (m) => m.paymentMethodID),
    incomeCategory: nameMap(incomeCategories, (c) => c.incomeCategoryID),
    incomeSource: nameMap(incomeSources, (s) => s.incomeSourceID),
  }
  const suggestions = editing
    ? []
    : kind === 'expense'
      ? expenseSuggestions(templates, names, now)
      : incomeSuggestions(recentIncomes, names, now)

  const run = async (action: () => Promise<unknown>) => {
    setSaving(true)
    setError(null)
    try {
      await action()
      onClose()
    } catch {
      setError('Could not save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  // In edit mode the form has no "kind" field, so start from the entry's own values and let the form's fields override them.
  const save = (submitted: EntryValues) => {
    const values = { ...initial, ...submitted }
    const missing = missingFields(values)
    if (missing.length > 0) return setError(`Missing: ${missing.join(', ')}.`)
    const moved = editing && editing.date !== values.date
    return run(async () => {
      if (values.kind === 'expense') {
        await (editing ? updateExpense(toExpense(values, entryId(editing))) : createExpense(toExpense(values)))
      } else {
        await (editing ? updateIncome(toIncome(values, entryId(editing))) : createIncome(toIncome(values)))
      }
      // The cache patch only knows the new date's ranges; a moved entry must also leave the range it came from.
      if (moved) await queryClient.invalidateQueries({ queryKey: [values.kind === 'expense' ? 'expenses' : 'incomes'] })
    })
  }

  const remove = () => run(() => (editing!.kind === 'expense' ? deleteExpense(entryId(editing!)) : deleteIncome(entryId(editing!))))

  return (
    <Form<EntryValues> form={form} layout="vertical" initialValues={initial} onFinish={save} requiredMark={false}>
      {!editing && (
        <Form.Item name="kind">
          <Segmented<EntryKind>
            block
            options={[
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' },
            ]}
            onChange={() =>
              form.setFieldsValue({ categoryId: undefined, vendorId: undefined, paymentMethodId: undefined, sourceId: undefined })
            }
          />
        </Form.Item>
      )}

      {suggestions.length > 0 && (
        <Form.Item label="Start from">
          <Space size={[8, 8]} wrap>
            {suggestions.map((s) => (
              <Tag.CheckableTag key={s.key} checked={false} onChange={() => form.setFieldsValue(s.values)}>
                {s.label}
              </Tag.CheckableTag>
            ))}
          </Space>
        </Form.Item>
      )}

      <Form.Item name="amount" label="Amount" rules={[{ required: true, type: 'number', min: 0.01, message: 'Enter an amount' }]}>
        <InputNumber autoFocus={!editing} min={0} precision={2} prefix="$" controls={false} inputMode="decimal" style={{ width: '100%' }} />
      </Form.Item>

      {kind === 'expense' ? (
        <>
          <Form.Item name="vendorId" label="Vendor" rules={[{ required: true, message: 'Choose a vendor' }]}>
            <LookupSelect
              placeholder="Vendor"
              options={options(vendors, (v) => v.vendorID)}
              onCreate={(displayName) => createVendor({ displayName, description: displayName }).then(({ vendorID }) => vendorID)}
            />
          </Form.Item>
          <Form.Item name="categoryId" label="Category" rules={[{ required: true, message: 'Choose a category' }]}>
            <LookupSelect placeholder="Category" options={options(expenseCategories, (c) => c.expenseCategoryID)} />
          </Form.Item>
          <Form.Item name="paymentMethodId" label="Payment method" rules={[{ required: true, message: 'Choose a payment method' }]}>
            <LookupSelect placeholder="Payment method" options={options(paymentMethods, (m) => m.paymentMethodID)} />
          </Form.Item>
        </>
      ) : (
        <>
          <Form.Item name="sourceId" label="Source" rules={[{ required: true, message: 'Choose a source' }]}>
            <LookupSelect placeholder="Source" options={options(incomeSources, (s) => s.incomeSourceID)} />
          </Form.Item>
          <Form.Item name="categoryId" label="Category" rules={[{ required: true, message: 'Choose a category' }]}>
            <LookupSelect placeholder="Category" options={options(incomeCategories, (c) => c.incomeCategoryID)} />
          </Form.Item>
        </>
      )}

      <Form.Item
        name="date"
        label="Date"
        rules={[{ required: true, message: 'Choose a date' }]}
        getValueProps={(value?: string) => ({ value: value ? dayjs(value) : null })}
        normalize={(value: dayjs.Dayjs | null) => (value ? value.format('YYYY-MM-DD') : undefined)}
      >
        <DatePicker allowClear={false} style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item name="note" label="Note">
        <Input maxLength={512} />
      </Form.Item>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

      <Space wrap>
        <Button type="primary" htmlType="submit" loading={saving}>
          Save
        </Button>
        {editing && (
          <>
            <Button onClick={() => onDuplicate(addState(duplicateValues(editing, now)))}>Duplicate</Button>
            <Popconfirm title="Delete this entry?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={remove}>
              <Button danger>Delete</Button>
            </Popconfirm>
          </>
        )}
      </Space>
    </Form>
  )
}

export default EntryDrawer
