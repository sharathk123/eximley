const xlsx = require('xlsx');
const fs = require('fs');

try {
    // Read valid data from the user provided CSV
    const validCsvPath = 'test-data/hsn-codewiselist-with-gst-rates.csv';
    const validWb = xlsx.readFile(validCsvPath);
    const validSheetName = validWb.SheetNames[0];
    const validSheet = validWb.Sheets[validSheetName];
    // Convert to JSON to inspect/modify if needed, or just use the sheet directly
    // validData = xlsx.utils.sheet_to_json(validSheet); 

    // We will use the sheet directly for the workbook

    const invalidData = [
        {
            "hsn_code": "", // Missing Code
            "description": "Missing HSN Code",
            "gst_rate": 18,
            "duty_rate": 5,
            "expected_error": "hsn_code is required"
        },
        {
            "hsn_code": "INVALID-RATE",
            "description": "Invalid GST Rate Format",
            "gst_rate": "18%", // Should be number
            "duty_rate": 5,
            "expected_error": "Invalid GST Rate"
        },
        {
            "hsn_code": "NEG-DUTY",
            "description": "Negative Duty Rate",
            "gst_rate": 18,
            "duty_rate": -5,
            "expected_error": "Duty Rate cannot be negative"
        },
        {
            "hsn_code": "33019031", // Duplicate of valid
            "description": "Duplicate HSN",
            "gst_rate": 12,
            "duty_rate": 5,
            "expected_error": "Duplicate HSN Code"
        }
    ];

    // Create a new workbook
    const wb = xlsx.utils.book_new();

    // Create sheets
    const wsInvalid = xlsx.utils.json_to_sheet(invalidData);

    // Append sheets
    xlsx.utils.book_append_sheet(wb, validSheet, "Valid HSNs");
    xlsx.utils.book_append_sheet(wb, wsInvalid, "Invalid HSNs");

    // Write to file
    xlsx.writeFile(wb, 'test-data/hsn_test_data.xlsx');
    console.log('XLSX file created successfully at test-data/hsn_test_data.xlsx');

} catch (error) {
    console.error('Error generating HSN XLSX:', error);
    process.exit(1);
}
