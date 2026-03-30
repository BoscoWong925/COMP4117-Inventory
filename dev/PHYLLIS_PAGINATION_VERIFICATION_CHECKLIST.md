# Phyllis Verification Quick Check List

**For QA Lead Phyllis** — Use this checklist to quickly validate each endpoint's pagination implementation.

---

## How to Use This List

1. **For each endpoint**, open your API testing tool (Postman/Insomnia/curl)
2. **Make a test request** with pagination params: `?page=1&pageSize=5`
3. **Check the response** against the criteria below
4. **Fill in your findings** and sign off when complete

---

## Quick Endpoint Checks

### ✅ Inventory Items — `GET /api/items?page=1&pageSize=5`

**Test Steps:**
```bash
# Test 1: Base pagination
GET /api/items?page=1&pageSize=5

# Test 2: With filter
GET /api/items?page=1&pageSize=5&status=Available

# Test 3: Multi-filter
GET /api/items?page=1&pageSize=5&status=Available&category=Electronics

# Test 4: Page navigation
GET /api/items?page=2&pageSize=5&status=Available
```

**Response Checklist:**
- [ ] Response includes `page` field (numeric, equals 1)
- [ ] Response includes `pageSize` field (numeric, equals 5)
- [ ] Response includes `total` field (total filtered records count)
- [ ] Response includes `totalPages` field OR computable as `ceil(total/pageSize)`
- [ ] Data array length ≤ `pageSize` (5 in this case)
- [ ] When page=2 requested, first item differs from page=1
- [ ] `total` remains constant between page 1 and 2 requests

**UI Test:**
- [ ] Click "Next" on inventory page → observe new HTTP request with `page=2`
- [ ] Apply status filter → verify page resets to 1
- [ ] Verify rows count matches `pageSize` or less on last page

**QA Sign-off:** _____ Date: _____

---

### ✅ Available Items — `GET /api/items/available?page=1&pageSize=5`

**Test Steps:**
```bash
GET /api/items/available?page=1&pageSize=5
```

**Response Checklist:**
- [ ] Response includes `page`, `pageSize`, `total`, `totalPages` (or computable)
- [ ] Only items with `status=Available` returned
- [ ] `total` reflects filtered count
- [ ] Data array length ≤ `pageSize`

**UI Test:**
- [ ] HandOverToolPage pagination works
- [ ] Page navigation triggers requests

**QA Sign-off:** _____ Date: _____

---

### ✅ Lent-Out Items — `GET /api/items/lent-out?page=1&pageSize=5`

**Test Steps:**
```bash
# Base pagination
GET /api/items/lent-out?page=1&pageSize=5

# With filter
GET /api/items/lent-out?page=1&pageSize=5&status=LentOut
```

**Response Checklist:**
- [ ] Response includes `page`, `pageSize`, `total`, `totalPages`
- [ ] Only lent-out items returned
- [ ] `total` accurate for lent-out items
- [ ] Pagination works with filters

**UI Test:**
- [ ] LentOutFilterPage page navigation works
- [ ] Filters + pagination together work

**QA Sign-off:** _____ Date: _____

---

### ✅ Borrow Requests — `GET /api/borrowRequests?page=1&pageSize=5&status=Pending`

**Test Steps:**
```bash
# By status
GET /api/borrowRequests?page=1&pageSize=5&status=Pending
GET /api/borrowRequests?page=1&pageSize=5&status=Approved
GET /api/borrowRequests?page=1&pageSize=5&status=Returned

# With pagination
GET /api/borrowRequests?page=2&pageSize=5&status=Pending

# Clear filters
GET /api/borrowRequests?page=1&pageSize=5
```

**Response Checklist:**
- [ ] Response includes `page`, `pageSize`, `total`, `totalPages`
- [ ] `total` changes when status filter changes
- [ ] Data respects status filter
- [ ] Pagination works per-status

**UI Test:**
- [ ] ApproveRequestsPage tabs (Pending/Approved/Returned/etc.)
- [ ] Click page button → new request sent
- [ ] Switch tab → page resets to 1, correct status requested
- [ ] Each tab has independent pagination

**QA Sign-off:** _____ Date: _____

---

### ✅ Student's Requests — `GET /api/borrowRequests/my?page=1&pageSize=5`

**Test Steps:**
```bash
GET /api/borrowRequests/my?page=1&pageSize=5
GET /api/borrowRequests/my?page=1&pageSize=5&status=Pending
```

**Response Checklist:**
- [ ] Response includes `page`, `pageSize`, `total`, `totalPages`
- [ ] Only student's own requests returned
- [ ] `total` accurate for student's count
- [ ] Status filter works

**UI Test:**
- [ ] StudentBorrowHistoryPage pagination works
- [ ] Status filter + pagination together

**QA Sign-off:** _____ Date: _____

---

### ✅ Teacher Request History — `GET /api/borrowRequests/teacher-history?page=1&pageSize=5&status=Returned`

**Test Steps:**
```bash
GET /api/borrowRequests/teacher-history?page=1&pageSize=5&status=Returned
GET /api/borrowRequests/teacher-history?page=2&pageSize=5&status=Returned
```

**Response Checklist:**
- [ ] Response includes `page`, `pageSize`, `total`, `totalPages`
- [ ] Only teacher-viewable history returned
- [ ] `total` reflects teacher's request history count
- [ ] Status filter works

**UI Test:**
- [ ] TeacherRequestsPage history tab pagination
- [ ] Filter + pagination work together

**QA Sign-off:** _____ Date: _____

---

### ✅ Audit Logs — `GET /api/audit-logs?page=1&pageSize=10`

**Test Steps:**
```bash
# Base pagination
GET /api/audit-logs?page=1&pageSize=10

# With search
GET /api/audit-logs?page=1&pageSize=10&search=item_name

# With time range
GET /api/audit-logs?page=1&pageSize=10&dateFrom=2026-03-20&dateTo=2026-03-30

# Combined filters
GET /api/audit-logs?page=1&pageSize=10&search=test&dateFrom=2026-03-20&actions=CREATE_ITEM,UPDATE_ITEM

# Page navigation
GET /api/audit-logs?page=2&pageSize=10&search=test
```

**Response Checklist:**
- [ ] Response includes `page`, `pageSize`, `total`, `totalPages`
- [ ] `total` reflects filtered log count
- [ ] Search filter works (text matching)
- [ ] Date range filter works
- [ ] Action filter works
- [ ] Multiple filters combine correctly (AND logic)
- [ ] `total` consistent between pagination requests

**UI Test:**
- [ ] AuditLogPage page navigation sends requests
- [ ] Search + filter combinations work
- [ ] Changing filter resets page to 1
- [ ] Clear filters removes all filters and resets page

**QA Sign-off:** _____ Date: _____

---

### ✅ User Management — `GET /api/users?page=1&pageSize=10`

**Test Steps:**
```bash
# Base pagination
GET /api/users?page=1&pageSize=10

# With role filter
GET /api/users?page=1&pageSize=10&displayRole=Teacher

# With status filter
GET /api/users?page=1&pageSize=10&isActive=true

# Combined filters
GET /api/users?page=1&pageSize=10&displayRole=Student&isActive=true

# With search
GET /api/users?page=1&pageSize=10&search=John&displayRole=Student
```

**Response Checklist:**
- [ ] Response includes `page`, `pageSize`, `total`, `totalPages`
- [ ] `total` reflects filtered user count
- [ ] Role filter works
- [ ] Active status filter works
- [ ] Search works (username/email matching)
- [ ] Multiple filters combine correctly
- [ ] `total` stays consistent across pages

**UI Test:**
- [ ] ManageAccountsPage pagination works
- [ ] Filters + pagination together
- [ ] Changing filter resets page to 1
- [ ] Clear filters resets to baseline

**QA Sign-off:** _____ Date: _____

---

## Summary Verification Matrix

| Endpoint | API Contract ✅ | UI Pagination ✅ | Filter Works ✅ | Count Consistent ✅ | QA Approved ✅ |
|----------|-------|-------|-------|-------|-------|
| `/api/items` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `/api/items/available` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `/api/items/lent-out` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `/api/borrowRequests` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `/api/borrowRequests/my` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `/api/borrowRequests/teacher-history` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `/api/audit-logs` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `/api/users` | [ ] | [ ] | [ ] | [ ] | [ ] |

---

## Final Sign-Off

**All endpoints verified and compliant:**

| Phase | Status | QA Lead | Date | Notes |
|-------|--------|---------|------|-------|
| **API Contract Check** | ❓ | Phyllis | _____ | All 8 endpoints return `page/pageSize/total/totalPages` |
| **UI Integration Check** | ❓ | Phyllis | _____ | All page buttons send HTTP requests |
| **Filter Integration Check** | ❓ | Phyllis | _____ | Filters work with pagination; page resets on filter change |
| **Count Consistency Check** | ❓ | Phyllis | _____ | `total` accurate, pager pages consistent with data |
| **Empty Result UX Check** | ❓ | Phyllis | _____ | Zero-result states handled gracefully |

**Overall Status:** [ ] ✅ APPROVED | [ ] ❌ ISSUES FOUND (see notes below)

**QA Comments:**
```




```

**Phyllis Signature:** _________________ **Date:** _________

---

**Related Documentation:**
- [BACKEND_PAGINATION_TRACKING_CARD.md](./BACKEND_PAGINATION_TRACKING_CARD.md) — Main tracking card
- [BACKEND_PAGING_FILTERING_CHECKLIST.md](./test-cases-2026-03-23/BACKEND_PAGING_FILTERING_CHECKLIST.md) — Detailed checklist
- [BACKEND_DETAILED_TEST_CASES.md](./BACKEND_DETAILED_TEST_CASES.md) — Full backend API test cases
