/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface Budget {
  /** @format int32 */
  budgetID?: number
  /** @format int32 */
  expenseCategoryID?: number
  /** @format double */
  amount?: number
  /** @format date */
  fromDate: string
  /** @format date */
  toDate: string
  expenseCategory?: ExpenseCategory
}

export interface Expense {
  /** @format int32 */
  expenseID?: number
  /** @format int32 */
  expenseCategoryID?: number
  /** @format int32 */
  vendorID?: number
  /** @format int32 */
  paymentMethodID?: number
  /** @format double */
  amount?: number
  /** @format date */
  date?: string
  /**
   * @minLength 0
   * @maxLength 512
   */
  note?: string | null
  expenseCategory?: ExpenseCategory
  vendor?: Vendor
  paymentMethod?: PaymentMethod
}

export interface ExpenseCategory {
  /** @format int32 */
  expenseCategoryID?: number
  /**
   * @minLength 0
   * @maxLength 64
   */
  displayName: string | null
  /**
   * @minLength 0
   * @maxLength 256
   */
  description: string | null
}

export interface ExpenseSummary {
  periods: ExpenseSummaryPeriod[] | null
}

export interface ExpenseSummaryPeriod {
  /** @format date */
  fromDate: string
  /** @format date */
  toDate: string
  /** @format double */
  amount: number
  /** @format int32 */
  expenseCategoryID?: number | null
}

export interface Income {
  /** @format int32 */
  incomeID?: number
  /** @format int32 */
  incomeCategoryID?: number
  /** @format int32 */
  incomeSourceID?: number
  /** @format double */
  amount?: number
  /** @format date */
  date?: string
  /**
   * @minLength 0
   * @maxLength 512
   */
  note?: string | null
  incomeCategory?: IncomeCategory
  incomeSource?: IncomeSource
}

export interface IncomeCategory {
  /** @format int32 */
  incomeCategoryID?: number
  /**
   * @minLength 0
   * @maxLength 64
   */
  displayName: string | null
  /**
   * @minLength 0
   * @maxLength 256
   */
  description: string | null
}

export interface IncomeSource {
  /** @format int32 */
  incomeSourceID?: number
  /**
   * @minLength 0
   * @maxLength 64
   */
  displayName: string | null
  /**
   * @minLength 0
   * @maxLength 256
   */
  description: string | null
}

export interface PaymentMethod {
  /** @format int32 */
  paymentMethodID?: number
  /**
   * @minLength 0
   * @maxLength 64
   */
  displayName: string | null
  /**
   * @minLength 0
   * @maxLength 256
   */
  description: string | null
}

export interface Vendor {
  /** @format int32 */
  vendorID?: number
  /**
   * @minLength 0
   * @maxLength 64
   */
  displayName: string | null
  /**
   * @minLength 0
   * @maxLength 256
   */
  description: string | null
}

export type QueryParamsType = Record<string | number, any>
export type ResponseFormat = keyof Omit<Body, 'body' | 'bodyUsed'>

export interface FullRequestParams extends Omit<RequestInit, 'body'> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean
  /** request path */
  path: string
  /** content type of request body */
  type?: ContentType
  /** query params */
  query?: QueryParamsType
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat
  /** request body */
  body?: unknown
  /** base url */
  baseUrl?: string
  /** request cancellation token */
  cancelToken?: CancelToken
}

export type RequestParams = Omit<FullRequestParams, 'body' | 'method' | 'query' | 'path'>

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string
  baseApiParams?: Omit<RequestParams, 'baseUrl' | 'cancelToken' | 'signal'>
  securityWorker?: (securityData: SecurityDataType | null) => Promise<RequestParams | void> | RequestParams | void
  customFetch?: typeof fetch
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown> extends Response {
  data: D
  error: E
}

type CancelToken = Symbol | string | number

export enum ContentType {
  Json = 'application/json',
  FormData = 'multipart/form-data',
  UrlEncoded = 'application/x-www-form-urlencoded',
  Text = 'text/plain',
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = ''
  private securityData: SecurityDataType | null = null
  private securityWorker?: ApiConfig<SecurityDataType>['securityWorker']
  private abortControllers = new Map<CancelToken, AbortController>()
  private customFetch = (...fetchParams: Parameters<typeof fetch>) => fetch(...fetchParams)

  private baseApiParams: RequestParams = {
    credentials: 'same-origin',
    headers: {},
    redirect: 'follow',
    referrerPolicy: 'no-referrer',
  }

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig)
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data
  }

  protected encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key)
    return `${encodedKey}=${encodeURIComponent(typeof value === 'number' ? value : `${value}`)}`
  }

  protected addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key])
  }

  protected addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key]
    return value.map((v: any) => this.encodeQueryParam(key, v)).join('&')
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {}
    const keys = Object.keys(query).filter((key) => 'undefined' !== typeof query[key])
    return keys.map((key) => (Array.isArray(query[key]) ? this.addArrayQueryParam(query, key) : this.addQueryParam(query, key))).join('&')
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery)
    return queryString ? `?${queryString}` : ''
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === 'object' || typeof input === 'string') ? JSON.stringify(input) : input,
    [ContentType.Text]: (input: any) => (input !== null && typeof input !== 'string' ? JSON.stringify(input) : input),
    [ContentType.FormData]: (input: any) =>
      Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key]
        formData.append(
          key,
          property instanceof Blob ? property : typeof property === 'object' && property !== null ? JSON.stringify(property) : `${property}`
        )
        return formData
      }, new FormData()),
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  }

  protected mergeRequestParams(params1: RequestParams, params2?: RequestParams): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    }
  }

  protected createAbortSignal = (cancelToken: CancelToken): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken)
      if (abortController) {
        return abortController.signal
      }
      return void 0
    }

    const abortController = new AbortController()
    this.abortControllers.set(cancelToken, abortController)
    return abortController.signal
  }

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken)

    if (abortController) {
      abortController.abort()
      this.abortControllers.delete(cancelToken)
    }
  }

  public request = async <T = any, E = any>({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params
  }: FullRequestParams): Promise<HttpResponse<T, E>> => {
    const secureParams =
      ((typeof secure === 'boolean' ? secure : this.baseApiParams.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {}
    const requestParams = this.mergeRequestParams(params, secureParams)
    const queryString = query && this.toQueryString(query)
    const payloadFormatter = this.contentFormatters[type || ContentType.Json]
    const responseFormat = format || requestParams.format

    return this.customFetch(`${baseUrl || this.baseUrl || ''}${path}${queryString ? `?${queryString}` : ''}`, {
      ...requestParams,
      headers: {
        ...(requestParams.headers || {}),
        ...(type && type !== ContentType.FormData ? { 'Content-Type': type } : {}),
      },
      signal: (cancelToken ? this.createAbortSignal(cancelToken) : requestParams.signal) || null,
      body: typeof body === 'undefined' || body === null ? null : payloadFormatter(body),
    }).then(async (response) => {
      const r = response.clone() as HttpResponse<T, E>
      r.data = null as unknown as T
      r.error = null as unknown as E

      const data = !responseFormat
        ? r
        : await response[responseFormat]()
            .then((data) => {
              if (r.ok) {
                r.data = data
              } else {
                r.error = data
              }
              return r
            })
            .catch((e) => {
              r.error = e
              return r
            })

      if (cancelToken) {
        this.abortControllers.delete(cancelToken)
      }

      if (!response.ok) throw data
      return data
    })
  }
}

/**
 * @title WebApi
 * @version 1.0
 */
export class Api<SecurityDataType extends unknown> extends HttpClient<SecurityDataType> {
  api = {
    /**
     * No description
     *
     * @tags BudgetApi
     * @name GetBudgets
     * @request GET:/api/budgets
     */
    getBudgets: (params: RequestParams = {}) =>
      this.request<Budget[], any>({
        path: `/api/budgets`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags BudgetApi
     * @name CreateBudget
     * @request POST:/api/budgets
     */
    createBudget: (data: Budget, params: RequestParams = {}) =>
      this.request<Budget, any>({
        path: `/api/budgets`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags BudgetApi
     * @name UpdateBudget
     * @request PUT:/api/budgets/{budgetId}
     */
    updateBudget: (budgetId: number, data: Budget, params: RequestParams = {}) =>
      this.request<Budget, any>({
        path: `/api/budgets/${budgetId}`,
        method: 'PUT',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags BudgetApi
     * @name DeleteBudget
     * @request DELETE:/api/budgets/{budgetId}
     */
    deleteBudget: (budgetId: number, params: RequestParams = {}) =>
      this.request<Budget, any>({
        path: `/api/budgets/${budgetId}`,
        method: 'DELETE',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags ExpenseApi
     * @name GetExpenses
     * @request GET:/api/expenses
     */
    getExpenses: (
      query: {
        /** @format date */
        fromDate: string
        /** @format date */
        toDate: string
      },
      params: RequestParams = {}
    ) =>
      this.request<Expense[], any>({
        path: `/api/expenses`,
        method: 'GET',
        query: query,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags ExpenseApi
     * @name CreateExpense
     * @request POST:/api/expenses
     */
    createExpense: (data: Expense, params: RequestParams = {}) =>
      this.request<Expense, any>({
        path: `/api/expenses`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags ExpenseApi
     * @name UpdateExpense
     * @request PUT:/api/expenses/{expenseId}
     */
    updateExpense: (expenseId: number, data: Expense, params: RequestParams = {}) =>
      this.request<Expense, any>({
        path: `/api/expenses/${expenseId}`,
        method: 'PUT',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags ExpenseApi
     * @name DeleteExpense
     * @request DELETE:/api/expenses/{expenseId}
     */
    deleteExpense: (expenseId: number, params: RequestParams = {}) =>
      this.request<Expense, any>({
        path: `/api/expenses/${expenseId}`,
        method: 'DELETE',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags ExpenseApi
     * @name GetExpenseSummary
     * @request GET:/api/expenses/summary
     */
    getExpenseSummary: (
      query: {
        /** @format date */
        fromDate: string
        /** @format date */
        toDate: string
        aggregateExpenseCategoryID?: boolean
      },
      params: RequestParams = {}
    ) =>
      this.request<ExpenseSummary, any>({
        path: `/api/expenses/summary`,
        method: 'GET',
        query: query,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags ExpenseCategoryApi
     * @name GetExpenseCategories
     * @request GET:/api/expense-categories
     */
    getExpenseCategories: (params: RequestParams = {}) =>
      this.request<ExpenseCategory[], any>({
        path: `/api/expense-categories`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags ExpenseCategoryApi
     * @name CreateExpenseCategory
     * @request POST:/api/expense-categories
     */
    createExpenseCategory: (data: ExpenseCategory, params: RequestParams = {}) =>
      this.request<ExpenseCategory, any>({
        path: `/api/expense-categories`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags ExpenseCategoryApi
     * @name UpdateExpenseCategory
     * @request PUT:/api/expense-categories/{expenseCategoryId}
     */
    updateExpenseCategory: (expenseCategoryId: number, data: ExpenseCategory, params: RequestParams = {}) =>
      this.request<ExpenseCategory, any>({
        path: `/api/expense-categories/${expenseCategoryId}`,
        method: 'PUT',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags ExpenseCategoryApi
     * @name DeleteExpenseCategory
     * @request DELETE:/api/expense-categories/{expenseCategoryId}
     */
    deleteExpenseCategory: (expenseCategoryId: number, params: RequestParams = {}) =>
      this.request<ExpenseCategory, any>({
        path: `/api/expense-categories/${expenseCategoryId}`,
        method: 'DELETE',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags IncomeApi
     * @name GetIncomes
     * @request GET:/api/incomes
     */
    getIncomes: (
      query: {
        /** @format date */
        fromDate: string
        /** @format date */
        toDate: string
      },
      params: RequestParams = {}
    ) =>
      this.request<Income[], any>({
        path: `/api/incomes`,
        method: 'GET',
        query: query,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags IncomeApi
     * @name CreateIncome
     * @request POST:/api/incomes
     */
    createIncome: (data: Income, params: RequestParams = {}) =>
      this.request<Income, any>({
        path: `/api/incomes`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags IncomeApi
     * @name UpdateIncome
     * @request PUT:/api/incomes/{incomeId}
     */
    updateIncome: (incomeId: number, data: Income, params: RequestParams = {}) =>
      this.request<Income, any>({
        path: `/api/incomes/${incomeId}`,
        method: 'PUT',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags IncomeApi
     * @name DeleteIncome
     * @request DELETE:/api/incomes/{incomeId}
     */
    deleteIncome: (incomeId: number, params: RequestParams = {}) =>
      this.request<Income, any>({
        path: `/api/incomes/${incomeId}`,
        method: 'DELETE',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags IncomeCategoryApi
     * @name GetIncomeCategories
     * @request GET:/api/income-categories
     */
    getIncomeCategories: (params: RequestParams = {}) =>
      this.request<IncomeCategory[], any>({
        path: `/api/income-categories`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags IncomeCategoryApi
     * @name CreateIncomeCategory
     * @request POST:/api/income-categories
     */
    createIncomeCategory: (data: IncomeCategory, params: RequestParams = {}) =>
      this.request<IncomeCategory, any>({
        path: `/api/income-categories`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags IncomeCategoryApi
     * @name UpdateIncomeCategory
     * @request PUT:/api/income-categories/{incomeCategoryId}
     */
    updateIncomeCategory: (incomeCategoryId: number, data: IncomeCategory, params: RequestParams = {}) =>
      this.request<IncomeCategory, any>({
        path: `/api/income-categories/${incomeCategoryId}`,
        method: 'PUT',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags IncomeCategoryApi
     * @name DeleteIncomeCategory
     * @request DELETE:/api/income-categories/{incomeCategoryId}
     */
    deleteIncomeCategory: (incomeCategoryId: number, params: RequestParams = {}) =>
      this.request<IncomeCategory, any>({
        path: `/api/income-categories/${incomeCategoryId}`,
        method: 'DELETE',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags IncomeSourceApi
     * @name GetIncomeSources
     * @request GET:/api/income-sources
     */
    getIncomeSources: (params: RequestParams = {}) =>
      this.request<IncomeSource[], any>({
        path: `/api/income-sources`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags IncomeSourceApi
     * @name CreateIncomeSource
     * @request POST:/api/income-sources
     */
    createIncomeSource: (data: IncomeSource, params: RequestParams = {}) =>
      this.request<IncomeSource, any>({
        path: `/api/income-sources`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags IncomeSourceApi
     * @name UpdateIncomeSource
     * @request PUT:/api/income-sources/{incomeSourceId}
     */
    updateIncomeSource: (incomeSourceId: number, data: IncomeSource, params: RequestParams = {}) =>
      this.request<IncomeSource, any>({
        path: `/api/income-sources/${incomeSourceId}`,
        method: 'PUT',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags IncomeSourceApi
     * @name DeleteIncomeSource
     * @request DELETE:/api/income-sources/{incomeSourceId}
     */
    deleteIncomeSource: (incomeSourceId: number, params: RequestParams = {}) =>
      this.request<IncomeSource, any>({
        path: `/api/income-sources/${incomeSourceId}`,
        method: 'DELETE',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags PaymentMethodApi
     * @name GetPaymentMethods
     * @request GET:/api/payment-methods
     */
    getPaymentMethods: (params: RequestParams = {}) =>
      this.request<PaymentMethod[], any>({
        path: `/api/payment-methods`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags PaymentMethodApi
     * @name CreatePaymentMethod
     * @request POST:/api/payment-methods
     */
    createPaymentMethod: (data: PaymentMethod, params: RequestParams = {}) =>
      this.request<PaymentMethod, any>({
        path: `/api/payment-methods`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags PaymentMethodApi
     * @name UpdatePaymentMethod
     * @request PUT:/api/payment-methods/{paymentMethodId}
     */
    updatePaymentMethod: (paymentMethodId: number, data: PaymentMethod, params: RequestParams = {}) =>
      this.request<PaymentMethod, any>({
        path: `/api/payment-methods/${paymentMethodId}`,
        method: 'PUT',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags PaymentMethodApi
     * @name DeletePaymentMethod
     * @request DELETE:/api/payment-methods/{paymentMethodId}
     */
    deletePaymentMethod: (paymentMethodId: number, params: RequestParams = {}) =>
      this.request<PaymentMethod, any>({
        path: `/api/payment-methods/${paymentMethodId}`,
        method: 'DELETE',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags VendorApi
     * @name GetVendors
     * @request GET:/api/vendors
     */
    getVendors: (params: RequestParams = {}) =>
      this.request<Vendor[], any>({
        path: `/api/vendors`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags VendorApi
     * @name CreateVendor
     * @request POST:/api/vendors
     */
    createVendor: (data: Vendor, params: RequestParams = {}) =>
      this.request<Vendor, any>({
        path: `/api/vendors`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags VendorApi
     * @name UpdateVendor
     * @request PUT:/api/vendors/{vendorId}
     */
    updateVendor: (vendorId: number, data: Vendor, params: RequestParams = {}) =>
      this.request<Vendor, any>({
        path: `/api/vendors/${vendorId}`,
        method: 'PUT',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags VendorApi
     * @name DeleteVendor
     * @request DELETE:/api/vendors/{vendorId}
     */
    deleteVendor: (vendorId: number, params: RequestParams = {}) =>
      this.request<Vendor, any>({
        path: `/api/vendors/${vendorId}`,
        method: 'DELETE',
        format: 'json',
        ...params,
      }),
  }
}
