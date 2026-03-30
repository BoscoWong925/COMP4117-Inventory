# 📋 STATUS Naming Consistency Tracking Card

**Status:** 🔍 IDENTIFIED | **Priority:** 🔴 CRITICAL | **Target:** Uniform status naming across all pages, APIs, and filters

**Date Created:** 2026-03-30  
**Last Updated:** 2026-03-30  
**Owner:** Development Team  
**Handoff:** Phyllis (QA)

---

## Executive Summary

The system has **multiple status naming inconsistencies** that cause:
- ❌ Filtering failures (UI sends wrong status values to API)
- ❌ Reporting inaccuracies (mixed status values in reports)
- ❌ Confusing user experience (same state displayed with different names)
- ❌ Maintenance friction (developers uncertain which status value to use)

**Root Cause:** Frontend pages use abbreviated or transformed status values ('Checkout', 'Pending Checkout') instead of exact database enum values ('Pending Check-Out').

---

## 1. Current Status Definition (Database Schema)

### BorrowRequest Status Enum
**Source:** `backend/models/BorrowRequest.js` line 22  
**Canonical values:** 

```
['Pending', 'Pending Check-Out', 'Approved', 'Rejected', 'Returned']
```

**Status Flow:**
```
Pending 
  ↓ (approve)
Pending Check-Out 
  ↓ (checkout/handover)
Approved 
  ↓ (return)
Returned 

Pending → Rejected (terminal)
Pending Check-Out → Rejected (terminal)
```

### Item Status Enum
**Source:** `backend/models/Item.js` line 31  
**Canonical values:**

```
['Available', 'In-use', 'Missing', 'Dispose', 'Not Available', 'Transferred']
```

**Status Flow:**
```
Available 
  ↓ (request approved)
In-use 
  ↓ (return accepted)
Available

Missing / Dispose / Not Available / Transferred (special states)
```

### AuditLog Action Enum
**Source:** `backend/models/AuditLog.js` line 18  
**Values (for reference):**

```
INPUT_VALIDATION_FAILED | LOGIN | LOGOUT | ITEM_STATUS_CHANGE | ITEM_RETURNED | 
INVENTORY_ITEM_ADDED | INVENTORY_ITEM_UPDATED | INVENTORY_ITEM_DELETED | 
BORROW_REQUEST_CREATED | BORROW_REQUEST_APPROVED | BORROW_REQUEST_REJECTED | 
REQUEST_CHECKOUT | RECORD_INVALID | UNKNOWN_ACTION | TEST_ACTION
```

---

## 2. Identified Inconsistencies

### ⚠️ Issue #1: "Pending Checkout" vs "Pending Check-Out"

| Layer | Value Used | Expected | Source | Severity |
|-------|------------|----------|--------|----------|
| Database | `Pending Check-Out` | ✅ `Pending Check-Out` | BorrowRequest.js enum | — |
| Frontend Display | `Pending Checkout` | ❌ Should be `Pending Check-Out` | HomePage.vue line 615 | CRITICAL |
| Frontend Filter | `Checkout` | ❌ Should be `Pending Check-Out` | HomePage.vue line 195 | CRITICAL |
| API Parameter | (varies by page) | ✅ `Pending Check-Out` | borrowRequestController.js | — |

**Case Found:**
```javascript
// HomePage.vue line 615
type: r.status === 'Pending' ? 'Pending Request' : 'Pending Checkout',
// ❌ 'Pending Checkout' should be 'Pending Check-Out' (without space)

// HomePage.vue line 195
@click="filterStatus = 'Checkout'; close()"
// ❌ 'Checkout' is abbreviated; API expects 'Pending Check-Out'

// HomePage.vue line 883
status: r.status === 'Pending' ? 'Pending' : 'Checkout'
// ❌ 'Checkout' abbreviated form; mismatch with actual status value
```

**Issue:** When user selects "Checkout" filter in HomePage, the filter value 'Checkout' is sent to API, but API filtering expects 'Pending Check-Out'. This causes **filter to silently fail** (no items match).

---

### ⚠️ Issue #2: Tab Names vs Status Values

| Page | Tab Name (Frontend) | Status Value (Database) | Mapping | Issue |
|------|-------------------|------------------------|---------|-------|
| ApproveRequestsPage | `activeTab = 'pending'` | `status = 'Pending'` | ✅ OK | None |
| ApproveRequestsPage | `activeTab = 'checkout'` | `status = 'Pending Check-Out'` | ✅ OK | None |
| TeacherRequestsPage | `activeTab = 'pending'` | `status = 'Pending'` | ✅ OK | None |
| TeacherRequestsPage | `activeTab = 'checkout'` | `status = 'Pending Check-Out'` | ✅ OK | None |
| HomePage | `activeTab = ('all'\|'student'\|'teacher')` | Mixed | ⚠️ Inconsistent | Uses abbreviated 'Checkout' in filters |
| BorrowHistoryPage | `filters.status` dropdown | Multiple values | ✅ OK | Uses correct values |

**Finding:** Tab names are internal variables (safe), but **HomePage mixing is problematic**.

---

### ⚠️ Issue #3: API Filtering - Frontend to Backend Mismatch

**Endpoint:** `GET /api/borrowRequests?page=1&pageSize=10&status=<STATUS_VALUE>`

| Scenario | Frontend Sends | Backend Expects | Match? | Result |
|----------|-----------------|-----------------|--------|--------|
| User clicks "Pending" tab | `status=Pending` | `Pending` | ✅ YES | ✓ Works |
| User clicks "Pending Check-Out" tab | `status=Pending Check-Out` | `Pending Check-Out` | ✅ YES | ✓ Works |
| User clicks "Checkout" filter in HomePage | `status=Checkout` | `Pending Check-Out` | ❌ NO | ✗ **FAILS** |
| User selects historical status | `status=Approved\|Rejected\|Returned` | Matches enum | ✅ YES | ✓ Works |

**Critical Finding:** HomePage filter sends wrong status value → **API returns empty result** → **user sees "no items" instead of pending checkouts**.

---

### ⚠️ Issue #4: Frontend Display Transformation

In `HomePage.vue`, status values are transformed for display:

```javascript
// Line 883 - attentionItems construction
status: r.status === 'Pending' ? 'Pending' : 'Checkout'
statusVariant: r.status === 'Pending' ? 'warning' : 'info'

// Problem: 'Checkout' is display-only, but if this is used for API calls later, it breaks
```

**Risk:** If any page reuses `status` field from `attentionItems` for filtering/updating, it will break because the value has been transformed.

---

### ⚠️ Issue #5: Stats Controller - Hardcoded Status Values

**Source:** `backend/controllers/statsController.js` lines 26-29

```javascript
BorrowRequest.countDocuments({ status: { $in: ['Pending', 'Pending Check-Out'] }, parentRequestId: null }),
BorrowRequest.countDocuments({ status: 'Returned' }),
BorrowRequest.countDocuments({ status: 'Approved' }),
BorrowRequest.countDocuments({ status: 'Rejected' })
```

✅ **Status values are correct here** (match enum)

**However:** If status enum changes, these hardcoded strings won't update automatically → risk of stat inaccuracy.

---

### ⚠️ Issue #6: ItemController Status Handling

**Source:** `backend/controllers/itemController.js` line 58

```javascript
if (status) filter.status = status;
```

✅ **Correct: directly passes status filter to query**

But Item status enum values are:
```
['Available', 'In-use', 'Missing', 'Dispose', 'Not Available', 'Transferred']
```

**Frontend usage:** ManageItemsPage correctly uses these values. ✅ Item status is consistent.

---

### ⚠️ Issue #7: Frontend Helpers - Constants Defin

**Source:** `frontend/src/utils/helpers.js` lines 37-39

```javascript
export const ITEM_STATUSES = ['Available', 'In-use', 'Missing', 'Dispose', 'Not Available', 'Transferred'];
export const REQUEST_STATUSES = ['Pending', 'Pending Check-Out', 'Approved', 'Rejected', 'Returned'];
```

✅ **Correct: matches database enums exactly**

**Problem:** These constants are defined but NOT used consistently:
- `REQUEST_STATUSES` defined in helpers.js
- But HomePage.vue **hardcodes** filter values ('Checkout', 'Pending Checkout') instead of using these constants
- BorrowHistoryPage uses correct values ('Approved', 'Rejected', 'Returned')

---

## 3. Affected Pages and Severity

| Page | Issue | Severity | Example |
|------|-------|----------|---------|
| HomePage.vue | Filter sends 'Checkout' instead of 'Pending Check-Out' | 🔴 CRITICAL | Line 195: `@click="filterStatus = 'Checkout'"` |
| HomePage.vue | Display uses 'Pending Checkout' (space) instead of 'Pending Check-Out' | 🟡 MEDIUM | Line 615: `'Pending Checkout'` |
| HomePage.vue | attentionItems transforms status to 'Checkout' (may be reused) | 🟡 MEDIUM | Line 883 |
| ApproveRequestsPage.vue | ✅ Correct usage | — | Uses proper enum values |
| TeacherRequestsPage.vue | ✅ Correct usage | — | Uses proper enum values |
| BorrowHistoryPage.vue | ✅ Correct usage | — | Uses proper enum values |
| statsController.js | Hardcoded values (not ideal, but correct) | 🟡 MEDIUM | Lines 26-29 |

---

## 4. Test Cases to Verify

### Test Case #1: HomePage Filter Test

**Steps:**
1. Login as student/teacher
2. Go to HomePage
3. Click "Attention Items" → Filter dropdown
4. Select "Checkout"
5. Observe: Should show items with `status='Pending Check-Out'`

**Expected:** List populated with pending checkouts  
**Current Issue:** ❌ List may be empty (API receives 'Checkout', expects 'Pending Check-Out')

**Verification:**
```bash
curl -X GET "http://localhost:5002/api/borrowRequests?status=Checkout" 
# Expected: Empty or error if 'Checkout' is not valid enum value

curl -X GET "http://localhost:5002/api/borrowRequests?status=Pending%20Check-Out"
# Expected: Returns pending checkouts
```

---

### Test Case #2: Status Display Consistency

**Steps:**
1. Create a borrow request
2. Approve it (status → 'Pending Check-Out')
3. View in HomePage → Attention Items
4. View in ApproveRequestsPage → Checkout Tab
5. View in JSON API response

**Expected:** All display "Pending Check-Out"  
**Verify:** No mixed "Pending Checkout" / "Checkout" / other variations

---

### Test Case #3: Status Filter in Each Page

| Page | Filter Values | Expected Result |
|------|--------|--------|
| ApproveRequestsPage | Pending → 'Pending' ✅ | Shows pending requests |
| ApproveRequestsPage | Checkout → 'Pending Check-Out' ✅ | Shows checkout items |
| BorrowHistoryPage | Approved → 'Approved' ✅ | Shows approved requests |
| HomePage | Checkout → ? ❌ | **VERIFY: Should be 'Pending Check-Out'** |

---

## 5. Fix Requirements

### Fix #1: HomePage.vue - Status Filter Values (CRITICAL)

**File:** `frontend/src/pages/HomePage.vue`

**Change 1 - Line 195:**
```javascript
// BEFORE:
@click="filterStatus = 'Checkout'; close()"

// AFTER:
@click="filterStatus = 'Pending Check-Out'; close()"
```

**Change 2 - Line 615 (attentionItems):**
```javascript
// BEFORE:
type: r.status === 'Pending' ? 'Pending Request' : 'Pending Checkout',

// AFTER:
type: r.status === 'Pending' ? 'Pending Request' : 'Pending Check-Out Request',
```

**Change 3 - Line 883 (attentionItems status):**
```javascript
// BEFORE:
status: r.status === 'Pending' ? 'Pending' : 'Checkout',

// AFTER:
status: r.status === 'Pending' ? 'Pending' : 'Pending Check-Out',
// NOTE: This is for display only; use original r.status for API calls
```

**Change 4 - Line 947 (filterStatus comparison):**
```javascript
// BEFORE:
items = items.filter(i => i.status === filterStatus.value)

// AFTER:
// Ensure filterStatus uses correct enum values
const statusMap = {  
  'Pending Check-Out': ['Pending Check-Out'],
  'Pending': ['Pending'],
  // ... (map display names to actual status values if needed)
};
```

---

### Fix #2: Audit Field Documentation

**File:** `backend/models/AuditLog.js`

Add comment documenting action enum values:

```javascript
/**
 * Action types for audit logging:
 * INPUT_VALIDATION_FAILED, LOGIN, LOGOUT, ITEM_STATUS_CHANGE, ITEM_RETURNED,
 * INVENTORY_ITEM_ADDED, INVENTORY_ITEM_UPDATED, INVENTORY_ITEM_DELETED,
 * BORROW_REQUEST_CREATED, BORROW_REQUEST_APPROVED, BORROW_REQUEST_REJECTED,
 * REQUEST_CHECKOUT, RECORD_INVALID, UNKNOWN_ACTION, TEST_ACTION
 */
action: {
  type: String,
  enum: [
    'INPUT_VALIDATION_FAILED', 'LOGIN', 'LOGOUT', 'ITEM_STATUS_CHANGE', 'ITEM_RETURNED',
    'INVENTORY_ITEM_ADDED', 'INVENTORY_ITEM_UPDATED', 'INVENTORY_ITEM_DELETED',
    'BORROW_REQUEST_CREATED', 'BORROW_REQUEST_APPROVED', 'BORROW_REQUEST_REJECTED',
    'REQUEST_CHECKOUT', 'RECORD_INVALID', 'UNKNOWN_ACTION', 'TEST_ACTION'
  ]
}
```

---

### Fix #3: Frontend Constants Usage

**File:** `frontend/src/utils/helpers.js`

Already defined correctly. ✅ No change needed.

**Action:** Update all pages to import and use these constants instead of hardcoding strings.

---

### Fix #4: StatsController - Optional Refactor

**File:** `backend/controllers/statsController.js`

Consider using enum constants instead of hardcoding:

```javascript
// Define enum at top
const BORROW_STATUS = {
  PENDING: 'Pending',
  PENDING_CHECKOUT: 'Pending Check-Out',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  RETURNED: 'Returned'
};

// Use in queries
BorrowRequest.countDocuments({ 
  status: { $in: [BORROW_STATUS.PENDING, BORROW_STATUS.PENDING_CHECKOUT] }, 
  parentRequestId: null 
})
```

**Priority:** 🟡 Medium (nice-to-have, not critical)

---

## 6. Implementation Checklist

- [ ] **Fix HomePage.vue line 195** - Change filter value from 'Checkout' to 'Pending Check-Out'
- [ ] **Fix HomePage.vue line 615** - Change display text from 'Pending Checkout' to 'Pending Check-Out Request'
- [ ] **Fix HomePage.vue line 883** - Change status value from 'Checkout' to 'Pending Check-Out'
- [ ] **Fix HomePage.vue line 947** - Ensure filter comparison uses correct status values
- [ ] **Test HomePage filter "Checkout"** - Verify API receives correct status value
- [ ] **Test all status filter combinations** - Verify no regressions in other pages
- [ ] **Review statsController** - Consider refactor to use constants (optional)
- [ ] **Document status enums** - Add comments to BorrowRequest.js and Item.js
- [ ] **Create UI test** - Verify status display consistency across all pages

---

## 7. Effort Estimate

| Task | Effort |
|------|--------|
| HomePage.vue fixes | 30 min |
| Testing filter & displays | 1 hour |
| statsController refactor (optional) | 1 hour |
| Documentation & code review | 30 min |
| **Total** | **2-3 hours** |

---

## 8. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Filtering breaks in production | HIGH | HIGH | ✅ Fix in Development |
| Other status filters regress | MEDIUM | MEDIUM | ✅ Comprehensive testing |
| Status display confusion | MEDIUM | MEDIUM | ✅ Standardize all pages |
| Stats become inaccurate | LOW | HIGH | ✅ Use constants in controllers |

---

## 9. Rollback Plan

If issues occur after deployment:

1. **Revert HomePage.vue** to previous version
2. **Verify filters work** before re-deploying
3. **Check git log** for commit SHA of correct version

```bash
git log --oneline frontend/src/pages/HomePage.vue | head -5
git checkout <SHA> -- frontend/src/pages/HomePage.vue
```

---

## 10. Phyllis Verification Checklist

After fixes are deployed:

- [ ] **Filter Test:** Click "Checkout" filter in HomePage → verify items populate correctly
- [ ] **Display Test:** Navigate to different pages (ApproveRequests, TeacherRequests) → verify status displays as "Pending Check-Out" everywhere
- [ ] **API Test:** Call `/api/borrowRequests?status=Pending%20Check-Out` → verify returns correct items
- [ ] **History Filter:** BorrowHistoryPage status filters (Approved, Rejected, Returned) → verify correct data
- [ ] **Stats Test:** Dashboard shows correct pending/checkout/returned counts
- [ ] **No Regressions:** All other status filters still work (Item status filters, etc.)

**Sign-off:**
```
✅ All tests passed - Phyllis Date: ________
```

**Issues Found (if any):**
```
_____________________________________________
```

---

## Appendix: Status Value Reference

### BorrowRequest Status (Canonical)
```
'Pending'              - Request waiting for approval
'Pending Check-Out'    - Request approved, waiting for physical handover
'Approved'             - Item checked out to borrower
'Rejected'             - Request rejected (terminal)
'Returned'             - Item returned (terminal)
```

### Item Status (Canonical)
```
'Available'       - Ready for borrowing
'In-use'          - Currently borrowed
'Missing'         - Lost or not found
'Dispose'         - Scheduled for disposal
'Not Available'   - Temporarily unavailable
'Transferred'     - Transferred to another department
```

### Display Notes
- Never abbreviate status values in API calls
- Transform only for display if necessary (use original value for data operations)
- Always use database enum value in filters
