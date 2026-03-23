# Requests Workflow Test Cases

Scope: `ApproveRequestsPage.vue`, `TeacherRequestsPage.vue`, `TeacherCheckoutPage.vue`, `LentOutFilterPage.vue`, backend `borrowRequestController.js` status transitions.

## Coverage Matrix
- Approval / Reject / Checkout / Return / Deny checkout
- Status transition rules
- Pagination + filtering interactions
- Batch operations
- Error handling and validation prompts

## Expected Status Transition Model
- `Pending` -> `Pending Check-Out` (approve)
- `Pending` -> `Rejected` (reject)
- `Pending Check-Out` -> `Approved` (physical checkout)
- `Pending Check-Out` -> `Rejected` (deny checkout)
- `Approved` -> `Returned` (return)

## Test Cases

| Test Case ID | What to Test | Steps | Correct Result | Wrong Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-REQ-001 | Approve pending request | 1) Open pending requests. 2) Approve one request with return date. | Request moves to `Pending Check-Out`; approval date set; audit logs recorded. | Request stays `Pending` or jumps directly to wrong state. | [ ] |
| TC-REQ-002 | Reject pending request | 1) Open pending request. 2) Reject with reason. | Request status becomes `Rejected`; rejection reason stored; audit log recorded. | Missing reason handling or status unchanged. | [ ] |
| TC-REQ-003 | Approve requires return date | 1) Open approve modal. 2) Submit without date. | Validation blocks submit with clear prompt. | Approve succeeds without required date. | [ ] |
| TC-REQ-004 | Reject requires reason | 1) Open reject modal. 2) Submit empty reason. | Validation prompt shown; no API state change. | Empty rejection reason accepted silently. | [ ] |
| TC-REQ-005 | Checkout request from Pending Check-Out | 1) In checkout tab, click `Borrowed Out`. | Status becomes `Approved`; related item status becomes `In-use`; borrower assigned on item. | Request changes but item status remains available/inconsistent. | [ ] |
| TC-REQ-006 | Deny checkout | 1) In checkout tab, deny with reason. | Request becomes `Rejected`; item remains/returns `Available`; audit log recorded. | Item incorrectly set to `In-use` after denial. | [ ] |
| TC-REQ-007 | Return approved request | 1) From return flow (`TeacherCheckout`/`LentOutFilter`), return an approved request with condition. | Request becomes `Returned`; item status to `Available`; borrower cleared; optional location updated. | Request returned but item still `In-use` or borrower not cleared. | [ ] |
| TC-REQ-008 | Invalid transition blocked | 1) Try checkout on non-`Pending Check-Out`. 2) Try return on non-`Approved`. | API returns clear bad-request error; UI shows failure feedback. | Invalid transition incorrectly succeeds. | [ ] |
| TC-REQ-009 | Competing request auto-reject on approve | 1) Create multiple pending requests for same item. 2) Approve one. | Others auto-reject with audit trail; response includes `autoRejectedCount` behavior. | Multiple requests remain pending for same item. | [ ] |
| TC-REQ-010 | Parent-child cascade approve | 1) Approve parent request with linked components. | Child requests auto-move to `Pending Check-Out`; relevant logs created. | Parent updated but children remain stale. | [ ] |
| TC-REQ-011 | Parent-child cascade reject | 1) Reject parent request with linked components. | Child requests auto-rejected and logged. | Child rows remain pending. | [ ] |
| TC-REQ-012 | Parent-child cascade checkout | 1) Checkout parent in `Pending Check-Out`. | Parent + child requests become `Approved`; parent + child items set `In-use`. | Child item/request states not synchronized. | [ ] |
| TC-REQ-013 | Parent-child cascade return | 1) Return parent approved request. | Parent + children become `Returned`; all related items become `Available`. | Partial return leaves child items `In-use`. | [ ] |
| TC-REQ-014 | Pending table pagination | 1) Use pagination on pending tab. | Rows move page-by-page correctly; no duplication across pages. | Same rows reappear on different pages unexpectedly. | [ ] |
| TC-REQ-015 | Checkout table pagination | 1) Use pagination on pending checkout tab. | Correct dataset and counts for checkout slice. | Pagination tied to wrong dataset. | [ ] |
| TC-REQ-016 | Teacher history filter + paging interaction | 1) In `TeacherRequests` history, filter by status then page. | Filter remains active while paging; API query contains both `status` and page params. | Paging resets/loses filter unexpectedly. | [ ] |
| TC-REQ-017 | Bulk approve operation | 1) Select N pending rows. 2) Bulk approve with return date. | All selected move to `Pending Check-Out`; failures surfaced clearly per item if any. | Partial success without user visibility or wrong count. | [ ] |
| TC-REQ-018 | Bulk reject operation | 1) Select N pending rows. 2) Bulk reject with reason. | All selected become `Rejected`; selection cleared after success. | Selection persists with stale state or silent failures. | [ ] |
| TC-REQ-019 | Bulk checkout operation | 1) Select N checkout rows. 2) Bulk `Borrowed Out`. | Selected requests become `Approved`; related items become `In-use`. | Only some rows update without error report. | [ ] |
| TC-REQ-020 | Bulk deny operation | 1) Select N checkout rows. 2) Bulk deny with reason. | Selected requests become `Rejected`; items available; proper feedback shown. | State mismatch between request and item after bulk deny. | [ ] |
| TC-REQ-021 | Select-all behavior per tab | 1) In pending and checkout tabs, use header checkbox. | Select-all applies to current tab dataset only. | Selection leaks across tab datasets unexpectedly. | [ ] |
| TC-REQ-022 | Email action modal from request row | 1) Click email icon on request row. | Modal opens with borrower identity prefilled and request-context subject. | Wrong recipient/context in modal. | [ ] |
| TC-REQ-023 | Error handling on approve/reject/checkout/return | 1) Simulate API failure for each action. | Clear error prompt shown; row state unchanged on failure. | UI shows success despite backend failure. | [ ] |
| TC-REQ-024 | Auto-expire pending checkout (backend job endpoint) | 1) Create stale `Pending Check-Out` older than threshold. 2) Run auto-expire endpoint. | Requests auto-change to `Rejected`; response returns expired count. | Stale requests remain pending checkout. | [ ] |
| TC-REQ-025 | Declare return date validation | 1) For approved request, set declared date after required return date. | API/UI reject with clear message; no invalid save. | Invalid late declared date accepted. | [ ] |
| TC-REQ-026 | Empty states per tab | 1) Ensure no data for pending/checkout/history views. | Correct empty-state message shown per tab. | Table shell shown with no context message. | [ ] |




## Additional Edge Cases

| Test Case ID | What to Test | Steps | Correct Result | Wrong Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-REQ-027 | Teacher ownership authorization checks | 1) As teacher, try to approve/reject/checkout item not owned by current teacher. | API blocks action with forbidden message; no state mutation. | Teacher can process non-owned items. | [ ] |
| TC-REQ-028 | Modal cancel does not mutate request state | 1) Open approve/reject/deny modal. 2) Cancel. | Request state unchanged; no API action call fired. | Cancel still triggers backend state changes. | [ ] |
| TC-REQ-029 | Bulk operation partial failure visibility | 1) Force one ID in selected batch to fail while others succeed. | UI reports failure context and final state is transparent (which rows updated/failed). | User sees only generic success with hidden partial failures. | [ ] |
| TC-REQ-030 | Tab switch with active selection | 1) Select rows in pending tab. 2) Switch to checkout tab. | Selection handling is safe/clear per tab; no cross-tab accidental bulk target. | Selection from prior tab applied to current tab actions. | [ ] |
| TC-REQ-031 | Pagination + bulk target correctness | 1) Select rows on page 1, then page 2. 2) Perform bulk action. | Bulk action applies exactly to selected IDs across pages as intended. | Bulk action targets wrong set (page-local/global mismatch). | [ ] |
| TC-REQ-032 | Return with location update propagation | 1) Return parent request and specify new location (where applicable). | Parent and child item locations update consistently after return. | Request returned but location updates are missing/inconsistent. | [ ] |
| TC-REQ-033 | Deny checkout reason optional/required behavior | 1) Submit deny with empty reason then with reason. | Behavior matches implementation rules and user feedback is clear. | UI/API mismatch on reason requirement causing confusion. | [ ] |
| TC-REQ-034 | Auto-reject details audit quality | 1) Approve one of competing requests. 2) Inspect rejected siblings. | Auto-rejected requests include clear notes referencing approved request context. | Rejected siblings lack traceable reason metadata. | [ ] |
| TC-REQ-035 | Error recovery without page reload | 1) Cause action failure. 2) Correct input/retry same action. | Retry succeeds and table updates without full reload. | App remains stuck in broken modal/state until refresh. | [ ] |
| TC-REQ-036 | Email side-effects for request lifecycle | 1) Execute approve/reject/checkout/deny/return happy paths. | Corresponding email-triggered audit events (`EMAIL_SENT`/others) appear as expected. | Lifecycle action succeeds but side-effect logging absent. | [ ] |


