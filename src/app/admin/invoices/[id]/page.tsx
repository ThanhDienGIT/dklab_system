"use client";
import { ArrowLeft, CheckCircle2, Copy, FileUp, Printer, Send, Wallet, XCircle } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { UpsellCard, useHasModule, usePerm } from "@/components/admin/AdminShell";
import { EINVOICE_STATUS, INVOICE_STATUS } from "@/components/admin/status";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { QR } from "@/components/QR";
import { Badge, Button, Field, Modal, Skeleton, useToast } from "@/components/ui";
import { dateTimeVN, vnd } from "@/lib/format";
import { errorMessage, useAddPaymentMutation, useCancelInvoiceMutation, useEinvoiceMutation, useInvoiceQuery } from "@/store/api";

const METHOD: Record<string, string> = { cash: "Tiền mặt", bank_transfer: "Chuyển khoản", card: "Thẻ" };

export default function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: inv, isLoading } = useInvoiceQuery(id);
  const [pay, payState] = useAddPaymentMutation();
  const [cancel, cancelState] = useCancelInvoiceMutation();
  const [einvoice, eState] = useEinvoiceMutation();
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ amount: 0, method: "bank_transfer", reference: "" });
  const [publishOpen, setPublishOpen] = useState(false);
  const [signedXml, setSignedXml] = useState("");
  const toast = useToast();
  const can = usePerm();
  const hasModule = useHasModule();

  if (isLoading || !inv) return <Skeleton rows={8} />;
  const payUrl = typeof window !== "undefined" ? `${window.location.origin}/pay/${inv.publicToken}` : "";
  const env = inv.einvoiceData?.env;

  async function run<T>(p: Promise<T>, okMsg: string) {
    try {
      await p;
      toast(okMsg);
      return true;
    } catch (e) {
      toast(errorMessage(e), "err");
      return false;
    }
  }

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <Link href="/admin/invoices" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"><ArrowLeft size={16} /> Hóa đơn</Link>
        <span className="mx-1 text-slate-300">/</span>
        <span className="font-semibold">{inv.code}</span>
        <Badge color={INVOICE_STATUS[inv.status].color}>{INVOICE_STATUS[inv.status].label}</Badge>
        <Badge color={EINVOICE_STATUS[inv.einvoiceStatus].color}>{EINVOICE_STATUS[inv.einvoiceStatus].label}</Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => window.print()}><Printer size={15} /> In / PDF</Button>
          <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(payUrl); toast("Đã copy link thanh toán, gửi cho khách qua Zalo/SMS"); }}>
            <Copy size={15} /> Link thanh toán
          </Button>
          {can("invoice.payment") && inv.due > 0 && inv.status !== "cancelled" && (
            <Button size="sm" variant="success" onClick={() => { setPayForm({ amount: inv.due, method: "bank_transfer", reference: inv.paymentRef }); setPayOpen(true); }}>
              <Wallet size={15} /> Ghi nhận thanh toán
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <InvoiceDocument inv={inv} qr={inv.qrPayload ? <QR value={inv.qrPayload} size={170} /> : undefined} />

        <aside className="no-print space-y-4">
          {!inv.bank && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Chưa cấu hình tài khoản ngân hàng → chưa có mã VietQR. <Link className="underline" href="/admin/settings">Cài đặt</Link></div>}

          {!hasModule("einvoice") ? (
            <UpsellCard title="Hóa đơn điện tử MISA" text="Đẩy và phát hành hóa đơn điện tử ngay từ hệ thống. Có trong gói Chuyên nghiệp hoặc mua riêng, dùng thử miễn phí 14 ngày." />
          ) : (
          <section className="card p-4">
            <h3 className="mb-2 flex items-center gap-2 font-semibold"><FileUp size={16} /> Hóa đơn điện tử MISA</h3>
            {env && <p className="mb-2 text-xs text-slate-500">Môi trường: {env === "mock" ? "Giả lập (demo)" : env === "test" ? "MISA Test" : "MISA Production"}</p>}
            {inv.einvoiceData?.transactionId && <p className="text-xs text-slate-600">TransactionID: <code>{inv.einvoiceData.transactionId}</code></p>}
            {inv.einvoiceData?.invNo && <p className="text-sm text-emerald-700">Ký hiệu {inv.einvoiceData.invSeries} · Số <b>{inv.einvoiceData.invNo}</b></p>}
            {inv.einvoiceData?.error && <p className="mt-1 rounded bg-rose-50 p-2 text-xs text-rose-700">{inv.einvoiceData.error}</p>}
            {can("einvoice.publish") && inv.status !== "cancelled" && (
              <div className="mt-3 flex flex-col gap-2">
                {(inv.einvoiceStatus === "none" || inv.einvoiceStatus === "error") && (
                  <Button size="sm" loading={eState.isLoading} onClick={() => run(einvoice({ id, action: "create" }).unwrap(), "Đã đẩy hóa đơn sang MISA")}>
                    <Send size={14} /> Đẩy sang MISA meInvoice
                  </Button>
                )}
                {inv.einvoiceStatus === "created" && (
                  <Button size="sm" variant="success" loading={eState.isLoading} onClick={() => (env === "mock" ? run(einvoice({ id, action: "publish" }).unwrap(), "Đã phát hành HĐĐT") : setPublishOpen(true))}>
                    <CheckCircle2 size={14} /> Phát hành (cấp số)
                  </Button>
                )}
                {inv.einvoiceStatus === "created" && env !== "mock" && (
                  <p className="text-xs text-slate-500">Hoặc đăng nhập MISA meInvoice để ký số bằng USB token và phát hành hóa đơn đã đẩy sang.</p>
                )}
              </div>
            )}
            {!!inv.einvoiceData?.history?.length && (
              <ul className="mt-3 space-y-1 border-t pt-2 text-xs text-slate-500">
                {inv.einvoiceData.history.slice(-5).map((h, i) => (
                  <li key={i}>{h.ok ? "✓" : "✗"} {dateTimeVN(h.at)} – {h.action}: {h.message}</li>
                ))}
              </ul>
            )}
          </section>
          )}

          <section className="card p-4">
            <h3 className="mb-2 font-semibold">Lịch sử thanh toán</h3>
            {inv.payments.length ? (
              <ul className="space-y-1.5 text-sm">
                {inv.payments.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2">
                    <span>{METHOD[p.method] ?? p.method}<span className="block text-xs text-slate-500">{dateTimeVN(p.paidAt)}</span></span>
                    <b className="tabular-nums">{vnd(p.amount)}</b>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-500">Chưa có thanh toán</p>}
          </section>

          {can("invoice.cancel") && inv.status === "issued" && inv.paidAmount === 0 && inv.einvoiceStatus !== "published" && (
            <Button variant="ghost" size="sm" className="w-full text-rose-600" loading={cancelState.isLoading}
              onClick={() => { const reason = prompt("Lý do hủy hóa đơn?"); if (reason) run(cancel({ id, reason }).unwrap(), "Đã hủy hóa đơn"); }}>
              <XCircle size={15} /> Hủy hóa đơn
            </Button>
          )}
        </aside>
      </div>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Ghi nhận thanh toán"
        footer={<Button loading={payState.isLoading} onClick={async () => { if (await run(pay({ id, ...payForm }).unwrap(), "Đã ghi nhận thanh toán")) setPayOpen(false); }}>Xác nhận</Button>}>
        <div className="space-y-3">
          <Field label="Số tiền"><input className="input" type="number" value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: +e.target.value }))} /></Field>
          <Field label="Hình thức">
            <select className="input" value={payForm.method} onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}>
              <option value="bank_transfer">Chuyển khoản</option><option value="cash">Tiền mặt</option><option value="card">Thẻ</option>
            </select>
          </Field>
          <Field label="Tham chiếu (mã GD ngân hàng…)"><input className="input" value={payForm.reference} onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))} /></Field>
        </div>
      </Modal>

      <Modal open={publishOpen} onClose={() => setPublishOpen(false)} title="Phát hành hóa đơn điện tử" wide
        footer={<Button loading={eState.isLoading} onClick={async () => { if (await run(einvoice({ id, action: "publish", signedXml }).unwrap(), "Đã phát hành HĐĐT")) setPublishOpen(false); }}>Phát hành</Button>}>
        <p className="mb-2 text-sm text-slate-600">Dán XML hóa đơn đã ký số (từ công cụ ký MISA / HSM). Nếu ký bằng USB token trên MISA meInvoice thì phát hành trực tiếp trên MISA.</p>
        <textarea className="input min-h-48 font-mono text-xs" value={signedXml} onChange={(e) => setSignedXml(e.target.value)} placeholder="<HDon>…<Signature>…</Signature></HDon>" />
      </Modal>
    </>
  );
}
