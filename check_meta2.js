require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function checkMeta() {
  const { data, error } = await supabase
    .from('knowledge_base')
    .select('slug, meta_title, meta_description')
    .ilike('meta_title', '%j1569%');
    
  if (error) console.error(error);
  console.log(JSON.stringify(data, null, 2));
}
checkMeta();
