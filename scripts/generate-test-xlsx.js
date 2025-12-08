const xlsx = require('xlsx');

try {
    // Read CSV files directly as workbooks
    const wbValid = xlsx.readFile('test-data/sku_test_data_valid.csv');
    const wbInvalid = xlsx.readFile('test-data/sku_test_data_invalid.csv');

    // Create a new workbook
    const newWb = xlsx.utils.book_new();

    // Append sheets from the CSV workbooks
    // Note: CSV workbooks usually have one sheet named "Sheet1"
    xlsx.utils.book_append_sheet(newWb, wbValid.Sheets[wbValid.SheetNames[0]], "Valid SKUs");
    xlsx.utils.book_append_sheet(newWb, wbInvalid.Sheets[wbInvalid.SheetNames[0]], "Invalid SKUs");

    // Write the new workbook to file
    xlsx.writeFile(newWb, 'test-data/sku_test_data.xlsx');
    console.log('XLSX file created successfully at test-data/sku_test_data.xlsx');
} catch (error) {
    console.error('Error generating XLSX:', error);
    process.exit(1);
}
