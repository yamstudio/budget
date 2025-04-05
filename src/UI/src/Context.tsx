import { Context, createContext } from 'react'
import { Api, ExpenseCategory, IncomeCategory, IncomeSource, PaymentMethod, Vendor } from './gensrc/Api'

type ApiContext = Api<never>['api'] | undefined
export const ApiContext: Context<ApiContext> = createContext(undefined as ApiContext)
type ExpenseCategoriesContext = { expenseCategories: ExpenseCategory[] | undefined }
export const ExpenseCategoriesContext: Context<ExpenseCategoriesContext> = createContext({
  expenseCategories: undefined as ExpenseCategory[] | undefined,
})
type VendorsContext = { vendors: Vendor[] | undefined; addVendor: (vendorDisplayName: string) => Promise<Vendor> }
export const VendorsContext: Context<VendorsContext> = createContext({
  vendors: undefined as Vendor[] | undefined,
  addVendor: (vendorDisplayName) => Promise.reject('Cannot create ' + vendorDisplayName),
})
type IncomeCategoriesContext = { incomeCategories: IncomeCategory[] | undefined }
export const IncomeCategoriesContext: Context<IncomeCategoriesContext> = createContext({
  incomeCategories: undefined as IncomeCategory[] | undefined,
})
type PaymentMethodsContext = {
  paymentMethods: PaymentMethod[] | undefined
  addPaymentMethod: (paymentMethodDisplayName: string) => Promise<PaymentMethod>
}
export const PaymentMethodsContext: Context<PaymentMethodsContext> = createContext({
  paymentMethods: undefined as PaymentMethod[] | undefined,
  addPaymentMethod: (paymentMethodDisplayName) => Promise.reject('Cannot create ' + paymentMethodDisplayName),
})
type IncomeSourcesContext = { incomeSources: IncomeSource[] | undefined }
export const IncomeSourcesContext: Context<IncomeSourcesContext> = createContext({ incomeSources: undefined as IncomeSource[] | undefined })
