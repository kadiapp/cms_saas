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

console.log('Total rows:', data.length);
if (data.length > 0) {
  console.log('Sample keys:', Object.keys(data[0]));
}
