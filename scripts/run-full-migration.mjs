import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

const supabaseMain = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const supabaseEmbeddings = createClient(env.NEXT_PUBLIC_SUPABASE_EMBEDDINGS_URL, env.SUPABASE_EMBEDDINGS_SERVICE_ROLE_KEY);
const apiKey = env.GEMINI_API_KEY;

const BATCH_SIZE = 100;
const DELAY_MS = 4500; // 4.5 seconds between requests to stay under 15 RPM

const delay = ms => new Promise(res => setTimeout(res, ms));

async function getEmbeddingsBatch(texts) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:batchEmbedContents?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: texts.map(text => ({
        model: 'models/gemini-embedding-2',
        content: { parts: [{ text }] },
        outputDimensionality: 768
      }))
    })
  });
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errText}`);
  }
  const data = await response.json();
  return data.embeddings.map(e => e.values);
}

async function processTable(sourceTable, targetTable) {
  console.log(`\n=== Starting migration for ${sourceTable} ===`);
  
  const { count } = await supabaseMain.from(sourceTable).select('*', { count: 'exact', head: true });
  console.log(`Total rows to process: ${count}`);
  
  let processed = 0;
  
  while (processed < count) {
    const { data: records, error } = await supabaseMain
      .from(sourceTable)
      .select('code, short_description')
      .range(processed, processed + BATCH_SIZE - 1);
      
    if (error) {
      console.error("Error fetching from main DB:", error.message);
      await delay(5000);
      continue;
    }
    
    if (!records || records.length === 0) break;

    // Check which ones are already embedded
    const codes = records.map(r => r.code);
    const { data: existing } = await supabaseEmbeddings
      .from(targetTable)
      .select('code')
      .in('code', codes);
      
    const existingCodes = new Set(existing?.map(e => e.code) || []);
    const recordsToProcess = records.filter(r => !existingCodes.has(r.code));
    
    if (recordsToProcess.length > 0) {
      try {
        const texts = recordsToProcess.map(r => `${r.code} - ${r.short_description || ''}`);
        const vectors = await getEmbeddingsBatch(texts);
        
        const inserts = recordsToProcess.map((r, i) => ({
          code: r.code,
          short_description: r.short_description || '',
          embedding: vectors[i]
        }));
        
        const { error: insertError } = await supabaseEmbeddings.from(targetTable).insert(inserts);
        if (insertError) throw insertError;
        
        // Wait 4.5 seconds to respect rate limits
        await delay(DELAY_MS);
      } catch (err) {
        console.error(`Rate limit or error at batch ${processed}:`, err.message);
        await delay(30000); // Back off for 30s if we hit an error
        continue;
      }
    }
    
    processed += records.length;
    console.log(`Progress [${sourceTable}]: ${processed} / ${count} (${Math.round((processed/count)*100)}%)`);
  }
  console.log(`Finished ${sourceTable}!`);
}

async function run() {
  await processTable('cms_cpt_codes', 'cpt_embeddings');
  await processTable('cms_icd10_codes', 'icd_embeddings');
  console.log("\nALL MIGRATIONS COMPLETE!");
}

run().catch(console.error);
