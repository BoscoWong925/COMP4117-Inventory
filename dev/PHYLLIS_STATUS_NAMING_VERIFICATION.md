# ✅ STATUS Naming Consistency - Phyllis Verification Checklist

**For:** QA Lead (Phyllis)  
**Purpose:** Verify all status naming has been standardized across pages, APIs, and filters  
**Date Started:** _____________  
**Date Completed:** _____________  

---

## 1. Pre-Test Setup

### Environment Verification
- [ ] Backend running on `http://localhost:5002`
- [ ] Frontend running on `http://localhost:3000`
- [ ] Test user account created (student + teacher roles)
- [ ] Sample data with pending, approved, and returned borrow requests exists

**Setup Command:**
```bash
# Backend
cd backend && npm start

# Frontend  
cd frontend && npm run dev

# Create test request (if needed)
curl -X POST http://localhost:5002/api/borrowRequests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"itemID": "ITEM001", "reason": "Test"}'
```

---

## 2. Critical Bug: HomePage Filter - Status Mismatch

### Test Case #1: Checkout Filter Sends Wrong Status Value

**Objective:** Verify that "Checkout" filter in HomePage sends correct status value ('Pending Check-Out') to backend

**Steps:**

1. **Open HomePage and navigate to Attention Items**
   ```
   Login → HomePage → Scroll to "Attention Items" section
   ```

2. **Click Filter Dropdown**
   ```
   Look for "Status" filter or filter icon
   Click "Status" filter
   ```

3. **Select "Checkout"**
   ```
   [ ] Can you see "Checkout" option in filter dropdown?
   [ ] Click it
   [ ] Do items populate in the list?
   ```

4. **Verify API Call (Open Browser DevTools)**
   ```
   F12 → Network tab → Filter for "borrowRequests"
   Click "Checkout" filter and observe network request
   
   Expected URL: 
   /api/borrowRequests?page=1&pageSize=10&status=Pending%20Check-Out
   
   Actual URL: ________________
   ```

5. **Verify Items Displayed**
   ```
   [ ] Items shown have status = 'Pending Check-Out'?
   [ ] If status = 'Pending', those should NOT appear?
   ```

**Expected Result:** ✅ Filter sends `status=Pending%20Check-Out` and shows checkout items  
**Current Status:** ❌ (may send `status=Checkout` which causes empty list)

**Finding:**
- [ ] BUG CONFIRMED - Filter sends wrong value
- [ ] BUG FIXED - Filter now sends 'Pending Check-Out'
- [ ] NO BUG FOUND - Filter already works correctly

**Evidence/Screenshot:** ________________

---

### Test Case #2: Browser DevTools Console Check

**Objective:** Verify filter values in Vue component state

**Steps:**

1. **Open HomePage & DevTools**
   ```
   F12 → Go to Console
   ```

2. **Check filterStatus value**
   ```javascript
   // In DevTools Console, type:
   // (if using Vue DevTools extension)
   $vm.filterStatus
   
   Expected: 'Pending Check-Out' (or filtered value)
   Actual: ________________
   ```

3. **Check if constant is used**
   ```
   Ctrl+F in DevTools → Search "REQUEST_STATUSES"
   Confirm constants are imported from helpers.js
   ```

**Finding:**
- [ ] FilterStatus shows correct value
- [ ] FilterStatus shows incorrect/abbreviated value
- [ ] Constants from helpers.js being used
- [ ] Constants NOT being used (hardcoded strings)

---

## 3. Status Display Consistency Tests

### Test Case #3: ApproveRequestsPage - Tab Display

**Objective:** Verify "Pending Check-Out" displays consistently in tab name and status badges

**Steps:**

1. **Login as admin/operator**
   ```
   Go to ApproveRequestsPage (Borrow Requests)
   ```

2. **Check Tab Names**
   ```
   [ ] Tab shows "Pending Check-Out" (NOT "Pending Checkout")
   [ ] Tab shows "Pending" (NOT "Pending Request")
   ```

3. **Verify Request Status Badge**
   ```
   In "Pending Check-Out" tab, look at status column:
   [ ] Shows "Pending Check-Out" badge
   [ ] Badge color is correct (blue/info)
   [ ] Does NOT show "Checkout" or "Pending Checkout"
   ```

4. **Check Each Tab:**

   **Pending Tab:**
   - [ ] Status badge shows "Pending"
   - [ ] Badge color is warning/yellow
   - [ ] Buttons: "Approve", "Reject", "Email"

   **Pending Check-Out Tab:**
   - [ ] Status badge shows "Pending Check-Out"
   - [ ] Badge color is info/blue
   - [ ] Buttons: "Borrowed Out", "Deny", "Email"

**Expected Result:** ✅ All displays show "Pending Check-Out" consistently  
**Finding:**
- [ ] Display consistent across all tabs
- [ ] Display inconsistent - found variations: ________________

---

### Test Case #4: TeacherRequestsPage - Status Display

**Objective:** Verify teacher's request page shows consistent status values

**Steps:**

1. **Login as teacher**
   ```
   Go to TeacherRequestsPage (Teacher Requests / My Items)
   ```

2. **Check Pending Tab**
   ```
   [ ] Shows status badge "Pending"
   [ ] No mixed variants like "Pending Request"
   ```

3. **Check Pending Check-Out Tab**
   ```
   [ ] Shows "Pending Check-Out" (with hyphen, NOT space)
   [ ] Matches ApproveRequestsPage display
   ```

4. **Check History Tab**
   ```
   Filter options show: [ ] All [ ] Approved [ ] Rejected [ ] Returned
   [ ] Status values match enum exactly
   [ ] No abbreviations or variations
   ```

**Expected Result:** ✅ All status values use canonical enum form  
**Finding:**
- [ ] All status displays consistent
- [ ] Found inconsistencies: ________________

---

### Test Case #5: HomePage - Attention Items Display

**Objective:** Verify HomePage transforms status values correctly for display

**Steps:**

1. **Login as teacher**
   ```
   Go to HomePage → Scroll to "Attention Items"
   ```

2. **Check Status Display in Attention Items**
   ```
   If request status = 'Pending':
     [ ] Displays as "Pending" or "Pending Request"?
   
   If request status = 'Pending Check-Out':
     [ ] Displays as "Pending Check-Out" (NOT "Checkout" or "Pending Checkout")
   ```

3. **Hover/Inspect items**
   ```
   F12 → Elements tab
   Find status element in attentionItems
   Verify CSS class/text matches expected value
   
   Expected: badge-warning for Pending, badge-info for Pending Check-Out
   Actual: ________________
   ```

**Expected Result:** ✅ Status displays use full canonical value  
**Finding:**
- [ ] Display correct
- [ ] Display still shows "Checkout" or "Pending Checkout" (abbreviated)
- [ ] Display inconsistent across sections

---

## 4. API Integration Tests

### Test Case #6: BorrowRequests Filter API

**Objective:** Verify backend API correctly filters by status value

**Steps:**

1. **Test Pending Filter**
   ```bash
   curl -X GET "http://localhost:5002/api/borrowRequests?status=Pending&pageSize=5" \
     -H "Authorization: Bearer <TOKEN>"
   ```

   Expected Response:
   ```json
   {
     "success": true,
     "data": [
       { "requestId": "REQ...", "status": "Pending", ... }
     ],
     "total": N,
     "page": 1,
     "pageSize": 5
   }
   ```

   - [ ] Returns items with status="Pending" only
   - [ ] No items with other statuses mixed in
   - [ ] Count matches filter

2. **Test Pending Check-Out Filter**
   ```bash
   curl -X GET "http://localhost:5002/api/borrowRequests?status=Pending%20Check-Out&pageSize=5" \
     -H "Authorization: Bearer <TOKEN>"
   ```

   Expected Response: Items with status="Pending Check-Out"

   - [ ] Returns correct items
   - [ ] Status value in response is "Pending Check-Out" (with hyphen)
   - [ ] No "Checkout" or abbreviated forms

3. **Test Invalid Status Value (Bug Test)**
   ```bash
   curl -X GET "http://localhost:5002/api/borrowRequests?status=Checkout&pageSize=5" \
     -H "Authorization: Bearer <TOKEN>"
   ```

   Expected Behavior:
   - ✅ Should return empty (no items with status="Checkout")
   - ❌ Should return error (invalid enum value)

   Actual Result: ________________

4. **Test Combined Filter + Pagination**
   ```bash
   curl -X GET "http://localhost:5002/api/borrowRequests?status=Pending&page=1&pageSize=3" \
     -H "Authorization: Bearer <TOKEN>"
   ```

   - [ ] Pagination works with status filter
   - [ ] Total count reflects filtered results
   - [ ] Page navigation works correctly

**Finding:**
- [ ] All API filters work correctly
- [ ] Status filter mismatch found (frontend sends wrong value)
- [ ] API responses inconsistent (should return "Pending Check-Out", returns "Checkout")

---

### Test Case #7: Status Change API - Endpoint Verification

**Objective:** Verify status transition endpoints use correct enum values

**Steps:**

1. **Create Test Borrow Request**
   ```bash
   POST /api/borrowRequests
   Body: { "itemID": "TEST", ... }
   Expected: status = "Pending"
   ```

   - [ ] Created request has status = "Pending"
   - [ ] API response shows status = "Pending" (not variation)

2. **Approve Request**
   ```bash
   PUT /api/borrowRequests/<ID>/approve
   ```

   - [ ] Response status = "Pending Check-Out"
   - [ ] No mixing of "Checkout" or "Pending Checkout"

3. **Checkout Request**
   ```bash
   PUT /api/borrowRequests/<ID>/checkout
   ```

   - [ ] Response status = "Approved"
   - [ ] Item status changed to "In-use" (item model)

4. **Return Request**
   ```bash
   PUT /api/borrowRequests/<ID>/return
   ```

   - [ ] Response status = "Returned"
   - [ ] Item status changed to "Available"

5. **Reject Request**
   ```bash
   PUT /api/borrowRequests/<ID>/reject
   ```

   - [ ] Response status = "Rejected"
   - [ ] Item status unchanged (if not yet approved)

**API Response Consistency:**
- [ ] All endpoints return full canonical status values
- [ ] No mixing of abbreviated/display forms in API responses
- [ ] Enum values match database schema exactly

**Finding:**
- [ ] All status transitions correct
- [ ] Found inconsistencies: ________________

---

## 5. Status Enum Compliance Tests

### Test Case #8: BorrowRequest Status Enum Audit

**Objective:** Verify database only contains valid enum values

**Steps:**

1. **Check Database for Invalid Status Values**
   ```javascript
   // MongoDB query
   db.borrowrequests.aggregate([
     { $group: { _id: "$status", count: { $sum: 1 } } },
     { $sort: { _id: 1 } }
   ])
   ```

   Expected Values:
   ```
   _id: "Pending"                {count: X}
   _id: "Pending Check-Out"      {count: X}
   _id: "Approved"               {count: X}
   _id: "Rejected"               {count: X}
   _id: "Returned"               {count: X}
   ```

   Found Values:
   ```
   _id: ____________ {count: X}
   _id: ____________ {count: X}
   ```

   - [ ] All values match canonical enum
   - [ ] NO "Checkout", "Pending Checkout", or other variations
   - [ ] NO null or empty strings
   - [ ] NO unexpected values

2. **Check Item Status Enum**
   ```javascript
   db.items.aggregate([
     { $group: { _id: "$status", count: { $sum: 1 } } },
     { $sort: { _id: 1 } }
   ])
   ```

   Expected Values:
   ```
   "Available", "In-use", "Missing", "Dispose", "Not Available", "Transferred"
   ```

   Found Values: ________________

   - [ ] All values match canonical enum
   - [ ] No variations

**Finding:**
- [ ] Database clean - all values are canonical
- [ ] Found invalid values in database (requires migration): ________________

---

### Test Case #9: Frontend Constants Audit

**Objective:** Verify helpers.js constants match database enums exactly

**Steps:**

1. **Check REQUEST_STATUSES Constant**
   ```javascript
   // In frontend console or by reading helpers.js
   REQUEST_STATUSES = ['Pending', 'Pending Check-Out', 'Approved', 'Rejected', 'Returned']
   ```

   - [ ] Matches BorrowRequest.js enum exactly
   - [ ] Uses full "Pending Check-Out" (not abbreviated)

2. **Check ITEM_STATUSES Constant**
   ```javascript
   ITEM_STATUSES = ['Available', 'In-use', 'Missing', 'Dispose', 'Not Available', 'Transferred']
   ```

   - [ ] Matches Item.js enum exactly

3. **Verify Constants Are Used**
   ```
   Search codebase:
   ```
   grep -r "REQUEST_STATUSES\|ITEM_STATUSES" src/pages/ --include="*.vue"
   ```

   - [ ] ApproveRequestsPage uses constants
   - [ ] BorrowHistoryPage uses constants
   - [ ] HomePage uses constants (or should be updated)

**Finding:**
- [ ] All constants match database enums
- [ ] Constants not being used in all pages (needs refactor)
- [ ] Found mismatches: ________________

---

## 6. Regression Tests

### Test Case #10: Item Status Filtering (No Changes Expected)

**Objective:** Verify item status filters still work (should be unaffected)

**Steps:**

1. **Go to ManageItemsPage or SearchAvailableItemsPage**

2. **Test Item Status Filters**
   ```
   [ ] Filter "Available" → shows available items
   [ ] Filter "In-use" → shows borrowed items
   [ ] Filter "Missing" → shows missing items
   [ ] Filter "Not Available" → shows not available items
   [ ] Filter "Transferred" → shows transferred items
   ```

3. **Test Item Status Change**
   ```
   [ ] Can change item status manually
   [ ] All enum values available in dropdown
   [ ] Status persists after save
   ```

**Expected Result:** ✅ No regressions  
**Finding:**
- [ ] All item status filtering works
- [ ] Found regressions: ________________

---

### Test Case #11: Stats Dashboard - Count Accuracy

**Test Objective:** Verify stats dashboard counts are accurate (requires correct status filtering)

**Steps:**

1. **Go to HomePage Dashboard**

2. **Verify Request Counts**
   ```
   Dashboard shows:
   - Pending: X requests
   - Pending Check-Out: Y requests
   - Approved: Z requests
   - Rejected: A requests
   - Returned: B requests
   ```

3. **Verify Each Count Manually**
   ```bash
   # For Pending
   curl "http://localhost:5002/api/borrowRequests?status=Pending" \
     -H "Authorization: Bearer <TOKEN>" \
     | grep total
   
   # Compare with dashboard "Pending" count
   Dashboard count: _____ | API count: _____  [ ] Match
   
   # Repeat for each status
   ```

4. **Verify Item Inventory Bars**
   ```
   Dashboard shows per-status bar chart
   [ ] "Available" count matches items with status="Available"
   [ ] "In-use" count matches items with status="In-use"
   [ ] "Missing" count matches items with status="Missing"
   ```

**Finding:**
- [ ] All counts accurate
- [ ] Found count inaccuracies: ________________

---

## 7. Status Naming Summary Report

Create a summary table of all status values found in the system:

| Layer | Status Value | Canonical? | Found In |
|-------|-------------|-----------|----------|
| | | | |
| | | | |

Complete the table as you test. Ensure all values match canonical enums.

---

## 8. Issues Found

### Issue #1: _____________

**Location:** ________________  
**Description:** _____________________________________________  
**Severity:** 🔴 CRITICAL / 🟡 MEDIUM / 🟢 MINOR  

**Reproduction Steps:**
1. ________
2. ________
3. ________

**Expected:** ________________  
**Actual:** ________________  

**Fix Required:** YES / NO  
**Bug #:** ________________

---

### Issue #2: _____________

[Repeat above template for each issue]

---

## 9. Overall Status Assessment

### Test Summary

| Test Case | Result | Notes |
|-----------|--------|-------|
| #1 HomePage Filter Bug | ⏳ PENDING | |
| #2 Browser DevTools Check | ⏳ PENDING | |
| #3 ApproveRequests Display | ⏳ PENDING | |
| #4 TeacherRequests Display | ⏳ PENDING | |
| #5 HomePage Attention Items | ⏳ PENDING | |
| #6 API Filter Test | ⏳ PENDING | |
| #7 Status Transition Endpoints | ⏳ PENDING | |
| #8 Database Enum Audit | ⏳ PENDING | |
| #9 Frontend Constants Check | ⏳ PENDING | |
| #10 Item Status Regression | ⏳ PENDING | |
| #11 Dashboard Stats Accuracy | ⏳ PENDING | |

---

## 10. Sign-Off

**Overall Result:**

- [ ] ✅ **APPROVED** - All status naming is consistent, no issues found
- [ ] ⚠️ **APPROVED WITH NOTES** - Minor issues found, documented above
- [ ] ❌ **REJECTED** - Critical issues found, requires fixes

**Issues Count:**
- 🔴 Critical: ___
- 🟡 Medium: ___
- 🟢 Minor: ___

**Phyllis Signature:** ________________  
**Date:** ________________  
**Time Spent:** ___ hours  

**Recommended Next Steps:**
```
_________________________________
_________________________________
_________________________________
```

**Quality Assessment:**
```
Overall Status Naming Consistency: ___/10
Frontend-Backend Alignment: ___/10
User Experience Impact: ___/10
```

---

## Appendix: Test Data Setup

If test data is needed:

```javascript
// Create sample requests for testing
POST /api/borrowRequests
Request IDs: _____________

// Status distribution
Pending: ___ items
Pending Check-Out: ___ items
Approved: ___ items
Returned: ___ items
Rejected: ___ items
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-30  
**For Issues:** Contact Development Team
