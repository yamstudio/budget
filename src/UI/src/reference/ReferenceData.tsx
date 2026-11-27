import { useMemo, useState } from 'react'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Empty, Form, Grid, Input, Modal, Popconfirm, Select, Space, Spin, Tabs, Typography } from 'antd'
import { useSearchParams } from 'react-router'
import { ExpenseNecessity } from '../gensrc/Api'
import { parseReferenceParams, toReferenceSearch } from './referenceParams'
import type { ReferenceParams } from './referenceParams'
import { DESCRIPTION_MAX, NAME_MAX, searchRows, sortedByName, toRow, validateName, visibleDescription } from './referenceRows'
import type { ReferenceRow, ReferenceValues } from './referenceRows'
import {
  REFERENCE_TABLES,
  referenceErrorMessage,
  tableByKey,
  useDeleteReferenceRow,
  useReferenceRows,
  useSaveReferenceRow,
} from './referenceTables'
import type { ReferenceTable } from './referenceTables'

const MUTED = '#8c8c8c'
type Editing = { mode: 'add' } | { mode: 'edit'; row: ReferenceRow }

const ReferenceData = () => {
  const [search, setSearch] = useSearchParams()
  const params = useMemo(() => parseReferenceParams(search), [search])
  const update = (patch: Partial<ReferenceParams>) => setSearch(toReferenceSearch({ ...params, ...patch }), { replace: true })
  const narrow = !Grid.useBreakpoint().md
  const table = tableByKey(params.table)

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: narrow ? 12 : 24, minWidth: 0 }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        {narrow ? (
          // Five tabs do not fit on a phone, so choose the list from a dropdown there.
          <Select
            aria-label="List"
            value={params.table}
            onChange={(key) => update({ table: key, q: '' })}
            options={REFERENCE_TABLES.map((t) => ({ value: t.key, label: t.label }))}
            style={{ width: '100%', marginBottom: 12 }}
          />
        ) : (
          <Tabs
            activeKey={params.table}
            onChange={(key) => update({ table: key as ReferenceParams['table'], q: '' })}
            items={REFERENCE_TABLES.map((t) => ({ key: t.key, label: t.label }))}
          />
        )}
        {/* key resets the search and dialog state when switching tables */}
        <TableEditor key={table.key} table={table} q={params.q} onSearch={(q) => update({ q })} />
      </div>
    </div>
  )
}

const TableEditor = ({ table, q, onSearch }: { table: ReferenceTable; q: string; onSearch: (q: string) => void }) => {
  const rowsQuery = useReferenceRows(table)
  const [editing, setEditing] = useState<Editing | null>(null)
  const sorted = useMemo(() => sortedByName(rowsQuery.data), [rowsQuery.data])
  const shown = useMemo(() => searchRows(sorted, q), [sorted, q])

  return (
    <>
      <Space.Compact style={{ width: '100%' }}>
        <Input
          allowClear
          aria-label={`Search ${table.label.toLowerCase()}`}
          placeholder={`Search ${table.label.toLowerCase()}`}
          prefix={<SearchOutlined />}
          value={q}
          onChange={(e) => onSearch(e.target.value)}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing({ mode: 'add' })}>
          Add
        </Button>
      </Space.Compact>

      {rowsQuery.isError ? (
        <Alert type="error" showIcon message="Could not load the list." style={{ marginTop: 16 }} />
      ) : rowsQuery.isPending ? (
        <Spin size="large" style={{ display: 'block', margin: '48px auto' }} />
      ) : (
        <>
          <Typography.Text type="secondary" style={{ display: 'block', margin: '12px 4px 0' }}>
            {shown.length === sorted.length
              ? `${sorted.length} ${sorted.length === 1 ? 'entry' : 'entries'}`
              : `${shown.length} of ${sorted.length}`}
          </Typography.Text>
          {shown.length === 0 ? (
            <Empty
              description={sorted.length === 0 ? `No ${table.label.toLowerCase()} yet.` : 'Nothing matches.'}
              style={{ marginTop: 48 }}
            />
          ) : (
            <ul style={{ margin: 0, padding: 0 }}>
              {shown.map((row) => (
                <li key={table.idOf(row)} style={{ listStyle: 'none', borderBottom: '1px solid rgba(128,128,128,0.18)' }}>
                  <button
                    type="button"
                    onClick={() => setEditing({ mode: 'edit', row })}
                    aria-label={`${row.displayName}. Edit`}
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
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{ display: 'block', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {row.displayName}
                      </span>
                      {(visibleDescription(row) || (table.necessity && row.necessity)) && (
                        <span
                          style={{
                            display: 'block',
                            fontSize: 13,
                            color: MUTED,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {[
                            table.necessity && row.necessity !== ExpenseNecessity.Unclassified ? row.necessity : '',
                            visibleDescription(row),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <RowDialog table={table} rows={sorted} editing={editing} onClose={() => setEditing(null)} />
    </>
  )
}

const NECESSITY_OPTIONS = Object.values(ExpenseNecessity).map((value) => ({ value, label: value }))

const RowDialog = ({
  table,
  rows,
  editing,
  onClose,
}: {
  table: ReferenceTable
  rows: ReferenceRow[]
  editing: Editing | null
  onClose: () => void
}) => (
  <Modal
    open={editing !== null}
    onCancel={onClose}
    footer={null}
    destroyOnHidden
    title={editing?.mode === 'edit' ? `Edit ${table.singular}` : `Add ${table.singular}`}
  >
    {editing && <RowForm table={table} rows={rows} editing={editing} onClose={onClose} />}
  </Modal>
)

const RowForm = ({
  table,
  rows,
  editing,
  onClose,
}: {
  table: ReferenceTable
  rows: ReferenceRow[]
  editing: Editing
  onClose: () => void
}) => {
  const queryClient = useQueryClient()
  const save = useSaveReferenceRow(queryClient, table)
  const remove = useDeleteReferenceRow(queryClient, table)
  const [error, setError] = useState<string | null>(null)
  const row = editing.mode === 'edit' ? editing.row : undefined
  const editingIndex = row ? rows.indexOf(row) : undefined
  const [form] = Form.useForm<ReferenceValues>()

  const submit = (values: ReferenceValues) => {
    setError(null)
    save.mutate(
      { id: row ? table.idOf(row) : undefined, row: toRow(values) },
      { onSuccess: onClose, onError: (e) => setError(referenceErrorMessage(e, table, 'save')) }
    )
  }

  return (
    <Form<ReferenceValues>
      form={form}
      layout="vertical"
      requiredMark={false}
      initialValues={{
        displayName: row?.displayName ?? '',
        description: row && visibleDescription(row),
        necessity: table.necessity ? (row?.necessity ?? ExpenseNecessity.Unclassified) : undefined,
      }}
      onFinish={submit}
    >
      <Form.Item
        name="displayName"
        label="Name"
        rules={[
          {
            validator: (_, value: string) => {
              const message = validateName(value ?? '', rows, editingIndex)
              return message ? Promise.reject(new Error(message)) : Promise.resolve()
            },
          },
        ]}
      >
        <Input autoFocus maxLength={NAME_MAX + 20} />
      </Form.Item>
      <Form.Item name="description" label="Description (optional)" rules={[{ max: DESCRIPTION_MAX }]}>
        <Input />
      </Form.Item>
      {table.necessity && (
        <Form.Item name="necessity" label="Essential or discretionary">
          <Select options={NECESSITY_OPTIONS} />
        </Form.Item>
      )}
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Space wrap>
        <Button type="primary" htmlType="submit" loading={save.isPending}>
          Save
        </Button>
        {row && (
          <Popconfirm
            title={`Delete this ${table.singular}?`}
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() =>
              remove.mutate(table.idOf(row), { onSuccess: onClose, onError: (e) => setError(referenceErrorMessage(e, table, 'delete')) })
            }
          >
            <Button danger loading={remove.isPending}>
              Delete
            </Button>
          </Popconfirm>
        )}
      </Space>
    </Form>
  )
}

export default ReferenceData
