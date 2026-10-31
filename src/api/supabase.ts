import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
const rulesSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_RULES_URL || '';
const rulesSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_RULES_ANON_KEY || '';
export const supabaseCoding = (rulesSupabaseUrl && rulesSupabaseKey) 
  ? createClient(rulesSupabaseUrl, rulesSupabaseKey)
  : supabase;

const medNecUrl = process.env.NEXT_PUBLIC_SUPABASE_MEDICAL_NECESSITY_URL || '';
const medNecKey = process.env.NEXT_PUBLIC_SUPABASE_MEDICAL_NECESSITY_ANON_KEY || '';
export const supabaseMedicalNecessity = (medNecUrl && medNecKey)
  ? createClient(medNecUrl, medNecKey)
  : supabase;


export interface CodeResult {
  code: string;
  short_description: string;
  long_description?: string;
}

export async function verifyIcdCode(code: string): Promise<CodeResult> {
  const { data, error } = await supabase
    .from('cms_icd10_codes')
    .select('code, short_description, long_description, billable')
    .eq('code', code.replace(/\./g, '').toUpperCase())
    .single();

  if (error || !data) {
    throw new Error('ICD-10 code not found in database');
  }

  return data;
}


const UB04_DISCHARGE_CODES: Record<string, { code: string; short_description: string; long_description: string }> = {
  '01': { code: 'FL17-01', short_description: 'UB-04 Status 01: Discharged to Home or Self Care (Routine Discharge)', long_description: 'Official CMS UB-04 FL 17 / EDI 837I CL103 Status 01: Discharged to home or self care (routine discharge). Includes discharge to home with outpatient physical therapy or home IV drugs without home health agency admission. Does NOT trigger the Medicare Post-Acute Care Transfer (PACT) payment reduction.' },
  '02': { code: 'FL17-02', short_description: 'UB-04 Status 02: Discharged/Transferred to Short-Term General Hospital for Inpatient Care', long_description: 'Official CMS UB-04 FL 17 Status 02: Discharged or transferred to another short-term general hospital for inpatient care. Subject to Medicare Acute-to-Acute Inpatient Transfer per-diem payment policy.' },
  '03': { code: 'FL17-03', short_description: 'UB-04 Status 03: Discharged/Transferred to Skilled Nursing Facility (SNF) with Medicare Certification', long_description: 'Official CMS UB-04 FL 17 Status 03: Discharged or transferred to a Skilled Nursing Facility (SNF) with Medicare certification in anticipation of skilled care. Triggers the Medicare Post-Acute Care Transfer (PACT) policy for qualifying MS-DRGs if length of stay is less than the geometric mean LOS.' },
  '04': { code: 'FL17-04', short_description: 'UB-04 Status 04: Discharged/Transferred to Intermediate Care Facility (ICF / Nursing Home)', long_description: 'Official CMS UB-04 FL 17 Status 04: Discharged or transferred to a facility that provides custodial or supportive care (Intermediate Care Facility / non-skilled nursing home). Does not trigger SNF skilled transfer edits.' },
  '05': { code: 'FL17-05', short_description: 'UB-04 Status 05: Discharged/Transferred to Designated Cancer Center or Children\'s Hospital', long_description: 'Official CMS UB-04 FL 17 Status 05: Discharged or transferred to a designated cancer center or children\'s hospital. Subject to Medicare PACT policy for qualifying MS-DRGs.' },
  '06': { code: 'FL17-06', short_description: 'UB-04 Status 06: Discharged/Transferred to Home Under Care of Organized Home Health Service (HHA)', long_description: 'Official CMS UB-04 FL 17 Status 06: Discharged or transferred to home under care of an organized Home Health Agency (HHA) when HHA services begin within 3 days of discharge. Subject to Medicare Post-Acute Care Transfer (PACT) policy for qualifying MS-DRGs.' },
  '07': { code: 'FL17-07', short_description: 'UB-04 Status 07: Left Against Medical Advice (AMA) or Discontinued Care', long_description: 'Official CMS UB-04 FL 17 Status 07: Patient left against medical advice (AMA) or discontinued care without physician discharge order.' },
  '09': { code: 'FL17-09', short_description: 'UB-04 Status 09: Admitted as an Inpatient to This Hospital (Outpatient-to-Inpatient)', long_description: 'Official CMS UB-04 FL 17 Status 09: Admitted as an inpatient to this hospital (used on outpatient/ED UB-04 claims when the patient is subsequently admitted as an inpatient; subject to the Medicare 3-Day Payment Window rule).' },
  '20': { code: 'FL17-20', short_description: 'UB-04 Status 20: Expired (Patient Died in Facility)', long_description: 'Official CMS UB-04 FL 17 Status 20: Expired (patient died while in the hospital or facility). Requires corresponding Occurrence Code 55 (Date of Death) if applicable.' },
  '21': { code: 'FL17-21', short_description: 'UB-04 Status 21: Discharged/Transferred to Court or Law Enforcement', long_description: 'Official CMS UB-04 FL 17 Status 21: Discharged or transferred to court/law enforcement custody (jail, prison, or detention facility).' },
  '30': { code: 'FL17-30', short_description: 'UB-04 Status 30: Still a Patient (Interim Continuing Claim)', long_description: 'Official CMS UB-04 FL 17 Status 30: Still a patient. Used on interim continuing claims (Type of Bill XX2 or XX3) when the patient remains admitted at the end of the billing cycle.' },
  '43': { code: 'FL17-43', short_description: 'UB-04 Status 43: Discharged/Transferred to a Federal Health Care Facility (VA / DoD)', long_description: 'Official CMS UB-04 FL 17 Status 43: Discharged or transferred to a federal health care facility (such as a Veterans Affairs or Department of Defense hospital).' },
  '50': { code: 'FL17-50', short_description: 'UB-04 Status 50: Discharged to Hospice — Home (Routine or Continuous Home Hospice)', long_description: 'Official CMS UB-04 FL 17 Status 50: Discharged or transferred to Hospice — Home.' },
  '51': { code: 'FL17-51', short_description: 'UB-04 Status 51: Discharged/Transferred to Hospice — Medical Facility (Inpatient Hospice)', long_description: 'Official CMS UB-04 FL 17 Status 51: Discharged or transferred to Hospice — Medical Facility (certified Medicare inpatient hospice).' },
  '61': { code: 'FL17-61', short_description: 'UB-04 Status 61: Discharged/Transferred to Hospital-Based Medicare Approved Swing Bed', long_description: 'Official CMS UB-04 FL 17 Status 61: Discharged or transferred within this institution to a hospital-based Medicare approved swing bed. Subject to Medicare PACT policy.' },
  '62': { code: 'FL17-62', short_description: 'UB-04 Status 62: Discharged/Transferred to an Inpatient Rehabilitation Facility (IRF)', long_description: 'Official CMS UB-04 FL 17 Status 62: Discharged or transferred to an Inpatient Rehabilitation Facility (IRF) including rehabilitation distinct part units of a hospital. Triggers the Medicare Post-Acute Care Transfer (PACT) policy for qualifying MS-DRGs.' },
  '63': { code: 'FL17-63', short_description: 'UB-04 Status 63: Discharged/Transferred to a Medicare Certified Long Term Care Hospital (LTCH)', long_description: 'Official CMS UB-04 FL 17 Status 63: Discharged or transferred to a Medicare certified Long Term Care Hospital (LTCH). Triggers the Medicare Post-Acute Care Transfer (PACT) policy for qualifying MS-DRGs.' },
  '64': { code: 'FL17-64', short_description: 'UB-04 Status 64: Discharged/Transferred to a Medicaid Certified Nursing Facility (Non-Medicare SNF)', long_description: 'Official CMS UB-04 FL 17 Status 64: Discharged or transferred to a nursing facility certified under Medicaid but NOT certified under Medicare.' },
  '65': { code: 'FL17-65', short_description: 'UB-04 Status 65: Discharged/Transferred to a Psychiatric Hospital or Distinct Part Unit', long_description: 'Official CMS UB-04 FL 17 Status 65: Discharged or transferred to a psychiatric hospital or psychiatric distinct part unit of a hospital. Subject to Medicare PACT policy.' },
  '66': { code: 'FL17-66', short_description: 'UB-04 Status 66: Discharged/Transferred to a Critical Access Hospital (CAH)', long_description: 'Official CMS UB-04 FL 17 Status 66: Discharged or transferred to a Critical Access Hospital (CAH).' },
  '70': { code: 'FL17-70', short_description: 'UB-04 Status 70: Discharged/Transferred to Another Type of Health Care Institution Not Defined Elsewhere', long_description: 'Official CMS UB-04 FL 17 Status 70: Discharged or transferred to another type of health care institution not defined elsewhere in the UB-04 code list.' }
};

function parseSpecialBillingCode(rawQuery: string): CodeResult[] {
  const q = rawQuery.trim().toUpperCase();
  const results: CodeResult[] = [];

  // 1. Direct FL17-XX lookup
  if (q.startsWith('FL17-')) {
    const num = q.replace('FL17-', '').padStart(2, '0');
    if (UB04_DISCHARGE_CODES[num]) return [UB04_DISCHARGE_CODES[num]];
  }

  // 2. Direct NDC-XXXXXXXXXXX or N4XXXXXXXXXXX or 10/11-digit NDC lookup
  const ndcClean = q.replace(/^NDC-|^N4/i, '').replace(/\s+(?:UN|ML|GR|F2|ME)[\d.]*$/i, '').trim();
  const hyphenMatch = ndcClean.match(/^(\d{4,5})-(\d{3,4})-(\d{1,2})$/);
  if (hyphenMatch) {
    const p1 = hyphenMatch[1].padStart(5, '0');
    const p2 = hyphenMatch[2].padStart(4, '0');
    const p3 = hyphenMatch[3].padStart(2, '0');
    const eleven = p1 + p2 + p3;
    const formatted542 = `${p1}-${p2}-${p3}`;
    results.push({
      code: `NDC-${eleven}`,
      short_description: `11-Digit HIPAA NDC: ${formatted542} | Box 24D Shaded Line: N4${eleven} UN1`,
      long_description: `Official CMS-1500 Box 24D Shaded Line & EDI 837P Loop 2410 Format: Enter "N4${eleven}" in the red shaded area of Box 24D followed by the unit of measure qualifier (UN = Unit, ML = Milliliter, GR = Gram, F2 = International Unit) and quantity (e.g., "N4${eleven} UN1"). Converted from ${ndcClean} into HIPAA 5-4-2 format (${formatted542}).`
    });
  } else if (/^\d{10,12}$/.test(ndcClean)) {
    const eleven = ndcClean.length === 11 ? ndcClean : ndcClean.slice(-11).padStart(11, '0');
    const formatted542 = `${eleven.slice(0, 5)}-${eleven.slice(5, 9)}-${eleven.slice(9, 11)}`;
    results.push({
      code: `NDC-${eleven}`,
      short_description: `11-Digit HIPAA NDC: ${formatted542} | Box 24D Shaded Line: N4${eleven} UN1`,
      long_description: `Official CMS-1500 Box 24D Shaded Line & EDI 837P Loop 2410 Format: Enter "N4${eleven}" in the red shaded area of Box 24D followed by the unit of measure qualifier (UN = Unit, ML = Milliliter, GR = Gram, F2 = International Unit) and quantity (e.g., "N4${eleven} UN1"). Standard 5-4-2 hyphenated format: ${formatted542}.`
    });
  }

  // 3. UB-04 Discharge Status Code lookup (e.g. "01", "09", "70", "DISCHARGE 01", "DISCHARGE NURSING HOME", "IRF", "SNF")
  const twoDigitMatch = q.match(/^(?:DISCHARGE(?:\s+STATUS)?(?:\s+CODE)?\s*)?(\d{1,2})$/);
  if (twoDigitMatch) {
    const padded = twoDigitMatch[1].padStart(2, '0');
    if (UB04_DISCHARGE_CODES[padded]) {
      results.push(UB04_DISCHARGE_CODES[padded]);
    }
  } else if (/DISCHARGE|FL\s*17|\bIRF\b|\bSNF\b|\bLTCH\b|NURSING HOME|SWING BED|AGAINST MEDICAL ADVICE|\bAMA\b/i.test(q)) {
    const kw = q.replace(/DISCHARGE|STATUS|CODE|UB-?04|FL\s*17/gi, '').trim();
    Object.values(UB04_DISCHARGE_CODES).forEach(entry => {
      if (!kw || entry.short_description.toUpperCase().includes(kw) || entry.long_description.toUpperCase().includes(kw) || (kw.includes('NURSING') && (entry.code === 'FL17-03' || entry.code === 'FL17-04' || entry.code === 'FL17-64'))) {
        results.push(entry);
      }
    });
  }

  return results;
}

export async function verifyCptCode(code: string): Promise<CodeResult> {
  const special = parseSpecialBillingCode(code);
  if (special.length > 0) return special[0];

  const { data, error } = await supabase
    .from('cms_cpt_codes')
    .select('code, short_description, long_description')
    .eq('code', code.toUpperCase())
    .single();

  if (error || !data) {
    throw new Error('CPT code not found in database');
  }

  return data;
}

export async function extractClaimFromText(text: string, base64Pdf?: string): Promise<Record<string, unknown>> {
  // Call our native Next.js API route (replaces missing Supabase Edge Function)
  const response = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, base64Pdf }),
  });

  const data = await response.json();

  if (!response.ok || data?.error) {
    throw new Error(data?.error || 'Failed to call AI extraction service.');
  }

  if (!data?.data) {
    throw new Error('No data returned from AI extraction.');
  }

  return data.data;
}


export interface SavedClaim {
  id: string;
  user_id: string;
  patient_name: string;
  form_data: any;
  created_at: string;
  updated_at: string;
}

export async function saveClaim(
  userId: string,
  patientName: string,
  formData: any,
  claimId?: string | null
): Promise<string> {
  if (claimId && claimId !== 'new') {
    // Update existing claim
    const { error } = await supabase
      .from('claims')
      .update({ patient_name: patientName, form_data: formData, updated_at: new Date().toISOString() })
      .eq('id', claimId)
      .eq('user_id', userId); // Extra safety check

    if (error) throw new Error(`Failed to update claim: ${error.message}`);
    return claimId;
  } else {
    // Insert new claim
    const { data, error } = await supabase
      .from('claims')
      .insert([
        { user_id: userId, patient_name: patientName, form_data: formData }
      ])
      .select('id')
      .single();

    if (error) throw new Error(`Failed to save claim: ${error.message}`);
    if (!data) throw new Error('No data returned on insert');
    return data.id;
  }
}

export async function getUserClaims(userId: string): Promise<SavedClaim[]> {
  const { data, error } = await supabase
    .from('claims')
    .select('id, user_id, patient_name, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch claims: ${error.message}`);
  return data as SavedClaim[];
}

export async function getClaimById(claimId: string): Promise<SavedClaim> {
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('id', claimId)
    .single();

  if (error) throw new Error(`Failed to fetch claim: ${error.message}`);
  return data as SavedClaim;
}

export async function deleteClaim(claimId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('claims')
    .delete()
    .eq('id', claimId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to delete claim: ${error.message}`);
}

export async function getPayerRules(payerId: string) {
  try {
    const { data, error } = await supabase
      .from("payer_rules")
      .select("rules_config")
      .eq("payer_id", payerId)
      .single();
      
    if (error) {
      // PGRST116 means no rows returned, which is fine (payer has no custom rules)
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data?.rules_config || null;
  } catch (err: any) {
    console.error("Error fetching payer rules:", err?.message || err);
    return null;
  }
}


export async function checkNcciEdits(codes: string[]): Promise<any[]> {
  if (codes.length < 2) return [];
  
  // We need to check if any pair of codes in the claim are mutually exclusive
  // We query where code_1 in (codes) and code_2 in (codes)
  const { data, error } = await supabaseCoding
    .from('cms_ncci_edits')
    .select('code_1, code_2, modifier_indicator')
    .in('code_1', codes)
    .in('code_2', codes);
    
  if (error) {
    console.warn('Failed to fetch NCCI edits', error);
    return [];
  }
  return data || [];
}

export async function getClinicalRules(): Promise<any[]> {
  const { data, error } = await supabase
    .from('cms_clinical_rules')
    .select('rule_category, rule_key, values_array, description');
    
  if (error) {
    console.warn('Failed to fetch clinical rules', error);
    return [];
  }
  return data || [];
}

export async function getFeeSchedule(codes: string[]): Promise<any[]> {
  if (codes.length === 0) return [];
  
  const { data, error } = await supabaseCoding
    .from('cms_fee_schedule')
    .select('cpt_code, non_facility_fee, facility_fee')
    .in('cpt_code', codes);
    
  if (error) {
    console.warn('Failed to fetch fee schedule', error);
    return [];
  }
  return data || [];
}


export async function getNcciConflictsForCode(code: string): Promise<any[]> {
  // Queries NCCI edits where the given code is either code_1 or code_2
  const { data: data1, error: error1 } = await supabaseCoding
    .from('cms_ncci_edits')
    .select('code_1, code_2, modifier_indicator')
    .eq('code_1', code);
    
  const { data: data2, error: error2 } = await supabaseCoding
    .from('cms_ncci_edits')
    .select('code_1, code_2, modifier_indicator')
    .eq('code_2', code);

  if (error1 || error2) {
    console.warn('Failed to fetch NCCI conflicts', error1 || error2);
    return [];
  }
  
  return [...(data1 || []), ...(data2 || [])];
}
export interface ProviderRecord {
  id?: string;
  name: string;
  npi: string;
  tax_id: string;
  taxonomy_code: string;
  address: string;
  phone?: string;
}

export interface PatientRecord {
  id?: string;
  first_name: string;
  last_name: string;
  dob: string;
  insurance_id: string;
  address: string;
  sex?: string;
  insurance_type?: string;
  phone?: string;
}

export async function getProviders(): Promise<ProviderRecord[]> {
  const { data, error } = await supabase.from('providers').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveProvider(provider: ProviderRecord): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");
  
  if (provider.id) {
    const { error } = await supabase.from('providers').update(provider).eq('id', provider.id).eq('user_id', user.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('providers').insert([{ ...provider, user_id: user.id }]);
    if (error) throw error;
  }
}

export async function deleteProvider(id: string): Promise<void> {
  await supabase.from('providers').delete().eq('id', id);
}

export async function getPatients(): Promise<PatientRecord[]> {
  const { data, error } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function savePatient(patient: PatientRecord): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");
  
  if (patient.id) {
    const { error } = await supabase.from('patients').update(patient).eq('id', patient.id).eq('user_id', user.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('patients').insert([{ ...patient, user_id: user.id }]);
    if (error) throw error;
  }
}

export async function deletePatient(id: string): Promise<void> {
  await supabase.from('patients').delete().eq('id', id);
}

export async function logActivity(action: string, details: any = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;
    
    await supabase.from('activity_log').insert([{
      user_id: userId,
      action: action,
      details: details
    }]);
  } catch (err) {
    console.warn('Failed to log activity', err);
  }
}


export async function searchCodeDictionary(query: string): Promise<{ cpt: any[], icd: any[] }> {
  const cleanQuery = query.trim().toUpperCase().replace(/^CPT\s+|^HCPCS\s+|^ICD(?:-?10)?\s+/i, '').trim();
  const dotlessQuery = cleanQuery.replace(/[\.\s]/g, '');
  const words = cleanQuery.split(/[\s,-]+/).filter(Boolean);
  
  if (words.length === 0) return { cpt: [], icd: [] };

  const exactTerm = `%${cleanQuery}%`;
  const dotlessTerm = `%${dotlessQuery}%`;
  
  const codeToken = words.find(w => /^[A-Z0-9]{5}$/.test(w.replace(/\./g, '')) || /^[A-Z]\d[A-Z0-9](?:\.[A-Z0-9]{1,4}|[A-Z0-9]{1,4})$/.test(w));
  const cleanCodeToken = codeToken ? codeToken.replace(/\./g, '') : null;

  let cptOrCondition = `code.ilike.${exactTerm},code.ilike.${dotlessTerm},short_description.ilike.${exactTerm},long_description.ilike.${exactTerm}`;
  let icdOrCondition = `code.ilike.${dotlessTerm},code.ilike.${exactTerm},short_description.ilike.${exactTerm},long_description.ilike.${exactTerm}`;
  
  if (words.length > 1) {
    const shortDescAnds = words.map(w => `short_description.ilike.%${w}%`).join(',');
    const longDescAnds = words.map(w => `long_description.ilike.%${w}%`).join(',');
    const tokenCodeClause = cleanCodeToken ? `code.eq.${cleanCodeToken},code.ilike.%${cleanCodeToken}%,` : '';
    cptOrCondition = `${tokenCodeClause}code.ilike.${exactTerm},code.ilike.${dotlessTerm},and(${shortDescAnds}),and(${longDescAnds})`;
    icdOrCondition = `${tokenCodeClause}code.ilike.${dotlessTerm},code.ilike.${exactTerm},and(${shortDescAnds}),and(${longDescAnds})`;
  }

  // Search CPT
  const { data: cptData } = await supabase
    .from('cms_cpt_codes')
    .select('code, short_description')
    .or(cptOrCondition)
    .limit(20);

  // Search ICD-10
  const { data: icdData } = await supabase
    .from('cms_icd10_codes')
    .select('code, short_description')
    .or(icdOrCondition)
    .limit(20);

  const specialResults = parseSpecialBillingCode(query);
  return {
    cpt: [...specialResults, ...(cptData || [])],
    icd: icdData || []
  };
}

export async function checkCodePair(code1: string, code2: string): Promise<any> {
  const conflicts = await getNcciConflictsForCode(code1);
  
  const match = conflicts.find(c => 
    (c.code_1 === code1 && c.code_2 === code2) ||
    (c.code_1 === code2 && c.code_2 === code1)
  );

  if (!match) {
    return { status: 'Allowed', modifier_indicator: null };
  }
  
  const indicator = String(match.modifier_indicator);
  if (indicator === '1') {
    return { status: 'Modifier Required', modifier_indicator: '1' };
  } else if (indicator === '0') {
    return { status: 'Mutually Exclusive', modifier_indicator: '0' };
  } else {
    return { status: 'Allowed', modifier_indicator: indicator };
  }
}

export async function getMedicalNecessity(cptCode: string): Promise<string[]> {
  if (!medNecUrl) return [];
  try {
    const { data, error } = await supabaseMedicalNecessity
      .from('cms_medical_necessity')
      .select('icd10_codes')
      .eq('cpt_code', (cptCode.replace(/^CPT\s*/i, '').trim().toUpperCase().match(/\b[A-Z0-9]{5}\b/) || [cptCode.trim().toUpperCase()])[0])
      .maybeSingle();

    if (error || !data || !data.icd10_codes) return [];
    
    // The optimized DB stores them as a single comma-separated string
    return data.icd10_codes.split(',').map((c: string) => c.trim()).filter(Boolean);
  } catch (err) {
    console.error(err);
    return [];
  }
}

