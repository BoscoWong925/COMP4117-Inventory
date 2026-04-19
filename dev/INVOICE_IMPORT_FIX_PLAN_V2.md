# Invoice Import — Fix Plan V2

> **Status**: Plan only — do not implement until approved.  
> **Scope**: Fix remaining workflow problems in the 7-step import wizard.  
> **Constraint**: Keep Manual Add intact, keep existing 1-item Invoice Assist intact, keep Azure invoice extraction intact. Do not redesign the whole system unnecessarily. Prioritise operator control and clarity.

---

## 1. Current Remaining Workflow Problems

| # | Problem | Where | Severity |
|---|---------|-------|----------|
| A | **Non-inventory rows are half-baked.** The auto-detect regex catches some keywords but misses `rebate`, `credit`, `adjustment`, `deposit`, `setup`, `support`, `maintenance`, `bundling`, `recycling`, and CJK equivalents. More importantly, there is no manual "Mark as non-inventory" toggle — the operator can only deselect the row, which is ambiguous (deselected ≠ non-inventory). The Review Table shows 🏷 for auto-detected rows but gives no way to flip the flag manually. | `ManageItemsPage.vue` lines 1837-1843, `InvoiceImportReviewTable.vue` | High |
| B | **Item identity fields are not editable enough.** `itemName` and `description` are editable in Step 3, but `productCode` serves no downstream purpose — it is never submitted to the backend. The operator cannot set `universityID` anywhere in the import wizard; it is hard-coded to `''` in `submitImportItems`. There is no per-row name editing in Step 4 either — if the operator only notices a bad name at Step 4, they must go back. | `submitImportItems` line 1932 | High |
| C | **Whole-PC / bundle import is unsupported.** The Item model has `motherID` and `fixedComponents` but the import wizard has zero support for parent → child relationships. An invoice that lists "Desktop PC ×1, RAM ×1, SSD ×1, GPU ×1" creates 4 flat, unrelated items. The `createItem` controller already handles `motherID` (sets `canBorrow=false` for children) and `fixedComponents`, so only the frontend needs work. | Item model, import wizard | High |
| D | **Per-row config panel is limited.** Overrides cover type/category/location/owner/department/fundingSource/warranty but not `status`, `description`, `productCode`, `universityID`, or `canBorrow`. Quantity expansion (e.g. qty 3 → 3 items) gives no way to assign different names or university IDs to each expanded copy. | Step 4 per-row override grid | Medium |
| E | **Line-item Review Table interaction is weak.** No button/toggle to manually mark a row non-inventory. No inline edit for `description` in a useful way (the column exists but `description` maps to a separate notes field, not the Azure `description` which is used as `itemName`). No drag-to-reorder. No "split row" for bundles. The "Remove Selected" button permanently deletes rows with no undo. | `InvoiceImportReviewTable.vue` | Medium |
| F | **No Import Mode selection.** Every upload goes through the same 7-step flow. There is no way for the operator to say "these are all separate items" vs. "this invoice is one PC build" vs. "I want to expand each row into N separate items with individual editing." | Missing entirely | High |
| G | **Pre-create Summary (Step 5) is view-only.** If the operator spots an error in the summary, they must navigate back. The summary should surface actionable warnings (missing universityID, zero price, duplicate names) and ideally allow last-minute inline fixes. | `ImportPreCreateSummary.vue` | Medium |
| H | **Steps feel empty or redundant.** Step 2 (Invoice Header) and Step 4 (Shared Defaults) each have a single card. Step 2 could be merged with Step 3 as a collapsible header above the line-item table. Step 4's per-row section is only useful when at least one row diverges from defaults. For a single-row invoice, Steps 3-4-5 are three screens showing essentially the same one row. | UX layout | Low |

---

## 2. Recommended Operator Use Cases to Support

| Use Case | Description | Frequency |
|----------|-------------|-----------|
| **UC-1: Bulk flat import** | Invoice lists 5–30 unrelated items (monitors, cables, keyboards). Each line → 1 inventory item. Shared defaults apply to all. | Most common |
| **UC-2: Quantity expansion** | Invoice lists "USB Hub ×10". Operator wants 10 individual inventory items, each needing a unique `universityID` later. | Common |
| **UC-3: Whole-PC build** | Invoice lists 1 PC case + 5 components. Operator wants 1 parent item ("Desktop PC") with `fixedComponents` pointing to 5 child items, each child having `motherID` referencing the parent. | Occasional |
| **UC-4: Mixed invoice** | Invoice has 8 inventory lines, 2 non-inventory lines (shipping, assembly fee), and 1 PC bundle within the same invoice. | Occasional |
| **UC-5: Re-import / correction** | Operator uploaded wrong file or wants to re-do just the failed items from a previous import. | Rare |

**Out of scope for import wizard**: borrowing, item transfers, disposal — those are post-creation workflows.

---

## 3. Row Classification Model

Each draft row should carry a **`rowClass`** enum instead of the current boolean `nonInventory`:

| `rowClass` | Meaning | Created? | Badge |
|------------|---------|----------|-------|
| `item` | Standalone inventory item (default) | Yes, 1 item per qty=1 or N items if qty>1 | ✓ |
| `parent` | Parent / bundle shell (e.g. "Desktop PC") | Yes, 1 parent item with `fixedComponents` | 🖥 |
| `child` | Component belonging to a parent | Yes, 1 item with `motherID` referencing parent | ⚙ |
| `non-inventory` | Shipping, tax, fees, etc. | No | 🏷 |
| `excluded` | Manually excluded by operator | No | — |

### Migration from current model

- Current `nonInventory: true` → `rowClass: 'non-inventory'`
- Current `selected: false` → `rowClass: 'excluded'`
- Current `selected: true, nonInventory: false` → `rowClass: 'item'` (default)
- New: `parent` and `child` only appear when Import Mode is "PC Build" or when operator manually assigns via the Review Table

### Auto-detection upgrade

Expand the `nonInvPattern` regex:

```js
const nonInvPattern = /\b(shipping|delivery|deliver|freight|tax|vat|gst|fee|service charge|install(ation)?|assembly|labour|labor|discount|handling|surcharge|rebate|credit|adjustment|deposit|setup|support|maintenance|bundling|recycling|送貨|運費|砌機|安裝|組裝|回收|稅|服務費)\b/i
```

Also add a heuristic: if `unitPrice <= 0` or description contains "no charge" / "FOC" / "free of charge", auto-mark `non-inventory`.

---

## 4. Recommended Import Modes

Add a **mode selector** in Step 2 (or a new sub-step between upload and header). Three modes:

| Mode | Label | Behaviour |
|------|-------|-----------|
| `flat` | **Separate Items** (default) | Each selected row → independent item(s). Quantity expansion applies. Current behaviour. |
| `pc-build` | **PC / Bundle Build** | Operator designates 1 row as `parent`, remaining as `child`. Creates parent with `fixedComponents`, children with `motherID`. Quantity forced to 1 for parent (or user decides). |
| `mixed` | **Mixed** | Combination: some rows are flat items, some form a parent-child group. Operator assigns row classes manually in Step 3. |

### Where to show the selector

Place it at the **top of Step 3** (Review Line Items) as a segmented control:

```
Import mode: [ Separate Items | PC Build | Mixed ]
```

Rationale: the operator needs to see the extracted lines before choosing the mode. Putting it in Step 2 (before seeing items) is premature.

### Mode → row behaviour

- **`flat`**: all rows default to `rowClass: 'item'`. Parent/child columns hidden.
- **`pc-build`**: first row auto-set to `parent`, rest to `child`. Operator can reassign. A "parent row" dropdown or radio column appears. Validation: exactly 1 parent required.
- **`mixed`**: all rows default to `item`. A new "Class" dropdown column appears per row: `item | parent | child | non-inventory | excluded`. Operator can designate a parent and drag children under it.

---

## 5. Whole PC / Parent-Child Solution

### Data flow

1. **Step 3 (Review)**: In `pc-build` or `mixed` mode, operator assigns `rowClass: 'parent'` to one row and `rowClass: 'child'` to others.
2. **Step 4 (Configure)**: Parent row gets a "Bundle Name" field (defaults to its `itemName`). Children show under "Components of: [parent name]" heading. Each child can override fields independently. Parent's type defaults to `'Hardware'`; children default to `'Component'`.
3. **Step 5 (Summary)**: Show a tree-like preview:
   ```
   🖥 Desktop PC (parent)
     ⚙ Intel i9 CPU
     ⚙ 32GB DDR5 RAM
     ⚙ 1TB NVMe SSD
     ⚙ RTX 4070 GPU
     ⚙ ATX Case
   ```
4. **Step 6 (Create)**: Create children first → collect their `itemId`s → create parent with `fixedComponents: [child1Id, child2Id, ...]`. Each child is created with `motherID` left blank initially (we don't know parent's ID yet), then after parent is created, PATCH each child's `motherID` to parent's `itemId`.

**Alternative (simpler)**: Create parent first (without `fixedComponents`), then create each child with `motherID: parentItemId`, then PATCH parent's `fixedComponents` with all child IDs. This is simpler because we get `parentItemId` from the first API call.

### Backend requirements

Existing `createItem` already handles `motherID` → `canBorrow: false` for children. We need:

- A **PATCH** call after creation to set `fixedComponents` on the parent. The existing `updateItem` already handles `fixedComponents` parsing. So no backend changes are needed — just two API calls per parent (create + update).

### Validation rules (Step 5)

- Exactly 1 parent in `pc-build` mode.
- At least 1 child linked to the parent.
- Parent must have a name.
- All children must have names.
- No row can be both `parent` and `child`.

---

## 6. Per-Row Editing Improvement Plan

### 6a. Add missing override fields

Add these to the per-row override panel:

| Field | Input type | Default fallback |
|-------|-----------|-----------------|
| `universityID` | text | `''` (but warn if empty) |
| `status` | select (enum) | `sd.status` |
| `canBorrow` | checkbox | `true` (false for children) |
| `description` | textarea | row's Azure description |

Keep `name` editing in Step 3 only (it's the primary identifier, not an override).

### 6b. Quantity expansion editing

When `qty > 1`, show a sub-section inside the expanded row:

```
USB Hub ×3 → 3 items
  Copy 1: universityID [________] name suffix [________]
  Copy 2: universityID [________] name suffix [________]
  Copy 3: universityID [________] name suffix [________]
```

Implementation:
- Add `expandedCopies: []` array to each row, populated on expand when `qty > 1`.
- Each copy object: `{ universityID: '', nameSuffix: '' }`.
- At submit time, item name = `row.itemName + (copy.nameSuffix ? ' ' + copy.nameSuffix : '')`.
- If `expandedCopies` is empty (user didn't expand), fall back to current behaviour (N identical items).

### 6c. Payload fields gap fix

Update `submitImportItems` to include:

```js
universityID: copy?.universityID || ov.universityID || '',
status: ov.status || sd.status || 'Available',
canBorrow: (row.rowClass === 'child') ? false : (ov.canBorrow ?? true),
productCode: row.productCode || '',  // store in description or a future field
```

---

## 7. Review Step (Step 3) Redesign

### Current problems
- No manual non-inventory toggle
- No row class column
- "Remove Selected" is destructive with no undo
- Description column is confusing (Azure `description` is used as `itemName`, this `description` field is for notes)

### Proposed changes

| Change | Detail |
|--------|--------|
| **Add "Class" column** | In `mixed`/`pc-build` mode: dropdown with `item / parent / child / non-inventory / excluded`. In `flat` mode: simple toggle between `item / non-inventory / excluded`. |
| **Replace the boolean `nonInventory` toggle** | The "Class" dropdown replaces it entirely. In `flat` mode, the dropdown can be simplified to a three-state segmented pill: `✓ Item | 🏷 Non-inv | — Exclude`. |
| **Rename "Description" column to "Notes"** | Clarify it's for operator notes, not the Azure-extracted description. |
| **Add "Undo Remove" capability** | Instead of deleting removed rows from the array, mark them `rowClass: 'excluded'` and dim them. Add an "Include" button to restore. Remove the destructive "Remove Selected" button. |
| **Show parent-child grouping** | In `pc-build`/`mixed` mode, indent `child` rows under their `parent`. Show a thin left-border colour-coded to the parent. |
| **Add a "Split Row" action** | Per-row action button: splits a qty-N row into N qty-1 rows. Useful when the operator wants different names/types for each unit. |
| **Move header info into collapsible banner** | Show supplier, invoice #, date, PO as a compact banner above the table (collapsed by default after Step 2 visit). Saves a full step for experienced users. |

### Readiness badge update

| `rowClass` | Badge | Colour |
|------------|-------|--------|
| `item` + all required fields | ✓ Ready | green |
| `item` + missing field | ⚠ Incomplete | amber |
| `parent` + valid | 🖥 Parent | blue |
| `child` + valid | ⚙ Child | slate |
| `non-inventory` | 🏷 N/A | grey |
| `excluded` | — Excluded | grey dim |

---

## 8. Pre-Create Summary (Step 5) Redesign

### Current problems
- View-only; operator must navigate back for any fix.
- Does not warn about: empty `universityID`, zero prices, duplicate item names, missing warranty dates.
- Does not show parent-child tree.

### Proposed changes

| Change | Detail |
|--------|--------|
| **Inline quick-edit** | Allow clicking any row to expand an inline edit panel (same fields as Step 4 overrides). Changes propagate to the underlying `draftRows` immediately. |
| **Additional warnings** | Add soft warnings (non-blocking): `universityID is empty` (all rows — this is always the case now), `price is $0`, `duplicate item names will be created`, `warranty start > warranty end`. |
| **Parent-child tree display** | In `pc-build`/`mixed` mode, show the tree structure (parent → indented children) instead of a flat list. Show child count and total component cost. |
| **Cost reconciliation** | Compare `sum(lineTotal of selected rows)` vs `invoiceMeta.totalAmount`. Show a warning if they diverge > 5%. |
| **Final item count breakdown** | Show: `N flat items + 1 parent + M children = total (X API calls)`. |

---

## 9. MVP Scope Recommendation

The MVP should cover the most impactful, lowest-risk changes first. Specifically:

### MVP-1 (must ship first)

| # | Change | Files affected | Effort |
|---|--------|---------------|--------|
| 1 | **Replace `nonInventory` boolean with `rowClass` enum** | `ManageItemsPage.vue`, `InvoiceImportReviewTable.vue`, `ImportPreCreateSummary.vue` | Medium |
| 2 | **Add "Class" column to Review Table** (flat mode only: `item / non-inventory / excluded`) | `InvoiceImportReviewTable.vue` | Small |
| 3 | **Expand non-inventory regex** + zero-price heuristic | `ManageItemsPage.vue` (line ~1837) | Small |
| 4 | **Add `universityID` field to per-row overrides** | `ManageItemsPage.vue` Step 4, `submitImportItems` | Small |
| 5 | **Add `status` and `canBorrow` to per-row overrides** | `ManageItemsPage.vue` Step 4, `submitImportItems` | Small |
| 6 | **Fix `productCode` not submitted** — store in `description` field or add to payload | `submitImportItems` | Trivial |
| 7 | **Replace destructive "Remove Selected" with `rowClass: 'excluded'`** | `InvoiceImportReviewTable.vue`, `ManageItemsPage.vue` | Small |
| 8 | **Add soft warnings to Step 5** (empty universityID, zero price, duplicate names) | `ImportPreCreateSummary.vue` | Small |
| 9 | **Add import mode selector (flat only)** — UI placeholder, flat is the only working mode but the selector is present for consistency | `ManageItemsPage.vue` Step 3 | Trivial |

### MVP-2 (ship second)

| # | Change | Files affected | Effort |
|---|--------|---------------|--------|
| 10 | **PC Build mode** — full parent-child flow: row class assignment, tree preview, two-phase creation (create parent → create children with motherID → patch parent fixedComponents) | `ManageItemsPage.vue`, `InvoiceImportReviewTable.vue`, `ImportPreCreateSummary.vue`, `submitImportItems` | Large |
| 11 | **Quantity expansion editing** — per-copy universityID and name suffix | `ManageItemsPage.vue` Step 4 | Medium |
| 12 | **Split Row action** in Review Table | `InvoiceImportReviewTable.vue` | Small |
| 13 | **Inline quick-edit in Step 5** | `ImportPreCreateSummary.vue` | Medium |
| 14 | **Cost reconciliation warning** in Step 5 | `ImportPreCreateSummary.vue` | Small |

---

## 10. Deferred Scope

These are real needs but can wait until after MVP-1 and MVP-2 are stable:

| # | Feature | Rationale for deferral |
|---|---------|----------------------|
| D1 | **Merge Step 2 into Step 3** as collapsible header banner | Low severity; current flow works. Revisit after user feedback. |
| D2 | **`invoiceFile` attachment to created items** | Backend `createItem` supports `req.file` but the import wizard sends JSON, not multipart. Needs API refactor or a second upload call. |
| D3 | **Duplicate invoice detection** (warn if invoiceNumber already exists in DB) | Needs a new backend endpoint (`GET /api/items?invoiceNumber=X`). Nice to have but not blocking. |
| D4 | **Import state persistence** (localStorage backup) | Prevents data loss on accidental navigation. Low severity for the current single-page wizard. |
| D5 | **Mixed mode** — combination of flat items and PC build groups in one import | Complex UX. Wait until pc-build mode is proven useful. |
| D6 | **Drag-to-reorder rows** | Nice UX polish, zero functional impact. |
| D7 | **Row-level early validation** (validate at Step 3 instead of only at Step 5) | Would improve UX but requires refactoring validation to depend on partial state. |
| D8 | **Tesseract / Azure unification** | Two parallel OCR paths (Tesseract for manual single-item, Azure for import). Unifying is a separate project. |

---

## 11. Implementation Order Recommendation

```
Phase 1 — MVP-1: Row classification & field gaps     (items 1–9)
  ├─ 1.1  Add rowClass enum, migrate nonInventory/selected → rowClass
  ├─ 1.2  Update InvoiceImportReviewTable: Class column, readiness badges
  ├─ 1.3  Expand nonInvPattern regex + zero-price heuristic
  ├─ 1.4  Add universityID / status / canBorrow to per-row overrides
  ├─ 1.5  Fix productCode submission, update submitImportItems payload
  ├─ 1.6  Replace destructive Remove with rowClass:'excluded' + restore
  ├─ 1.7  Add soft warnings to ImportPreCreateSummary
  ├─ 1.8  Add mode selector UI (flat only, placeholder for future modes)
  └─ 1.9  Test: verify flat import still works end-to-end, verify badges

Phase 2 — MVP-2: PC Build mode & quantity editing     (items 10–14)
  ├─ 2.1  Implement pc-build mode row assignment in Step 3
  ├─ 2.2  Tree preview in Step 5
  ├─ 2.3  Two-phase creation in submitImportItems (parent → children → patch)
  ├─ 2.4  Quantity expansion per-copy editing (universityID + name suffix)
  ├─ 2.5  Split Row action
  ├─ 2.6  Inline quick-edit in Step 5
  ├─ 2.7  Cost reconciliation warning
  └─ 2.8  Test: verify PC build creates correct parent/child hierarchy

Phase 3 — Deferred (D1–D8): after MVP-2 is stable
```

### Dependency notes

- **1.1 must be first** — all subsequent changes depend on `rowClass`.
- **1.2 depends on 1.1** — table columns need rowClass.
- **1.4 and 1.5 are independent** of each other but both depend on 1.1.
- **2.1–2.3 are a single unit** — PC Build mode is not useful until all three are done.
- **2.4 is independent** of 2.1–2.3 and could be done in parallel.

### Files changed per phase

| Phase | Files |
|-------|-------|
| Phase 1 | `ManageItemsPage.vue` (importState, draft row structure, submitImportItems, auto-detect, Step 3/4 templates), `InvoiceImportReviewTable.vue` (class column, remove→exclude), `ImportPreCreateSummary.vue` (warnings) |
| Phase 2 | Same files as Phase 1 + `submitImportItems` rewrite for two-phase creation, `InvoiceImportReviewTable.vue` (tree indent + split), `ImportPreCreateSummary.vue` (tree + inline edit) |
| Phase 3 | Various — scoped per feature |

---

*End of plan.*
