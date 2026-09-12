const XLSX = require('xlsx');
const fs = require('fs');

const inputFile = 'C:/Users/tayeb/Downloads/hcpcs_extracted/HCPC2026_OCT_ANWEB_v2.xlsx';
const outputFile = 'C:/Users/tayeb/Downloads/hcpcs_ready_for_supabase.csv';

console.log('Reading Excel file...');
const workbook = XLSX.readFile(inputFile);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

console.log('Converting to JSON...');
const data = XLSX.utils.sheet_to_json(worksheet);

// Extract only the needed columns and rename them
const transformedData = data.map(row => {
  return {
    code: row['HCPC'] ? String(row['HCPC']).trim() : '',
    short_description: row['SHORT DESCRIPTION'] ? String(row['SHORT DESCRIPTION']).trim() : '',
    long_description: row['LONG DESCRIPTION'] ? String(row['LONG DESCRIPTION']).trim() : ''
  };
}).filter(row => row.code !== ''); // filter out empty rows

console.log('Writing to CSV...', transformedData.length, 'rows');

// Build CSV
let csv = 'code,short_description,long_description\n';
for (const row of transformedData) {
  const escShort = row.short_description.replace(/"/g, '""');
  const escLong = row.long_description.replace(/"/g, '""');
  csv += `"${row.code}","${escShort}","${escLong}"\n`;
}

fs.writeFileSync(outputFile, csv);
console.log('Done! Saved to:', outputFile);
