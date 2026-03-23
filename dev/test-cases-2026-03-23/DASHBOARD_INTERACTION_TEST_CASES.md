# Dashboard Interaction Test Cases

Scope: `HomePage.vue` + `components/ui/DropdownMenu.vue` (Admin/Operator dashboard attention table interactions).

## Required Coverage
- Dropdowns (`Actions`, `Columns`)
- Filter toggle/reset
- Checkbox select all / deselect
- Bulk actions
- Row 3-dot actions
- Click blank area to close menus
- z-index/overflow clipping safety
- Selection state across pagination

## Test Cases

| Test Case ID | What to Test | Steps | Correct Result | Wrong Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-DBI-001 | Actions dropdown visibility condition | 1) Ensure no rows selected. 2) Select one row. | `Actions` dropdown appears only when `selectedRows.size > 0`. | Actions menu visible with zero selection or hidden with selection. | [ ] |
| TC-DBI-002 | Actions dropdown open/close | 1) Click `Actions`. 2) Click trigger again. | Menu toggles open/close reliably. | Trigger click does nothing or stuck menu state. | [ ] |
| TC-DBI-003 | Columns dropdown toggles column visibility | 1) Open `Columns`. 2) Toggle `Item/User/Status/Date/Priority/Type`. | Table header + row cells update immediately to match toggles. | Header/body mismatch or column not actually hidden. | [ ] |
| TC-DBI-004 | Filter dropdown activation dot | 1) Open Filter and set Priority/Status. | Filter button shows active indicator; active tags rendered below toolbar. | Filters active but no visual indicator. | [ ] |
| TC-DBI-005 | Filter reset from dropdown | 1) Set one or more filters. 2) Use `Clear All Filters` in dropdown. | `filterPriority` and `filterStatus` reset; list returns to tab-only set. | Filters appear reset but dataset still filtered. | [ ] |
| TC-DBI-006 | Filter-tag individual remove | 1) With active filters, click `×` on one tag. | Only that filter is cleared; remaining filter still applies. | Clearing one tag removes all filters or none. | [ ] |
| TC-DBI-007 | Header checkbox select-all page scope | 1) On paged table, click header checkbox. | Selects all rows on current page only. | Selects hidden rows from other pages unexpectedly. | [ ] |
| TC-DBI-008 | Header checkbox indeterminate state | 1) Select subset of rows on current page. | Header checkbox shows indeterminate state. | Header checkbox looks unchecked or fully checked incorrectly. | [ ] |
| TC-DBI-009 | Deselect-all current page | 1) Select all current page rows. 2) Click header checkbox again. | Current-page selections clear; other-page selections remain by design. | All global selections wiped unexpectedly. | [ ] |
| TC-DBI-010 | Row checkbox toggle persistence | 1) Select row A, deselect row A. | Selection set updates exactly with user action. | Row remains selected visually or in bulk count after deselect. | [ ] |
| TC-DBI-011 | Bulk count correctness | 1) Select/deselect several rows across page. | Bulk count label equals number of selected IDs in set. | Count mismatch (off by one or stale). | [ ] |
| TC-DBI-012 | Bulk action availability by tab | 1) Switch attention tabs (All/Returns/Requests/Inventory) with selection. | Actions menu shows relevant grouped actions for active context. | Wrong action group shown for current tab context. | [ ] |
| TC-DBI-013 | Bulk approve/reject fallback behavior | 1) In requests context select rows and trigger bulk approve/reject. | Expected current behavior message shown (not supported from dashboard) without crash. | Silent no-op or crash due to unsupported action. | [ ] |
| TC-DBI-014 | Row 3-dot (kebab) menu open | 1) Click row kebab button. | Context menu opens near row action cell. | Menu opens off-screen or wrong row context. | [ ] |
| TC-DBI-015 | Row 3-dot action navigation | 1) Trigger `View Details`/page-navigation action from menu. | Navigates to intended page and closes menu. | Wrong route or menu remains overlaying next page. | [ ] |
| TC-DBI-016 | Row inline approve action | 1) Use row 3-dot -> Approve in request row context. | Inline approve modal opens with target ID set; submit updates state. | Modal not tied to selected row or wrong request updated. | [ ] |
| TC-DBI-017 | Row inline reject action | 1) Use row 3-dot -> Reject in request row context. | Inline reject modal opens and updates correct request after submit. | Reject applies to wrong row or fails silently. | [ ] |
| TC-DBI-018 | Click blank area closes dropdown | 1) Open any dropdown. 2) Click outside menu/trigger. | Menu closes due to outside-click listener/backdrop behavior. | Dropdown remains open and blocks UX. | [ ] |
| TC-DBI-019 | Escape key closes dropdown | 1) Open dropdown. 2) Press `Esc`. | Dropdown closes immediately. | Esc does nothing. | [ ] |
| TC-DBI-020 | z-index overlay hierarchy | 1) Open dropdown over table with sticky/scrolling content. | Menu appears above table and remains clickable. | Menu appears behind rows/cards. | [ ] |
| TC-DBI-021 | Overflow clipping prevention | 1) Open menu near right/bottom edges and inside scroll container. | Menu not clipped by parent overflow (teleport to body works). | Menu cropped/truncated by table container. | [ ] |
| TC-DBI-022 | Pagination with selected rows | 1) Select rows on page 1. 2) Move to page 2. | Selection state remains consistent with design; bulk count reflects accumulated selections. | Selections unexpectedly lost or duplicated. | [ ] |
| TC-DBI-023 | Selection after filter/tab change | 1) Select rows then switch filter/tab. | Selection cleared/reset as designed (`selectedRows.clear()` on tab/filter changes). | Hidden stale selections remain and trigger wrong bulk actions. | [ ] |
| TC-DBI-024 | Toolbar responsiveness under many controls | 1) Narrow viewport width. 2) Use actions/filter/columns menus. | Controls remain usable, menus accessible, no overlap preventing clicks. | Controls overlap and menus inaccessible. | [ ] |
| TC-DBI-025 | Empty-state interaction safety | 1) Apply strict filter to produce no rows. | Empty state shown; no invalid bulk/row actions remain visible. | Old selected state or bulk controls still active without rows. | [ ] |


## Additional Edge Cases

| Test Case ID | What to Test | Steps | Correct Result | Wrong Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-DBI-026 | Filter menu toggle state | 1) Rapidly open/close filter dropdown multiple times. | State remains stable without duplicated overlays. | Multiple ghost overlays or unclickable UI remains. | [ ] |
| TC-DBI-027 | Columns dropdown with hidden critical columns | 1) Hide multiple columns including Item/Status then restore. | Table remains structurally valid and fully restorable. | Broken row alignment or unrecoverable hidden columns. | [ ] |
| TC-DBI-028 | Kebab menu + scroll position | 1) Open row menu near bottom, scroll table/container. | Menu behavior remains usable and not detached from interaction context. | Menu position becomes unusable/off-screen unexpectedly. | [ ] |
| TC-DBI-029 | Outside-click close with nested controls | 1) Open dropdown, click on non-menu interactive area (table row/cell). | Dropdown closes and target click behaves correctly once. | Click swallowed or requires double click due to stuck backdrop. | [ ] |
| TC-DBI-030 | ESC close while multiple dropdowns toggled sequentially | 1) Open one dropdown then another, press Esc. | Active dropdown closes cleanly; no orphan overlays remain. | Esc leaves stale layer blocking interactions. | [ ] |
| TC-DBI-031 | Selection state after page size/effective list shrink | 1) Select rows, then apply filter shrinking dataset. | Selection set safely reconciles (no dangerous hidden selections). | Bulk count references rows no longer in actionable dataset. | [ ] |
| TC-DBI-032 | Bulk count after tab reset logic | 1) Select rows then change tab/filter that triggers clear. | Bulk count returns to zero immediately and reliably. | Count remains nonzero after reset condition. | [ ] |
| TC-DBI-033 | Z-index over modal coexistence | 1) Open dropdown, then open inline modal action quickly. | Modal takes interaction priority correctly; dropdown closes/does not block modal. | Dropdown/backdrop overlays modal controls. | [ ] |
| TC-DBI-034 | Overflow clipping on narrow viewport | 1) Resize to narrow width and open right-aligned dropdown near edge. | Menu remains visible within viewport with usable entries. | Menu clipped outside viewport with unreachable actions. | [ ] |
| TC-DBI-035 | Page-change selection intent transparency | 1) Select on page1, go page2, observe UX cues. | User can clearly understand whether selection is cross-page; no hidden-danger bulk action ambiguity. | Hidden selection causes surprise bulk operation scope. | [ ] |
| TC-DBI-036 | No-data + dropdown safeguards | 1) Force empty dataset and attempt to open actions controls. | Actions requiring selection remain unavailable; no errors in console/UX. | Dropdown appears with invalid actions despite zero rows. | [ ] |


