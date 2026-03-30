# ✅ Student Pages Pagination - Phyllis Verification Checklist

**For:** QA Lead (Phyllis)  
**Purpose:** Verify student-facing pages have proper pagination implementation  
**Date Started:** _____________  
**Date Completed:** _____________  

---

## 1. Pre-Test Setup

### Environment Verification
- [ ] Backend running on `http://localhost:5002`
- [ ] Frontend running on `http://localhost:3000`
- [ ] Test user accounts:
  - [ ] Student account (with multiple borrow requests)
  - [ ] Teacher account (with owned items)
  - [ ] Admin account (for BorrowHistoryPage access)
- [ ] Sample data:
  - [ ] 50+ available items (to test pagination)
  - [ ] 30+ student borrow requests
  - [ ] 20+ teacher-owned items

**Setup Steps:**

```bash
# Create test student account
curl -X POST http://localhost:5002/api/users \
  -H "Content-Type: application/json" \
  -d '{"userId": "STU_TEST", "role": "user", "subRole": "student"}'

# Create test teacher account with owned items
curl -X POST http://localhost:5002/api/users \
  -H "Content-Type: application/json" \
  -d '{"userId": "TEACH_TEST", "role": "user", "subRole": "teacher"}'

# Verify items exist (at least 50 available)
curl "http://localhost:5002/api/items?status=Available&pageSize=1"
# Check the "total" field - should be > 50
```

---

## 2. SearchAvailableItemsPage Verification

### Test Case #1: Basic Pagination

**Objective:** Verify items search page has working pagination

**Steps:**

1. **Login as Student**
   - Navigate to `/search-available` or main search page
   - [ ] Page loads with item list

2. **Verify Pagination Controls**
   - [ ] Pagination component visible at bottom
   - [ ] Shows "Page X of Y" or similar
   - [ ] Next/Previous buttons present
   - [ ] Page number inputs present

3. **Test Page Navigation**
   - [ ] Default shows items 1-10
   - [ ] Click "Next" button
   - [ ] Shows items 11-20
   - [ ] Items are different from page 1
   - [ ] Can go back to page 1
   - [ ] Page indicator updates

4. **Verify API Calls (Network Tab)**
   ```
   First load: GET /api/items/available?page=1&pageSize=10&category=&location=
   After clicking next: GET /api/items/available?page=2&pageSize=10&category=&location=
   ```
   - [ ] page parameter changes
   - [ ] pageSize consistent (10)
   - [ ] Response includes: items, total, page, pageSize

5. **Check Data Consistency**
   - [ ] totalItems from API matches pagination display
   - [ ] All items have status='Available'
   - [ ] No duplicates across pages

**Finding:**
- [ ] ✅ Page navigation works correctly
- [ ] ⚠️ Issues: ________________
- [ ] ❌ Broken pagination

---

### Test Case #2: Pagination with Filters

**Objective:** Verify pagination works when filtering items

**Steps:**

1. **Apply Category Filter**
   - [ ] Select a category (e.g., "Cameras")
   - [ ] Page resets to 1 ✅
   - [ ] Results show only that category
   - [ ] Result count changes (should be < total items)

2. **Navigate to Page 2**
   - [ ] Click next page
   - [ ] Still showing same category
   - [ ] totalItems = sum of all pages for this category
   - [ ] Can navigate multiple pages

3. **Apply Second Filter (Location)**
   - [ ] Select location
   - [ ] Page resets to 1 ✅
   - [ ] Results filtered by BOTH category + location
   - [ ] totalItems updates to match filters

4. **Clear Filters**
   - [ ] Clear all filters
   - [ ] Page resets to 1 ✅
   - [ ] Shows all available items again
   - [ ] totalItems restores to full count

5. **Verify API (Network Tab)**
   - [ ] Filters passed as query parameters: ?category=Cameras&location=Lab1
   - [ ] Pagination works with filters
   - [ ] count = actual filtered items

**Finding:**
- [ ] ✅ Filters + pagination work together
- [ ] ⚠️ Issues: ________________
- [ ] ❌ Broken

---

### Test Case #3: Search + Pagination

**Objective:** Verify search text works with pagination

**Steps:**

1. **Search for Item**
   - [ ] Type search term (e.g., "camera")
   - [ ] Results appear (matching items)
   - [ ] Page resets to 1

2. **Paginate Search Results**
   - [ ] If > 10 results, pagination shows
   - [ ] Click next page
   - [ ] Shows next 10 matching results
   - [ ] All results match search term

3. **Verify Count**
   - [ ] totalItems = total matching items
   - [ ] Pagination pages = ceil(totalItems / 10)

**Finding:**
- [ ] ✅ Search + pagination working
- [ ] ⚠️ Issues: ________________
- [ ] ❌ Not working

---

## 3. MyBorrowingRecordPage Verification

### Test Case #4: Borrow Request Pagination

**Objective:** Verify student's personal borrow request history has pagination

**Steps:**

1. **Navigate to Borrowing Record**
   - [ ] Login as student with requests
   - [ ] Navigate to `/my-borrowing-record` or similar
   - [ ] Page loads with request cards/table

2. **Check Pagination Controls**
   - [ ] Pagination component visible
   - [ ] Shows current page
   - [ ] Shows total pages

3. **Test Page Navigation**
   - [ ] Page 1 shows first 10 requests
   - [ ] Click next
   - [ ] Page 2 shows next 10 requests
   - [ ] Requests are different (no overlap)

4. **Verify API Response**
   - Network tab:
   ```
   GET /api/borrowRequests/my?page=1&pageSize=10&sortBy=requestDate&sortDir=desc
   Response:
   {
     "success": true,
     "requests": [...],
     "total": XYZ,
     "page": 1,
     "pageSize": 10
   }
   ```
   - [ ] page field present
   - [ ] pageSize field present
   - [ ] total field present
   - [ ] requests array <= pageSize

5. **Data Integrity**
   - [ ] All requests belong to logged-in user
   - [ ] No requests from other users shown
   - [ ] Total count = student's request count only
   - [ ] Status colors displayed correctly

**Finding:**
- [ ] ✅ Pagination correct
- [ ] ⚠️ Issues: ________________
- [ ] ❌ Data isolation problem

---

### Test Case #5: Pagination with Status Filter

**Objective:** Verify status filtering works with pagination

**Steps:**

1. **Apply Status Filter**
   - [ ] Select status (e.g., "Approved")
   - [ ] Page resets to 1
   - [ ] Shows only requests with that status

2. **Check Count**
   - [ ] totalItems <= total requests (filtered)
   - [ ] All shown requests match status

3. **Navigate Pages**
   - [ ] Can go to page 2 with filter
   - [ ] All results on page 2 also match filter
   - [ ] No data loss across pages

4. **Switch Status Filter**
   - [ ] Change to different status (e.g., "Pending")
   - [ ] Page resets to 1
   - [ ] Different set of requests shown
   - [ ] totalItems changes to match new status

**Finding:**
- [ ] ✅ Filter + pagination working
- [ ] ⚠️ Issues: ________________

---

### Test Case #6: Parent/Child Request Grouping

**Objective:** Verify parent requests and linked components display correctly with pagination

**Steps:**

1. **Find Request with Components**
   - Items in borrow requests can have linked components (sub-items)
   - Look for request showing child items

2. **Verify Grouping on Multiple Pages**
   - [ ] Page 1 shows parent + children correctly
   - [ ] Move to page 2
   - [ ] Parent/children still grouped properly
   - [ ] No grouped items split across pages

3. **Verify Count**
   - [ ] totalItems = parent request count only (not including children)
   - [ ] Pagination based on parents (correct)

**Finding:**
- [ ] ✅ Grouping works correctly with pagination
- [ ] ⚠️ Minor issues: ________________
- [ ] ❌ Grouping broken

---

## 4. BorrowHistoryPage Verification

### Test Case #7: Admin Borrow History Pagination

**Objective:** Verify admin/operator view of all borrow requests

**Steps:**

1. **Login as Admin/Operator**
   - [ ] Navigate to `/borrow-history` (admin-only page)
   - [ ] Page loads with all requests table

2. **Verify Pagination Controls**
   - [ ] Pagination visible at bottom
   - [ ] Shows page X of Y

3. **Test Page Navigation**
   - [ ] Page 1 shows first 10 requests (from all users)
   - [ ] Click next
   - [ ] Page 2 shows next 10 requests
   - [ ] Requests are different
   - [ ] Can navigate 3+ pages

4. **Check API Calls**
   - Network tab:
   ```
   GET /api/borrowRequests/all?page=1&pageSize=10&...
   Response includes page, pageSize, total
   ```
   - [ ] Correct fields present
   - [ ] page parameter changes on navigation

5. **Verify All Users Visible**
   - [ ] Requests from different students shown
   - [ ] Requests from different teachers shown
   - [ ] No user isolation (correct for admin)

**Finding:**
- [ ] ✅ Admin pagination working
- [ ] ⚠️ Issues: ________________

---

### Test Case #8: History Filtering + Pagination

**Objective:** Verify filters work with pagination

**Steps:**

1. **Apply Status Filter**
   - [ ] Filter for "Approved" requests
   - [ ] Page resets to 1
   - [ ] Shows only Approved

2. **Navigate Pages**
   - [ ] Click next
   - [ ] Still showing only Approved
   - [ ] totalItems = count of Approved only

3. **Apply Date/Sort Filter**
   - [ ] Try sorting by different columns
   - [ ] Pagination still works
   - [ ] First page shows correct sorted results

4. **Search Filter**
   - [ ] Search for student ID or request ID
   - [ ] Results filtered
   - [ ] Pagination works on filtered results

**Finding:**
- [ ] ✅ Filters + pagination working
- [ ] ⚠️ Issues: ________________

---

### Test Case #9: Export Functionality (Known Issue)

**Objective:** Verify export works correctly

**⚠️ NOTE:** Issue #1 in tracking card: Export uses pageSize: 9999

**Current Status:** ❓ Testing to verify if this causes problems

**Steps:**

1. **Create Large Filter Result**
   - [ ] Apply filter that returns 100+ items
   - [ ] Note the total count shown in pagination

2. **Export Data**
   - [ ] Look for "Export" button
   - [ ] Click to export (CSV/Excel)
   - [ ] Note: May download slowly if > 1000 items

3. **Verify Exported Data**
   - [ ] Open exported file
   - [ ] Check row count
   - [ ] Does exported count = totalItems?
     - [ ] YES ✅ - Working correctly
     - [ ] NO ❌ - Issue #1 confirmed (incomplete export)

4. **Test Edge Case: > 9999 Items**
   - If test data has > 9999 filtered results:
     - [ ] Export row count = 9999? (Bug)
     - [ ] Export row count = total? (Fixed)

**Finding:**
- [ ] ✅ Export includes all items
- [ ] ⚠️ Export incomplete (issue confirmed)
- [ ] ❌ Export broken

**If issue confirmed:**
- [ ] Document exact count discrepancy
- [ ] Recommend fix to dev team

---

## 5. MyItemsPage Verification

### Test Case #10: Owned Items Tab (Teacher) Pagination

**Objective:** Verify teacher can paginate through owned items

**Pre-condition:** Login as teacher with 20+ owned items

**Steps:**

1. **Navigate to My Items**
   - [ ] URL: `/my-items`
   - [ ] "My Items" page loads
   - [ ] "Owned Items" tab selected (teacher only)

2. **Verify Pagination Controls**
   - [ ] Shows pagination at bottom
   - [ ] Page size = 15 items per page
   - [ ] Correct for owned items list

3. **Test Page Navigation**
   - [ ] Page 1 shows items 1-15
   - [ ] Click next
   - [ ] Page 2 shows items 16-30
   - [ ] Items different, no overlap

4. **Verify Tab Count**
   - [ ] "Owned Items" badge shows count
   - [ ] Count = totalItems from pagination
   - [ ] Example: If 47 owned items, shows "47"

5. **API Verification**
   - Network tab:
   ```
   GET /api/items/by-owner/TEACHER_ID?page=1&pageSize=15
   Response: { items, total, page, pageSize }
   ```
   - [ ] owner filter applied
   - [ ] Only this teacher's items returned
   - [ ] pageSize = 15 (not 10)

**Finding:**
- [ ] ✅ Owned items pagination correct
- [ ] ⚠️ Issues: ________________
- [ ] ❌ Not working

---

### Test Case #11: Borrowed Items Tab Pagination

**Objective:** Verify pagination for items I've borrowed (both student and teacher)

**Steps:**

1. **Click "Borrowed Items" Tab**
   - [ ] Tab switches to borrowed items
   - [ ] Page automatically shows borrowed items
   - [ ] Shows items currently checked out to me (status='Approved')

2. **Check Pagination**
   - [ ] Pagination visible
   - [ ] Page size = 15 items per page
   - [ ] Same as owned items tab

3. **Test Page Navigation**
   - [ ] Page 1 shows items 1-15
   - [ ] Click next
   - [ ] Page 2 shows items 16-30
   - [ ] Different from page 1

4. **Verify Tab Count**
   - [ ] "Borrowed Items" badge shows correct count
   - [ ] Count only includes items with status='Approved'
   - [ ] Doesn't include rejected or pending

5. **API Verification**
   - Network:
   ```
   GET /api/borrowRequests/my?page=1&pageSize=15&status=Approved
   Response: { requests, total, page, pageSize }
   ```
   - [ ] Only Approved requests returned
   - [ ] Only current user's items
   - [ ] pageSize = 15

**Finding:**
- [ ] ✅ Borrowed items pagination correct
- [ ] ⚠️ Issues: ________________

---

### Test Case #12: Tab Switching with Pagination

**Objective:** Verify page resets when switching tabs

**Steps:**

1. **Go to Borrowed Items Page 2**
   - [ ] Navigate to page 2
   - [ ] Pagination shows page 2

2. **Switch to Owned Items Tab**
   - [ ] Click "Owned Items"
   - [ ] Page SHOULD reset to 1 ✅
   - [ ] Not stay on page 2

3. **Back to Borrowed**
   - [ ] Click tab again
   - [ ] Should start at page 1 again (not remember page 2)

**Purpose:** Prevents user confusion - each tab starts fresh

**Finding:**
- [ ] ✅ Tab switching resets page correctly
- [ ] ⚠️ Stays on same page number (minor)

---

## 6. Count & Consistency Tests

### Test Case #13: Count Accuracy

**Objective:** Verify pagination count = actual data

**For Each Page:**

1. **Count Database Records:**
   ```bash
   # SearchAvailableItemsPage
   db.items.countDocuments({ status: 'Available' })
   # Result: ___________
   
   # MyBorrowingRecordPage (for test student)
   db.borrowrequests.countDocuments({ borrowerID: 'STU_TEST' })
   # Result: ___________
   
   # BorrowHistoryPage (all requests)
   db.borrowrequests.countDocuments({ parentRequestId: null })
   # Result: ___________
   ```

2. **Compare with API Total:**
   ```bash
   curl "http://localhost:5002/api/items/available?pageSize=1"
   # Check "total" field
   
   curl "http://localhost:5002/api/borrowRequests/my?pageSize=1"
   # Check "total" field
   ```

3. **Verify Match:**
   - SearchAvailableItems: DB count = API total? ✅
   - MyBorrowingRecord: DB count = API total? ✅
   - BorrowHistory: DB count = API total? ✅

**Finding:**
- [ ] ✅ All counts accurate
- [ ] ❌ Discrepancies found (describe):
  ```
  Page: ___________
  DB Count: ___
  API Total: ___
  Difference: ___
  ```

---

### Test Case #14: No Data Loss Across Pages

**Objective:** Verify no items lost or duplicated across all pages

**Steps:**

1. **Collect All Items Across Pages:**

   **For SearchAvailableItems:**
   ```javascript
   // Pseudo-code to collect all pages
   let allItems = []
   let page = 1
   while (true) {
     const result = await fetch(`/api/items/available?page=${page}&pageSize=10`)
     if (!result.items.length) break
     allItems.push(...result.items.map(i => i.id))
     page++
   }
   ```

2. **Verify No Duplicates:**
   - [ ] Set(allItems).size === allItems.length (no duplicates)

3. **Verify No Gaps:**
   - [ ] Items appear in sequence
   - [ ] Example: [1, 2, 3, ..., N] not [1, 2, 4, ...]

4. **Verify Complete:**
   - [ ] allItems.length === totalCount from page 1

**Finding:**
- [ ] ✅ No data loss, proper pagination
- [ ] ❌ Data issues found (describe)

---

## 7. Issue Logging

### Issue Template

**Issue #1: [Short Description]**

**Severity:** 🔴 CRITICAL / 🟡 MEDIUM / 🟢 MINOR  
**Test Case(s):** [Which test found this]  
**Component:** [Page/API affected]  

**Description:**
[What's wrong and impact]

**Steps to Reproduce:**
1. ...
2. ...

**Expected vs Actual:**
- Expected: ...
- Actual: ...

**Suggested Fix:**
[If known]

---

## 8. Summary & Recommendation

### Test Results

| Test # | Test Name | Status | Result |
|--------|-----------|--------|--------|
| 1 | SearchAvailable basic pagination | ⏳ PENDING | |
| 2 | SearchAvailable filters + pagination | ⏳ PENDING | |
| 3 | SearchAvailable search + pagination | ⏳ PENDING | |
| 4 | MyBorrowingRecord pagination | ⏳ PENDING | |
| 5 | MyBorrowingRecord filters | ⏳ PENDING | |
| 6 | Parent/child grouping | ⏳ PENDING | |
| 7 | BorrowHistory admin pagination | ⏳ PENDING | |
| 8 | BorrowHistory filters | ⏳ PENDING | |
| 9 | Export functionality | ⏳ PENDING | |
| 10 | MyItems owned tab | ⏳ PENDING | |
| 11 | MyItems borrowed tab | ⏳ PENDING | |
| 12 | Tab switching | ⏳ PENDING | |
| 13 | Count accuracy | ⏳ PENDING | |
| 14 | No data loss | ⏳ PENDING | |

### Issues Summary

- 🔴 **Critical:** ___
- 🟡 **Medium:** ___ (possibly Issue #1 if confirmed)
- 🟢 **Minor:** ___

### Overall Assessment

- [ ] ✅ **APPROVED** - All student pages pagination working correctly
- [ ] ⚠️ **APPROVED WITH NOTES** - Working with minor notes (see issues)
- [ ] ❌ **REJECTED** - Issues found, needs fixes

---

## 9. Sign-Off

**Phyllis Signature:** ________________  
**Date:** ________________  
**Time Spent:** ___ hours  

**Quality Metrics:**
- Pagination Implementation: ___/10
- Filter Integration: ___/10
- Data Consistency: ___/10
- User Experience: ___/10

**Recommendations:**
1. ___________________________________
2. ___________________________________
3. ___________________________________

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-30
