"use client";
import { PageHeader, Skeleton } from "@/components/ui";
import { dateTimeVN } from "@/lib/format";
import { useAuditQuery } from "@/store/api";

export default function AuditPage() {
  const { data, isLoading } = useAuditQuery();
  return (
    <>
      <PageHeader title="Nhật ký hoạt động" desc="200 thao tác gần nhất: ai làm gì, lúc nào, từ IP nào" />
      {isLoading ? <Skeleton /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-2.5">Thời gian</th><th>Người dùng</th><th>Hành động</th><th>Chi tiết</th><th>IP</th></tr></thead>
            <tbody className="divide-y">
              {data?.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-500">{dateTimeVN(a.createdAt)}</td>
                  <td>{a.userName ?? "—"}</td>
                  <td><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{a.action}</code></td>
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
