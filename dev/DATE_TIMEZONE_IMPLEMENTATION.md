# Date & Timezone Standardization — Implementation

**Status:** 🔄 Ready to Implement | **Last Updated:** 2026-03-30

---

## Quick Implementation Guide

This document provides exact code changes needed.

---

## Step 1: Update Frontend Helper Functions

**File:** `frontend/src/utils/helpers.js`

Replace the existing `formatDate` and `formatDateTime` functions with:

```javascript
/**
 * Format date for display (local timezone, date only)
 * Input: ISO 8601 string like "2026-03-30T00:00:00.000Z" or Date object
 * Output: "2026-03-30" (YYYY-MM-DD) in browser's local timezone
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  // Use local timezone — getFullYear/Month/Date use local time
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Format date + time for display (local timezone)
 * Input: ISO 8601 string or Date object
 * Output: "2026-03-30 14:30:45" (YYYY-MM-DD HH:MM:SS) in local time
 */
export const formatDateTime = (dateInput) => {
  if (!dateInput) return 'N/A';
  
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  // Use local timezone — all getters use local time
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Format date in specified timezone (Asia/Hong_Kong for HK, etc.)
 * Useful for admin/operator to see exact timezone context
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
 * Convert local date string from <input type="date"> to UTC ISO format
 * This is CRITICAL for form submission
 * 
 * Example:
 * Input: "2026-03-30" (from HTML date input)
 * Output: "2026-03-30T00:00:00.000Z" (UTC ISO for API)
 */
export const localDateStringToUTC = (dateString) => {
  if (!dateString) return null;
  
  // Parse "2026-03-30"
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Create Date at local midnight
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  
  // Return ISO UTC string
  return date.toISOString();
};

/**
 * Convert Date/ISO string to HTML date input format (YYYY-MM-DD)
 * Used when populating <input type="date"> from API data
 * 
 * Example:
 * Input: "2026-03-30T00:00:00.000Z" or Date object
 * Output: "2026-03-30" (local date as YYYY-MM-DD)
 */
export const dateToInputString = (dateInput) => {
  if (!dateInput) return '';
  
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  
  // Use local timezone
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};
```

**Then add/update any other existing export statements in helpers.js — keep all other functions unchanged.**

---

## Step 2: Update Item.js Schema

**File:** `backend/models/Item.js`

Find and replace date field definitions (approximately lines 68-113):

```javascript
  purchaseDate: {
    type: Date,
    default: null,
    index: true
  },
  warrantyEnd: {
    type: Date,
    default: null,
    index: true
  },
  warrantyStartDate: {
    type: Date,
    default: null,
    index: true
  },
  // ... keep invoiceFile, lastUpdate field should be REMOVED
```

**IMPORTANT:** Remove the `lastUpdate` field entirely. MongoDB's `updatedAt` timestamp serves the same purpose with proper Date type.

**New schema block (complete):**
```javascript
  purchaseDate: {
    type: Date,
    default: null,
    index: true
  },
  warrantyStartDate: {
    type: Date,
    default: null,
    index: true
  },
  warrantyEnd: {
    type: Date,
    default: null,
    index: true
  },
  warrantyOnsite: {
    type: Boolean,
    default: false
  },
  warrantyVendor: {
    type: String,
    default: '',
    trim: true
  },
  vendor: {
    type: String,
    default: '',
    trim: true
  },
  price: {
    type: Number,
    default: 0
  },
  departmentID: {
    type: String,
    default: '',
    trim: true
  },
  owner: {
    type: String,
    default: 'department',
    trim: true
  },
  canBorrow: {
    type: Boolean,
    default: true
  },
  invoiceFile: {
    filename: String,
    mimetype: String,
    size: Number,
    path: String
  },
  // NOTE: lastUpdate field REMOVED — use updatedAt (Mongoose auto-timestamp) instead
}, {
  timestamps: true
});
```

---

## Step 3: Migration Script

**File:** Create `backend/migrations/migrate-item-dates.js`

```javascript
/**
 * Migration: Convert Item date fields from String to Date type
 * 
 * Run: node backend/migrations/migrate-item-dates.js
 * Requires: MONGODB_URI environment variable set
 */

const mongoose = require('mongoose');

const migrateItemDates = async () => {
  try {
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory';
    await mongoose.connect(dbUri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const itemsCollection = db.collection('items');

    // Step 1: Count documents to migrate
    const stringDateCount = await itemsCollection.countDocuments({
      $or: [
        { purchaseDate: { $type: 'string', $ne: '' } },
        { warrantyStartDate: { $type: 'string', $ne: '' } },
        { warrantyEnd: { $type: 'string', $ne: '' } }
      ]
    });

    console.log(`\n📊 Found ${stringDateCount} documents with string dates to convert`);

    if (stringDateCount === 0) {
      console.log('✅ No migration needed — all dates already in correct format');
      await mongoose.connection.close();
      return;
    }

    // Step 2: Migrate purchaseDate
    console.log('\n🔄 Converting purchaseDate from String to Date...');
    const purchaseDateResult = await itemsCollection.updateMany(
      { purchaseDate: { $type: 'string', $ne: '' } },
      [
        {
          $set: {
            purchaseDate: {
              $dateFromString: {
                dateString: '$purchaseDate'
              }
            }
          }
        }
      ]
    );
    console.log(`   Modified: ${purchaseDateResult.modifiedCount} documents`);

    // Step 3: Migrate warrantyStartDate
    console.log('\n🔄 Converting warrantyStartDate from String to Date...');
    const warrantyStartResult = await itemsCollection.updateMany(
      { warrantyStartDate: { $type: 'string', $ne: '' } },
      [
        {
          $set: {
            warrantyStartDate: {
              $dateFromString: {
                dateString: '$warrantyStartDate'
              }
            }
          }
        }
      ]
    );
    console.log(`   Modified: ${warrantyStartResult.modifiedCount} documents`);

    // Step 4: Migrate warrantyEnd
    console.log('\n🔄 Converting warrantyEnd from String to Date...');
    const warrantyEndResult = await itemsCollection.updateMany(
      { warrantyEnd: { $type: 'string', $ne: '' } },
      [
        {
          $set: {
            warrantyEnd: {
              $dateFromString: {
                dateString: '$warrantyEnd'
              }
            }
          }
        }
      ]
    );
    console.log(`   Modified: ${warrantyEndResult.modifiedCount} documents`);

    // Step 5: Remove lastUpdate field (no longer needed)
    console.log('\n🗑️  Removing lastUpdate field (use updatedAt instead)...');
    const removeLastUpdateResult = await itemsCollection.updateMany(
      { lastUpdate: { $exists: true } },
      { $unset: { lastUpdate: '' } }
    );
    console.log(`   Modified: ${removeLastUpdateResult.modifiedCount} documents`);

    // Step 6: Verify migration
    console.log('\n✅ Verification:');
    const sampleItem = await itemsCollection.findOne();
    if (sampleItem) {
      console.log('Sample item after migration:');
      console.log(`  purchaseDate: ${sampleItem.purchaseDate} (type: ${typeof sampleItem.purchaseDate})`);
      console.log(`  warrantyStartDate: ${sampleItem.warrantyStartDate} (type: ${typeof sampleItem.warrantyStartDate})`);
      console.log(`  warrantyEnd: ${sampleItem.warrantyEnd} (type: ${typeof sampleItem.warrantyEnd})`);
      console.log(`  lastUpdate: ${sampleItem.lastUpdate ? 'EXISTS' : 'REMOVED'}`);
      console.log(`  updatedAt: ${sampleItem.updatedAt} (type: ${typeof sampleItem.updatedAt})`);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Restart backend server: npm start');
    console.log('2. Test creating/editing items with dates');
    console.log('3. Verify API returns ISO dates in responses');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
};

migrateItemDates();
```

**Run migration:**
```bash
cd backend
node migrations/migrate-item-dates.js
```

---

## Step 4: Update itemController.js

**File:** `backend/controllers/itemController.js`

**Update createItem endpoint (around line 250+):**

Find the `createItem` function and update date handling:

```javascript
exports.createItem = catchAsync(async (req, res, next) => {
  let {
    name, universityID, type, category, status, location, description,
    motherID, fixedComponents,
    foRequestID, orderID, supplier, invoiceNumber, supplierStatus, projectLinked, fundingSource,
    purchaseDate, warrantyStartDate, warrantyEnd,  // Date fields
    warrantyOnsite, warrantyVendor, vendor, price, departmentID,
    ...otherFields
  } = req.body;

  // Validate required fields
  if (!name || !universityID) {
    return next(ApiError.badRequest('Item name and University ID are required'));
  }

  // ✅ IMPORTANT: Parse date strings from form input to Date objects
  // Form sends YYYY-MM-DD strings from <input type="date">
  // Convert to UTC Date objects for MongoDB storage
  const itemData = {
    name, universityID, type, category, status, location, description,
    motherID, fixedComponents, foRequestID, orderID, supplier,
    invoiceNumber, supplierStatus, projectLinked, fundingSource,
    warrantyOnsite, warrantyVendor, vendor, price, departmentID,
    ...otherFields
  };

  // Convert date strings to Date objects (UTC)
  if (purchaseDate && purchaseDate.trim()) {
    itemData.purchaseDate = new Date(`${purchaseDate}T00:00:00Z`);
  }
  if (warrantyStartDate && warrantyStartDate.trim()) {
    itemData.warrantyStartDate = new Date(`${warrantyStartDate}T00:00:00Z`);
  }
  if (warrantyEnd && warrantyEnd.trim()) {
    itemData.warrantyEnd = new Date(`${warrantyEnd}T00:00:00Z`);
  }

  // Handle file upload
  if (req.file) {
    itemData.invoiceFile = {
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    };
  }

  // Create item
  const item = await Item.create(itemData);

  // Audit log
  await addAuditLog(req.user.userId, 'ITEM_CREATED', `Item ${item.name} (${item.itemId}) created`, item.itemId);

  res.status(201).json({
    success: true,
    message: 'Item created successfully',
    item
  });
});
```

**Update updateItem endpoint (around line 300+):**

```javascript
exports.updateItem = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const {
    name, universityID, type, category, status, location, description,
    motherID, fixedComponents,
    foRequestID, orderID, supplier, invoiceNumber, supplierStatus, projectLinked, fundingSource,
    purchaseDate, warrantyStartDate, warrantyEnd,  // Date fields
    warrantyOnsite, warrantyVendor, vendor, price, departmentID,
    ...otherFields
  } = req.body;

  const item = await Item.findOne({ itemId: id });
  if (!item) {
    return next(ApiError.notFound(`Item ${id} not found`));
  }

  // Update fields
  if (name) item.name = name;
  if (universityID) item.universityID = universityID;
  if (type) item.type = type;
  if (category) item.category = category;
  if (status) item.status = status;
  if (location) item.location = location;
  if (description) item.description = description;
  if (motherID !== undefined) item.motherID = motherID || null;
  if (fixedComponents) item.fixedComponents = fixedComponents;
  if (foRequestID !== undefined) item.foRequestID = foRequestID;
  if (orderID !== undefined) item.orderID = orderID;
  if (supplier !== undefined) item.supplier = supplier;
  if (invoiceNumber !== undefined) item.invoiceNumber = invoiceNumber;
  if (supplierStatus !== undefined) item.supplierStatus = supplierStatus;
  if (projectLinked !== undefined) item.projectLinked = projectLinked;
  if (fundingSource !== undefined) item.fundingSource = fundingSource;
  if (warrantyOnsite !== undefined) item.warrantyOnsite = warrantyOnsite;
  if (warrantyVendor !== undefined) item.warrantyVendor = warrantyVendor;
  if (vendor !== undefined) item.vendor = vendor;
  if (price !== undefined) item.price = price;
  if (departmentID !== undefined) item.departmentID = departmentID;

  // ✅ IMPORTANT: Convert date strings to Date objects
  if (purchaseDate && purchaseDate.trim()) {
    item.purchaseDate = new Date(`${purchaseDate}T00:00:00Z`);
  } else if (purchaseDate === '') {
    item.purchaseDate = null;
  }

  if (warrantyStartDate && warrantyStartDate.trim()) {
    item.warrantyStartDate = new Date(`${warrantyStartDate}T00:00:00Z`);
  } else if (warrantyStartDate === '') {
    item.warrantyStartDate = null;
  }

  if (warrantyEnd && warrantyEnd.trim()) {
    item.warrantyEnd = new Date(`${warrantyEnd}T00:00:00Z`);
  } else if (warrantyEnd === '') {
    item.warrantyEnd = null;
  }

  // Handle file upload
  if (req.file) {
    item.invoiceFile = {
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    };
  }

  await item.save();

  // Audit log
  await addAuditLog(req.user.userId, 'ITEM_UPDATED', `Item ${item.name} (${item.itemId}) updated`, item.itemId);

  res.status(200).json({
    success: true,
    message: 'Item updated successfully',
    item
  });
});
```

**Update getAllItems filter (around line 70-80):**

Replace string date comparisons with Date object comparisons:

```javascript
// BEFORE (WRONG):
// if (warrantyEnd) filter.warrantyEnd = { $lte: warrantyEnd };

// AFTER (CORRECT):
if (warrantyEnd) {
  // warrantyEnd is a date string from query: "2026-12-31"
  filter.warrantyEnd = { $lte: new Date(`${warrantyEnd}T23:59:59Z`) };
}

// For warranty status filter:
if (warrantyStatus === 'expired') {
  filter.warrantyEnd = { $lt: new Date() };
} else if (warrantyStatus === 'expiring-soon') {
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  filter.warrantyEnd = {
    $gte: now,
    $lte: soon
  };
}
```

---

## Step 5: Update Frontend Pages

For each page that displays or inputs dates, update usage:

**Example: ManageItemsPage.vue**

In the script section, ensure:
```javascript
import { formatDate, dateToInputString, localDateStringToUTC } from '../utils/helpers'

// When displaying warranty dates:
{{ formatDate(item.warrantyEnd) }}

// When populating form with item data:
formData.warrantyEnd = dateToInputString(item.warrantyEnd)

// When form is submitted:
const data = {
  ...formData,
  purchaseDate: localDateStringToUTC(formData.purchaseDate),
  warrantyStartDate: localDateStringToUTC(formData.warrantyStartDate),
  warrantyEnd: localDateStringToUTC(formData.warrantyEnd),
};
```

**Pages to update:**
- [ ] `InventoryPage.vue` — display `{{ formatDate(item.warrantyEnd) }}`
- [ ] `ManageItemsPage.vue` — display & edit dates
- [ ] `ItemEditPage.vue` — edit form
- [ ] `LentOutFilterPage.vue` — filter & display dates
- [ ] `SearchAvailableItemsPage.vue` — display dates
- [ ] `MyItemsPage.vue` — display dates
- [ ] `ApproveRequestsPage.vue` — display request dates (use `formatDateTime()`)
- [ ] `AuditLogPage.vue` — display audit dates
- [ ] `BorrowHistoryPage.vue` — display dates

---

## Step 6: Testing Checklist

After implementation:

- [ ] Create item with warranty date 2026-12-31
  - [ ] Verify API response: `"warrantyEnd": "2026-12-31T00:00:00.000Z"`
  - [ ] Verify page displays: "2026-12-31"
  
- [ ] Edit item, change warranty date to 2027-06-15
  - [ ] Verify database updated
  - [ ] Verify page displays new date

- [ ] Test date filtering:
  - [ ] Filter by warranty ≤ 2027-06-15: item included ✅
  - [ ] Filter by warranty ≤ 2027-06-14: item excluded ✅
  
- [ ] Test date sorting:
  - [ ] Sort by warranty ascending: shows oldest first ✅
  - [ ] Sort by warranty descending: shows newest first ✅

- [ ] Test across browsers/timezones (dev tools):
  - [ ] Chrome (default timezone)
  - [ ] Firefox with UTC set
  - [ ] Safari with Asia/Hong_Kong set
  - All should display same date ✅

---

## Rollback Instructions

If issues occur:

```bash
# 1. Stop backend server

# 2. Restore from MongoDB backup (before migration)

# 3. Revert Item.js schema to String types:
# Edit backend/models/Item.js, change dates back to String

# 4. Restart backend
npm start
```

---

## Summary of Changes

| Component | Change | Files |
|-----------|--------|-------|
| **Frontend Helpers** | Add/enhance date formatting functions | `helpers.js` |
| **Database Schema** | Change date fields to Date type | `Item.js` |
| **Data Migration** | Convert existing string dates to Date | Migration script |
| **Backend Controllers** | Parse date strings, fix comparisons | `itemController.js` |
| **Frontend Pages** | Use formatDate() for display | All pages with dates |

**Total effort:** ~4-6 hours development + 1-2 hours testing

---

✅ **Implementation ready to proceed!**
