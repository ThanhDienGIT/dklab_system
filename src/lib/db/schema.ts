/**
 * Lược đồ dữ liệu dùng chung cho mọi tenant.
 * Mọi bảng nghiệp vụ đều có tenant_id: một source, nhiều khách hàng.
 * Tiền tệ lưu dạng số nguyên (VND) bằng bigint.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const tenantId = () =>
  uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" });
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const money = (name: string) => bigint(name, { mode: "number" }).notNull().default(0);

/* ───────────────────────────── Nền tảng ───────────────────────────── */

export const tenants = pgTable("tenants", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  industry: text("industry").notNull(), // travel | cafe | restaurant | hotel | spa | accounting
  status: text("status").notNull().default("active"), // active | suspended
  plan: text("plan").notNull().default("basic"),
  /** Thương hiệu, liên hệ, tài khoản ngân hàng, cấu hình MISA (mật khẩu được mã hóa)… */
  settings: jsonb("settings").$type<TenantSettings>().notNull().default({}),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const tenantDomains = pgTable("tenant_domains", {
  id: id(),
  tenantId: tenantId(),
  domain: text("domain").notNull().unique(),
  isPrimary: boolean("is_primary").notNull().default(false),
  /** Giá trị bản ghi TXT _dklab-verify.<domain> phải khớp để chứng minh sở hữu domain. */
  verifyToken: text("verify_token"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const tenantModules = pgTable(
  "tenant_modules",
  {
    tenantId: tenantId(),
    moduleKey: text("module_key").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    config: jsonb("config").notNull().default({}),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.moduleKey] })],
);

export const branches = pgTable("branches", {
  id: id(),
  tenantId: tenantId(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
});

/* ─────────────────────── Xác thực & phân quyền ─────────────────────── */

export const users = pgTable(
  "users",
  {
    id: id(),
    tenantId: tenantId(),
    email: text("email"),
    phone: text("phone"),
    fullName: text("full_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    status: text("status").notNull().default("active"), // active | disabled
    /** Tăng lên để thu hồi ngay mọi access token đang lưu hành của user. */
    tokenVersion: integer("token_version").notNull().default(0),
    failedLogins: integer("failed_logins").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("users_tenant_email_uq").on(t.tenantId, t.email).where(sql`${t.email} is not null`),
    uniqueIndex("users_tenant_phone_uq").on(t.tenantId, t.phone).where(sql`${t.phone} is not null`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    tenantId: tenantId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** SHA-256 của refresh token hiện hành (không lưu token gốc). */
    refreshHash: text("refresh_hash").notNull(),
    /** Hash của refresh token vừa bị xoay: nếu bị dùng lại => nghi đánh cắp, thu hồi phiên. */
    previousHash: text("previous_hash"),
    userAgent: text("user_agent"),
    ip: text("ip"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), uniqueIndex("sessions_refresh_uq").on(t.refreshHash)],
);

export const roles = pgTable(
  "roles",
  {
    id: id(),
    tenantId: tenantId(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    isSystem: boolean("is_system").notNull().default(false),
    /** Danh sách quyền dạng "module.resource.action:scope" (scope: own | branch | tenant). */
    permissions: text("permissions").array().notNull().default(sql`'{}'::text[]`),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("roles_tenant_key_uq").on(t.tenantId, t.key)],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] })],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    tenantId: tenantId(),
    userId: uuid("user_id"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    data: jsonb("data"),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_tenant_created_idx").on(t.tenantId, t.createdAt)],
);

/* ───────────────────────── Nhân sự & khách hàng ───────────────────────── */

export const employees = pgTable("employees", {
  id: id(),
  tenantId: tenantId(),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  code: text("code").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  email: text("email"),
  position: text("position"),
  department: text("department"),
  startDate: date("start_date"),
  status: text("status").notNull().default("working"), // working | on_leave | quit
  baseSalary: money("base_salary"),
  note: text("note"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const customers = pgTable(
  "customers",
  {
    id: id(),
    tenantId: tenantId(),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    email: text("email"),
    taxCode: text("tax_code"),
    address: text("address"),
    note: text("note"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    source: text("source"), // website | walk_in | phone | facebook | zalo ...
    totalSpent: money("total_spent"),
    bookingCount: integer("booking_count").notNull().default(0),
    /** Thời điểm khách đồng ý xử lý dữ liệu cá nhân (NĐ 13/2023). */
    consentAt: timestamp("consent_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("customers_tenant_phone_uq").on(t.tenantId, t.phone).where(sql`${t.phone} is not null`),
    index("customers_tenant_email_idx").on(t.tenantId, t.email),
  ],
);

/* ─────────────────────────── Module Du lịch ─────────────────────────── */

export const tours = pgTable(
  "tours",
  {
    id: id(),
    tenantId: tenantId(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    description: text("description"),
    location: text("location"),
    departFrom: text("depart_from"),
    durationDays: integer("duration_days").notNull().default(1),
    durationNights: integer("duration_nights").notNull().default(0),
    basePrice: money("base_price"),
    childPrice: money("child_price"),
    imageUrl: text("image_url"),
    highlights: jsonb("highlights").$type<string[]>().notNull().default([]),
    itinerary: jsonb("itinerary").$type<{ day: string; title: string; detail: string }[]>().notNull().default([]),
    isPublished: boolean("is_published").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("tours_tenant_slug_uq").on(t.tenantId, t.slug)],
);

export const tourDepartures = pgTable(
  "tour_departures",
  {
    id: id(),
    tenantId: tenantId(),
    tourId: uuid("tour_id")
      .notNull()
      .references(() => tours.id, { onDelete: "cascade" }),
    departDate: date("depart_date").notNull(),
    seatsTotal: integer("seats_total").notNull(),
    seatsBooked: integer("seats_booked").notNull().default(0),
    price: bigint("price", { mode: "number" }),
    status: text("status").notNull().default("open"), // open | closed
  },
  (t) => [index("departures_tour_date_idx").on(t.tourId, t.departDate)],
);

/* ───────────── Yêu cầu đặt chỗ (dùng chung: tour, bàn, phòng, spa…) ───────────── */

export const bookingRequests = pgTable(
  "booking_requests",
  {
    id: id(),
    tenantId: tenantId(),
    code: text("code").notNull(),
    resourceType: text("resource_type").notNull(), // tour | table | room | service
    resourceId: uuid("resource_id"), // tour_id, table_id, room_id… tùy module
    slotId: uuid("slot_id"), // departure_id / khung giờ
    resourceLabel: text("resource_label"),
    bookingDate: date("booking_date"),
    bookingTime: text("booking_time"),
    adults: integer("adults").notNull().default(1),
    children: integer("children").notNull().default(0),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    email: text("email"),
    note: text("note"),
    /** new → contacted → confirmed → completed | cancelled */
    status: text("status").notNull().default("new"),
    source: text("source").notNull().default("website"),
    estimatedTotal: money("estimated_total"),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    staffNote: text("staff_note"),
    handledAt: timestamp("handled_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("booking_tenant_code_uq").on(t.tenantId, t.code),
    index("booking_tenant_status_idx").on(t.tenantId, t.status, t.createdAt),
  ],
);

/* ───────────────────────── Hóa đơn & thanh toán ───────────────────────── */

export const invoices = pgTable(
  "invoices",
  {
    id: id(),
    tenantId: tenantId(),
    code: text("code").notNull(),
    bookingId: uuid("booking_id").references(() => bookingRequests.id, { onDelete: "set null" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    buyerName: text("buyer_name").notNull(),
    buyerLegalName: text("buyer_legal_name"),
    buyerTaxCode: text("buyer_tax_code"),
    buyerAddress: text("buyer_address"),
    buyerEmail: text("buyer_email"),
    buyerPhone: text("buyer_phone"),
    issueDate: date("issue_date").notNull(),
    /** draft | issued | paid | cancelled */
    status: text("status").notNull().default("issued"),
    subtotal: money("subtotal"),
    discount: money("discount"),
    vatAmount: money("vat_amount"),
    total: money("total"),
    paidAmount: money("paid_amount"),
    /** id tài khoản ngân hàng trong tenant.settings.bankAccounts dùng để sinh VietQR */
    bankAccountId: text("bank_account_id"),
    /** Nội dung chuyển khoản (không dấu) để đối soát, vd: "DLD HD000123" */
    paymentRef: text("payment_ref").notNull(),
    /** Token công khai cho trang thanh toán /pay/<token> */
    publicToken: text("public_token").notNull().unique(),
    /** none | created | published | error */
    einvoiceStatus: text("einvoice_status").notNull().default("none"),
    einvoiceData: jsonb("einvoice_data").$type<EInvoiceData>(),
    note: text("note"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("invoices_tenant_code_uq").on(t.tenantId, t.code)],
);

export const invoiceItems = pgTable("invoice_items", {
  id: id(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  lineNo: integer("line_no").notNull(),
  itemCode: text("item_code"),
  itemName: text("item_name").notNull(),
  unit: text("unit").notNull().default("Khách"),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: money("unit_price"),
  /** % thuế GTGT: 0, 5, 8, 10; -1 = KCT (không chịu thuế); -2 = KKKNT */
  vatRate: integer("vat_rate").notNull().default(8),
  amount: money("amount"),
  vatAmount: money("vat_amount"),
});

export const payments = pgTable("payments", {
  id: id(),
  tenantId: tenantId(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  method: text("method").notNull(), // cash | bank_transfer | card
  amount: money("amount"),
  reference: text("reference"),
  receivedBy: uuid("received_by").references(() => users.id, { onDelete: "set null" }),
  paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ───────────────────────────── Kiểu JSON ───────────────────────────── */

export type BankAccount = {
  id: string;
  bankBin: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isDefault?: boolean;
};

export type MisaConfig = {
  enabled: boolean;
  /** mock: giả lập (demo, không gọi MISA) | test: testapi.meinvoice.vn | live: api.meinvoice.vn */
  env: "mock" | "test" | "live";
  appId?: string;
  taxCode?: string;
  username?: string;
  /** Mật khẩu MISA đã mã hóa AES-GCM bằng APP_SECRET. */
  passwordEnc?: string;
  invSeries?: string; // Ký hiệu hóa đơn, vd: 1C26TDL
  invoiceTemplateId?: string;
  /** Hóa đơn có mã của CQT (true) hay không mã (false) */
  withCode?: boolean;
  /** Cho phép ghi đè base URL nếu MISA cấp đường dẫn khác */
  baseUrl?: string;
};

export type TenantSettings = {
  brand?: { primaryColor?: string; logoUrl?: string; tagline?: string; heroImage?: string };
  contact?: { phone?: string; email?: string; address?: string; zalo?: string; hotline?: string };
  company?: { legalName?: string; taxCode?: string; address?: string };
  bankAccounts?: BankAccount[];
  invoice?: { prefix?: string; defaultVatRate?: number };
  misa?: MisaConfig;
};

export type EInvoiceData = {
  provider: "misa";
  env: "mock" | "test" | "live";
  refId?: string;
  transactionId?: string;
  invNo?: string;
  invCode?: string;
  invSeries?: string;
  invDate?: string;
  lookupUrl?: string;
  error?: string;
  history?: { at: string; action: string; ok: boolean; message?: string }[];
};
