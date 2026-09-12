require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function testUpdate() {
  const { data, error } = await supabase
    .from('knowledge_base')
    .update({ meta_title: 'Venofer J Code (J1756) & Injectafer: 2026 Billing Guidelines' })
    .eq('slug', 'cpt-code-venofer-j1756-j2916')
    .select();
    
  if (error) console.error("Error:", error.message);
  else console.log("Success:", data);
}
testUpdate();
