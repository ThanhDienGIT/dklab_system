import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Suspense } from "react";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { loadInvoice } from "@/lib/services/invoices";
import type { InvoiceFull } from "@/store/types";

export const metadata: Metadata = { title: "Thanh toán hóa đơn", robots: { index: false, follow: false } };

export default function PayPage({ params }: PageProps<"/pay/[token]">) {
  return (
    <main className="min-h-dvh bg-slate-100 px-3 py-6">
      <Suspense fallback={<div className="mx-auto h-96 max-w-3xl animate-pulse rounded-xl bg-white" />}>
        <Pay params={params} />
      </Suspense>
    </main>
  );
}

async function Pay({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) notFound();
  const inv = await loadInvoice({ publicToken: token });
  if (!inv) notFound();
  const svg = inv.qrPayload ? await QRCode.toString(inv.qrPayload, { type: "svg", margin: 1, errorCorrectionLevel: "M" }) : null;
  const data = JSON.parse(JSON.stringify(inv)) as InvoiceFull;
  return (
    <>
      {inv.due > 0 && inv.status !== "cancelled" ? (
        <div className="mx-auto mb-4 max-w-3xl rounded-xl bg-white p-4 text-center shadow-sm">
          <p className="text-sm text-slate-600">Mở app ngân hàng → Quét QR. Số tiền và nội dung chuyển khoản được điền sẵn.</p>
        </div>
      ) : inv.status === "paid" ? (
        <div className="mx-auto mb-4 max-w-3xl rounded-xl bg-emerald-50 p-4 text-center font-medium text-emerald-800">✓ Hóa đơn đã được thanh toán đầy đủ. Cảm ơn quý khách!</div>
      ) : null}
      <InvoiceDocument inv={data} qr={svg ? <div className="h-[200px] w-[200px] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} /> : undefined} />
    </>
  );
}
