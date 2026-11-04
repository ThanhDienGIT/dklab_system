import type { Metadata } from "next";
import { PlatformApp } from "@/components/platform/PlatformShell";

export const metadata: Metadata = { title: "Super Admin – DKLab", robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PlatformApp>{children}</PlatformApp>;
}
