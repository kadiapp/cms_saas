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


export interface CodeResult {
  code: string;
  short_description: string;
  long_description?: string;
}

export async function verifyIcdCode(code: string): Promise<CodeResult> {
  const { data, error } = await supabase
    .from('cms_icd10_codes')
    .select('code, short_description, long_description')
    .eq('code', code.replace(/\./g, '').toUpperCase())
    .single();

  if (error || !data) {
    throw new Error('ICD-10 code not found in database');
  }

  return data;
}

export async function verifyCptCode(code: string): Promise<CodeResult> {
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

export async function extractClaimFromText(text: string): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke('extract-claim', {
    body: { text },
  });

  if (error) {
    throw new Error(error.message || 'Failed to call AI extraction service.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (!data?.data) {
    throw new Error('No data returned from AI extraction.');
  }

  return data.data;
}

// ============================================================
// Database Persistence for Claims
// ============================================================

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
  if (claimId) {
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
    .select('cpt_code, non_facility_fee')
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