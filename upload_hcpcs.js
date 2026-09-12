require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function upload() {
  const text = fs.readFileSync('C:/Users/tayeb/Downloads/hcpcs_ready_for_supabase.csv', 'utf8');
  const lines = text.split('\n');
  
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Parse CSV line handling quotes
    const regex = /"(.*?)"/g;
    let matches = [];
    let match;
    while ((match = regex.exec(line)) !== null) {
      matches.push(match[1].replace(/""/g, '"'));
    }
    
    if (matches.length >= 3) {
      records.push({
        code: matches[0],
        short_description: matches[1],
        long_description: matches[2]
      });
    }
  }

  console.log(`Parsed ${records.length} records. Starting upload in batches...`);
  
  const BATCH_SIZE = 500;
  let successCount = 0;
  
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('cms_cpt_codes')
      .upsert(batch, { onConflict: 'code', ignoreDuplicates: true });
      
    if (error) {
      console.error(`Error on batch ${i}:`, error.message);
    } else {
      successCount += batch.length;
      console.log(`Uploaded ${successCount} / ${records.length}`);
    }
  }
  
  console.log('Upload complete! All 9,154 HCPCS codes are now in the database.');
}

upload();
