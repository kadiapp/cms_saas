require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function checkMissing() {
  const text = fs.readFileSync('C:/Users/tayeb/Downloads/hcpcs_ready_for_supabase.csv', 'utf8');
  const lines = text.split('\n');
  const codesInCsv = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const code = lines[i].split(',')[0].replace(/"/g, '');
    if (code) codesInCsv.push(code);
  }

  // Fetch all alphanumeric codes from DB
  let dbCodes = new Set();
  let page = 0;
  let hasMore = true;
  while (hasMore) {
    const { data } = await supabase
      .from('cms_cpt_codes')
      .select('code')
      .range(page * 1000, (page + 1) * 1000 - 1);
    
    if (data && data.length > 0) {
      data.forEach(d => dbCodes.add(d.code));
      page++;
    } else {
      hasMore = false;
    }
  }
  
  const missing = codesInCsv.filter(c => !dbCodes.has(c));
  console.log(`Total in CSV: ${codesInCsv.length}`);
  console.log(`Total in DB: ${dbCodes.size}`);
  console.log(`Missing from DB: ${missing.length}`);
  
  if (missing.length > 0) {
    console.log('First 10 missing:', missing.slice(0, 10));
  }
}
checkMissing();
