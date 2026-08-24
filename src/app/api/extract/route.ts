import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are an expert medical billing AI specializing in CMS-1500 claim forms.
Your job is to extract ALL available data from the provided document (which may be a scanned PDF form, an image, or a text note) and return it as a single valid JSON object.

CRITICAL RULES:
- Return ONLY a valid JSON object. No markdown, no explanation, no code blocks.
- Look closely at checkboxes (like Type of Insurance, Sex, Employment, etc) and extract the one that is physically checked or marked with an X.
- If a field is not present or not checked, use an empty string "" for text fields.
- For diagnosisCodes, always return an array of exactly 12 strings (fill unused slots with "").
- For serviceLines, return an array of up to 6 objects.
- For sex, use "M" for male and "F" for female.
- For dates, always format as MM/DD/YYYY if possible.
- For insurance type, use one of: Medicare, Medicaid, Tricare, FECA, Group, Other.
- For acceptAssignment, use "Y" or "N".
- For taxIdType, use "EIN" or "SSN".

Return this exact JSON structure (fill all fields you can find):

{
  "payerName": "", "payerAddress": "", "payerCity": "", "payerState": "", "payerZip": "", "insuranceType": "", "insurerId": "",
  "patientLastName": "", "patientFirstName": "", "patientMI": "", "patientDob": "", "patientSex": "", "patientAddress": "", "patientCity": "", "patientState": "", "patientZip": "", "patientPhone": "", "patientRelationship": "",
  "insuredLastName": "", "insuredFirstName": "", "insuredMI": "", "insuredAddress": "", "insuredCity": "", "insuredState": "", "insuredZip": "", "insuredPhone": "",
  "conditionEmployment": "", "conditionAuto": "", "conditionAutoState": "", "conditionOther": "",
  "insuredPolicyGroup": "", "insuredDobBox11": "", "insuredSexBox11": "", "insuredPolicyName": "", "anotherPlan": "",
  "patientSignature": "", "patientSignatureDate": "", "insuredSignature": "", "physicianSignature": "", "signatureDate": "",
  "dateCurrentIllnessFrom": "", "dateCurrentIllnessQual": "", "otherDate": "", "otherDateQual": "", "unableToWorkFrom": "", "unableToWorkTo": "", "hospitalizationFrom": "", "hospitalizationTo": "",
  "referringProviderName": "", "referringProviderQual": "", "referringProviderOtherIdQual": "", "referringProviderOtherId": "", "referringProviderNpi": "",
  "additionalClaimInfo": "", "outsideLab": "", "outsideLabCharges": "", "icdIndicator": "ICD-10",
  "diagnosisCodes": ["", "", "", "", "", "", "", "", "", "", "", ""],
  "resubmissionCode": "", "originalRefNum": "", "priorAuthNumber": "",
  "serviceLines": [
    { "dateFrom": "", "dateTo": "", "placeOfService": "", "emg": "", "cptCode": "", "modifier1": "", "modifier2": "", "modifier3": "", "modifier4": "", "diagnosisPointer": "", "charges": "", "daysUnits": "", "epsdt": "", "qualId": "", "renderingNpi": "" }
  ],
  "federalTaxId": "", "taxIdType": "", "patientAccountNo": "", "acceptAssignment": "", "totalCharge": "", "amountPaid": "",
  "facilityName": "", "facilityAddress": "", "facilityCity": "", "facilityState": "", "facilityZip": "", "facilityNpi": "", "facilityOtherId": "",
  "billingProviderName": "", "billingProviderAddress": "", "billingProviderCity": "", "billingProviderState": "", "billingProviderZip": "", "billingProviderPhone": "", "billingNpi": "", "billingProviderOtherIdQual": "", "billingProviderOtherId": "", "taxonomyCode": ""
}`;

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) return NextResponse.json({ error: 'GEMINI_API_KEY is not configured.' }, { status: 500 });

  try {
    const body = await req.json();
    const { text, base64Pdf } = body;

    if (!text && !base64Pdf) {
      return NextResponse.json({ error: 'No text or PDF provided.' }, { status: 400 });
    }

    const parts: any[] = [{ text: SYSTEM_PROMPT }];
    
    if (base64Pdf) {
      parts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Pdf
        }
      });
      parts.push({ text: 'Extract all CMS-1500 claim data from the attached PDF document. Pay special attention to visually checked boxes.' });
    } else {
      parts.push({ text: `Extract all CMS-1500 claim data from this text:\n\n${text}` });
    }

    const payload = {
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
    };

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `Gemini API error: ${response.status} ${errText}` }, { status: 500 });
    }

    const result = await response.json();
    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return NextResponse.json({ error: 'No response from Gemini.' }, { status: 500 });

    let extracted: any;
    try {
      extracted = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) extracted = JSON.parse(match[0]);
      else return NextResponse.json({ error: 'AI returned invalid JSON.' }, { status: 500 });
    }

    if (Array.isArray(extracted.diagnosisCodes)) {
      extracted.diagnosisCodes = [...extracted.diagnosisCodes, ...Array(12).fill('')].slice(0, 12);
    } else {
      extracted.diagnosisCodes = Array(12).fill('');
    }

    return NextResponse.json({ data: extracted });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to process AI extraction.' }, { status: 500 });
  }
}
