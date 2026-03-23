# Backend Paging / Filtering Checklist

Purpose: verify API contract and UI integration consistency for paginated/filterable endpoints.

Applicable endpoints:
- `GET /api/items`
- `GET /api/items/available`
- `GET /api/items/lent-out`
- `GET /api/items/by-owner/:ownerId`
- `GET /api/audit-logs`
- `GET /api/borrow-requests`
- `GET /api/borrow-requests/my`
- `GET /api/borrow-requests/teacher-history`
- `GET /api/users`

## Contract Checklist (API Response & Query Behavior)

| Check ID | What to Check | How to Validate | Correct Result | Wrong Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-PG-001 | Response includes page metadata | Call endpoint with `page` + `pageSize`. | Response includes `page`, `pageSize`, `total`, and data array. | Missing one or more paging fields. | [ ] |
| TC-PG-002 | `limit` compatibility expectation | Call endpoint with `limit` only and with `pageSize` only. | If `limit` unsupported, behavior documented; `pageSize` works consistently. | Silent mismatch causing confusing page sizes. | [ ] |
| TC-PG-003 | `totalPages` field expectation | Inspect response for `totalPages`. | Either provided explicitly OR consistently computed in UI as `ceil(total/pageSize)`. | UI assumes `totalPages` but API never provides it, causing wrong pagination UI. | [ ] |
| TC-PG-004 | Page bounds low edge | Request `page=1`. | First page returned, no errors. | Empty/error despite existing records. | [ ] |
| TC-PG-005 | Page bounds high edge | Request page far beyond range. | Returns empty data with valid `total`; no crash. | 500 error or incorrect non-empty data. | [ ] |
| TC-PG-006 | Stable total across pages | Fetch page 1 and page 2 with same filters quickly. | `total` remains consistent (except concurrent writes). | `total` fluctuates unexpectedly without data changes. | [ ] |
| TC-PG-007 | Filtering query param mapping | For each UI filter, inspect outbound params. | Parameter names match backend controller keys exactly. | UI uses wrong keys (filter appears ineffective). | [ ] |
| TC-PG-008 | Combined filters logic | Send multi-filter query (3+ params). | Result respects AND/OR logic as documented in controller implementation. | One filter overrides others incorrectly. | [ ] |
| TC-PG-009 | Text search behavior | Send `search` with mixed case partial terms. | Case-insensitive matching works as expected. | Case-sensitive or inconsistent matching. | [ ] |
| TC-PG-010 | Sort mapping | Send `sortBy`, `sortDir`. | Results ordered by requested field/direction. | Sort params ignored or applied to wrong field. | [ ] |
| TC-PG-011 | Date range filtering | Send `dateFrom/dateTo` or equivalent. | Inclusive range behavior consistent and predictable. | Off-by-one-day or timezone surprises unhandled. | [ ] |
| TC-PG-012 | Empty result shape | Query that returns no rows. | Returns empty array + valid metadata (`total=0` or filtered total). | Returns null/malformed data structure. | [ ] |

## UI Integration Checklist (Paging/Filtering Interaction)

| Check ID | What to Check | How to Validate | Correct Result | Wrong Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-PG-013 | Page switch sends request | Click paginator next/previous/page number in UI. | New API request sent with updated page. | UI page number changes only locally; no network call. | [ ] |
| TC-PG-014 | Filter change resets page | Go to page >1 then change filter. | UI resets to page 1 before requesting new filtered set. | Requests filtered data on stale high page causing false empty result. | [ ] |
| TC-PG-015 | Reset behavior clears query params | Apply filters then click `Clear All`. | Subsequent request omits cleared filter params. | Cleared fields still sent in query. | [ ] |
| TC-PG-016 | Count/result/pagination consistency | Compare `total`, rows rendered, and pager pages. | Consistent with `total` and `pageSize`. | Pager pages don’t match total count. | [ ] |
| TC-PG-017 | Debounced text search behavior | Type quickly in search field. | Debounced API calls (no flood), final term reflected in request. | Unbounded request spam or stale result race. | [ ] |
| TC-PG-018 | Cross-tab dataset isolation | In pages with tabs, switch tab then paginate/filter. | Each tab uses correct dataset and counters. | Tab A pagination/filter state pollutes Tab B unexpectedly. | [ ] |
| TC-PG-019 | Selected rows vs page changes | Select rows on one page then change page. | Selection behavior follows intended scope (page-scoped/global-scoped) consistently. | Hidden selections cause incorrect bulk actions without user awareness. | [ ] |
| TC-PG-020 | Empty result UX | Force zero result via filters. | Empty-state message shown with clear reset path. | Blank table region or confusing stale totals. | [ ] |

## Endpoint-Specific Mapping Checks

| Check ID | Endpoint | Key Params to Verify | Correct Result | Wrong Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-PG-021 | `/api/items` | `page,pageSize,sortBy,sortDir,status,type,category,location,vendor,supplier,itemId,name,universityID,description,warrantyEnd,warrantyStatus` | All mapped correctly from Inventory page filters/sort. | Missing or mismatched params. | [ ] |
| TC-PG-022 | `/api/audit-logs` | `page,pageSize,sortField,sortDir,timeRange,actions,search,userID,itemID,dateFrom,dateTo` | Audit page filter controls map correctly. | One or more filters no-op due to wrong param names. | [ ] |
| TC-PG-023 | `/api/borrow-requests` | `page,pageSize,status,search,borrowerId,date ranges,sortBy,sortDir` | Requests page interactions produce expected backend filters. | Status/search/paging collisions produce incorrect queues. | [ ] |
| TC-PG-024 | `/api/borrow-requests/teacher-history` | `page,pageSize,status,sortBy,sortDir` | Teacher history tab respects status filter and pagination. | History tab ignores status or page changes. | [ ] |
| TC-PG-025 | `/api/users` | `page,pageSize,displayRole,isActive,search,sortBy,sortDir` | Account-management list remains consistent after filter/page/reset. | Totals and pages drift from backend response. | [ ] |


## Explicit API Field Checklist (page/limit/total/totalPages)

| Check ID | Endpoint | What to Verify | Correct Result | Wrong Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-PG-026 | All paged endpoints | `page` field in response | Numeric `page` matches requested page. | Missing/wrong `page` value. | [ ] |
| TC-PG-027 | All paged endpoints | `pageSize` or `limit` response compatibility | Returned page-size field matches effective result page size. | Response size field absent/inconsistent with actual rows. | [ ] |
| TC-PG-028 | All paged endpoints | `total` field correctness | `total` equals count of full filtered dataset (not current page length). | `total` equals page row count only. | [ ] |
| TC-PG-029 | UI expectation | `totalPages` handling | If API omits `totalPages`, UI computes `ceil(total/pageSize)` consistently. | UI assumes `totalPages` exists and renders broken pagination. | [ ] |
| TC-PG-030 | Request param compatibility | `limit` alias behavior | If `limit` unsupported, behavior is explicitly documented and not silently misleading. | `limit` accepted in some endpoints only without documentation. | [ ] |

## Additional Consistency / Reset Checks

| Check ID | What to Check | How to Validate | Correct Result | Wrong Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-PG-031 | UI page switch request payload | Navigate pages while filters active. | Outgoing request always carries current `page` + active filters. | Page-switch request drops active filters unexpectedly. | [ ] |
| TC-PG-032 | Reset restores default sort/order | Apply custom sort+filters then reset. | Request returns to default sorting/filter baseline. | Reset clears filter only but keeps stale hidden sort unexpectedly. | [ ] |
| TC-PG-033 | Count/result/pagination after reset | Compare before/after reset. | Count, visible rows, and page controls return to baseline consistency. | Inconsistent totals or invalid current page after reset. | [ ] |
| TC-PG-034 | Empty result pagination behavior | Force empty results and navigate pages. | Pagination disables/normalizes safely; no invalid page navigation loops. | Can navigate to meaningless pages with inconsistent UI states. | [ ] |
| TC-PG-035 | Invalid query value robustness | Send invalid `page/pageSize/sort` values. | API returns controlled error or safe fallback without crash. | 500 errors or unpredictable payload shape. | [ ] |
| TC-PG-036 | Endpoint-to-UI schema drift check | Compare API response keys with frontend service expectations. | Frontend reads exactly returned keys (`items/requests/logs`, `total`, paging fields) without adapter bugs. | UI assumes different keys causing empty lists despite valid API response. | [ ] |


