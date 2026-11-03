import { z } from "zod";
import { emailSchema, httpsUrl, money, optionalText, phoneSchema } from "./validators";

export const CustomerBody = z
  .object({
    fullName: z.string().trim().min(2, "Nhập họ tên"),
    phone: phoneSchema.optional().default(""),
    email: emailSchema.optional().default(""),
    taxCode: optionalText(20),
    address: optionalText(300),
    note: optionalText(2000),
    tags: z.array(z.string().trim().max(30)).max(20).default([]),
    source: optionalText(30),
  })
  .refine((b) => b.phone || b.email, { message: "Cần SĐT hoặc email", path: ["phone"] });

export const EmployeeBody = z.object({
  code: z.string().trim().min(1, "Nhập mã nhân viên").max(20),
  fullName: z.string().trim().min(2, "Nhập họ tên"),
  phone: phoneSchema.optional().default(""),
  email: emailSchema.optional().default(""),
  position: optionalText(80),
  department: optionalText(80),
  branchId: z.uuid().nullable().optional(),
  userId: z.uuid().nullable().optional(),
  startDate: z.iso.date().nullable().optional(),
  status: z.enum(["working", "on_leave", "quit"]).default("working"),
  baseSalary: money.default(0),
  note: optionalText(2000),
});

export const TourBody = z.object({
  title: z.string().trim().min(3, "Nhập tên tour").max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug chỉ gồm a-z, 0-9 và dấu -")
    .max(120),
  summary: optionalText(500),
  description: optionalText(10000),
  location: optionalText(120),
  departFrom: optionalText(120),
  durationDays: z.coerce.number().int().min(1).max(60).default(1),
  durationNights: z.coerce.number().int().min(0).max(60).default(0),
  basePrice: money.default(0),
  childPrice: money.default(0),
  imageUrl: httpsUrl.optional().nullable(),
  highlights: z.array(z.string().trim().max(200)).max(20).default([]),
  itinerary: z.array(z.object({ day: z.string().max(40), title: z.string().max(200), detail: z.string().max(4000) })).max(60).default([]),
  isPublished: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

export const DepartureBody = z.object({
  departDate: z.iso.date("Ngày khởi hành không hợp lệ"),
  seatsTotal: z.coerce.number().int().min(1).max(1000),
  price: money.nullable().optional(),
  status: z.enum(["open", "closed"]).default("open"),
});

export const InvoiceBody = z.object({
  bookingId: z.uuid().nullable().optional(),
  customerId: z.uuid().nullable().optional(),
  buyerName: z.string().trim().min(2, "Nhập tên người mua"),
  buyerLegalName: optionalText(200),
  buyerTaxCode: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{10}(-\d{3})?$|^\d{12}$/.test(v), "MST không hợp lệ (10 số, 10-3 số hoặc CCCD 12 số)")
    .optional()
    .nullable(),
  buyerAddress: optionalText(300),
  buyerEmail: emailSchema.optional().nullable(),
  buyerPhone: phoneSchema.optional().nullable(),
  issueDate: z.iso.date().optional(),
  bankAccountId: z.string().nullable().optional(),
  note: optionalText(1000),
  items: z
    .array(
      z.object({
        itemCode: optionalText(40),
        itemName: z.string().trim().min(1, "Nhập tên hàng hóa/dịch vụ").max(300),
        unit: z.string().trim().min(1).max(30).default("Khách"),
        quantity: z.coerce.number().int().min(1),
        unitPrice: money,
        vatRate: z.coerce.number().int().refine((v) => [-2, -1, 0, 5, 8, 10].includes(v), "Thuế suất không hợp lệ"),
      }),
    )
    .min(1, "Hóa đơn cần ít nhất 1 dòng"),
});
