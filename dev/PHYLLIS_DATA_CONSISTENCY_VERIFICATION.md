# Phyllis Data Consistency Verification Checklist

**For QA Lead Phyllis** — Quick guide to verify each data consistency issue.

---

## How to Use This List

For each issue, follow the verification steps. Mark ✅ or ❌ and note findings.

---

## Issue #1: User Role System 🔴 (CRITICAL)

### What to Check

Frontend form sends/expects **4 roles** (admin, operator, teacher, student), but DB stores **2-level system** (role + subRole).

### Verification Steps

**Step 1: Create User via UI**
1. Open ManageAccountsPage → "Create New Account"
2. Fill form: userId="TEST_TEACHER", name="Test Teacher", displayRole="Teacher"
3. Submit
4. Check MongoDB:
   ```
   db.users.findOne({ userId: "TEST_TEACHER" })
   ```
   - Should show: `{ role: "user", subRole: "teacher" }`
   - If shows: `{ role: "teacher", subRole: undefined }` → ❌ FAIL

**Step 2: List Users with Role Filter**
1. ManageAccountsPage → Filter by Role dropdown
2. Select "Teacher"
3. Table should show only teacher users
4. Check Network tab: request should include `displayRole=teacher`
   - Expected: Teacher users shown correctly
   - If empty or wrong users shown → ❌ FAIL

**Step 3: Check API Response Format**
1. Open DevTools → Application → SessionStorage → Get `token`
2. Fetch in console:
   ```javascript
   fetch('/api/users?page=1&pageSize=5', {
     headers: { Authorization: `Bearer ${token}` }
   }).then(r => r.json()).then(d => console.log(d.users[0]))
   ```
3. Check response user object:
   - Contains `role: "user"` + `subRole: "teacher"`? → ✅ Current
   - Contains `displayRole: "teacher"`? → ✅ Better
   - Contains other field names? → Document what you see

**QA Finding:**
```
Frontend displays as: [ ]
- displayRole (single field)
- role + subRole (two fields)
- other: ___________________

API response format matches frontend expectations: [ ] Yes  [ ] No
Issues found: ________________________________
```

**Status:** ✅ or ❌ **Sign-off:** _____ **Date:** _____

---

## Issue #2: Item Date Fields 🔴 (CRITICAL)

### What to Check

Date fields (purchaseDate, warrantyStartDate, warrantyEnd) should be **Date type**, not String.

### Verification Steps

**Step 1: Create Item with Warranty Date**
1. Open InventoryPage → "Add Item" or Edit existing item
2. Fill warranty fields: warrantyStartDate="2025-01-01", warrantyEnd="2026-12-31"
3. Check MongoDB:
   ```
   db.items.findOne({ name: "..." })
   ```
   - If warrantyEnd is `"2026-12-31"` (String) → ❌ WRONG
   - If warrantyEnd is `ISODate("2026-12-31T00:00:00Z")` (Date) → ✅ CORRECT

**Step 2: Filter by Warranty Date**
1. On LentOutFilterPage (or similar), apply filter: "Warranty expires before 2026-06-30"
2. Results should only show items expiring before that date
3. Expected behavior:
   - Item with warranty 2026-12-31 excluded
   - Item with warranty 2026-03-01 included
   - If results are wrong → ❌ FAIL (string comparison problem)

**Step 3: Sort by Warranty Date**
1. Inventory page → Click "Sort by Warranty End"
2. Items should sort chronologically (oldest first or latest first)
3. Expected: 2025-06-01, 2025-12-31, 2026-03-15, 2026-12-31
   - If order is lexicographic (wrong): 2025-06-01, 2025-12-31, 2026-03-15, 2026-12-31 (happened to work) but may fail with different dates
   - Test with dates like: 2025-02-28, 2025-10-15, 2026-01-30 → should not sort alphabetically

**QA Finding:**
```
Warranty date field type in DB:
[ ] String (WRONG - needs migration)
[ ] Date (CORRECT)

Date filtering works correctly: [ ] Yes  [ ] No
Date sorting works chronologically: [ ] Yes  [ ] No
Issues found: ________________________________
```

**Status:** ✅ or ❌ **Sign-off:** _____ **Date:** _____

---

## Issue #3: Item Category Default 🟡 (MEDIUM)

### What to Check

Creating item without specifying category should default to same value in frontend & backend.

### Verification Steps

**Step 1: Create Item via UI**
1. InventoryPage → "Add Item"
2. Fill required fields, **leave category empty or use default**
3. Submit
4. Check MongoDB:
   ```
   db.items.findOne({ name: "..." }).category
   ```
   - Expected: `"Computer"` (if frontend defaults to "Computer")
   - If returned: `"Other"` → ❌ Mismatch

**Step 2: Create Item via API (without category)**
```bash
curl -X POST http://localhost:5002/api/items \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Item",
    "universityID": "TEST123",
    "type": "Hardware"
  }'
```

Check response:
```json
{ "item": { "category": "???" } }
```
- Should match frontend default
- If different → ❌ Mismatch

**QA Finding:**
```
Frontend default category: ___________
Backend default category: ___________
Match: [ ] Yes  [ ] No

Recommendation if mismatch:
[ ] Use "Computer" as standard
[ ] Use "Other" as standard
[ ] Document both are acceptable (NO - not recommended)
```

**Status:** ✅ or ❌ **Sign-off:** _____ **Date:** _____

---

## Issue #4: Item Location Default 🟡 (MEDIUM)

### What to Check

Creating item without specifying location should default consistently.

### Verification Steps

Same as Issue #3, but check `location` field instead:

**Step 1: UI Creation**
1. Create item via UI, leave location default
2. Check: MongoDB shows `location: "Lab A"` ✅

**Step 2: API Creation**
```bash
curl -X POST http://localhost:5002/api/items \
  -d '{ "name": "Test", "universityID": "X", "type": "Hardware" }'
```
- Check response: `location: "Lab A"` or `location: ""` ?

**QA Finding:**
```
Frontend default location: ___________
Backend default location: ___________
Match: [ ] Yes  [ ] No

Recommendation:
[ ] Standardize to "Lab A"
[ ] Standardize to "" (empty)
```

**Status:** ✅ or ❌ **Sign-off:** _____ **Date:** _____

---

## Issue #5: Item invoiceFile 🟡 (MEDIUM)

### What to Check

invoiceFile field handling: is it secure? Is it returned in API responses?

### Verification Steps

**Step 1: Upload Invoice File**
1. Create/edit item with invoice file upload
2. Submit
3. Check MongoDB:
   ```
   db.items.findOne({ ... }).invoiceFile
   ```
   - Shows: `{ filename: "...", mimetype: "...", size: 123, path: "/uploads/..." }`
   - Is `path` field safe to expose to frontend?
     - If `/uploads/abc123.pdf` → may leak system structure ⚠️
     - Should be: `/api/items/<itemId>/invoice` (masked URL) ✅

**Step 2: Check API Response**
```javascript
fetch('/api/items/INV-001', {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json()).then(d => console.log(d.item.invoiceFile))
```
- Does response include `invoiceFile`? [ ] Yes  [ ] No
- If yes, what fields are exposed?
  - `filename`? [ ] Yes  [ ] No
  - `path`? [ ] Yes  [ ] No ← Security risk if exposed

**Step 3: Download File**
1. After upload, can user click "Download Invoice" to retrieve file?
   - Expected: User can download their own item's invoice
   - If not working: Broken feature ❌

**QA Finding:**
```
invoiceFile in API response: [ ] Yes  [ ] No
Fields exposed (if included): _________________
Path field is safe/masked: [ ] Yes  [ ] No
Download functionality works: [ ] Yes  [ ] No  [ ] N/A

Issues: ________________________________
```

**Status:** ✅ or ❌ **Sign-off:** _____ **Date:** _____

---

## Issue #6: BorrowRequest itemID Casing 🟡 (MEDIUM)

### What to Check

API field name consistency: is it `itemID` (uppercase D) or `itemId` (camelCase)?

### Verification Steps

**Step 1: Create Borrow Request**
```bash
curl -X POST http://localhost:5002/api/borrowRequests \
  -H "Authorization: Bearer $studentToken" \
  -d '{ "itemId": "INV-001", ... }'
```

**Step 2: Check List Response**
```bash
curl http://localhost:5002/api/borrowRequests \
  -H "Authorization: Bearer $token"
```

Check response:
```javascript
d.borrowRequests[0]  // What fields?
// { itemID: "INV-001" } or { itemId: "INV-001" } ?
```

**QA Finding:**
```
API request uses: [ ] itemID  [ ] itemId  [ ] Both
API response uses: [ ] itemID  [ ] itemId  [ ] Both

Consistency: [ ] Yes (same everywhere)  [ ] No (mixed)
Recommendation: Standardize to itemId (camelCase)
```

**Status:** ✅ or ❌ **Sign-off:** _____ **Date:** _____

---

## Issue #7: BorrowRequest borrowerID Casing 🟡 (MEDIUM)

### What to Check

Same as Issue #6, but for `borrowerID` vs `borrowerId`.

### Verification Steps

Create borrow request, then fetch list:
```bash
curl http://localhost:5002/api/borrowRequests
```

Check response:
- Contains `borrowerID` (uppercase) or `borrowerId` (camelCase)?

**QA Finding:**
```
API uses: [ ] borrowerID  [ ] borrowerId  [ ] Both
Consistency with itemId field: [ ] Yes  [ ] No
Recommendation: Standardize to borrowerId (camelCase)
```

**Status:** ✅ or ❌ **Sign-off:** _____ **Date:** _____

---

## Issue #8: BorrowRequest Status Enum 🟡 (MEDIUM)

### What to Check

Verify status values: Pending, Approved, Rejected, Returned. Are there other status values?

### Verification Steps

**Step 1: Check Model**
```bash
cd backend && grep -A 5 "enum:.*status" models/BorrowRequest.js
```
Output should show: `['Pending', 'Approved', 'Rejected', 'Returned']`
- Are there other values? Document them: ________________

**Step 2: API State Transitions**
1. Create borrow request: `status = "Pending"` ✓
2. Approve request via endpoint: What endpoint? `/approve`, `/checkout`, `/accept`?
   - After approve: `status = ?` (Approved or something else?)
3. Physical handover of item: What endpoint? `/checkout`, `/lend`, `/issue`?
   - After checkout: `status = ?` (should be same as after approve, or different?)
4. Return request: `/return`, `/complete`?
   - After return: `status = "Returned"` ✓

**QA Finding:**
```
Status values in database: _____________________
Endpoints for state transitions:
[ ] POST /borrowRequests (create)
[ ] PUT /:id/approve (approve)
[ ] PUT /:id/reject (reject)
[ ] PUT /:id/checkout (checkout / handover)
[ ] PUT /:id/return (return)
[ ] Other: ____________________

State machine is clear and documented: [ ] Yes  [ ] No
Issues/ambiguities: ________________________________
```

**Status:** ✅ or ❌ **Sign-off:** _____ **Date:** _____

---

## Issue #9: Item Form Fields 🟡 (MEDIUM)

### What to Check

Which fields are editable in the UI? Which require Excel import?

### Verification Steps

**Step 1: Open Item Form**
- InventoryPage → "Add Item" or Edit

**Step 2: Count Form Fields**
Fields visible in form:
- [ ] itemId (auto-generated, read-only)
- [ ] name
- [ ] universityID
- [ ] type
- [ ] category
- [ ] status
- [ ] location
- [ ] description
- [ ] motherID
- [ ] supplier
- [ ] invoiceNumber
- [ ] warrantyStartDate
- [ ] warrantyEnd
- [ ] departmentID
- [ ] invoiceFile
- [ ] Other: ________________

Fields NOT in form but in database:
- [ ] price
- [ ] vendor
- [ ] foRequestID
- [ ] orderID
- [ ] supplierStatus
- [ ] projectLinked
- [ ] fundingSource
- [ ] warrantyOnsite
- [ ] warrantyVendor
- [ ] fixedComponents
- [ ] Other: ________________

**QA Finding:**
```
Total fields in DB model: 25-30
Editable via UI form: _____ fields
Import-only fields: _____ fields
Decision on missing fields:
[ ] A) Add all to form
[ ] B) Keep as import-only (document)
[ ] C) Hybrid (some in form, others import)
```

**Status:** ✅ or ❌ **Sign-off:** _____ **Date:** _____

---

## Issue #10: AuditLog Action Names 🟡 (MEDIUM)

### What to Check

List all audit log action names, verify they're consistent.

### Verification Steps

**Step 1: Trigger Various Actions**
1. Create user → Check audit log
2. Update item → Check audit log
3. Approve request → Check audit log
4. Return item → Check audit log

Note action names: `_________________`, `_________________`, etc.

**Step 2: Check Code**
```bash
cd backend && grep -r "AUDIT\|_CREATED\|_UPDATED\|_DELETED" utils/auditLogger.js
```

List all actions documented in code: _____________________

**QA Finding:**
```
Action names found in database:
- ___________________
- ___________________
- ___________________
- ___________________
- etc.

Actions documented in code:
- ___________________
- ___________________
- ___________________
- etc.

Discrepancies: [ ] None  [ ] Some (list): ________________
Recommendation: Document enum in developer guide
```

**Status:** ✅ or ❌ **Sign-off:** _____ **Date:** _____

---

## Summary Verification Table

| Issue | Severity | Status | Phyllis Sign-off |
|-------|----------|--------|-----------------|
| #1: User Roles | 🔴 CRITICAL | ✅ / ❌ | _____ |
| #2: Date Fields | 🔴 CRITICAL | ✅ / ❌ | _____ |
| #3: Category Default | 🟡 MEDIUM | ✅ / ❌ | _____ |
| #4: Location Default | 🟡 MEDIUM | ✅ / ❌ | _____ |
| #5: invoiceFile Security | 🟡 MEDIUM | ✅ / ❌ | _____ |
| #6: itemID Casing | 🟡 MEDIUM | ✅ / ❌ | _____ |
| #7: borrowerID Casing | 🟡 MEDIUM | ✅ / ❌ | _____ |
| #8: Status Enum | 🟡 MEDIUM | ✅ / ❌ | _____ |
| #9: Form Fields | 🟡 MEDIUM | ✅ / ❌ | _____ |
| #10: Action Names | 🟡 MEDIUM | ✅ / ❌ | _____ |

---

## Overall Sign-Off

**All data consistency issues verified:** [ ] ✅ YES  [ ] ❌ NO

**Critical issues found and documented:** _____________________

**Recommended actions (prioritized):**
1. _____________________
2. _____________________
3. _____________________

**Phyllis Signature:** __________________ **Date:** __________

**Next Steps:**
- [ ] Dev team addresses critical issues (#1, #2)
- [ ] Dev team addresses medium issues (#3-10)
- [ ] Phyllis re-verifies fixes
- [ ] Update main tracking card with findings

---

**Related Documents:**
- [DATA_CONSISTENCY_TRACKING_CARD.md](./DATA_CONSISTENCY_TRACKING_CARD.md) — Detailed analysis
- [DATABASE_FIELD_SCHEMA.md](./DATABASE_FIELD_SCHEMA.md) — Complete schema reference
- [BACKEND_DETAILED_TEST_CASES.md](./BACKEND_DETAILED_TEST_CASES.md) — API validation tests
