
const query = 'knee surgery';
const cleanQuery = query.trim().toUpperCase();
const words = cleanQuery.split(/\s+/).filter(Boolean);
const exactTerm = \%\%\;

let orCondition = \code.ilike.\,short_description.ilike.\,long_description.ilike.\\;

if (words.length > 1) {
  const shortDescAnds = words.map(w => \short_description.ilike.%\%\).join(',');
  const longDescAnds = words.map(w => \long_description.ilike.%\%\).join(',');
  orCondition = \code.ilike.\,and(\),and(\)\;
}

console.log(orCondition);

