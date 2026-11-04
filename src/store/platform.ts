"use client";
/**
 * Store riêng cho Super Admin: KHÔNG lưu cache xuống localStorage (dữ liệu toàn nền tảng nhạy cảm hơn).
 */
import { configureStore } from "@reduxjs/toolkit";
import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from "@reduxjs/toolkit/query/react";

const raw = fetchBaseQuery({ baseUrl: "/api/platform", credentials: "include" });
const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (a, api, x) => {
  const res = await raw(a, api, x);
  if (res.error?.status === 401 && typeof window !== "undefined") window.location.href = "/superdklab/login";
  if (res.data && typeof res.data === "object" && "data" in (res.data as object)) return { ...res, data: (res.data as { data: unknown }).data };
  return res;
};

export type PTenant = { id: string; slug: string; name: string; industry: string; status: "active" | "suspended"; plan: string; createdAt: string; users: number; bookings30: number; revenue30: number; domains: string[] };
export type PTenantDetail = Omit<PTenant, "domains" | "users"> & {
  settings: { contact?: { phone?: string; email?: string; address?: string }; brand?: { primaryColor?: string } };
  modules: { key: string; enabled: boolean }[];
  domains: { id: string; domain: string; verifiedAt: string | null; isPrimary: boolean }[];
  grants: { key: string; source: string; expiresAt: string | null }[];
  planExpiresAt: string | null;
  users: { id: string; fullName: string; email: string | null; phone: string | null; status: string; lastLoginAt: string | null; roles: string[] }[];
};
export type PStats = { tenants: { total: number; active: number; new30: number }; bookings30: number; revenue30: number; users: number; byIndustry: { industry: string; n: number }[]; pendingOrders: number; storeRevenue30: number };
export type POrder = { id: string; tenantId: string; tenantName: string; tenantSlug: string; kind: "addon" | "plan" | "trial"; target: string; months: number; amount: number; code: string; status: "pending" | "paid" | "cancelled"; createdAt: string; paidAt: string | null; note: string | null };
export type PAudit = { id: string; action: string; tenantId: string | null; data: unknown; ip: string | null; createdAt: string; adminName: string | null; tenantName: string | null };

export const platformApi = createApi({
  reducerPath: "platform",
  baseQuery,
  tagTypes: ["Tenant", "Stats", "Audit", "Order"],
  refetchOnMountOrArgChange: 15,
  endpoints: (b) => ({
    me: b.query<{ id: string; name: string; username: string }, void>({ query: () => "/me" }),
    stats: b.query<PStats, void>({ query: () => "/stats", providesTags: ["Stats"] }),
    tenants: b.query<PTenant[], void>({ query: () => "/tenants", providesTags: ["Tenant"] }),
    tenant: b.query<PTenantDetail, string>({ query: (id) => `/tenants/${id}`, providesTags: ["Tenant"] }),
    createTenant: b.mutation<{ id: string; slug: string }, unknown>({ query: (body) => ({ url: "/tenants", method: "POST", body }), invalidatesTags: ["Tenant", "Stats", "Audit"] }),
    updateTenant: b.mutation<unknown, { id: string; status?: string; plan?: string; name?: string }>({ query: ({ id, ...body }) => ({ url: `/tenants/${id}`, method: "PATCH", body }), invalidatesTags: ["Tenant", "Stats", "Audit"] }),
    setModules: b.mutation<unknown, { id: string; modules: string[] }>({ query: ({ id, ...body }) => ({ url: `/tenants/${id}/modules`, method: "PUT", body }), invalidatesTags: ["Tenant", "Audit"] }),
    resetPassword: b.mutation<unknown, { id: string; userId: string; password: string }>({ query: ({ id, ...body }) => ({ url: `/tenants/${id}/reset-owner`, method: "POST", body }), invalidatesTags: ["Audit"] }),
    impersonate: b.mutation<{ redirect: string }, { id: string; userId?: string; reason: string }>({ query: ({ id, ...body }) => ({ url: `/tenants/${id}/impersonate`, method: "POST", body }), invalidatesTags: ["Audit"] }),
    verifyDomain: b.mutation<unknown, { id: string; verified: boolean }>({ query: ({ id, ...body }) => ({ url: `/domains/${id}`, method: "PATCH", body }), invalidatesTags: ["Tenant", "Audit"] }),
    deleteDomain: b.mutation<unknown, string>({ query: (id) => ({ url: `/domains/${id}`, method: "DELETE" }), invalidatesTags: ["Tenant", "Audit"] }),
    audit: b.query<PAudit[], void>({ query: () => "/audit", providesTags: ["Audit"] }),
    orders: b.query<POrder[], string>({ query: (status) => ({ url: "/orders", params: { status } }), providesTags: ["Order"] }),
    decideOrder: b.mutation<unknown, { id: string; action: "approve" | "reject"; note?: string }>({ query: ({ id, ...body }) => ({ url: `/orders/${id}`, method: "POST", body }), invalidatesTags: ["Order", "Stats", "Tenant", "Audit"] }),
    changePassword: b.mutation<unknown, { current: string; next: string }>({ query: (body) => ({ url: "/me/password", method: "POST", body }) }),
  }),
});

export const makePlatformStore = () =>
  configureStore({ reducer: { [platformApi.reducerPath]: platformApi.reducer }, middleware: (g) => g().concat(platformApi.middleware) });

export const {
  useMeQuery: usePMe, useStatsQuery, useTenantsQuery, useTenantQuery, useCreateTenantMutation, useUpdateTenantMutation, useSetModulesMutation,
  useResetPasswordMutation, useImpersonateMutation, useVerifyDomainMutation, useDeleteDomainMutation, useAuditQuery: usePAudit, useChangePasswordMutation,
  useOrdersQuery, useDecideOrderMutation,
} = platformApi;
