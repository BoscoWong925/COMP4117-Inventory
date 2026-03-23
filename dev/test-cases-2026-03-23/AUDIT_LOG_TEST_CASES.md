# Audit Log Test Cases

Scope: `AuditLogPage.vue`, `auditLogController.js`, `auditService.getAllLogs/exportLogs/deleteLogs`, and related admin/operator role behavior.

## Coverage Matrix
- Filtering: time range / user / event(action) / date range / item
- Reset behavior
- Pagination and sorting
- Empty result handling
- Export behavior
- Email-related logs (`EMAIL_SENT`, `EMAIL_FAILED`, `EMAIL_SKIPPED`)
- Field correctness (`timestamp`, `action`, `target`/`affectedItemID`)

## Test Cases

| Test Case ID | What to Test | Steps | Correct Result | Wrong Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-LOG-001 | Initial load | 1) Open Audit Log page as admin/operator. | Logs load with total count and first page; sort defaults to latest first. | Empty table despite existing logs. | [ ] |
| TC-LOG-002 | Time-range filter | 1) Open `Time range` dropdown. 2) Select `15m`, `24h`, `7d`, `all`. | API sends `timeRange`; result window changes correctly by selected range. | Time dropdown value changes but dataset unchanged. | [ ] |
| TC-LOG-003 | Action-category filter | 1) Select action category (Login/Logout, Borrow Requests, Item Changes...). | API sends `actions` list; only matching actions appear. | Logs include unrelated action types. | [ ] |
| TC-LOG-004 | Search filter | 1) Enter known user/item/details keyword in Search box. | Debounced query sent as `search`; rows match user/details/item text. | Irrelevant rows shown or no debounce behavior. | [ ] |
| TC-LOG-005 | User ID specific filter | 1) Fill `User ID` field. | API sends `userID`; results restricted to matching user IDs. | Filter ignored or overlaps incorrectly with search. | [ ] |
| TC-LOG-006 | Item ID specific filter | 1) Fill `Item ID` field. | API sends `itemID`; affected target item logs shown. | Logs unrelated to target item appear. | [ ] |
| TC-LOG-007 | Date from/to filter | 1) Set `Date From` and `Date To`. | API sends `dateFrom`, `dateTo`; result bounded by selected day range (inclusive end day). | End date excludes same-day logs unexpectedly. | [ ] |
| TC-LOG-008 | Combined multi-filter accuracy | 1) Combine time + action + user + item + search. | Result satisfies all active filters; total updates correctly. | One or more filters silently ignored. | [ ] |
| TC-LOG-009 | Reset/Clear All behavior | 1) Apply multiple filters. 2) Click `Clear All`. | All filter states reset; request removes filter params; baseline dataset returns. | Residual hidden filters continue affecting results. | [ ] |
| TC-LOG-010 | Pagination requests | 1) Move from page 1 to page 2. | API sends updated `page` + `pageSize`; rows switch to correct page slice. | UI page label changes but data does not. | [ ] |
| TC-LOG-011 | Sort by timestamp | 1) Click Timestamp column sort toggle twice. | `sortField=timestamp`, `sortDir` flips; row order follows direction. | Visual arrow changes but order unchanged. | [ ] |
| TC-LOG-012 | Empty-result state | 1) Apply impossible filter combination. | `No logs found` empty-state shown; no stale rows. | Blank table without message. | [ ] |
| TC-LOG-013 | Export current filtered dataset | 1) Apply filters. 2) Click `Export to Excel`. | Export includes all matching rows (not only visible page) and expected columns. | Export ignores filters or exports only current page unexpectedly. | [ ] |
| TC-LOG-014 | Export field correctness | 1) Open exported file. | Columns include `Timestamp`, `User`, `Action`, `Details`, `Item ID`, `Old Value`, `New Value`; readable values. | Missing columns or wrong mapped values. | [ ] |
| TC-LOG-015 | Admin bulk delete logs | 1) Select multiple rows as admin. 2) Confirm delete modal. | Selected logs deleted; table refreshes; selection cleared; `AUDIT_LOGS_DELETED` entry generated. | Deletion fails silently or wrong logs deleted. | [ ] |
| TC-LOG-016 | Non-admin delete restriction | 1) Login as operator. | Delete controls not available; direct delete API blocked by authorization. | Operator can delete logs. | [ ] |
| TC-LOG-017 | Email log visibility | 1) Trigger operation that sends email (approve/reject/checkout/return). 2) Search `EMAIL_`. | Corresponding `EMAIL_SENT` (or failure variant) appears with meaningful details. | Email happened but no audit record appears. | [ ] |
| TC-LOG-018 | Email failure log visibility | 1) Simulate email delivery failure. | `EMAIL_FAILED` log exists with target info and error context. | Failure occurs without traceable audit entry. | [ ] |
| TC-LOG-019 | Field correctness: timestamp | 1) Perform known action now. 2) Verify top log timestamp. | Timestamp close to action time and formatted correctly in UI. | Large time offset or invalid date rendering. | [ ] |
| TC-LOG-020 | Field correctness: action code mapping | 1) Inspect varied actions (`BORROW_REQUEST_APPROVED`, `ITEM_RETURNED`, etc.). | Badge/action text maps correctly; raw action still traceable. | Wrong labels causing misleading audit interpretation. | [ ] |
| TC-LOG-021 | Field correctness: target linkage | 1) For item/user actions verify `affectedItemID` (or target in details). | Target field matches action subject consistently. | Target blank/incorrect for actions that should have target. | [ ] |
| TC-LOG-022 | Count/result/pagination consistency | 1) Note `totalLogs`, rows on current page, and page count after filtering. | Count and paginator align with API `total`; no negative/overflow pages. | `total` mismatched with visible pages/rows. | [ ] |
| TC-LOG-023 | Dropdown close behaviors | 1) Open Action/Time dropdown. 2) Click outside / press Esc. | Dropdown closes cleanly; no UI overlap corruption. | Dropdown remains stuck or blocks interaction. | [ ] |
| TC-LOG-024 | Error handling on log load/export/delete | 1) Simulate server error for each operation. | Clear error feedback shown; no crash; state remains recoverable. | Unhandled exceptions or broken page state. | [ ] |



## Additional Edge Cases

| Test Case ID | What to Test | Steps | Correct Result | Wrong Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-LOG-025 | Single event exact filtering | 1) Use action filter to isolate one event family. | Only expected action codes are included; no neighboring categories leak in. | Mixed unrelated actions appear under selected event filter. | [ ] |
| TC-LOG-026 | Reset after pagination | 1) Go to page >1 with filters active. 2) Click clear all. | Page resets to 1 and filterless baseline results shown. | Stays on high page and shows empty false-negative result. | [ ] |
| TC-LOG-027 | Email skipped logs visibility | 1) Trigger skip condition (no recipient/config skip path). | `EMAIL_SKIPPED` log visible with skip reason in details. | Skip occurs but no audit trace exists. | [ ] |
| TC-LOG-028 | Target field expectations by action type | 1) Compare item actions vs auth/system actions. | Item actions show target item ID; non-item actions show expected blank/placeholder consistently. | Random/incorrect target values shown for unrelated actions. | [ ] |
| TC-LOG-029 | Timestamp timezone consistency | 1) Compare API timestamp raw value and UI rendered value around day boundary. | Rendered time/date is consistent and does not shift to wrong day unexpectedly. | Off-by-one day/hour rendering causing wrong chronology. | [ ] |
| TC-LOG-030 | Sorting on non-default field | 1) Sort by action or user if supported by UI/API path. | Request contains intended `sortField/sortDir`; order follows sort. | Sort control ignored despite UI affordance. | [ ] |
| TC-LOG-031 | Export reflects active date range end-of-day logic | 1) Filter by dateTo for known final-day logs, then export. | Export includes logs through 23:59:59 of dateTo day. | Last-day logs missing in export but visible in table or vice versa. | [ ] |
| TC-LOG-032 | Delete error rollback UX | 1) Attempt delete with simulated failure. | Selection remains understandable, error shown, no partial UI data loss. | UI removes rows despite backend delete failure. | [ ] |


