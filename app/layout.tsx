import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/ui/app-shell";
import { getCatalogStatus } from "@/lib/data/catalog-status";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Canada Study Match",
  description: "Match international students to Canadian university and college programs",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const catalogStatus = await getCatalogStatus();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <AppShell catalogStatus={catalogStatus}>{children}</AppShell>
      </body>
    </html>
  );
}
