require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function generateMissingCsv() {
  const text = fs.readFileSync('C:/Users/tayeb/Downloads/hcpcs_ready_for_supabase.csv', 'utf8');
  const lines = text.split('\n');
  const allRows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const regex = /"(.*?)"/g;
    let matches = [];
    let match;
    while ((match = regex.exec(line)) !== null) {
      matches.push(match[1]);
    }
    
    if (matches.length >= 3) {
      allRows.push({
        code: matches[0].replace(/""/g, '"'),
        short_description: matches[1].replace(/""/g, '"'),
        long_description: matches[2].replace(/""/g, '"')
      });
    }
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
  
  const missingRows = allRows.filter(row => !dbCodes.has(row.code));
  console.log(`Found ${missingRows.length} missing codes.`);
  
  // Build new CSV
  let csv = 'code,short_description,long_description\n';
  for (const row of missingRows) {
    const escShort = row.short_description.replace(/"/g, '""');
    const escLong = row.long_description.replace(/"/g, '""');
    csv += `"${row.code}","${escShort}","${escLong}"\n`;
  }
  
  fs.writeFileSync('C:/Users/tayeb/Downloads/missing_hcpcs.csv', csv);
  console.log('Saved missing codes to C:/Users/tayeb/Downloads/missing_hcpcs.csv');
}

generateMissingCsv();
