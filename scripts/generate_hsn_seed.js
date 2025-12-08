const fs = require('fs');
const XLSX = require('xlsx');

// File paths
const EXCEL_FILE = 'supabase/Untitled-31.xlsx';
const OUTPUT_FILE = 'supabase/seed_hsn.sql';

try {
    // Read Excel File
    const buf = fs.readFileSync(EXCEL_FILE);
    const workbook = XLSX.read(buf, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0]; // Assume first sheet
    const worksheet = workbook.Sheets[sheetName];

    // Use header: 1 to get array of arrays
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    let sqlContent = `-- Seed Data for itc_gst_hsn_mapping generated from ${EXCEL_FILE}\n\n`;
    sqlContent += `INSERT INTO public.itc_gst_hsn_mapping (itc_hs_code, commodity, gst_hsn_code, description, gst_rate, govt_notification_no, govt_published_date) VALUES\n`;

    // Constants requested by user
    const GOVT_NOTIF = '9/2025-CTR, 13/2025-CTR';
    const GOVT_DATE = '2025-09-17';

    const values = [];

    // Metadata is row 0, Headers are row 1
    // Start data from row 2
    for (let i = 2; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue; // Skip empty rows

        // Mapping based on index from inspection:
        // 0: ITC HS Code
        // 1: Commodity
        // 2: GST HSN Code
        // 3: Description
        // 4: GST Rate

        let itcCode = row[0] !== undefined ? row[0].toString().trim() : null;
        let commodity = row[1] !== undefined ? row[1].toString().trim().replace(/'/g, "''") : null;
        let gstHsn = row[2] !== undefined ? row[2].toString().trim() : null;
        let desc = row[3] !== undefined ? row[3].toString().trim().replace(/'/g, "''") : null;
        let rate = row[4];

        // Clean up rate
        if (typeof rate === 'string') {
            rate = parseFloat(rate.replace('%', ''));
        }
        if (isNaN(rate)) rate = 0;

        // Default GST HSN logic
        if (!gstHsn && itcCode) gstHsn = itcCode.substring(0, 4);
        if (!gstHsn) gstHsn = '0000';

        // Helper to format string or NULL
        const quote = (val) => val ? `'${val}'` : 'NULL';

        const valString = `(${quote(itcCode)}, ${quote(commodity)}, '${gstHsn}', ${quote(desc)}, ${rate}, '${GOVT_NOTIF}', '${GOVT_DATE}')`;
        values.push(valString);
    }

    sqlContent += values.join(',\n');
    sqlContent += `\nON CONFLICT DO NOTHING;\n`;

    // Write to SQL file
    fs.writeFileSync(OUTPUT_FILE, sqlContent);

    console.log(`Successfully generated ${OUTPUT_FILE} with ${values.length} rows.`);

} catch (error) {
    console.error('Error generating seed file:', error);
}
