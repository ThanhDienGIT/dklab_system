import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="text-5xl font-bold text-slate-300">404</div>
      <p className="text-slate-600">Không tìm thấy trang hoặc doanh nghiệp cho tên miền này.</p>
      <Link href="/" className="text-brand hover:underline">Về trang chủ</Link>
    </main>
  );
}
