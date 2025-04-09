import React, { useMemo } from 'react'
import { MoreOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Dropdown, MenuProps } from 'antd'
import { useExpenseCategories, useExpenseTemplates, usePaymentMethods, useVendors } from './Queries'
import type { ExpenseTemplate } from './gensrc/Api'

type AddExpenseButtonsProps = {
  disabled: boolean
  addExpenseRow: (template: ExpenseTemplate) => void
}
type ExpenseTemplateOption = {
  template: ExpenseTemplate
  key: string
  label: string
  expenseCategory?: string | null
  paymentMethod?: string | null
  vendor?: string | null
}

const EMPTY: ExpenseTemplate = {
  amount: null,
  expenseCategoryID: null,
  paymentMethodID: null,
  vendorID: null,
}

const AddExpenseButtons = ({ disabled, addExpenseRow }: AddExpenseButtonsProps) => {
  const expenseTemplates = useExpenseTemplates().data
  const expenseCategories = useExpenseCategories().data
  const paymentMethods = usePaymentMethods().data
  const vendors = useVendors().data
  const expenseTemplateOptions: ExpenseTemplateOption[] | undefined = useMemo(() => {
    if (!expenseTemplates || !expenseCategories || !paymentMethods || !vendors) {
      return undefined
    }
    return expenseTemplates
      .map((template: ExpenseTemplate) => ({
        template,
        key: `${template.expenseCategoryID}-${template.paymentMethodID}-${template.vendorID}-${template.amount}`,
        expenseCategory: expenseCategories.find((expenseCategory) => template.expenseCategoryID === expenseCategory.expenseCategoryID)
          ?.displayName,
        paymentMethod: paymentMethods.find((paymentMethod) => template.paymentMethodID === paymentMethod.paymentMethodID)?.displayName,
        vendor: vendors.find((vendor) => template.vendorID === vendor.vendorID)?.displayName,
      }))
      .filter((template) => template.expenseCategory && template.paymentMethod && template.vendor)
      .map((option) => ({
        ...option,
        label: `${option.paymentMethod!.split(' ')[0]}@${option.vendor!.replace(/\s\(.*\)$/g, '')}`,
      }))
  }, [expenseTemplates, expenseCategories, paymentMethods, vendors]) satisfies MenuProps['items'] | undefined
  const menuProps: MenuProps = {
    items:
      expenseTemplateOptions?.map(({ key, label }) => ({
        key,
        label,
      })) ?? [],
    onClick: ({ key }) => {
      const template = expenseTemplateOptions?.find((option) => option.key === key)?.template
      if (template) {
        addExpenseRow(template)
      }
    },
  }
  return (
    <div className="budget-grid-controls">
      <Button className="budget-grid-control" disabled={disabled} onClick={() => addExpenseRow(EMPTY)}>
        <PlusOutlined></PlusOutlined>
      </Button>
      <Dropdown menu={menuProps} disabled={disabled || !expenseTemplateOptions?.length}>
        <Button className="budget-grid-control">
          <MoreOutlined></MoreOutlined>
        </Button>
      </Dropdown>
    </div>
  )
}

export default AddExpenseButtons
