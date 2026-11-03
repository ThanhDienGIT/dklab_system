/** Kiểu dữ liệu phía client (khớp với JSON API trả về). */
export type Me = {
  user: { id: string; name: string; roles: string[]; perms: string[] };
  tenant: { id: string; slug: string; name: string; industry: string; brand: { primaryColor?: string; logoUrl?: string } };
  modules: string[];
  labels: { booking: string; resource: string };
};

export type BookingStatus = "new" | "contacted" | "confirmed" | "completed" | "cancelled";
export type Booking = {
  id: string; code: string; resourceType: string; resourceId: string | null; slotId: string | null; resourceLabel: string | null;
  bookingDate: string | null; bookingTime: string | null; adults: number; children: number; fullName: string; phone: string | null;
  email: string | null; note: string | null; status: BookingStatus; source: string; estimatedTotal: number; customerId: string | null;
  assignedTo: string | null; assigneeName?: string | null; staffNote: string | null; handledAt: string | null; createdAt: string;
};

export type Customer = {
  id: string; fullName: string; phone: string | null; email: string | null; taxCode: string | null; address: string | null; note: string | null;
  tags: string[]; source: string | null; totalSpent: number; bookingCount: number; consentAt: string | null; createdAt: string;
};
export type CustomerDetail = Customer & { bookings: Booking[]; invoices: Invoice[] };

export type Employee = {
  id: string; code: string; fullName: string; phone: string | null; email: string | null; position: string | null; department: string | null;
  branchId: string | null; branchName?: string | null; userId: string | null; accountEmail?: string | null; startDate: string | null;
  status: "working" | "on_leave" | "quit"; baseSalary: number; note: string | null;
};

export type Role = { id: string; key: string; name: string; description: string | null; isSystem: boolean; permissions: string[] };
export type UserRow = { id: string; fullName: string; email: string | null; phone: string | null; status: string; lastLoginAt: string | null; roleIds: string[] };

export type Tour = {
  id: string; slug: string; title: string; summary: string | null; description: string | null; location: string | null; departFrom: string | null;
  durationDays: number; durationNights: number; basePrice: number; childPrice: number; imageUrl: string | null; highlights: string[];
  itinerary: { day: string; title: string; detail: string }[]; isPublished: boolean; sortOrder: number; upcomingDepartures?: number; seatsLeft?: number;
};
export type Departure = { id: string; tourId: string; departDate: string; seatsTotal: number; seatsBooked: number; price: number | null; status: "open" | "closed" };
export type TourDetail = Tour & { departures: Departure[] };

export type EInvoiceData = {
  provider: "misa"; env: "mock" | "test" | "live"; refId?: string; transactionId?: string; invNo?: string; invCode?: string; invSeries?: string;
  invDate?: string; error?: string; history?: { at: string; action: string; ok: boolean; message?: string }[];
};
export type Invoice = {
  id: string; code: string; bookingId: string | null; customerId: string | null; buyerName: string; buyerLegalName: string | null; buyerTaxCode: string | null;
  buyerAddress: string | null; buyerEmail: string | null; buyerPhone: string | null; issueDate: string; status: "draft" | "issued" | "paid" | "cancelled";
  subtotal: number; discount: number; vatAmount: number; total: number; paidAmount: number; bankAccountId: string | null; paymentRef: string;
  publicToken: string; einvoiceStatus: "none" | "created" | "published" | "error"; einvoiceData: EInvoiceData | null; note: string | null; createdAt: string;
};
export type InvoiceItem = { id: string; lineNo: number; itemCode: string | null; itemName: string; unit: string; quantity: number; unitPrice: number; vatRate: number; amount: number; vatAmount: number };
export type Payment = { id: string; method: string; amount: number; reference: string | null; paidAt: string };
export type BankAccount = { id: string; bankBin: string; bankName: string; accountNumber: string; accountName: string; isDefault?: boolean };
export type InvoiceFull = Invoice & {
  items: InvoiceItem[]; payments: Payment[]; due: number; qrPayload: string | null;
  bank: (BankAccount & { bankShort: string }) | null;
  tenant: { id: string; name: string; slug: string; settings: { company?: { legalName?: string; taxCode?: string; address?: string }; contact?: { phone?: string; email?: string; address?: string } } };
};
export type InvoiceInput = {
  bookingId?: string | null; customerId?: string | null; buyerName: string; buyerLegalName?: string; buyerTaxCode?: string; buyerAddress?: string;
  buyerEmail?: string; buyerPhone?: string; bankAccountId?: string | null; note?: string;
  items: { itemName: string; unit: string; quantity: number; unitPrice: number; vatRate: number }[];
};

export type MisaSettings = {
  enabled: boolean; env: "mock" | "test" | "live"; appId?: string; taxCode?: string; username?: string; password?: string; hasPassword?: boolean;
  invSeries?: string; invoiceTemplateId?: string; withCode?: boolean; baseUrl?: string;
};
export type SettingsData = {
  name: string; slug: string; industry: string;
  settings: {
    brand?: { primaryColor?: string; logoUrl?: string; tagline?: string; heroImage?: string };
    contact?: { phone?: string; hotline?: string; email?: string; address?: string; zalo?: string };
    company?: { legalName?: string; taxCode?: string; address?: string };
    invoice?: { prefix?: string; defaultVatRate?: number };
    bankAccounts?: BankAccount[];
    misa?: MisaSettings;
  };
};
export type Domain = { id: string; domain: string; isPrimary: boolean; verifiedAt: string | null; createdAt: string; txtName: string; txtValue: string | null };
export type AuditRow = { id: string; action: string; entity: string; entityId: string | null; data: unknown; ip: string | null; createdAt: string; userName: string | null };
export type Dashboard = {
  bookings: { newCount: number; contacted: number; confirmed30: number; total30: number };
  invoices: { revenue30: number; receivable: number; unpaidCount: number };
  customers: number;
  recent: Pick<Booking, "id" | "code" | "fullName" | "phone" | "resourceLabel" | "status" | "createdAt">[];
  daily: { day: string; n: number }[];
};
