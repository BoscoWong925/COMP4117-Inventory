# Date & Timezone Standardization Guide

**Status:** 🔄 Implementation Plan | **Last Updated:** 2026-03-30 | **Target:** Unified date handling across API & UI

---

## Executive Summary

**Problem:** Same data displayed differently on different pages due to timezone handling and format inconsistencies.

**Root Causes:**
1. Item date fields stored as **String** (YYYY-MM-DD) but using `toISOString()` which returns UTC date
2. Frontend `formatDate()` uses `toLocaleDateString()` causing off-by-one errors in certain timezones
3. Mixed type usage: Item dates (String) vs BorrowRequest/AuditLog dates (Date)
4. No standardized timezone — some code uses UTC, some uses client time

**Solution:** Implement strict timezone convention with consistent format handling everywhere.

---

## Current State Analysis

### Item.js Date Fields (PROBLEMATIC ❌)

| Field | Type | Default | Issue |
|-------|------|---------|-------|
| `purchaseDate` | String | `''` | String comparison breaks date logic |
| `warrantyStartDate` | String | `''` | String comparison breaks date logic |
| `warrantyEnd` | String | `''` | String comparison breaks date logic |
| `lastUpdate` | String | `() => new Date().toISOString().split('T')[0]` | ⚠️ **TIMEZONE BUG**: Uses UTC, may differ from local date |
| Timestamps: `createdAt`, `updatedAt` | Date | auto | ✅ Proper Date type |

**Example Timezone Bug:**
```javascript
// Server in UTC+8 (Hong Kong)
const now = new Date();           // 2026-03-30 20:30:00 +08:00
const lastUpdate = now.toISOString().split('T')[0];  // "2026-03-30"

// But if server moment is in UTC:
// 2026-03-30 12:30:00 UTC → displays as "2026-03-30"
// While client sees 2026-03-30 20:30:00 +08:00 → displays as "2026-03-30"
// Same date, but DB might have wrong time reference
```

### BorrowRequest.js Date Fields (ACCEPTABLE ✅)

| Field | Type | Default | Status |
|-------|------|---------|--------|
| `requestDate` | Date | `Date.now` | ✅ Correct |
| `approvalDate` | Date | `null` | ✅ Correct |
| `returnDate` | Date | `null` | ✅ Correct |
| `returnedDate` | Date | `null` | ✅ Correct |
| `declaredReturnDate` | Date | `null` | ✅ Correct |
| Timestamps: `createdAt`, `updatedAt` | Date | auto | ✅ Correct |

### AuditLog.js Date Fields (CORRECT ✅)

| Field | Type | Status |
|-------|------|--------|
| `timestamp` | Date | ✅ Correct |
| Timestamps: `createdAt`, `updatedAt` | Date | ✅ Correct |

### Frontend formatDate() Function (RISKY ⚠️)

**Current Implementation** (`frontend/src/utils/helpers.js`):
```javascript
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString();
};
```

**Problem:** `new Date('2026-03-30')` is parsed as **UTC midnight** (2026-03-30 00:00:00 UTC), then converted to local time. If client is in UTC+8, it becomes 2026-03-30 08:00:00 +08:00, which is fine. But this relies on implicit browser parsing behavior.

**Better Pattern** (`formatDateTime` already shows this):
```javascript
export const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return 'N/A';
  const date = new Date(dateTimeString);
  return date.toLocaleString('en-HK', { 
    timeZone: 'Asia/Hong_Kong',  // ← Explicit timezone
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit', 
    hour12: false 
  });
};
```

---

## Solution: Unified Date Handling Convention

### 1. Timezone Policy (Server)

**Decision: Use UTC for all storage and API responses**

- MongoDB stores all dates as **ISO 8601 UTC** (JavaScript Date objects automatically convert to UTC in API responses)
- Backend always works with UTC internally
- Client receives UTC strings and converts to local display format
- All calculations use UTC to avoid timezone math errors

**Rationale:**
- UTC is unambiguous and timezone-independent
- Prevents off-by-one errors when dates cross midnight in different timezones
- Standard practice across most systems

### 2. Storage Format (Database)

**Change Item.js date fields from String to Date:**

```javascript
// BEFORE (WRONG):
purchaseDate: {
  type: String,
  default: ''
},

// AFTER (CORRECT):
purchaseDate: {
  type: Date,
  default: null,
  index: true
},
```

**For all date fields:**
- `purchaseDate` → `type: Date`
- `warrantyStartDate` → `type: Date`
- `warrantyEnd` → `type: Date`
- `lastUpdate` → Remove (use `updatedAt` instead, which is already a Date)

### 3. API Response Format

**Standard: ISO 8601 UTC strings**

When Mongoose serializes Date to JSON:
```javascript
// MongoDB stores: ISODate("2026-03-30T00:00:00.000Z")
// API returns: "2026-03-30T00:00:00.000Z"
```

**Example API Response:**
```json
{
  "item": {
    "itemId": "INV-0001",
    "purchaseDate": "2026-01-15T00:00:00.000Z",
    "warrantyEnd": "2027-12-31T00:00:00.000Z",
    "createdAt": "2026-03-20T10:30:45.123Z",
    "updatedAt": "2026-03-30T08:15:22.456Z"
  }
}
```

### 4. Frontend Display Format

**Standardize across all pages:** Create unified date formatting functions in `helpers.js`

```javascript
/**
 * Format date for display (local timezone, date only)
 * Input: ISO 8601 string or Date object
 * Output: "2026-03-30" (YYYY-MM-DD) in local time
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  // Use local timezone (browser's current timezone)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Format date + time for display (local timezone)
 * Input: ISO 8601 string or Date object
 * Output: "2026-03-30 14:30:45" (YYYY-MM-DD HH:MM:SS)
 */
export const formatDateTime = (dateInput) => {
  if (!dateInput) return 'N/A';
  
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  // Use local timezone
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Format date in specified timezone (Asia/Hong_Kong by default)
 * Input: ISO 8601 string or Date object
 * Output: "2026-03-30 14:30:45 HKT"
 */
export const formatDateTimeWithTZ = (dateInput, timezone = 'Asia/Hong_Kong') => {
  if (!dateInput) return 'N/A';
  
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  const options = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  return new Intl.DateTimeFormat('en-GB', options).format(date);
};

/**
 * Format for API requests (date input element sends YYYY-MM-DD)
 * Input: "2026-03-30" (local date from <input type="date">)
 * Output: "2026-03-30T00:00:00.000Z" (UTC for API)
 * 
 * NOTE: <input type="date"> always returns local date string.
 * To send as UTC midnight, we need to convert:
 */
export const localDateStringToUTC = (dateString) => {
  if (!dateString) return null;
  
  // "2026-03-30" → [2026, 03, 30]
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Create Date in local timezone at midnight
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  
  // Convert to ISO UTC string
  return date.toISOString();
};

/**
 * Format for date input elements
 * Input: ISO 8601 string or Date object
 * Output: "2026-03-30" (for <input type="date"> in local time)
 */
export const dateToInputString = (dateInput) => {
  if (!dateInput) return '';
  
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};
```

### 5. Backend Date Handling

**itemController.js - Handle incoming date strings from form:**

```javascript
// When user submits form with <input type="date">
// Value received: "2026-03-30" (local date string)
// Must convert to UTC Date object for storage

exports.createItem = catchAsync(async (req, res) => {
  let { purchaseDate, warrantyStartDate, warrantyEnd, ...otherFields } = req.body;
  
  // Convert date strings to Date objects
  if (purchaseDate) {
    purchaseDate = new Date(`${purchaseDate}T00:00:00Z`);
  }
  if (warrantyStartDate) {
    warrantyStartDate = new Date(`${warrantyStartDate}T00:00:00Z`);
  }
  if (warrantyEnd) {
    warrantyEnd = new Date(`${warrantyEnd}T00:00:00Z`);
  }
  
  const item = await Item.create({
    ...otherFields,
    purchaseDate,
    warrantyStartDate,
    warrantyEnd,
    // Remove: lastUpdate (use MongoDB's updatedAt instead)
  });
  
  res.status(201).json({ success: true, item });
});

// Date comparisons now work correctly:
const expiredWarranty = await Item.find({
  warrantyEnd: { $lt: new Date() }  // Simple UTC comparison
});
```

**itemController.js - Filter by date range:**

```javascript
// Query param: ?warrantyEndBefore=2026-06-30
exports.getAllItems = catchAsync(async (req, res) => {
  const { warrantyEndBefore, warrantyEndAfter } = req.query;
  const filter = {};
  
  if (warrantyEndBefore) {
    filter.warrantyEnd = { $lt: new Date(`${warrantyEndBefore}T23:59:59Z`) };
  }
  if (warrantyEndAfter) {
    filter.warrantyEnd = { $gt: new Date(`${warrantyEndAfter}T00:00:00Z`) };
  }
  
  // ... rest of query
});
```

### 6. Migration Plan

**Step 1: Add helpers to frontend**
- Update `frontend/src/utils/helpers.js` with new date formatting functions

**Step 2: Update Item.js Schema**
```javascript
// Change date fields from String to Date type
purchaseDate: { type: Date, default: null, index: true },
warrantyStartDate: { type: Date, default: null, index: true },
warrantyEnd: { type: Date, default: null, index: true },
// Remove: lastUpdate field (keep only updatedAt)
```

**Step 3: Create Data Migration Script**
```javascript
// backend/migrations/migrate-date-fields.js
db.items.updateMany(
  { purchaseDate: { $type: 'string', $ne: '' } },
  [{ $set: { 
      purchaseDate: { 
        $cond: [
          { $ne: ['$purchaseDate', ''] },
          { $dateFromString: { dateString: '$purchaseDate' } },
          null
        ]
      }
    }
  }]
);

// Same for warrantyStartDate, warrantyEnd
```

**Step 4: Update Controllers**
- itemController.js: parse date inputs before saving
- Handle date comparisons correctly

**Step 5: Update Frontend**
- All pages: use `formatDate()` / `formatDateTime()` for display
- Item form: use `dateToInputString()` to populate `<input type="date">`
- All form submissions: date values are already YYYY-MM-DD strings from input elements

**Step 6: Testing**
- Create item with warranty date in near-midnight time
- Verify date displays same on all pages
- Test in different browser timezones (use browser dev tools)
- Verify API response contains correct ISO dates

---

## Implementation Checklist

### Phase 1: Frontend Helper Functions ✅

- [ ] Update `frontend/src/utils/helpers.js`:
  - [ ] Enhance `formatDate()` with explicit date handling
  - [ ] Enhance `formatDateTime()` with explicit date handling
  - [ ] Add `formatDateTimeWithTZ()` for timezone-aware display
  - [ ] Add `localDateStringToUTC()` for form input conversion
  - [ ] Add `dateToInputString()` for populating date inputs

### Phase 2: Database Schema Migration 🔄

- [ ] Update `backend/models/Item.js`:
  - [ ] `purchaseDate`: String → Date
  - [ ] `warrantyStartDate`: String → Date
  - [ ] `warrantyEnd`: String → Date
  - [ ] Remove `lastUpdate` (use `updatedAt` instead)

- [ ] Create migration script: `backend/migrations/migrate-item-dates.js`
  - [ ] Convert existing string dates to Date objects
  - [ ] Handle null/empty strings
  - [ ] Verify migration result (count matching records)

- [ ] Run migration on development database
- [ ] Verify: `db.items.findOne().purchaseDate` is ISODate, not string

### Phase 3: Backend Controller Updates 🔄

- [ ] Update `backend/controllers/itemController.js`:
  - [ ] Parse date strings in `createItem()`
  - [ ] Parse date strings in `updateItem()`
  - [ ] Fix date comparison queries (remove string comparisons)
  - [ ] Ensure API responses include dates as ISO strings

- [ ] Update `backend/controllers/borrowRequestController.js`:
  - [ ] Verify Date objects are used correctly (already mostly correct)
  - [ ] Fix any string date comparisons if present

### Phase 4: Frontend Page Updates 🔄

Update all pages that display or input dates:
- [ ] `InventoryPage.vue` — display warranty dates
- [ ] `ManageItemsPage.vue` — display warranty dates, filter by warranty
- [ ] `ItemEditPage.vue` — populate date inputs, handle form submission
- [ ] `LentOutFilterPage.vue` — filter by warranty date
- [ ] `SearchAvailableItemsPage.vue` — display warranty dates
- [ ] `MyItemsPage.vue` — display warranty dates
- [ ] `ApproveRequestsPage.vue` — display request dates
- [ ] `AuditLogPage.vue` — display audit dates
- [ ] `BorrowHistoryPage.vue` — display request dates

For each page:
- [ ] Replace all date display with `formatDate()` or `formatDateTime()`
- [ ] Ensure `dateToInputString()` is used when populating date inputs
- [ ] Test date filtering/sorting works correctly

### Phase 5: Form Handling Updates 🔄

For all item forms (create/edit):
- [ ] Date input values use `<input type="date">`
- [ ] On form submission:
  - If using JSON: convert date strings via `localDateStringToUTC()`
  - If using FormData: date strings are sent as-is, backend converts
- [ ] Backend receives date string, converts to Date object before saving

### Phase 6: Testing & Validation ✅

**Unit Tests:**
- [ ] `formatDate('2026-03-30T00:00:00.000Z')` returns `'2026-03-30'`
- [ ] `formatDateTime('2026-03-30T14:30:45.123Z')` returns `'2026-03-30 14:30:45'`
- [ ] `dateToInputString('2026-03-30T00:00:00.000Z')` returns `'2026-03-30'`
- [ ] `localDateStringToUTC('2026-03-30')` returns ISO date string

**Integration Tests:**
- [ ] Create item with warranty date 2026-12-31
- [ ] Fetch item via API
- [ ] Verify warrantyEnd is ISO date in response
- [ ] Display on page: shows "2026-12-31"
- [ ] Verify same date displays on all pages showing same item
- [ ] Filter by warranty date ≤ 2026-12-31: includes this item
- [ ] Filter by warranty date ≤ 2026-12-30: excludes this item

**Cross-Timezone Tests:**
1. Set browser timezone to UTC (Dev Tools)
2. Create item with date 2026-03-30
3. Verify: API shows `2026-03-30T00:00:00.000Z`
4. Verify: Page displays "2026-03-30"
5. Change browser timezone to UTC-8
6. Refresh page
7. Verify: Page still displays "2026-03-30"

---

## Key Points Summary

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Storage Format** | MongoDB Date objects (UTC) | UTC is unambiguous, supports comparisons |
| **API Response** | ISO 8601 strings (e.g., `2026-03-30T00:00:00.000Z`) | Standard, client-parseable |
| **Frontend Display** | Local time using `formatDate()` | User-friendly, matches browser timezone |
| **Form Input** | HTML5 `<input type="date">` | Native, returns YYYY-MM-DD strings |
| **Date Comparison** | Always use Date objects (UTC math) | Prevents off-by-one timezone errors |
| **Remove** | `lastUpdate` field (String type) | Use MongoDB `updatedAt` (Date) instead |

---

## Affected Files

| File | Change | Priority |
|------|--------|----------|
| `frontend/src/utils/helpers.js` | Add/enhance date formatting functions | P0 |
| `backend/models/Item.js` | Change date fields to Date type | P0 |
| `backend/migrations/migrate-item-dates.js` | Create migration script | P0 |
| `backend/controllers/itemController.js` | Parse dates on input, fix comparisons | P0 |
| `frontend/src/pages/InventoryPage.vue` | Use formatDate() | P1 |
| `frontend/src/pages/ManageItemsPage.vue` | Use formatDate() | P1 |
| `frontend/src/pages/ItemEditPage.vue` | Handle date input/conversion | P1 |
| `frontend/src/pages/LentOutFilterPage.vue` | Use formatDate() | P1 |
| Other date-displaying pages | Use formatDate() | P1 |

---

## Rollback Plan

If migration fails:
1. Stop API server
2. Restore MongoDB backup (before migration)
3. Revert Item.js schema to String types
4. Clear browser cache
5. Restart API

---

## Sign-Off

| Role | Name | Date | Notes |
|------|------|------|-------|
| **Dev Lead** | __________ | __________ | Reviewed standardization plan |
| **Phyllis (QA)** | __________ | __________ | Testing & validation |

---

**This standardization ensures:**
✅ Same date displays consistently across all pages  
✅ No off-by-one errors from timezone conversions  
✅ Date filtering/sorting works correctly  
✅ API responses are machine-parseable and timezone-independent  
