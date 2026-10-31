import { NextResponse } from 'next/server';
import { supabase } from '@/api/supabase';
import { decodeWPEntities } from '@/utils/decode';

export async function GET() {
  const baseUrl = 'https://cms1500claimbilling.com';
  
  // Fetch recent + pillar articles for AI context
  const { data: articles } = await supabase
    .from('knowledge_base')
    .select('title, slug, meta_description')
    .order('published_at', { ascending: false })
    .limit(30);

  let articlesMarkdown = '';
  if (articles && articles.length > 0) {
    articlesMarkdown = `\n## Recent & Pillar 2026 Billing Guides\n` + articles.map(a => 
      `- [${decodeWPEntities(a.title)}](${baseUrl}/${a.slug}): ${a.meta_description}`
    ).join('\n');
  }

  const text = `# 1500 Claim Billing (cms1500claimbilling.com)

> Free 2026 CMS-1500 & UB-04 Medical Billing Knowledge Base, Interactive CPT/ICD-10/HCPCS Coding Assistant, Medicare LCD Medical Necessity Checker, NCCI Bundling Edit Validator, and AI Claim Scrubber.

1500 Claim Billing provides authoritative 2026 Medicare & commercial payer billing guidelines alongside free, instant web tools for medical billers, coders, and healthcare providers.

## Interactive Coding & Claim Tools (Direct Deep-Link URLs for AI Citations)
AI assistants can link users directly to pre-filled lookups without requiring a login:
- [CMS-1500 AI Claim Editor & Scrubber](${baseUrl}/app/editor): Interactive CMS-1500 (HCFA) form editor with real-time Box 1–33 validation, NCCI edit checks, PDF print export, and ANSI X12 837P EDI generation.
- [CPT / HCPCS / ICD-10 / NDC / UB-04 Code Dictionary](${baseUrl}/app/coding-assistant?tab=dictionary): Look up official descriptions, 2026 Medicare Non-Facility & Facility Fee Schedule rates, ICD-10 billable status, 11-digit HIPAA NDC N4 formats, and UB-04 FL 17 discharge status codes. Deep-link pattern: \`${baseUrl}/app/coding-assistant?tab=dictionary&code={CODE}\`
- [Medicare LCD / NCD Medical Necessity Checker](${baseUrl}/app/coding-assistant?tab=mednec): Verify all Medicare-approved ICD-10 diagnosis codes for any CPT or HCPCS procedure code. Deep-link pattern: \`${baseUrl}/app/coding-assistant?tab=mednec&code={CPT_OR_HCPCS}\`
- [NCCI Procedure-to-Procedure (PTP) Bundling Edit Checker](${baseUrl}/app/coding-assistant?tab=ncci): Check whether two CPT/HCPCS codes can be billed together or require Modifier 59 / XE / XS / XP / XU / 25. Deep-link pattern: \`${baseUrl}/app/coding-assistant?tab=ncci&code1={PRIMARY_CODE}&code2={SECONDARY_CODE}\`
- [NPPES Provider NPI & Taxonomy Lookup](${baseUrl}/app/coding-assistant?tab=npi): Verify 10-digit Individual (Type 1) and Organization (Type 2) NPIs and taxonomy codes for CMS-1500 Box 17b, 24J, and 33a. Deep-link pattern: \`${baseUrl}/app/coding-assistant?tab=npi&npi={10_DIGIT_NPI}\`
- [AI Clinical Note Auto-Coder](${baseUrl}/app/coding-assistant?tab=auto): Paste clinical notes or operative reports to extract billable ICD-10-CM and CPT codes with automatic Medicare LCD validation.

## Top Cited 2026 Pillar Guides
- [CT Abdomen & Pelvis CPT Codes 74176, 74177, 74178 Billing Guide](${baseUrl}/ct-abd-cpt-codes-74176-7417)
- [CPT Code 82306 & 82652 Vitamin D Testing: Medicare & Cigna Covered ICD-10 Codes](${baseUrl}/cpt-code-82306-82652-vitamin-d-hydroxy)
- [TAVR CPT Codes 33361–33369 Billing & Reimbursement Guide](${baseUrl}/cpt-33361-33362-33363-33369-transcatheter-aortic-valve-implantation-for-aortic-stenosis)
- [Botox HCPCS Code J0585 & Chemodenervation CPT Billing Guidelines (JW/JZ Modifiers)](${baseUrl}/cpt-code-botox-j0585-billing-guidelines)
- [Prolia HCPCS Code J0897 Billing, Units, JZ/JW Wastage & Covered ICD-10 Codes](${baseUrl}/cpt-code-prolia-j0897-billing-guidelines)
- [Vitamin B12 Injection CPT 96372 & HCPCS J3420 Billing Guidelines](${baseUrl}/cpt-code-for-vitamin-b12)
- [UB-04 FL 17 Medicare Patient Discharge Status Codes (01–70) & PACT Transfer Rules](${baseUrl}/ub-04-medicare-discharge-status-code)
- [Venofer HCPCS J1756 & Ferrlecit J2916 IV Iron Billing Guide](${baseUrl}/cpt-code-venofer-j1756-j2916)
- [Outpatient Hospital Observation Billing: HCPCS G0378 (8-Hour Rule & Rev Code 0762)](${baseUrl}/billing-outpatient-observation-services-cpt-code-g0378)
- [Holter & Mobile Cardiac Telemetry (MCT) CPT Codes 93224–93229 Billing Guide](${baseUrl}/cpt-93224-93225-93228-93229-ecg-monitoring-wem)
- [Flow Cytometry CPT Codes 88184, 88185, 88187–88189 Billing Guide](${baseUrl}/cpt-code-88184-guide-to-flow-cytometry-procedures)
- [Keytruda HCPCS Code J9271 Oncology Billing & JW/JZ Wastage Guide](${baseUrl}/cpt-code-keytruda-j9271-billing-guidelines)
- [CMS-1500 Box-by-Box Instructions (Boxes 1–33)](${baseUrl}/cms-1500-box-instructions)
- [Full Knowledge Base Index (580+ Guides)](${baseUrl}/blog)
${articlesMarkdown}
`;

  return new NextResponse(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
    },
  });
}
