import type { ClaimForm, DynamicRule } from './types';

export interface ValidationResult {
  field: string;
  label: string;
  status: 'ok' | 'info' | 'warn' | 'error' | 'critical';
  message: string;
}

const NPI_RE = /^\d{10}$/;
const DATE_RE = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
const ZIP_RE = /^\d{5}(-\d{4})?$/;
const ICD10_RE = /^[A-Z]\d{2}(\.\d+)?$/i;
const CPT_RE  = /^\d{5}$/;
const EIN_RE  = /^\d{2}-\d{7}$/;

function check(
  condition: boolean,
  field: string,
  label: string,
  failMessage: string,
  failSeverity: 'warn' | 'error' | 'critical' | 'info' = 'error',
  successMessage?: string
): ValidationResult {
  if (condition) {
    return { field, label, status: successMessage ? 'info' : 'ok', message: successMessage || `${label} looks good` };
  }
  return { field, label, status: failSeverity, message: failMessage };
}

export function validateClaim(
  form: ClaimForm, 
  verifiedNpis?: Record<string, any>, 
  npiErrors?: Record<string, string>,
  verifiedIcds?: Record<string, any>,
  icdErrors?: Record<string, string>,
  verifiedCpts?: Record<string, any>,
  cptErrors?: Record<string, string>,
  customRules?: DynamicRule[]
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const isMedicare = form.payerName?.toLowerCase().includes('medicare') || form.insuranceType === 'Medicare';

  // --- TIER A: UNIVERSAL BASE RULES ---

  // Patient section
  results.push(check(!!form.insuranceType, 'insuranceType', '1. Insurance Type', 'Insurance type is required', 'error'));
  results.push(check(!!form.insurerId, 'insurerId', '1a. Insured ID #', 'Insured ID number is required', 'critical'));
  results.push(check(!!form.patientLastName, 'patientLastName', '2. Patient Name', 'Patient last name is required', 'error'));
  results.push(check(DATE_RE.test(form.patientDob), 'patientDob', '3. Patient DOB', 'Patient DOB must be MM/DD/YYYY', 'error'));
  results.push(check(!!form.patientSex, 'patientSex', '3. Patient Sex', 'Patient sex is required', 'error'));
  results.push(check(!!form.patientAddress, 'patientAddress', '5. Patient Address', 'Patient address is required', 'warn'));
  results.push(check(ZIP_RE.test(form.patientZip), 'patientZip', '5. Patient ZIP', 'ZIP must be 5 digits (or 5+4)', 'error'));
  
  // Relationship Dependency
  results.push(check(!!form.patientRelationship, 'patientRelationship', '6. Relationship', 'Relationship to insured is required', 'error'));
  if (form.patientRelationship && form.patientRelationship !== 'Self') {
    results.push(check(!!form.insuredLastName, 'insuredLastName', '4. Insured Name', 'Insured name is required when relationship is not Self', 'critical'));
    results.push(check(!!form.insuredPolicyGroup, 'insuredPolicyGroup', '11. Policy/Group #', 'Policy/Group number is required when relationship is not Self', 'critical'));
  }

  // Box 12/13
  results.push(check(!!form.patientSignature, 'patientSignature', '12. Patient Signature', 'Patient signature authorization is required', 'error'));
  results.push(check(!!form.insuredSignature, 'insuredSignature', '13. Insured Signature', 'Insured signature authorization is required', 'error'));

  // Referring provider
  if (form.referringProviderNpi) {
    results.push(check(NPI_RE.test(form.referringProviderNpi), 'referringProviderNpi', '17b. Referring NPI', 'Referring NPI must be exactly 10 digits', 'error'));
    
    if (verifiedNpis?.referringProviderNpi) {
      const v = verifiedNpis.referringProviderNpi;
      const name = v.type === 'individual' ? `${v.firstName} ${v.lastName}` : v.organizationName;
      results.push(check(true, 'referringProviderNpiApi', '17b. NPI Registry', '', 'error', `Verified with NPPES: ${name}`));
    } else if (npiErrors?.referringProviderNpi) {
      results.push(check(false, 'referringProviderNpiApi', '17b. NPI Registry', npiErrors.referringProviderNpi, 'critical'));
    }
  }

  // Diagnosis codes
  const filledDx = (form.diagnosisCodes || []).map(d => (d || '').trim());
  const validDxIndexes = filledDx.map((dx, i) => dx ? i : -1).filter(i => i !== -1);
  results.push(check(validDxIndexes.length > 0, 'diagnosisCodes', '21. Diagnosis Codes', 'At least one diagnosis code (ICD-10) is required', 'critical'));
  
  filledDx.forEach((dx, i) => {
    if (!dx) return;
    results.push(check(ICD10_RE.test(dx), `dx_${i}`, `21. Dx ${String.fromCharCode(65 + i)}`, `"${dx}" is not a valid ICD-10 code format`, 'error'));
    
    if (verifiedIcds?.[dx]) {
      results.push(check(true, `dx_api_${i}`, `21. Dx ${String.fromCharCode(65 + i)} Registry`, '', 'error', `Verified ICD-10: ${verifiedIcds[dx].short_description}`));
    } else if (icdErrors?.[dx]) {
      results.push(check(false, `dx_api_${i}`, `21. Dx ${String.fromCharCode(65 + i)} Registry`, `ICD-10 Code ${dx} not found in database`, 'critical'));
    }
  });

  // Service lines & Math Accuracy
  const sls = form.serviceLines || [];
  results.push(check(Array.isArray(sls) && sls.length > 0, 'serviceLines', '24. Service Lines', 'At least one service line is required', 'critical'));
  
  let calculatedTotal = 0;
  sls.forEach((line, i) => {
    const n = i + 1;
    results.push(check(CPT_RE.test(line.cptCode), `cpt_${i}`, `24.D CPT Line ${n}`, `Line ${n}: CPT/HCPCS must be 5 digits`, 'error'));
    
    if (verifiedCpts?.[line.cptCode]) {
      results.push(check(true, `cpt_api_${i}`, `24.D CPT Line ${n} Registry`, '', 'error', `Verified CPT: ${verifiedCpts[line.cptCode].short_description}`));
    } else if (cptErrors?.[line.cptCode]) {
      results.push(check(false, `cpt_api_${i}`, `24.D CPT Line ${n} Registry`, `CPT Code ${line.cptCode} not found in database`, 'critical'));
    }

    results.push(check(!!line.dateFrom, `dateFrom_${i}`, `24.A Date From Line ${n}`, `Line ${n}: Date of service is required`, 'error'));
    results.push(check(!!line.placeOfService, `pos_${i}`, `24.B POS Line ${n}`, `Line ${n}: Place of service is required`, 'error'));
    results.push(check(!!line.charges, `charges_${i}`, `24.F Charges Line ${n}`, `Line ${n}: Charges amount is required`, 'error'));
    
    const chargeVal = parseFloat((line.charges || '0').replace(/[^0-9.]/g, ''));
    if (!isNaN(chargeVal)) {
      calculatedTotal += chargeVal;
    }

    // Diagnosis Pointer Integrity
    if (line.diagnosisPointer) {
      const ptrs = line.diagnosisPointer.split(',').map(p => p.trim());
      const charToIndex = (c: string) => c.charCodeAt(0) - 65;
      const allValid = ptrs.every(p => {
        const idx = charToIndex(p);
        return validDxIndexes.includes(idx);
      });
      results.push(check(allValid, `ptr_${i}`, `24.E Dx Ptr Line ${n}`, `Line ${n}: Diagnosis pointer(s) do not match filled Diagnosis Codes in Box 21`, 'critical'));
    } else {
      results.push(check(false, `ptr_${i}`, `24.E Dx Ptr Line ${n}`, `Line ${n}: Diagnosis pointer is required`, 'error'));
    }
  });

  // Box 25
  results.push(check(!!form.federalTaxId, 'federalTaxId', '25. Tax ID', 'Federal Tax ID is required', 'critical'));
  if (form.taxIdType === 'EIN' && form.federalTaxId) {
    results.push(check(EIN_RE.test(form.federalTaxId), 'federalTaxIdFormat', '25. EIN Format', 'EIN must be formatted as XX-XXXXXXX', 'warn'));
  }

  // Box 27
  results.push(check(!!form.acceptAssignment, 'acceptAssignment', '27. Accept Assignment', 'Assignment acceptance is required', 'error'));

  // Box 28 - Math Check
  results.push(check(!!form.totalCharge, 'totalCharge', '28. Total Charge', 'Total charge is required', 'error'));
  if (form.totalCharge) {
    const enteredTotal = parseFloat((form.totalCharge || '0').replace(/[^0-9.]/g, ''));
    results.push(check(
      Math.abs(enteredTotal - calculatedTotal) < 0.01,
      'totalChargeMath', 
      '28. Total Charge Math', 
      `Total charge (${enteredTotal}) does not match sum of service lines (${calculatedTotal})`, 
      'critical'
    ));
  }

  // Box 31
  results.push(check(!!form.physicianSignature, 'physicianSignature', '31. Physician Signature', 'Physician signature is required', 'error'));

  // Box 33
  results.push(check(!!form.billingNpi, 'billingNpi', '33a. Billing NPI', 'Billing provider NPI is required', 'critical'));
  if (form.billingNpi) {
    results.push(check(NPI_RE.test(form.billingNpi), 'billingNpiFormat', '33a. Billing NPI Format', 'Billing NPI must be exactly 10 digits', 'error'));
    
    if (verifiedNpis?.billingNpi) {
      const v = verifiedNpis.billingNpi;
      const name = v.type === 'individual' ? `${v.firstName} ${v.lastName}` : v.organizationName;
      results.push(check(true, 'billingNpiApi', '33a. NPI Registry', '', 'error', `Verified with NPPES: ${name}`));
    } else if (npiErrors?.billingNpi) {
      results.push(check(false, 'billingNpiApi', '33a. NPI Registry', npiErrors.billingNpi, 'critical'));
    }
  }
  results.push(check(!!form.billingProviderName, 'billingProviderName', '33. Billing Provider', 'Billing provider name is required', 'error'));

  // =========================================================================
  // TIER B: Dynamic Payer-Specific Rules (Supabase JSONB Engine)
  // =========================================================================
  if (customRules && customRules.length > 0) {
    customRules.forEach(rule => {
      const val = String((form as any)[rule.field] || '').trim();
      const label = `${rule.field} (${form.payerName || 'Custom'})`;
      
      if (rule.type === 'required') {
        results.push(check(val.length > 0, rule.field, label, rule.message, rule.severity));
      } else if (rule.type === 'regex' && rule.regex) {
        const regex = new RegExp(rule.regex);
        // Only run regex if field is filled, or if it's explicitly required to not be empty
        if (val.length > 0) {
          results.push(check(regex.test(val), rule.field, label, rule.message, rule.severity));
        }
      }
    });
  } else {
    // Fallback hardcoded defaults if no custom rules exist for this payer
    if (isMedicare) {
      results.push(check(ZIP_RE.test(form.billingProviderZip || ''), 'billingProviderZip', '33. Billing ZIP (Medicare)', 'Medicare requires a 9-digit ZIP code (XXXXX-XXXX) for the billing provider', 'error'));
    }
    if (form.payerName?.toLowerCase().includes('blue cross') || form.payerName?.toLowerCase().includes('bcbs')) {
      const bcbsRe = /^[A-Z]{3}\d+$/;
      results.push(check(bcbsRe.test(form.insurerId || ''), 'insuredId', '1a. Insured ID (BCBS)', 'BCBS requires a 3-letter prefix followed by numbers', 'error'));
    }
  }

  return results;
}

export function computeReadiness(results: ValidationResult[]): number {
  if (results.length === 0) return 0;
  
  let score = 100;
  
  for (const r of results) {
    if (r.status === 'critical') score -= 25;
    else if (r.status === 'error') score -= 10;
    else if (r.status === 'warn') score -= 2;
  }
  
  return Math.max(0, Math.min(100, score));
}

import { checkNcciEdits, getClinicalRules, getFeeSchedule } from './api/supabase';

export async function runAdvancedClinicalValidation(form: ClaimForm): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  // Extract all non-empty CPT codes from the 6 service lines
  const cptCodes = form.serviceLines
    .map(line => line.cptCode?.trim())
    .filter(Boolean) as string[];

  if (cptCodes.length === 0) return results;

  // 1. NCCI PTP Edits Check
  if (cptCodes.length > 1) {
    const ncciConflicts = await checkNcciEdits(cptCodes);
    if (ncciConflicts && ncciConflicts.length > 0) {
      ncciConflicts.forEach(conflict => {
        // If we found a conflict where both code_1 and code_2 are in our billed list
        if (cptCodes.includes(conflict.code_1) && cptCodes.includes(conflict.code_2)) {
          results.push({
            field: 'serviceLines',
            label: 'NCCI Edit (Unbundling)',
            status: 'critical',
            message: `CPT ${conflict.code_1} and ${conflict.code_2} cannot be billed together. They trigger a PTP Edit conflict.`
          });
        }
      });
    }
  }

  // 2. Clinical Rules Check (Age & Gender)
  const clinicalRules = await getClinicalRules();
  const isFemale = form.patientSex === 'F';
  const isMale = form.patientSex === 'M';
  
  // Basic calculation for age
  let patientAge = 30; // default assumption if missing
  if (form.patientDob) {
    const parts = form.patientDob.split('/');
    if (parts.length === 3) {
      const dob = new Date(parseInt(parts[2]), parseInt(parts[0])-1, parseInt(parts[1]));
      const diffMs = Date.now() - dob.getTime();
      patientAge = Math.floor(diffMs / 31557600000); // years
    }
  }

  clinicalRules.forEach(rule => {
    // If it's a gender restriction
    if (rule.rule_category === 'GENDER_PROCEDURES') {
      const restrictedCodes = rule.values_array || [];
      const overlap = cptCodes.filter(c => restrictedCodes.includes(c));
      
      if (overlap.length > 0) {
        if (rule.rule_key === 'FEMALE_ONLY' && !isFemale) {
          results.push({
            field: 'patientSex',
            label: 'Clinical Rule (Gender)',
            status: 'critical',
            message: `CPT codes (${overlap.join(', ')}) are restricted to female patients only, but patient is marked as ${form.patientSex}.`
          });
        } else if (rule.rule_key === 'MALE_ONLY' && !isMale) {
          results.push({
            field: 'patientSex',
            label: 'Clinical Rule (Gender)',
            status: 'critical',
            message: `CPT codes (${overlap.join(', ')}) are restricted to male patients only, but patient is marked as ${form.patientSex}.`
          });
        }
      }
    }
    // If it's an age restriction
    if (rule.rule_category === 'AGE_PROCEDURES') {
      const restrictedCodes = rule.values_array || [];
      const overlap = cptCodes.filter(c => restrictedCodes.includes(c));
      if (overlap.length > 0) {
        if (rule.rule_key === 'PEDIATRIC_ONLY' && patientAge > 18) {
          results.push({
            field: 'patientDob',
            label: 'Clinical Rule (Age)',
            status: 'warn',
            message: `CPT codes (${overlap.join(', ')}) are typically pediatric only, but patient is ${patientAge} years old.`
          });
        }
      }
    }
  });

  // 3. Fee Schedule Check (Under-pricing)
  const feeSchedule = await getFeeSchedule(cptCodes);
  form.serviceLines.forEach((line, index) => {
    const code = line.cptCode?.trim();
    if (!code) return;
    
    const feeEntry = feeSchedule.find(f => f.cpt_code === code);
    if (feeEntry && feeEntry.non_facility_fee) {
      const typedCharge = parseFloat(line.charges) || 0;
      const medicareBaseline = parseFloat(feeEntry.non_facility_fee);
      
      if (typedCharge > 0 && typedCharge < medicareBaseline) {
        results.push({
          field: `charges_${index}`,
          label: 'Fee Schedule (RVU)',
          status: 'warn',
          message: `Line ${index + 1}: $${typedCharge} is below the Medicare baseline of $${medicareBaseline.toFixed(2)} for ${code}. You are losing money!`
        });
      }
    }
  });

  return results;
}

