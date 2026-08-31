const fs = require('fs');
const readline = require('readline');

async function processFiles() {
  const outPath = require('os').homedir() + '/Downloads/cms_medical_necessity_lite.csv';
  const outStream = fs.createWriteStream(outPath);
  outStream.write('cpt_code,icd10_code\n');

  const allowedCpts = new Set();
  const maxCpts = 2000; // Keep the first 2,000 unique CPT codes
  let rowsWritten = 0;

  for (let i = 1; i <= 4; i++) {
    const inPath = require('os').homedir() + '/Downloads/cms_medical_necessity_part_' + i + '.csv';
    if (!fs.existsSync(inPath)) continue;

    console.log('Processing ' + inPath);
    const inStream = fs.createReadStream(inPath);
    const rl = readline.createInterface({ input: inStream, crlfDelay: Infinity });

    let isFirst = true;
    for await (const line of rl) {
      if (isFirst) { isFirst = false; continue; }
      
      const parts = line.split(',');
      if (parts.length >= 2) {
        const cpt = parts[0];
        
        if (allowedCpts.has(cpt)) {
          outStream.write(line + '\n');
          rowsWritten++;
        } else if (allowedCpts.size < maxCpts) {
          allowedCpts.add(cpt);
          outStream.write(line + '\n');
          rowsWritten++;
        }
      }
    }
  }

  outStream.end();
  console.log('Done! Wrote ' + rowsWritten + ' rows for ' + allowedCpts.size + ' unique CPT codes to ' + outPath);
}

processFiles().catch(console.error);
