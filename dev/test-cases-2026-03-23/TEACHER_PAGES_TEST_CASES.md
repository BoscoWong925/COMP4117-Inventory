# Teacher Pages Test Cases

Scope:
- `HomePage.vue` (teacher dashboard area)
- `TeacherRequestsPage.vue`
- `TeacherCheckoutPage.vue`
- `MyItemsPage.vue` (teacher mode)
- Related APIs: `teacher-pending`, `teacher-history`, request approval/checkout/deny/return

## Coverage Matrix
- Dashboard view and data cards
- Requests and checkout workflows
- Table paging/filtering
- Status display correctness
- Popup/modal behavior
- Empty-state and error prompts

## Test Cases

| Test Case ID | What to Test | Steps | Correct Result | Wrong Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-TP-001 | Teacher dashboard loads | 1) Login as teacher. 2) Open Home dashboard. | Teacher-specific cards/widgets render (owned items, pending requests, checkout indicators). | Admin/operator widgets shown incorrectly or teacher widgets missing. | [ ] |
| TC-TP-002 | Dashboard counts accuracy | 1) Compare displayed counts with source pages (`TeacherRequests`, `MyItems`). | Counts match underlying datasets. | Dashboard counters differ from list pages. | [ ] |
| TC-TP-003 | Dashboard navigation actions | 1) Click quick buttons/cards (Item Requests/My Items/Checkout). | Navigates to correct page and context. | Wrong target page or no navigation. | [ ] |
| TC-TP-004 | Teacher requests pending tab load | 1) Open `My Item Requests` pending tab. | Pending requests for teacher-owned items load with expected columns. | Missing requests or non-owned items included. | [ ] |
| TC-TP-005 | Approve request modal flow | 1) Click `Approve` in pending row. 2) Set return date and submit. | Request status changes to `Pending Check-Out`; modal closes; list refreshes. | Modal closes without state change or invalid status transition. | [ ] |
| TC-TP-006 | Reject request modal flow | 1) Click `Reject` in pending row. 2) Provide reason and submit. | Request becomes `Rejected`; pending list updates. | Reject appears successful but request remains pending. | [ ] |
| TC-TP-007 | Checkout tab action flow | 1) Switch to pending check-out tab. 2) Click `Borrowed Out`. | Request moves to `Approved`; item status `In-use`. | Request/item statuses become inconsistent. | [ ] |
| TC-TP-008 | Deny check-out flow | 1) In checkout tab click `Deny`, provide reason, submit. | Request becomes `Rejected`; item remains available. | Denied request still appears in checkout queue. | [ ] |
| TC-TP-009 | Bulk approve modal behavior | 1) Select multiple pending rows. 2) Open bulk approve. 3) Submit. | All selected rows processed; errors surfaced if partial failure. | Bulk modal confirms but no actual multi-row update. | [ ] |
| TC-TP-010 | Bulk reject modal behavior | 1) Select pending rows. 2) Bulk reject with reason. | Selected rows become rejected; selection resets. | Selection stale; rows not updated. | [ ] |
| TC-TP-011 | Bulk checkout modal behavior | 1) Select checkout rows. 2) Bulk borrowed out. | Selected rows become approved; queue updates. | Some rows remain pending checkout without feedback. | [ ] |
| TC-TP-012 | Bulk deny modal behavior | 1) Select checkout rows. 2) Bulk deny with reason. | Selected rows denied; state consistent post-refresh. | Mixed inconsistent outcomes not surfaced. | [ ] |
| TC-TP-013 | Select-all in pending tab | 1) Use header checkbox in pending tab. | Selects all pending rows in that tab only. | Selects wrong rows or spills into checkout selection. | [ ] |
| TC-TP-014 | Select-all in checkout tab | 1) Use header checkbox in checkout tab. | Selects all checkout rows only. | Cross-tab leakage in selected IDs. | [ ] |
| TC-TP-015 | Teacher history tab paging | 1) Open history tab. 2) Change pages. | Requests fetched with `page/pageSize`; rows reflect correct slice. | Same rows repeated across pages. | [ ] |
| TC-TP-016 | Teacher history status filtering | 1) Change history status (`All/Approved/Rejected/Returned`). | Filter applies and page resets to 1; total updates correctly. | Status filter ignored or stale page retained incorrectly. | [ ] |
| TC-TP-017 | Status badge correctness | 1) Verify statuses in pending/checkout/history tabs. | Badge text/colors align with underlying status value. | Wrong label/color causing operator confusion. | [ ] |
| TC-TP-018 | Email modal from request row | 1) Click email icon on request row. | Modal opens with borrower details and request-oriented subject. | Wrong recipient or missing context in subject. | [ ] |
| TC-TP-019 | Teacher checkout page load | 1) Open `Checkout / Returns` page as teacher. | Borrowed items table loads with stats and searchable list. | Broken load or incorrect borrowed dataset. | [ ] |
| TC-TP-020 | Teacher checkout return modal | 1) Click `Return` for a row. 2) Select condition + notes. 3) Confirm. | Request becomes returned and list refreshes; success feedback shown. | Return action fails silently or row remains unchanged. | [ ] |
| TC-TP-021 | Return requires condition | 1) Open return modal and submit empty condition. | Validation prompt shown; no API return request sent. | Empty condition accepted. | [ ] |
| TC-TP-022 | Teacher My Items owned tab | 1) Open `My Items` owned tab. | Owned items list and status controls (set In-use/Available) appear correctly. | Non-owned items shown or controls missing. | [ ] |
| TC-TP-023 | Teacher My Items status change | 1) Change one owned item status via row action. | Status updates and persists after reload. | Status appears changed only client-side. | [ ] |
| TC-TP-024 | Teacher My Items bulk status modals | 1) Select multiple owned items. 2) Bulk Set In-use / Set Available. | All selected rows update; modal cancel does not mutate state. | Bulk action updates wrong set or cancel still triggers changes. | [ ] |
| TC-TP-025 | Table paging with search interaction | 1) Go to page >1. 2) Use search input. | Page resets to 1 and filtered dataset shown. | Search performed on stale page with false empty results. | [ ] |
| TC-TP-026 | Empty state behavior | 1) Ensure no teacher-owned items/no pending requests. | Proper empty-state message shown per page/tab. | No explanatory message shown. | [ ] |
| TC-TP-027 | Error prompt behavior | 1) Simulate API failure (load/action). | Clear error feedback shown; UI remains interactive. | Silent failure or frozen UI. | [ ] |
| TC-TP-028 | Modal cancel/close consistency | 1) Open approve/reject/deny/bulk/return modals. 2) Cancel/close. | Modal closes and form fields reset as expected. | Stale input values leak into next open. | [ ] |



## Additional Edge Cases

| Test Case ID | What to Test | Steps | Correct Result | Wrong Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-TP-029 | Dashboard loading-state clarity | 1) Simulate slower API responses on teacher dashboard. | Loading indicators/messages appear and resolve cleanly to final state. | Blank section flicker or frozen loading indicator. | [ ] |
| TC-TP-030 | Dashboard empty-state fallback | 1) Teacher has zero owned items and zero pending requests. | Cards and helper empty text remain understandable; no broken counts. | NaN/undefined counters or broken layout. | [ ] |
| TC-TP-031 | Modal outside-click behavior | 1) Open modal and click overlay blank area (if supported by modal design). | Close behavior follows intended design consistently. | Inconsistent close behavior across modals. | [ ] |
| TC-TP-032 | Validation persistence in modals | 1) Trigger validation error, then correct value and resubmit. | Error clears after valid input; successful submit proceeds. | Error persists and blocks valid submit. | [ ] |
| TC-TP-033 | Error prompt specificity on forbidden actions | 1) Attempt teacher action on non-owned item through direct request. | Clear permission-denied message shown to user. | Generic unknown error with no actionable info. | [ ] |
| TC-TP-034 | Tab-switch state reset safety | 1) Enter modal input on one tab. 2) Cancel and switch tabs. | State does not leak into other tab actions/modals. | Old form data appears in unrelated modal flow. | [ ] |
| TC-TP-035 | Search + pagination in My Items owned tab | 1) Select page >1 then search by item name. | Page resets and filtered set is accurate with proper total/page controls. | Empty false-negative due to stale page index. | [ ] |
| TC-TP-036 | Bulk status operation error handling | 1) Force one status update fail inside bulk set operation. | User sees error indication; successful rows are clear and data refreshes reliably. | Silent partial failure with misleading success perception. | [ ] |


