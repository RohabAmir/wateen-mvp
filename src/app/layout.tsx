import type { Metadata } from "next";
import localFont from "next/font/local";
import { getLocale } from "@/lib/locale";
import "./globals.css";

const tajawal = localFont({
  src: [
    { path: "../fonts/Tajawal-Regular.woff2", weight: "400" },
    { path: "../fonts/Tajawal-Medium.woff2", weight: "500" },
    { path: "../fonts/Tajawal-Bold.woff2", weight: "700" },
  ],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Wateen-MVP | Back-of-house and inventory platform for restaurants", template: "%s | Wateen-MVP" },
  description:
    "Inventory control, recipe costing, e-procurement and a supplier marketplace for restaurants and F&B groups in Saudi Arabia.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={tajawal.variable}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
