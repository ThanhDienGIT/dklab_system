"use client";
import { CalendarDays, Check, Clock, Crown, FileText, Globe, LayoutGrid, List, Map, Receipt, Sparkles, Store, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Guide, type GuideStep } from "@/components/Guide";
import { QR } from "@/components/QR";
import { Badge, Button, cx, Modal, PageHeader, Skeleton, useToast } from "@/components/ui";
import { dateTimeVN, dateVN, vnd } from "@/lib/format";
import { priceFor, TERMS } from "@/modules/plans";
import { api, errorMessage, useCancelOrderMutation, useCreateOrderMutation, useStartTrialMutation, useStoreQuery } from "@/store/api";
import { useAppDispatch } from "@/store/hooks";
import type { StoreAddon, StoreData, StoreOrder, StorePlan } from "@/store/types";

const ICONS: Record<string, LucideIcon> = { receipt: Receipt, globe: Globe, calendar: CalendarDays, grid: LayoutGrid, list: List, map: Map, file: FileText };
const SOURCE: Record<string, string> = { core: "Có sẵn", industry: "Theo ngành", plan: "Trong gói", addon: "Đã mua", trial: "Dùng thử", manual: "Được cấp" };

const GUIDE: GuideStep[] = [
  { target: "store-plan", title: "Gói hiện tại", body: "Gói đang dùng, hạn sử dụng và các plugin tặng kèm. Nâng gói để mở khóa nhiều plugin cùng lúc." },
  { target: "store-addons", title: "Mua thêm từng plugin", body: "Chỉ cần tính năng nào thì mua tính năng đó, theo tháng. Có thể dùng thử miễn phí 14 ngày trước khi mua." },
  { target: "store-orders", title: "Đơn mua & thanh toán", body: "Mỗi đơn có mã QR chuyển khoản riêng. Plugin tự kích hoạt sau khi DKLab xác nhận đã nhận tiền." },
];

export default function StorePage() {
  const [hasPending, setHasPending] = useState(false);
  // Còn đơn chờ thanh toán => tự kiểm tra mỗi 20 giây để kích hoạt ngay khi DKLab xác nhận
  const { data, isLoading } = useStoreQuery(undefined, { refetchOnMountOrArgChange: true, pollingInterval: hasPending ? 20_000 : 0 });
  const dispatch = useAppDispatch();
  const paidRef = useRef<number | null>(null);
  const toastTop = useToast();
  useEffect(() => {
    if (!data) return;
    const pending = data.orders.some((o) => o.status === "pending");
    const paid = data.orders.filter((o) => o.status === "paid").length;
    queueMicrotask(() => setHasPending(pending));
    if (paidRef.current !== null && paid > paidRef.current) {
      dispatch(api.util.invalidateTags(["Me"])); // mở khóa menu / tính năng ngay
      toastTop("Đơn đã được xác nhận, plugin đã kích hoạt");
    }
    paidRef.current = paid;
  }, [data, dispatch, toastTop]);
  const [buy, setBuy] = useState<{ kind: "addon" | "plan"; target: string; name: string; monthly: number } | null>(null);
  const [pay, setPay] = useState<StoreOrder | null>(null);
  const [trial, t] = useStartTrialMutation();
  const toast = useToast();
  if (isLoading || !data) return <Skeleton rows={8} />;
  const plan = data.plans.find((p) => p.key === data.plan.key)!;

  return (
    <>
      <PageHeader title="Cửa hàng plugin" desc="Bắt đầu với gói cơ bản, cần thêm tính năng nào thì mua tính năng đó" />

      {/* Gói */}
      <section data-guide="store-plan" className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <Crown size={16} className="text-amber-500" /> Gói hiện tại: <b>{plan.name}</b>
          {data.plan.expiresAt && <span className="text-slate-500">· hết hạn {dateVN(data.plan.expiresAt)}</span>}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {data.plans.map((p) => (
            <PlanCard key={p.key} p={p} current={p.key === data.plan.key} addons={data.addons}
              onBuy={() => setBuy({ kind: "plan", target: p.key, name: `Gói ${p.name}`, monthly: p.price })} />
          ))}
        </div>
      </section>

      {/* Plugin */}
      <section data-guide="store-addons" className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Store size={18} /> Plugin mua thêm</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.addons.map((a) => (
            <AddonCard key={a.key} a={a} trialDays={data.trialDays} trialLoading={t.isLoading}
              onTrial={async () => { try { await trial(a.key).unwrap(); toast(`Đã bật dùng thử ${a.name} ${data.trialDays} ngày`); } catch (e) { toast(errorMessage(e), "err"); } }}
              onBuy={() => setBuy({ kind: "addon", target: a.key, name: a.name, monthly: a.price })} />
          ))}
        </div>
      </section>

      {/* Đơn */}
      <section data-guide="store-orders">
        <h2 className="mb-3 text-lg font-semibold">Đơn mua</h2>
        <Orders data={data} onPay={setPay} />
      </section>

      {buy && <BuyModal item={buy} onClose={() => setBuy(null)} onCreated={(o) => { setBuy(null); setPay(o); }} />}
      {pay && <PayModal order={pay} bank={data.bank} name={nameOf(data, pay)} onClose={() => setPay(null)} />}
      <Guide steps={GUIDE} storageKey="admin-store" />
    </>
  );
}

const nameOf = (d: StoreData, o: StoreOrder) => (o.kind === "plan" ? `Gói ${d.plans.find((p) => p.key === o.target)?.name ?? o.target}` : d.addons.find((a) => a.key === o.target)?.name ?? o.target);

function PlanCard({ p, current, addons, onBuy }: { p: StorePlan; current: boolean; addons: StoreAddon[]; onBuy: () => void }) {
  return (
    <div className={cx("relative flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition", current ? "border-brand ring-2 ring-brand/30" : "hover:-translate-y-0.5 hover:shadow-md", p.key === "pro" && !current && "border-orange-300")}>
      {p.key === "pro" && <span className="absolute -top-2.5 right-4 rounded-full bg-orange-500 px-2.5 py-0.5 text-[11px] font-semibold text-slate-950">Phổ biến</span>}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{p.name}</h3>
        {current && <Badge color="green">Đang dùng</Badge>}
      </div>
      <p className="text-xs text-slate-500">{p.tagline}</p>
      <div className="my-3 text-2xl font-bold">{vnd(p.price)}<span className="text-sm font-normal text-slate-500">/tháng</span></div>
      <ul className="mb-4 space-y-1.5 text-sm">
        {p.highlights.map((h) => <li key={h} className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-emerald-600" /> {h}</li>)}
        {p.key === "enterprise" && <li className="text-xs text-slate-500">Gồm {addons.length} plugin trong cửa hàng</li>}
      </ul>
      <Button className="mt-auto" variant={current ? "secondary" : "primary"} onClick={onBuy}>{current ? "Gia hạn gói" : "Chọn gói này"}</Button>
    </div>
  );
}

function AddonCard({ a, trialDays, onBuy, onTrial, trialLoading }: { a: StoreAddon; trialDays: number; onBuy: () => void; onTrial: () => void; trialLoading: boolean }) {
  const Icon = ICONS[a.icon] ?? Sparkles;
  const permanent = a.active && !a.expiresAt;
  return (
    <div className={cx("flex flex-col rounded-2xl border bg-white p-5 shadow-sm", a.active && "border-emerald-200 bg-emerald-50/30")}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow"><Icon size={20} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="font-semibold">{a.name}</h3>
            {a.active && <Badge color={a.source === "trial" ? "amber" : "green"}>{SOURCE[a.source ?? ""] ?? "Đang dùng"}</Badge>}
          </div>
          <div className="text-xs text-slate-500">{a.category}</div>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-600">{a.summary}</p>
      <ul className="mt-2 space-y-1 text-xs text-slate-600">
        {a.features.map((f) => <li key={f} className="flex gap-1.5"><Check size={13} className="mt-0.5 shrink-0 text-emerald-600" /> {f}</li>)}
      </ul>
      {a.active && a.expiresAt && <p className="mt-3 flex items-center gap-1 text-xs font-medium text-amber-700"><Clock size={13} /> Hết hạn {dateVN(a.expiresAt)}</p>}
      <div className="mt-auto flex items-end justify-between gap-2 pt-4">
        <div className="text-lg font-bold">{vnd(a.price)}<span className="text-xs font-normal text-slate-500">/tháng</span></div>
        {permanent ? (
          <span className="text-xs font-medium text-emerald-700">{a.inIndustry ? "Có sẵn theo ngành" : a.inPlan ? "Có trong gói của bạn" : "Đang sử dụng"}</span>
        ) : (
          <div className="flex gap-1.5">
            {a.trialAvailable && <Button size="sm" variant="secondary" loading={trialLoading} onClick={onTrial}>Dùng thử {trialDays} ngày</Button>}
            <Button size="sm" onClick={onBuy}>{a.active ? "Gia hạn" : "Mua"}</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function BuyModal({ item, onClose, onCreated }: { item: { kind: "addon" | "plan"; target: string; name: string; monthly: number }; onClose: () => void; onCreated: (o: StoreOrder) => void }) {
  const [months, setMonths] = useState(12);
  const [create, { isLoading }] = useCreateOrderMutation();
  const toast = useToast();
  return (
    <Modal open onClose={onClose} title={`Mua ${item.name}`}
      footer={<Button loading={isLoading} onClick={async () => { try { onCreated(await create({ kind: item.kind, target: item.target, months }).unwrap()); } catch (e) { toast(errorMessage(e), "err"); } }}>Tạo đơn & lấy mã QR</Button>}>
      <div className="space-y-3">
        <span className="label">Chọn kỳ hạn <span className="text-rose-600">*</span></span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Kỳ hạn">
          {TERMS.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={months === m} onClick={() => setMonths(m)}
              className={cx("rounded-xl border p-3 text-left transition", months === m ? "border-brand bg-brand/5 ring-2 ring-brand/30" : "hover:border-slate-400")}>
              <div className="font-semibold">{m} tháng</div>
              <div className="text-xs text-slate-500">{vnd(priceFor(item.monthly, m))}</div>
              {m === 12 && <div className="mt-1 text-[11px] font-semibold text-emerald-700">Tặng 2 tháng</div>}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white">
          <span className="text-sm text-slate-300">Thanh toán</span>
          <span className="text-xl font-bold">{vnd(priceFor(item.monthly, months))}</span>
        </div>
        <p className="text-xs text-slate-500">Giá do hệ thống tính theo bảng giá. Gia hạn sẽ cộng dồn vào thời hạn hiện tại.</p>
      </div>
    </Modal>
  );
}

function PayModal({ order, bank, name, onClose }: { order: StoreOrder; bank: StoreData["bank"]; name: string; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title="Thanh toán đơn mua">
      <div className="flex flex-col items-center text-center">
        <p className="text-sm text-slate-600">{name} · {order.months} tháng</p>
        <div className="my-3 rounded-2xl border p-3">{order.qrPayload && <QR value={order.qrPayload} size={200} />}</div>
        <div className="text-sm leading-6">
          <b>{bank.bankName}</b> · {bank.accountNumber}<br />{bank.accountName}<br />
          Số tiền: <b className="text-lg">{vnd(order.amount)}</b><br />
          Nội dung: <b className="font-mono">{order.code}</b>
        </div>
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Chuyển khoản đúng <b>nội dung</b> để được kích hoạt tự động sau khi DKLab xác nhận (thường vài phút trong giờ hành chính). Có thể đóng cửa sổ này, đơn vẫn nằm trong mục “Đơn mua”.</p>
      </div>
    </Modal>
  );
}

function Orders({ data, onPay }: { data: StoreData; onPay: (o: StoreOrder) => void }) {
  const [cancel] = useCancelOrderMutation();
  if (!data.orders.length) return <p className="rounded-xl border border-dashed bg-white p-6 text-center text-sm text-slate-500">Chưa có đơn mua.</p>;
  const ST = { pending: { l: "Chờ thanh toán", c: "amber" }, paid: { l: "Đã kích hoạt", c: "green" }, cancelled: { l: "Đã hủy", c: "slate" } } as const;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-2.5">Mã</th><th>Nội dung</th><th className="text-right">Số tiền</th><th className="pl-4">Trạng thái</th><th>Ngày</th><th /></tr></thead>
        <tbody className="divide-y">
          {data.orders.map((o) => (
            <tr key={o.id}>
              <td className="px-4 py-2.5 font-mono text-xs">{o.code}</td>
              <td>{o.kind === "trial" ? "Dùng thử: " : ""}{nameOf(data, o)}{o.kind !== "trial" && ` · ${o.months} tháng`}</td>
              <td className="text-right tabular-nums">{o.amount ? vnd(o.amount) : "Miễn phí"}</td>
              <td className="pl-4"><Badge color={ST[o.status].c}>{ST[o.status].l}</Badge></td>
              <td className="text-xs text-slate-500">{dateTimeVN(o.createdAt)}</td>
              <td className="whitespace-nowrap pr-3 text-right">
                {o.status === "pending" && <>
                  <Button size="sm" onClick={() => onPay(o)}>Thanh toán</Button>
                  <button className="ml-1 rounded p-1.5 text-slate-400 hover:text-rose-600" aria-label={`Hủy đơn ${o.code}`} onClick={() => confirm("Hủy đơn này?") && cancel(o.id)}><X size={15} /></button>
                </>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
