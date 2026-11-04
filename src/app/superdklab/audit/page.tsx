"use client";
import { PageHeader, Skeleton } from "@/components/ui";
import { dateTimeVN } from "@/lib/format";
import { usePAudit } from "@/store/platform";

export default function PlatformAudit() {
  const { data, isLoading } = usePAudit();
  return (
    <>
      <PageHeader title="Nhật ký nền tảng" desc="300 thao tác gần nhất của Super Admin: đăng nhập, tạo / khóa doanh nghiệp, đăng nhập thay, đặt lại mật khẩu…" />
      {isLoading ? <Skeleton /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-2.5">Thời gian</th><th>Quản trị viên</th><th>Hành động</th><th>Doanh nghiệp</th><th>Chi tiết</th><th>IP</th></tr></thead>
            <tbody className="divide-y">
              {data?.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-500">{dateTimeVN(a.createdAt)}</td>
                  <td>{a.adminName ?? "—"}</td>
                  <td><code className={`rounded px-1.5 py-0.5 text-xs ${a.action.includes("impersonate") || a.action.includes("failed") ? "bg-amber-100" : "bg-slate-100"}`}>{a.action}</code></td>
                  <td>{a.tenantName ?? ""}</td>
                  <td className="max-w-xs truncate text-xs text-slate-500">{a.data ? JSON.stringify(a.data) : ""}</td>
                  <td className="text-xs text-slate-500">{a.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
