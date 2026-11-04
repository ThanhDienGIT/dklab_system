"use client";
import { Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Button, Field, PageHeader, Skeleton, useToast } from "@/components/ui";
import type { SettingsData } from "@/store/types";
import { vnd } from "@/lib/format";
import { errorMessage, useBookingQuery, useCreateInvoiceMutation, useSettingsQuery } from "@/store/api";

type Line = { itemName: string; unit: string; quantity: number; unitPrice: number; vatRate: number };
const VAT_OPTIONS = [{ v: 8, l: "8%" }, { v: 10, l: "10%" }, { v: 5, l: "5%" }, { v: 0, l: "0%" }, { v: -1, l: "KCT" }, { v: -2, l: "KKKNT" }];

function NewInvoice() {
  const sp = useSearchParams();
  const bookingId = sp.get("bookingId");
  const { data: booking, isLoading: lb } = useBookingQuery(bookingId!, { skip: !bookingId });
  const { data: settings, isLoading: ls } = useSettingsQuery();
  if ((bookingId && lb) || ls) return <Skeleton rows={6} />;
  return <InvoiceForm booking={booking ?? null} settings={settings} />;
}

type BookingWithPrice = NonNullable<ReturnType<typeof useBookingQuery>["data"]>;

function InvoiceForm({ booking, settings }: { booking: BookingWithPrice | null; settings?: SettingsData }) {
  const router = useRouter();
  const toast = useToast();
  const bookingId = booking?.id ?? null;
  const [create, { isLoading }] = useCreateInvoiceMutation();
  const defaultVat = Number(settings?.settings.invoice?.defaultVatRate ?? 8);

  const [buyer, setBuyer] = useState(() => ({
    buyerName: booking?.fullName ?? "", buyerLegalName: "", buyerTaxCode: "", buyerAddress: "",
    buyerEmail: booking?.email ?? "", buyerPhone: booking?.phone ?? "", note: booking ? `Đặt chỗ ${booking.code}` : "",
  }));
  const [lines, setLines] = useState<Line[]>(() => {
    if (!booking) return [{ itemName: "", unit: "Khách", quantity: 1, unitPrice: 0, vatRate: defaultVat }];
    if (booking.lines?.length) return booking.lines.map((l: Omit<Line, "vatRate">) => ({ ...l, vatRate: defaultVat }));
    const p = booking.unitPrice;
    const label = `${booking.resourceLabel ?? "Dịch vụ"}${booking.bookingDate ? ` – KH ${booking.bookingDate.split("-").reverse().join("/")}` : ""}`;
    const ls: Line[] = [{ itemName: `${label} (người lớn)`, unit: "Khách", quantity: booking.adults, unitPrice: p?.adult ?? 0, vatRate: defaultVat }];
    if (booking.children) ls.push({ itemName: `${label} (trẻ em)`, unit: "Khách", quantity: booking.children, unitPrice: p?.child ?? 0, vatRate: defaultVat });
    return ls;
  });
  const [bankAccountId, setBank] = useState<string>("");

  const totals = useMemo(() => {
    let sub = 0, vat = 0;
    for (const l of lines) {
      const a = Math.round(l.quantity * l.unitPrice);
      sub += a;
      vat += l.vatRate > 0 ? Math.round((a * l.vatRate) / 100) : 0;
    }
    return { sub, vat, total: sub + vat };
  }, [lines]);

  const setLine = (i: number, k: keyof Line, v: string | number) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  async function submit() {
    try {
      const inv = await create({ ...buyer, bookingId, customerId: booking?.customerId ?? null, bankAccountId: bankAccountId || null, items: lines }).unwrap();
      toast(`Đã lập hóa đơn ${inv.code}`);
      router.replace(`/admin/invoices/${inv.id}`);
    } catch (e) {
      toast(errorMessage(e), "err");
    }
  }
  const sb = (k: keyof typeof buyer) => ({ value: buyer[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setBuyer((b) => ({ ...b, [k]: e.target.value })) });

  return (
    <>
      <PageHeader title="Lập hóa đơn" desc={booking ? `Từ đặt chỗ ${booking.code}` : "Hóa đơn bán hàng / dịch vụ"} />
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card space-y-3 p-4 lg:col-span-1">
          <h2 className="font-semibold">Người mua</h2>
          <Field required label="Họ tên người mua"><input className="input" {...sb("buyerName")} /></Field>
          <Field label="Tên đơn vị (nếu xuất cho công ty)"><input className="input" {...sb("buyerLegalName")} /></Field>
          <Field label="Mã số thuế"><input className="input" {...sb("buyerTaxCode")} /></Field>
          <Field label="Địa chỉ"><input className="input" {...sb("buyerAddress")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SĐT"><input className="input" {...sb("buyerPhone")} /></Field>
            <Field label="Email nhận HĐ"><input className="input" {...sb("buyerEmail")} /></Field>
          </div>
          <Field label="Tài khoản nhận tiền (VietQR)">
            <select className="input" value={bankAccountId} onChange={(e) => setBank(e.target.value)}>
              <option value="">Mặc định</option>
              {settings?.settings.bankAccounts?.map((a) => <option key={a.id} value={a.id}>{a.bankName} – {a.accountNumber}</option>)}
            </select>
          </Field>
          <Field label="Ghi chú"><input className="input" {...sb("note")} /></Field>
        </section>
        <section className="card p-4 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Hàng hóa / dịch vụ</h2>
          <div className="space-y-3">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 rounded-lg border border-slate-200 p-3">
                <Field required label="Tên hàng hóa, dịch vụ" className="col-span-12"><input className="input" value={l.itemName} onChange={(e) => setLine(i, "itemName", e.target.value)} /></Field>
                <Field label="ĐVT" className="col-span-3 sm:col-span-2"><input className="input" value={l.unit} onChange={(e) => setLine(i, "unit", e.target.value)} /></Field>
                <Field label="SL" className="col-span-3 sm:col-span-2"><input className="input" type="number" min={1} value={l.quantity} onChange={(e) => setLine(i, "quantity", +e.target.value)} /></Field>
                <Field label="Đơn giá" className="col-span-6 sm:col-span-3"><input className="input" type="number" min={0} step={1000} value={l.unitPrice} onChange={(e) => setLine(i, "unitPrice", +e.target.value)} /></Field>
                <Field label="Thuế GTGT" className="col-span-6 sm:col-span-2">
                  <select className="input" value={l.vatRate} onChange={(e) => setLine(i, "vatRate", +e.target.value)}>
                    {VAT_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </Field>
                <div className="col-span-6 flex items-end justify-end gap-2 sm:col-span-3">
                  <span className="pb-2 text-sm font-medium tabular-nums">{vnd(l.quantity * l.unitPrice)}</span>
                  {lines.length > 1 && <button className="mb-1 rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}><Trash2 size={15} /></button>}
                </div>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => setLines((ls) => [...ls, { itemName: "", unit: "Lần", quantity: 1, unitPrice: 0, vatRate: defaultVat }])}><Plus size={14} /> Thêm dòng</Button>
          <dl className="mt-4 space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Cộng tiền hàng</dt><dd className="tabular-nums">{vnd(totals.sub)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Thuế GTGT</dt><dd className="tabular-nums">{vnd(totals.vat)}</dd></div>
            <div className="flex justify-between text-base font-semibold"><dt>Tổng thanh toán</dt><dd className="tabular-nums">{vnd(totals.total)}</dd></div>
          </dl>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => router.back()}>Hủy</Button>
            <Button loading={isLoading} onClick={submit}>Lập hóa đơn</Button>
          </div>
        </section>
      </div>
    </>
  );
}

export default function Page() {
  return <Suspense><NewInvoice /></Suspense>;
}
