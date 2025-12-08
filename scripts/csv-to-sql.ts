
import fs from 'fs';
import path from 'path';

const csvPath = path.resolve(process.cwd(), 'test-data/hsn-codewiselist-with-gst-rates.csv');
const fileContent = fs.readFileSync(csvPath, 'utf-8');

const lines = fileContent.split(/\r?\n/);
const values: string[] = [];

console.log(`-- Seeding Master HSN Codes`);
console.log(`INSERT INTO public.master_hsn_codes (hsn_code, description, gst_rate, chapter) VALUES`);

const seenCodes = new Set<string>();

for (const line of lines) {
    if (!line.trim()) continue;

    const match = line.match(/^"?(\d{4,8})"?\s*,/);
    if (!match) continue;

    const hsnCode = match[1];

    // Deduplicate
    if (seenCodes.has(hsnCode)) continue;
    seenCodes.add(hsnCode);

    // Extract rate
    const rateMatch = line.match(/(\d+(?:\.\d+)?)%/);
    const rate = rateMatch ? parseFloat(rateMatch[1]) : 0;

    // Extract description
    let description = line.substring(match[0].length).trim();
    if (rateMatch) {
        const rateIndex = description.lastIndexOf(rateMatch[0]);
        if (rateIndex > -1) {
            description = description.substring(0, rateIndex);
        }
    }

    // Clean description
    description = description.replace(/^,/, '').replace(/,$/, '').replace(/^"/, '').replace(/"$/, '').trim();
    description = description.replace(/'/g, "''"); // Escape single quotes for SQL
    description = description.replace(/""/g, '"');

    const chapter = hsnCode.substring(0, 2);

    values.push(`('${hsnCode}', '${description}', ${rate}, '${chapter}')`);
}

// Join values with commas and close
console.log(values.join(',\n') + '\nON CONFLICT (hsn_code) DO NOTHING;');
