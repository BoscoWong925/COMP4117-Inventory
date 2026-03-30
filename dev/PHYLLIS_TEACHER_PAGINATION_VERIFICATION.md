# ✅ Teacher Pages Pagination - Phyllis Verification Checklist

**For:** QA Lead (Phyllis)  
**Purpose:** Verify teacher-focused endpoints have proper pagination implementation  
**Date Started:** _____________  
**Date Completed:** _____________  

---

## 1. Pre-Test Setup

### Environment Verification
- [ ] Backend running on `http://localhost:5002`
- [ ] Frontend running on `http://localhost:3000`
- [ ] Test user accounts created:
  - [ ] Teacher account (with owned items)
  - [ ] Student account (with borrow requests)
- [ ] Sample data exists:
  - [ ] Items owned by teacher
  - [ ] Pending borrow requests on teacher's items
  - [ ] Completed requests (approved/returned)
  - [ ] Items currently borrowed by students

**Setup Test Data (if needed):**
```bash
# Create test teacher
curl -X POST http://localhost:5002/api/users \
  -H "Content-Type: application/json" \
  -d '{"userId": "TEST_TEACHER", "role": "user", "subRole": "teacher", ...}'

# Create test items for teacher
curl -X POST http://localhost:5002/api/items \
  -H "Content-Type: application/json" \
  -d '{"itemId": "ITEM1", "owner": "TEST_TEACHER", ...}'

# Create test borrow requests
curl -X POST http://localhost:5002/api/borrowRequests \
  -H "Content-Type: application/json" \
  -d '{"itemID": "ITEM1", "borrowerID": "STUDENT_ID", ...}'
```

---

## 2. API Endpoint Verification

### Test Case #1: GET /api/borrowRequests/teacher-pending

**Objective:** Verify pagination fields and filtering for pending requests

**Test 1A: Basic Pagination**

```bash
curl -X GET "http://localhost:5002/api/borrowRequests/teacher-pending?page=1&pageSize=5" \
  -H "Authorization: Bearer <TEACHER_TOKEN>"
```

**Expected Response:**
```json
{
  "success": true,
  "requests": [...5 items...],
  "total": 25,
  "page": 1,              // ✅ SHOULD BE INCLUDED
  "pageSize": 5,          // ✅ SHOULD BE INCLUDED
  "pendingCount": 15,
  "checkoutCount": 10
}
```

**Verification:**
- [ ] Response includes `page` field? (Currently ❌ MISSING)
- [ ] Response includes `pageSize` field? (Currently ❌ MISSING)
- [ ] `requests` array has 5 items (or less if fewer than 5 available)
- [ ] `total` matches actual total count
- [ ] `pendingCount` = count where status = 'Pending'
- [ ] `checkoutCount` = count where status = 'Pending Check-Out'

**Finding:**
- [ ] ✅ All fields present
- [ ] ❌ Missing `page` field
- [ ] ❌ Missing `pageSize` field
- [ ] ⚠️ Other issues: ________________

---

**Test 1B: Page Navigation**

```bash
# Page 1
curl "http://localhost:5002/api/borrowRequests/teacher-pending?page=1&pageSize=5"
# Expected: items 1-5, total >= 5

# Page 2
curl "http://localhost:5002/api/borrowRequests/teacher-pending?page=2&pageSize=5"
# Expected: items 6-10, total >= 10

# Verify items are different
```

**Verification:**
- [ ] Page 1 and Page 2 return different items
- [ ] No duplicate items across pages
- [ ] Last page returns fewer items (if total not divisible by pageSize)

---

**Test 1C: Status Filtering + Pagination**

```bash
# Get only 'Pending' requests
curl "http://localhost:5002/api/borrowRequests/teacher-pending?page=1&pageSize=5&status=Pending"

# Expected: only items with status='Pending'
```

**Verification:**
- [ ] All returned items have `status = "Pending"`
- [ ] `total` reflects filtered count (≤ pendingCount)
- [ ] Pagination works with filter (different page shows different items)

```bash
curl "http://localhost:5002/api/borrowRequests/teacher-pending?page=1&pageSize=5&status=Pending%20Check-Out"
```

- [ ] All returned items have `status = "Pending Check-Out"`
- [ ] `total` reflects filtered count (≤ checkoutCount)

---

### Test Case #2: GET /api/borrowRequests/teacher-history

**Objective:** Verify teacher history endpoint pagination

**Test 2A: Basic Pagination**

```bash
curl -X GET "http://localhost:5002/api/borrowRequests/teacher-history?page=1&pageSize=5" \
  -H "Authorization: Bearer <TEACHER_TOKEN>"
```

**Expected Response:**
```json
{
  "success": true,
  "requests": [...],
  "total": 42,
  "page": 1,       // ✅ SHOULD BE INCLUDED
  "pageSize": 5
}
```

**Verification:**
- [ ] Response includes `page` field? ✅
- [ ] Response includes `pageSize` field? ✅
- [ ] `requests` has <= 5 items
- [ ] `total` = count of Approved + Rejected + Returned

**Status:**
- [ ] ✅ Already correct
- [ ] ⚠️ Issues found: ________________

---

**Test 2B: Sorting**

```bash
# Default sort (by requestDate, desc)
curl "http://localhost:5002/api/borrowRequests/teacher-history?page=1&pageSize=5"

# Expected: newest requests first
```

**Verification:**
- [ ] Requests sorted by requestDate descending (newest first)
- [ ] Sort consistent across pages

**Optional: Custom sort**
```bash
curl "http://localhost:5002/api/borrowRequests/teacher-history?page=1&pageSize=5&sortBy=approvalDate&sortDir=asc"
```

- [ ] Can sort by different fields
- [ ] Sort direction (asc/desc) works

---

**Test 2C: Status Filter on History**

```bash
# Filter by status
curl "http://localhost:5002/api/borrowRequests/teacher-history?page=1&pageSize=5&status=Returned"

# Expected: only returned items
```

**Verification:**
- [ ] All items have `status = "Returned"`
- [ ] `total` reflects filtered count
- [ ] Can filter by other statuses: Approved, Rejected

---

### Test Case #3: GET /api/items/by-owner/:ownerId

**Objective:** Verify teacher's owned items endpoint supports pagination

**Test 3A: Pagination Support**

```bash
curl -X GET "http://localhost:5002/api/items/by-owner/TEACHER_ID?page=1&pageSize=10" \
  -H "Authorization: Bearer <TEACHER_TOKEN>"
```

**Expected Response:**
```json
{
  "success": true,
  "items": [...],
  "total": N,
  "page": 1,
  "pageSize": 10
}
```

**Verification:**
- [ ] Response includes pagination fields (page, pageSize, total)?
- [ ] `items` array has <= 10 items
- [ ] `total` matches actual owner item count

**If not implemented:**
```bash
curl "http://localhost:5002/api/items/by-owner/TEACHER_ID?pageSize=5"
# Response status: ___________
# Fields returned: ___________
```

**Finding:**
- [ ] ✅ Pagination supported
- [ ] ⚠️ Partial pagination (maybe total but not page/pageSize)
- [ ] ❌ No pagination support

---

## 3. Frontend Page Verification

### Test Case #4: TeacherRequestsPage - Pending Tab

**Objective:** Verify Pending tab pagination works correctly

**Steps:**

1. **Login as teacher** with pending requests on their items

2. **Navigate to TeacherRequestsPage**
   ```
   URL: /teacher-requests (or similar)
   ```

3. **Check Initial Load**
   - [ ] Pending tab shows requests
   - [ ] Pagination controls visible (shows "1 of X" or similar)
   - [ ] First page shows up to 10 items

4. **Open DevTools → Network Tab**

5. **Click Next Page Button (→)**
   - [ ] Network request sent: `/api/borrowRequests/teacher-pending?page=2&pageSize=10&status=Pending`
   - [ ] Response contains new items
   - [ ] Items displayed change
   - [ ] Table updated with page 2 data

6. **Verify Count**
   - [ ] Pagination control shows correct total
   - [ ] Total = pendingCount (from API response)
   - [ ] Can navigate to last page

**Expected Behavior:**
- [ ] Page numbers clickable
- [ ] Next/Previous buttons work
- [ ] Current page highlighted
- [ ] No errors in console

**Finding:**
- [ ] ✅ Pagination works correctly
- [ ] ⚠️ Partial issues: ________________
- [ ] ❌ Broken pagination

---

### Test Case #5: TeacherRequestsPage - Pending Check-Out Tab

**Objective:** Verify Check-Out tab pagination with different count

**Steps:**

1. **Click "Pending Check-Out" tab**
   - [ ] Tab switches
   - [ ] Pagination resets (shows page 1)
   - [ ] Requests displayed change (different from Pending tab)

2. **Check Pagination Controls**
   - [ ] Shows `checkoutCount` (not `pendingCount`)
   - [ ] Different total than Pending tab ✅ (if counts differ)

3. **Network Verification**
   ```
   Expected request: /api/borrowRequests/teacher-pending?page=1&pageSize=10&status=Pending%20Check-Out
   ```
   - [ ] `status` parameter = `Pending Check-Out`
   - [ ] Different items returned (checkout items, not pending)

4. **Click Next Page**
   - [ ] Shows checkout items for page 2
   - [ ] Pagination works on this tab

**Finding:**
- [ ] ✅ Tab pagination isolated correctly
- [ ] ⚠️ Issues: ________________

---

### Test Case #6: TeacherRequestsPage - History Tab

**Objective:** Verify history tab pagination + filtering

**Steps:**

1. **Click "History" tab**
   - [ ] Tab switches
   - [ ] Pagination resets to page 1
   - [ ] Shows completed requests (Approved/Rejected/Returned)

2. **Check Filter Options** (if present)
   ```
   Expect: Dropdown or buttons for "All", "Approved", "Rejected", "Returned"
   ```
   - [ ] Status filter options available
   - [ ] "All" selected by default

3. **Test Pagination with Filter**

   **Without filter (All):**
   - [ ] Page 1 shows items
   - [ ] Next page shows different items
   - [ ] Total = all completed requests

   **With filter (e.g., "Approved"):**
   ```bash
   # Network should show:
   /api/borrowRequests/teacher-history?page=1&pageSize=10&status=Approved
   ```
   - [ ] Only Approved requests shown
   - [ ] Total updated to Approved count
   - [ ] Pagination works on filtered results

4. **Switch Filters**
   - [ ] Changing filter resets page to 1 ✅
   - [ ] Total updates per filter
   - [ ] Items change to match filter

**Expected Field in Response:**
```json
{
  "page": 1,
  "pageSize": 10,
  "total": X
}
```
- [ ] All three fields present ✅

**Finding:**
- [ ] ✅ History tab pagination + filtering works
- [ ] ⚠️ Partial issues: ________________
- [ ] ❌ Broken

---

### Test Case #7: TeacherCheckoutPage - Pagination

**Objective:** Verify borrowed items pagination

**Steps:**

1. **Login as teacher** (who has borrowed items)

2. **Navigate to TeacherCheckoutPage**
   ```
   URL: /teacher-checkout (or similar)
   ```

3. **Verify Initial Load**
   - [ ] Shows borrowed items (status = 'In-use')
   - [ ] Pagination controls visible
   - [ ] Shows page 1 of X

4. **Test Page Navigation**
   - [ ] Click next page
   - [ ] Different items displayed
   - [ ] Network shows: `?page=2&pageSize=10`

5. **Test Search + Pagination**
   - [ ] Type search text
   - [ ] Page resets to 1
   - [ ] Total updates to filtered count
   - [ ] Pagination on filtered results works

**Items Should Include:**
```json
{
  "items": [
    { "itemId": "...", "status": "In-use", ... }
  ],
  "total": N,
  "page": 1,
  "pageSize": 10
}
```

**Finding:**
- [ ] ✅ Pagination works
- [ ] ⚠️ Issues: ________________
- [ ] ❌ Broken

---

### Test Case #8: HandOverToolPage - Pagination Issue

**Objective:** Verify HandOverToolPage scalability (or lack thereof)

**Current Status:** ❌ No pagination (loads all with pageSize: 9999)

**Steps:**

1. **Navigate to HandOverToolPage**

2. **Check Network Tab**
   - [ ] What pageSize is sent? (Current: 9999)
   - [ ] How many items returned?
   - [ ] How long does it take to load?

3. **Test with Data**

   **Small dataset (< 100 items):**
   - [ ] Page loads quickly

   **Large dataset (> 500 items):**
   - [ ] Does it still load? (May timeout)
   - [ ] Page load time? (Should be < 3s, but may be slow)
   - [ ] Any UI lag?

4. **Current Issues:**
   - [ ] No pagination controls
   - [ ] No search filter
   - [ ] All client-side grouping

**Finding:**
- [ ] ✅ Works fine (handles current data)
- [ ] ⚠️ Slow with large datasets
- [ ] ❌ Timeout/crash with many items

**Recommendation:**
If finding is ⚠️ or ❌, this needs refactoring to implement proper pagination.

---

## 4. Count & Data Consistency Tests

### Test Case #9: Total Count Accuracy

**Objective:** Verify API counts match actual data

**For each endpoint:**

1. **Count total matching records in database:**

   ```bash
   # For teacher-pending
   db.borrowrequests.countDocuments({
     itemID: { $in: ["ITEM1", "ITEM2", ...] },
     status: { $in: ['Pending', 'Pending Check-Out'] }
   })
   # Result: ___________
   ```

2. **Compare with API response:**

   ```bash
   curl "http://localhost:5002/api/borrowRequests/teacher-pending?pageSize=1"
   # Check "total" field: ___________
   ```

3. **Match?**
   - [ ] ✅ Database count = API total
   - [ ] ❌ Mismatch (DB: ___ API: ___)

4. **Repeat for:**
   - [ ] teacher-pending (total)
   - [ ] teacher-pending (pendingCount)
   - [ ] teacher-pending (checkoutCount)
   - [ ] teacher-history (total)

---

### Test Case #10: No Data Loss Across Pages

**Objective:** Verify paginated results don't skip or duplicate items

**Steps:**

1. **Get all items across pages:**

   ```bash
   # Page 1
   curl "?page=1&pageSize=5" → items [1,2,3,4,5]

   # Page 2
   curl "?page=2&pageSize=5" → items [6,7,8,9,10]

   # Etc. until last page
   ```

2. **Verify:**
   - [ ] No items appear on multiple pages
   - [ ] No gaps (e.g., items skip from 5 to 7)
   - [ ] Total count = sum across all pages
   - [ ] Last page has <= pageSize items

**Example Validation:**
```javascript
let allItems = [];
let page = 1;
while (true) {
  const response = fetch(`?page=${page}&pageSize=10`);
  if (!response.requests.length) break;
  allItems.push(...response.requests.map(r => r.id));
  page++;
}
// Verify allItems.length === totalFromFirstPage
// Verify no duplicates: new Set(allItems).size === allItems.length
```

**Finding:**
- [ ] ✅ No data loss, proper pagination
- [ ] ❌ Found duplicates/gaps

---

## 5. Issues Found

### Issue #1: _____

**Component:** ________________  
**Severity:** 🔴 CRITICAL / 🟡 MEDIUM / 🟢 MINOR  
**Description:** _____________________________  

**Reproduction:**
1. ________
2. ________

**Expected:** _________  
**Actual:** _________  
**Fix Required:** YES / NO  

---

### Issue #2: _____

[Repeat above template]

---

## 6. Summary

### Tests Completed

| Test # | Test Name | Result | Status |
|--------|-----------|--------|--------|
| 1A | teacher-pending - Basic pagination | ⏳ PENDING | |
| 1B | teacher-pending - Page navigation | ⏳ PENDING | |
| 1C | teacher-pending - Status filtering | ⏳ PENDING | |
| 2A | teacher-history - Basic pagination | ⏳ PENDING | |
| 2B | teacher-history - Sorting | ⏳ PENDING | |
| 2C | teacher-history - Status filter | ⏳ PENDING | |
| 3A | items/by-owner - Pagination support | ⏳ PENDING | |
| 4 | TeacherRequests - Pending tab | ⏳ PENDING | |
| 5 | TeacherRequests - Checkout tab | ⏳ PENDING | |
| 6 | TeacherRequests - History tab | ⏳ PENDING | |
| 7 | TeacherCheckoutPage - Pagination | ⏳ PENDING | |
| 8 | HandOverToolPage - Scalability | ⏳ PENDING | |
| 9 | Count accuracy | ⏳ PENDING | |
| 10 | Data consistency across pages | ⏳ PENDING | |

---

### Issue Summary

- 🔴 **Critical:** ___
- 🟡 **Medium:** ___
- 🟢 **Minor:** ___

---

## 7. Recommendation

- [ ] ✅ **APPROVED** - All pagination working correctly, teacher pages ready for production
- [ ] ⚠️ **APPROVED WITH NOTES** - Works but some improvements recommended (see issues)
- [ ] ❌ **REJECTED** - Critical issues found, requires fixes before deployment

**Next Steps:**
```
_______________________________
_______________________________
```

---

## 8. Sign-Off

**Phyllis Signature:** ________________  
**Date:** ________________  
**Time Spent:** ___ hours  

**Quality Assessment:**
- Teacher Pagination Completeness: ___/10
- Frontend-Backend Alignment: ___/10  
- Scalability Readiness: ___/10

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-30
