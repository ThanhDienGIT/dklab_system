import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const font = Be_Vietnam_Pro({ subsets: ["latin", "vietnamese"], weight: ["400", "500", "600", "700"], variable: "--font-be-vietnam", display: "swap" });

export const metadata: Metadata = {
  title: { default: "DKLab Platform", template: "%s" },
  description: "Nền tảng quản lý đa ngành: du lịch, khách sạn, nhà hàng, cà phê, spa",
};

export const viewport: Viewport = { themeColor: "#0e7490", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={font.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
