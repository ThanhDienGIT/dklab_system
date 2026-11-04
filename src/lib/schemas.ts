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

export const CategoryBody = z.object({
  name: z.string().trim().min(1, "Nhập tên nhóm").max(80),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const CatalogItemBody = z.object({
  categoryId: z.uuid().nullable().optional(),
  name: z.string().trim().min(1, "Nhập tên").max(150),
  description: optionalText(2000),
  price: money.default(0),
  durationMin: z.coerce.number().int().min(5).max(24 * 60).nullable().optional(),
  capacity: z.coerce.number().int().min(1).max(100).nullable().optional(),
  imageUrl: httpsUrl.optional().nullable(),
  tags: z.array(z.string().trim().max(30)).max(10).default([]),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

export const ResourceBody = z.object({
  kind: z.enum(["table", "room", "bed", "staff"]),
  name: z.string().trim().min(1, "Nhập tên").max(60),
  area: optionalText(60),
  capacity: z.coerce.number().int().min(1).max(200).default(1),
  itemId: z.uuid().nullable().optional(),
  x: z.coerce.number().int().min(0).max(40).default(0),
  y: z.coerce.number().int().min(0).max(40).default(0),
  shape: z.enum(["round", "square", "rect"]).default("square"),
  housekeeping: z.enum(["clean", "dirty", "maintenance"]).default("clean"),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

export const ContractBody = z.object({
  customerId: z.uuid({ error: "Chọn khách hàng" }),
  itemId: z.uuid().nullable().optional(),
  title: z.string().trim().min(3, "Nhập tên hợp đồng").max(200),
  monthlyFee: money.default(0),
  taxPeriod: z.enum(["monthly", "quarterly"]).default("quarterly"),
  startDate: z.iso.date(),
  endDate: z.iso.date().nullable().optional(),
  status: z.enum(["active", "paused", "ended"]).default("active"),
  note: optionalText(2000),
});


/** PATCH tài nguyên: chỉ cập nhật trường được gửi (KHÔNG có default — tránh vô tình reset sức chứa / vị trí) */
export const ResourcePatchBody = z.object({
  kind: z.enum(["table", "room", "bed", "staff"]).optional(),
  name: z.string().trim().min(1, "Nhập tên").max(60).optional(),
  area: optionalText(60),
  capacity: z.coerce.number().int().min(1).max(200).optional(),
  itemId: z.uuid().nullable().optional(),
  x: z.coerce.number().int().min(0).max(40).optional(),
  y: z.coerce.number().int().min(0).max(40).optional(),
  shape: z.enum(["round", "square", "rect"]).optional(),
  housekeeping: z.enum(["clean", "dirty", "maintenance"]).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});
