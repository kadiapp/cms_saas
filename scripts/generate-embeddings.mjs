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
    const err = await response.text();
    throw new Error(`Gemini API Error: ${err}`);
  }
  
  const data = await response.json();
  return data.embeddings.map(e => e.values);
}

async function processTable(tableName, targetTable) {
  console.log(`Starting migration for ${tableName} -> ${targetTable}`);
  
  // Get total count
  const { count } = await supabaseMain.from(tableName).select('*', { count: 'exact', head: true });
  console.log(`Total rows to process: ${count}`);
  
  let processed = 0;
  
  while (processed < count) {
    const { data: records, error } = await supabaseMain
      .from(tableName)
      .select('code, short_description')
      .range(processed, processed + BATCH_SIZE - 1);
      
    if (error) {
      console.error("Error fetching from main DB:", error);
      break;
    }
    
    if (!records || records.length === 0) break;

    // Filter out codes that are already embedded to make this restartable
    const codes = records.map(r => r.code);
    const { data: existing } = await supabaseEmbeddings
      .from(targetTable)
      .select('code')
      .in('code', codes);
      
    const existingCodes = new Set(existing?.map(e => e.code) || []);
    const recordsToProcess = records.filter(r => !existingCodes.has(r.code));
    
    if (recordsToProcess.length > 0) {
      try {
        const texts = recordsToProcess.map(r => r.short_description || r.code);
        const vectors = await getEmbeddingsBatch(texts);
        
        const inserts = recordsToProcess.map((r, i) => ({
          code: r.code,
          short_description: r.short_description || '',
          embedding: vectors[i]
        }));
        
        const { error: insertError } = await supabaseEmbeddings
          .from(targetTable)
          .insert(inserts);
          
        if (insertError) throw insertError;
      } catch (err) {
        console.error(`Error processing batch starting at ${processed}:`, err.message);
        // Sleep and retry or continue depending on error
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue; // Retry this batch
      }
    }
    
    processed += records.length;
    console.log(`Processed ${processed}/${count}`);
  }
  
  console.log(`Finished ${tableName}`);
}

async function run() {
  await processTable('cms_cpt_codes', 'cpt_embeddings');
  // await processTable('cms_icd10_codes', 'icd_embeddings'); // Do CPT first
}

run().catch(console.error);
