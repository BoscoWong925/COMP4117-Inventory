# Inventory Workflow Test Cases

Scope: `ManageItemsPage.vue`, `itemController.js`, `services.js` (`inventoryService.getAllItems`, `updateItem`, `updateItemStatus`, `importItems`), and related UI modals.

## Coverage Matrix
- List load + backend paging (`page`, `pageSize`, `total`)
- Filtering + sort query mapping
- View/Edit item flow
- Status change flow
- Export/Import behavior
- Empty state and error prompt handling

## Test Cases

| Test Case ID | What to Test | Steps | Correct Result | Wrong Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-INV-001 | Initial list load | 1) Login as admin/operator. 2) Open Inventory Items page. | Table loads first page; total count shown; pagination visible when `total > pageSize`. | Blank table, stale data, or no pagination when needed. | [ ] |
| TC-INV-002 | Backend paging request mapping | 1) On page 1, open Network tab and observe `/api/items`. 2) Change to page 2. | Requests include `page` and `pageSize`; result reflects selected page. | UI page changes but request still uses old page or fixed page 1. | [ ] |
| TC-INV-003 | Pagination count consistency | 1) Compare header total with rows and pagination controls across pages. | `total` from API matches paginator total; row count per page <= `pageSize`. | Header total inconsistent with paginator or duplicate/missing rows between pages. | [ ] |
| TC-INV-004 | Filter panel toggle behavior | 1) Click `Filters`. 2) Hide and show again. | Panel visibility toggles correctly; existing filter values persist unless cleared. | Filter panel state broken or values reset unexpectedly. | [ ] |
| TC-INV-005 | Text filter query mapping (debounced) | 1) Type `itemId`/`name`/`supplier` text quickly. 2) Observe request params after debounce. | Single debounced request sent; maps to `itemId`, `name`, `supplier` query params. | Multiple excessive requests or wrong/missing query keys. | [ ] |
| TC-INV-006 | Select filter query mapping | 1) Set `type/category/status/location/vendor/warrantyEnd`. 2) Observe `/api/items` params. | Each UI field maps to backend filter key as implemented. | One or more select filters not reflected in request. | [ ] |
| TC-INV-007 | Combined filtering correctness | 1) Apply 3+ filters together. | Returned rows satisfy all active criteria; total updates accordingly. | Rows violate one or more active filters. | [ ] |
| TC-INV-008 | Clear all filters reset behavior | 1) Apply multiple filters + warranty status banner filter. 2) Click `Clear All` and clear status banner. | Filter model resets to defaults; list returns to unfiltered result set. | Some filters remain silently active. | [ ] |
| TC-INV-009 | Sort toggle behavior | 1) Click sortable headers (`type/status/location/supplier/warrantyEnd`) repeatedly. | Sort icon and order toggle asc/desc; request contains `sortBy`, `sortDir`. | Icon toggles but data order unchanged or wrong field sorted. | [ ] |
| TC-INV-010 | Open edit form with correct data | 1) Click `Edit` for an item. | Form opens with current item values prefilled; immutable/generated fields not incorrectly overwritten. | Empty/wrong prefill; unrelated fields changed. | [ ] |
| TC-INV-011 | Update item success | 1) Edit name/location/description. 2) Save. | Update succeeds; table shows new values; persists after refresh. | UI shows change temporarily but backend still old after refresh. | [ ] |
| TC-INV-012 | Add item success | 1) Click `+ Add Item`. 2) Fill required fields and submit. | New item created with generated `itemId`; appears in list and affects total count. | Submit succeeds but row not present or total unchanged. | [ ] |
| TC-INV-013 | Required field validation | 1) Submit add form without `name` or `universityID`. | Submission blocked with clear prompt; no API create request. | Invalid create request sent or silent failure. | [ ] |
| TC-INV-014 | Delete single available item | 1) Delete an item with non-`In-use` status. | Item removed; list refreshes; total count decrements. | Item remains or ghost row persists. | [ ] |
| TC-INV-015 | Delete blocked for in-use item | 1) Attempt delete on `In-use` item. | Block modal appears; deletion prevented. | Item deleted despite `In-use` state. | [ ] |
| TC-INV-016 | Bulk delete selected items | 1) Select multiple rows. 2) Confirm bulk delete modal. | Selected deletable items removed; selection clears; list reloads. | Wrong rows deleted, selection not cleared, or no refresh. | [ ] |
| TC-INV-017 | Select-all checkbox scope | 1) Use header checkbox on current page. | Selects/deselects visible page rows only (matching current list). | Select-all includes hidden rows unexpectedly or misses visible rows. | [ ] |
| TC-INV-018 | Status change API constraints | 1) Change status through edit/status controls (admin/operator/teacher cases if applicable). | Backend accepts only permitted transitions by role; unauthorized updates blocked with error. | Unauthorized user can change restricted statuses. | [ ] |
| TC-INV-019 | Export current list | 1) Apply filters/sort. 2) Click `Export`. | Excel exported with currently displayed dataset/fields and readable values. | Export ignores active filters or contains malformed columns. | [ ] |
| TC-INV-020 | Import Excel success path | 1) Import valid Excel file with multiple rows. | Success message shows count; new items inserted; list refreshes. | Import says success but missing rows or parsing errors silently ignored. | [ ] |
| TC-INV-021 | Import Excel error path | 1) Upload empty/invalid Excel file. | Error toast/message displayed; no partial corrupt insertions. | No error shown or partial bad data inserted. | [ ] |
| TC-INV-022 | Empty-state rendering | 1) Apply strict filters producing zero items. | `No items in inventory` (or equivalent) empty state appears; table hidden. | Blank UI or stale rows remain. | [ ] |
| TC-INV-023 | Load failure error prompt | 1) Simulate API failure for `/api/items`. | User receives clear failure indication; app does not crash. | Silent failure, frozen spinner, or hard crash. | [ ] |
| TC-INV-024 | Warranty status quick filter behavior | 1) Trigger page param/status banner (`warranty-expired` or `expiring-soon`). | Banner reflects active filter; API uses `warrantyStatus`; clear returns normal set. | Banner shown but query not applied (or vice versa). | [ ] |


## Additional Edge Cases

| Test Case ID | What to Test | Steps | Correct Result | Wrong Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-INV-025 | Paging boundary: last page partial rows | 1) Navigate to final page when total is not multiple of pageSize. | Last page shows remaining rows only; no phantom empty placeholders. | Extra duplicate rows or missing tail rows. | [ ] |
| TC-INV-026 | Filter + sort interaction stability | 1) Apply filters then sort. 2) Change page and back. | Same query intent preserved (`filter + sort + page`), with consistent ordering. | Sorting resets unexpectedly or filters drop on page change. | [ ] |
| TC-INV-027 | Edit cancel behavior | 1) Open edit form and change fields. 2) Click cancel/back. | No update sent; list values remain unchanged. | Dirty form values accidentally persisted. | [ ] |
| TC-INV-028 | Export when zero results | 1) Apply filters to zero results. 2) Click export. | Export handles empty dataset gracefully (empty file with headers or clear warning). | Export crashes or generates corrupted file. | [ ] |
| TC-INV-029 | Backend validation error prompt on update | 1) Force backend reject on update payload (invalid field/state). | UI shows actionable error; edit form remains recoverable for correction. | Generic silent failure or form closes as if successful. | [ ] |
| TC-INV-030 | Import duplicate/conflict handling | 1) Import sheet with entries likely causing conflicts. | Conflicts are reported clearly; unaffected valid rows behavior is explicit. | Import reports full success despite failed rows. | [ ] |
| TC-INV-031 | Selection reset after filter change | 1) Select rows, then apply new filter. | Selection is cleared or remains only for visible valid rows per intended behavior, without unsafe bulk target drift. | Hidden stale selections trigger wrong bulk delete target. | [ ] |
| TC-INV-032 | Error recovery after failed load | 1) Trigger load error, then restore API and retry action (e.g., page change/filter). | Page recovers without reload; latest data appears. | Requires hard refresh to recover. | [ ] |


