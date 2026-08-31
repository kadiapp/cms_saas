const fs = require('fs');
const readline = require('readline');

async function processFiles() {
  const outPath = require('os').homedir() + '/Downloads/cms_medical_necessity_micro.csv';
  const outStream = fs.createWriteStream(outPath);
  outStream.write('cpt_code,icd10_code\n');

  const allowedCpts = new Set();
  const targetMaxRows = 1500000; // Aim for 1.5M rows max (about 20-25MB)
  let rowsWritten = 0;
  let acceptingNewCpts = true;

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
        } else if (acceptingNewCpts) {
          allowedCpts.add(cpt);
          outStream.write(line + '\n');
          rowsWritten++;
          
          if (rowsWritten >= targetMaxRows) {
            acceptingNewCpts = false;
          }
        }
      }
    }
  }

  outStream.end();
  console.log('Done! Wrote ' + rowsWritten + ' rows for ' + allowedCpts.size + ' unique CPT codes to ' + outPath);
}

processFiles().catch(console.error);
