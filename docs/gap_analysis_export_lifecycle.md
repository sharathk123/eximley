# Gap Analysis: Indian Export Lifecycle

This document analyzes the current state of **Eximley** against the standard end-to-end export lifecycle for an Indian exporter.

## 1. Pre-Shipment Stage (Enquiry to Order)

| Stage | Current Status | Gap | Priority |
| :--- | :--- | :--- | :--- |
| **Product Costing** | ✅ Basic Cost Sheet module exists. | Advanced landed cost calculation (including duty drawback estimation) missing. | Medium |
| **Enquiry Management** | ✅ Implemented (Enquiry -> Quote). | | |
| **Quotation** | ✅ Implemented (Quotes). | | |
| **Contract / PO** | ✅ Implemented (Convert Quote -> PI -> Sales Order). | | |
| **Payment Terms** | ✅ Basic Incoterms supported. | **Letter of Credit (LC) Management**: No module to track LC fields, clauses, or expiry. | **High** |
| **Compliance Check** | ❌ Missing. | **Restricted Party Screening**: Checking buyers against denied party lists. <br> **HSN Code Validation**: Basic list exists, but no live validation or duty rate lookup integration (ICEGATE). | Medium |

## 2. Production & Procurement

| Stage | Current Status | Gap | Priority |
| :--- | :--- | :--- | :--- |
| **Purchase Orders** | ❌ Missing (Only *Sales* Orders exist). | Cannot manage procurement of raw materials or trading goods from domestic suppliers. | **High** |
| **Inventory** | ⚠ Basic SKU list only. | No stock tracking, warehouse management, or batch tracking. | Medium |
| **Packaging** | ⚠ Basic Shimpent/Packing List logic. | **Label Generation**: Creating compliant shipping marks/labels (SSCC) for cartons. | Low |

## 3. Pre-Shipment Documentation & Compliance

| Stage | Current Status | Gap | Priority |
| :--- | :--- | :--- | :--- |
| **GST / LUT** | ❌ Missing. | **LUT (Letter of Undertaking)** tracking implies zero-rated export. Without this, IGST payment tracking is needed. | **High** |
| **Inspection** | ❌ Missing. | **Pre-Shipment Inspection (PSI)** certificate tracking or booking. | Low |
| **Insurance** | ❌ Missing. | Marine Insurance policy tracking and certificate generation. | Medium |
| **Customs Invoice** | ✅ Commercial Invoice endpoint exists. | Verify it meets specific customs formats (e.g., signature ready, declaring origin). | Low |

## 4. Logistics & Customs (The "Shipment" Phase)

| Stage | Current Status | Gap | Priority |
| :--- | :--- | :--- | :--- |
| **Booking** | ❌ Missing. | Interaction with Freight Forwarders (Booking Note / Draft BL). | Medium |
| **Customs Filing** | ❌ Missing. | **Shipping Bill (SB) Checklist**: Creating a draft SB to send to CHA (Customs House Agent). integration with ICEGATE (unlikely for MVP) or just tracking SB Number & Date. | **High** |
| **Logistics** | ✅ Basic Shipment/Container data. | **Container Tracking**: Live tracking integration. | Low (API heavy) |
| **E-Way Bill** | ❌ Missing. | Movement of goods from factory to port requires E-Way Bill. | Medium |

## 5. Post-Shipment & Realization

| Stage | Current Status | Gap | Priority |
| :--- | :--- | :--- | :--- |
| **Bill of Lading** | ⚠ Basic tracking fields only. | Tracking the actual BL release (Surrender/Original). | Medium |
| **Export Proof** | ❌ Missing. | **E-BRC (Electronic Bank Realization Certificate)**: Tracking payment realization (IRM) is mandatory for RBI compliance. | **High** |
| **Incentives** | ❌ Missing. | **RoDTEP / Duty Drawback / ROSCTL**: Tracking claimable amounts based on SBs. | **High** |
| **Documents to Bank** | ❌ Missing. | Generating the "Covering Letter to Bank" for bill negotiation. | Medium |

## Summary of Critical Gaps (Next Steps)

1.  **Procurement / Purchase Orders**: Essential for traders to link Sales Orders to Supplier POs.
2.  **GST & LUT**: Fundamental for Indian exports to be zero-rated.
3.  **Shipping Bill Tracking**: The core "Export Proof" document.
4.  **Incentives (Duty Drawback)**: The profit margin often depends on this; missing impact analysis.
5.  **Bank Realization (e-BRC)**: Critical for closing the loop with RBI/DGFT.
