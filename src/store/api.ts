"use client";
/**
 * RTK Query: mọi dữ liệu trang quản trị đi qua đây.
 *  - Tải 1 lần, lưu cache trong Redux + localStorage (redux-persist) => F5 hiển thị ngay từ cache
 *  - Tự làm mới ngầm nếu cache cũ hơn 30 giây (refetchOnMountOrArgChange)
 *  - Ghi dữ liệu (mutation) => invalidate tag => chỉ tải lại phần liên quan
 *  - 401 => tự gọi /api/auth/refresh (xoay vòng refresh token) rồi thử lại, có mutex chống gọi trùng
 */
import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import type { Action } from "@reduxjs/toolkit";
import { REHYDRATE } from "redux-persist";
import type * as T from "./types";

const raw = fetchBaseQuery({ baseUrl: "/api", credentials: "include" });

let refreshing: Promise<boolean> | null = null;
async function doRefresh(): Promise<boolean> {
  refreshing ??= fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => setTimeout(() => (refreshing = null), 0));
  return refreshing;
}

const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extra) => {
  let res = await raw(args, api, extra);
  if (res.error?.status === 401) {
    if (await doRefresh()) res = await raw(args, api, extra);
    else if (typeof window !== "undefined") {
      api.dispatch({ type: "session/expired" });
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    }
  }
  // Server trả { ok, data } => bóc lớp data
  if (res.data && typeof res.data === "object" && "data" in (res.data as object)) {
    return { ...res, data: (res.data as { data: unknown }).data };
  }
  return res;
};

/** Lấy thông báo lỗi tiếng Việt từ response */
export function errorMessage(e: unknown): string {
  const err = e as { data?: { error?: string }; error?: string; status?: number | string };
  return err?.data?.error ?? err?.error ?? "Có lỗi xảy ra";
}

type Id = { id: string };
type Paged<X> = { items: X[]; total: number; page: number; size: number };

export const api = createApi({
  reducerPath: "api",
  baseQuery,
  keepUnusedDataFor: 60 * 60, // giữ cache 1 giờ
  refetchOnMountOrArgChange: 30, // dữ liệu > 30s thì làm mới ngầm khi mở lại trang
  refetchOnFocus: true,
  refetchOnReconnect: true,
  extractRehydrationInfo(action: Action, { reducerPath }) {
    const a = action as Action & { key?: string; payload?: Record<string, unknown> };
    if (a.type === REHYDRATE && a.key === "dk-admin" && a.payload) {
      return a.payload[reducerPath] as never;
    }
  },
  tagTypes: ["Me", "Dashboard", "Booking", "Customer", "Employee", "User", "Role", "Tour", "Invoice", "Settings", "Domain", "Audit", "Catalog", "Resource", "Reservation", "Contract", "Tax", "Store"],
  endpoints: (b) => ({
    me: b.query<T.Me, void>({ query: () => "/auth/me", providesTags: ["Me"] }),
    dashboard: b.query<T.Dashboard, void>({ query: () => "/v1/dashboard", providesTags: ["Dashboard"] }),

    bookings: b.query<Paged<T.Booking> & { counts: Record<string, number> }, { status?: string; q?: string; page?: number }>({
      query: (p) => ({ url: "/v1/bookings", params: p }),
      providesTags: ["Booking"],
    }),
    booking: b.query<T.Booking & { unitPrice: { adult: number; child: number } | null; lines: { itemName: string; unit: string; quantity: number; unitPrice: number }[] }, string>({ query: (id) => `/v1/bookings/${id}`, providesTags: ["Booking"] }),
    createBooking: b.mutation<T.Booking, Partial<T.Booking>>({
      query: (body) => ({ url: "/v1/bookings", method: "POST", body }),
      invalidatesTags: ["Booking", "Dashboard", "Customer"],
    }),
    updateBooking: b.mutation<T.Booking, Id & Partial<T.Booking>>({
      query: ({ id, ...body }) => ({ url: `/v1/bookings/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Booking", "Dashboard", "Tour"],
    }),
    deleteBooking: b.mutation<Id, string>({
      query: (id) => ({ url: `/v1/bookings/${id}`, method: "DELETE" }),
      invalidatesTags: ["Booking", "Dashboard", "Tour"],
    }),

    customers: b.query<Paged<T.Customer>, { q?: string; page?: number }>({
      query: (p) => ({ url: "/v1/customers", params: p }),
      providesTags: ["Customer"],
    }),
    customer: b.query<T.CustomerDetail, string>({ query: (id) => `/v1/customers/${id}`, providesTags: ["Customer", "Invoice"] }),
    saveCustomer: b.mutation<T.Customer, Partial<T.Customer>>({
      query: ({ id, ...body }) => ({ url: id ? `/v1/customers/${id}` : "/v1/customers", method: id ? "PATCH" : "POST", body }),
      invalidatesTags: ["Customer", "Dashboard"],
    }),

    employees: b.query<{ items: T.Employee[]; branches: { id: string; name: string }[] }, { q?: string }>({
      query: (p) => ({ url: "/v1/employees", params: p }),
      providesTags: ["Employee"],
    }),
    saveEmployee: b.mutation<T.Employee, Partial<T.Employee>>({
      query: ({ id, ...body }) => ({ url: id ? `/v1/employees/${id}` : "/v1/employees", method: id ? "PATCH" : "POST", body }),
      invalidatesTags: ["Employee"],
    }),
    deleteEmployee: b.mutation<Id, string>({ query: (id) => ({ url: `/v1/employees/${id}`, method: "DELETE" }), invalidatesTags: ["Employee"] }),

    users: b.query<{ items: T.UserRow[]; roles: T.Role[] }, void>({ query: () => "/v1/users", providesTags: ["User", "Role"] }),
    createUser: b.mutation<Id, { fullName: string; email?: string; phone?: string; password: string; roleIds: string[] }>({
      query: (body) => ({ url: "/v1/users", method: "POST", body }),
      invalidatesTags: ["User"],
    }),
    updateUser: b.mutation<Id, Id & { fullName?: string; status?: string; roleIds?: string[]; password?: string }>({
      query: ({ id, ...body }) => ({ url: `/v1/users/${id}`, method: "PATCH", body }),
      invalidatesTags: ["User"],
    }),
    saveRole: b.mutation<T.Role, Partial<T.Role>>({
      query: ({ id, ...body }) => ({ url: id ? `/v1/roles/${id}` : "/v1/roles", method: id ? "PATCH" : "POST", body }),
      invalidatesTags: ["Role"],
    }),
    deleteRole: b.mutation<Id, string>({ query: (id) => ({ url: `/v1/roles/${id}`, method: "DELETE" }), invalidatesTags: ["Role", "User"] }),

    tours: b.query<T.Tour[], void>({ query: () => "/v1/tours", providesTags: ["Tour"] }),
    tour: b.query<T.TourDetail, string>({ query: (id) => `/v1/tours/${id}`, providesTags: ["Tour"] }),
    saveTour: b.mutation<T.Tour, Partial<T.Tour>>({
      query: ({ id, ...body }) => ({ url: id ? `/v1/tours/${id}` : "/v1/tours", method: id ? "PATCH" : "POST", body }),
      invalidatesTags: ["Tour"],
    }),
    deleteTour: b.mutation<Id, string>({ query: (id) => ({ url: `/v1/tours/${id}`, method: "DELETE" }), invalidatesTags: ["Tour"] }),
    saveDeparture: b.mutation<T.Departure, Partial<T.Departure> & { tourId?: string }>({
      query: ({ id, tourId, ...body }) => ({ url: id ? `/v1/departures/${id}` : `/v1/tours/${tourId}/departures`, method: id ? "PATCH" : "POST", body }),
      invalidatesTags: ["Tour"],
    }),
    deleteDeparture: b.mutation<Id, string>({ query: (id) => ({ url: `/v1/departures/${id}`, method: "DELETE" }), invalidatesTags: ["Tour"] }),

    invoices: b.query<Paged<T.Invoice>, { status?: string; q?: string; page?: number }>({
      query: (p) => ({ url: "/v1/invoices", params: p }),
      providesTags: ["Invoice"],
    }),
    invoice: b.query<T.InvoiceFull, string>({ query: (id) => `/v1/invoices/${id}`, providesTags: ["Invoice"] }),
    createInvoice: b.mutation<T.Invoice, T.InvoiceInput>({
      query: (body) => ({ url: "/v1/invoices", method: "POST", body }),
      invalidatesTags: ["Invoice", "Dashboard", "Customer"],
    }),
    addPayment: b.mutation<T.Invoice, Id & { amount: number; method: string; reference?: string }>({
      query: ({ id, ...body }) => ({ url: `/v1/invoices/${id}/payments`, method: "POST", body }),
      invalidatesTags: ["Invoice", "Dashboard", "Customer"],
    }),
    cancelInvoice: b.mutation<T.Invoice, Id & { reason: string }>({
      query: ({ id, ...body }) => ({ url: `/v1/invoices/${id}/cancel`, method: "POST", body }),
      invalidatesTags: ["Invoice", "Dashboard"],
    }),
    einvoice: b.mutation<T.EInvoiceData & { status: string; xml?: string }, Id & { action: "create" | "publish"; signedXml?: string }>({
      query: ({ id, ...body }) => ({ url: `/v1/invoices/${id}/einvoice`, method: "POST", body }),
      invalidatesTags: ["Invoice"],
    }),

    settings: b.query<T.SettingsData, void>({ query: () => "/v1/settings", providesTags: ["Settings"] }),
    saveSettings: b.mutation<T.SettingsData, unknown>({
      query: (body) => ({ url: "/v1/settings", method: "PUT", body }),
      invalidatesTags: ["Settings", "Me", "Invoice"],
    }),
    misaTest: b.mutation<{ ok: boolean; message?: string }, void>({ query: () => ({ url: "/v1/settings/misa-test", method: "POST" }) }),
    domains: b.query<T.Domain[], void>({ query: () => "/v1/domains", providesTags: ["Domain"] }),
    addDomain: b.mutation<T.Domain, { domain: string; isPrimary?: boolean }>({
      query: (body) => ({ url: "/v1/domains", method: "POST", body }),
      invalidatesTags: ["Domain"],
    }),
    verifyDomain: b.mutation<{ verified: boolean }, string>({ query: (id) => ({ url: `/v1/domains/${id}/verify`, method: "POST" }), invalidatesTags: ["Domain"] }),
    deleteDomain: b.mutation<Id, string>({ query: (id) => ({ url: `/v1/domains/${id}`, method: "DELETE" }), invalidatesTags: ["Domain"] }),

    audit: b.query<T.AuditRow[], void>({ query: () => "/v1/audit", providesTags: ["Audit"] }),

    /* ── Danh mục ── */
    catalog: b.query<{ categories: T.Category[]; items: T.CatalogItem[] }, void>({ query: () => "/v1/catalog", providesTags: ["Catalog"] }),
    saveCategory: b.mutation<T.Category, Partial<T.Category>>({
      query: ({ id, ...body }) => ({ url: id ? `/v1/catalog/categories/${id}` : "/v1/catalog/categories", method: id ? "PATCH" : "POST", body }),
      invalidatesTags: ["Catalog"],
    }),
    deleteCategory: b.mutation<Id, string>({ query: (id) => ({ url: `/v1/catalog/categories/${id}`, method: "DELETE" }), invalidatesTags: ["Catalog"] }),
    saveItem: b.mutation<T.CatalogItem, Partial<T.CatalogItem>>({
      query: ({ id, ...body }) => ({ url: id ? `/v1/catalog/items/${id}` : "/v1/catalog/items", method: id ? "PATCH" : "POST", body }),
      invalidatesTags: ["Catalog", "Resource"],
    }),
    deleteItem: b.mutation<Id, string>({ query: (id) => ({ url: `/v1/catalog/items/${id}`, method: "DELETE" }), invalidatesTags: ["Catalog"] }),

    /* ── Tài nguyên & lịch ── */
    resources: b.query<T.Resource[], void>({ query: () => "/v1/resources", providesTags: ["Resource"] }),
    saveResource: b.mutation<T.Resource, Partial<T.Resource>>({
      query: ({ id, current: _c, next: _n, ...body }) => ({ url: id ? `/v1/resources/${id}` : "/v1/resources", method: id ? "PATCH" : "POST", body }),
      invalidatesTags: ["Resource"],
    }),
    deleteResource: b.mutation<Id, string>({ query: (id) => ({ url: `/v1/resources/${id}`, method: "DELETE" }), invalidatesTags: ["Resource"] }),
    saveLayout: b.mutation<{ saved: number }, { items: { id: string; x: number; y: number }[] }>({
      query: (body) => ({ url: "/v1/resources/layout", method: "PUT", body }),
      invalidatesTags: ["Resource"],
    }),
    reservations: b.query<T.Reservation[], { date: string; days?: number }>({
      query: (p) => ({ url: "/v1/reservations", params: p }),
      providesTags: ["Reservation"],
    }),
    walkin: b.mutation<T.Reservation, { resourceId: string; durationMin?: number; partySize?: number; label?: string; itemId?: string | null; startAt?: string; status?: string }>({
      query: (body) => ({ url: "/v1/reservations", method: "POST", body }),
      invalidatesTags: ["Reservation", "Resource"],
    }),
    updateReservation: b.mutation<T.Reservation, Id & { status?: string; resourceId?: string; startAt?: string; endAt?: string }>({
      query: ({ id, ...body }) => ({ url: `/v1/reservations/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Reservation", "Resource", "Booking", "Dashboard"],
    }),

    /* ── Cửa hàng plugin ── */
    store: b.query<T.StoreData, void>({ query: () => "/v1/store", providesTags: ["Store"] }),
    createOrder: b.mutation<T.StoreOrder, { kind: "addon" | "plan"; target: string; months: number }>({
      query: (body) => ({ url: "/v1/store/orders", method: "POST", body }),
      invalidatesTags: ["Store"],
    }),
    cancelOrder: b.mutation<T.StoreOrder, string>({ query: (id) => ({ url: `/v1/store/orders/${id}/cancel`, method: "POST" }), invalidatesTags: ["Store"] }),
    startTrial: b.mutation<{ module: string; days: number }, string>({
      query: (module) => ({ url: "/v1/store/trial", method: "POST", body: { module } }),
      invalidatesTags: ["Store", "Me"],
    }),

    /* ── Kế toán ── */
    contracts: b.query<T.Contract[], void>({ query: () => "/v1/contracts", providesTags: ["Contract"] }),
    saveContract: b.mutation<T.Contract, Partial<T.Contract>>({
      query: ({ id, customerName: _a, customerTaxCode: _b, customerPhone: _c, itemName: _d, code: _e, lastBilledPeriod: _f, ...body }) => ({ url: id ? `/v1/contracts/${id}` : "/v1/contracts", method: id ? "PATCH" : "POST", body }),
      invalidatesTags: ["Contract"],
    }),
    deleteContract: b.mutation<Id, string>({ query: (id) => ({ url: `/v1/contracts/${id}`, method: "DELETE" }), invalidatesTags: ["Contract", "Tax"] }),
    billContracts: b.mutation<{ period: string; created: string[] }, { period: string }>({
      query: (body) => ({ url: "/v1/contracts/bill", method: "POST", body }),
      invalidatesTags: ["Contract", "Invoice", "Dashboard"],
    }),
    taxTasks: b.query<T.TaxTaskRow[], { from?: string; to?: string } | void>({ query: (p) => ({ url: "/v1/tax-tasks", params: p ?? undefined }), providesTags: ["Tax"] }),
    generateTax: b.mutation<{ created: number; contracts: number }, { months: number }>({
      query: (body) => ({ url: "/v1/tax-tasks", method: "POST", body }),
      invalidatesTags: ["Tax"],
    }),
    updateTax: b.mutation<T.TaxTaskRow, Id & { status: "pending" | "done"; note?: string }>({
      query: ({ id, ...body }) => ({ url: `/v1/tax-tasks/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Tax"],
    }),
  }),
});

export const {
  useMeQuery, useDashboardQuery,
  useBookingsQuery, useBookingQuery, useCreateBookingMutation, useUpdateBookingMutation, useDeleteBookingMutation,
  useCustomersQuery, useCustomerQuery, useSaveCustomerMutation,
  useEmployeesQuery, useSaveEmployeeMutation, useDeleteEmployeeMutation,
  useUsersQuery, useCreateUserMutation, useUpdateUserMutation, useSaveRoleMutation, useDeleteRoleMutation,
  useToursQuery, useTourQuery, useSaveTourMutation, useDeleteTourMutation, useSaveDepartureMutation, useDeleteDepartureMutation,
  useInvoicesQuery, useInvoiceQuery, useCreateInvoiceMutation, useAddPaymentMutation, useCancelInvoiceMutation, useEinvoiceMutation,
  useSettingsQuery, useSaveSettingsMutation, useMisaTestMutation, useDomainsQuery, useAddDomainMutation, useVerifyDomainMutation, useDeleteDomainMutation,
  useAuditQuery,
  useCatalogQuery, useSaveCategoryMutation, useDeleteCategoryMutation, useSaveItemMutation, useDeleteItemMutation,
  useResourcesQuery, useSaveResourceMutation, useDeleteResourceMutation, useSaveLayoutMutation,
  useReservationsQuery, useWalkinMutation, useUpdateReservationMutation,
  useContractsQuery, useSaveContractMutation, useDeleteContractMutation, useBillContractsMutation,
  useTaxTasksQuery, useGenerateTaxMutation, useUpdateTaxMutation,
  useStoreQuery, useCreateOrderMutation, useCancelOrderMutation, useStartTrialMutation,
} = api;
