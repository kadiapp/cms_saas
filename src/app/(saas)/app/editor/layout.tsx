import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free CMS-1500 Auto-Fill Editor & Validator | 1500 Claim Billing',
  description: 'Upload your superbill and let our AI auto-fill your CMS-1500 claim form in seconds. Instantly validate CPT, ICD-10, and NPI codes before submission.',
};

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
