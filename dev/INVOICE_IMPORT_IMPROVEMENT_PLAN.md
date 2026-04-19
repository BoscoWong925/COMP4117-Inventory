# Invoice Import Workflow — Improvement Plan

**Date**: 2026-04-19  
**Scope**: Azure-based Import from Invoice (ManageItemsPage.vue)  
**Status**: Plan only — do NOT implement yet

---

## 1. Current Workflow Issues

### 1a. Step structure is too flat

The current wizard has 4 steps: **Upload → Review (everything) → Creating → Summary**. Step 2 does far too much — it shows warnings, confidence, invoice header, line items table, shared defaults, and the "Create N Items" button all in one vertical scroll. An operator has no sense of "where am I in the process" or "what do I still need to do before creating."

### 1b. "Create N Items" count is misleading

The button says `Create {{ selectedRows.length }} Items`, but `quantity > 1` rows expand to multiple items. An operator who sees 14 selected rows may think 14 items will be created, when the actual count could be higher. There is no quantity-expansion summary.

### 1c. Per-row field editing is minimal

Each row only exposes: name, qty, unit price, product code, description. But each row will become an inventory item that needs: **type, category, location, owner, department, funding source, warranty**. These are only available via "shared defaults" — there is no way to override them per-row. If the operator imports a mixed invoice (e.g., laptop + monitor + cable), all items get the same type and category.

### 1d. Shared defaults vs invoice header are confusing

Both `importState.invoiceMeta` and `importState.sharedDefaults` have overlapping fields: supplier, invoiceNumber, purchaseDate, orderID. The header card edits `invoiceMeta`, but `submitImportItems()` reads from `sharedDefaults` for supplier/invoiceNumber/date/orderID. The `handleImportInvoiceUpload` handler copies meta → sharedDefaults, but if the operator edits the header card fields after upload, those edits are NOT reflected in the create payload because `submitImportItems` reads `sharedDefaults`, not `invoiceMeta`.

This is a **bug**: editing the invoice header card supplier field does nothing — the create payload still uses the stale copy in `sharedDefaults.supplier`.

### 1e. No "non-inventory" row classification

Invoices often contain rows that are NOT inventory items: shipping/delivery fees, assembly fees, tax lines, service charges (e.g., the HK invoice has "砌機費用", "OS pre-install", "送貨"). Currently these show up as regular line items and the operator must manually deselect them. There is no tagging or auto-detection.

### 1f. No validation feedback before the button

Validation only runs when clicking "Create Items". There is no visual indicator showing which rows are ready vs incomplete. The operator has to click, see errors, fix, click again.

### 1g. No invoice file preview

Once uploaded, the file is sent to Azure and discarded from the frontend. There is no way to look at the original invoice while reviewing the extracted data.

### 1h. Raw Azure data is discarded

The normalizer strips all Azure fields not in the schema. Useful data like `BillingAddress`, `ShippingAddress`, `CustomerId`, `PaymentTerm`, `AmountDue`, vendor address, per-field confidence, etc. are lost. An admin has no way to inspect what Azure actually returned.

### 1i. "Re-upload" button wipes all work

Clicking "← Re-upload" on step 2 resets `draftRows = []`, destroying all operator edits. There is no confirmation.

### 1j. Retry flow loses per-row context

`retryFailedImports()` rebuilds payloads from only `failures[i].name` and shared defaults — it loses the per-row unitPrice, description, productCode, and any per-row overrides the operator set. The retry will create items with `price: 0` and no description.

### 1k. No step indicator

There is no visual progress/step indicator. The user sees a blank transition between upload, review, creating, and summary. No numbered steps, no breadcrumb, no visual cue of where they are.

### 1l. Defaults component has hardcoded dropdown options

`InvoiceImportDefaults.vue` has fallback props: `types: ['Hardware', 'Software', 'Component']`, `categories: ['Computer', 'Peripheral', 'Network', 'Other']`, `locations: ['Lab A', 'Lab B', 'Office', 'Storage']`. The parent passes `itemTypes`, `mutableCategories`, `mutableLocations` — which is correct — but if those are empty or not loaded yet, the fallbacks are inconsistent with the actual system data.

---

## 2. Recommended Workflow Structure

### Proposed 7-Step Flow

```
Step 1: Upload Invoice
Step 2: Review Invoice Header      ← editable meta, warnings, confidence
Step 3: Review & Classify Line Items  ← select/deselect, mark non-inventory rows
Step 4: Configure Item Fields       ← shared defaults + per-row overrides
Step 5: Pre-Create Validation       ← readiness checklist, expanded count
Step 6: Creating (progress bar)
Step 7: Result Summary
```

**Visual step indicator**: A horizontal numbered stepper bar at the top of the wizard area (Step 1 · Step 2 · Step 3 … Step 7) with current step highlighted. Steps 6 & 7 are non-interactive (progress + result).

**Navigation**: Each step has "← Back" and "Next →" buttons. "Back" preserves all state (no data loss). "Next" on steps 2-4 performs basic quick-validation before advancing. Steps 1-5 are freely navigable back and forth.

### Step-by-step detail

| Step | Title | Content | Gated by |
|------|-------|---------|----------|
| 1 | Upload Invoice | Dropzone, format hint, error display | File selected + Azure OK |
| 2 | Invoice Header | Editable supplier, invoice#, date, PO, total, tax, currency, customer. Warnings panel. Confidence badge. Collapsible "Extracted Data Inspector". | — (informational) |
| 3 | Line Items | Review table with row classification (inventory / non-inventory). Select/deselect. Inline editing of name, qty, price, code. Row status badges (ready/incomplete/excluded). | ≥1 selected row |
| 4 | Item Fields | Shared defaults panel (top). Below it: per-row override section for rows needing different values. "Apply defaults to all" button. | — |
| 5 | Review & Confirm | Summary card: N selected rows → M items (after qty expansion). List of items to create with final field preview. Missing-field warnings. "Create M Items" button. | All selected rows pass validation |
| 6 | Creating | Progress bar, current/total count | Auto |
| 7 | Summary | Success/failure counts. Failed item list with retry. "Done" button. | Auto |

---

## 3. UI Architecture Recommendation

### Layout: Single-column wizard in the existing form area

Do NOT split the page into multiple panels or drawers. The ManageItemsPage already has a left panel (form area) and right panel (items table). The import wizard replaces only the left form area, same as today. All steps render vertically in that area.

### Component breakdown

```
ManageItemsPage.vue
  └─ Import wizard (v-if="addMode === 'import'")
       ├─ ImportStepIndicator.vue          (new: horizontal step bar)
       ├─ Step 1: Upload                   (inline, same as now)
       ├─ Step 2: ImportInvoiceHeader.vue   (new: editable header card + extracted data inspector)
       ├─ Step 3: InvoiceImportReviewTable.vue  (existing, enhanced)
       ├─ Step 4: ImportItemFieldConfig.vue  (new: shared defaults + per-row overrides)
       ├─ Step 5: ImportPreCreateSummary.vue (new: validation + confirmation)
       ├─ Step 6: Progress bar              (inline, same as now)
       └─ Step 7: Summary                   (inline, enhanced)
```

### Key architecture decisions

- **Invoice header** becomes its own editable card in step 2 (currently it's jammed into step 2 alongside line items and defaults).
- **Line items table** is step 3, focused ONLY on reviewing/classifying items — not configuring inventory fields.
- **Field configuration** is step 4, where the operator does the "inventory system" work separate from the "invoice data" work.
- **Shared defaults** and **per-row overrides** are in the same step but clearly separated visually (shared defaults at top, per-row section below).
- **Pre-create summary** makes the operator pause and confirm before creation.

---

## 4. Per-Item Field Editing Recommendation

### The problem

The review table currently has 8 columns. Adding type, category, location, owner, department, funding, warranty (7+ more) would make the table unusably wide. But relying only on "shared defaults" forces identical values on all items.

### Recommendation: "Expandable row detail panel"

Each row in the table gets a small expand/collapse toggle (▶ / ▼). When expanded, a detail panel appears below the row (full table width) showing the inventory fields for that specific row:

```
┌─ ☑ │ Intel i5-14600KF  │ 1 │ $2190 │ ▼ ──────────────────┐
│    Detail panel:                                            │
│    Type: [Hardware ▾]  Category: [Computer ▾]  Location: [Lab A ▾]  │
│    Owner: [department ▾]  Department: [COMP]  Funding: [___]        │
│    Warranty Start: [____]  Warranty End: [____]  Vendor: [____]     │
└─────────────────────────────────────────────────────────────┘
  ☑ │ MSI PRO B760M      │ 1 │ $1100 │ ▶
  ☑ │ DDR5 32GB RAM       │ 1 │ $870  │ ▶
```

**Behavior**:
- By default, all rows are collapsed. Fields inherit from shared defaults.
- If a row's fields differ from shared defaults, show a small indicator (e.g., "⚙ custom" badge).
- If a row's field is empty and no shared default covers it and it's required, show a "⚠ incomplete" badge.
- Only rows that need per-row variance need to be expanded.
- The detail panel fields are pre-filled from shared defaults but can be overridden.

### Why this approach

- **No side drawer**: A side drawer would require clicking each row to configure, which is slow for 14-row invoices.
- **No extra table columns**: The table stays clean with invoice data only (name, qty, price, code, confidence).
- **Expandable panel**: Fast to scan (most rows stay collapsed), easy to expand only the rows that need different values.

### Implementation

Add a `rowOverrides` object to each draft row:
```js
{
  _rowId: '...',
  selected: true,
  itemName: '...',
  quantity: 1,
  unitPrice: 2190,
  // ... existing invoice fields ...
  overrides: {   // NEW: per-row inventory field overrides
    type: '',     // empty = use shared default
    category: '',
    location: '',
    owner: '',
    departmentID: '',
    fundingSource: '',
    warrantyStartDate: '',
    warrantyEnd: '',
    warrantyVendor: '',
    warrantyOnsite: null,
  },
  expanded: false,   // NEW: UI expand state
}
```

In `submitImportItems`, for each field: use `row.overrides.type || sharedDefaults.type || 'Hardware'`.

---

## 5. Validation and Readiness Model

### Per-row readiness badges

Each row in the table (step 3 and step 4) gets a status badge in the leftmost area:

| Badge | Meaning |
|-------|---------|
| ✓ Ready | All required fields resolved (via row override or shared default) |
| ⚠ Incomplete | Missing required fields (name, type, or category) |
| — Excluded | Row deselected (greyed out) |
| 🏷 Non-inventory | Classified as shipping/fee/tax (greyed out, auto-deselected) |

### Pre-create summary card (step 5)

```
┌─────────────────────────────────────────────────┐
│  Import Summary                                  │
│                                                  │
│  Selected rows:      12 of 14                   │
│  Excluded rows:       2 (delivery, assembly)    │
│  ─────────────────────────────────────           │
│  Items to create:    15 (after qty expansion)   │
│    └─ 12 rows × qty = 15 items total           │
│                                                  │
│  All items ready:    ✓ Yes                      │
│  Shared defaults:    Type=Hardware, Cat=Computer │
│  Per-row overrides:  2 rows have custom fields  │
│                                                  │
│  ⚠ 1 warning: Line item 6 has no price         │
│                                                  │
│  [ ← Back ]              [ Create 15 Items ]    │
└─────────────────────────────────────────────────┘
```

### Quantity expansion visibility

The current button says "Create 14 Items" when 14 rows are selected. If any row has qty > 1, this is wrong. The summary step should show:

```
12 selected rows → 15 inventory items
  (3 rows have qty > 1)
```

And the button says "Create 15 Items" (the true count).

### Blocking vs non-blocking validation

| Check | Blocking? |
|-------|-----------|
| Name is empty | Yes — cannot create |
| Type is empty (and no default) | Yes |
| Category is empty (and no default) | Yes |
| Price is 0 or null | No — warning only |
| Description is empty | No — warning only |
| Location is empty | No — warning only |
| Low confidence row | No — warning only |

---

## 6. Extracted Data Visibility Plan

### Recommendation: "Extracted Data Inspector" collapsible section

In **step 2** (Invoice Header), add a collapsible section below the editable header fields:

```
▼ Extracted Data Inspector
┌─────────────────────────────────────────────────┐
│ Azure Document Intelligence — Raw Fields         │
│                                                  │
│  VendorName:         "DELL"  (conf: 0.95)       │
│  VendorAddress:      "One Dell Way, Round Rock"  │
│  BillingAddress:     "5007 HILDASUE TER..."      │
│  CustomerName:       "ASHAMONI,MALLESH"          │
│  CustomerId:         "530024365876"              │
│  PaymentTerm:        "Credit/Deb.Card"           │
│  AmountDue:          $0.00                       │
│  ShippingAddress:    "5007 HILDASUE TER..."      │
│  ...                                             │
│                                                  │
│  [Copy Raw JSON]                                 │
└─────────────────────────────────────────────────┘
```

### Backend change required

The normalizer currently discards all fields not in the mapped set. Update it to also return a `rawFields` object:

```js
return {
  success: true,
  invoiceMeta,
  lineItems,
  warnings,
  confidence: overallConfidence,
  rawFields: fields,       // NEW: pass through all Azure fields for inspector
};
```

This allows the frontend to display any Azure-detected field, even ones not mapped to the schema. The inspector is a read-only structured view — not a raw JSON dump. Each field is rendered as `FieldName: value (confidence: X%)`.

### Why not a modal or drawer

- A collapsible section keeps the data in context while reviewing the header.
- A modal forces the operator to close it to continue.
- A drawer competes with the form area for space.
- The operator can glance at it, then collapse it and keep working.

### Collapsed by default

The inspector is collapsed by default. Most operators won't need it. Admin/power users who want to debug extraction can expand it.

---

## 7. Uploaded Invoice Preview Plan

### Priority: Lower than steps 2-5 improvements

### Recommendation: Collapsible image preview above the header card

In step 2, before the "Invoice Header" card:

```
▼ Invoice Preview
┌─────────────────────────────────────────────────┐
│  [uploaded invoice image rendered at ~400px      │
│   max-height, scrollable if tall, click to       │
│   open full-size in new tab]                     │
│                                                  │
│  File: invioce2.png (273 KB)                    │
└─────────────────────────────────────────────────┘
```

### Implementation

- On upload, keep the file object in `importInvoiceFile.value` (already done).
- Create a `URL.createObjectURL(file)` to render it.
- For PDFs: render first page using `pdf.js` (already in the project for the existing OCR feature) or just show filename + page count.
- For images: render directly with `<img>`.
- Revoke the object URL on reset.

### Why collapsible, not a side panel

- The form area is narrow. A side-by-side layout with image + form would be too cramped.
- A collapsible section lets the operator check the source, then collapse it to focus on data entry.
- The operator only needs the preview occasionally (to cross-reference a specific line item).

### Alternative considered: "Open in new tab" button

Even simpler: just a small button "View uploaded invoice" that opens the image in a new browser tab. Zero layout impact. This could be the MVP version, with collapsible inline preview as a later enhancement.

---

## 8. MVP Improvement Scope (Do First)

These changes have the highest impact and should be done first:

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| 1 | **Fix header→payload bug** — Remove invoice header duplication. Make `submitImportItems` read from `invoiceMeta` for supplier/invoice#/date/orderID, or unify the two objects. | Small | Critical (bug) |
| 2 | **Add step indicator** — Horizontal numbered step bar. Simple component, huge clarity gain. | Small | High |
| 3 | **Split step 2 into 3 steps** — Header (step 2), Line Items (step 3), Field Config (step 4). Move shared defaults out of the review table step. | Medium | High |
| 4 | **Per-row expandable field panel** — Add expand/collapse to each table row with inventory fields below. | Medium | High |
| 5 | **Pre-create summary step** — Show expanded item count, readiness status, blocking errors. | Medium | High |
| 6 | **Row readiness badges** — Visual indicators per row (ready/incomplete/excluded). | Small | High |
| 7 | **Quantity expansion preview** — Show "N rows → M items" in the summary and the create button. | Small | Medium |
| 8 | **"Back" preserves state** — All navigation between steps preserves draft data. | Small | Medium |
| 9 | **Confirm before re-upload** — Add "Discard current review?" confirmation. | Tiny | Medium |
| 10 | **Fix retry flow** — Store full payload per failure, not just name. | Small | Medium (bug) |

---

## 9. Deferred Polish (Do Later)

| # | Change | Notes |
|---|--------|-------|
| A | **Extracted Data Inspector** — Collapsible raw Azure fields panel in step 2. Requires backend `rawFields` passthrough. | Nice-to-have for admin debugging. |
| B | **Invoice preview** — Collapsible image/PDF preview area. Or simpler "Open in new tab" button. | Lower priority than workflow. |
| C | **Non-inventory row auto-detection** — Heuristic to flag rows like shipping, tax, assembly as non-inventory and auto-deselect them. | Could use keyword matching (ship*, deliver*, tax, fee, install, service). |
| D | **Bulk row classification** — "Mark selected as non-inventory" toolbar button. | Useful for messy invoices. |
| E | **Currency override default** — Add currency selector to shared defaults (for HKD/$-ambiguity issue). | Simple dropdown. |
| F | **Audit log for imports** — Log "Bulk import: N items created from invoice #X" in audit log. | Backend change. |
| G | **Per-line-item confidence in inspector** — Show which specific Azure fields had low confidence on each line item. | Requires passing more raw data. |
| H | **Multi-invoice queue** — Upload multiple invoices, review them sequentially. | Future feature, not MVP. |

---

## 10. Implementation Order Recommendation

### Phase 1: Fix bugs + structural split (do first)

1. **Fix header→payload bug** (1d above) — unify invoiceMeta and sharedDefaults so header edits actually affect creation.
2. **Fix retry flow** (1j above) — store full payload per failure for proper retry.
3. **Add step indicator component** — `ImportStepIndicator.vue`, simple numbered bar.
4. **Split step 2 into steps 2/3/4** — restructure the wizard from 4 steps to 7 steps. Move header, line items, and field config into separate v-if blocks.
5. **"Back" navigation preserves all state** — ensure no step transition wipes data.
6. **Confirm before re-upload** — simple `window.confirm()` before resetting.

### Phase 2: Per-row editing + validation (second)

7. **Add per-row `overrides` and `expanded` to draft row schema**.
8. **Expandable row detail panel** — new UI in InvoiceImportReviewTable rows.
9. **Row readiness badges** — computed per-row status (ready/incomplete/excluded).
10. **Update `submitImportItems`** to use per-row overrides with shared-default fallback.
11. **Pre-create summary step** — `ImportPreCreateSummary.vue` with expanded item count, readiness checklist.
12. **Quantity expansion preview** — "N rows → M items" in summary.

### Phase 3: Extracted data + preview (third)

13. **Backend: add `rawFields` to normalizer response** — pass through all Azure document fields.
14. **Extracted Data Inspector** — collapsible panel in step 2 showing raw fields.
15. **Invoice preview** — "Open in new tab" button (MVP version) or collapsible image preview.

### Phase 4: Polish (fourth)

16. **Non-inventory row heuristic** — auto-flag shipping/tax/fee rows.
17. **Currency override** in shared defaults.
18. **Audit log entry** for bulk imports.
19. **Enhanced post-create summary** — show created item IDs, link to items in the table.

---

## Reference: Item Model Required vs Optional Fields

From `backend/models/Item.js`:

| Field | Required | Default | Source in import |
|-------|----------|---------|------------------|
| name | ✅ Yes | — | Line item description |
| itemId | ✅ Yes (auto) | Auto-generated | System |
| universityID | No | `''` | Not from invoice |
| type | No | `'Hardware'` | Shared default or row override |
| category | No | `'Other'` | Shared default or row override |
| status | No | `'Available'` | Always 'Available' for new |
| location | No | `''` | Shared default or row override |
| description | No | `''` | Row inline edit |
| supplier | No | `''` | Invoice header |
| invoiceNumber | No | `''` | Invoice header |
| price | No | `0` | Line item unitPrice |
| purchaseDate | No | `''` | Invoice header |
| orderID | No | `''` | Invoice header |
| owner | No | `'department'` | Shared default or row override |
| departmentID | No | `''` | Shared default or row override |
| fundingSource | No | `''` | Shared default or row override |
| projectLinked | No | `null` | Shared default |
| warrantyStartDate | No | `''` | Shared default or row override |
| warrantyEnd | No | `''` | Shared default or row override |
| warrantyVendor | No | `''` | Shared default |
| warrantyOnsite | No | `false` | Shared default |
| canBorrow | No | `true` | Always true for new |
| vendor | No | `''` | Not currently mapped |

---

*Plan complete. Ready for implementation on approval.*
