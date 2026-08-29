export const maxDuration = 60;
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const supabaseMain = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
const supabaseEmbeddings = createClient(process.env.NEXT_PUBLIC_SUPABASE_EMBEDDINGS_URL || '', process.env.SUPABASE_EMBEDDINGS_SERVICE_ROLE_KEY || '');

const SYSTEM_PROMPT = `You are an expert, certified medical coder. Your job is to read a clinical note and extract the core medical concepts for billing.

CRITICAL MEDICAL CODING RULES:
1. Extract the primary diagnoses/conditions and primary procedures/services.
2. DO NOT extract bundled surgical steps. Things like "making an incision", "surgical approach", "irrigating the site", "hemostasis", and "wound closure/sutures" are ALWAYS bundled into the global surgical package. Do not list them as separate procedures.
3. DO NOT extract "General Anesthesia" or local anesthesia unless the note explicitly indicates you are billing for the anesthesiologist.
4. CRITICAL FOR SEARCH: In the 'concept' string, you MUST translate the procedure into common CMS/AMA abbreviations to help the search engine. For example, instead of just "injection with ultrasound", write "injection (inj) joint/bursa with ultrasound (w/us)". Use abbreviations like w/o (without), px (procedure), dx (diagnosis), exc (excision), bilat (bilateral).

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

// NEW: Re-ranking function using Gemini Flash
async function rerankCandidates(concept: string, candidates: any[], type: 'CPT' | 'ICD-10') {
  if (candidates.length === 0) return [];
  
  const prompt = `You are an expert medical coder.
I have a medical concept: "${concept}"
And a list of potential ${type} codes retrieved from a database search. Many of the descriptions use heavy CMS abbreviations (like 'inj' for injection, 'w/us' for with ultrasound, 'px' for procedure).

Here are the candidates:
${candidates.map((c, i) => `[ID: ${i}] ${c.code} - ${c.short_description}`).join('\n')}

Identify the top 3 best matching codes for the concept. 
Return ONLY a valid JSON array of the IDs you selected, in order of best match to worst match. Example: [4, 0, 12]
No markdown, no explanation, just the JSON array.`;

  const res = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.0 }
    })
  });

  if (!res.ok) return candidates.slice(0, 3); // Fallback to raw vector scores
  const data = await res.json();
  const textOut = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  try {
    const ids = JSON.parse(textOut);
    if (!Array.isArray(ids) || ids.length === 0) {
      return candidates.slice(0, 3); // Fallback if AI returns empty array
    }
    const selected = ids.map((id: number) => candidates[id]).filter(Boolean);
    if (selected.length === 0) return candidates.slice(0, 3);
    return selected.slice(0, 3);
  } catch(e) {
    return candidates.slice(0, 3); // Fallback
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { note } = body;
    if (!note) return NextResponse.json({ error: 'Missing note text' }, { status: 400 });

    const geminiRes = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: note }] }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: { responseMimeType: "application/json", temperature: 0.0 }
      })
    });
    if (!geminiRes.ok) throw new Error("Failed to call Gemini API");
    const geminiData = await geminiRes.json();
    const textOut = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    let extracted;
    try { extracted = JSON.parse(textOut || '{}'); } 
    catch (e) { throw new Error("Gemini returned invalid JSON"); }

    // Process all concepts in parallel to avoid Vercel timeouts
    const processDiag = async (diag: any) => {
      try {
        const vector = await getEmbedding(diag.concept);
        const { data: matches } = await supabaseEmbeddings.rpc('match_icd_embeddings', { query_embedding: vector, match_threshold: 0.3, match_count: 20 });
        if (matches && matches.length > 0) {
          const bestMatches = await rerankCandidates(diag.concept, matches, 'ICD-10');
          const codes = bestMatches.map((m: any) => m.code);
          const { data: verified } = await supabaseMain.from('cms_icd10_codes').select('code, billable').in('code', codes);
          const verifiedMap = new Map((verified || []).map((v: any) => [v.code, v.billable]));
          return { concept: diag.concept, quote: diag.quote, suggestions: bestMatches.map((m: any) => ({ ...m, billable: verifiedMap.get(m.code) === true })) };
        }
      } catch (e) { console.error(e); }
      return null;
    };

    const processProc = async (proc: any) => {
      try {
        const vector = await getEmbedding(proc.concept);
        const { data: matches } = await supabaseEmbeddings.rpc('match_cpt_embeddings', { query_embedding: vector, match_threshold: 0.3, match_count: 20 });
        if (matches && matches.length > 0) {
          const bestMatches = await rerankCandidates(proc.concept, matches, 'CPT');
          return { concept: proc.concept, quote: proc.quote, suggestions: bestMatches };
        }
      } catch (e) { console.error(e); }
      return null;
    };

    const [diagRes, procRes] = await Promise.all([
      Promise.all((extracted.diagnoses || []).map(processDiag)),
      Promise.all((extracted.procedures || []).map(processProc))
    ]);

    const diagnosisResults = diagRes.filter(Boolean);
    const procedureResults = procRes.filter(Boolean);
    
    return NextResponse.json({ data: { diagnoses: diagnosisResults, procedures: procedureResults } });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
