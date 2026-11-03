import type { ReactNode } from "react";
import { amountInWordsVN } from "@/lib/words";
import { dateVN, vnd } from "@/lib/format";
import type { InvoiceFull } from "@/store/types";

const vatLabel = (r: number) => (r === -1 ? "KCT" : r === -2 ? "KKKNT" : `${r}%`);

/** Mẫu hóa đơn in được (dùng cho cả trang quản trị và trang thanh toán của khách). */
export function InvoiceDocument({ inv, qr }: { inv: InvoiceFull; qr?: ReactNode }) {
  const c = inv.tenant.settings.company ?? {};
  const ct = inv.tenant.settings.contact ?? {};
  return (
    <article className="print-area card mx-auto max-w-3xl bg-white p-6 text-sm sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div>
          <div className="text-base font-semibold">{c.legalName || inv.tenant.name}</div>
          {c.taxCode && <div className="text-slate-600">MST: {c.taxCode}</div>}
          {(c.address || ct.address) && <div className="text-slate-600">{c.address || ct.address}</div>}
          {ct.phone && <div className="text-slate-600">ĐT: {ct.phone}{ct.email ? ` · ${ct.email}` : ""}</div>}
        </div>
        <div className="text-right">
          <div className="text-lg font-bold tracking-wide">HÓA ĐƠN BÁN HÀNG</div>
          <div className="text-slate-600">Số: <b>{inv.code}</b></div>
          <div className="text-slate-600">Ngày: {dateVN(inv.issueDate)}</div>
          {inv.einvoiceData?.invNo && (
            <div className="mt-1 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
              HĐĐT {inv.einvoiceData.invSeries} số {inv.einvoiceData.invNo}
              {inv.einvoiceData.invCode ? <><br />Mã CQT: {inv.einvoiceData.invCode}</> : null}
            </div>
          )}
        </div>
      </header>

      <section className="grid gap-1 py-4 sm:grid-cols-2">
        <div>Người mua: <b>{inv.buyerName}</b></div>
        {inv.buyerLegalName && <div>Đơn vị: {inv.buyerLegalName}</div>}
        {inv.buyerTaxCode && <div>MST: {inv.buyerTaxCode}</div>}
        {inv.buyerAddress && <div className="sm:col-span-2">Địa chỉ: {inv.buyerAddress}</div>}
        {inv.buyerPhone && <div>SĐT: {inv.buyerPhone}</div>}
        {inv.buyerEmail && <div>Email: {inv.buyerEmail}</div>}
      </section>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs text-slate-600">
              <th className="border px-2 py-1.5">STT</th><th className="border px-2">Tên hàng hóa, dịch vụ</th><th className="border px-2">ĐVT</th>
              <th className="border px-2 text-right">SL</th><th className="border px-2 text-right">Đơn giá</th><th className="border px-2 text-right">Thành tiền</th><th className="border px-2 text-right">Thuế</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((l) => (
              <tr key={l.id}>
                <td className="border px-2 py-1.5 text-center">{l.lineNo}</td>
                <td className="border px-2">{l.itemName}</td>
                <td className="border px-2">{l.unit}</td>
                <td className="border px-2 text-right tabular-nums">{l.quantity}</td>
                <td className="border px-2 text-right tabular-nums">{vnd(l.unitPrice)}</td>
                <td className="border px-2 text-right tabular-nums">{vnd(l.amount)}</td>
                <td className="border px-2 text-right tabular-nums">{vatLabel(l.vatRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-6 sm:grid-cols-[1fr_auto]">
        <dl className="space-y-1">
          <div className="flex justify-between"><dt className="text-slate-600">Cộng tiền hàng</dt><dd className="tabular-nums">{vnd(inv.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-600">Tiền thuế GTGT</dt><dd className="tabular-nums">{vnd(inv.vatAmount)}</dd></div>
          <div className="flex justify-between text-base font-semibold"><dt>Tổng thanh toán</dt><dd className="tabular-nums">{vnd(inv.total)}</dd></div>
          <div className="text-xs italic text-slate-600">Bằng chữ: {amountInWordsVN(inv.total)}</div>
          {inv.paidAmount > 0 && <div className="flex justify-between pt-2 text-emerald-700"><dt>Đã thanh toán</dt><dd className="tabular-nums">{vnd(inv.paidAmount)}</dd></div>}
          {inv.due > 0 && inv.status !== "cancelled" && <div className="flex justify-between font-semibold text-rose-700"><dt>Còn phải thanh toán</dt><dd className="tabular-nums">{vnd(inv.due)}</dd></div>}
          {inv.status === "cancelled" && <div className="pt-2 font-semibold text-rose-700">HÓA ĐƠN ĐÃ HỦY</div>}
          {inv.note && <p className="whitespace-pre-line pt-2 text-xs text-slate-500">{inv.note}</p>}
        </dl>
        {qr && inv.bank && inv.due > 0 && inv.status !== "cancelled" && (
          <div className="flex flex-col items-center rounded-xl border p-3 text-center">
            <div className="mb-1 text-xs font-semibold text-slate-700">Quét mã để thanh toán</div>
            {qr}
            <div className="mt-1 text-xs leading-5 text-slate-600">
              <b>{inv.bank.bankShort}</b> · {inv.bank.accountNumber}<br />{inv.bank.accountName}<br />
              Số tiền: <b>{vnd(inv.due)}</b><br />Nội dung: <b>{inv.paymentRef}</b>
            </div>
          </div>
        )}
      </div>
      {!inv.einvoiceData?.invNo && (
        <p className="mt-6 border-t pt-3 text-center text-[11px] text-slate-400">
          Chứng từ bán hàng nội bộ. Hóa đơn điện tử (nếu có) sẽ được gửi qua email sau khi phát hành.
        </p>
      )}
    </article>
  );
}
