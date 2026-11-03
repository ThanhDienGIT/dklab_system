import "server-only";
/**
 * Adapter hóa đơn điện tử MISA meInvoice.
 *
 * Theo tài liệu tích hợp của MISA (doc.meinvoice.vn):
 *  1. Lấy token:   POST {authBase}/auth/token  body {appid, taxcode, username, password}
 *                  => { Success, ErrorCode, Errors, Data: "<token>" }
 *  2. Tạo HĐ:      POST {apiBase}[/code]/itg/invoicepublishing/createinvoice
 *                  headers: Authorization: Bearer <token>, CompanyTaxCode
 *                  body: [ OriginalInvoiceData ] => Data (chuỗi JSON) [{RefID, TransactionID, InvoiceData(XML)...}]
 *  3. Ký XML:      bằng USB token qua công cụ ký của MISA cài tại máy khách, hoặc HSM / ký trên MISA.
 *  4. Phát hành:   POST {apiBase}[/code]/itg/invoicepublishing  body [{RefID, TransactionID, InvoiceData(signed), ...}]
 *
 * Trên Vercel (serverless) không truy cập được USB token, nên hệ thống làm bước 1–2 (đẩy hóa đơn
 * nháp lên MISA kèm TransactionID). Kế toán ký & phát hành trên MISA, hoặc gửi XML đã ký về
 * endpoint publish nếu doanh nghiệp dùng HSM hay công cụ ký nội bộ.
 *
 * Chế độ "mock" giả lập toàn bộ luồng để demo khi chưa có tài khoản MISA.
 * ĐƯỜNG DẪN API CẦN ĐỐI CHIẾU LẠI VỚI TÀI KHOẢN MISA CẤP (MISA có nhiều phiên bản API: /api/integration, /api/v3).
 */
import { decrypt } from "../crypto";
import type { MisaConfig } from "../db/schema";
import { amountInWordsVN } from "../words";

const HOSTS = {
  test: { auth: "https://testapi.meinvoice.vn/api/integration", api: "https://testapi.meinvoice.vn/api/v3" },
  live: { auth: "https://api.meinvoice.vn/api/integration", api: "https://api.meinvoice.vn/api/v3" },
} as const;

export type MisaInvoiceLine = {
  lineNo: number;
  itemCode?: string | null;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  vatRate: number;
  vatAmount: number;
};

export type MisaInvoiceInput = {
  refId: string;
  invDate: string; // YYYY-MM-DD
  paymentMethod: string;
  seller: { legalName: string; taxCode: string; address?: string; phone?: string; email?: string; bankAccount?: string; bankName?: string };
  buyer: { legalName?: string | null; fullName: string; taxCode?: string | null; address?: string | null; email?: string | null; phone?: string | null; code?: string | null };
  lines: MisaInvoiceLine[];
  totals: { subtotal: number; discount: number; vat: number; total: number };
  note?: string | null;
};

export type MisaResult = {
  ok: boolean;
  transactionId?: string;
  invNo?: string;
  invCode?: string;
  invSeries?: string;
  invDate?: string;
  xml?: string;
  message?: string;
};

type MisaEnvelope = { Success: boolean; ErrorCode?: string | null; Errors?: unknown[]; Data?: unknown };

export const vatRateName = (r: number) => (r === -1 ? "KCT" : r === -2 ? "KKKNT" : `${r}%`);

export const amountInWords = amountInWordsVN;

/* ─────────────────────────── Dựng payload MISA ─────────────────────────── */
export function buildOriginalInvoiceData(cfg: MisaConfig, inv: MisaInvoiceInput) {
  const byRate = new Map<number, { base: number; vat: number }>();
  for (const l of inv.lines) {
    const r = byRate.get(l.vatRate) ?? { base: 0, vat: 0 };
    r.base += l.amount;
    r.vat += l.vatAmount;
    byRate.set(l.vatRate, r);
  }
  const t = inv.totals;
  return {
    RefID: inv.refId,
    InvSeries: cfg.invSeries,
    InvoiceName: "Hóa đơn giá trị gia tăng",
    InvDate: inv.invDate,
    CurrencyCode: "VND",
    ExchangeRate: 1,
    PaymentMethodName: inv.paymentMethod,
    IsInvoiceSummary: false,
    InvoiceTemplateID: cfg.invoiceTemplateId || undefined,
    InvoiceNote: inv.note || undefined,
    SellerLegalName: inv.seller.legalName,
    SellerTaxCode: inv.seller.taxCode,
    SellerAddress: inv.seller.address,
    SellerPhoneNumber: inv.seller.phone,
    SellerEmail: inv.seller.email,
    SellerBankAccount: inv.seller.bankAccount,
    SellerBankName: inv.seller.bankName,
    BuyerLegalName: inv.buyer.legalName || inv.buyer.fullName,
    BuyerTaxCode: inv.buyer.taxCode || "",
    BuyerAddress: inv.buyer.address || "",
    BuyerCode: inv.buyer.code || "",
    BuyerPhoneNumber: inv.buyer.phone || "",
    BuyerEmail: inv.buyer.email || "",
    BuyerFullName: inv.buyer.fullName,
    TotalSaleAmountOC: t.subtotal,
    TotalAmountWithoutVATOC: t.subtotal - t.discount,
    TotalVATAmountOC: t.vat,
    TotalDiscountAmountOC: t.discount,
    TotalAmountOC: t.total,
    TotalSaleAmount: t.subtotal,
    TotalAmountWithoutVAT: t.subtotal - t.discount,
    TotalVATAmount: t.vat,
    TotalDiscountAmount: t.discount,
    TotalAmount: t.total,
    TotalAmountInWords: amountInWords(t.total),
    OriginalInvoiceDetail: inv.lines.map((l) => ({
      ItemType: 1,
      LineNumber: l.lineNo,
      SortOrder: l.lineNo,
      ItemCode: l.itemCode || "",
      ItemName: l.itemName,
      UnitName: l.unit,
      Quantity: l.quantity,
      UnitPrice: l.unitPrice,
      DiscountRate: 0,
      DiscountAmountOC: 0,
      DiscountAmount: 0,
      AmountOC: l.amount,
      Amount: l.amount,
      AmountWithoutVATOC: l.amount,
      AmountWithoutVAT: l.amount,
      VATRateName: vatRateName(l.vatRate),
      VATAmountOC: l.vatAmount,
      VATAmount: l.vatAmount,
    })),
    TaxRateInfo: [...byRate.entries()].map(([rate, v]) => ({
      VATRateName: vatRateName(rate),
      AmountWithoutVATOC: v.base,
      VATAmountOC: v.vat,
    })),
    OptionUserDefined: { MainCurrency: "VND", AmountDecimalDigits: "0", AmountOCDecimalDigits: "0", UnitPriceDecimalDigits: "0", QuantityDecimalDigits: "0" },
  };
}

/* ─────────────────────────────── Client ─────────────────────────────── */
/** Chống SSRF: chỉ cho phép gọi HTTPS tới máy chủ của MISA. Dùng cả khi lưu cấu hình và khi gọi. */
export function isAllowedMisaUrl(u: string): boolean {
  try {
    const url = new URL(u);
    const h = url.hostname.toLowerCase();
    return url.protocol === "https:" && !url.username && !url.password && (h === "meinvoice.vn" || h.endsWith(".meinvoice.vn")) && (!url.port || url.port === "443");
  } catch {
    return false;
  }
}

function hosts(cfg: MisaConfig) {
  if (cfg.env === "mock") throw new Error("mock");
  const h = HOSTS[cfg.env];
  const custom = cfg.baseUrl?.replace(/\/$/, "");
  if (custom && !isAllowedMisaUrl(custom)) throw new Error("Base URL MISA không hợp lệ (chỉ chấp nhận https://*.meinvoice.vn)");
  return { auth: custom || h.auth, api: custom || h.api };
}

function parseData<T>(env: MisaEnvelope): T | null {
  if (env.Data == null) return null;
  if (typeof env.Data === "string") {
    try { return JSON.parse(env.Data) as T; } catch { return env.Data as unknown as T; }
  }
  return env.Data as T;
}

async function post(url: string, body: unknown, headers: Record<string, string> = {}): Promise<MisaEnvelope> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
    redirect: "error", // không đi theo redirect sang host khác (chống SSRF vòng)
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as MisaEnvelope;
  } catch {
    // Không trả nội dung phản hồi lạ ra ngoài (tránh lộ dữ liệu nội bộ)
    return { Success: false, ErrorCode: `HTTP_${res.status}`, Errors: [] };
  }
}

/** Lỗi mạng/fetch: chỉ trả thông điệp chung, không lộ địa chỉ / chi tiết nội bộ */
function safeErr(e: unknown): string {
  const m = (e as Error)?.message ?? "";
  if (m.startsWith("Lấy token MISA") || m.startsWith("Chưa cấu hình") || m.startsWith("Base URL MISA")) return m;
  return "Không kết nối được tới MISA, vui lòng thử lại";
}

const errMsg = (e: MisaEnvelope) =>
  [e.ErrorCode, ...(Array.isArray(e.Errors) ? e.Errors.map(String) : [])].filter(Boolean).join(" – ") || "MISA trả về lỗi không xác định";

export async function misaGetToken(cfg: MisaConfig): Promise<string> {
  if (!cfg.appId || !cfg.taxCode || !cfg.username || !cfg.passwordEnc) throw new Error("Chưa cấu hình đủ AppID / MST / tài khoản MISA");
  const r = await post(`${hosts(cfg).auth}/auth/token`, {
    appid: cfg.appId,
    taxcode: cfg.taxCode,
    username: cfg.username,
    password: decrypt(cfg.passwordEnc),
  });
  if (!r.Success || typeof r.Data !== "string") throw new Error(`Lấy token MISA thất bại: ${errMsg(r)}`);
  return r.Data;
}

/** Kiểm tra kết nối (dùng ở màn hình cài đặt). */
export async function misaTestConnection(cfg: MisaConfig): Promise<MisaResult> {
  if (cfg.env === "mock") return { ok: true, message: "Chế độ giả lập: không gọi MISA" };
  try {
    await misaGetToken(cfg);
    return { ok: true, message: "Kết nối MISA thành công" };
  } catch (e) {
    return { ok: false, message: safeErr(e) };
  }
}

/** Bước 1–2: đẩy hóa đơn lên MISA, nhận TransactionID + XML chờ ký. */
export async function misaCreateInvoice(cfg: MisaConfig, inv: MisaInvoiceInput): Promise<MisaResult> {
  if (cfg.env === "mock") {
    return {
      ok: true,
      transactionId: `MOCK-${inv.refId.slice(0, 8).toUpperCase()}`,
      invSeries: cfg.invSeries || "1C26TDL",
      message: "Giả lập: đã tạo hóa đơn nháp trên MISA",
    };
  }
  try {
    const token = await misaGetToken(cfg);
    const path = cfg.withCode ? "/code/itg/invoicepublishing/createinvoice" : "/itg/invoicepublishing/createinvoice";
    const r = await post(`${hosts(cfg).api}${path}`, [buildOriginalInvoiceData(cfg, inv)], {
      Authorization: `Bearer ${token}`,
      CompanyTaxCode: cfg.taxCode!,
    });
    const items = parseData<{ RefID: string; TransactionID: string; InvoiceData?: string; ErrorCode?: string }[]>(r);
    const item = Array.isArray(items) ? items[0] : null;
    if (!r.Success || !item || item.ErrorCode) return { ok: false, message: item?.ErrorCode || errMsg(r) };
    return { ok: true, transactionId: item.TransactionID, xml: item.InvoiceData, invSeries: cfg.invSeries, message: "Đã tạo hóa đơn trên MISA, chờ ký số" };
  } catch (e) {
    return { ok: false, message: safeErr(e) };
  }
}

/** Bước 4: phát hành với XML đã ký (HSM / công cụ ký). Ở chế độ mock sẽ cấp số giả lập. */
export async function misaPublishInvoice(
  cfg: MisaConfig,
  p: { refId: string; transactionId: string; signedXml?: string; email?: string | null; name?: string },
): Promise<MisaResult> {
  if (cfg.env === "mock") {
    const no = String(Math.floor(Date.now() / 1000) % 10_000_000).padStart(8, "0");
    return {
      ok: true,
      transactionId: p.transactionId,
      invNo: no,
      invSeries: cfg.invSeries || "1C26TDL",
      invCode: cfg.withCode ? `M1-26-MOCK-${no}` : undefined,
      invDate: new Date().toISOString().slice(0, 10),
      message: "Giả lập: đã phát hành hóa đơn",
    };
  }
  if (!p.signedXml) return { ok: false, message: "Cần XML đã ký số (USB token / HSM) để phát hành. Hoặc ký & phát hành trực tiếp trên MISA meInvoice." };
  try {
    const token = await misaGetToken(cfg);
    const path = cfg.withCode ? "/code/itg/invoicepublishing" : "/itg/invoicepublishing";
    const r = await post(
      `${hosts(cfg).api}${path}`,
      [{ RefID: p.refId, TransactionID: p.transactionId, InvoiceData: p.signedXml, IsSendEmail: !!p.email, ReceiverEmail: p.email || "", ReceiverName: p.name || "", IsInvoiceSummary: false }],
      { Authorization: `Bearer ${token}`, CompanyTaxCode: cfg.taxCode! },
    );
    const items = parseData<{ InvNo?: string; InvCode?: string; InvSeries?: string; InvDate?: string; ErrorCode?: string }[]>(r);
    const item = Array.isArray(items) ? items[0] : null;
    // Success=true chỉ nghĩa là request tới được MISA, phải xem thêm ErrorCode từng hóa đơn
    if (!r.Success || !item || item.ErrorCode) return { ok: false, message: item?.ErrorCode || errMsg(r) };
    return { ok: true, transactionId: p.transactionId, invNo: item.InvNo, invCode: item.InvCode, invSeries: item.InvSeries, invDate: item.InvDate, message: "Đã phát hành hóa đơn điện tử" };
  } catch (e) {
    return { ok: false, message: safeErr(e) };
  }
}
