import { PDFDocument, PDFTextField, PDFCheckBox, PDFName } from 'pdf-lib';
import type { ClaimForm, ServiceLine } from './types';
import { EMPTY_FORM } from './types';

export async function importFromPdf(file: File): Promise<ClaimForm> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const form = pdfDoc.getForm();
  
  const claim: ClaimForm = JSON.parse(JSON.stringify(EMPTY_FORM));
  const allFields = form.getFields();

  const hasCMSField = allFields.some(f => f.getName().toLowerCase().includes('pt_name') || f.getName().toLowerCase().includes('insurance_id'));
  if (!hasCMSField || allFields.length < 10) {
    throw new Error('INVALID_TEMPLATE');
  }

  // Exact match reader
  const getFieldExact = (exactName: string): string => {
    try {
      const field = form.getTextField(exactName);
      return field?.getText() || '';
    } catch (e) {
      return '';
    }
  };

  // Fuzzy match reader
  const getFieldText = (matchStr: string): string => {
    try {
      const field = allFields.find(f => {
        const n = f.getName().toLowerCase();
        const m = matchStr.toLowerCase();
        return n === m || n.endsWith('.' + m) || n.endsWith('_' + m) || n.endsWith('[' + m + ']') || n === m + '[0]';
      });
      if (field && field instanceof PDFTextField) return field.getText() || '';
    } catch (e) {}
    return '';
  };

  // Checkbox state reader
  const getSelectedValue = (matchStr: string): string => {
    try {
      const field = allFields.find(f => f.getName().toLowerCase() === matchStr.toLowerCase());
      if (field && field instanceof PDFCheckBox) {
        // @ts-ignore
        const widgets = field.acroField?.getWidgets() || [];
        for (const w of widgets) {
          try {
            // @ts-ignore
            const val = w.dict?.get(PDFName.of('AS'))?.decodeText();
            if (val && val !== 'Off') return val;
          } catch(e) {}
        }
        return field.isChecked() ? 'Yes' : '';
      }
    } catch (e) {}
    return '';
  };

  const getDateStr = (mmField: string, ddField: string, yyField: string): string => {
    const mm = getFieldText(mmField);
    const dd = getFieldText(ddField);
    const yy = getFieldText(yyField);
    if (mm || dd || yy) {
      const yStr = yy.length === 2 ? `20${yy}` : yy;
      return `${mm.padStart(2, '0')}/${dd.padStart(2, '0')}/${yStr}`;
    }
    return '';
  };

  const parseName = (fullName: string) => {
    let last = '', first = '', mi = '';
    if (!fullName) return { last, first, mi };
    if (fullName.includes(',')) {
      const parts = fullName.split(',');
      last = parts[0].trim();
      const rest = parts[1].trim().split(' ');
      first = rest[0] || '';
      mi = rest.length > 1 ? rest.slice(1).join(' ') : '';
    } else {
      const parts = fullName.split(' ');
      last = parts.pop() || '';
      first = parts.shift() || '';
      mi = parts.join(' ');
    }
    return { last, first, mi };
  };

  const parseLocation = (str: string) => {
    let city = '', state = '', zip = '';
    if (!str) return { city, state, zip };
    const match = str.match(/^(.*?)[,\s]+([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    if (match) {
      city = match[1].trim(); state = match[2].toUpperCase(); zip = match[3];
    } else {
      city = str;
    }
    return { city, state, zip };
  };

  try {
    // Top Carrier
    claim.payerName = getFieldText('insurance_name');
    claim.payerAddress = [getFieldText('insurance_address'), getFieldText('insurance_address2')].filter(Boolean).join(' ');
    const payerLoc = parseLocation(getFieldText('insurance_city_state_zip'));
    claim.payerCity = payerLoc.city; claim.payerState = payerLoc.state; claim.payerZip = payerLoc.zip;

    // Box 1
    const t = getSelectedValue('insurance_type').toLowerCase();
    if (t.includes('medicare')) claim.insuranceType = 'Medicare';
    else if (t.includes('medicaid')) claim.insuranceType = 'Medicaid';
    else if (t.includes('tricare')) claim.insuranceType = 'Tricare';
    else if (t.includes('feca') || t.includes('champva')) claim.insuranceType = 'FECA';
    else if (t.includes('group')) claim.insuranceType = 'Group';
    else if (t) claim.insuranceType = 'Other';

    claim.insurerId = getFieldText('insurance_id');

    // Box 2 / Box 4
    const pt = parseName(getFieldText('pt_name'));
    claim.patientLastName = pt.last; claim.patientFirstName = pt.first; claim.patientMI = pt.mi;
    const ins = parseName(getFieldText('ins_name'));
    claim.insuredLastName = ins.last; claim.insuredFirstName = ins.first; claim.insuredMI = ins.mi;

    // Box 3
    claim.patientDob = getDateStr('birth_mm', 'birth_dd', 'birth_yy');
    const sx = getSelectedValue('sex');
    if (sx === 'M' || sx === 'Male') claim.patientSex = 'M';
    else if (sx === 'F' || sx === 'Female') claim.patientSex = 'F';

    // Box 5
    claim.patientAddress = getFieldText('pt_street');
    claim.patientCity = getFieldText('pt_city');
    claim.patientState = getFieldText('pt_state');
    claim.patientZip = getFieldText('pt_zip');
    const ptArea = getFieldText('pt_AreaCode');
    const ptPhone = getFieldText('pt_phone');
    claim.patientPhone = ptArea ? `(${ptArea}) ${ptPhone}` : ptPhone;

    // Box 6
    const rel = getSelectedValue('rel_to_ins');
    if (rel === 'S') claim.patientRelationship = 'Self';
    else if (rel === 'M') claim.patientRelationship = 'Spouse';
    else if (rel === 'C') claim.patientRelationship = 'Child';
    else if (rel === 'O') claim.patientRelationship = 'Other';

    // Box 7
    claim.insuredAddress = getFieldText('ins_street');
    claim.insuredCity = getFieldText('ins_city');
    claim.insuredState = getFieldText('ins_state');
    claim.insuredZip = getFieldText('ins_zip');
    const insArea = getFieldText('ins_phone area');
    const insPhone = getFieldText('ins_phone');
    claim.insuredPhone = insArea ? `(${insArea}) ${insPhone}` : insPhone;

    // Box 8, 9
    claim.reservedNucc = getFieldText('NUCC USE');
    claim.otherInsuredName = getFieldText('other_ins_name');
    claim.otherInsuredPolicy = getFieldText('other_ins_policy');
    claim.otherInsurancePlan = getFieldText('other_ins_plan_name');

    // Box 10
    claim.conditionEmployment = getSelectedValue('employment') === 'Yes' ? 'Yes' : 'No';
    claim.conditionAuto = getSelectedValue('pt_auto_accident') === 'Yes' ? 'Yes' : 'No';
    claim.conditionAutoState = getFieldText('accident_place');
    claim.conditionOther = getSelectedValue('other_accident') === 'Yes' ? 'Yes' : 'No';

    // Box 11
    claim.insuredPolicyGroup = getFieldText('ins_policy');
    claim.insuredDobBox11 = getDateStr('ins_dob_mm', 'ins_dob_dd', 'ins_dob_yy');
    const isx = getSelectedValue('ins_sex').toLowerCase();
    if (isx === 'male') claim.insuredSexBox11 = 'M';
    else if (isx === 'female') claim.insuredSexBox11 = 'F';
    claim.insuredPolicyName = getFieldText('ins_plan_name');
    claim.anotherPlan = getSelectedValue('ins_benefit_plan') === 'Yes' ? 'Yes' : 'No';

    // Box 12/13
    claim.patientSignature = getFieldText('pt_signature');
    claim.patientSignatureDate = getFieldText('pt_date');
    claim.insuredSignature = getFieldText('ins_signature');

    // Box 14-19
    claim.dateCurrentIllnessFrom = getDateStr('cur_ill_mm', 'cur_ill_dd', 'cur_ill_yy');
    claim.otherDate = getDateStr('sim_ill_mm', 'sim_ill_dd', 'sim_ill_yy');
    claim.unableToWorkFrom = getDateStr('work_mm_from', 'work_dd_from', 'work_yy_from');
    claim.unableToWorkTo = getDateStr('work_mm_end', 'work_dd_end', 'work_yy_end');
    
    claim.referringProviderName = getFieldText('ref_physician');
    claim.referringProviderOtherIdQual = getFieldExact('physician number 17a1');
    claim.referringProviderOtherId = getFieldExact('physician number 17a');
    if (!claim.referringProviderOtherId) claim.referringProviderOtherId = getFieldText('id_physician');
    claim.referringProviderNpi = getFieldText('85');
    
    claim.hospitalizationFrom = getDateStr('hosp_mm_from', 'hosp_dd_from', 'hosp_yy_from');
    claim.hospitalizationTo = getDateStr('hosp_mm_end', 'hosp_dd_end', 'hosp_yy_end');
    claim.additionalClaimInfo = getFieldText('96');

    // Box 20-23
    claim.outsideLab = getSelectedValue('lab') === 'Yes' ? 'Yes' : 'No';
    claim.outsideLabCharges = getFieldText('charge');
    claim.icdIndicator = getFieldText('99icd') === '9' ? 'ICD-9' : 'ICD-10';
    for (let i = 1; i <= 12; i++) claim.diagnosisCodes[i - 1] = getFieldText(`diagnosis${i}`);
    
    claim.resubmissionCode = getFieldText('medicaid_resub');
    claim.originalRefNum = getFieldText('original_ref');
    claim.priorAuthNumber = getFieldText('prior_auth');

    // Box 24
    claim.serviceLines = [];
    for (let i = 1; i <= 6; i++) {
      const cpt = getFieldText(`cpt${i}`);
      const chg = getFieldText(`ch${i}`);
      if (cpt || chg) {
        claim.serviceLines.push({
          id: crypto.randomUUID(),
          dateFrom: getDateStr(`sv${i}_mm_from`, `sv${i}_dd_from`, `sv${i}_yy_from`),
          dateTo: getDateStr(`sv${i}_mm_end`, `sv${i}_dd_end`, `sv${i}_yy_end`),
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
          epsdt: getFieldText(`epsdt${i}`),
          qualId: getFieldText(`local${i}a`),
          renderingNpi: getFieldText(`local${i}`),
          renderingOtherId: ''
        });
      }
    }
    if (claim.serviceLines.length === 0) {
      claim.serviceLines.push({
        id: crypto.randomUUID(), dateFrom: '', dateTo: '', placeOfService: '', emg: '', 
        cptCode: '', modifier1: '', modifier2: '', modifier3: '', modifier4: '', diagnosisPointer: '', charges: '', 
        daysUnits: '1', epsdt: '', qualId: '', renderingNpi: '', renderingOtherId: ''
      });
    }

    // Box 25-30
    claim.federalTaxId = getFieldText('tax_id');
    const ssn = getSelectedValue('ssn');
    claim.taxIdType = (ssn === 'SSN' || ssn === 'Yes') ? 'SSN' : 'EIN';
    claim.patientAccountNo = getFieldText('pt_account');
    claim.acceptAssignment = getSelectedValue('assignment') === 'YES' ? 'Y' : 'N';
    claim.totalCharge = getFieldText('t_charge');
    claim.amountPaid = getFieldText('amt_paid');

    // Box 31
    claim.physicianSignature = getFieldText('physician_signature');
    claim.signatureDate = getFieldText('physician_date');

    // Box 32
    claim.facilityName = getFieldText('fac_name');
    claim.facilityAddress = getFieldText('fac_street');
    const facLoc = parseLocation(getFieldText('fac_location'));
    claim.facilityCity = facLoc.city; claim.facilityState = facLoc.state; claim.facilityZip = facLoc.zip;
    claim.facilityNpi = getFieldText('pin');
    claim.facilityOtherId = getFieldText('grp');

    // Box 33
    claim.billingProviderName = getFieldText('doc_name');
    claim.billingProviderAddress = getFieldText('doc_street');
    const docLoc = parseLocation(getFieldText('doc_location'));
    claim.billingProviderCity = docLoc.city; claim.billingProviderState = docLoc.state; claim.billingProviderZip = docLoc.zip;
    const docArea = getFieldText('doc_phone area');
    const docPhone = getFieldText('doc_phone');
    claim.billingProviderPhone = docArea ? `(${docArea}) ${docPhone}` : docPhone;
    
    claim.billingNpi = getFieldText('pin1');
    const b33b = getFieldText('grp1');
    if (b33b) {
      const q = b33b.substring(0, 2).toUpperCase();
      if (['0B', '1G', 'G2', 'LU', 'ZZ'].includes(q)) {
        claim.billingProviderOtherIdQual = q;
        if (q === 'ZZ') claim.taxonomyCode = b33b.substring(2);
        else claim.billingProviderOtherId = b33b.substring(2);
      } else {
        claim.billingProviderOtherId = b33b;
      }
    }
  } catch (err) {
    console.error('Error mapping PDF fields:', err);
    throw new Error('Failed to parse PDF fields correctly.');
  }

  return claim;
}
