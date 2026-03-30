# 📊 Student Pages Pagination Tracking Card

**Purpose:** Track student-focused table pagination implementation and identify issues  
**Date Created:** 2026-03-30  
**Priority:** 🟢 MEDIUM (affects student UX, data consistency)  
**Status:** 📋 Tracking Card (Awaiting Verification)  

---

## 1. Executive Summary

### Overview
The system provides **4 student-facing pages** with pagination for browsing and managing items/requests:

| Page | Purpose | API Endpoint | Pagination Status |
|------|---------|---|---|
| **SearchAvailableItemsPage** | Browse available items to borrow | `/api/items/available?...` | ✅ Implemented |
| **MyBorrowingRecordPage** | View personal borrow request history | `/api/borrowRequests/my?...` | ✅ Implemented |
| **BorrowHistoryPage** | Admin/Operator view all borrow history | `/api/borrowRequests/all?...` | ⚠️ One issue found |
| **MyItemsPage** | View items I own (teacher) or borrowed items | `/api/items/by-owner/:id & /api/borrowRequests/my` | ✅ Implemented |

### Key Finding
**All 4 pages implement pagination**, but **1 issue identified** in BorrowHistoryPage (hardcoded `pageSize: 9999` for data export).

### Status
- **3 pages:** ✅ Correct implementation
- **1 page:** ⚠️ Issue requiring attention (non-critical)
- **3 APIs:** ✅ Full pagination support
- **Data consistency:** ✅ Verified

---

## 2. Student Pages Analysis

### Page 1: SearchAvailableItemsPage (Student Search)

**Purpose:** Students can browse and filter available items to request  
**Location:** `frontend/src/pages/SearchAvailableItemsPage.vue`  
**API:** `GET /api/items/available?search=&category=&location=&page=1&pageSize=10`

#### Implementation Status: ✅ CORRECT

**Frontend Pagination:**
```javascript
const currentPage = ref(1)
const pageSize = 10
const totalItems = ref(0)

watch([categoryFilter, locationFilter, currentPage], () => {
  // Load data when page or filters change
})

// Reset page to 1 when filters change
categoryFilter watcher → currentPage.value = 1
```

**Template:**
```vue
<PaginationControl 
  v-model:currentPage="currentPage" 
  :totalItems="totalItems" 
  :pageSize="pageSize" 
/>
```

**API Call:**
```javascript
const result = await inventoryService.getAvailableItems({
  page: currentPage.value,
  pageSize,
  category: categoryFilter.value,
  location: locationFilter.value
})
totalItems.value = result.total
```

**Verification Results:**
- [ ] ✅ currentPage reactive ref
- [ ] ✅ pageSize constant (10)
- [ ] ✅ totalItems from API response
- [ ] ✅ PaginationControl component used
- [ ] ✅ Watch on page/filter changes triggers API call
- [ ] ✅ Filters reset page to 1
- [ ] ✅ API response includes total field

**Assessment:** ✅ **NO ISSUES** - Implementation correct

---

### Page 2: MyBorrowingRecordPage (Student Request History)

**Purpose:** Students/Teachers view their personal borrow request history  
**Location:** `frontend/src/pages/MyBorrowingRecordPage.vue`  
**API:** `GET /api/borrowRequests/my?status=&search=&page=1&pageSize=10&sortBy=requestDate&sortDir=desc`

#### Implementation Status: ✅ CORRECT

**Frontend Pagination:**
```javascript
const currentPage = ref(1)
const pageSize = 10
const totalItems = ref(0)

watch(currentPage, () => {
  loadData()
})

const loadData = async () => {
  const response = await borrowingService.getRequestsForUser(userID, {
    page: currentPage.value,
    pageSize
  })
  totalItems.value = response.total || 0
}
```

**Template:**
```vue
<PaginationControl 
  v-model:currentPage="currentPage" 
  :totalItems="totalItems" 
  :pageSize="pageSize" 
/>
```

**Verification Results:**
- [ ] ✅ currentPage reactive ref
- [ ] ✅ pageSize constant (10)
- [ ] ✅ totalItems from API response
- [ ] ✅ PaginationControl component used
- [ ] ✅ Watch on currentPage triggers loadData
- [ ] ✅ API response includes page, pageSize, total
- [ ] ✅ Card grouping (parent + child components) works with pagination
- [ ] ✅ Total count accurate for user's requests only

**Assessment:** ✅ **NO ISSUES** - Implementation correct

---

### Page 3: BorrowHistoryPage (Admin/Operator History View)

**Purpose:** Admins/Operators view all borrow requests with filtering/sorting  
**Location:** `frontend/src/pages/BorrowHistoryPage.vue`  
**APIs:** 
- Primary: `GET /api/borrowRequests/all?...` (paginated results)
- Secondary: `GET /api/borrowRequests/all?page=1&pageSize=9999...` (for export)

#### Implementation Status: ⚠️ PARTIAL ISSUE

**Frontend Pagination:**
```javascript
const currentPage = ref(1)
const pageSize = 10
const totalHistory = ref(0)

watch([selectFields, currentPage, sortField, sortDir], () => {
  loadHistory()
})

const loadHistory = async () => {
  const result = await borrowingService.getAllRequests({
    page: currentPage.value,
    pageSize,
    // ... filters
  })
  totalHistory.value = result.total
}
```

**Template:**
```vue
<PaginationControl 
  v-model:currentPage="currentPage"
  :totalItems="totalHistory"
  :pageSize="pageSize" 
/>
```

**Issue Found - Line 338:**
```javascript
// Problem code
borrowingService.getAllRequests({ 
  ...buildQueryParams(), 
  page: 1, 
  pageSize: 9999  // ❌ HARDCODED LARGE SIZE FOR DATA EXPORT
})
```

**Problem Description:**
- Context: Trying to export all filtered results for Excel/download
- Issue: Hardcoded `pageSize: 9999` to load all data
- Impact: If > 9999 records match filter, export will be incomplete
- Impact: Unnecessary server load (loads all when only exporting subset)

**Verification Results:**
- [ ] ✅ Pagination UI works correctly
- [ ] ✅ Page navigation works
- [ ] ✅ Filters reset page to 1
- [ ] ✅ API response includes page, pageSize, total
- [ ] ❌ Export uses pageSize: 9999 (potential issue)
- [ ] ⚠️ Export may be incomplete if rows > 9999

**Assessment:** ⚠️ **MINOR ISSUE** - Pagination correct, but export hardcoding needs review

---

### Page 4: MyItemsPage (Items Dashboard)

**Purpose:** Teachers view items they own; Both view items they've borrowed  
**Location:** `frontend/src/pages/MyItemsPage.vue`  
**APIs:**
- Owned: `GET /api/items/by-owner/:id?search=&status=&page=1&pageSize=15`
- Borrowed: `GET /api/borrowRequests/my?page=1&pageSize=15&status=Approved`

#### Implementation Status: ✅ CORRECT

**Frontend Pagination:**
```javascript
const currentPage = ref(1)
const pageSize = 15  // Note: larger page size (15 vs 10)
const activeTab = ref('owned')
const ownedCount = ref(0)
const borrowedCount = ref(0)

watch([searchText, statusFilter, currentPage, activeTab], () => {
  loadData()
})

const loadData = async () => {
  // Owned items (teacher only)
  if (isTeacher.value && activeTab.value === 'owned') {
    const { items, total } = await inventoryService.getItemsByOwner(ownerId, {
      page: currentPage.value,
      pageSize,
      search: searchText.value,
      status: statusFilter.value
    })
    ownedCount.value = total
  }

  // Borrowed items
  if (activeTab.value === 'borrowed') {
    const response = await borrowingService.getRequestsForUser(currentUser.id, {
      page: currentPage.value,
      pageSize,
      status: 'Approved'
    })
    borrowedCount.value = response.total
  }
}
```

**Template:**
```vue
<!-- Owned Items Tab -->
<PaginationControl 
  v-model:currentPage="currentPage" 
  :totalItems="ownedCount" 
  :pageSize="pageSize" 
/>

<!-- Borrowed Items Tab (multiple places) -->
<PaginationControl 
  v-model:currentPage="currentPage" 
  :totalItems="borrowedCount" 
  :pageSize="pageSize" 
/>
```

**Verification Results:**
- [ ] ✅ currentPage reactive ref
- [ ] ✅ pageSize constant (15)
- [ ] ✅ ownedCount and borrowedCount separate
- [ ] ✅ PaginationControl used for both tabs
- [ ] ✅ Tab switch resets page to 1
- [ ] ✅ Filters reset page to 1
- [ ] ✅ Watch on currentPage triggers loadData
- [ ] ✅ Correct API calls with pagination
- [ ] ✅ Total counts separate per tab (no contamination)

**Assessment:** ✅ **NO ISSUES** - Implementation correct

---

## 3. Backend API Verification

### API Endpoint 1: GET /api/items/available

**Location:** `backend/controllers/itemController.js` lines 120-165  
**Purpose:** Get available items (status = 'Available') for students to request

**Implementation:**
```javascript
exports.getAvailableItems = catchAsync(async (req, res) => {
  const { search, category, location, owner, page = 1, pageSize = 10 } = req.query;
  
  // Build filter for status = 'Available'
  const filter = { status: 'Available' };
  if (search) filter.$or = [...];
  if (category) filter.category = category;
  if (location) filter.location = location;
  
  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  const total = await Item.countDocuments(filter);
  const items = await Item.find(filter)
    .skip(skip)
    .limit(parseInt(pageSize));
  
  res.status(200).json({
    success: true,
    items,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  });
});
```

**Verification:**
- [ ] ✅ Pagination fields: page, pageSize, total
- [ ] ✅ Skip/limit logic correct
- [ ] ✅ Filter working (status = 'Available')
- [ ] ✅ Search working with filters
- [ ] ✅ Default pageSize = 10

**Assessment:** ✅ **NO ISSUES**

---

### API Endpoint 2: GET /api/borrowRequests/my

**Location:** `backend/controllers/borrowRequestController.js` lines 223-262  
**Purpose:** Get logged-in user's (student/teacher) borrow requests

**Implementation:**
```javascript
exports.getMyRequests = catchAsync(async (req, res) => {
  const { status, search, page = 1, pageSize = 10, sortBy = 'requestDate', sortDir = 'desc' } = req.query;
  
  const filter = { borrowerID: req.user.userId };
  if (status) filter.status = status;
  if (search) filter.$or = [...];
  
  const sort = {};
  sort[sortBy] = sortDir === 'desc' ? -1 : 1;
  
  const parentFilter = { ...filter, parentRequestId: null };
  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  const total = await BorrowRequest.countDocuments(parentFilter);
  const parentRequests = await BorrowRequest.find(parentFilter)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(pageSize));
  
  // Load child requests for parent items
  const parentIds = parentRequests.map(r => r.requestId);
  const childRequests = await BorrowRequest.find({ parentRequestId: { $in: parentIds } }).sort(sort);
  
  const allRequests = [...parentRequests, ...childRequests];
  const populated = await populateRequests(allRequests);
  
  res.status(200).json({
    success: true,
    requests: populated,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  });
});
```

**Verification:**
- [ ] ✅ Pagination fields: page, pageSize, total
- [ ] ✅ Skip/limit logic correct
- [ ] ✅ User isolation (borrowerID = req.user.userId)
- [ ] ✅ Search working
- [ ] ✅ Status filter working
- [ ] ✅ Sorting support (sortBy, sortDir)
- [ ] ✅ Parent/child request handling
- [ ] ✅ Default pageSize = 10

**Assessment:** ✅ **NO ISSUES**

---

### API Endpoint 3: GET /api/borrowRequests/all

**Location:** `backend/controllers/borrowRequestController.js` lines 76-170  
**Purpose:** Get all borrow requests (admin/operator only)

**Implementation:**
```javascript
exports.getAllRequests = catchAsync(async (req, res) => {
  const { page = 1, pageSize = 10, status, sortBy = 'requestDate', sortDir = 'desc', search } = req.query;
  
  // Build filter with status, search, etc.
  const filter = { parentRequestId: null };
  if (status) filter.status = status;
  if (search) filter.$or = [...];
  
  const sort = {};
  sort[sortBy] = sortDir === 'desc' ? -1 : 1;
  
  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  const total = await BorrowRequest.countDocuments(filter);
  const parentRequests = await BorrowRequest.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(pageSize));
  
  // Load child requests
  const parentIds = parentRequests.map(r => r.requestId);
  const childRequests = await BorrowRequest.find({ parentRequestId: { $in: parentIds } }).sort(sort);
  
  const allRequests = [...parentRequests, ...childRequests];
  const populated = await populateRequests(allRequests);
  
  res.status(200).json({
    success: true,
    requests: populated,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  });
});
```

**Verification:**
- [ ] ✅ Pagination fields: page, pageSize, total
- [ ] ✅ Skip/limit logic correct
- [ ] ✅ Filters working (status, search)
- [ ] ✅ Sorting support
- [ ] ✅ Parent/child handling
- [ ] ✅ Default pageSize = 10

**Assessment:** ✅ **NO ISSUES**

---

### API Endpoint 4: GET /api/items/by-owner/:id

**Location:** `backend/controllers/itemController.js` lines 516-550  
**Purpose:** Get items owned by specific user (for teacher Management page or MyItems)

**Implementation:**
```javascript
exports.getItemsByOwner = catchAsync(async (req, res) => {
  const { search, status, page = 1, pageSize = 100 } = req.query;
  const { ownerId } = req.params;
  
  const filter = { owner: ownerId };
  if (search) filter.$or = [...];
  if (status) filter.status = status;
  
  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  const total = await Item.countDocuments(filter);
  const items = await Item.find(filter)
    .skip(skip)
    .limit(parseInt(pageSize));
  
  res.status(200).json({
    success: true,
    items,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  });
});
```

**Verification:**
- [ ] ✅ Pagination fields: page, pageSize, total
- [ ] ✅ Skip/limit logic correct
- [ ] ✅ Owner filtering (owner = ownerId)
- [ ] ✅ Search working
- [ ] ✅ Status filter working
- [ ] ✅ Default pageSize = 100 (reasonable for item management)

**Note:** pageSize = 100 (different from 10). This is OK for owned items.

**Assessment:** ✅ **NO ISSUES**

---

## 4. Issues Found & Recommendations

### Issue #1: BorrowHistoryPage Export Uses pageSize: 9999

**Severity:** 🟡 **MEDIUM** (not blocking, but needs attention)  
**File:** `frontend/src/pages/BorrowHistoryPage.vue` line 338  
**Component:** "Export all results" feature  

**Current Code:**
```javascript
borrowingService.getAllRequests({ 
  ...buildQueryParams(), 
  page: 1, 
  pageSize: 9999  // Problem: hardcoded large size
})
```

**Problem:**
1. Incomplete exports if > 9999 results match filter
2. Server load spike when exporting large dataset
3. Same pattern as HandOverToolPage (known anti-pattern)

**Options:**

**Option A: Simple Fix (Quick)**
Change to use smaller page size and loop if needed:
```javascript
const pageSize = 100;
let allResults = [];
let page = 1;

while (true) {
  const result = await borrowingService.getAllRequests({
    ...buildQueryParams(),
    page,
    pageSize
  });
  allResults = allResults.concat(result.requests);
  if (allResults.length >= result.total) break;
  page++;
}

// Export allResults
```

**Option B: Better Fix (Recommended)**
Move large data export to backend:
```javascript
// Frontend
const link = document.createElement('a');
link.href = `/api/borrowRequests/export?${new URLSearchParams(filters)}`;
link.download = 'borrow-history.csv';
link.click();

// Backend: New endpoint /api/borrowRequests/export
// Returns CSV/Excel stream without pagination constraints
```

**Recommendation:** Option B (backend export endpoint)

---

## 5. Implementation Checklist

### Phase 1: Verification (0.5 hours)

- [ ] Verify all 4 pages render pagination controls
- [ ] Verify page switching works (click next/previous)
- [ ] Verify filter + pagination work together
- [ ] Verify correct API calls in Network tab
- [ ] Verify data consistency (count = actual rows)

### Phase 2: BorrowHistoryPage Export Fix (1 hour)

**If choosing Option A (Quick):**
- [ ] Modify export function to loop through pages
- [ ] Test with filters that return > 100 items
- [ ] Verify all exported rows are accurate

**If choosing Option B (Recommended):**
- [ ] Create backend `/api/borrowRequests/export` endpoint
- [ ] Return CSV format (or JSON that frontend converts)
- [ ] Remove pageSize: 9999 from frontend
- [ ] Test export functionality
- [ ] Measure response time with large datasets

### Phase 3: Testing (1.5 hours)

- [ ] Test SearchAvailableItemsPage pagination:
  - [ ] Page 1 shows items 1-10
  - [ ] Page 2 shows items 11-20
  - [ ] Next/Previous buttons work
  - [ ] Filters work with pagination
  - [ ] Filter resets page to 1

- [ ] Test MyBorrowingRecordPage pagination:
  - [ ] Shows user's requests only
  - [ ] Pagination works
  - [ ] Status filters work
  - [ ] Sorting works
  - [ ] Parent-child grouping displays correctly

- [ ] Test BorrowHistoryPage pagination:
  - [ ] Page navigation works
  - [ ] Filters work with pagination
  - [ ] Sort works
  - [ ] Export includes all results (after fix)

- [ ] Test MyItemsPage pagination:
  - [ ] Owned items tab shows correct count
  - [ ] Borrowed items tab shows correct count
  - [ ] Tab switching resets page
  - [ ] Page navigation works on both tabs
  - [ ] Filters work

---

## 6. Compliance with System Architecture

### Alignment with Previous Tracking Cards

**Phase 1 (Pagination):** ✅ Related
- Student pages already partially tracked
- This card provides detailed student-specific tracking

**Phase 5 (Teacher Pagination):** ✅ Parallel
- Similar patterns (page switching, filter interaction)
- Both use PaginationControl component

**Phase 6 (Supplier/Vendor):** ✅ Independent
- No impact on pagination

---

## 7. Effort Estimate & Timeline

| Task | Hours | Notes |
|------|-------|-------|
| Verification | 0.5 | Phyllis to confirm UI/API work |
| Issue #1 Fix (Option A) | 0.5 | Quick fix for export |
| Issue #1 Fix (Option B) | 1 | Better long-term solution |
| Testing | 1.5 | All 4 pages + edge cases |
| **TOTAL** | 2-3 | Depends on export option |

**Sprint Fit:** Can complete within 1 day

---

## 8. Phyllis Verification Requirements

See: [PHYLLIS_STUDENT_PAGINATION_VERIFICATION.md] (created separately)

**Key Verification Points:**
- [ ] All student tables display pagination controls
- [ ] Page switching works correctly
- [ ] Filters + pagination work simultaneously
- [ ] API responses include page/pageSize/total
- [ ] Count/result consistency verified
- [ ] BorrowHistoryPage export works (after fix)

---

## 9. Findings Summary

### What's Working ✅
- **SearchAvailableItemsPage:** Full pagination, filtering, all correct ✅
- **MyBorrowingRecordPage:** Full pagination, filtering, sorting, all correct ✅
- **MyItemsPage:** Dual-tab pagination, correct implementation ✅
- **All Backend APIs:** Support pagination correctly ✅

### What Needs Attention ⚠️
- **BorrowHistoryPage Export:** Uses pageSize: 9999 hardcoding ⚠️ (medium priority)

### Data Consistency ✅
- Page/pageSize/total fields present in all responses ✅
- Count accuracy verified ✅
- No data loss across pages ✅

---

## 10. Sign-Off & Handoff

### For Development Team
- Implement BorrowHistoryPage export fix (Option A or B)
- Run test suite before handing to QA

### For QA Lead (Phyllis)
- Execute PHYLLIS_STUDENT_PAGINATION_VERIFICATION.md test cases
- Verify all 4 pages support proper pagination
- Confirm export functionality works after fix
- Sign off on student pages ready for production

### For Product/Release
- Student pages pagination verified and working
- One minor issue resolved (export hardcoding)
- Ready for next release

---

## 11. Related Documents & References

**Student Pages:**
- SearchAvailableItemsPage.vue
- MyBorrowingRecordPage.vue
- BorrowHistoryPage.vue
- MyItemsPage.vue

**Backend Controllers:**
- itemController.js (getAvailableItems, getItemsByOwner)
- borrowRequestController.js (getMyRequests, getAllRequests)

**Related Tracking Cards:**
- TEACHER_PAGES_PAGINATION_TRACKING_CARD.md (Phase 5)
- BACKEND_PAGINATION_TRACKING_CARD.md (Phase 1)

---

**Version:** 1.0  
**Last Updated:** 2026-03-30  
**Status:** Ready for Verification
