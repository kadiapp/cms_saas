import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are an expert medical billing AI specializing in CMS-1500 claim forms.
Your job is to extract ALL available data from the provided text (which may come from a scanned or printed CMS-1500 form, a doctor's note, an encounter summary, a referral letter, or a patient intake form) and return it as a single valid JSON object.

CRITICAL RULES:
- Return ONLY a valid JSON object. No markdown, no explanation, no code blocks.
- If a field is not present in the text, use an empty string "" for text fields.
- For diagnosisCodes, always return an array of exactly 12 strings (fill unused slots with "").
- For serviceLines, return an array of up to 6 objects.
- For sex, use "M" for male and "F" for female.
- For dates, always format as MM/DD/YYYY if possible.
- For insurance type, use one of: Medicare, Medicaid, Tricare, FECA, Group, Other.
- For acceptAssignment, use "Y" or "N".
- For taxIdType, use "EIN" or "SSN".

Return this exact JSON structure (fill all fields you can find):

{
  "payerName": "",
  "payerAddress": "",
  "payerCity": "",
  "payerState": "",
  "payerZip": "",
  "insuranceType": "",
  "insurerId": "",
  "patientLastName": "",
  "patientFirstName": "",
  "patientMI": "",
  "patientDob": "",
  "patientSex": "",
  "insuredLastName": "",
  "insuredFirstName": "",
  "insuredMI": "",
  "patientAddress": "",
  "patientCity": "",
  "patientState": "",
  "patientZip": "",
  "patientPhone": "",
  "patientRelationship": "",
  "insuredAddress": "",
  "insuredCity": "",
  "insuredState": "",
  "insuredZip": "",
  "insuredPhone": "",
  "conditionEmployment": "",
  "conditionAuto": "",
  "conditionAutoState": "",
  "conditionOther": "",
  "insuredPolicyGroup": "",
  "insuredDobBox11": "",
  "insuredSexBox11": "",
  "insuredPolicyName": "",
  "anotherPlan": "",
  "patientSignature": "",
  "patientSignatureDate": "",
  "insuredSignature": "",
  "dateCurrentIllnessFrom": "",
  "dateCurrentIllnessQual": "",
  "otherDate": "",
  "otherDateQual": "",
  "unableToWorkFrom": "",
  "unableToWorkTo": "",
  "referringProviderName": "",
  "referringProviderQual": "",
  "referringProviderOtherIdQual": "",
  "referringProviderOtherId": "",
  "referringProviderNpi": "",
  "hospitalizationFrom": "",
  "hospitalizationTo": "",
  "additionalClaimInfo": "",
  "outsideLab": "",
  "outsideLabCharges": "",
  "icdIndicator": "ICD-10",
  "diagnosisCodes": ["", "", "", "", "", "", "", "", "", "", "", ""],
  "resubmissionCode": "",
  "originalRefNum": "",
  "priorAuthNumber": "",
  "serviceLines": [
    {
      "dateFrom": "",
      "dateTo": "",
      "placeOfService": "",
      "emg": "",
      "cptCode": "",
      "modifier1": "",
      "modifier2": "",
      "modifier3": "",
      "modifier4": "",
      "diagnosisPointer": "",
      "charges": "",
      "daysUnits": "",
      "epsdt": "",
      "qualId": "",
      "renderingNpi": ""
    }
  ],
  "federalTaxId": "",
  "taxIdType": "",
  "patientAccountNo": "",
  "acceptAssignment": "",
  "totalCharge": "",
  "amountPaid": "",
  "physicianSignature": "",
  "signatureDate": "",
  "facilityName": "",
  "facilityAddress": "",
  "facilityCity": "",
  "facilityState": "",
  "facilityZip": "",
  "facilityNpi": "",
  "facilityOtherId": "",
  "billingProviderName": "",
  "billingProviderAddress": "",
  "billingProviderCity": "",
  "billingProviderState": "",
  "billingProviderZip": "",
  "billingProviderPhone": "",
  "billingNpi": "",
  "billingProviderOtherIdQual": "",
  "billingProviderOtherId": "",
  "taxonomyCode": ""
}`;

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured.' }, { status: 500 });
  }

  let text: string;
  try {
    const body = await req.json();
    text = body.text;
    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return NextResponse.json({ error: 'No text provided.' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${SYSTEM_PROMPT}\n\nExtract all CMS-1500 claim data from this text:\n\n${text}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json'
    }
  };

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', errText);
      return NextResponse.json({ error: `Gemini API error: ${response.status}` }, { status: 500 });
    }

    const result = await response.json();
    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return NextResponse.json({ error: 'No response from Gemini.' }, { status: 500 });
    }

    // Parse the JSON response
    let extracted: Record<string, unknown>;
    try {
      extracted = JSON.parse(rawText);
    } catch {
      // Try to extract JSON from the text if it's wrapped in something
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        extracted = JSON.parse(match[0]);
      } else {
        return NextResponse.json({ error: 'AI returned invalid JSON.' }, { status: 500 });
      }
    }

    // Ensure diagnosisCodes is always 12 items
    if (Array.isArray(extracted.diagnosisCodes)) {
      const codes = extracted.diagnosisCodes as string[];
      extracted.diagnosisCodes = [...codes, ...Array(12).fill('')].slice(0, 12);
    } else {
      extracted.diagnosisCodes = Array(12).fill('');
    }

    return NextResponse.json({ data: extracted });
  } catch (err) {
    console.error('Extract claim error:', err);
    return NextResponse.json({ error: 'Failed to process AI extraction.' }, { status: 500 });
  }
}
