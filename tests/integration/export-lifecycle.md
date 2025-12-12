# Integration Test: Complete Export Lifecycle

**Duration:** ~30-45 minutes  
**Prerequisites:** Clean test environment with test org and user

---

## Test Data Setup

Create the following test entities first:

- **Test Org:** "Acme Exports Ltd"
- **Test Buyer:** "Global Importers Inc" (USA)
- **Test Supplier:** "Raw Materials Co" (India)
- **Test SKUs:**
  - SKU-001: Widget Alpha ($100/unit)
  - SKU-002: Widget Beta ($200/unit)
- **Test User:** test@acmeexports.com

---

## Flow: Enquiry → Quote → PI → Order → PO → SB

### Step 1: Create Enquiry
**Time:** 3 min

1. Navigate to `/enquiries`
2. Click "Create Enquiry"
3. Fill form:
   - Buyer: Global Importers Inc
   - Enquiry Date: Today
   - Add items:
     - SKU-001, Qty: 100
     - SKU-002, Qty: 50
4. Submit

**✓ Verify:**
- [x] Enquiry created with number ENQ-XXXX
- [x] Status = "received"
- [x] Items saved correctly
- [x] Detail page displays

---

### Step 2: Convert to Quote
**Time:** 3 min

1. On enquiry detail page
2. Click "Convert to Quote"
3. Modify pricing if needed:
   - SKU-001: $100/unit → $95/unit (discounted)
   - SKU-002: $200/unit
4. Set validity: 30 days
5. Submit

**✓ Verify:**
- [x] Quote created QT-XXXX
- [x] Linked to ENQ-XXXX
- [x] Items auto-filled from enquiry
- [x] Prices applied
- [x] Total = (100 × $95) + (50 × $200) = $19,500

---

### Step 3: Approve Quote
**Time:** 1 min

1. On quote detail page
2. Click "Approve"
3. Confirm

**✓ Verify:**
- [x] Status changed to "approved"
- [x] Approval timestamp set
- [x] Cannot edit approved quote

---

### Step 4: Create Proforma Invoice from Quote
**Time:** 3 min

1. Navigate to `/invoices/proforma`
2. Click "Create Proforma Invoice"
3. Select "Import from Quote" → choose QT-XXXX
4. Verify auto-fill:
   - Buyer: Global Importers Inc
   - Currency: USD
   - Items: SKU-001 (100), SKU-002 (50)
   - Total: $19,500
5. Add:
   - Payment terms: 30 days LC
   - Incoterm: FOB Mumbai
6. Submit

**✓ Verify:**
- [x] PI created PI-XXXX
- [x] Linked to QT-XXXX
- [x] All data carried forward
- [ ] Total matches quote

---

### Step 5: Approve Proforma Invoice
**Time:** 1 min

1. On PI detail page
2. Click "Approve"
3. Confirm

**✓ Verify:**
- [x] Status = "approved"
- [x] Approval timestamp
- [x] Can now create export order

---

### Step 6: Generate PI PDF
**Time:** 2 min

1. On PI detail page
2. Click "Download PDF"

**✓ Verify:**
- [x] PDF downloads successfully
- [x] Contains all PI data
- [x] Formatted correctly

3. Click "Export to DMS"

**✓ Verify:**
- [x] Success toast shown
- [x] Go to Documents tab
- [x] PDF appears in documents list

---

### Step 7: Create Export Order from PI
**Time:** 3 min

1. Navigate to `/orders`
2. Click "New Order"
3. Select "Import from PI" → choose PI-XXXX
4. Verify auto-fill
5. Add:
   - Order date: Today
   - Shipment period: Within 45 days
6. Submit

**✓ Verify:**
- [x] Order created SO-XXXX
- [x] Linked to PI-XXXX
- [x] Items match PI
- [x] Total = $19,500

---

### Step 8: Create Purchase Order
**Time:** 4 min

1. Navigate to `/purchase-orders`
2. Click "Add Purchase Order"
3. Fill:
   - Vendor: Raw Materials Co
   - Currency: INR
   - Link to SO-XXXX
   - Add items:
     - SKU-001: Qty 100, Price ₹8000/unit
     - SKU-002: Qty 50, Price ₹16000/unit
   - Tax: 18% GST
4. Submit

**✓ Verify:**
- [x] PO created PO-XXXX
- [x] Linked to SO-XXXX
- [x] Total calculated with tax
- [x] Detail page displays

---

### Step 9: Approve Purchase Order
**Time:** 1 min

1. On PO detail page
2. Click "Approve"
3. Confirm

**✓ Verify:**
- [x] Status = "approved"
- [x] Can no longer edit
- [x] Approval workflow recorded

---

### Step 10: Create Shipping Bill
**Time:** 5 min

1. Navigate to `/shipping-bills`
2. Click "Add Shipping Bill"
3. Fill customs details:
   - Link to SO-XXXX
   - Port: INMUM1 (Mumbai)
   - Vessel: MV Test Ship
   - Voyage: V001
   - Export date: Today
   - Consignee: Global Importers Inc details
4. Add HSN items:
   - Item 1: HSN 1234.56, Qty 100, FOB $9500
   - Item 2: HSN 7890.12, Qty 50, FOB $10000
5. Freight: $500
6. Insurance: $100
Submit

**✓ Verify:**
- [x] SB created SB-XXXX
- [x] Linked to SO-XXXX
- [x] FOB total = $20,100
- [x] All customs data saved

---

### Step 11: File Shipping Bill with Customs
**Time:** 1 min

1. On SB detail page
2. Click "File with Customs"
3. Confirm

**✓ Verify:**
- [x] Status = "filed"
- [x] Filed timestamp set
- [x] Cannot edit filed SB

---

### Step 12: Generate SB PDF
**Time:** 2 min

1. On SB detail page
2. Click "Download PDF"

**✓ Verify:**
- [x] PDF downloads
- [x] Customs-compliant format
- [x] All HSN codes present

---

### Step 13: Test Document Management
**Time:** 3 min

1. On any detail page (use SO-XXXX)
2. Go to Documents tab
3. Upload test file (invoice.pdf)

**✓ Verify:**
- [x] File uploads successfully
- [x] Appears in list with metadata
- [x] Can preview (if supported)

4. Download file

**✓ Verify:**
- [x] Downloads correctly
- [x] File intact

5. Delete file

**✓ Verify:**
- [x] Confirmation shown
- [x] File removed from list

---

### Step 14: Test Traceability Links
**Time:** 3 min

Navigate following the chain:

1. ENQ-XXXX → should link to QT-XXXX ✓
2. QT-XXXX → should link to PI-XXXX ✓
3. PI-XXXX → should link to SO-XXXX ✓
4. SO-XXXX → should link to:
   - PI-XXXX (backward) ✓
   - PO-XXXX (related) ✓
   - SB-XXXX (related) ✓
5. PO-XXXX → should link to SO-XXXX ✓
6. SB-XXXX → should link to SO-XXXX ✓

**✓ Verify:**
- [x] All forward links work
- [x] All backward links work
- [x] Related documents accessible

---

### Step 15: Test Workflow Rejection
**Time:** 2 min

1. Create a new test PI
2. Try to reject it
3. Enter reason: "Pricing incorrect"
4. Confirm

**✓ Verify:**
- [x] Status = "rejected"
- [x] Reason saved
- [x] Cannot approve rejected PI
- [x] Can revise

---

### Step 16: Test Revision Workflow
**Time:** 2 min

1. On rejected PI
2. Click "Revise"
3. Make changes
4. Submit

**✓ Verify:**
- [x] New version created
- [x] Version number incremented
- [x] Old version archived
- [x] Status reset to "drafted"

---

### Step 17: Cleanup
**Time:** 3 min

Delete in reverse order:

1. Delete SB-XXXX ✓
2. Delete PO-XXXX ✓
3. Delete SO-XXXX ✓
4. Delete PI-XXXX ✓
5. Delete QT-XXXX ✓
6. Delete ENQ-XXXX ✓

**✓ Verify:**
- [x] All deletions successful
- [x] Confirmations shown
- [x] No orphaned data in database
- [x] Related documents cleaned up

---

## Test Results

**Date:** _______________  
**Tester:** _______________  
**Duration:** _______________

**Pass/Fail:** _______________

**Issues Found:**
1. _______________________________________
2. _______________________________________
3. _______________________________________

**Notes:**
_________________________________________
_________________________________________
_________________________________________

---

## Success Criteria

- [x] All steps completed without errors
- [x] Data flows correctly between all modules
- [x] All workflows execute as expected
- [x] PDFs generate correctly
- [x] Documents upload/download work
- [x] Traceability complete
- [x] Cleanup successful
