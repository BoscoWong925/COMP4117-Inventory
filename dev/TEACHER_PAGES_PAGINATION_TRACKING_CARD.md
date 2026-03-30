# 📋 Teacher Pages Backend Pagination Tracking Card

**Status:** 🔍 AUDIT IN PROGRESS | **Priority:** 🟡 MEDIUM | **Target:** Ensure all teacher-focused API endpoints and pages support proper backend pagination

**Date Created:** 2026-03-30  
**Last Updated:** 2026-03-30  
**Owner:** Development Team  
**Handoff:** Phyllis (QA)

---

## Executive Summary

Teacher pages (TeacherRequestsPage, TeacherCheckoutPage, HandOverToolPage) handle multiple datasets that may grow large. This card tracks backend pagination implementation across all teacher-focused endpoints and validates UI pagination controls work correctly with filtering and state management.

**Contract Requirements:**
- API returns: `page`, `pageSize` (or `limit`), `total`, optional `totalPages`
- UI pagination controls trigger API requests when page changes
- Pagination works seamlessly with filters (status filter + pagination together)
- Count/result consistency (total matches actual filtered data)

---

## 1. Teacher-Focused API Endpoints

### Endpoint 1: GET `/api/borrowRequests/teacher-pending`

**Purpose:** Get pending & pending-checkout requests for items **owned by current teacher**

**Source Code:** `backend/controllers/borrowRequestController.js` line 974-1020

**Current Implementation Status:**

```javascript
// ✅ Pagination IMPLEMENTED
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.pageSize) || 10;
const skip = (page - 1) * limit;

// ✅ Filtering
const statusFilter = requestedStatus ? requestedStatus : { $in: ['Pending', 'Pending Check-Out'] };

// ✅ Count queries
const total = await BorrowRequest.countDocuments(query);
const requests = await BorrowRequest.find(query)
  .sort({ requestDate: -1 })
  .skip(skip)
  .limit(limit);

// ✅ Response format
res.status(200).json({
  success: true,
  requests: populated,
  total,
  pendingCount,          // Separate count for Pending status
  checkoutCount          // Separate count for Pending Check-Out status
});
```

**API Contract:**

| Parameter | Type | Optional | Default | Purpose |
|-----------|------|----------|---------|---------|
| `page` | integer | Yes | 1 | Current page |
| `pageSize` | integer | Yes | 10 | Items per page |
| `status` | string | Yes | `['Pending', 'Pending Check-Out']` | Status filter |

**Response Fields:**

| Field | Type | Purpose |
|-------|------|---------|
| `success` | boolean | Operation status |
| `requests` | array | Paginated request objects |
| `total` | integer | Total matching records (respects filter) |
| `pendingCount` | integer | Count of Pending requests |
| `checkoutCount` | integer | Count of Pending Check-Out requests |
| `page` | ❌ NOT RETURNED | ⚠️ **MISSING** |
| `pageSize` | ❌ NOT RETURNED | ⚠️ **MISSING** |

**Issues Found:**

🔴 **CRITICAL:** Response doesn't include `page` and `pageSize` fields
- Frontend may need these for validation
- Some UI libraries expect these fields

**Frontend Usage:** `TeacherRequestsPage.vue`

---

### Endpoint 2: GET `/api/borrowRequests/teacher-history`

**Purpose:** Get completed requests (Approved/Rejected/Returned) for **teacher-owned items**

**Source Code:** `backend/controllers/borrowRequestController.js` line 1025-1058

**Current Implementation Status:**

```javascript
// ✅ Pagination IMPLEMENTED
const skip = (parseInt(page) - 1) * parseInt(pageSize);
const total = await BorrowRequest.countDocuments(filter);
const requests = await BorrowRequest.find(filter)
  .sort(sort)
  .skip(skip)
  .limit(parseInt(pageSize));

// ✅ Response format
res.status(200).json({
  success: true,
  requests: populated,
  total,
  page: parseInt(page),          // ✅ INCLUDED
  pageSize: parseInt(pageSize)   // ✅ INCLUDED
});
```

**API Contract:**

| Parameter | Type | Optional | Default | Purpose |
|-----------|------|----------|---------|---------|
| `page` | integer | Yes | 1 | Current page |
| `pageSize` | integer | Yes | 10 | Items per page |
| `status` | string | Yes | `['Approved', 'Rejected', 'Returned']` | Status filter |
| `sortBy` | string | Yes | `requestDate` | Sort field |
| `sortDir` | string | Yes | `desc` | Sort direction |

**Response Fields:**

| Field | Type | Status |
|-------|------|--------|
| `success` | boolean | ✅ Returned |
| `requests` | array | ✅ Returned |
| `total` | integer | ✅ Returned |
| `page` | integer | ✅ **RETURNED** |
| `pageSize` | integer | ✅ **RETURNED** |

**Status:** ✅ **COMPLETE & CORRECT**

**Frontend Usage:** `TeacherRequestsPage.vue` history tab

---

### Endpoint 3: GET `/api/items/by-owner/:ownerId`

**Purpose:** Get items owned by a specific teacher

**Source Code:** `backend/controllers/itemController.js`

**Current Implementation Status:**

<span style="color: orange;">Need to verify pagination support</span>

**Test Query:**
```bash
GET http://localhost:5002/api/items/by-owner/TEACHER_ID?page=1&pageSize=10
```

**Expected Response Fields:**
```json
{
  "success": true,
  "items": [...],
  "total": N,
  "page": 1,
  "pageSize": 10
}
```

**Status:** ⏳ **NEED VERIFICATION**

---

### Endpoint 4: GET `/api/borrowRequests/my`

**Purpose:** Get student's own requests (but teachers may view their interactions)

**Source Code:** `backend/controllers/borrowRequestController.js` - getMyRequests

**Status:** 🔍 **May not be directly used by TeacherRequestsPage, but verify if needed**

---

## 2. Teacher Pages - Frontend Pagination Status

### Page 1: TeacherRequestsPage.vue

**Purpose:** Teacher's dashboard for managing borrow requests on their owned items

**Tabs:**
1. **Pending** - Shows `status = 'Pending'` requests
2. **Pending Check-Out** - Shows `status = 'Pending Check-Out'` requests
3. **History** - Shows completed requests (Approved/Rejected/Returned)

**Current Pagination Implementation:**

```javascript
// ✅ Pagination controls
const currentPage = ref(1)
const pageSize = 10
const pendingCount = ref(0)
const checkoutCount = ref(0)

// ✅ PaginationControl component used
<PaginationControl v-model:currentPage="currentPage" :totalItems="pendingCount" :pageSize="pageSize" />

// ✅ Watch page changes
watch([historyStatus, currentPage, activeTab], () => {
  if (activeTab.value === 'history') {
    loadHistory()
  } else {
    loadPending()
  }
})

// ✅ API calls with pagination
const loadPending = async () => {
  const response = await borrowingService.getTeacherPendingRequests({
    page: currentPage.value,
    pageSize,
    status
  })
  pendingCount.value = response.pendingCount || 0
  checkoutCount.value = response.checkoutCount || 0
}

const loadHistory = async () => {
  const result = await borrowingService.getTeacherRequestHistory(params)
  historyRequests.value = result.requests || []
  totalHistory.value = result.total || 0
}
```

**Pagination Status:**
- ✅ currentPage reactive
- ✅ pageSize defined
- ✅ PaginationControl component integrated
- ✅ Watch on page changes triggers API call
- ✅ Filtering (status) + pagination works together
- ⏳ **Need to verify:** pendingCount/checkoutCount vs total consistency

**Tab Handling:**
- ✅ Tab switching resets currentPage to 1
- ✅ Different tabs may have different totals (pending vs checkout)

**Status:** ✅ **APPEARS CORRECT - NEED VERIFICATION**

---

### Page 2: TeacherCheckoutPage.vue

**Purpose:** Display items borrowed by current teacher (items they own that are currently checked out)

**Current Pagination Implementation:**

```javascript
// ✅ Pagination controls
const currentPage = ref(1)
const pageSize = 10
const totalItems = ref(0)

// ✅ PaginationControl component
<PaginationControl v-model:currentPage="currentPage" :totalItems="totalItems" :pageSize="pageSize" />

// ✅ API call with pagination
const loadBorrowedItems = async () => {
  const response = await borrowingService.getMyBorrowedItems({
    page: currentPage.value,
    pageSize
  })
  paginatedItems.value = response.items || []
  totalItems.value = response.total || 0
}

// ✅ Watch page changes
watch(currentPage, () => {
  loadBorrowedItems()
})
```

**Pagination Status:**
- ✅ currentPage reactive
- ✅ pageSize defined (10)
- ✅ PaginationControl integrated
- ✅ Watch triggers API call on page change
- ✅ Search text affects pagination (resets to page 1)

**Status:** ✅ **APPEARS CORRECT - NEED VERIFICATION**

---

### Page 3: HandOverToolPage.vue

**Purpose:** Status update tool - mark borrowed items as returned

**Current Implementation:**

```javascript
const loadBorrowedItems = async () => {
  try {
    const params = { pageSize: 9999 }  // ⚠️ LOADS ALL AT ONCE
    const { items: lentOut } = await inventoryService.getLentOutItems(params)
    const { requests: allReqs } = await borrowingService.getAllRequests(...)
    // Client-side filtering and grouping
  }
}
```

**Pagination Status:**
- ❌ **NO PAGINATION** - Loads all items with `pageSize: 9999`
- ❌ No PaginationControl component
- ⚠️ May cause performance issues with large datasets

**Issues:**
- 🔴 **CRITICAL:** Not scalable - if 9999+ items, will fail
- 🟡 **MEDIUM:** Client-side grouping + filtering is inefficient

**Recommendation:**
Consider implementing proper pagination with search/filter before loading all items.

**Status:** ❌ **NEEDS IMPLEMENTATION**

---

## 3. Verification Checklist

### Test Case #1: TeacherRequestsPage - Pending Tab Pagination

**Steps:**
1. Login as teacher
2. Go to TeacherRequestsPage → Pending tab
3. **Verify:**
   - [ ] Pagination controls visible
   - [ ] Shows `pendingCount` in controls
   - [ ] Clicking next page → triggers API call
   - [ ] Network tab shows: `page=2&pageSize=10&status=Pending`
   - [ ] New data loads correctly
   - [ ] Count updates (`total` matches displayed items)

**Expected Behavior:**
- Page 1: Items 1-10 of total X
- Page 2: Items 11-20 of total X
- Page controls disabled if no next page

---

### Test Case #2: TeacherRequestsPage - Checkout Tab Pagination + Filter

**Steps:**
1. Login as teacher
2. Go to TeacherRequestsPage → Pending Check-Out tab
3. **Verify:**
   - [ ] Shows `checkoutCount` items per page
   - [ ] Pagination controls match `checkoutCount` not `pendingCount`
   - [ ] Page click triggers API with `status=Pending Check-Out`
   - [ ] Count/result consistency:
     - Count = total items with this status
     - Displayed = min(pageSize, remaining items)

**Expected Behavior:**
- Page resets to 1 when switching tabs
- Different tab = different total count

---

### Test Case #3: TeacherRequestsPage - History Tab Pagination + Filter

**Steps:**
1. Go to TeacherRequestsPage → History tab
2. **Verify:**
   - [ ] Status filter present (All / Approved / Rejected / Returned)
   - [ ] Filter change resets page to 1
   - [ ] API call includes status parameter
   - [ ] Pagination controls show correct total
   - [ ] Response includes `page` and `pageSize` fields ✅

**Expected Behavior:**
- Can pagination through history
- Each status filter updates total

**API Response Check:**
```bash
GET /api/borrowRequests/teacher-history?page=1&pageSize=10&status=Approved

Response should include:
{
  "total": X,
  "page": 1,
  "pageSize": 10
}
```

---

### Test Case #4: TeacherCheckoutPage - Pagination

**Steps:**
1. Login as teacher (with borrowed items)
2. Go to TeacherCheckoutPage
3. **Verify:**
   - [ ] Pagination controls visible
   - [ ] Shows total borrowed items
   - [ ] Page click triggers API call
   - [ ] Search + pagination works:
     - [ ] Search → resets to page 1
     - [ ] Shows filtered total
     - [ ] Pagination on filtered results

**Expected Behavior:**
- Can navigate through pages
- Search filters then paginates
- Count reflects filtered results

---

### Test Case #5: HandOverToolPage - Pagination Issue

**Current Status:** ⚠️ NO PAGINATION

**Test:**
1. Go to HandOverToolPage
2. **Verify:**
   - [ ] Does it load all items? (check Network tab for pageSize)
   - [ ] How many items returned? (should check if > 100)
   - [ ] Page load time? (may be slow if many items)

**Recommendation:**
- Implement proper pagination
- Add search to narrow down before pagination
- Test with 500+ borrowed items

---

## 4. API Consistency Matrix

| Endpoint | page | pageSize | total | totalPages | page in response | Status |
|----------|------|----------|-------|-----------|-----------------|--------|
| `/teacher-pending` | ✅ | ✅ | ✅ | ❌ | ❌ MISSING | 🔴 |
| `/teacher-history` | ✅ | ✅ | ✅ | ❌ | ✅ INCLUDED | ✅ |
| `/items/by-owner/:id` | ? | ? | ? | ? | ? | ⏳ |

**Issue:** `/teacher-pending` should return `page` and `pageSize` in response for consistency.

---

## 5. Fix Requirements

### Fix #1: Teacher-Pending API Response (CRITICAL)

**File:** `backend/controllers/borrowRequestController.js` line ~1019

**Current:**
```javascript
res.status(200).json({
  success: true,
  requests: populated,
  total,
  pendingCount,
  checkoutCount
});
```

**Required:**
```javascript
res.status(200).json({
  success: true,
  requests: populated,
  total,
  page,
  pageSize,
  pendingCount,
  checkoutCount
});
```

**Reason:** Consistency with other pagination endpoints; frontend may need these fields for validation.

---

### Fix #2: HandOverToolPage - Implement Pagination (MEDIUM)

**File:** `frontend/src/pages/HandOverToolPage.vue`

**Current Issue:** Loads all items with `pageSize: 9999`

**Solution:**
1. Add pagination controls
2. Implement search-then-paginate pattern
3. Test performance with large datasets

---

## 6. Implementation Checklist

- [ ] **API Fix #1:** Add `page` and `pageSize` to `/teacher-pending` response
- [ ] **API Verification:** Check `/items/by-owner/:id` pagination support
- [ ] **Test #1:** TeacherRequestsPage pending pagination
- [ ] **Test #2:** TeacherRequestsPage checkout pagination + status filter
- [ ] **Test #3:** TeacherRequestsPage history pagination + filter
- [ ] **Test #4:** TeacherCheckoutPage pagination
- [ ] **Test #5:** Verify HandOverToolPage pagination issue
- [ ] **Optional Fix #1:** Improve HandOverToolPage scalability
- [ ] **Documentation:** Update API docs with pagination contract

---

## 7. Effort Estimate

| Task | Effort |
|------|--------|
| Fix teacher-pending response | 15 min |
| Verify items/by-owner pagination | 30 min |
| Test all 5 scenarios | 1-2 hours |
| Fix HandOverToolPage (optional) | 1-2 hours |
| Documentation | 30 min |
| **Total** | **2.5-4 hours** |

---

## 8. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Teacher pagination breaks | MEDIUM | MEDIUM | Test all tabs/filters |
| HandOverToolPage crashes | MEDIUM | HIGH | Implement proper pagination |
| Count/total mismatch | LOW | MEDIUM | Validate response counts |
| Performance degradation | MEDIUM | LOW | Monitor with large datasets |

---

## 9. Rollback Plan

If issues occur:
1. Revert API response change in borrowRequestController.js
2. HandOverToolPage: revert to previous pagination approach
3. Re-test with rollback version before re-deploying

---

## 10. Phyllis Verification Sign-Off

After implementation:

- [ ] **API Check:** All teacher endpoints return pagination fields correctly
- [ ] **Pending Tab:** Pagination works with Pending status
- [ ] **Checkout Tab:** Pagination works with Pending Check-Out status
- [ ] **History Tab:** Pagination + status filter work together
- [ ] **TeacherCheckoutPage:** Pagination working correctly
- [ ] **HandOverToolPage:** No performance issues with large datasets
- [ ] **Count Consistency:** total = sum of all matching records
- [ ] **No Regressions:** Other pages still work correctly

**Sign-Off:**
```
✅ All teacher pagination verified - Phyllis Date: ________
```

---

## Appendix A: API Response Examples

### GET /api/borrowRequests/teacher-pending Response

**Current (❌ Missing fields):**
```json
{
  "success": true,
  "requests": [...],
  "total": 25,
  "pendingCount": 15,
  "checkoutCount": 10
}
```

**Required (✅ Complete):**
```json
{
  "success": true,
  "requests": [...],
  "total": 25,
  "page": 1,
  "pageSize": 10,
  "pendingCount": 15,
  "checkoutCount": 10
}
```

### GET /api/borrowRequests/teacher-history Response

**Current (✅ Correct):**
```json
{
  "success": true,
  "requests": [...],
  "total": 42,
  "page": 2,
  "pageSize": 10
}
```

---

## Appendix B: Related Pages & Components

- `PaginationControl.vue` - Reusable pagination component
- `TeacherRequestsPage.vue` - Main teacher management page
- `TeacherCheckoutPage.vue` - Teacher checkout history page
- `HandOverToolPage.vue` - Status update tool (needs refactor)
- `borrowingService.js` - Frontend API service layer
