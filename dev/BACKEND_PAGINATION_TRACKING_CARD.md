# Backend Pagination Global Tracking Card

**Status:** 🔄 In Progress | **Last Updated:** 2026-03-30 | **Owner:** Dev Team | **Handoff To:** Phyllis

---

## Overview

This card consolidates the implementation and verification status of backend pagination across all major tables in the COMP4117 Inventory System. Each endpoint must meet the pagination contract (`page`, `pageSize` / `limit`, `total`, `totalPages`) and integrate seamlessly with the UI and filtering logic.

---

## Global Pagination Requirements

✅ **All major tables must implement:**
1. API returns pagination fields: `page`, `pageSize` (or `limit`), `total`, `totalPages` (computed or explicit)
2. UI page switching triggers HTTP request with updated page parameter
3. Pagination works simultaneously with filtering without conflicts
4. `count` (total) and `result` (rows) remain consistent across all operations
5. Page resets to 1 when filters change
6. Clear behavior removes filters and resets pagination to baseline

---

## Endpoint Checklist

### 1. **Inventory Items** (`GET /api/items`)

| Aspect | Status | Notes | Evidence |
|--------|--------|-------|----------|
| **API Response Fields** | ❓ | Verify: `page`, `pageSize`, `total`, `totalPages` | Check [backend/controllers/itemController.js](itemController.js) |
| **Query Params** | ❓ | Support: `page`, `pageSize`, `status`, `type`, `category`, `location`, `vendor`, `supplier`, `search`, `sortBy`, `sortDir` | |
| **UI Page Switch** | ❓ | Clicking page button sends new API request | Test [LentOutFilterPage.vue](../frontend/src/pages/LentOutFilterPage.vue) |
| **Filter + Pagination** | ❓ | Filters reset page to 1; both active simultaneously | Manual test: filter + navigate pages |
| **Count Consistency** | ❓ | `total` matches filtered dataset size | Verify in browser DevTools |
| **Empty Result Handling** | ❓ | Zero rows → `total=0`, paging disabled or shown | |

**Subtasks:**
- [ ] Review controller response shape
- [ ] Add `totalPages` to response if missing
- [ ] Test UI integration with filters
- [ ] Verify count/result consistency
- [ ] Sign off: ___________

---

### 2. **Available Items** (`GET /api/items/available`)

| Aspect | Status | Notes | Evidence |
|--------|--------|-------|----------|
| **API Response Fields** | ❓ | Verify: `page`, `pageSize`, `total`, `totalPages` | Check itemController |
| **Query Params** | ❓ | Support: `page`, `pageSize`, `search`, `sortBy`, `sortDir` | |
| **UI Page Switch** | ❓ | Pagination controls trigger requests | Test in HandOverToolPage |
| **Filter + Pagination** | ❓ | Combined filtering and paging works | |
| **Count Consistency** | ❓ | `total` = available items count | |

**Subtasks:**
- [ ] Verify endpoint exists and has pagination
- [ ] Check response contract
- [ ] Test with UI filters
- [ ] Verify count consistency
- [ ] Sign off: ___________

---

### 3. **Lent-Out Items** (`GET /api/items/lent-out`)

| Aspect | Status | Notes | Evidence |
|--------|--------|-------|----------|
| **API Response Fields** | ❓ | Verify: `page`, `pageSize`, `total`, `totalPages` | Check itemController |
| **Query Params** | ❓ | Support: `page`, `pageSize`, `status`, `search`, `sortBy`, `sortDir` | |
| **UI Page Switch** | ❓ | LentOutFilterPage pagination sends requests | Test LentOutFilterPage |
| **Filter + Pagination** | ❓ | Filters + pagination work in concert | |
| **Count Consistency** | ❓ | `total` matches lent-out item count | |

**Subtasks:**
- [ ] Verify endpoint pagination
- [ ] Check response contract
- [ ] Test UI page navigation
- [ ] Verify filter + pagination interaction
- [ ] Sign off: ___________

---

### 4. **Items by Owner** (`GET /api/items/by-owner/:ownerId`)

| Aspect | Status | Notes | Evidence |
|--------|--------|-------|----------|
| **API Response Fields** | ❓ | Verify: `page`, `pageSize`, `total`, `totalPages` | Check itemController |
| **Query Params** | ❓ | Support: `page`, `pageSize`, `status`, `search`, `sortBy`, `sortDir` | |
| **UI Page Switch** | ❓ | Owner inventory page pagination works | |
| **Filter + Pagination** | ❓ | Filters on owner's items + pagination | |
| **Count Consistency** | ❓ | `total` = owner's item count | |

**Subtasks:**
- [ ] Verify endpoint pagination
- [ ] Check response contract
- [ ] Test owner view pagination
- [ ] Sign off: ___________

---

### 5. **Borrow Requests** (`GET /api/borrowRequests`)

| Aspect | Status | Notes | Evidence |
|--------|--------|-------|----------|
| **API Response Fields** | ❓ | Verify: `page`, `pageSize`, `total`, `totalPages` | Check borrowRequestController |
| **Query Params** | ❓ | Support: `page`, `pageSize`, `status`, `search`, `borrowerId`, `sortBy`, `sortDir`, date ranges | |
| **UI Page Switch** | ❓ | ApproveRequestsPage pagination sends requests | Test ApproveRequestsPage tabs |
| **Filter + Pagination** | ❓ | Status filter + pagination work together | |
| **Count Consistency** | ❓ | `total` matches request count | Per-tab counts accurate |
| **Tab Isolation** | ❓ | Each tab (Pending/Approved/etc.) has independent pagination | |

**Subtasks:**
- [ ] Verify endpoint pagination
- [ ] Check response contract
- [ ] Test all status tabs
- [ ] Verify filter + pagination
- [ ] Test tab switching resets page
- [ ] Sign off: ___________

---

### 6. **Student's Own Requests** (`GET /api/borrowRequests/my`)

| Aspect | Status | Notes | Evidence |
|--------|--------|-------|----------|
| **API Response Fields** | ❓ | Verify: `page`, `pageSize`, `total`, `totalPages` | Check borrowRequestController |
| **Query Params** | ❓ | Support: `page`, `pageSize`, `status`, `sortBy`, `sortDir` | |
| **UI Page Switch** | ❓ | StudentRequestsPage pagination works | Test StudentRequestsPage |
| **Filter + Pagination** | ❓ | Status filter + pagination | |
| **Count Consistency** | ❓ | `total` = student's request count | |

**Subtasks:**
- [ ] Verify endpoint pagination
- [ ] Check response contract
- [ ] Test pagination in student view
- [ ] Sign off: ___________

---

### 7. **Teacher Request History** (`GET /api/borrowRequests/teacher-history`)

| Aspect | Status | Notes | Evidence |
|--------|--------|-------|----------|
| **API Response Fields** | ❓ | Verify: `page`, `pageSize`, `total`, `totalPages` | Check borrowRequestController |
| **Query Params** | ❓ | Support: `page`, `pageSize`, `status`, `sortBy`, `sortDir` | |
| **UI Page Switch** | ❓ | TeacherRequestsPage history tab pagination | Test TeacherRequestsPage |
| **Filter + Pagination** | ❓ | Status filter + pagination on history | |
| **Count Consistency** | ❓ | `total` = teacher's history count | |

**Subtasks:**
- [ ] Verify endpoint pagination
- [ ] Check response contract
- [ ] Test history tab pagination
- [ ] Sign off: ___________

---

### 8. **Audit Logs** (`GET /api/audit-logs`)

| Aspect | Status | Notes | Evidence |
|--------|--------|-------|----------|
| **API Response Fields** | ❓ | Verify: `page`, `pageSize`, `total`, `totalPages` | Check auditLogController |
| **Query Params** | ❓ | Support: `page`, `pageSize`, `sortField`, `sortDir`, `timeRange`, `actions`, `search`, `userID`, `itemID`, `dateFrom`, `dateTo` | |
| **UI Page Switch** | ❓ | AuditLogPage pagination sends requests | Test AuditLogPage |
| **Filter + Pagination** | ❓ | Multi-filter + pagination (search, range, actions, user/item) | |
| **Count Consistency** | ❓ | `total` matches filtered log count | |

**Subtasks:**
- [ ] Verify endpoint pagination
- [ ] Check response contract
- [ ] Test UI pagination with diverse filters
- [ ] Verify count consistency after filtering
- [ ] Sign off: ___________

---

### 9. **User Management** (`GET /api/users`)

| Aspect | Status | Notes | Evidence |
|--------|--------|-------|----------|
| **API Response Fields** | ❓ | Verify: `page`, `pageSize`, `total`, `totalPages` | Check userController |
| **Query Params** | ❓ | Support: `page`, `pageSize`, `displayRole`, `isActive`, `search`, `sortBy`, `sortDir` | |
| **UI Page Switch** | ❓ | ManageAccountsPage pagination sends requests | Test ManageAccountsPage |
| **Filter + Pagination** | ❓ | Role/status filter + pagination + search | |
| **Count Consistency** | ❓ | `total` = user count | |

**Subtasks:**
- [ ] Verify endpoint pagination
- [ ] Check response contract
- [ ] Test UI pagination with filters
- [ ] Verify count consistency
- [ ] Sign off: ___________

---

## Global Verification Checklist

### Pre-Handoff Verification (for all endpoints)

| Check | Verification Method | Status |
|-------|---------------------|--------|
| **API Response Contract** | Call each endpoint with `?page=1&pageSize=10`; verify response includes `page`, `pageSize`, `total`, `totalPages` | ❓ |
| **Page Navigation** | UI page button click → verify new HTTP request sent with updated `page` | ❓ |
| **Filter + Pagination Together** | Apply filter → go to page 2 → change filter → verify page resets to 1 and filters apply | ❓ |
| **Count Consistency** | Verify `total` from API = number of items in filtered dataset; pager pages = `ceil(total/pageSize)` | ❓ |
| **Empty Result Handling** | Force zero results via filter → verify `total=0`, empty state shown, paging disabled | ❓ |
| **Tab Isolation** (where applicable) | Switch tabs in same page → verify pagination/filters isolated per tab | ❓ |
| **Clear/Reset Behavior** | Click "Clear Filters" → verify page resets to 1 and filters removed from request | ❓ |

---

## Implementation Tracking

### Completed Endpoints
- [ ] Items
- [ ] Items/Available
- [ ] Items/Lent-Out
- [ ] Items/By-Owner
- [ ] Borrow Requests
- [ ] Borrow Requests/My
- [ ] Borrow Requests/Teacher-History
- [ ] Audit Logs
- [ ] Users

### In Progress
- ___________
- ___________

### Blocked / Issues
| Endpoint | Issue | Blocker | Assigned To |
|----------|-------|---------|-------------|
| | | | |

---

## Phyllis Verification Handoff

**Ready for final verification when:**
- [ ] All 9 endpoints implement pagination API contract
- [ ] All UI pages trigger page-change requests
- [ ] Filtering + pagination work together on all pages
- [ ] Count/result consistency verified across all endpoints
- [ ] Empty result UX tested
- [ ] Tab isolation (where applicable) verified
- [ ] Clear/reset behavior tested

**Verification Signature:**

| Role | Name | Date | Notes |
|------|------|------|-------|
| **Dev Lead** | __________ | __________ | Prepared on __________ |
| **Phyllis (QA)** | __________ | __________ | Testing period: __________ to __________ |

---

## Test Evidence Links

- Detailed backend test cases: [BACKEND_DETAILED_TEST_CASES.md](./BACKEND_DETAILED_TEST_CASES.md)
- Pagination/filtering checklist: [BACKEND_PAGING_FILTERING_CHECKLIST.md](./test-cases-2026-03-23/BACKEND_PAGING_FILTERING_CHECKLIST.md)
- Frontend test cases: [FRONTEND_DETAILED_TEST_CASES.md](./FRONTEND_DETAILED_TEST_CASES.md)

---

## Notes & Decisions

- `totalPages` should be either returned by API explicitly or computed in UI as `ceil(total/pageSize)` consistently
- `pageSize` and `limit` terminology: standardize across API and frontend
- Empty results: pagination controls should gracefully disable or hide when `total=0`
- Tab-based pages: each tab's pagination state should be independent

---

**Last Review:** __________ | **Next Review:** __________
