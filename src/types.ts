// ============================================================
// CMS-1500 form data types
// ============================================================

export interface ServiceLine {
  id: string;
  dateFrom: string;
  dateTo: string;
  placeOfService: string;
  emg: string;
  cptCode: string;
  modifier1: string;
  modifier2: string;
  modifier3: string;
  modifier4: string;
  diagnosisPointer: string;
  charges: string;
  daysUnits: string;
  epsdt: string;
  qualId: string;
  renderingNpi: string;
  renderingOtherId: string;
}

export interface ClaimForm {
  // Top Carrier
  payerName: string;
  payerId: string;
  payerAddress: string;
  payerCity: string;
  payerState: string;
  payerZip: string;
  // Patient info
  insuranceType: string;
  insurerId: string;
  patientLastName: string;
  patientFirstName: string;
  patientMI: string;
  patientDob: string;
  patientSex: string;
  insuredLastName: string;
  insuredFirstName: string;
  insuredMI: string;
  patientAddress: string;
  patientCity: string;
  patientState: string;
  patientZip: string;
  patientPhone: string;
  patientRelationship: string;
  insuredAddress: string;
  insuredCity: string;
  insuredState: string;
  insuredZip: string;
  insuredPhone: string;
  insuredDob: string;
  insuredSex: string;
  // Box 9
  otherInsuredName: string;
  otherInsuredPolicy: string;
  otherInsuredReserved: string;
  otherInsuredReserved2: string;
  otherInsurancePlan: string;
  // Box 10
  conditionEmployment: string;
  conditionAuto: string;
  conditionAutoState: string;
  conditionOther: string;
  claimCodes: string;
  // Box 8
  reservedNucc: string;

  // Box 11
  insuredPolicyGroup: string;
  insuredDobBox11: string;
  insuredSexBox11: string;
  otherClaimIdQual: string;
  otherClaimId: string;
  insuredPolicyName: string;
  anotherPlan: string;
  // Box 12/13
  patientSignature: string;
  patientSignatureDate: string;
  insuredSignature: string;
  // Physician info
  dateCurrentIllnessFrom: string;
  dateCurrentIllnessQual: string;
  dateCurrentIllnessTo: string;
  otherDate: string;
  otherDateQual: string;
  unableToWorkFrom: string;
  unableToWorkTo: string;
  referringProviderName: string;
  referringProviderNpi: string;
  referringProviderQual: string;
  referringProviderOtherIdQual: string;
  referringProviderOtherId: string;
  hospitalizationFrom: string;
  hospitalizationTo: string;
  additionalClaimInfo: string;
  dischargeStatus: string;
  outsideLab: string;
  outsideLabCharges: string;
  icdIndicator: string;
  diagnosisCodes: string[];
  resubmissionCode: string;
  originalRefNum: string;
  priorAuthNumber: string;
  serviceLines: ServiceLine[];
  federalTaxId: string;
  taxIdType: string;
  patientAccountNo: string;
  acceptAssignment: string;
  totalCharge: string;
  amountPaid: string;
  balanceDue: string;
  physicianSignature: string;
  signatureDate: string;
  facilityName: string;
  facilityAddress: string;
  facilityCity: string;
  facilityState: string;
  facilityZip: string;
  facilityNpi: string;
  facilityOtherId: string;
  billingProviderName: string;
  billingProviderAddress: string;
  billingProviderCity: string;
  billingProviderState: string;
  billingProviderZip: string;
  billingProviderPhone: string;
  billingNpi: string;
  billingProviderOtherIdQual: string;
  billingProviderOtherId: string;
  taxonomyCode: string;

  // EDI specific fields not on CMS-1500
  submitterName: string;
  submitterId: string;
  receiverId: string;
}

export const EMPTY_FORM: ClaimForm = {
  payerName: '',
  payerId: '',
  payerAddress: '',
  payerCity: '',
  payerState: '',
  payerZip: '',
  insuranceType: '',
  insurerId: '',
  patientLastName: '',
  patientFirstName: '',
  patientMI: '',
  patientDob: '',
  patientSex: '',
  insuredLastName: '',
  insuredFirstName: '',
  insuredMI: '',
  patientAddress: '',
  patientCity: '',
  patientState: '',
  patientZip: '',
  patientPhone: '',
  patientRelationship: '',
  insuredAddress: '',
  insuredCity: '',
  insuredState: '',
  insuredZip: '',
  insuredPhone: '',
  insuredDob: '',
  insuredSex: '',
  otherInsuredName: '',
  otherInsuredPolicy: '',
  otherInsuredReserved: '',
  otherInsuredReserved2: '',
  otherInsurancePlan: '',
  conditionEmployment: 'No',
  conditionAuto: 'No',
  conditionAutoState: '',
  conditionOther: 'No',
  claimCodes: '',
  reservedNucc: '',
  insuredPolicyGroup: '',
  insuredDobBox11: '',
  insuredSexBox11: '',
  otherClaimIdQual: '',
  otherClaimId: '',
  insuredPolicyName: '',
  anotherPlan: 'No',
  patientSignature: '',
  patientSignatureDate: '',
  insuredSignature: '',
  dateCurrentIllnessFrom: '',
  dateCurrentIllnessQual: '',
  dateCurrentIllnessTo: '',
  otherDate: '',
  otherDateQual: '',
  unableToWorkFrom: '',
  unableToWorkTo: '',
  referringProviderName: '',
  referringProviderNpi: '',
  referringProviderQual: '',
  referringProviderOtherIdQual: '',
  referringProviderOtherId: '',
  hospitalizationFrom: '',
  hospitalizationTo: '',
  additionalClaimInfo: '',
  dischargeStatus: '',
  outsideLab: 'No',
  outsideLabCharges: '',
  icdIndicator: 'ICD-10',
  diagnosisCodes: Array(12).fill(''),
  resubmissionCode: '',
  originalRefNum: '',
  priorAuthNumber: '',
  serviceLines: [
    {
      id: crypto.randomUUID(),
      dateFrom: '',
      dateTo: '',
      placeOfService: '',
      emg: '',
      cptCode: '',
      modifier1: '',
      modifier2: '',
      modifier3: '',
      modifier4: '',
      diagnosisPointer: '',
      charges: '',
      daysUnits: '1',
      epsdt: '',
      qualId: '',
      renderingNpi: '',
      renderingOtherId: '',
    },
  ],
  federalTaxId: '',
  taxIdType: 'EIN',
  patientAccountNo: '',
  acceptAssignment: 'Yes',
  totalCharge: '',
  amountPaid: '',
  balanceDue: '',
  physicianSignature: 'Signature on File',
  signatureDate: new Date().toLocaleDateString('en-US'),
  facilityName: '',
  facilityAddress: '',
  facilityCity: '',
  facilityState: '',
  facilityZip: '',
  facilityNpi: '',
  facilityOtherId: '',
  billingProviderName: '',
  billingProviderAddress: '',
  billingProviderCity: '',
  billingProviderState: '',
  billingProviderZip: '',
  billingProviderPhone: '',
  billingNpi: '',
  billingProviderOtherId: '',
  taxonomyCode: '',
  billingProviderOtherIdQual: '',
  submitterName: '',
  submitterId: '',
  receiverId: '',
};

export const SAMPLE_CLAIM: ClaimForm = {
  payerName: 'MEDICARE',
  payerId: '12345',
  payerAddress: 'PO BOX 1234',
  payerCity: 'SPRINGFIELD',
  payerState: 'IL',
  payerZip: '62701',
  insuranceType: 'Medicare',
  insurerId: 'XW12345678',
  patientLastName: 'Doe',
  patientFirstName: 'John',
  patientMI: 'A',
  patientDob: '01/15/1958',
  patientSex: 'M',
  insuredLastName: 'Doe',
  insuredFirstName: 'John',
  insuredMI: 'A',
  patientAddress: '123 Main Street',
  patientCity: 'Springfield',
  patientState: 'IL',
  patientZip: '62701',
  patientPhone: '2175551234',
  patientRelationship: 'Self',
  insuredAddress: '123 Main Street',
  insuredCity: 'Springfield',
  insuredState: 'IL',
  insuredZip: '62701',
  insuredPhone: '2175551234',
  insuredDob: '01/15/1958',
  insuredSex: 'M',
  otherInsuredName: '',
  otherInsuredPolicy: '',
  otherInsuredReserved: '',
  otherInsuredReserved2: '',
  otherInsurancePlan: '',
  conditionEmployment: 'No',
  conditionAuto: 'No',
  conditionAutoState: '',
  conditionOther: 'No',
  claimCodes: '',
  reservedNucc: 'box 8',
  insuredPolicyGroup: 'GRP001',
  insuredDobBox11: '01/15/1958',
  insuredSexBox11: 'M',
  otherClaimIdQual: 'Y4',
  otherClaimId: 'other claim',
  insuredPolicyName: 'Blue Cross Blue Shield',
  anotherPlan: 'No',
  patientSignature: 'Signature on File',
  patientSignatureDate: new Date().toLocaleDateString('en-US'),
  insuredSignature: 'Signature on File',
  dateCurrentIllnessFrom: '06/01/2025',
  dateCurrentIllnessQual: '431',
  dateCurrentIllnessTo: '',
  otherDate: '',
  otherDateQual: '',
  unableToWorkFrom: '',
  unableToWorkTo: '',
  referringProviderName: 'Smith, Jane MD',
  referringProviderNpi: '1234567890',
  referringProviderQual: 'DN',
  referringProviderOtherIdQual: '1G',
  referringProviderOtherId: '',
  hospitalizationFrom: '',
  hospitalizationTo: '',
  additionalClaimInfo: '',
  dischargeStatus: '',
  outsideLab: 'No',
  outsideLabCharges: '',
  icdIndicator: 'ICD-10',
  diagnosisCodes: ['E11.9', 'I10', 'Z79.4', '', '', '', '', '', '', '', '', ''],
  resubmissionCode: '',
  originalRefNum: '',
  priorAuthNumber: 'PA-2025-00123',
  serviceLines: [
    {
      id: crypto.randomUUID(),
      dateFrom: '07/15/2025',
      dateTo: '07/15/2025',
      placeOfService: '11',
      emg: '',
      cptCode: '99213',
      modifier1: '',
      modifier2: '',
      modifier3: '',
      modifier4: '',
      diagnosisPointer: 'A',
      charges: '150.00',
      daysUnits: '1',
      epsdt: '',
      qualId: '',
      renderingNpi: '9876543210',
      renderingOtherId: '',
    },
    {
      id: crypto.randomUUID(),
      dateFrom: '07/15/2025',
      dateTo: '07/15/2025',
      placeOfService: '11',
      emg: '',
      cptCode: '36416',
      modifier1: '',
      modifier2: '',
      modifier3: '',
      modifier4: '',
      diagnosisPointer: 'B',
      charges: '25.00',
      daysUnits: '1',
      epsdt: '',
      qualId: '',
      renderingNpi: '9876543210',
      renderingOtherId: '',
    },
  ],
  federalTaxId: '12-3456789',
  taxIdType: 'EIN',
  patientAccountNo: 'ACC-2025-001',
  acceptAssignment: 'Yes',
  totalCharge: '175.00',
  amountPaid: '0.00',
  balanceDue: '175.00',
  physicianSignature: 'Signature on File',
  signatureDate: new Date().toLocaleDateString('en-US'),
  facilityName: 'Springfield Medical Center',
  facilityAddress: '456 Hospital Blvd',
  facilityCity: 'Springfield',
  facilityState: 'IL',
  facilityZip: '62702',
  facilityNpi: '',
  facilityOtherId: '',
  billingProviderName: 'Johnson, Robert MD',
  billingProviderAddress: '789 Clinic Ave Suite 200',
  billingProviderCity: 'Springfield',
  billingProviderState: 'IL',
  billingProviderZip: '62703',
  billingProviderPhone: '2175559876',
  billingNpi: '9876543210',
  billingProviderOtherIdQual: 'ZZ',
  billingProviderOtherId: '',
  taxonomyCode: '207Q00000X',
  
  submitterName: 'DEFAULT SUBMITTER',
  submitterId: 'SUBMITTER123',
  receiverId: 'RECEIVER456',
};

export interface DynamicRule {
  field: keyof ClaimForm;
  type: "regex" | "required";
  regex?: string;
  severity: "critical" | "error" | "warn" | "info";
  message: string;
}

export interface PayerRuleConfig {
  payer_id: string;
  payer_name: string;
  rules_config: DynamicRule[];
}

