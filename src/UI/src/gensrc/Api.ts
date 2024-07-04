/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface Expense {
  /** @format int32 */
  expenseID?: number;
  /** @format int32 */
  expenseCategoryID?: number;
  /** @format int32 */
  vendorID?: number;
  /** @format int32 */
  paymentMethodID?: number;
  /** @format double */
  amount?: number;
  /** @format date */
  date?: string;
  /**
   * @minLength 0
   * @maxLength 512
   */
  note?: string | null;
  expenseCategory?: ExpenseCategory;
  vendor?: Vendor;
  paymentMethod?: PaymentMethod;
}

export interface ExpenseCategory {
  /** @format int32 */
  expenseCategoryID?: number;
  /**
   * @minLength 0
   * @maxLength 64
   */
  displayName?: string | null;
  /**
   * @minLength 0
   * @maxLength 256
   */
  description?: string | null;
}

export interface Income {
  /** @format int32 */
  incomeID?: number;
  /** @format int32 */
  incomeCategoryID?: number;
  /** @format int32 */
  incomeSourceID?: number;
  /** @format double */
  amount?: number;
  /** @format date */
  date?: string;
  /**
   * @minLength 0
   * @maxLength 512
   */
  note?: string | null;
  incomeCategory?: IncomeCategory;
  incomeSource?: IncomeSource;
}

export interface IncomeCategory {
  /** @format int32 */
  incomeCategoryID?: number;
  /**
   * @minLength 0
   * @maxLength 64
   */
  displayName?: string | null;
  /**
   * @minLength 0
   * @maxLength 256
   */
  description?: string | null;
}

export interface IncomeSource {
  /** @format int32 */
  incomeSourceID?: number;
  /**
   * @minLength 0
   * @maxLength 64
   */
  displayName?: string | null;
  /**
   * @minLength 0
   * @maxLength 256
   */
  description?: string | null;
}

export interface PaymentMethod {
  /** @format int32 */
  paymentMethodID?: number;
  /**
   * @minLength 0
   * @maxLength 64
   */
  displayName?: string | null;
  /**
   * @minLength 0
   * @maxLength 256
   */
  description?: string | null;
}

export interface Vendor {
  /** @format int32 */
  vendorID?: number;
  /**
   * @minLength 0
   * @maxLength 64
   */
  displayName?: string | null;
  /**
   * @minLength 0
   * @maxLength 256
   */
  description?: string | null;
}

import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, HeadersDefaults, ResponseType } from "axios";
import axios from "axios";

export type QueryParamsType = Record<string | number, any>;

export interface FullRequestParams extends Omit<AxiosRequestConfig, "data" | "params" | "url" | "responseType"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseType;
  /** request body */
  body?: unknown;
}

export type RequestParams = Omit<FullRequestParams, "body" | "method" | "query" | "path">;

export interface ApiConfig<SecurityDataType = unknown> extends Omit<AxiosRequestConfig, "data" | "cancelToken"> {
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<AxiosRequestConfig | void> | AxiosRequestConfig | void;
  secure?: boolean;
  format?: ResponseType;
}

export enum ContentType {
  Json = "application/json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public instance: AxiosInstance;
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private secure?: boolean;
  private format?: ResponseType;

  constructor({ securityWorker, secure, format, ...axiosConfig }: ApiConfig<SecurityDataType> = {}) {
    this.instance = axios.create({ ...axiosConfig, baseURL: axiosConfig.baseURL || "" });
    this.secure = secure;
    this.format = format;
    this.securityWorker = securityWorker;
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected mergeRequestParams(params1: AxiosRequestConfig, params2?: AxiosRequestConfig): AxiosRequestConfig {
    const method = params1.method || (params2 && params2.method);

    return {
      ...this.instance.defaults,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...((method && this.instance.defaults.headers[method.toLowerCase() as keyof HeadersDefaults]) || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected stringifyFormItem(formItem: unknown) {
    if (typeof formItem === "object" && formItem !== null) {
      return JSON.stringify(formItem);
    } else {
      return `${formItem}`;
    }
  }

  protected createFormData(input: Record<string, unknown>): FormData {
    return Object.keys(input || {}).reduce((formData, key) => {
      const property = input[key];
      const propertyContent: any[] = property instanceof Array ? property : [property];

      for (const formItem of propertyContent) {
        const isFileType = formItem instanceof Blob || formItem instanceof File;
        formData.append(key, isFileType ? formItem : this.stringifyFormItem(formItem));
      }

      return formData;
    }, new FormData());
  }

  public request = async <T = any, _E = any>({
    secure,
    path,
    type,
    query,
    format,
    body,
    ...params
  }: FullRequestParams): Promise<AxiosResponse<T>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const responseFormat = format || this.format || undefined;

    if (type === ContentType.FormData && body && body !== null && typeof body === "object") {
      body = this.createFormData(body as Record<string, unknown>);
    }

    if (type === ContentType.Text && body && body !== null && typeof body !== "string") {
      body = JSON.stringify(body);
    }

    return this.instance.request({
      ...requestParams,
      headers: {
        ...(requestParams.headers || {}),
        ...(type && type !== ContentType.FormData ? { "Content-Type": type } : {}),
      },
      params: query,
      responseType: responseFormat,
      data: body,
      url: path,
    });
  };
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
     * @tags Api
     * @name GetExpenses
     * @request GET:/api/expenses
     */
    getExpenses: (
      query: {
        /** @format date */
        fromDate: string;
        /** @format date */
        toDate: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<Expense[], any>({
        path: `/api/expenses`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name CreateExpense
     * @request POST:/api/expenses
     */
    createExpense: (data: Expense, params: RequestParams = {}) =>
      this.request<Expense, any>({
        path: `/api/expenses`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name UpdateExpense
     * @request PUT:/api/expenses/{expenseId}
     */
    updateExpense: (expenseId: number, data: Expense, params: RequestParams = {}) =>
      this.request<Expense, any>({
        path: `/api/expenses/${expenseId}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name DeleteExpense
     * @request DELETE:/api/expenses/{expenseId}
     */
    deleteExpense: (expenseId: number, params: RequestParams = {}) =>
      this.request<Expense, any>({
        path: `/api/expenses/${expenseId}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name GetExpenseCategories
     * @request GET:/api/expense-categories
     */
    getExpenseCategories: (params: RequestParams = {}) =>
      this.request<ExpenseCategory[], any>({
        path: `/api/expense-categories`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name CreateExpenseCategory
     * @request POST:/api/expense-categories
     */
    createExpenseCategory: (data: ExpenseCategory, params: RequestParams = {}) =>
      this.request<ExpenseCategory, any>({
        path: `/api/expense-categories`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name UpdateExpenseCategory
     * @request PUT:/api/expense-categories/{expenseCategoryId}
     */
    updateExpenseCategory: (expenseCategoryId: number, data: ExpenseCategory, params: RequestParams = {}) =>
      this.request<ExpenseCategory, any>({
        path: `/api/expense-categories/${expenseCategoryId}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name DeleteExpenseCategory
     * @request DELETE:/api/expense-categories/{expenseCategoryId}
     */
    deleteExpenseCategory: (expenseCategoryId: number, params: RequestParams = {}) =>
      this.request<ExpenseCategory, any>({
        path: `/api/expense-categories/${expenseCategoryId}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name GetIncomes
     * @request GET:/api/incomes
     */
    getIncomes: (
      query: {
        /** @format date */
        fromDate: string;
        /** @format date */
        toDate: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<Income[], any>({
        path: `/api/incomes`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name CreateIncome
     * @request POST:/api/incomes
     */
    createIncome: (data: Income, params: RequestParams = {}) =>
      this.request<Income, any>({
        path: `/api/incomes`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name UpdateIncome
     * @request PUT:/api/incomes/{incomeId}
     */
    updateIncome: (incomeId: number, data: Income, params: RequestParams = {}) =>
      this.request<Income, any>({
        path: `/api/incomes/${incomeId}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name DeleteIncome
     * @request DELETE:/api/incomes/{incomeId}
     */
    deleteIncome: (incomeId: number, params: RequestParams = {}) =>
      this.request<Income, any>({
        path: `/api/incomes/${incomeId}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name GetIncomeCategories
     * @request GET:/api/income-categories
     */
    getIncomeCategories: (params: RequestParams = {}) =>
      this.request<IncomeCategory[], any>({
        path: `/api/income-categories`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name CreateIncomeCategory
     * @request POST:/api/income-categories
     */
    createIncomeCategory: (data: IncomeCategory, params: RequestParams = {}) =>
      this.request<IncomeCategory, any>({
        path: `/api/income-categories`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name UpdateIncomeCategory
     * @request PUT:/api/income-categories/{incomeCategoryId}
     */
    updateIncomeCategory: (incomeCategoryId: number, data: IncomeCategory, params: RequestParams = {}) =>
      this.request<IncomeCategory, any>({
        path: `/api/income-categories/${incomeCategoryId}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name DeleteIncomeCategory
     * @request DELETE:/api/income-categories/{incomeCategoryId}
     */
    deleteIncomeCategory: (incomeCategoryId: number, params: RequestParams = {}) =>
      this.request<IncomeCategory, any>({
        path: `/api/income-categories/${incomeCategoryId}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name GetIncomeSources
     * @request GET:/api/income-sources
     */
    getIncomeSources: (params: RequestParams = {}) =>
      this.request<IncomeSource[], any>({
        path: `/api/income-sources`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name CreateIncomeSource
     * @request POST:/api/income-sources
     */
    createIncomeSource: (data: IncomeSource, params: RequestParams = {}) =>
      this.request<IncomeSource, any>({
        path: `/api/income-sources`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name UpdateIncomeSource
     * @request PUT:/api/income-sources/{incomeSourceId}
     */
    updateIncomeSource: (incomeSourceId: number, data: IncomeSource, params: RequestParams = {}) =>
      this.request<IncomeSource, any>({
        path: `/api/income-sources/${incomeSourceId}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name DeleteIncomeSource
     * @request DELETE:/api/income-sources/{incomeSourceId}
     */
    deleteIncomeSource: (incomeSourceId: number, params: RequestParams = {}) =>
      this.request<IncomeSource, any>({
        path: `/api/income-sources/${incomeSourceId}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name GetPaymentMethods
     * @request GET:/api/payment-methods
     */
    getPaymentMethods: (params: RequestParams = {}) =>
      this.request<PaymentMethod[], any>({
        path: `/api/payment-methods`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name CreatePaymentMethod
     * @request POST:/api/payment-methods
     */
    createPaymentMethod: (data: PaymentMethod, params: RequestParams = {}) =>
      this.request<PaymentMethod, any>({
        path: `/api/payment-methods`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name UpdatePaymentMethod
     * @request PUT:/api/payment-methods/{paymentMethodId}
     */
    updatePaymentMethod: (paymentMethodId: number, data: PaymentMethod, params: RequestParams = {}) =>
      this.request<PaymentMethod, any>({
        path: `/api/payment-methods/${paymentMethodId}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name DeletePaymentMethod
     * @request DELETE:/api/payment-methods/{paymentMethodId}
     */
    deletePaymentMethod: (paymentMethodId: number, params: RequestParams = {}) =>
      this.request<PaymentMethod, any>({
        path: `/api/payment-methods/${paymentMethodId}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name GetVendors
     * @request GET:/api/vendors
     */
    getVendors: (params: RequestParams = {}) =>
      this.request<Vendor[], any>({
        path: `/api/vendors`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name CreateVendor
     * @request POST:/api/vendors
     */
    createVendor: (data: Vendor, params: RequestParams = {}) =>
      this.request<Vendor, any>({
        path: `/api/vendors`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name UpdateVendor
     * @request PUT:/api/vendors/{vendorId}
     */
    updateVendor: (vendorId: number, data: Vendor, params: RequestParams = {}) =>
      this.request<Vendor, any>({
        path: `/api/vendors/${vendorId}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Api
     * @name DeleteVendor
     * @request DELETE:/api/vendors/{vendorId}
     */
    deleteVendor: (vendorId: number, params: RequestParams = {}) =>
      this.request<Vendor, any>({
        path: `/api/vendors/${vendorId}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),
  };
}
