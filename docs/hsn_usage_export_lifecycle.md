# HSN Codes in Export Lifecycle

## What is HSN?

**HSN (Harmonized System of Nomenclature)** is an internationally standardized system of names and numbers to classify traded products. In India, it's mandatory for:
- GST compliance
- Customs declarations
- Duty calculations
- Export incentives

## Where HSN is Used in Export Lifecycle

### 1. **Product Master Data** ✅ IMPLEMENTED
**Location**: Products & SKUs
- Each product/SKU must have an HSN code
- Links product to tax rates and duty calculations

**Current Implementation**:
```typescript
// Products have HSN codes
products.hsn_code → company_hsn.hsn_code

// SKUs inherit or have their own HSN
skus.hsn_code (text field)
```

**Usage**:
- Product categorization
- Tax rate determination
- Compliance validation

---

### 2. **Quotations & Pricing** ✅ IMPLEMENTED
**Location**: Quotes
- HSN code appears on quotations
- Determines GST rate for domestic quotes
- Shows duty rates for export quotes

**Current Implementation**:
- Quotes display HSN via product/SKU relationship
- GST rate pulled from `company_hsn.gst_rate`

**Usage**:
- Accurate pricing with taxes
- Customer transparency
- Compliance documentation

---

### 3. **Proforma Invoice (PI)** ✅ IMPLEMENTED
**Location**: Sales Orders (converted from Quotes)
- HSN code mandatory on PI
- Required for LC (Letter of Credit) opening
- Buyer's bank needs HSN for verification

**Current Implementation**:
- Sales orders inherit HSN from quote items
- Displayed on invoice documents

**Usage**:
- Banking documentation
- Customs pre-clearance
- Buyer's import compliance

---

### 4. **Commercial Invoice** ✅ PARTIALLY IMPLEMENTED
**Location**: Invoices (Proforma)
- **Critical**: HSN code is MANDATORY on commercial invoice
- Used by customs in both exporting and importing countries

**Current Status**:
- Basic invoice generation exists
- ✅ HSN data available via product linkage
- ⚠️ Need to verify HSN is printed on invoice template

**Required For**:
- Customs clearance (export)
- Duty calculation (import - buyer's country)
- Trade statistics

---

### 5. **Packing List** ⚠️ BASIC IMPLEMENTATION
**Location**: Shipments
- HSN code should appear on packing list
- Links physical goods to tariff classification

**Current Status**:
- Shipment module exists
- ⚠️ HSN not explicitly shown on packing list

**Enhancement Needed**:
- Add HSN column to packing list template
- Group items by HSN for customs efficiency

---

### 6. **Shipping Bill (Export Declaration)** ❌ CRITICAL GAP
**Location**: Customs Filing
- **MOST CRITICAL**: HSN is mandatory on Shipping Bill
- Determines export duty (if any)
- Required for duty drawback calculation
- Needed for RoDTEP/MEIS incentive claims

**Current Status**: ❌ **NOT IMPLEMENTED**

**What's Needed**:
```typescript
// Shipping Bill structure
{
  sb_number: string,
  sb_date: date,
  items: [{
    hsn_code: string,      // MANDATORY
    description: string,
    quantity: number,
    fob_value: number,
    duty_rate: number,     // From HSN master
    assessable_value: number
  }]
}
```

**Critical For**:
- Customs clearance
- Export duty calculation
- Incentive claims (RoDTEP, Duty Drawback)
- Trade statistics

---

### 7. **GST Returns (GSTR-1)** ❌ GAP
**Location**: GST Compliance
- Zero-rated exports must be reported with HSN
- HSN-wise summary required in GSTR-1

**Current Status**: ❌ **NOT IMPLEMENTED**

**What's Needed**:
- Export invoice data aggregation by HSN
- GSTR-1 format export
- LUT (Letter of Undertaking) tracking

---

### 8. **Certificate of Origin (CoO)** ⚠️ BASIC
**Location**: Trade Documents
- HSN code appears on CoO
- Required for preferential duty rates (FTA)

**Current Status**:
- ⚠️ Document tracking exists but HSN not explicitly included

**Enhancement Needed**:
- Add HSN to CoO template
- Link to FTA rules of origin

---

### 9. **Duty Drawback / RoDTEP Claims** ❌ CRITICAL GAP
**Location**: Post-Shipment Incentives
- **HSN code determines incentive rate**
- Different HSN codes have different drawback rates
- RoDTEP rates are HSN-specific

**Current Status**: ❌ **NOT IMPLEMENTED**

**What's Needed**:
```typescript
// Incentive calculation
{
  hsn_code: string,
  fob_value: number,
  rodtep_rate: number,    // % based on HSN
  drawback_rate: number,  // % based on HSN
  claimable_amount: number
}
```

**Critical For**:
- Profit margin calculation
- Cash flow management
- Compliance with DGFT

---

### 10. **E-BRC (Bank Realization Certificate)** ⚠️ INDIRECT
**Location**: Payment Realization
- HSN code links invoice to payment
- Required for RBI compliance

**Current Status**: ❌ **NOT IMPLEMENTED**

**What's Needed**:
- Track payment realization against invoices
- Link to HSN for reporting

---

## Current Implementation Summary

### ✅ **Implemented**
1. **HSN Master Data** (`company_hsn` table)
   - HSN code, description, GST rate, duty rate
   - CRUD operations
   - Bulk upload

2. **Product-HSN Linkage**
   - Products have HSN codes
   - SKUs have HSN codes
   - Displayed in product lists

3. **Quote/Invoice Integration**
   - HSN flows through quote → PI → invoice
   - Tax calculations use HSN rates

### ⚠️ **Partially Implemented**
1. **Packing List** - HSN data available but not displayed
2. **Certificate of Origin** - Document exists but HSN not included

### ❌ **Critical Gaps**
1. **Shipping Bill** - No module to create/track
2. **GST Returns (GSTR-1)** - No export reporting
3. **Duty Drawback/RoDTEP** - No incentive calculation
4. **E-BRC Tracking** - No payment realization module

---

## HSN Data Flow in Your System

```
┌─────────────────┐
│  company_hsn    │ ← Master HSN database
│  - hsn_code     │   (with GST & duty rates)
│  - gst_rate     │
│  - duty_rate    │
└────────┬────────┘
         │
         ├──→ Products (hsn_code)
         │    └──→ Quotes
         │         └──→ Sales Orders (PI)
         │              └──→ Invoices
         │                   └──→ [MISSING: Shipping Bill]
         │                        └──→ [MISSING: Incentive Claims]
         │
         └──→ SKUs (hsn_code)
              └──→ Shipments
                   └──→ [MISSING: Packing List with HSN]
```

---

## Recommendations

### **Priority 1: Shipping Bill Module** 🔴
- Create `shipping_bills` table
- Link to sales orders/invoices
- **Include HSN-wise item breakdown**
- Track SB number, date, port, customs officer

### **Priority 2: Incentive Calculator** 🔴
- Create `incentive_claims` table
- **HSN-wise RoDTEP/Drawback rate master**
- Auto-calculate claimable amounts from shipping bills
- Track claim status

### **Priority 3: GST Compliance** 🟡
- Export GSTR-1 format with HSN summary
- LUT tracking
- Zero-rated export reporting

### **Priority 4: Enhanced Documents** 🟡
- Add HSN to packing list template
- Include HSN on Certificate of Origin
- HSN-wise summary on commercial invoice

---

## Database Schema Recommendations

```sql
-- Shipping Bill (Critical)
CREATE TABLE shipping_bills (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  sales_order_id UUID REFERENCES sales_orders(id),
  sb_number TEXT NOT NULL,
  sb_date DATE NOT NULL,
  port_code TEXT,
  total_fob_value DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shipping_bill_items (
  id UUID PRIMARY KEY,
  shipping_bill_id UUID REFERENCES shipping_bills(id),
  hsn_code TEXT NOT NULL,  -- CRITICAL FIELD
  description TEXT,
  quantity DECIMAL,
  unit TEXT,
  fob_value DECIMAL,
  assessable_value DECIMAL,
  duty_rate DECIMAL
);

-- Incentive Rates Master
CREATE TABLE hsn_incentive_rates (
  id UUID PRIMARY KEY,
  hsn_code TEXT NOT NULL,
  rodtep_rate DECIMAL,      -- % of FOB
  drawback_rate DECIMAL,    -- % of FOB
  effective_from DATE,
  effective_to DATE
);

-- Incentive Claims
CREATE TABLE incentive_claims (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  shipping_bill_id UUID REFERENCES shipping_bills(id),
  claim_type TEXT,  -- 'RoDTEP', 'Duty Drawback', 'ROSCTL'
  hsn_code TEXT,
  fob_value DECIMAL,
  incentive_rate DECIMAL,
  claimable_amount DECIMAL,
  claim_status TEXT,
  claimed_date DATE
);
```

---

## Next Steps

1. **Review gap analysis document** (`gap_analysis_export_lifecycle.md`)
2. **Prioritize Shipping Bill implementation** - This is the linchpin
3. **Add HSN-based incentive calculation** - Direct profit impact
4. **Enhance existing documents** - Add HSN where missing
5. **Consider ICEGATE integration** - For live HSN validation (future)

