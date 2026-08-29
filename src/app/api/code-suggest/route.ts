export const maxDuration = 60;
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const supabaseMain = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
const supabaseEmbeddings = createClient(process.env.NEXT_PUBLIC_SUPABASE_EMBEDDINGS_URL || '', process.env.SUPABASE_EMBEDDINGS_SERVICE_ROLE_KEY || '');

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: AI CPC CODER — asks Gemini to act as a real coder and suggest codes
// ─────────────────────────────────────────────────────────────────────────────
const CPC_PROMPT = `You are a Certified Professional Coder (CPC) with 20 years of experience in CPT, ICD-10-CM, and CMS billing guidelines. Your coding is always precise, defensible, and audit-ready.

Read the clinical note carefully. Identify every separately billable service and diagnosis.

CODING RULES:
1. DIAGNOSES: Use the most specific ICD-10-CM code that matches exactly what is documented. Never code symptoms that are integral to a confirmed diagnosis.
2. PROCEDURES: Each separately identifiable procedure gets its own CPT code. Do not bundle. Do not code the generic/diagnostic version if a specific therapeutic version was performed (e.g., never code 45378 diagnostic colonoscopy if 45385 snare polypectomy was performed — the therapeutic code already includes the diagnostic scope).
3. DO NOT code bundled steps: incision, irrigation, hemostasis, wound closure, or anesthesia administered by the surgeon.
4. DO NOT code "surgical approach" — it is always bundled.
5. For endoscopic procedures with multiple techniques on the same session (e.g., hot snare on one polyp AND cold forceps on another), code EACH technique separately as they are each separately billable CPT codes.

Return ONLY a valid JSON object — no markdown, no explanation:
{
  "diagnoses": [
    {
      "code": "K635",
      "description": "Polyp of colon",
      "concept": "Colonic polyp",
      "quote": "Exact quote from the note that documents this diagnosis",
      "confidence": "high"
    }
  ],
  "procedures": [
    {
      "code": "45385",
      "description": "Colonoscopy with removal of tumor(s), polyp(s), or other lesion(s) by snare technique",
      "concept": "Colonoscopy with snare polypectomy",
      "quote": "Exact quote from the note that documents this procedure",
      "confidence": "high"
    }
  ]
}

Confidence levels: "high" = certain, "medium" = likely but could be one of two codes, "low" = best estimate.`;

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: Database verification — confirms the AI's code exists in our DB
// ─────────────────────────────────────────────────────────────────────────────

// AI sometimes formats codes with dots (K63.5, Z80.0) — strip them before lookup
function normalizeCode(code: string): string {
  return (code || '').replace(/\./g, '').trim().toUpperCase();
}

async function verifyCodeInDB(rawCode: string, type: 'CPT' | 'ICD') {
  const code = normalizeCode(rawCode);
  const table = type === 'CPT' ? 'cms_cpt_codes' : 'cms_icd10_codes';
  // Note: cms_cpt_codes does NOT have a billable column — ICD-10 only
  const selectFields = type === 'CPT' ? 'code, short_description' : 'code, short_description, billable';
  const { data } = await supabaseMain
    .from(table)
    .select(selectFields)
    .eq('code', code)
    .maybeSingle();
  return data || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3: Vector search fallback — used when AI code not found in DB
// ─────────────────────────────────────────────────────────────────────────────
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
  if (!response.ok) throw new Error('Failed to generate embedding');
  const data = await response.json();
  return data.embedding.values;
}

async function vectorFallback(concept: string, type: 'CPT' | 'ICD', limit = 3) {
  const vector = await getEmbedding(concept);
  const rpcName = type === 'ICD' ? 'match_icd_embeddings' : 'match_cpt_embeddings';
  const { data: matches } = await supabaseEmbeddings.rpc(rpcName, {
    query_embedding: vector,
    match_threshold: 0.3,
    match_count: limit
  });
  return (matches || []).map((m: any) => ({ ...m, source: 'vector' as const }));
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN POST HANDLER
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { note } = await req.json();
    if (!note) return NextResponse.json({ error: 'Missing note text' }, { status: 400 });

    // ── STEP 1: Let the AI code the note like a real CPC ──────────────────────
    const geminiRes = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: note }] }],
        systemInstruction: { parts: [{ text: CPC_PROMPT }] },
        generationConfig: { responseMimeType: 'application/json', temperature: 0.0 }
      })
    });
    if (!geminiRes.ok) throw new Error('Failed to call Gemini API');
    const geminiData = await geminiRes.json();
    const textOut = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    let extracted: { diagnoses: any[]; procedures: any[] };
    try { extracted = JSON.parse(textOut || '{}'); }
    catch (e) { throw new Error('Gemini returned invalid JSON'); }

    // ── STEP 2 + 3: For each code, verify in DB → fallback to vector ONLY if AI missed ─
    const processDiag = async (diag: any) => {
      // Try to verify the AI's suggested code first
      const verified = await verifyCodeInDB(diag.code, 'ICD');

      let suggestions = [];

      if (verified) {
        // ✅ AI code confirmed — show ONLY this. No vector noise.
        suggestions.push({
          code: verified.code,
          short_description: verified.short_description,
          similarity: 1.0,
          billable: verified.billable === true,
          source: 'ai'
        });
      } else {
        // ❌ AI code not in DB — run vector search as fallback
        try {
          const vectorMatches = await vectorFallback(diag.concept, 'ICD', 3);
          for (const m of vectorMatches) {
            const dbRecord = await verifyCodeInDB(m.code, 'ICD');
            suggestions.push({
              code: m.code,
              short_description: m.short_description,
              similarity: m.similarity,
              billable: dbRecord?.billable === true,
              source: 'vector'
            });
          }
        } catch(e) { /* vector fallback failed */ }
      }

      if (suggestions.length === 0) return null;

      return {
        concept: diag.concept,
        quote: diag.quote,
        ai_code: normalizeCode(diag.code),
        confidence: diag.confidence,
        suggestions: suggestions.slice(0, 3)
      };
    };

    const processProc = async (proc: any) => {
      // Try to verify the AI's suggested code first
      const verified = await verifyCodeInDB(proc.code, 'CPT');

      let suggestions = [];

      if (verified) {
        // ✅ AI code confirmed — show ONLY this. No vector noise.
        suggestions.push({
          code: verified.code,
          short_description: verified.short_description,
          similarity: 1.0,
          source: 'ai'
        });
      } else {
        // ❌ AI code not in DB — run vector search as fallback
        try {
          const vectorMatches = await vectorFallback(proc.concept, 'CPT', 3);
          for (const m of vectorMatches) {
            suggestions.push({ ...m, source: 'vector' });
          }
        } catch(e) { /* vector fallback failed */ }
      }

      if (suggestions.length === 0) return null;

      return {
        concept: proc.concept,
        quote: proc.quote,
        ai_code: normalizeCode(proc.code),
        confidence: proc.confidence,
        suggestions: suggestions.slice(0, 3)
      };
    };

    // Run everything in parallel
    const [diagRes, procRes] = await Promise.all([
      Promise.all((extracted.diagnoses || []).map(processDiag)),
      Promise.all((extracted.procedures || []).map(processProc))
    ]);

    return NextResponse.json({
      data: {
        diagnoses: diagRes.filter(Boolean),
        procedures: procRes.filter(Boolean)
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
