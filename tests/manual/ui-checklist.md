# Manual UI Testing Checklist

## Pre-Test Setup
- [ ] Dev server running (`npm run dev`)
- [ ] Logged in as test user
- [ ] Test data populated (at least 1 record per module)

---

## 1. Purchase Orders Module

### List Page
- [ ] Page loads without errors
- [ ] Can switch between list and card views
- [ ] Search functionality works
- [ ] Tab filters work (all, pending, approved, etc.)
- [ ] Pagination works (if > 12 items)
- [ ] PO numbers are clickable

### Detail Page
- [ ] Click PO number → opens detail page
- [ ] URL is bookmarkable
- [ ] **Details Tab:**
  - [ ] All PO information displays correctly
  - [ ] Vendor details shown
  - [ ] Linked export order shown (if exists)
  - [ ] Financial summary calculated correctly
- [ ] **Items Tab:**
  - [ ] All line items display
  - [ ] Quantities and prices correct
  - [ ] Subtotals calculated
- [ ] **Documents Tab:**
  - [ ] Can upload file
  - [ ] Can download file
  - [ ] Can delete file
  - [ ] DMS browser works
- [ ] **Preview Tab:**
  - [ ] Print-ready preview displays
  - [ ] All data present

### Create/Edit
- [ ] Click "Add Purchase Order" → opens create page
- [ ] Form validates required fields
- [ ] Can add multiple items
- [ ] Can remove items (min 1)
- [ ] Total calculates correctly
- [ ] Submit creates PO successfully
- [ ] Redirects to detail page
- [ ] Edit button → opens edit page
- [ ] Can modify and save changes

### Workflows
- [ ] Approve action works
- [ ] Reject action shows reason dialog
- [ ] Revise action works
- [ ] Delete shows confirmation
- [ ] PDF download works
- [ ] Export to DMS works

---

## 2. Shipping Bills Module

### List Page
- [ ] Page loads without errors
- [ ] View toggle works
- [ ] Search filters correctly
- [ ] Status tabs work
- [ ] SB numbers are clickable

### Detail Page
- [ ] Click SB number → opens detail page
- [ ] **Details Tab:**
  - [ ] Customs information shown
  - [ ] Vessel details displayed
  - [ ] Consignee info correct
  - [ ] FOB/Freight/Insurance values shown
- [ ] **Items Tab:**
  - [ ] HSN-based items display
  - [ ] Quantities correct
- [ ] **Documents Tab:**
  - [ ] File operations work
- [ ] **Preview Tab:**
  - [ ] Customs-ready format shown

### Create/Edit
- [ ] Create page loads
- [ ] HSN fields work
- [ ] Can link to export order
- [ ] Calculations correct
- [ ] Submit works
- [ ] Edit works

### Workflows
- [ ] File with Customs works
- [ ] Reject works
- [ ] Delete works
- [ ] PDF generation works

---

## 3. Export Orders Module

### List Page
- [ ] Page loads
- [ ] View modes work
- [ ] Search works
- [ ] Order numbers clickable

### Detail Page
- [ ] Detail page opens
- [ ] All tabs present
- [ ] Data displays correctly

### Create/Edit
- [ ] Create page loads
- [ ] **PI Import** auto-fills correctly
- [ ] Manual entry works
- [ ] Item management works
- [ ] Total calculates
- [ ] Submit creates order
- [ ] Edit page works

### Additional Features
- [ ] Payment dialog works
- [ ] Status updates work
- [ ] Linked documents accessible

---

## 4. Proforma Invoices Module

### Navigation
- [ ] List page accessible
- [ ] Click invoice → detail page
- [ ] All tabs work

### Workflows
- [ ] Approve workflow works
- [ ] Reject workflow works
- [ ] Revise workflow works
- [ ] PDF generation works
- [ ] DMS export works

---

## 5. Quotes Module

### Basic Operations
- [ ] List page loads
- [ ] Click quote → detail page
- [ ] Create quote works
- [ ] Edit quote works
- [ ] All tabs functional

---

## 6. Enquiries Module

### Basic Operations
- [ ] List page loads
- [ ] Click enquiry → detail page
- [ ] Create enquiry works
- [ ] Edit enquiry works
- [ ] All tabs functional

---

## 7. Cross-Module Integration

### Traceability
- [ ] Enquiry → Quote link works
- [ ] Quote → PI link works
- [ ] PI → Export Order link works
- [ ] Export Order → PO link works
- [ ] Export Order → SB link works
- [ ] All links bidirectional

### Data Consistency
- [ ] Creating quote from enquiry copies data
- [ ] Creating PI from quote copies data
- [ ] Creating order from PI copies data
- [ ] Item prices consistent across flow

---

## 8. Responsive Design

### Desktop (> 1024px)
- [ ] All modules display correctly
- [ ] Tables readable
- [ ] Forms well-laid-out
- [ ] Tabs accessible

### Tablet (768-1024px)
- [ ] Layout adapts appropriately
- [ ] Navigation still usable
- [ ] Forms still functional

### Mobile (< 768px)
- [ ] Card view preferred
- [ ] Forms stack correctly
- [ ] Tabs scroll/collapse
- [ ] Touch targets adequate

---

## 9. Error Handling

### Network Errors
- [ ] Lost connection shows error toast
- [ ] Retry mechanisms work
- [ ] No data loss on failure

### Validation Errors
- [ ] Required fields highlighted
- [ ] Error messages clear
- [ ] Can correct and resubmit

### Permission Errors
- [ ] Unauthorized access blocked
- [ ] Proper error messages shown
- [ ] Redirects to login if needed

---

## 10. Performance

### Page Load Times
- [ ] List pages load < 1s
- [ ] Detail pages load < 1s
- [ ] Create/edit pages load < 1s
- [ ] PDF generation < 5s

### Interactions
- [ ] Tab switches instant
- [ ] Form submissions < 2s
- [ ] Search results instant
- [ ] No UI blocking

---

## 11. Data Integrity

### Create Operations
- [ ] Auto-generated numbers unique
- [ ] Timestamps set correctly
- [ ] User/org associations correct
- [ ] Defaults applied properly

### Update Operations
- [ ] Changes saved correctly
- [ ] Audit trail maintained
- [ ] Related records updated

### Delete Operations
- [ ] Confirmation required
- [ ] Related items handled (cascade/block)
- [ ] No orphaned data

---

## 12. Security

### Authentication
- [ ] Must be logged in to access
- [ ] Session timeout works
- [ ] Logout clears session

### Authorization
- [ ] Users see only their org data
- [ ] Cannot modify other org data
- [ ] Admin features restricted

---

## Browser Compatibility

### Chrome/Edge
- [ ] All features work
- [ ] UI renders correctly

### Firefox
- [ ] All features work
- [ ] UI renders correctly

### Safari
- [ ] All features work
- [ ] UI renders correctly

---

## Sign-off

**Tester:** ___________________  
**Date:** ___________________  
**Build/Commit:** ___________________

**Overall Status:**
- [ ] All critical tests passed
- [ ] Known issues documented
- [ ] Ready for deployment

**Notes:**
_______________________________________________
_______________________________________________
_______________________________________________
