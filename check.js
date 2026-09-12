require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function check() {
  const { count } = await supabase.from('cms_cpt_codes').select('code', { count: 'exact', head: true }).not('code', 'ilike', '%[0-9][0-9][0-9][0-9][0-9]%');
  console.log('Non-numeric Codes count in DB:', count);
}
check();

