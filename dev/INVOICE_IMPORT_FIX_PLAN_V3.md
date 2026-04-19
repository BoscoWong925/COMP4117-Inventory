# Invoice Import Fix Plan — V3 (Simplified, Item-Field-Centered)

> **Created:** 2025-07-27  
> **Status:** PLAN ONLY — not yet implemented  
> **Supersedes:** `INVOICE_IMPORT_FIX_PLAN_V2.md` (3-mode import system, now dropped)

---

## 1. What Should Change from the Previous Plan

| Previous Plan (V2) | This Plan (V3) |
|---|---|
| Three import modes: Separate Items / PC Build / Mixed | **Dropped entirely.** Single flat import flow only. |
| `rowClass` enum included `'parent'` and `'child'` values for PC Build mode | `rowClass` reduced to `'item' \| 'non-inventory' \| 'excluded'` — remove the `'parent'` / `'child'` comment. |
| Import mode pill selector in Step 3 (flat active, pc-build/mixed disabled "Coming soon") | **Remove the whole selector.** It clutters the UI for a feature that will never ship as a separate mode. |
| `importMode` ref in ManageItemsPage + prop passed to ReviewTable | **Delete `importMode` ref entirely.** Remove the prop from ReviewTable. Delete the CSS classes `.import-mode-selector`, `.import-mode-pills`, etc. |
| Component/parent-child handling was embedded in the mode switcher architecture | Component handling is now **per-row item field configuration**: set `type='Component'` + assign `motherID` via a dropdown on each row that needs it. No special mode. |
| Sub-components (ReviewTable, Defaults, PreCreateSummary, StepIndicator) kept raw HTML | **Migrate all 4 sub-components to shadcn-vue** (Button, Card, Select, Input, Badge, Checkbox, Separator) for visual consistency with the rest of the dashboard. |
| Per-row overrides had 12 fields but were missing `motherID`, `vendor`, `warrantyOnsite` | Add `motherID` to per-row overrides. Add `vendor` and `warrantyOnsite`. |
| `submitImportItems` payload omitted `vendor`, `motherID`, `fixedComponents` | Payload will include all fields the backend accepts, including `vendor` and `motherID`. |

**Summary:** The V2 plan was centered on 3 workflow modes. V3 is centered on **per-row item field configuration** within a single flat import flow. Component designation is just another field value (type=Component + motherID), not a top-level workflow concept.

---

## 2. Current Remaining Problems

### A. Dead Import Mode Architecture

- `importMode` ref exists in ManageItemsPage (line ~1851, defaults to `'flat'`).
- Import mode pill selector exists in Step 3 template (lines 479-505) — flat active, pc-build/mixed disabled.
- `importMode` is passed as prop to InvoiceImportReviewTable but **never used** inside it.
- `rowClass` comment still references `'parent' | 'child'` values (line 1877).
- CSS for `.import-mode-selector`, `.import-mode-pills`, `.import-mode-pill`, `.import-mode-pill--active` exists (~lines 3838-3870).
- **Impact:** Dead code that confuses future developers and clutters the UI.

### B. Shared Defaults Missing Key Fields

`InvoiceImportDefaults.vue` shows 10 fields but is missing:
- `status` — users cannot set a shared default status (e.g. "Available" for all items).
- `canBorrow` — no shared default; the override in Step 4 defaults to `null` which falls back to `true` in `submitImportItems`, but this is not transparent to the user.
- `vendor` — the Item model has a `vendor` field but it is never set during import.
- `projectLinked` — the shared default object has it (`sd.projectLinked`) but there is no UI input.

### C. Per-Row Override Gaps

Step 4 per-row overrides (lines 558-640) are missing:
- `motherID` — cannot designate a row as a component of an existing parent item.
- `vendor` — cannot set vendor per-row.
- `warrantyOnsite` override — the shared defaults form has a checkbox for it, but per-row overrides don't offer it.
- Status dropdown only shows 3 of 6 valid enum values (missing: `'Missing'`, `'Dispose'`, `'Transferred'`). Though for import this is reasonable — new items shouldn't be "Missing" or "Disposed" — the status enum should at least match the valid options.

### D. `submitImportItems` Payload Gaps

The payload built in `submitImportItems` (lines 1976-2020):
- **No `vendor` field** — never included in the payload.
- **No `motherID` field** — cannot create component items that link to a parent.
- **`canBorrow` fallback ignores shared defaults** — line `canBorrow: ov.canBorrow != null ? ov.canBorrow : true` skips `sd.canBorrow` entirely.
- **`status` fallback uses `sd.status`** but there is no UI to set `sd.status`, so it always falls back to `'Available'`.
- **`projectLinked`** always uses `sd.projectLinked` — there is no per-row override option.

### E. Backend createItem Does Not Auto-Link Parent ↔ Child

When a child item is created with `motherID` set:
- `canBorrow` is forced to `false` (correct).
- But the **parent item's `fixedComponents` array is NOT updated**. The parent doesn't know about the child.
- This means the parent detail view won't show the component unless manually edited.
- **For MVP:** We can document this limitation and defer auto-linking to a follow-up. Parent-child relationships can be established by editing the parent after import.

### F. Sub-Components Use Zero shadcn-vue Components

All 4 import sub-components use raw HTML `<select>`, `<input>`, `<button>`, `<table>` elements with custom CSS classes. The rest of the dashboard (ManageItemsPage table view, filters, headers) uses shadcn-vue components (Card, Button, Badge, Select, Input, Checkbox, FilterSelect, etc.).

**Visual mismatch:** Import wizard looks like a different application from the main dashboard.

### G. ReviewTable Has No Price Override

In Step 3, `unitPrice` is displayed but not editable inline. Users who want to correct a mis-parsed price must wait until Step 4 overrides — but Step 4 doesn't have a price override either. Price editing is completely missing from the import flow.

---

## 3. Recommended Simplified Workflow

Keep the existing 7-step flow structure. Remove the import mode concept. Enhance per-row configuration.

```
Step 1: Upload          — Upload invoice PDF/image (unchanged)
Step 2: Header          — Review extracted invoice metadata (unchanged)
Step 3: Line Items      — Review/classify rows. Editable: name, qty, unit price, notes.
                           Row classification: Item / Non-inventory / Excluded.
                           NO import mode selector.
Step 4: Configure Fields — Shared defaults (enhanced) + per-row overrides (enhanced).
                           Per-row overrides now include motherID and vendor.
Step 5: Confirm         — Pre-create summary with warnings/errors.
Step 6: Creating        — Progress bar (unchanged).
Step 7: Summary         — Results with success/failure counts (unchanged).
```

**Key principle:** Every field on the Item model that matters for import should be settable either as a shared default (Step 4 top section) or as a per-row override (Step 4 accordion rows). Component designation uses `type=Component` + `motherID` in the per-row override.

---

## 4. Unwanted Row Handling Plan

**Current state (from MVP-1):** Working correctly. Keep as-is with minor UI polish.

| Feature | Current | Change |
|---|---|---|
| `rowClass` enum | `'item' \| 'non-inventory' \| 'excluded'` | **Keep.** Remove `'parent'`/`'child'` from the comment. |
| Auto-detect non-inventory | Regex + zero-price heuristic | **Keep.** Already comprehensive (rebate, credit, freight, tax, etc.). |
| Class dropdown in ReviewTable | Raw `<select>` with 3 options | **Replace** with shadcn `<Select>` component. |
| "Exclude All Active" button | Raw `<button>` | **Replace** with shadcn `<Button variant="destructive" size="sm">`. |
| "Restore Excluded" button | Raw `<button>`, shown only when excludedCount > 0 | **Replace** with shadcn `<Button variant="outline" size="sm">`. |
| Excluded row styling | `.import-review-row--excluded` with opacity + strikethrough | **Keep.** Visual is clear. |
| Non-inventory row styling | `.import-review-row--noninv` with muted background | **Keep.** |

**No behavioral changes** — the exclude/restore/classify system works well.

---

## 5. Item-Field-Centered Configuration Plan

### 5a. Shared Defaults (InvoiceImportDefaults)

Add the missing fields. New total: **14 fields** in a responsive grid.

| Field | Control | Current | Change |
|---|---|---|---|
| Type * | `<Select>` | ✅ raw `<select>` | Replace with shadcn Select |
| Category * | `<Select>` | ✅ raw `<select>` | Replace with shadcn Select |
| Location | `<Select>` | ✅ raw `<select>` | Replace with shadcn Select |
| Owner | `<Select>` | ✅ raw `<select>` | Replace with shadcn Select |
| Department | `<Input>` | ✅ raw `<input>` | Replace with shadcn Input |
| Funding Source | `<Input>` | ✅ raw `<input>` | Replace with shadcn Input |
| Warranty Start | `<Input type="date">` | ✅ raw `<input>` | Replace with shadcn Input |
| Warranty End | `<Input type="date">` | ✅ raw `<input>` | Replace with shadcn Input |
| Warranty Vendor | `<Input>` | ✅ raw `<input>` | Replace with shadcn Input |
| Warranty Onsite | `<Checkbox>` | ✅ raw `<input type="checkbox">` | Replace with shadcn Checkbox |
| **Status** | `<Select>` | ❌ missing | **ADD.** Options: Available, In-use, Not Available. Default: Available. |
| **Can Borrow** | `<Select>` | ❌ missing | **ADD.** Options: Yes / No. Default: Yes. |
| **Vendor** | `<Input>` | ❌ missing | **ADD.** Free text, auto-fill from invoice meta `supplier` if present. |
| **Project Linked** | `<Input>` | ❌ missing UI (data exists) | **ADD.** Free text. |

Wrap the entire defaults section in a shadcn `<Card>` with a clear header.

### 5b. Per-Row Overrides (Step 4 accordion)

Add the missing fields. Each row's override panel will have **16 fields** in a 2- or 3-column grid.

| Field | Current | Change |
|---|---|---|
| University ID | ✅ | Replace raw `<input>` with shadcn `<Input>` |
| Type | ✅ | Replace raw `<select>` with shadcn `<Select>` |
| Category | ✅ | Replace raw `<select>` with shadcn `<Select>` |
| Location | ✅ | Replace raw `<select>` with shadcn `<Select>` |
| Status | ✅ (3 options) | Replace with shadcn `<Select>`. Keep 3 options for new items. |
| Owner | ✅ | Replace raw `<select>` with shadcn `<Select>` |
| Department | ✅ | Replace with shadcn `<Input>` |
| Funding Source | ✅ | Replace with shadcn `<Input>` |
| Can Borrow | ✅ | Replace with shadcn `<Select>` |
| Warranty Start | ✅ | Replace with shadcn `<Input type="date">` |
| Warranty End | ✅ | Replace with shadcn `<Input type="date">` |
| Warranty Vendor | ✅ | Replace with shadcn `<Input>` |
| **Warranty Onsite** | ❌ missing | **ADD.** shadcn `<Checkbox>`. |
| **Vendor** | ❌ missing | **ADD.** shadcn `<Input>`. |
| **Project Linked** | ❌ missing | **ADD.** shadcn `<Input>`. |
| **Mother ID** | ❌ missing | **ADD.** See Section 6 below. |

Each row accordion header should use shadcn `<Badge>` for the "⚙ custom" indicator and readiness status.

---

## 6. Component / Parent Assignment Plan

**Core idea:** A component is just an item with `type='Component'` and `motherID` pointing to its parent. No special mode — just two field values set in per-row overrides.

### 6a. How It Works in the Import Flow

1. **User imports an invoice** that has e.g. 5 items: 1 desktop + 4 components (RAM, SSD, GPU, CPU).
2. In **Step 3** (Line Items), all 5 rows appear as `rowClass='item'`. No classification logic needed — components look like regular items at this stage.
3. In **Step 4** (Configure Fields):
   - For the 4 component rows, user expands the override panel and sets:
     - `Type` → `Component`
     - `Mother ID` → selects the parent item.
   - The `Mother ID` dropdown/search offers:
     - **(a)** Other rows in the current import batch (by name, shown as "Row 2: Desktop PC").
     - **(b)** Existing items already in the database (searched by name or itemId).
   - When `type=Component` and `motherID` is set, the system shows an info note: "This item will be created as a component. It will NOT be independently borrowable."

### 6b. Mother ID Field Implementation

**Control:** A combination field:
- shadcn `<Select>` for choosing from sibling import rows.
- With a text input option to type/search an existing item's ID.
- Implementation: A shadcn `<Select>` whose `<option>` list includes:
  - `""` — (none / standalone item)
  - One `<option>` per sibling import row that has `rowClass='item'` and is NOT the current row. Label: `"[Import] <itemName>"`.
  - If user wants to reference an existing DB item, provide an `<Input>` field to manually type the parent item's `itemId`. Show it below the select when "Enter existing item ID" is chosen.

**Simplified approach for MVP:** Just a text `<Input>` labeled "Parent Item ID (motherID)" where user can type an existing item's `itemId` or the `itemName` of another import row. The system resolves import-row references at submit time.

**Recommended MVP approach:** Use a shadcn `<Select>` that lists:
- `""` — No parent (default)
- Sibling import rows: `"Row N: <itemName>"` → value is the `_rowId` of that row

Plus a separate `<Input>` below it: "Or enter existing item ID:" for linking to already-created items.

At submit time:
- If `motherID` is a `_rowId` (matches an import row), resolve it to the `itemId` assigned to that row after creation. This means component rows referencing import-row parents must be created **after** the parent row.
- If `motherID` is a string that doesn't match any `_rowId`, treat it as a literal `itemId` for an existing DB item.

### 6c. Submit Order for Parent-Child

When `submitImportItems` builds payloads:
1. Sort items: rows without `motherID` first, then rows with `motherID`.
2. Create parent rows first, capturing their assigned `itemId`.
3. For child rows referencing an import-row parent (by `_rowId`), replace the `_rowId` with the parent's newly created `itemId`.
4. Create child rows with the resolved `motherID`.

### 6d. Backend Limitations (Accept for MVP)

- `createItem` already handles `motherID` → sets `canBorrow=false`. ✅
- `createItem` does **NOT** auto-update the parent's `fixedComponents` array. ❌
- **MVP decision:** Accept this limitation. The parent-child link is established via `motherID` on the child. The parent's `fixedComponents` can be manually updated later. The `getItemById` endpoint already queries children by `motherID`, so the detail view will still show components.
- **Post-MVP:** Add auto-linking logic in `createItem` — when `motherID` is set, also `$push` the new item's `itemId` into the parent's `fixedComponents`.

---

## 7. Review Step Redesign (InvoiceImportReviewTable — Step 3)

### 7a. shadcn Migration

Replace ALL raw HTML controls with shadcn equivalents:

| Element | Current | New |
|---|---|---|
| Toolbar buttons (Add Row, Exclude, Restore) | Raw `<button>` with `.import-review-btn` class | `<Button size="sm">`, `<Button size="sm" variant="destructive">`, `<Button size="sm" variant="outline">` |
| Header checkbox (select all) | Raw `<input type="checkbox">` | `<Checkbox :indeterminate="...">` |
| Row checkbox | Raw `<input type="checkbox">` | `<Checkbox>` |
| Class dropdown | Raw `<select>` with `.import-review-class-select` | `<Select>` |
| Item Name input | Inline `<input>` | `<Input>` |
| Qty input | Inline `<input type="number">` (if editable) | `<Input type="number">` |
| Confidence badge | Text with colored span | `<Badge :variant="confVariant">` |
| Readiness badge | Emoji + text | `<Badge variant="success/warning/outline">` |

### 7b. Make Unit Price Editable

Add inline editing for `unitPrice` in the table. Use `<Input type="number" class="w-20">` so users can correct mis-parsed prices directly in Step 3.

### 7c. Remove `importMode` Prop

Delete the `importMode` prop from InvoiceImportReviewTable. It is received but never used.

### 7d. Convert to Composition API

Convert InvoiceImportReviewTable from Options API to `<script setup>` Composition API for consistency with ManageItemsPage. Define `props` with `defineProps`, `emit` with `defineEmits`.

### 7e. Toolbar Count Badge

The toolbar shows `"N of M items active"`. Wrap the count in a `<Badge>` for visual emphasis.

---

## 8. Pre-Create Summary Redesign (ImportPreCreateSummary — Step 5)

### 8a. shadcn Migration

| Element | Current | New |
|---|---|---|
| Outer container | Raw `<div>` with custom border/radius | `<Card>` |
| Stats cards | Raw `<div>` with `.precreate-summary__stat` | Three small `<Card>` components in a flex row |
| Default value tags | `<span>` with `.precreate-summary__tag` | `<Badge variant="outline">` |
| Override indicator | `<span>` with "⚙ custom" text | `<Badge variant="accent">⚙ custom</Badge>` |
| Warning lines | `<p>` with "⚠" emoji | `<Badge variant="warning">` + text, or styled `<div>` |
| Error lines | `<p>` with "✗" text | `<Badge variant="destructive">` + text |
| Readiness per row | Emoji-based text (✓, ⚠, —) | `<Badge variant="success/warning/outline">` |
| Item list container | Raw `<div>` list | Keep as list but with `<Separator>` between sections |

### 8b. Add New Warnings

| Warning | Condition |
|---|---|
| Component without parent | Any row has `type=Component` in overrides but no `motherID` set |
| Parent references unresolved | `motherID` value doesn't match any import row `_rowId` or valid item ID format |
| Vendor not set | `vendor` is empty in both shared defaults and all row overrides |
| Status not explicitly set | No `status` in shared defaults (relies on implicit "Available" fallback) |

### 8c. Add New Blocking Errors

| Error | Condition |
|---|---|
| Circular parent reference | Row A's `motherID` = Row B's `_rowId`, and Row B's `motherID` = Row A's `_rowId` |

### 8d. Enhanced Item Preview

Show motherID assignment in the item preview list:
- Component rows should display: `"↳ Component of: <parentName>"` below the item name.
- Use `<Badge variant="info">Component</Badge>` next to the item name when `type=Component`.

### 8e. Convert to Composition API

Convert ImportPreCreateSummary from Options API to `<script setup>`.

---

## 9. MVP Scope Recommendation

**Goal:** Ship a clean, complete import flow with shadcn-vue consistency and correct per-row field coverage, including basic component assignment.

### MVP-2 Deliverables (in priority order)

| # | Task | Files Affected | Effort |
|---|---|---|---|
| 1 | **Remove dead import mode code** — delete `importMode` ref, mode selector template, mode CSS, prop from ReviewTable, `'parent'`/`'child'` comment. | ManageItemsPage.vue, InvoiceImportReviewTable.vue | Small |
| 2 | **Enhance shared defaults** — add Status, Can Borrow, Vendor, Project Linked fields. Migrate all inputs to shadcn (Select, Input, Checkbox). Wrap in Card. Convert to `<script setup>`. | InvoiceImportDefaults.vue | Medium |
| 3 | **Enhance per-row overrides** — add Warranty Onsite, Vendor, Project Linked, Mother ID fields. Migrate all inputs to shadcn. Add Badge for readiness/custom indicators. | ManageItemsPage.vue (Step 4 section) | Medium |
| 4 | **ReviewTable shadcn migration** — replace all raw controls with shadcn equivalents. Add inline unitPrice editing. Remove `importMode` prop. Convert to `<script setup>`. | InvoiceImportReviewTable.vue | Medium |
| 5 | **Fix `submitImportItems` payload** — add `vendor`, `motherID`, `projectLinked` to payload. Fix `canBorrow` cascade (respect `sd.canBorrow`). Add creation ordering (parents before children). Resolve import-row `_rowId` references to real `itemId` at submit time. | ManageItemsPage.vue | Medium |
| 6 | **PreCreateSummary shadcn migration** — replace all raw elements with shadcn. Add component-related warnings. Show motherID in item preview. Convert to `<script setup>`. | ImportPreCreateSummary.vue | Medium |
| 7 | **StepIndicator shadcn polish** — minor: no functional change needed, but could use Badge for step numbers. Low priority. | ImportStepIndicator.vue | Small |

### What's NOT in MVP-2

- No auto-linking parent `fixedComponents` on the backend.
- No type-ahead search for existing item IDs in the motherID field (just a text input + sibling row select).
- No drag-and-drop row reordering.
- No undo/redo for individual row actions.
- No batch override (apply one field value to multiple selected rows).

---

## 10. Deferred Scope

| Feature | Reason for Deferral |
|---|---|
| **Backend auto-link `fixedComponents`** | Requires careful update logic (what if parent doesn't exist yet? what about orphan cleanup?). Separate PR. |
| **Type-ahead search for motherID** | Needs a search API endpoint or client-side item cache. Nice-to-have, not blocking. |
| **Batch per-row overrides** | "Apply Type=Component to all selected rows" — useful for large invoices but not critical for first release. |
| **Excel column mapping** | Currently uses fixed column positions from invoiceNormalizer. A column-mapping step would improve flexibility but is a different feature. |
| **Import from multiple invoices** | Merge line items from different uploads. Out of scope. |
| **StepIndicator redesign** | Current horizontal stepper works. Could become a Tabs-style component later. |
| **Inline row reordering** | Drag to change creation order. Not needed if parent-before-child sorting is automatic. |
| **Persistent import drafts** | Save partial import to localStorage so user can resume later. Useful but separate feature. |

---

## 11. Implementation Order Recommendation

Execute MVP-2 tasks in the order listed in Section 9. Each task should be a self-contained commit.

```
Commit 1: Remove dead import mode code
           - Delete importMode ref, template selector, CSS, prop
           - Clean rowClass comment
           - Build passes, no behavior change

Commit 2: Enhance InvoiceImportDefaults
           - Add 4 missing fields (status, canBorrow, vendor, projectLinked)
           - Migrate all controls to shadcn (Select, Input, Checkbox)
           - Wrap in Card
           - Convert to <script setup>
           - Build passes

Commit 3: Enhance per-row overrides in Step 4
           - Add warrantyOnsite, vendor, projectLinked, motherID fields
           - Migrate all controls to shadcn
           - Add motherID: Select for sibling rows + Input for existing item ID
           - Add Badge for status indicators
           - Build passes

Commit 4: ReviewTable shadcn migration
           - Replace all raw controls with shadcn components
           - Add inline unitPrice editing
           - Remove importMode prop
           - Convert to <script setup>
           - Build passes

Commit 5: Fix submitImportItems payload
           - Add vendor, motherID, projectLinked to payload
           - Fix canBorrow cascade: ov.canBorrow ?? sd.canBorrow ?? true
           - Add parent-before-child creation ordering
           - Resolve _rowId references to real itemId
           - Build passes, manual test import flow

Commit 6: PreCreateSummary shadcn migration
           - Replace all elements with shadcn
           - Add component-related warnings
           - Show motherID in preview
           - Convert to <script setup>
           - Build passes

Commit 7 (optional): StepIndicator polish
           - Minor shadcn enhancements if time permits
```

### Risk Areas

| Risk | Mitigation |
|---|---|
| Parent-before-child ordering in submit | Simple topological sort: rows without motherID first, then rows with. No circular deps possible if validated in PreCreateSummary. |
| `_rowId` resolution | Map `_rowId` → `itemId` after parent creation. If creation fails, skip children and add to failures with clear message. |
| shadcn migration CSS conflicts | Each sub-component has scoped CSS. Replace `.import-review-btn` etc. with shadcn classes incrementally. Delete old CSS after migration. |
| Options API → Composition API | Straightforward conversion for these small components. Props become `defineProps`, emits become `defineEmits`, computed remains `computed()`. |

---

## Files to Modify

| File | Changes |
|---|---|
| `frontend/src/pages/ManageItemsPage.vue` | Remove importMode ref + mode selector template + CSS. Enhance Step 4 per-row overrides (add fields, shadcn). Fix submitImportItems payload + ordering. |
| `frontend/src/components/InvoiceImportReviewTable.vue` | Full shadcn migration. Remove importMode prop. Add inline price editing. Convert to `<script setup>`. |
| `frontend/src/components/InvoiceImportDefaults.vue` | Add 4 fields. Full shadcn migration. Wrap in Card. Convert to `<script setup>`. |
| `frontend/src/components/ImportPreCreateSummary.vue` | Full shadcn migration. Add component warnings. Enhanced preview. Convert to `<script setup>`. |
| `frontend/src/components/ImportStepIndicator.vue` | Minor polish only (optional). |

**No backend changes required for MVP-2.** The `createItem` controller already handles `motherID` and `vendor`. The only backend improvement (auto-linking `fixedComponents`) is deferred.
