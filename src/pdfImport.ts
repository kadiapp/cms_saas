import { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFName } from 'pdf-lib';
import type { ClaimForm, ServiceLine } from './types';
import { EMPTY_FORM } from './types';

export async function importFromPdf(file: File): Promise<ClaimForm> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const form = pdfDoc.getForm();
  
  const claim: ClaimForm = JSON.parse(JSON.stringify(EMPTY_FORM));

  const allFields = form.getFields();

  // Basic validation to see if this is an official CMS-1500 template
  // We check for a known AcroForm field that is unique to the CMS-1500
  const hasCMSField = allFields.some(f => f.getName().toLowerCase().includes('pt_name') || f.getName().toLowerCase().includes('insurance_id') || f.getName().toLowerCase().includes('rel_to_ins'));
  
  if (!hasCMSField || allFields.length < 10) {
    throw new Error('INVALID_TEMPLATE');
  }

  // Helper to extract text from a specific field by name (case-insensitive, ignoring prefix)
  const getFieldText = (matchStr: string): string => {
    try {
      const field = allFields.find(f => {
        const n = f.getName().toLowerCase();
        const m = matchStr.toLowerCase();
        return n === m || n.endsWith('.' + m) || n.endsWith('_' + m) || n.endsWith('[' + m + ']') || n === m + '[0]';
      });
      
      if (!field) return '';
      if (field instanceof PDFTextField) return field.getText() || '';
      if (field instanceof PDFDropdown) return field.getSelected()[0] || '';
      return '';
    } catch (e) {
      return '';
    }
  };

  // Helper to extract boolean state or radio value
  const getSelectedValue = (matchStr: string): string => {
    try {
      const field = allFields.find(f => {
        const n = f.getName().toLowerCase();
        const m = matchStr.toLowerCase();
        return n === m || n.endsWith('.' + m) || n.endsWith('_' + m) || n.endsWith('[' + m + ']') || n === m + '[0]';
      });

      if (!field) return '';

      // Advanced generic CheckBox/Radio Appearance State reader
      try {
        // @ts-ignore
        const widgets = field.acroField?.getWidgets() || [];
        for (const w of widgets) {
          // @ts-ignore
          const as = w.dict?.get(PDFName.of('AS'));
          if (as) {
            // @ts-ignore
            const val = as.decodeText();
            if (val && val !== 'Off') {
              return val;
            }
          }
        }
      } catch (e) {
        // ignore
      }

      if (field instanceof PDFCheckBox) return field.isChecked() ? 'Yes' : '';
      if (field instanceof PDFRadioGroup) {
        const val = field.getSelected();
        return val ? String(val) : '';
      }
      return '';
    } catch (e) {
      return '';
    }
  };

  // Helper to construct a date string from MM, DD, YY fields
  const getDate = (prefix: string): string => {
    const mm = getFieldText(`${prefix}_mm`);
    const dd = getFieldText(`${prefix}_dd`);
    const yy = getFieldText(`${prefix}_yy`);
    if (mm || dd || yy) {
      // CMS-1500 often uses 2 or 4 digit years. Let's format nicely if possible.
      const yStr = yy.length === 2 ? `20${yy}` : yy;
      return `${mm.padStart(2, '0')}/${dd.padStart(2, '0')}/${yStr}`;
    }
    return '';
  };

  try {
    // ----------------------------------------------------
    // Carrier & Box 1
    // ----------------------------------------------------
    claim.payerName = getFieldText('insurance_name') || getFieldText('payer_name');
    claim.payerAddress = [getFieldText('insurance_address'), getFieldText('insurance_address2')].filter(Boolean).join(' ') || getFieldText('payer_address');
    
    const cityStateZip = getFieldText('insurance_city_state_zip');
    if (cityStateZip) {
      // e.g. "Van Nuys CA 91470" or "Dallas, TX 75202"
      const match = cityStateZip.match(/^(.*?)[,\s]+([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
      if (match) {
        claim.payerCity = match[1].trim();
        claim.payerState = match[2].toUpperCase();
        claim.payerZip = match[3];
      } else {
        claim.payerCity = cityStateZip;
      }
    } else {
      claim.payerCity = getFieldText('payer_city');
      claim.payerState = getFieldText('payer_state');
      claim.payerZip = getFieldText('payer_zip');
    }

    // Box 1
    claim.payerId = getFieldText('payer_id');
    claim.insurerId = getFieldText('insurance_id') || getFieldText('1a') || getFieldText('id_number');

    // Helper to map radio button values to standard forms
    const mapInsType = (val: string): string => {
      if (!val) return '';
      const v = val.toLowerCase();
      if (v.includes('medicare') || v === '1' || v === 'choice1') return 'Medicare';
      if (v.includes('medicaid') || v === '2' || v === 'choice2') return 'Medicaid';
      if (v.includes('tricare') || v.includes('champus') || v === '3' || v === 'choice3') return 'Tricare';
      if (v.includes('champva') || v === '4' || v === 'choice4') return 'CHAMPVA';
      if (v.includes('group') || v === '5' || v === 'choice5') return 'Group';
      if (v.includes('feca') || v === '6' || v === 'choice6') return 'FECA';
      if (v.includes('other') || v === '7' || v === 'choice7') return 'Other';
      return 'Other';
    };

    // Checkboxes for Box 1
    const rawInsType = getSelectedValue('insurance_type');
    if (rawInsType) {
      claim.insuranceType = mapInsType(rawInsType);
    } else if (getFieldText('insurance_type').toLowerCase().includes('medicare')) {
      claim.insuranceType = 'Medicare';
    }

    // ----------------------------------------------------
    // Patient (Box 2, 3, 5)
    // ----------------------------------------------------
    const ptName = getFieldText('pt_name');
    if (ptName) {
      if (ptName.includes(',')) {
        const parts = ptName.split(',');
        claim.patientLastName = parts[0].trim();
        claim.patientFirstName = parts.length > 1 ? parts[1].trim() : '';
      } else {
        const parts = ptName.trim().split(' ');
        if (parts.length > 1) {
          claim.patientLastName = parts[0];
          claim.patientFirstName = parts.slice(1).join(' ');
        } else {
          claim.patientLastName = parts[0];
        }
      }
    }
    claim.patientDob = getDate('birth');
    
    // Sex (often two checkboxes named sex)
    let sexVal = getSelectedValue('sex');
    if (!sexVal) sexVal = getFieldText('sex');
    const sx = sexVal.toLowerCase();
    if (sx.startsWith('m') || sx === '1' || sx === 'choice1' || sx === 'yes') claim.patientSex = 'M';
    if (sx.startsWith('f') || sx === '2' || sx === 'choice2') claim.patientSex = 'F';

    claim.patientAddress = getFieldText('pt_street');
    claim.patientCity = getFieldText('pt_city');
    claim.patientState = getFieldText('pt_state');
    claim.patientZip = getFieldText('pt_zip');
    
    const ptArea = getFieldText('pt_AreaCode') || getFieldText('pt_phone area');
    let ptPhone = getFieldText('pt_phone');
    if (!ptPhone) ptPhone = getFieldText('tel&tel'); // Sometimes phone is named this
    if (ptArea && ptPhone) claim.patientPhone = `(${ptArea}) ${ptPhone}`;
    else if (ptPhone) claim.patientPhone = ptPhone;

    // Box 6 Patient Relationship
    const relIns = getSelectedValue('rel_to_ins');
    if (relIns) {
      const r = relIns.toLowerCase();
      if (r.includes('self') || r === 's' || r === '1' || r === 'choice1') claim.patientRelationship = 'Self';
      else if (r.includes('spouse') || r === '2' || r === 'choice2') claim.patientRelationship = 'Spouse';
      else if (r.includes('child') || r === 'c' || r === '3' || r === 'choice3') claim.patientRelationship = 'Child';
      else claim.patientRelationship = 'Other';
    }

    // Box 10
    const emp = getSelectedValue('employment').toLowerCase();
    if (emp && (emp.includes('yes') || emp === '1' || emp === 'choice1' || emp === 'true')) claim.conditionEmployment = 'Yes';
    else if (emp) claim.conditionEmployment = 'No';

    const auto = getSelectedValue('pt_auto_accident').toLowerCase();
    if (auto && (auto.includes('yes') || auto === '1' || auto === 'choice1' || auto === 'true')) claim.conditionAuto = 'Yes';
    else if (auto) claim.conditionAuto = 'No';
    
    claim.conditionAutoState = getFieldText('accident_place') || getFieldText('place') || getFieldText('place_state');

    const otherAcc = getSelectedValue('other_accident').toLowerCase();
    if (otherAcc && (otherAcc.includes('yes') || otherAcc === '1' || otherAcc === 'choice1' || otherAcc === 'true')) claim.conditionOther = 'Yes';
    else if (otherAcc) claim.conditionOther = 'No';

    // ----------------------------------------------------
    // Insured (Box 4, 7, 11)
    // ----------------------------------------------------
    const insName = getFieldText('ins_name');
    if (insName) {
      if (insName.includes(',')) {
        const parts = insName.split(',');
        claim.insuredLastName = parts[0].trim();
        claim.insuredFirstName = parts.length > 1 ? parts[1].trim() : '';
      } else {
        const parts = insName.trim().split(' ');
        if (parts.length > 1) {
          claim.insuredLastName = parts[0];
          claim.insuredFirstName = parts.slice(1).join(' ');
        } else {
          claim.insuredLastName = parts[0];
        }
      }
    }
    claim.insuredAddress = getFieldText('ins_street');
    claim.insuredCity = getFieldText('ins_city');
    claim.insuredState = getFieldText('ins_state');
    claim.insuredZip = getFieldText('ins_zip');
    
    const insArea = getFieldText('ins_phone area');
    const insPhone = getFieldText('ins_phone');
    if (insArea && insPhone) claim.insuredPhone = `(${insArea}) ${insPhone}`;
    else if (insPhone) claim.insuredPhone = insPhone;
    
    claim.insuredPolicyGroup = getFieldText('ins_policy');
    claim.insuredDobBox11 = getDate('ins_dob');
    claim.insuredPolicyName = getFieldText('ins_plan_name') || getFieldText('ins_benefit_plan');

    let insSexM = getSelectedValue('ins_sex') || getFieldText('ins_sex');
    let insSexF = getSelectedValue('276') || getFieldText('276') || getFieldText('ins_sex_f');
    if (insSexM.toLowerCase() === 'yes' || insSexM.toLowerCase() === '1' || insSexM.toLowerCase() === 'choice1' || insSexM.toLowerCase().startsWith('m')) {
      claim.insuredSexBox11 = 'M';
    } else if (insSexF.toLowerCase() === 'yes' || insSexF.toLowerCase() === 'true' || insSexF.toLowerCase() === 'choice2' || insSexF.toLowerCase().startsWith('f')) {
      claim.insuredSexBox11 = 'F';
    }
    // Box 9
    claim.otherInsuredName = getFieldText('other_ins_name') || getFieldText('9');
    claim.otherInsuredPolicy = getFieldText('other_ins_policy') || getFieldText('9a');
    claim.otherInsuredReserved = getFieldText('9b') || getFieldText('other_ins_dob') || getFieldText('reserved_9b') || getFieldText('9_b') || getFieldText('40');
    claim.otherInsuredReserved2 = getFieldText('9c') || getFieldText('other_ins_employer') || getFieldText('reserved_9c') || getFieldText('9_c') || getFieldText('41');
    claim.otherInsurancePlan = getFieldText('other_ins_plan_name') || getFieldText('9d');

    // Box 8
    claim.reservedNucc = getFieldText('NUCC USE') || getFieldText('reserved_nucc') || '';



    claim.otherClaimIdQual = getFieldText('11b_qual') || getFieldText('other_claim_qual') || getFieldText('qual11b') || getFieldText('57') || '';
    claim.otherClaimId = getFieldText('11b') || getFieldText('other_claim_id') || getFieldText('58') || '';
    claim.insuredPolicyName = getFieldText('11c') || getFieldText('ins_plan_name') || getFieldText('ins_benefit_plan');

    // ----------------------------------------------------
    // Signatures (Box 12, 13)
    // ----------------------------------------------------
    claim.patientSignature = getFieldText('pt_signature');
    claim.patientSignatureDate = getFieldText('pt_date') || getFieldText('patient_date') || '';
    claim.insuredSignature = getFieldText('ins_signature');

    // Section 6 - Signatures
    claim.physicianSignature = getFieldText('physician_signature');
    claim.signatureDate = getFieldText('physician_date') || getFieldText('signature_date') || '';

    // ----------------------------------------------------
    // Box 14 - 23 (Dates, Provider, Diagnosis, Prior Auth)
    // ----------------------------------------------------
    claim.dateCurrentIllnessFrom = getDate('cur_ill');
    claim.dateCurrentIllnessQual = getFieldText('73') || getFieldText('cur_ill_qual') || getFieldText('14_qual') || getFieldText('qual_14') || '';
    
    // Some forms don't have an end date, but if they do:
    claim.dateCurrentIllnessTo = getDate('cur_ill_to') || '';  

    const otherDt = getDate('sim_ill');
    if (otherDt) claim.otherDate = otherDt;
    claim.otherDateQual = getFieldText('74') || getFieldText('other_date_qual') || getFieldText('15_qual') || getFieldText('qual_15') || '';
    
    // Box 10d
    claim.claimCodes = getFieldText('10d') || getFieldText('claim_codes') || getFieldText('condition_claim_codes');

    // Box 19
    claim.additionalClaimInfo = getFieldText('19') || getFieldText('local_use') || getFieldText('additional_info') || getFieldText('additionalClaimInfo');

    // Box 16
    const wmF = getFieldText('work_mm_from'), wdF = getFieldText('work_dd_from'), wyF = getFieldText('work_yy_from');
    if (wmF || wdF || wyF) claim.unableToWorkFrom = `${wmF.padStart(2, '0')}/${wdF.padStart(2, '0')}/${wyF.length === 2 ? '20'+wyF : wyF}`.replace(/^\/|\/$/g, '');
    
    const wmE = getFieldText('work_mm_end'), wdE = getFieldText('work_dd_end'), wyE = getFieldText('work_yy_end');
    if (wmE || wdE || wyE) claim.unableToWorkTo = `${wmE.padStart(2, '0')}/${wdE.padStart(2, '0')}/${wyE.length === 2 ? '20'+wyE : wyE}`.replace(/^\/|\/$/g, '');

    claim.referringProviderName = getFieldText('ref_physician') || getFieldText('17');
    claim.referringProviderNpi = getFieldText('id_physician') || getFieldText('17b');
    claim.referringProviderQual = getFieldText('85') || getFieldText('ref_physician_qual') || getFieldText('17_qual');
    claim.referringProviderOtherIdQual = getFieldText('physician number 17a1') || getFieldText('17a_qual');
    claim.referringProviderOtherId = getFieldText('physician number 17a') || getFieldText('17a');
    
    const hFm = getFieldText('hosp_mm_from'), hFd = getFieldText('hosp_dd_from'), hFy = getFieldText('hosp_yy_from');
    if (hFm || hFd || hFy) claim.hospitalizationFrom = `${hFm.padStart(2, '0')}/${hFd.padStart(2, '0')}/${hFy.length === 2 ? '20'+hFy : hFy}`.replace(/^\/|\/$/g, '');
    
    const hTm = getFieldText('hosp_mm_end'), hTd = getFieldText('hosp_dd_end'), hTy = getFieldText('hosp_yy_end');
    if (hTm || hTd || hTy) claim.hospitalizationTo = `${hTm.padStart(2, '0')}/${hTd.padStart(2, '0')}/${hTy.length === 2 ? '20'+hTy : hTy}`.replace(/^\/|\/$/g, '');
    
    const labVal = getSelectedValue('lab').toLowerCase() || getSelectedValue('20').toLowerCase();
    if (labVal === 'yes' || labVal === '1' || labVal === 'y') {
      claim.outsideLab = 'Yes';
    } else if (labVal === 'no' || labVal === '2' || labVal === 'n') {
      claim.outsideLab = 'No';
    }

    claim.additionalClaimInfo = getFieldText('96') || getFieldText('19') || getFieldText('add_claim_info');
    
    let rawCharge = getFieldText('charge') || getFieldText('lab_charge') || getFieldText('20_charges') || '';
    if (rawCharge && !rawCharge.includes('.')) {
      if (rawCharge.length <= 2) {
        rawCharge = '.' + rawCharge.padStart(2, '0');
      } else {
        rawCharge = rawCharge.slice(0, -2) + '.' + rawCharge.slice(-2);
      }
    }
    claim.outsideLabCharges = rawCharge;

    claim.priorAuthNumber = getFieldText('prior_auth') || getFieldText('23');
    claim.resubmissionCode = getFieldText('medicaid_resub') || getFieldText('22_code') || getFieldText('resubmission');
    claim.originalRefNum = getFieldText('original_ref') || getFieldText('22_ref');

    // Diagnosis Codes (Box 21)
    for (let i = 1; i <= 12; i++) {
      const dx = getFieldText(`diagnosis${i}`);
      if (dx) claim.diagnosisCodes[i - 1] = dx;
    }

    // ----------------------------------------------------
    // Service Lines (Box 24)
    // ----------------------------------------------------
    claim.serviceLines = [];
    for (let i = 1; i <= 6; i++) {
      const mm = getFieldText(`sv${i}_mm_from`);
      const dd = getFieldText(`sv${i}_dd_from`);
      const yy = getFieldText(`sv${i}_yy_from`);
      
      const cpt = getFieldText(`cpt${i}`);
      const chg = getFieldText(`ch${i}`);

      if (mm || cpt || chg) {
        const line: ServiceLine = {
          id: crypto.randomUUID(),
          dateFrom: getDate(`sv${i}_from`).replace('_from', ''), // Manual fallback if needed, but we do it manually below
          dateTo: getDate(`sv${i}_end`).replace('_end', ''),
          placeOfService: getFieldText(`place${i}`),
          emg: getFieldText(`emg${i}`),
          cptCode: cpt,
          modifier1: getFieldText(`mod${i}`),
          modifier2: getFieldText(`mod${i}a`),
          modifier3: getFieldText(`mod${i}b`),
          modifier4: getFieldText(`mod${i}c`),
          diagnosisPointer: getFieldText(`diag${i}`),
          charges: chg,
          daysUnits: getFieldText(`day${i}`),
          epsdt: getFieldText(`epsdt${i}`) || getFieldText(`family${i}`),
          qualId: getFieldText(`qual${i}`) || getFieldText(`id_qual${i}`),
          renderingOtherId: getFieldText(`local${i}a`),
          renderingNpi: getFieldText(`local${i}`)
        };
        
        // Manual date formatting for lines
        if (mm && dd && yy) {
          line.dateFrom = `${mm.padStart(2, '0')}/${dd.padStart(2, '0')}/${yy.length === 2 ? '20'+yy : yy}`;
        }
        
        const emm = getFieldText(`sv${i}_mm_end`);
        const edd = getFieldText(`sv${i}_dd_end`);
        const eyy = getFieldText(`sv${i}_yy_end`);
        if (emm && edd && eyy) {
          line.dateTo = `${emm.padStart(2, '0')}/${edd.padStart(2, '0')}/${eyy.length === 2 ? '20'+eyy : eyy}`;
        }

        claim.serviceLines.push(line);
      }
    }
    
    // Ensure at least one empty line if all were empty
    if (claim.serviceLines.length === 0) {
      claim.serviceLines.push({
        id: crypto.randomUUID(), dateFrom: '', dateTo: '', placeOfService: '', emg: '', 
        cptCode: '', modifier1: '', modifier2: '', modifier3: '', modifier4: '', diagnosisPointer: '', charges: '', 
        daysUnits: '1', epsdt: '', qualId: '', renderingNpi: '', renderingOtherId: ''
      });
    }

    // ----------------------------------------------------
    // Footer (Box 25 - 33)
    // ----------------------------------------------------
    claim.federalTaxId = getFieldText('tax_id');
    const ssnChecked = getSelectedValue('ssn').toLowerCase();
    if (ssnChecked === 'yes' || ssnChecked === 'y' || ssnChecked === '1') {
      claim.taxIdType = 'SSN';
    } else {
      claim.taxIdType = 'EIN'; // EIN is often a separate checkbox or implied
    }

    claim.patientAccountNo = getFieldText('pt_account');
    
    // assignment radio
    const assignVal = getSelectedValue('assignment').toLowerCase();
    if (assignVal === 'yes' || assignVal === 'y') claim.acceptAssignment = 'Yes';
    else if (assignVal === 'no' || assignVal === 'n') claim.acceptAssignment = 'No';
    
    claim.totalCharge = getFieldText('t_charge');
    claim.amountPaid = getFieldText('amt_paid') || getFieldText('amount_paid');
    claim.balanceDue = getFieldText('bal_due') || getFieldText('balance_due');

    const parseLocation = (str: string) => {
      let city = str, state = '', zip = '';
      const zipMatch = str.match(/\s+([A-Za-z]{2})[,\s]*(\d{5}(?:-\d{4})?)\s*$/);
      if (zipMatch) {
        state = zipMatch[1];
        zip = zipMatch[2];
        city = str.substring(0, zipMatch.index).replace(/,\s*$/, '').trim();
      }
      return { city, state, zip };
    };

    // Box 32
    claim.facilityName = getFieldText('fac_name');
    claim.facilityAddress = getFieldText('fac_street');
    const facLoc = parseLocation(getFieldText('fac_location'));
    claim.facilityCity = facLoc.city || getFieldText('fac_city');
    claim.facilityState = facLoc.state || getFieldText('fac_state');
    claim.facilityZip = facLoc.zip || getFieldText('fac_zip');
    claim.facilityNpi = getFieldText('pin1') || getFieldText('fac_npi');
    claim.facilityOtherId = getFieldText('grp1') || getFieldText('fac_other');

    // Box 33
    claim.billingProviderName = getFieldText('doc_name');
    claim.billingProviderAddress = getFieldText('doc_street');
    const docLoc = parseLocation(getFieldText('doc_location'));
    claim.billingProviderCity = docLoc.city || getFieldText('doc_city');
    claim.billingProviderState = docLoc.state || getFieldText('doc_state');
    claim.billingProviderZip = docLoc.zip || getFieldText('doc_zip');
    
    const docArea = getFieldText('doc_phone area');
    const docPhone = getFieldText('doc_phone');
    if (docArea && docPhone) claim.billingProviderPhone = `(${docArea}) ${docPhone}`;
    else if (docPhone) claim.billingProviderPhone = docPhone;
    
    claim.billingNpi = getFieldText('pin'); // Usually "pin" is the NPI for the billing provider
    
    let grpVal = getFieldText('grp');
    const taxVal = getFieldText('taxonomy');
    
    if (taxVal) {
      claim.taxonomyCode = taxVal;
      claim.billingProviderOtherIdQual = 'ZZ';
    } else if (grpVal) {
      // Official NUCC guidelines say Box 33b contains the qualifier followed immediately by the ID (e.g. "ZZ1234567890X")
      let qual = '';
      const possibleQuals = ['0B', '1G', 'G2', 'LU', 'ZZ'];
      const prefix = grpVal.substring(0, 2).toUpperCase();
      
      if (possibleQuals.includes(prefix)) {
        qual = prefix;
        grpVal = grpVal.substring(2).trim(); // strip the qualifier from the ID
      }

      if (qual === 'ZZ' || (!qual && grpVal.length === 10 && /^[A-Z0-9]+X$/.test(grpVal))) {
        claim.taxonomyCode = grpVal;
        claim.billingProviderOtherIdQual = 'ZZ';
      } else {
        claim.billingProviderOtherId = grpVal;
        claim.billingProviderOtherIdQual = qual;
      }
    }

  } catch (err) {
    console.error('Error mapping PDF fields:', err);
    throw new Error('Failed to parse PDF fields correctly.');
  }

  return claim;
}
