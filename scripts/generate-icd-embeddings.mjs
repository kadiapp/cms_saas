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
  
  if (!response.ok) throw new Error("API Limit");
  const data = await response.json();
  return data.embeddings.map(e => e.values);
}

async function processTable(tableName, targetTable) {
  console.log(`Starting migration for ${tableName} -> ${targetTable}`);
  
  let processed = 0;
  const LIMIT = 1000;
  
  while (processed < LIMIT) {
    const { data: records, error } = await supabaseMain
      .from(tableName)
      .select('code, short_description')
      .range(processed, processed + BATCH_SIZE - 1);
      
    if (!records || records.length === 0) break;

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
        
        await supabaseEmbeddings.from(targetTable).insert(inserts);
        
      } catch (err) {
        console.error(`Rate limited. Sleeping...`);
        await new Promise(resolve => setTimeout(resolve, 60000));
        continue;
      }
    }
    
    processed += records.length;
    console.log(`Processed ${processed}/${LIMIT}`);
  }
}

processTable('cms_icd10_codes', 'icd_embeddings').catch(console.error);
