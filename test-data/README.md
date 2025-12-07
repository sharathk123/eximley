# Test Data Files for Bulk Upload

This directory contains sample test files for testing the bulk upload functionality in the Eximley application.

## Files

### Products Bulk Upload
- **products-bulk-upload-sample.csv** - CSV format
- **products-bulk-upload-sample.xlsx** - Excel format

**Contains:** 20 sample products across 3 categories
- **Apparel** (7 items): T-shirts, wallets, shoes, jeans, jackets, caps, belts
- **Electronics** (7 items): Mouse, cables, speakers, laptop stand, power bank, keyboard
- **Food** (6 items): Rice, tea, nuts, olive oil, honey, coffee beans

**Columns:**
- Name (required)
- Category (required): apparel, electronics, food, raw_material, general
- Description (optional)
- HSN Code (optional)

### Entities Bulk Upload
- **entities-bulk-upload-sample.csv** - CSV format
- **entities-bulk-upload-sample.xlsx** - Excel format

**Contains:** 20 international business contacts from 20 different countries
- **Buyers** (7): USA, Germany, France, Italy, Australia, Canada, Brazil
- **Suppliers** (9): China, India, Japan, South Korea, Thailand, Mexico, Sweden
- **Partners** (4): UAE, Singapore, Netherlands, Switzerland

**Columns:**
- Name (required)
- Type (required): buyer, supplier, partner, other
- Email (optional)
- Phone (optional)
- Country (optional)
- Address (optional)
- Tax ID (optional)

## How to Use

### Testing Products Bulk Upload
1. Navigate to the **Products** page in the application
2. Click the **"Bulk Upload"** button
3. Drag & drop or browse to select either:
   - `products-bulk-upload-sample.csv` OR
   - `products-bulk-upload-sample.xlsx`
4. Review the preview table showing the first 10 records
5. Click **"Confirm Upload"** to import all 20 products

### Testing Entities Bulk Upload
1. Navigate to the **Entities** (Contacts Directory) page
2. Click the **"Bulk Upload"** button
3. Drag & drop or browse to select either:
   - `entities-bulk-upload-sample.csv` OR
   - `entities-bulk-upload-sample.xlsx`
4. Review the preview table showing the first 10 records
5. Click **"Confirm Upload"** to import all 20 entities

## File Type Validation

The application includes intelligent file type detection:
- ❌ Uploading a **Products** file on the **Entities** page will show an error
- ❌ Uploading an **Entities** file on the **Products** page will show an error
- ✅ Only the correct file type for each page will be accepted

### Testing File Type Validation

To test that the validation is working correctly, use these **INVALID** format files:

#### Products Page Validation Test
- **File:** `products-INVALID-format.csv` or `products-INVALID-format.xlsx`
- **Format:** Contains entity data (Type, Email, Phone, Tax ID columns)
- **Expected Result:** ❌ Error message: "This appears to be an Entities file, not a Products file"

#### Entities Page Validation Test
- **File:** `entities-INVALID-format.csv` or `entities-INVALID-format.xlsx`
- **Format:** Contains product data (Category, Description, HSN Code columns)
- **Expected Result:** ❌ Error message: "This appears to be a Products file, not an Entities file"

These files are intentionally formatted incorrectly to verify that the smart validation is working properly.

## Regenerating Test Files

To regenerate the Excel files with updated data:

```bash
node scripts/generate-test-files.js
```

This will create fresh `.xlsx` files in the `test-data/` directory.

## Notes

- All phone numbers and email addresses are fictional
- Tax IDs are sample formats and not real
- HSN codes are real and correspond to the product categories
- Data is designed to be diverse for comprehensive testing
