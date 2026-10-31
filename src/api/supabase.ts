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


export interface CodeEnrichment {
  mue?: { mue_value: number; mai: string; rationale: string } | null;
  cliaWaived?: boolean;
  hcpcsUnit?: { unit_definition: string; unit_count: number; unit_measure: string } | null;
}

export async function getCodeEnrichment(code: string): Promise<CodeEnrichment> {
  const upper = code.trim().toUpperCase();
  try {
    const [mueRes, cliaRes, hcpcsRes] = await Promise.all([
      supabase.from('cms_mue_limits').select('mue_value, mai, rationale').eq('code', upper).maybeSingle(),
      supabase.from('cms_clia_waived_codes').select('is_waived').eq('cpt_code', upper).maybeSingle(),
      supabase.from('cms_hcpcs_codes').select('unit_definition, unit_count, unit_measure').eq('hcpcs_code', upper).maybeSingle(),
    ]);
    return {
      mue: mueRes.data || null,
      cliaWaived: Boolean(cliaRes.data?.is_waived),
      hcpcsUnit: hcpcsRes.data || null,
    };
  } catch {
    return {};
  }
}

function parseNdcCode(rawQuery: string): CodeResult[] {
  const q = rawQuery.trim().toUpperCase();
  const ndcClean = q.replace(/^NDC-|^N4/i, '').replace(/\s+(?:UN|ML|GR|F2|ME)[\d.]*$/i, '').trim();
  const hyphenMatch = ndcClean.match(/^(\d{4,5})-(\d{3,4})-(\d{1,2})$/);
  if (hyphenMatch) {
    const p1 = hyphenMatch[1].padStart(5, '0');
    const p2 = hyphenMatch[2].padStart(4, '0');
    const p3 = hyphenMatch[3].padStart(2, '0');
    const eleven = p1 + p2 + p3;
    const formatted542 = `${p1}-${p2}-${p3}`;
    return [{
      code: `NDC-${eleven}`,
      short_description: `11-Digit HIPAA NDC: ${formatted542} | Box 24D Shaded Line: N4${eleven} UN1`,
      long_description: `Official CMS-1500 Box 24D Shaded Line & EDI 837P Loop 2410 Format: Enter "N4${eleven}" in the red shaded area of Box 24D followed by the unit of measure qualifier (UN = Unit, ML = Milliliter, GR = Gram, F2 = International Unit) and quantity (e.g., "N4${eleven} UN1"). Converted from ${ndcClean} into HIPAA 5-4-2 format (${formatted542}).`
    }];
  } else if (/^\d{10,12}$/.test(ndcClean)) {
    const eleven = ndcClean.length === 11 ? ndcClean : ndcClean.slice(-11).padStart(11, '0');
    const formatted542 = `${eleven.slice(0, 5)}-${eleven.slice(5, 9)}-${eleven.slice(9, 11)}`;
    return [{
      code: `NDC-${eleven}`,
      short_description: `11-Digit HIPAA NDC: ${formatted542} | Box 24D Shaded Line: N4${eleven} UN1`,
      long_description: `Official CMS-1500 Box 24D Shaded Line & EDI 837P Loop 2410 Format: Enter "N4${eleven}" in the red shaded area of Box 24D followed by the unit of measure qualifier (UN = Unit, ML = Milliliter, GR = Gram, F2 = International Unit) and quantity (e.g., "N4${eleven} UN1"). Standard 5-4-2 hyphenated format: ${formatted542}.`
    }];
  }
  return [];
}

export async function verifyCptCode(code: string): Promise<CodeResult> {
  const upper = code.trim().toUpperCase();
  const ndc = parseNdcCode(upper);
  if (ndc.length > 0) return ndc[0];

  if (upper.startsWith('FL17-')) {
    const dischCode = upper.replace('FL17-', '').padStart(2, '0');
    const { data: d } = await supabase
      .from('cms_discharge_scenarios')
      .select('code, title, desc, patp, note')
      .eq('code', dischCode)
      .maybeSingle();
    if (d) {
      return {
        code: `FL17-${d.code}`,
        short_description: `UB-04 Status ${d.code}: ${d.title} — ${d.desc}`,
        long_description: `${d.note || ''} ${d.patp ? '(Triggers Medicare Post-Acute Care Transfer / PATP Policy)' : '(Does not trigger Medicare PATP reduction)'}`.trim(),
      };
    }
  }

  // Check cms_denial_codes if it's a CARC/RARC code (e.g. CO-4, CO-16, MA130, N257)
  if (/^(?:CO|PR|OA|PI)-?\d+$|^MA\d+$|^N\d+$/i.test(upper)) {
    const normalizedDenial = upper.replace(/^(CO|PR|OA|PI)(\d+)$/, '$1-$2');
    const { data: den } = await supabase
      .from('cms_denial_codes')
      .select('code, description, group_name, resolution_steps, prevention_tips')
      .eq('code', normalizedDenial)
      .maybeSingle();
    if (den) {
      const steps = Array.isArray(den.resolution_steps) ? `Resolution Steps: ${den.resolution_steps.join(' · ')}` : '';
      const tips = Array.isArray(den.prevention_tips) ? `Prevention: ${den.prevention_tips.join(' · ')}` : '';
      return {
        code: den.code,
        short_description: `${den.group_name || 'Denial/Remark Code'}: ${den.description}`,
        long_description: [steps, tips].filter(Boolean).join('\n\n') || den.description,
      };
    }
  }

  const { data } = await supabase
    .from('cms_cpt_codes')
    .select('code, short_description, long_description')
    .eq('code', upper)
    .maybeSingle();

  if (data) return data;

  // Fallback to real cms_hcpcs_codes table (modifiers & HCPCS Level II)
  const { data: hcpcs } = await supabase
    .from('cms_hcpcs_codes')
    .select('hcpcs_code, short_description, long_description, unit_definition')
    .eq('hcpcs_code', upper)
    .maybeSingle();

  if (hcpcs) {
    return {
      code: hcpcs.hcpcs_code,
      short_description: hcpcs.short_description,
      long_description: hcpcs.long_description || (hcpcs.unit_definition ? `Official Unit Definition: ${hcpcs.unit_definition}` : hcpcs.short_description),
    };
  }

  throw new Error('CPT/HCPCS code not found in database');
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

  // Search CPT, ICD-10, real UB-04 Discharge Scenarios, real Denial Codes, and real HCPCS Modifiers in parallel
  const dischMatch = cleanQuery.match(/^(?:FL17-|DISCHARGE(?:\s+STATUS)?(?:\s+CODE)?\s*)?(\d{1,2})$/);
  const isDischargeQuery = Boolean(dischMatch) || /DISCHARGE|FL\s*17|\bIRF\b|\bSNF\b|\bLTCH\b|NURSING HOME|SWING BED|HOSPICE|\bAMA\b/i.test(cleanQuery);

  const [cptRes, icdRes, hcpcsRes, dischRes, denialRes] = await Promise.all([
    supabase.from('cms_cpt_codes').select('code, short_description').or(cptOrCondition).limit(20),
    supabase.from('cms_icd10_codes').select('code, short_description').or(icdOrCondition).limit(20),
    cleanQuery.length === 2
      ? supabase.from('cms_hcpcs_codes').select('hcpcs_code, short_description').eq('hcpcs_code', cleanQuery).limit(5)
      : Promise.resolve({ data: [] as any[] }),
    isDischargeQuery
      ? (dischMatch
          ? supabase.from('cms_discharge_scenarios').select('code, title, desc').eq('code', dischMatch[1].padStart(2, '0')).limit(5)
          : supabase.from('cms_discharge_scenarios').select('code, title, desc').or(`title.ilike.${exactTerm},desc.ilike.${exactTerm}`).limit(10))
      : Promise.resolve({ data: [] as any[] }),
    /^(?:CO|PR|OA|PI)-?\d+$|^MA\d+$|^N\d+$/i.test(cleanQuery)
      ? supabase.from('cms_denial_codes').select('code, description, group_name').ilike('code', `%${cleanQuery.replace(/^(CO|PR|OA|PI)(\d+)$/, '$1-$2')}%`).limit(10)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const ndcResults = parseNdcCode(query);
  const dischMapped: CodeResult[] = (dischRes.data || []).map((d: any) => ({
    code: `FL17-${d.code}`,
    short_description: `UB-04 Status ${d.code}: ${d.title} — ${d.desc}`,
  }));
  const denialMapped: CodeResult[] = (denialRes.data || []).map((d: any) => ({
    code: d.code,
    short_description: `${d.group_name || 'Denial Code'}: ${d.description}`,
  }));
  const hcpcsMapped: CodeResult[] = (hcpcsRes.data || []).map((h: any) => ({
    code: h.hcpcs_code,
    short_description: `HCPCS Modifier ${h.hcpcs_code}: ${h.short_description}`,
  }));

  const seenCpt = new Set<string>();
  const mergedCpt: CodeResult[] = [];
  for (const item of [...ndcResults, ...dischMapped, ...denialMapped, ...hcpcsMapped, ...(cptRes.data || [])]) {
    if (!seenCpt.has(item.code)) {
      seenCpt.add(item.code);
      mergedCpt.push(item);
    }
  }

  return {
    cpt: mergedCpt,
    icd: icdRes.data || []
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

