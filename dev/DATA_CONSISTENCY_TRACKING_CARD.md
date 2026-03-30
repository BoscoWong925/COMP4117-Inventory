# Data Consistency Global Tracking Card

**Status:** 🔄 Audit In Progress | **Last Updated:** 2026-03-30 | **Owner:** Dev Team | **Handoff To:** Phyllis

---

## Overview

This card tracks data consistency issues across the COMP4117 Inventory System, identifying mismatches between:
- **Database Schema** (Mongoose models in `/backend/models/`)
- **API Contracts** (response fields from controllers)
- **Frontend Usage** (form fields, display logic in `/frontend/src/`)
- **Service Layer** (request/response mapping in `/frontend/src/utils/services.js`)

Focus areas: field naming, type consistency, default values, enum values, and mandatory transformations.

---

## Summary: Known Inconsistencies

| # | Entity | Issue Type | Severity | Status |
|----|--------|-----------|----------|--------|
| 1 | **User.role** | Enum/Mapping Mismatch | 🔴 High | ❌ Issue Detected |
| 2 | **Item Date Fields** | Type Mismatch (String vs Date) | 🔴 High | ❌ Issue Detected |
| 3 | **Item category Default** | Default Value Mismatch | 🟡 Medium | ❌ Issue Detected |
| 4 | **Item location Default** | Default Value Mismatch | 🟡 Medium | ❌ Issue Detected |
| 5 | **Item invoiceFile** | Embedded Object Type | 🟡 Medium | ❓ Needs Verification |
| 6 | **BorrowRequest itemID / itemId** | Field Naming Inconsistency | 🟡 Medium | ❓ Needs Verification |
| 7 | **BorrowRequest borrowerID / borrowerId** | Field Naming Inconsistency | 🟡 Medium | ❓ Needs Verification |
| 8 | **BorrowRequest Status Enum** | State Label Mismatch | 🟡 Medium | ❌ Issue Detected |
| 9 | **Item Form Fields** | Missing Fields in UI | 🟡 Medium | ❌ Issue Detected |
| 10 | **AuditLog Action Names** | Enum Value Consistency | 🟡 Medium | ❓ Needs Verification |

---

## Detailed Mismatch List

### Issue #1: User Role System — Enum/Mapping Mismatch 🔴

**Affected Pages/Components:**
- [ManageAccountsPage.vue](../frontend/src/pages/ManageAccountsPage.vue) — User list, filter by role, edit form
- [LoginPage.vue](../frontend/src/pages/LoginPage.vue) — Role-based UI branching
- Multiple navbar/sidebar components — Role-based access control
- [userController.js](../backend/controllers/userController.js) — getAllUsers, createUser, updateUser

**Description:**

Frontend uses **4-value `displayRole` system** (admin, operator, teacher, student), but backend database stores **2-level role system** (role + subRole):

| **Frontend `displayRole`** | **DB `role`** | **DB `subRole`** | **Source of Truth** | **Issue** |
|-------|---------|----------|---------|---------|
| `admin` | `admin` | — | ✅ Aligned | No transform needed |
| `operator` | `operator` | — | ✅ Aligned | No transform needed |
| `teacher` | `user` | `teacher` | ⚠️ Mapped | Frontend → Backend requires mapping; Backend → Frontend requires reverse-mapping |
| `student` | `user` | `student` \| null | ⚠️ Mapped | Frontend → Backend requires mapping; Backend filter logic handles null/undefined as student |

**Current Implementation:**

Backend `userController.js` (line 37-48) handles `displayRole` query param:
```javascript
if (displayRole === 'admin') { filter.role = 'admin'; }
else if (displayRole === 'operator') { filter.role = 'operator'; }
else if (displayRole === 'teacher') { filter.role = 'user'; filter.subRole = 'teacher'; }
else if (displayRole === 'student') { filter.role = 'user'; filter.$or = [...] }
```

**Frontend usage:** `ManageAccountsPage.vue` (line 169, 305, 393, 410)
```javascript
select v-model="formData.displayRole"
option: admin, operator, teacher, student
```

**Problems:**

1. ✅ **User creation form:** Frontend sends `displayRole` → backend must convert to `role + subRole`
   - Currently: Backend does NOT handle this in `createUser` endpoint
   - Expected: Convert `displayRole` input to `role` + `subRole` pair

2. ✅ **User fetch/list:** Backend returns `role + subRole` separately (line 16-17 of controller)
   - Currently: Response includes both `role` and `subRole` fields
   - Frontend never displays raw `role/subRole`, uses `getDisplayRole()` helper
   - May cause confusion if client apps expect normalized response

3. ⚠️ **Filter consistency:** `displayRole` param only supported in `getAllUsers` endpoint
   - Other endpoints may not recognize or support `displayRole` query param
   - May have FEATURE GAPS in other controllers

**Affected Response Format:**

Current user list response (from `formatUserResponse` line 7-14):
```json
{
  "id": "U001",
  "userId": "U001",
  "role": "user",              ← Raw role
  "subRole": "teacher",        ← Raw subRole (null = student)
  "username": "john.smith",
  "name": "John Smith",
  ...
}
```

**Proposed Fix:**

Option A: Normalize response to return single `displayRole` field:
```json
{
  "displayRole": "teacher",    ← Single value (frontend-friendly)
  "role": "user",              ← Internal storage (optional, for API docs)
  "subRole": "teacher"         ← Internal storage (optional, for API docs)
}
```

Option B: Keep dual fields but add transformation logic in `formatUserResponse`:
```javascript
const getDisplayRole = (role, subRole) => {
  if (role === 'admin') return 'admin';
  if (role === 'operator') return 'operator';
  if (role === 'user' && subRole === 'teacher') return 'teacher';
  return 'student';
};

// Then use in response:
displayRole: getDisplayRole(user.role, user.subRole)
```

**Verification Checklist:**
- [ ] `POST /api/users` (create): Accepts `displayRole` input or explicit `role + subRole`
- [ ] `GET /api/users`: Query param `displayRole` filters correctly
- [ ] `GET /api/users`: Response field consistency (single `displayRole` OR dual `role/subRole`)
- [ ] `PUT /api/users/:id`: Supports `displayRole` input for role change
- [ ] Frontend can filter by all 4 roles without missing users
- [ ] Frontend edit form shows current role correctly

**Status:** ❌ **ISSUE DETECTED** — Needs Backend Fix  
**Sign-off:** _____  **QA:** _____  **Date:** _____

---

### Issue #2: Item Date Fields — Type Mismatch 🔴

**Affected Pages/Components:**
- [ItemEditPage.vue](../frontend/src/pages/ItemEditPage.vue) — Create/edit item, warranty date inputs
- [LentOutFilterPage.vue](../frontend/src/pages/LentOutFilterPage.vue) — Filter by warranty end date or year
- [InventoryPage.vue](../frontend/src/pages/InventoryPage.vue) — Display warranty dates
- [itemController.js](../backend/controllers/itemController.js) — Item CRUD
- [Item.js model](../backend/models/Item.js) — Schema definition

**Description:**

Backend `Item.js` schema (line 73-78, 96-101, 102-107) defines date fields as **String**, but frontend sends and expects **Date values**, and API filters use **string comparison** instead of **date comparison**.

| **Field** | **DB Type (Current)** | **DB Type (Expected)** | **Frontend Send** | **Frontend Expect** | **Issue** |
|---|---|---|---|---|---|
| `purchaseDate` | `String` (default: `''`) | `Date` | Date input `<input type="date">` | ISO string `YYYY-MM-DD` | Type mismatch; string comparison fails for date ranges |
| `warrantyStartDate` | `String` (default: `''`) | `Date` | Date input `<input type="date">` | ISO string `YYYY-MM-DD` | Type mismatch; no warranty date logic works correctly |
| `warrantyEnd` | `String` (default: `''`) | `Date` | Date input `<input type="date">` | ISO string `YYYY-MM-DD` | Type mismatch; warranty expiry calculations broken |
| `lastUpdate` | `String` (generated) | `Date` | System-set | ISO string | Type mismatch; sorting by `lastUpdate` may fail |

**Current Implementation (Item.js):**
```javascript
purchaseDate: {
  type: String,           ← WRONG
  default: '',
},
warrantyStartDate: {
  type: String,           ← WRONG
  default: '',
},
warrantyEnd: {
  type: String,           ← WRONG
  default: '',
},
lastUpdate: {
  type: String,           ← WRONG
  default: () => new Date().toISOString().split('T')[0],
},
```

**Backend Issues:**

1. String comparison doesn't work for date ranges:
   ```javascript
   // In itemController.js (if filtering by warrantyEnd):
   if (req.query.warrantyEnd) {
     filter.warrantyEnd = { $lt: req.query.warrantyEnd }  // String comparison! ❌
   }
   ```
   Expected: `{ $lt: new Date(req.query.warrantyEnd) }`

2. Sorting by date strings produces lexicographic order, not chronological:
   ```javascript
   // "2026-03-30" > "2026-03-01" ✅ works by luck
   // But "2026-02-28" > "2025-12-31" ❌ fails
   ```

**Frontend Issues:**

1. Date input element native returns ISO string (YYYY-MM-DD):
   ```javascript
   // <input type="date"> value: "2026-03-30"
   // JSON.stringify → "2026-03-30"  ← String, not Date object
   ```

2. Display logic may show raw string without formatting:
   ```javascript
   // Display: "2026-03-30" ✅ happens to look OK
   // But calculations fail: new Date("2026-03-30").getTime() depends on timezone
   ```

**Verification Checklist:**

Frontend Input:
- [ ] All date inputs (`purchaseDate`, `warrantyStartDate`, `warrantyEnd`) use `<input type="date">`
- [ ] When submitted, values are strings in ISO format (YYYY-MM-DD) or Date objects

Backend Validation:
- [ ] Date fields in Item schema converted to `type: Date`
- [ ] Default values set to `null` or explicit `new Date()`
- [ ] On API create/update, convert string inputs to `new Date()`:
  ```javascript
  if (req.body.purchaseDate) {
    item.purchaseDate = new Date(req.body.purchaseDate);
  }
  ```
- [ ] Sorting by date fields works correctly:
  ```javascript
  // sort[sortBy] = sortDir === 'desc' ? -1 : 1;  ← Works for Date
  ```
- [ ] Date range filtering works correctly:
  ```javascript
  if (req.query.warrantyEndBefore) {
    filter.warrantyEnd = { $lt: new Date(req.query.warrantyEndBefore) };
  }
  ```

Frontend Display:
- [ ] Warranty date fields formatted using `toLocaleDateString()` or similar
- [ ] API response date strings parsed as `new Date()` if needed for calculations

**Status:** ❌ **ISSUE DETECTED** — Requires Schema + Validation Fix  
**Sign-off:** _____  **QA:** _____  **Date:** _____

---

### Issue #3: Item category Default Value — Mismatch 🟡

**Affected Pages/Components:**
- [ItemEditPage.vue](../frontend/src/pages/ItemEditPage.vue) — New item form
- [itemController.js](../backend/controllers/itemController.js) — POST create
- [Item.js model](../backend/models/Item.js) — Schema default

**Description:**

When creating a new item without specifying `category`, frontend defaults to **"Computer"** but backend defaults to **"Other"**, causing unexpected category assignment.

| **Aspect** | **Value** | **Source** |
|---|---|---|
| **Frontend default** | `"Computer"` | ItemEditPage.vue form initialization |
| **Backend default** | `"Other"` | Item.js schema line ~58 |
| **Expected** | Should be consistent | Source of truth TBD |

**Current Implementation:**

Frontend (ItemEditPage.vue):
```javascript
const formData = ref({
  category: 'Computer',  ← Hardcoded default
  ...
})
```

Backend (Item.js):
```javascript
category: {
  type: String,
  default: 'Other',  ← Different default
  trim: true
}
```

**Issue:** User-submitted item with no category specified:
1. Frontend sends `category: "Computer"` (default from form)
2. Backend receives and saves as-is
3. Later: Someone creates item via API without category → backend defaults to `"Other"`
4. Inconsistency in database: same entity type, different categories

**Verification Checklist:**
- [ ] Decide on canonical default: "Computer" or "Other"
- [ ] Update Item.js schema default to match
- [ ] Update ItemEditPage.vue form default to match
- [ ] Verify all item creation paths (UI, API, import) respect same default
- [ ] Audit existing items: count by category, ensure consistency

**Status:** ❌ **ISSUE DETECTED** — Needs Decision + Fix  
**Sign-off:** _____  **QA:** _____  **Date:** _____

---

### Issue #4: Item location Default Value — Mismatch 🟡

**Affected Pages/Components:**
- [ItemEditPage.vue](../frontend/src/pages/ItemEditPage.vue) — New item form
- [itemController.js](../backend/controllers/itemController.js) — POST create
- [Item.js model](../backend/models/Item.js) — Schema default

**Description:**

When creating a new item without specifying `location`, frontend defaults to **"Lab A"** but backend defaults to **empty string `""`**, causing data inconsistency.

| **Aspect** | **Value** | **Source** |
|---|---|---|
| **Frontend default** | `"Lab A"` | ItemEditPage.vue form initialization |
| **Backend default** | `""` (empty string) | Item.js schema line ~62 |
| **Expected** | Should be consistent | Source of truth TBD |

**Current Implementation:**

Frontend (ItemEditPage.vue):
```javascript
const formData = ref({
  location: 'Lab A',  ← Hardcoded default
  ...
})
```

Backend (Item.js):
```javascript
location: {
  type: String,
  default: '',  ← Empty string
  trim: true
}
```

**Issue:** Same as Issue #3 (category), different field.

**Verification Checklist:**
- [ ] Decide on canonical default: "Lab A", empty string, or null
- [ ] Update Item.js schema default to match
- [ ] Update ItemEditPage.vue form default to match
- [ ] Audit existing items: count by location, handle empty strings

**Status:** ❌ **ISSUE DETECTED** — Needs Decision + Fix  
**Sign-off:** _____  **QA:** _____  **Date:** _____

---

### Issue #5: Item invoiceFile — Embedded Object Type 🟡

**Affected Pages/Components:**
- [ItemEditPage.vue](../frontend/src/pages/ItemEditPage.vue) — File upload in item form
- [itemController.js](../backend/controllers/itemController.js) — File handling with multer
- [Item.js model](../backend/models/Item.js) — invoiceFile definition
- [upload.js middleware](../backend/middleware/upload.js) — File processing

**Description:**

`invoiceFile` field is stored as embedded object with `{ filename, mimetype, size, path }`, but API response and frontend usage unclear.

| **Aspect** | **Current** | **Expected** | **Issue** |
|---|---|---|---|
| **DB Field** | Embedded Object | Embedded Object | ✅ OK |
| **API Response** | ❓ Included or excluded? | Specified | Unknown; may leak file paths |
| **Frontend Display** | ❓ Shows file name? | Specified | Unknown if displayed or downloadable |
| **File Storage** | Local filesystem `/uploads` | TBD | Security concern if path exposed |

**Current Implementation (Item.js):**
```javascript
invoiceFile: {
  type: {
    filename: String,
    mimetype: String,
    size: Number,
    path: String,
  },
  default: undefined
},
```

**Verification Checklist:**
- [ ] Check API response for `invoiceFile` field: is it included in `GET /api/items`?
- [ ] If included: verify `path` field is secure (doesn't expose system paths)
- [ ] Frontend: can users download/view uploaded invoice files?
- [ ] Frontend: does edit form show uploaded file name and allow replacement?
- [ ] Security: verify file access is restricted to authenticated users

**Status:** ❓ **NEEDS VERIFICATION** — Requires docs and audit  
**Sign-off:** _____  **QA:** _____  **Date:** _____

---

### Issue #6: BorrowRequest itemID / itemId — Field Naming 🟡

**Affected Components:**
- [BorrowRequest.js model](../backend/models/BorrowRequest.js) — Field definition
- [borrowRequestController.js](../backend/controllers/borrowRequestController.js) — API response/handling
- Frontend services — API call field mapping

**Description:**

Inconsistent field casing: is it `itemID` (uppercase D) or `itemId` (camelCase)?

| **Source** | **Field Name** | **Casing** |
|---|---|---|
| BorrowRequest.js | `itemID` | ❌ Inconsistent (uppercase D) |
| Item.js | `itemId` | ✅ camelCase |
| Frontend services | `itemID` (likely) | ❌ Matches model |
| API response | ? | **Needs verification** |

**Expected:** All references use **camelCase `itemId`** for consistency with Item model.

**Verification Checklist:**
- [ ] Read BorrowRequest.js: confirm field name
- [ ] Read borrowRequestController.js: how is it returned in API responses?
- [ ] Check frontend services: what field name does it expect?
- [ ] Check all API response examples in tests or documentation
- [ ] If mismatch found: decide on canonical form and standardize

**Status:** ❓ **NEEDS VERIFICATION** —  Casing inconsistency detected  
**Sign-off:** _____  **QA:** _____  **Date:** _____

---

### Issue #7: BorrowRequest borrowerID / borrowerId — Field Naming 🟡

**Affected Components:**
- [BorrowRequest.js model](../backend/models/BorrowRequest.js) — Field definition
- [borrowRequestController.js](../backend/controllers/borrowRequestController.js) — API handling
- Frontend services — API field mapping

**Description:**

Same as Issue #6, but for borrower reference: `borrowerID` vs `borrowerId`.

| **Source** | **Field Name** | **Casing** |
|---|---|---|
| BorrowRequest.js | `borrowerID` | ❌ Inconsistent (uppercase D) |
| User.js | `userId` | ✅ camelCase |
| Frontend services | `borrowerID` (likely) | ❌ Matches model |

**Expected:** All references use **camelCase `borrowerId`** for consistency.

**Verification Checklist:**
- [ ] Standardize to camelCase: `borrowerId`, `itemId` throughout
- [ ] Update all controllers, models, and frontend services
- [ ] Verify API responses and tests

**Status:** ❓ **NEEDS VERIFICATION** — Casing inconsistency detected  
**Sign-off:** _____  **QA:** _____  **Date:** _____

---

### Issue #8: BorrowRequest Status Enum — State Label Mismatch 🟡

**Affected Components:**
- [BorrowRequest.js model](../backend/models/BorrowRequest.js) — Status enum
- [borrowRequestController.js](../backend/controllers/borrowRequestController.js) — State transitions
- [Item.js model](../backend/models/Item.js) — Item status when item is lent out
- Frontend pages — Status display and filtering

**Description:**

Mismatch between `BorrowRequest.status` values and `Item.status` values during state transitions.

| **State** | **BorrowRequest.status** | **Item.status (when active)** | **Expected** | **Issue** |
|---|---|---|---|---|
| User creates request | `Pending` | Item unchanged | ✅ | OK |
| Approved | `Approved` | Item → `In-use` | ⚠️ | **MISMATCH**: "Approved" ≠ "In-use" |
| Checked out (physical handover) | `Borrowed` or `Lent Out`? | Item → `In-use` | ❌ | **Unclear**: BorrowRequest has no "Borrowed" status |
| Physically returned | `Returned` | Item → `Available` | ✅ | OK |
| Rejected | `Rejected` | Item unchanged | ✅ | OK |

**Clarification Needed:**

MODEL DEFINES (BorrowRequest.js):
```javascript
enum: ['Pending', 'Approved', 'Rejected', 'Returned']
```

**But frontend/documentation may expect:**
- `Borrowed` or `Lent Out` after checkout
- API endpoint names: `/approve`, `/reject`, `/checkout`, `/return`

**State Machine Issues:**

Current BorrowRequest states: Pending → Approved → Returned (or Rejected as terminal)

But should it be:
- Pending → Approved → Borrowed/Lent Out → Returned?
- Or: State transition happens when Item checkout occurs?

**Question:** When user approves a request:
1. Does BorrowRequest instantly become "Approved"?
2. Then later changes to "Lent Out" when physically checked out?
3. Or does it stay "Approved" until return?

**Verification Checklist:**
- [ ] Read borrowRequestController.js: what endpoints exist? (`/approve`, `/checkout`, `/return`, `/reject`)
- [ ] Clarify state lifecycle: at what point does status change?
- [ ] Check Item.js: does it have a "Borrowed" status? Or uses "In-use"?
- [ ] Align BorrowRequest.status enum with Item.status during overlap
- [ ] Document state machine clearly:
  ```
  BorrowRequest:  Pending → Approved → Borrowed → Returned/Rejected
  Item:           Available → (unchanged) → In-use → Available
  ```

**Status:** ❌ **ISSUE DETECTED** — Status enum mismatch  
**Sign-off:** _____  **QA:** _____  **Date:** _____

---

### Issue #9: Item Form Fields — Missing UI Fields 🟡

**Affected Pages:**
- [ItemEditPage.vue](../frontend/src/pages/ItemEditPage.vue) — Create/edit item form

**Description:**

Several fields exist in the `Item.js` schema and database but are **NOT present in the frontend form**. These can only be populated via API or Excel import.

| **Field** | **In Model** | **In Frontend Form** | **Can Edit via UI** | **Set via** |
|---|---|---|---|---|
| `itemId` | ✅ | 🚫 | ❌ | Auto-generated |
| `name` | ✅ | ✅ | ✅ | Form |
| `universityID` | ✅ | ✅ | ✅ | Form |
| `type` | ✅ | ✅ | ✅ | Form |
| `category` | ✅ | ✅ | ✅ | Form |
| `status` | ✅ | ✅ | ✅ | Form |
| `location` | ✅ | ✅ | ✅ | Form |
| `description` | ✅ | ✅ | ✅ | Form |
| `currentBorrower` | ✅ | 🚫 | ❌ | System (on approve) |
| `motherID` | ✅ | ✅ (partial) | ✅ | Form (for components) |
| `fixedComponents` | ✅ | 🚫 | ❌ | Import/API only |
| `foRequestID` | ✅ | 🚫 | ❌ | Import/API only |
| `orderID` | ✅ | 🚫 | ❌ | Import/API only |
| `supplier` | ✅ | ✅ | ✅ | Form |
| `invoiceNumber` | ✅ | ✅ | ✅ | Form |
| `supplierStatus` | ✅ | 🚫 | ❌ | Import/API only |
| `projectLinked` | ✅ | 🚫 | ❌ | Import/API only |
| `fundingSource` | ✅ | 🚫 | ❌ | Import/API only |
| `warrantyOnsite` | ✅ | 🚫 | ❌ | Import/API only |
| `warrantyVendor` | ✅ | 🚫 | ❌ | Import/API only |
| `vendor` | ✅ | 🚫 | ❌ | Import/API only |
| `price` | ✅ | 🚫 | ❌ | Import/API only |
| `departmentID` | ✅ | ✅ (default: COMP) | ✅ | Form |
| `invoiceFile` | ✅ | ✅ | ✅ | File upload |
| `lastUpdate` | ✅ | 🚫 | ❌ | Auto-set on save |

**Missing Fields in UI:**
- `foRequestID`, `orderID`, `supplierStatus` — Financial/procurement
- `projectLinked`, `fundingSource` — Project/budget tracking
- `warrantyOnsite`, `warrantyVendor`, `vendor` — Warranty details
- `price` — Cost tracking
- `fixedComponents` — Component lists

**Issues:**

1. **Data Entry Gap:** Users can only set these fields via Excel import or direct API
2. **Audit Trail:** No UI edit history for missing fields
3. **Incomplete Form:** Data may be in DB but unreachable via UI
4. **Inconsistent Data Entry Path:** Some users import, others use API, data quality varies

**Decision Required:**

- **A) Add to Form:** Expand ItemEditPage.vue to include missing fields → enables full UI editing
- **B) Keep Import-Only:** Document that these fields are import/API only, not user-editable
- **C) Hybrid:** Some fields in form (price, vendor, warranty vendor), others import-only

**Verification Checklist:**

If Decision A (Add to Form):
- [ ] Add form fields for: price, vendor, warranty vendor, funding source, project link
- [ ] Update create/update validation in itemController
- [ ] Test API accepts all fields
- [ ] Update frontend form schema

If Decision B (Keep Import-Only):
- [ ] Document in developer guide
- [ ] Add comment in Item.js for each import-only field
- [ ] Ensure import process handles these fields correctly

If Decision C (Hybrid):
- [ ] Decide which fields go in form
- [ ] Implement accordingly
- [ ] Document split behavior

**Status:** ❌ **ISSUE DETECTED** — Missing form fields or inconsistent data entry paths  
**Sign-off:** _____  **QA:** _____  **Date:** _____

---

### Issue #10: AuditLog Action Names — Enum Consistency 🟡

**Affected Components:**
- [AuditLog.js model](../backend/models/AuditLog.js) — Action enum
- [auditLogger.js utility](../backend/utils/auditLogger.js) — Action name definitions
- [auditLogController.js](../backend/controllers/auditLogController.js) — Filtering/display
- Frontend pages — Action display and filtering

**Description:**

Need to verify all action name values are consistent across the codebase and documented.

**Examples of action names (verify correctness):**

| **Action** | **When Triggered** | **Consistent?** |
|---|---|---|
| `USER_CREATED` | Admin creates user | ✅ |
| `USER_UPDATED` | User/admin updates user | ✅ |
| `USER_DELETED` | Admin deletes user | ❓ |
| `ITEM_CREATED` | Admin/operator creates item | ❓ |
| `ITEM_UPDATED` | Item fields changed | ❓ |
| `ITEM_DELETED` | Item deleted | ❓ |
| `REQUEST_CREATED` | Student creates borrow request | ❓ |
| `REQUEST_APPROVED` | Admin/operator approves request | ❓ |
| `REQUEST_REJECTED` | Request rejected | ❓ |
| `REQUEST_CHECKOUT` | Item checked out to borrower | ❓ |
| `REQUEST_RETURNED` | Item returned | ❓ |

**Verification Checklist:**
- [ ] Read auditLogger.js: list all valid action names
- [ ] Read AuditLog.js: verify enum matches auditLogger.js
- [ ] Cross-reference with all controllers: ensure consistent action names
- [ ] Check tests & sample data: action names appear as expected
- [ ] Check frontend filtering: all action names selectable/documented

**Status:** ❓ **NEEDS VERIFICATION** — Action enum consistency check  
**Sign-off:** _____  **QA:** _____  **Date:** _____

---

## Source of Truth Definition 📋

To resolve all consistency issues, establish canonical sources:

| **Entity** | **Field** | **Source of Truth** | **Other Sources** | **Precedence** |
|---|---|---|---|---|
| **User** | `role` (admin/operator) | Backend enum in User.js | Frontend role select | DB wins; document backend enum |
| **User** | `subRole` (teacher/student) | Backend enum in User.js | Frontend form | DB wins |
| **User** | Response format (displayRole vs role+subRole) | **TBD** | Frontend expectations | Requires decision |
| **Item** | Date fields (purchaseDate, warranty*) | **TBD** (Date vs String) | Frontend date inputs | Requires schema fix |
| **Item** | `category` default | **TBD** ("Computer" vs "Other") | Frontend default | DB schema should determine |
| **Item** | `location` default | **TBD** ("Lab A" vs "") | Frontend default | DB schema should determine |
| **Item** | Form fields (scope) | **TBD**: UI-editable vs import-only | Excel import | Requires documentation/decision |
| **BorrowRequest** | `itemID` vs `itemId` | **TBD** camelCase standard | Model definition | Adopt camelCase everywhere |
| **BorrowRequest** | `borrowerID` vs `borrowerId` | **TBD** camelCase standard | Model definition | Adopt camelCase everywhere |
| **BorrowRequest** | Status enum | **Backend BorrowRequest.js model** | Frontend expectations | Model is source |
| **AuditLog** | Action names | **auditLogger.js utility** | AuditLog.js enum | Utility file is source |

---

## Recommendations & Fixes 🔧

### Priority 1: Critical (Affects Data Integrity) 🔴

#### Fix 1.1: User Role Mapping — Implement Bidirectional Transform
**Effort:** 2-3 hours | **Complexity:** Medium | **Risk:** Low (well-tested change)

**Action:**
1. Decide: Return `displayRole` (user-friendly) or `role + subRole` (internal)?
2. If displayRole: Add field to `formatUserResponse`:
   ```javascript
   displayRole: getDisplayRole(user.role, user.subRole)
   ```
3. Update `createUser` endpoint to accept `displayRole` input:
   ```javascript
   // In POST /api/users
   const { displayRole, ...otherFields } = req.body;
   const [role, subRole] = parseDisplayRole(displayRole);
   ```
4. Update `updateUser` to handle role changes consistently
5. Test: Create user with each displayRole → verify DB has correct role + subRole

**Files to modify:**
- `backend/controllers/userController.js` — formatUserResponse, createUser, updateUser
- `backend/utils/` — add role transformation helpers

**Verification:**
- [ ] User created with displayRole="teacher" → DB shows role="user" + subRole="teacher"
- [ ] GET /api/users returns consistent displayRole or dual role+subRole
- [ ] Filter by displayRole works for all 4 values

---

#### Fix 1.2: Item Date Fields — Change Type from String to Date
**Effort:** 4-5 hours | **Complexity:** High | **Risk:** Medium (schema migration)

**Action:**
1. Update Item.js schema: change `purchaseDate`, `warrantyStartDate`, `warrantyEnd`, `lastUpdate` from String to Date
2. Add migration script to convert existing string data to Date objects:
   ```javascript
   db.items.updateMany(
     { purchaseDate: { $type: "string", $ne: "" } },
     [{ $set: { purchaseDate: { $toDate: "$purchaseDate" } } }]
   )
   ```
3. Update itemController.js to parse/convert date strings on input:
   ```javascript
   if (req.body.purchaseDate) {
     req.body.purchaseDate = new Date(req.body.purchaseDate);
   }
   ```
4. Update date comparison queries:
   ```javascript
   if (req.query.warrantyEndBefore) {
     filter.warrantyEnd = { $lt: new Date(req.query.warrantyEndBefore) };
   }
   ```
5. Frontend: ensure date inputs send ISO strings that are converted on backend

**Files to modify:**
- `backend/models/Item.js` — schema definition
- `backend/controllers/itemController.js` — input validation/conversion
- `backend/migrations/` — data conversion script
- `frontend/src/pages/ItemEditPage.vue` — date input handling (already correct)

**Verification:**
- [ ] Warranty date calculations work correctly
- [ ] Date range filtering (`warrantyEnd < 2026-12-31`) returns correct items
- [ ] Existing data migrated without loss
- [ ] Sorting by date fields works chronologically

---

### Priority 2: Important (Data Consistency) 🟡

#### Fix 2.1: Item Default Values — Standardize Across Frontend & Backend
**Effort:** 1-2 hours | **Complexity:** Low | **Risk:** Low

**Action:**
1. Decide canonical defaults:
   - `category`: "Computer" (frontend) or "Other" (backend)? → **Recommend: "Computer"**
   - `location`: "Lab A" (frontend) or "" (backend)? → **Recommend: "Lab A"**
2. Update Item.js schema defaults
3. Update ItemEditPage.vue form defaults to match
4. Verify: create item without specifying field → gets expected default

**Files to modify:**
- `backend/models/Item.js` — default values
- `frontend/src/pages/ItemEditPage.vue` — form initialization

**Verification:**
- [ ] POST /api/items without category → category is "Computer"
- [ ] POST /api/items without location → location is "Lab A"
- [ ] Frontend form shows same defaults

---

#### Fix 2.2: Field Naming — Standardize to camelCase
**Effort:** 2-3 hours | **Complexity:** Medium | **Risk:** Medium (breaking change)

**Action:**
1. Standardize: `borrowerID` → `borrowerId`, `itemID` → `itemId`
2. Update BorrowRequest.js schema field names
3. Update all controllers to use new names
4. Update formatters to return camelCase
5. Update frontend services to use camelCase
6. Add migration if needed for existing data

**Files to modify:**
- `backend/models/BorrowRequest.js` — field definitions
- `backend/controllers/borrowRequestController.js` — response formatting
- `frontend/src/utils/services.js` — field mapping

**Verification:**
- [ ] API response uses camelCase: `borrowerId`, `itemId`
- [ ] Frontend can access response fields correctly
- [ ] No references to old naming remain

---

### Priority 3: Should Have (Documentation & Clarification) 🔵

#### Fix 3.1: BorrowRequest Status Enum — Document State Transitions
**Effort:** 1 hour | **Complexity:** Low | **Risk:** None

**Action:**
1. Clarify the exact state machine (in developer docs):
   ```
   Pending → Approved → [Lent Out/Borrowed?] → Returned
                      ↘ Rejected (terminal)
   ```
2. Create endpoint documentation:
   - POST /api/borrow-requests → status = Pending
   - PUT /:id/approve → status = Approved
   - PUT /:id/checkout → status = [what?]
   - PUT /:id/return → status = Returned
   - PUT /:id/reject → status = Rejected
3. Add remarks: if "checkout" is separate from "approve", state machine has 5 states
4. Document corresponding Item.status updates for each transition

**Files to create/update:**
- `API_DOCUMENTATION.md` (or equivalent) — state machine diagram
- Code comments in borrowRequestController.js

---

#### Fix 3.2: Item Form Fields — Clarify UI vs Import
**Effort:** 1-2 hours | **Complexity:** Low | **Risk:** None

**Action:**

Choose one approach:
- **A) Expand form:** Add fields for price, vendor, warranty vendor, funding source, project link
- **B) Document as import-only:** Add developer docs explaining which fields need Excel import
- **C) Hybrid:** Some fields in form, others import-only (document split)

Then document clearly in:
- Developer guide
- Code comments (Item.js model)
- API documentation

**Files to update:**
- `DEVELOPER_GUIDE.md` — Item field data entry policies
- Item.js model comments
- ItemEditPage.vue form structure (if choosing option A)

---

#### Fix 3.3: AuditLog Action Names — Document Enum
**Effort:** 1 hour | **Complexity:** Low | **Risk:** None

**Action:**
1. Extract all action names from auditLogger.js
2. Create enum documentation or code comments
3. List each action with trigger description:
   ```
   USER_CREATED: When admin creates new user
   USER_UPDATED: When user updates own profile or admin updates any user
   ITEM_CREATED: When admin/operator creates new item
   ...
   ```
4. Ensure enum in AuditLog.js matches actuals
5. Document valid filter values for audit log queries

**Files to update:**
- `backend/utils/auditLogger.js` — add comments
- `DEVELOPER_GUIDE.md` — action reference table
- AuditLog.js — verify enum

---

## Mismatch Summary Table

| ID | Entity | Field | Database Value | Frontend/API | Status | Fix Priority | Est. Effort |
|----|--------|-------|---|---|---|---|---|
| 1 | User | role system | role + subRole | displayRole | ❌ | P1 | 2-3h |
| 2 | Item | date fields | String | Date | ❌ | P1 | 4-5h |
| 3 | Item | category default | "Other" | "Computer" | ❌ | P2 | 1-2h |
| 4 | Item | location default | "" | "Lab A" | ❌ | P2 | 1-2h |
| 5 | Item | invoiceFile | Embedded object | ❓ | ❓ | P3 | 1h |
| 6 | BorrowRequest | itemID | itemID (uploaded) | itemId? | ❓ | P2 | 2-3h |
| 7 | BorrowRequest | borrowerID | borrowerID (upper) | borrowerId? | ❓ | P2 | 2-3h |
| 8 | BorrowRequest | status enum | Pending/Approved/Rejected/Returned | ? | ❓ | P3 | 1h |
| 9 | Item | form fields | 20+ fields in DB | ~12 in form | 🟡 | P3 | 2-4h (A), 1h (B) |
| 10 | AuditLog | action names | enum in model | ❓ | ❓ | P3 | 1h |

---

## Phyllis Verification Checklist

Before handoff, verify:

**Data Type Consistency:**
- [ ] All date fields are Date type, not String
- [ ] All required fields have defaults or are marked required
- [ ] Field types match between model and API response

**Field Naming Consistency:**
- [ ] All IDs use camelCase (itemId, borrowerId, userId)
- [ ] No mixed casing across codebase

**Default Value Consistency:**
- [ ] Item category default is consistent (frontend form = backend schema)
- [ ] Item location default is consistent
- [ ] All other defaults match expectations

**Enum/Mapping Consistency:**
- [ ] User roles map correctly: displayRole ↔ role + subRole
- [ ] BorrowRequest status values are clear and documented
- [ ] AuditLog action names are all valid and documented

**API Response Consistency:**
- [ ] All responses include expected fields
- [ ] No unexpected fields leaked (e.g., file paths, sensitive data)
- [ ] Field names consistent across endpoints

**Frontend-Backend Alignment:**
- [ ] Form fields send data backend expects
- [ ] API responses match frontend field expectations
- [ ] No data loss in serialization/deserialization

---

## Sign-Off

| Role | Name | Date | Notes |
|------|------|------|-------|
| **Dev Lead** | __________ | __________ | Issues identified: __________ |
| **Phyllis (QA)** | __________ | __________ | Verification period: __________ to __________ |

---

**Last Review:** __________ | **Next Review:** __________
