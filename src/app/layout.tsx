import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "ClaimPilot | Medical Billing & CMS-1500 Software",
  description: "The modern platform for medical billing, CMS-1500 form validation, and payer rules compliance.",
};

import ScrollToTop from '@/components/ScrollToTop';
import Analytics from '@/components/Analytics';

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full w-full flex flex-col items-center bg-[#080a0f] text-gray-100">
        <Analytics />
        {children}
        <ScrollToTop /></body>
    </html>
  );
}
