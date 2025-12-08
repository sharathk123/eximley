const XLSX = require('xlsx');
const fs = require('fs');

const file = '/Users/sharathbabukurva/IdeaProjects/eximley/supabase/Untitled-31.xlsx';
const buf = fs.readFileSync(file);
const workbook = XLSX.read(buf, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

// Skip first row (empty or metadata)
// Row 1 (Index 1) is the Header row
const headers = data[1];
const rows = data.slice(2); // Data starts from Row 2 (Index 2)

console.log('Total Data Rows:', rows.length);
console.log('Headers:', headers);
console.log('First Data Row:', rows[0]);
