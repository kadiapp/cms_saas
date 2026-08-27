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
  title: "1500 Claim Billing | Guide & Software",
  description: "The modern platform for medical billing, CMS-1500 form validation, and payer rules compliance.",
};

import ScrollToTop from '@/components/ScrollToTop';
import Analytics from '@/components/Analytics';
import { PostHogProvider } from '@/providers/PostHogProvider';

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full w-full flex flex-col items-center bg-[#080a0f] text-gray-100">
        <PostHogProvider>
        <Analytics />
        <div style={{ flex: '1 0 auto', width: '100%', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
        <footer style={{ width: '100%', padding: '24px 20px', textAlign: 'center', borderTop: '1px solid #1e293b', background: '#080a0f', color: '#64748b', fontSize: '0.85rem', flexShrink: 0, marginTop: 'auto', zIndex: 10 }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
            <div>&copy; 2026 1500 Claim Billing. All rights reserved.</div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <a href="/privacy" style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }} className="footer-link">Privacy Policy & HIPAA BAA</a>
            </div>
          </div>
        </footer>
        <ScrollToTop />
        </PostHogProvider>
      </body>
    </html>
  );
}
