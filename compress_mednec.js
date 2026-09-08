
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const dir = 'C:/Users/tayeb/Downloads/ncci';
const files = [
  'cms_medical_necessity_part_1.csv',
  'cms_medical_necessity_part_2.csv',
  'cms_medical_necessity_part_3.csv',
  'cms_medical_necessity_part_4.csv'
];

const cptMap = new Map();

async function processFiles() {
  console.log('Starting compression...');
  for (const file of files) {
    const filePath = path.join(dir, file);
    console.log('Processing ' + file + '...');
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let isHeader = true;
    for await (const line of rl) {
      if (isHeader) { isHeader = false; continue; }
      const parts = line.split(',');
      if (parts.length >= 2) {
        const cpt = parts[0].trim();
        const icd = parts[1].trim();
        if (!cpt || !icd) continue;
        
        if (!cptMap.has(cpt)) {
          cptMap.set(cpt, new Set());
        }
        cptMap.get(cpt).add(icd);
      }
    }
  }

  console.log('Writing optimized CSV...');
  const outPath = path.join(dir, 'optimized_medical_necessity.csv');
  const outStream = fs.createWriteStream(outPath);
  outStream.write('cpt_code,icd10_codes\\n');

  let count = 0;
  for (const [cpt, icdSet] of cptMap.entries()) {
    const icds = Array.from(icdSet).join(',');
    outStream.write(\\,\\\n\);
    count++;
  }
  
  outStream.end();
  console.log('Done! Total unique CPT codes: ' + count);
}

processFiles().catch(console.error);

