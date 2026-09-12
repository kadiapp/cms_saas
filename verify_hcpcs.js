require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function verifyAllImported() {
  const text = fs.readFileSync('C:/Users/tayeb/Downloads/hcpcs_ready_for_supabase.csv', 'utf8');
  const lines = text.split('\n');
  const csvCodes = new Set();
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const code = lines[i].split(',')[0].replace(/"/g, '');
    if (code) csvCodes.add(code);
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
  
  const missingCodes = [...csvCodes].filter(c => !dbCodes.has(c));
  console.log(`Total unique codes in CSV: ${csvCodes.size}`);
  console.log(`Total alphanumeric codes in DB: ${dbCodes.size}`);
  console.log(`Missing codes count: ${missingCodes.length}`);
  
  if (missingCodes.length > 0) {
    console.log('Sample of still missing codes:', missingCodes.slice(0, 5));
  } else {
    console.log('SUCCESS! Every single code from the CMS file is in the database.');
  }
}
verifyAllImported();
