require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function checkSchema() {
  const { data, error } = await supabase
    .from('knowledge_base')
    .select('*')
    .limit(1);
    
  if (error) console.error(error);
  else console.log(Object.keys(data[0]));
}
checkSchema();
