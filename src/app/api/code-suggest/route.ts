import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Create Supabase clients directly in the API to avoid importing client-side code
const supabaseMain = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '', 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const supabaseEmbeddings = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_EMBEDDINGS_URL || '', 
  process.env.SUPABASE_EMBEDDINGS_SERVICE_ROLE_KEY || ''
);

const supabaseRules = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_RULES_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '', 
  process.env.NEXT_PUBLIC_SUPABASE_RULES_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const SYSTEM_PROMPT = `You are an expert, certified medical coder. Your job is to read a clinical note and extract the core medical concepts for billing.

CRITICAL MEDICAL CODING RULES:
1. Extract the primary diagnoses/conditions and primary procedures/services.
2. DO NOT extract bundled surgical steps. Things like "making an incision", "surgical approach", "irrigating the site", "hemostasis", and "wound closure/sutures" are ALWAYS bundled into the global surgical package. Do not list them as separate procedures.
3. DO NOT extract "General Anesthesia" or local anesthesia unless the note explicitly indicates you are billing for the anesthesiologist.
4. Keep the 'concept' plain English but medically precise.

For each extracted concept, provide the exact quote from the note that justifies it.

Return ONLY a valid JSON object in this exact format:
{
  "diagnoses": [
    { "concept": "Plain English description of condition", "quote": "Exact quote from text" }
  ],
  "procedures": [
    { "concept": "Plain English description of procedure", "quote": "Exact quote from text" }
  ]
}
No markdown, no code blocks, no explanation. Just the raw JSON.`;

async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/gemini-embedding-2',
      content: { parts: [{ text }] },
      outputDimensionality: 768
    })
  });
  
  if (!response.ok) throw new Error("Failed to generate embedding");
  const data = await response.json();
  return data.embedding.values;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { note } = body;

    if (!note) {
      return NextResponse.json({ error: 'Missing note text' }, { status: 400 });
    }

    // 1. Extract concepts using Gemini Flash
    const geminiRes = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: note }] }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!geminiRes.ok) throw new Error("Failed to call Gemini API");
    const geminiData = await geminiRes.json();
    const textOut = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOut) throw new Error("No text returned from Gemini");
    
    let extracted;
    try {
      extracted = JSON.parse(textOut);
    } catch (e) {
      throw new Error("Gemini returned invalid JSON");
    }

    // 2. Process Diagnoses
    const diagnosisResults = [];
    for (const diag of extracted.diagnoses || []) {
      try {
        const vector = await getEmbedding(diag.concept);
        const { data: matches } = await supabaseEmbeddings.rpc('match_icd_embeddings', {
          query_embedding: vector,
          match_threshold: 0.5,
          match_count: 3
        });
        
        if (matches && matches.length > 0) {
          // Verify billable status in main DB
          const codes = matches.map((m: any) => m.code);
          const { data: verified } = await supabaseMain.from('cms_icd10_codes').select('code, billable').in('code', codes);
          
          const verifiedMap = new Map((verified || []).map((v: any) => [v.code, v.billable]));
          
          diagnosisResults.push({
            concept: diag.concept,
            quote: diag.quote,
            suggestions: matches.map((m: any) => ({
              ...m,
              billable: verifiedMap.get(m.code) === true
            }))
          });
        }
      } catch (e) { console.error("Error processing diag:", e); }
    }

    // 3. Process Procedures
    const procedureResults = [];
    for (const proc of extracted.procedures || []) {
      try {
        const vector = await getEmbedding(proc.concept);
        const { data: matches } = await supabaseEmbeddings.rpc('match_cpt_embeddings', {
          query_embedding: vector,
          match_threshold: 0.5,
          match_count: 3
        });
        
        if (matches && matches.length > 0) {
          procedureResults.push({
            concept: proc.concept,
            quote: proc.quote,
            suggestions: matches
          });
        }
      } catch (e) { console.error("Error processing proc:", e); }
    }
    
    // We can also run an NCCI check on the top 1 suggestions across all procedures
    // But we'll leave that to the client for now to keep the API fast.

    return NextResponse.json({
      data: {
        diagnoses: diagnosisResults,
        procedures: procedureResults
      }
    });

  } catch (err: any) {
    console.error("Code Suggest Error:", err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
