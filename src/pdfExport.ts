import { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFName } from 'pdf-lib';
import type { ClaimForm, ServiceLine } from './types';

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

  // Advanced safe helper to check a specific option in grouped checkboxes
  const setCheckAdvanced = (fieldName: string, targetValue: string) => {
    try {
      const field = form.getField(fieldName);
      if (field && field instanceof PDFCheckBox) {
        // @ts-ignore
        const widgets = field.acroField?.getWidgets() || [];
        widgets.forEach(w => {
          try {
            const onVal = w.getOnValue()?.value() || w.getOnValue()?.toString();
            // Compare removing slashes
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

  // Helper for dates MM/DD/YYYY
  const setDateBox = (mmField: string, ddField: string, yyField: string, dateVal: string) => {
    if (!dateVal) return;
    const parts = dateVal.includes('/') ? dateVal.split('/') : dateVal.split('-');
    if (parts.length === 3) {
      if (dateVal.includes('/')) {
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

  // 1. Top Carrier
  setField('insurance_name', claim.payerName);
  setField('insurance_address', claim.payerAddress);
  setField('insurance_address2', '');
  setField('insurance_city_state_zip', `${claim.payerCity} ${claim.payerState} ${claim.payerZip}`.trim());

  // 1. Insurance Type
  if (claim.insuranceType) {
    if (claim.insuranceType === 'Medicare') setCheckAdvanced('insurance_type', 'Medicare');
    else if (claim.insuranceType === 'Medicaid') setCheckAdvanced('insurance_type', 'Medicaid');
    else if (claim.insuranceType === 'Tricare') setCheckAdvanced('insurance_type', 'Tricare');
    else if (claim.insuranceType === 'CHAMPVA') setCheckAdvanced('insurance_type', 'Champva');
    else if (claim.insuranceType === 'Group Health Plan') setCheckAdvanced('insurance_type', 'Group');
    else if (claim.insuranceType === 'FECA Blk Lung') setCheckAdvanced('insurance_type', 'Feca');
    else if (claim.insuranceType === 'Other') setCheckAdvanced('insurance_type', 'Other');
  }

  // Box 1a - Insured ID
  setField('insurance_id', claim.insurerId);

  // Box 2 - Patient Name
  setField('pt_name', `${claim.patientLastName}, ${claim.patientFirstName} ${claim.patientMI}`.trim());

  // Box 3 - Patient DOB & Sex
  setDateBox('birth_mm', 'birth_dd', 'birth_yy', claim.patientDob);
  if (claim.patientSex === 'M') setCheckAdvanced('sex', 'M');
  if (claim.patientSex === 'F') setCheckAdvanced('sex', 'F');

  // Box 4 - Insured Name
  setField('ins_name', `${claim.insuredLastName}, ${claim.insuredFirstName} ${claim.insuredMI}`.trim());

  // Box 5 - Patient Address
  setField('pt_street', claim.patientAddress);
  setField('pt_city', claim.patientCity);
  setField('pt_state', claim.patientState);
  setField('pt_zip', claim.patientZip);
  setField('pt_phone', claim.patientPhone); // Assuming 1 field

  // Box 6 - Patient Relationship
  if (claim.patientRelationship === 'Self') setCheckAdvanced('rel_to_ins', 'S');
  else if (claim.patientRelationship === 'Spouse') setCheckAdvanced('rel_to_ins', 'M');
  else if (claim.patientRelationship === 'Child') setCheckAdvanced('rel_to_ins', 'C');
  else if (claim.patientRelationship === 'Other') setCheckAdvanced('rel_to_ins', 'O');

  // Box 7 - Insured Address
  setField('ins_street', claim.insuredAddress);
  setField('ins_city', claim.insuredCity);
  setField('ins_state', claim.insuredState);
  setField('ins_zip', claim.insuredZip);
  setField('ins_phone', claim.insuredPhone);

  // Box 11 - Insured Policy Group
  setField('ins_policy', claim.insuredPolicyGroup);
  setDateBox('ins_dob_mm', 'ins_dob_dd', 'ins_dob_yy', claim.insuredDobBox11);
  if (claim.insuredSexBox11 === 'M') setCheckAdvanced('ins_sex', 'MALE');
  if (claim.insuredSexBox11 === 'F') setCheckAdvanced('ins_sex', 'FEMALE');
  setField('ins_benefit_plan', claim.insuredPolicyName);

  // Box 12/13 - Signatures
  setField('pt_signature', claim.patientSignature);
  setField('pt_date', claim.patientSignatureDate);
  setField('ins_signature', claim.insuredSignature);

  // Box 21 - Diagnosis
  claim.diagnosisCodes.forEach((code, idx) => {
    if (code) setField(`diagnosis${idx + 1}`, code);
  });

  // Box 24 - Service Lines
  claim.serviceLines.forEach((line, idx) => {
    const num = idx + 1; // 1 to 6
    if (num > 6) return;
    
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
    
    setField(`local${num}a`, line.qualId); // Box 24I
    setField(`local${num}`, line.renderingNpi); // Box 24J
  });

  // Box 25 - Tax ID
  setField('tax_id', claim.federalTaxId);
  if (claim.taxIdType === 'SSN') setCheckAdvanced('ssn', 'SSN');
  if (claim.taxIdType === 'EIN') setCheckAdvanced('ssn', 'EIN');

  // Box 26 - Patient Account No
  setField('pt_account', claim.patientAccountNo);
  
  // Box 27 - Accept Assignment
  if (claim.acceptAssignment === 'Y') setCheckAdvanced('assignment', 'YES');
  else if (claim.acceptAssignment === 'N') setCheckAdvanced('assignment', 'NO');

  // Box 28, 29, 30
  setField('t_charge', claim.totalCharge);
  setField('amt_paid', claim.amountPaid);

  // Box 31
  setField('physician_signature', claim.physicianSignature);
  setField('physician_date', claim.signatureDate);

  // Box 32
  setField('fac_name', claim.facilityName);
  setField('fac_street', claim.facilityAddress);
  setField('fac_location', `${claim.facilityCity} ${claim.facilityState} ${claim.facilityZip}`.trim());
  setField('pin', claim.facilityNpi); // 32a

  // Box 33
  setField('doc_name', claim.billingProviderName);
  setField('doc_street', claim.billingProviderAddress);
  setField('doc_location', `${claim.billingProviderCity} ${claim.billingProviderState} ${claim.billingProviderZip}`.trim());
  setField('doc_phone', claim.billingProviderPhone);
  setField('pin1', claim.billingNpi); // 33a
  
  const box33b = (claim.billingProviderOtherIdQual || '') + (claim.billingProviderOtherIdQual === 'ZZ' ? claim.taxonomyCode : claim.billingProviderOtherId);
  setField('grp', box33b); // 33b

  // Flatten the form to make it a static, non-editable PDF for printing/mailing
  form.flatten();

  return await pdfDoc.save();
}
