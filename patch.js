
const fs = require('fs');
const file = 'src/api/supabase.ts';
let content = fs.readFileSync(file, 'utf8');

const newCode = \xport async function searchCodeDictionary(query: string): Promise<{ cpt: any[], icd: any[] }> {
  const cleanQuery = query.trim().toUpperCase();
  const words = cleanQuery.split(/\\\\s+/).filter(Boolean);
  
  if (words.length === 0) return { cpt: [], icd: [] };

  const exactTerm = '%'+cleanQuery+'%';
  
  let orCondition = 'code.ilike.'+exactTerm+',short_description.ilike.'+exactTerm+',long_description.ilike.'+exactTerm;
  
  if (words.length > 1) {
    const shortDescAnds = words.map(w => 'short_description.ilike.%'+w+'%').join(',');
    const longDescAnds = words.map(w => 'long_description.ilike.%'+w+'%').join(',');
    orCondition = 'code.ilike.'+exactTerm+',and('+shortDescAnds+'),and('+longDescAnds+')';
  }

  // Search CPT
  const { data: cptData, error: cptError } = await supabase
    .from('cms_cpt_codes')
    .select('code, short_description')
    .or(orCondition)
    .limit(20);

  // Search ICD-10
  const { data: icdData, error: icdError } = await supabase
    .from('cms_icd10_codes')
    .select('code, short_description')
    .or(orCondition)
    .limit(20);

  return {
    cpt: cptData || [],
    icd: icdData || []
  };
}\;

content = content.replace(/export async function searchCodeDictionary[\\s\\S]*?  \\]\\n  \\};\n\\}/, newCode);

fs.writeFileSync(file, content);

