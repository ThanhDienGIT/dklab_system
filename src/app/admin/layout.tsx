import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminShell";

export const metadata: Metadata = { title: "Quản trị", robots: { index: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminApp>{children}</AdminApp>;
}
