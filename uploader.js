require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const url = process.env.NEXT_PUBLIC_SUPABASE_MEDICAL_NECESSITY_URL;
const key = process.env.SUPABASE_MEDNEC_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_MEDICAL_NECESSITY_ANON_KEY;
const supabase = createClient(url, key);

const csvPath = 'C:/Users/tayeb/Downloads/ncci/optimized_medical_necessity.csv';

async function upload() {
  console.log('Reading CSV...');
  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({ input: fileStream });
  let isHeader = true;
  let batch = [];
  let count = 0;
  for await (const line of rl) {
    if (isHeader) { isHeader = false; continue; }
    const idx = line.indexOf(',');
    if (idx === -1) continue;
    const cpt = line.substring(0, idx).trim();
    let icds = line.substring(idx + 1).trim();
    if (icds.startsWith('"')) icds = icds.substring(1, icds.length - 1);
    batch.push({ cpt_code: cpt, icd10_codes: icds });
    if (batch.length >= 50) {
      const { error } = await supabase.from('cms_medical_necessity').insert(batch);
      if (error) throw error;
      count += batch.length;
      console.log('Inserted ' + count);
      batch = [];
    }
  }
  if (batch.length > 0) {
    const { error } = await supabase.from('cms_medical_necessity').insert(batch);
    if (error) throw error;
    constole.log('Inserted ' + (count + batch.length));
  }
}
upload().catch(console.error);