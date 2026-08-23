import { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFName } from 'pdf-lib';
import type { ClaimForm } from './types';

export async function exportToPdf(claim: ClaimForm, templateBuffer: ArrayBuffer): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(templateBuffer);
  const form = pdfDoc.getForm();
  const allFields = form.getFields();

  // First, clear all fields in the template so old dummy data doesn't leak through
  allFields.forEach(f => {
    try {
      if (f instanceof PDFTextField) f.setText('');
      else if (f instanceof PDFCheckBox) f.uncheck();
      else if (f instanceof PDFRadioGroup) f.clear();
      else if (f instanceof PDFDropdown) f.clear();
    } catch (e) {}
  });

  // Helper to safely set a text field by exact or partial name
  const setField = (matchStr: string, value: string) => {
    if (!value) return;
    try {
      const field = allFields.find(f => {
        const n = f.getName().toLowerCase();
        const m = matchStr.toLowerCase();
        return n === m || n.endsWith('.' + m) || n.endsWith('_' + m) || n.endsWith('[' + m + ']') || n === m + '[0]';
      });
      if (field && field instanceof PDFTextField) {
        field.setText(value);
      }
    } catch (e) {
      console.warn(`Could not set field ${matchStr}`);
    }
  };

  // Helper to set a field by its EXACT name (case-sensitive for fields with spaces)
  const setFieldExact = (exactName: string, value: string) => {
    if (!value) return;
    try {
      const field = form.getTextField(exactName);
      if (field) field.setText(value);
    } catch (e) {}
  };

  // Helper for checkboxes
  const setCheckAdvanced = (fieldName: string, targetValue: string) => {
    try {
      const field = form.getField(fieldName);
      if (field && field instanceof PDFCheckBox) {
        // @ts-ignore
        const widgets = field.acroField?.getWidgets() || [];
        widgets.forEach((w: any) => {
          try {
            const onVal = w.getOnValue()?.value() || w.getOnValue()?.toString();
            const cleanOnVal = onVal?.replace(/^\//, '');
            const cleanTarget = targetValue.replace(/^\//, '');
            if (cleanOnVal === cleanTarget) {
              w.dict.set(PDFName.of('AS'), w.getOnValue()!);
            } else {
              w.dict.set(PDFName.of('AS'), PDFName.of('Off'));
            }
          } catch(e) {}
        });
      }
    } catch (e) {}
  };

  // Helper for dates MM/DD/YYYY or YYYY-MM-DD -> split into 3 boxes
  const setDateBox = (mmField: string, ddField: string, yyField: string, dateVal: string) => {
    if (!dateVal) return;
    const parts = dateVal.includes('/') ? dateVal.split('/') : dateVal.split('-');
    if (parts.length === 3) {
      if (dateVal.includes('/')) {
        // MM/DD/YYYY
        setField(mmField, parts[0]);
        setField(ddField, parts[1]);
        setField(yyField, parts[2].slice(-2));
      } else {
        // YYYY-MM-DD
        setField(mmField, parts[1]);
        setField(ddField, parts[2]);
        setField(yyField, parts[0].slice(-2));
      }
    }
  };

  // Helper to split phone like "2175551234" or "(217) 555-1234" into area code + number
  const setPhone = (areaField: string, numField: string, phone: string) => {
    if (!phone) return;
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      setField(areaField, digits.slice(0, 3));
      setField(numField, digits.slice(3));
    } else {
      setField(numField, phone);
    }
  };

  // ============================================================
  // TOP - CARRIER / PAYER
  // ============================================================
  setField('insurance_name', claim.payerName);
  setField('insurance_address', claim.payerAddress);
  setField('insurance_address2', '');
  setField('insurance_city_state_zip', [claim.payerCity, claim.payerState, claim.payerZip].filter(Boolean).join(' '));

  // Box 1 - Insurance Type (checkbox)
  if (claim.insuranceType) {
    const t = claim.insuranceType;
    if (t === 'Medicare') setCheckAdvanced('insurance_type', 'Medicare');
    else if (t === 'Medicaid') setCheckAdvanced('insurance_type', 'Medicaid');
    else if (t === 'Tricare') setCheckAdvanced('insurance_type', 'Tricare');
    else if (t === 'CHAMPVA' || t === 'FECA') setCheckAdvanced('insurance_type', 'Feca');
    else if (t === 'Group') setCheckAdvanced('insurance_type', 'Group');
    else setCheckAdvanced('insurance_type', 'Other');
  }

  // Box 1a - Insured's ID Number
  setField('insurance_id', claim.insurerId);

  // Box 2 - Patient Name (Last, First MI)
  setField('pt_name', [claim.patientLastName, claim.patientFirstName, claim.patientMI].filter(Boolean).join(' '));

  // Box 3 - Patient DOB & Sex
  setDateBox('birth_mm', 'birth_dd', 'birth_yy', claim.patientDob);
  if (claim.patientSex === 'M') setCheckAdvanced('sex', 'M');
  else if (claim.patientSex === 'F') setCheckAdvanced('sex', 'F');

  // Box 4 - Insured Name
  setField('ins_name', [claim.insuredLastName, claim.insuredFirstName, claim.insuredMI].filter(Boolean).join(' '));

  // Box 5 - Patient Address & Phone
  setField('pt_street', claim.patientAddress);
  setField('pt_city', claim.patientCity);
  setField('pt_state', claim.patientState);
  setField('pt_zip', claim.patientZip);
  setPhone('pt_AreaCode', 'pt_phone', claim.patientPhone);

  // Box 6 - Patient Relationship to Insured
  if (claim.patientRelationship === 'Self') setCheckAdvanced('rel_to_ins', 'S');
  else if (claim.patientRelationship === 'Spouse') setCheckAdvanced('rel_to_ins', 'M');
  else if (claim.patientRelationship === 'Child') setCheckAdvanced('rel_to_ins', 'C');
  else if (claim.patientRelationship === 'Other') setCheckAdvanced('rel_to_ins', 'O');

  // Box 7 - Insured Address & Phone
  setField('ins_street', claim.insuredAddress);
  setField('ins_city', claim.insuredCity);
  setField('ins_state', claim.insuredState);
  setField('ins_zip', claim.insuredZip);
  setPhone('ins_phone area', 'ins_phone', claim.insuredPhone);

  // Box 10a/b/c - Condition Related To
  if (claim.conditionEmployment === 'Yes') setCheckAdvanced('employment', 'Yes');
  else if (claim.conditionEmployment === 'No') setCheckAdvanced('employment', 'No');

  if (claim.conditionAuto === 'Yes') setCheckAdvanced('pt_auto_accident', 'Yes');
  else if (claim.conditionAuto === 'No') setCheckAdvanced('pt_auto_accident', 'No');
  setField('accident_place', claim.conditionAutoState);

  if (claim.conditionOther === 'Yes') setCheckAdvanced('other_accident', 'Yes');
  else if (claim.conditionOther === 'No') setCheckAdvanced('other_accident', 'No');

  // Box 11 - Insured Policy Group
  setField('ins_policy', claim.insuredPolicyGroup);
  setDateBox('ins_dob_mm', 'ins_dob_dd', 'ins_dob_yy', claim.insuredDobBox11);
  if (claim.insuredSexBox11 === 'M') setCheckAdvanced('ins_sex', 'MALE');
  else if (claim.insuredSexBox11 === 'F') setCheckAdvanced('ins_sex', 'FEMALE');
  setField('ins_plan_name', claim.insuredPolicyName);
  // 11d - Is there another health plan?
  if (claim.anotherPlan === 'Yes') setCheckAdvanced('ins_benefit_plan', 'Yes');

  // Box 12/13 - Signatures
  setField('pt_signature', claim.patientSignature);
  setField('pt_date', claim.patientSignatureDate);
  setField('ins_signature', claim.insuredSignature);

  // Box 14 - Date of Current Illness
  setDateBox('cur_ill_mm', 'cur_ill_dd', 'cur_ill_yy', claim.dateOfCurrentIllness);

  // Box 15 - Other Date
  setDateBox('sim_ill_mm', 'sim_ill_dd', 'sim_ill_yy', claim.otherDate);

  // Box 16 - Dates Unable to Work
  setDateBox('work_mm_from', 'work_dd_from', 'work_yy_from', claim.unableToWorkFrom);
  setDateBox('work_mm_end', 'work_dd_end', 'work_yy_end', claim.unableToWorkTo);

  // Box 17 - Referring Provider
  setField('ref_physician', claim.referringProviderName);
  setField('id_physician', claim.referringProviderOtherId);

  // Box 18 - Hospitalization Dates
  setDateBox('hosp_mm_from', 'hosp_dd_from', 'hosp_yy_from', claim.hospitalizationFrom);
  setDateBox('hosp_mm_end', 'hosp_dd_end', 'hosp_yy_end', claim.hospitalizationTo);

  // Box 20 - Outside Lab
  if (claim.outsideLab === 'Yes') setCheckAdvanced('lab', 'Yes');
  else if (claim.outsideLab === 'No') setCheckAdvanced('lab', 'No');
  setField('charge', claim.outsideLabCharges);

  // Box 21 - Diagnosis Codes (ICD indicator + up to 12 codes)
  setField('99icd', claim.icdIndicator === 'ICD-9' ? '9' : '0');
  (claim.diagnosisCodes || []).forEach((code, idx) => {
    if (code) setField(`diagnosis${idx + 1}`, code);
  });

  // Box 22 - Medicaid Resubmission
  setField('medicaid_resub', claim.resubmissionCode);
  setField('original_ref', claim.originalRefNum);

  // Box 23 - Prior Authorization Number
  setField('prior_auth', claim.priorAuthNumber);

  // Box 24 - Service Lines (6 lines)
  (claim.serviceLines || []).forEach((line, idx) => {
    const num = idx + 1;
    if (num > 6) return;
    if (!line.cptCode) return;

    setDateBox(`sv${num}_mm_from`, `sv${num}_dd_from`, `sv${num}_yy_from`, line.dateFrom);
    setDateBox(`sv${num}_mm_end`, `sv${num}_dd_end`, `sv${num}_yy_end`, line.dateTo);

    setField(`place${num}`, line.placeOfService);
    setField(`emg${num}`, line.emg);
    setField(`cpt${num}`, line.cptCode);
    setField(`mod${num}`, line.modifier1);
    setField(`mod${num}a`, line.modifier2);
    setField(`mod${num}b`, line.modifier3);
    setField(`mod${num}c`, line.modifier4);
    setField(`diag${num}`, line.diagnosisPointer);
    setField(`ch${num}`, line.charges);
    setField(`day${num}`, line.daysUnits);
    setField(`epsdt${num}`, line.epsdt);
    setField(`local${num}a`, line.qualId);    // Box 24I
    setField(`local${num}`, line.renderingNpi); // Box 24J
  });

  // Box 25 - Federal Tax ID
  setField('tax_id', claim.federalTaxId);
  if (claim.taxIdType === 'SSN') setCheckAdvanced('ssn', 'SSN');
  else if (claim.taxIdType === 'EIN') setCheckAdvanced('ssn', 'EIN');

  // Box 26 - Patient Account No
  setField('pt_account', claim.patientAccountNo);

  // Box 27 - Accept Assignment
  if (claim.acceptAssignment === 'Y') setCheckAdvanced('assignment', 'YES');
  else if (claim.acceptAssignment === 'N') setCheckAdvanced('assignment', 'NO');

  // Box 28, 29, 30
  setField('t_charge', claim.totalCharge);
  setField('amt_paid', claim.amountPaid);

  // Box 31 - Physician Signature
  setField('physician_signature', claim.physicianSignature);
  setField('physician_date', claim.signatureDate);

  // Box 32 - Service Facility Location
  setField('fac_name', claim.facilityName);
  setField('fac_street', claim.facilityAddress);
  setField('fac_location', [claim.facilityCity, claim.facilityState, claim.facilityZip].filter(Boolean).join(' '));
  setField('pin', claim.facilityNpi);       // 32a
  setField('grp', claim.facilityOtherId);   // 32b

  // Box 33 - Billing Provider Info & Phone
  setField('doc_name', claim.billingProviderName);
  setField('doc_street', claim.billingProviderAddress);
  setField('doc_location', [claim.billingProviderCity, claim.billingProviderState, claim.billingProviderZip].filter(Boolean).join(' '));
  setPhone('doc_phone area', 'doc_phone', claim.billingProviderPhone);
  setField('pin1', claim.billingNpi);        // 33a

  // 33b - Other ID / Taxonomy
  const box33b = (claim.billingProviderOtherIdQual || '') + (claim.billingProviderOtherIdQual === 'ZZ' ? claim.taxonomyCode : (claim.billingProviderOtherId || ''));
  setField('grp1', box33b);

  // Flatten the form to make it a static, non-editable PDF for printing/mailing
  form.flatten();

  return await pdfDoc.save();
}
