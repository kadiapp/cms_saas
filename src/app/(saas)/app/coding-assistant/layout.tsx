import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Medical Coding Assistant & NCCI Edit Checker | 1500 Claim Billing',
  description: 'Search ICD-10 and CPT codes, check NCCI Procedure-to-Procedure (PTP) edits, and view Medicare Fee Schedules using our official, real-time updated CMS database.',
  alternates: {
    canonical: 'https://cms1500claimbilling.com/app/coding-assistant',
  },
  openGraph: {
    title: 'Free Medical Coding Assistant & NCCI Edit Checker',
    description: 'Instantly search over 3 million official CMS rows. Check CPT/ICD-10 codes, NCCI edits, and Medicare fees for free.',
    url: 'https://cms1500claimbilling.com/app/coding-assistant',
    siteName: '1500 Claim Billing',
    type: 'website',
  }
};

export default function CodingAssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Medical Coding Assistant",
    "url": "https://cms1500claimbilling.com/app/coding-assistant",
    "description": "Free universal medical coding dictionary and dual-code NCCI Edit Checker. Query over 3 million official, real-time updated CMS rows for ICD-10, CPT, and Medicare Fee Schedules.",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "All",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
