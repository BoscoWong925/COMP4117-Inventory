# COMP4117 Inventory System — Comprehensive Database Field Schema

> **Version:** 2.0  
> **Date:** 2025-06-03  
> **Author:** Auto-generated from codebase analysis  
> **Purpose:** Complete reference for all collections, fields, API endpoints, validation rules, indexes, and relationships. This document is implementation-ready for the next development phase.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Collection: User](#2-collection-user)
3. [Collection: Item (Inventory)](#3-collection-item-inventory)
4. [Collection: BorrowRequest](#4-collection-borrowrequest)
5. [Collection: AuditLog](#5-collection-auditlog)
6. [Collection: Counter (Internal)](#6-collection-counter-internal)
7. [API Endpoint Reference](#7-api-endpoint-reference)
8. [Entity Relationships & ER Diagram](#8-entity-relationships--er-diagram)
9. [Enum & Constant Definitions](#9-enum--constant-definitions)
10. [Index Strategy](#10-index-strategy)
11. [Gap Analysis & Recommendations](#11-gap-analysis--recommendations)
12. [Migration Checklist](#12-migration-checklist)

---

## 1. Architecture Overview

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Vue.js 3 (Composition API) + Vite | SPA at port 3000 |
| Backend | Express.js + Mongoose ODM | REST API at port 5001 |
| Database | MongoDB (mongodb-memory-server for dev) | 5 collections |
| Auth | JWT (jsonwebtoken) + bcryptjs | Session stored in `sessionStorage` |
| File Storage | Local filesystem (`uploads/`) | multer for file handling |

### Collections Summary

| Collection | Document Count (Seed) | Primary Key | Auto-ID Pattern |
|------------|----------------------|-------------|-----------------|
| User | 8 | `userId` | Manual (e.g. `U001`, `S00123456`) |
| Item | 12 | `itemId` | Auto: `INV-XXX` via Counter |
| BorrowRequest | 16 | `requestId` | Auto: `REQ-XXX` via Counter |
| AuditLog | 18 | `logId` | Auto: `LOG-XXX` via Counter |
| Counter | 3 | `_id` | N/A (utility) |

---

## 2. Collection: User

> **Mongoose Model:** `backend/models/User.js` (84 lines)  
> **Controller:** `backend/controllers/userController.js` (300 lines)  
> **Status:** ✅ Considered complete — no structural changes needed

### 2.1 Field Definitions

| # | Field Name | Mongoose Type | Required | Unique | Default | Validation | Description |
|---|-----------|---------------|:--------:|:------:|---------|------------|-------------|
| 1 | `userId` | String | ✅ | ✅ | — | trim | Primary key. Manual assignment (e.g. `U001`, `S00123456`) |
| 2 | `username` | String | ✅ | ✅ | — | trim, lowercase | Login identifier |
| 3 | `password` | String | ✅ | — | — | minlength: 6 | bcrypt-hashed via pre-save hook. Excluded from JSON output |
| 4 | `name` | String | ✅ | — | — | trim | Display name |
| 5 | `email` | String | ✅ | ✅ | — | trim, lowercase, regex: `/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/` | University email |
| 6 | `role` | String | ✅ | — | `'user'` | enum: `['admin', 'operator', 'user']` | Access level |
| 7 | `department` | String | ✅ | — | — | trim | Department code (e.g. `COMP`) |
| 8 | `isActive` | Boolean | — | — | `true` | — | Soft delete / deactivation flag |
| 9 | `createdAt` | Date | auto | — | auto | — | Mongoose `timestamps: true` |
| 10 | `updatedAt` | Date | auto | — | auto | — | Mongoose `timestamps: true` |

### 2.2 Model Behavior

| Feature | Implementation |
|---------|---------------|
| Password Hashing | `pre('save')` hook → `bcrypt.hash(password, 12)` only when `isModified('password')` |
| Password Comparison | `userSchema.methods.comparePassword(candidatePassword)` → `bcrypt.compare()` |
| JSON Serialization | `toJSON()` method deletes `password` field from output |

### 2.3 Indexes

| Index | Type | Purpose |
|-------|------|---------|
| `{ userId: 1 }` | Single field | Primary lookup |
| `{ username: 1 }` | Single field | Login lookup |
| `{ email: 1 }` | Single field | Duplicate check |
| `{ role: 1 }` | Single field | Filter by role |
| `{ isActive: 1 }` | Single field | Filter active/inactive |
| `{ createdAt: -1 }` | Single field (desc) | Sort by creation date |
| `{ name: 'text', email: 'text', username: 'text' }` | Text | Full-text search |

### 2.4 API Endpoints (User)

| Method | Endpoint | Auth | Roles | Request Body | Response |
|--------|----------|:----:|-------|-------------|----------|
| GET | `/api/users` | ✅ | admin, operator | — | `{ users[], total, page, pageSize }` |
| POST | `/api/users` | ✅ | admin | `{ userId, username, password, name, email, role, department }` | `{ user }` |
| GET | `/api/users/search/:query` | ✅ | admin, operator | — | `{ users[], count }` |
| GET | `/api/users/:id` | ✅ | any | — | `{ user }` |
| PUT | `/api/users/:id` | ✅ | any (self) / admin (others) | `{ name?, email?, department?, role? }` | `{ user }` |
| DELETE | `/api/users/:id` | ✅ | admin | — | `{ message }` |
| PUT | `/api/users/:id/status` | ✅ | admin | `{ isActive: boolean }` | `{ user }` |

### 2.5 Query Parameters (GET `/api/users`)

| Param | Type | Description |
|-------|------|-------------|
| `role` | String | Filter by role |
| `isActive` | String (`'true'`/`'false'`) | Filter by active status |
| `search` | String | Regex search across userId, username, name, email |
| `page` | Number | Page number (default: 1) |
| `pageSize` | Number | Items per page (default: 10) |
| `sortBy` | String | Sort field (default: `createdAt`) |
| `sortDir` | String | `asc` or `desc` (default: `desc`) |

---

## 3. Collection: Item (Inventory)

> **Mongoose Model:** `backend/models/Item.js` (158 lines)  
> **Controller:** `backend/controllers/itemController.js` (416 lines)  
> **Status:** ⚠️ Needs type corrections and validation improvements

### 3.1 Field Definitions

| # | Field Name | Current Type | Required | Unique | Default | Validation | Description |
|---|-----------|-------------|:--------:|:------:|---------|------------|-------------|
| 1 | `itemId` | String | ✅ | ✅ | — | trim | Auto-generated: `INV-XXX` via Counter |
| 2 | `name` | String | ✅ | — | — | trim | Item display name |
| 3 | `universityID` | String | ✅ | — | — | trim | University asset tag number |
| 4 | `type` | String | — | — | `'Hardware'` | enum: `['Hardware', 'Software', 'Component']` | Item classification |
| 5 | `category` | String | — | — | `'Other'` | trim | Sub-category (e.g. Computer, Display, Peripherals) |
| 6 | `status` | String | — | — | `'Available'` | enum: `['Available', 'In-use', 'Missing', 'Dispose', 'Not Available', 'Transferred']` | Lifecycle status |
| 7 | `location` | String | — | — | `''` | trim | Physical location (e.g. Lab A, Office) |
| 8 | `currentBorrower` | String | — | — | `null` | — | Ref → `User.userId`. Set on approve, cleared on return |
| 9 | `description` | String | — | — | `''` | trim | Free text description |
| 10 | `motherID` | String | — | — | `null` | trim | Parent item ID for component grouping. `null` = standalone |
| 11 | `fixedComponents` | [String] | — | — | `[]` | — | Array of child `itemId` values |
| 12 | `foRequestID` | String | — | — | `''` | trim | Financial Office request reference |
| 13 | `orderID` | String | — | — | `''` | trim | Purchase order reference |
| 14 | `supplier` | String | — | — | `''` | trim | Supplier / vendor company who sold the item |
| 15 | `invoiceNumber` | String | — | — | `''` | trim | Invoice reference number |
| 16 | `supplierStatus` | String | — | — | `''` | trim | Delivery status (e.g. Delivered, Pending) |
| 17 | `projectLinked` | String | — | — | `null` | trim | Associated project name or code |
| 18 | `fundingSource` | String | — | — | `''` | trim | Budget source (e.g. Department Budget, Research Fund) |
| 19 | `purchaseDate` | **String** ⚠️ | — | — | `''` | — | Date of purchase. **Should be Date** |
| 20 | `warrantyStartDate` | **String** ⚠️ | — | — | `''` | — | Warranty start date. **Should be Date** |
| 21 | `warrantyEnd` | **String** ⚠️ | — | — | `''` | — | Warranty expiry date. **Should be Date** |
| 22 | `warrantyOnsite` | Boolean | — | — | `false` | — | Whether onsite warranty is available |
| 23 | `warrantyVendor` | String | — | — | `''` | trim | Warranty service provider |
| 24 | `vendor` | String | — | — | `''` | trim | Sales vendor (may differ from supplier) |
| 25 | `price` | Number | — | — | `0` | — | Purchase price. **Should have min: 0** |
| 26 | `departmentID` | String | — | — | `''` | trim | Owning department |
| 27 | `invoiceFile` | Embedded Object | — | — | — | — | `{ filename: String, mimetype: String, size: Number, path: String }` |
| 28 | `lastUpdate` | **String** ⚠️ | — | — | `() => new Date().toISOString().split('T')[0]` | — | Last manual update. **Should be Date** |
| 29 | `createdAt` | Date | auto | — | auto | — | Mongoose `timestamps: true` |
| 30 | `updatedAt` | Date | auto | — | auto | — | Mongoose `timestamps: true` |

### 3.2 Parent-Child (Mother-Component) Relationship

```
Mother Item (motherID = null, fixedComponents = ['INV-002', 'INV-003'])
  ├── Component Item (motherID = 'COMP-LAPTOP-001', fixedComponents = [])
  └── Component Item (motherID = 'COMP-LAPTOP-001', fixedComponents = [])
```

- **Parent → Children:** `fixedComponents` array stores child `itemId` values
- **Child → Parent:** `motherID` stores a group identifier (NOT the parent `itemId` — currently stores a separate grouping ID like `COMP-LAPTOP-001`)
- **Behavior on borrow:** Creating a request for a parent auto-creates child requests for all `fixedComponents`
- **Behavior on return:** Returning a parent auto-resets all components' `status` to `Available`

### 3.3 Indexes

| Index | Type | Purpose |
|-------|------|---------|
| `{ name: 'text', itemId: 'text', universityID: 'text', description: 'text', supplier: 'text' }` | Text | Full-text search |
| `{ itemId: 1 }` | Single | Primary sort/lookup |
| `{ name: 1 }` | Single | Sort by name |
| `{ status: 1 }` | Single | Filter by status |
| `{ category: 1 }` | Single | Filter by category |
| `{ location: 1 }` | Single | Filter by location |
| `{ price: 1 }` | Single | Sort by price |
| `{ purchaseDate: 1 }` | Single | Sort by purchase date |
| `{ warrantyEnd: 1 }` | Single | Sort/filter warranty |
| `{ lastUpdate: -1 }` | Single (desc) | Sort by last update |
| `{ vendor: 1 }` | Single | Filter by vendor |
| `{ supplier: 1 }` | Single | Filter by supplier |

### 3.4 API Endpoints (Item)

| Method | Endpoint | Auth | Roles | Request Body / FormData | Response |
|--------|----------|:----:|-------|------------------------|----------|
| GET | `/api/items` | ✅ | admin, operator | — | `{ items[], total, page, pageSize }` |
| GET | `/api/items/available` | ✅ | any | — | `{ items[], total, page, pageSize }` |
| GET | `/api/items/lent-out` | ✅ | admin, operator | — | `{ items[], total, page, pageSize }` |
| POST | `/api/items/import` | ✅ | admin, operator | FormData: `file` (xlsx) | `{ imported, items[] }` |
| GET | `/api/items/:id` | ✅ | any | — | `{ item }` |
| GET | `/api/items/:id/components` | ✅ | any | — | `{ components[] }` |
| GET | `/api/items/:id/invoice` | ✅ | admin, operator | — | File download |
| POST | `/api/items` | ✅ | admin, operator | JSON or FormData (with `invoiceFile`) | `{ item }` |
| PUT | `/api/items/:id` | ✅ | admin, operator | JSON or FormData (with `invoiceFile`) | `{ item }` |
| DELETE | `/api/items/:id` | ✅ | admin, operator | — | `{ message }` |

### 3.5 Query Parameters (GET `/api/items`)

| Param | Type | Description |
|-------|------|-------------|
| `status` | String | Filter by status enum |
| `type` | String | Filter by type enum |
| `category` | String | Filter by category |
| `location` | String | Filter by location |
| `vendor` | String | Filter by vendor |
| `supplier` | String | Filter by supplier |
| `warrantyEnd` | String | Filter items with warranty ending before this date |
| `search` | String | Regex search across itemId, name, universityID, description, supplier |
| `page` | Number | Page number (default: 1) |
| `pageSize` | Number | Items per page (default: 10) |
| `sortBy` | String | Sort field (default: `itemId`) |
| `sortDir` | String | `asc` or `desc` (default: `asc`) |

### 3.6 Query Parameters (GET `/api/items/lent-out`)

| Param | Type | Description |
|-------|------|-------------|
| `search` | String | Regex search |
| `category` | String | Filter by category |
| `location` | String | Filter by location |
| `type` | String | Filter by type |
| `vendor` | String | Filter by vendor |
| `borrowerId` | String | Filter by `currentBorrower` |
| `borrowerName` | String | *(accepted but not implemented in controller)* |
| `year` | String | Filter `warrantyEnd` by year regex |
| `page` / `pageSize` | Number | Pagination |
| `sortBy` / `sortDir` | String | Sorting |

### 3.7 Create / Update Request Body Fields

| Field | Type | Required (Create) | Notes |
|-------|------|:-----------------:|-------|
| `name` | String | ✅ (form) | — |
| `universityID` | String | ✅ (form) | — |
| `type` | String | — | Default: `Hardware` |
| `category` | String | — | Default: `Computer` (frontend), `Other` (backend) |
| `status` | String | — | Default: `Available` |
| `location` | String | — | Default: `Lab A` (frontend) |
| `description` | String | — | Textarea |
| `motherID` | String | — | For components only |
| `supplier` | String | — | — |
| `invoiceNumber` | String | — | — |
| `warrantyStartDate` | String | — | Date input `<input type="date">` |
| `warrantyEnd` | String | — | Date input `<input type="date">` |
| `departmentID` | String | — | Default: `COMP` (frontend) |
| `invoiceFile` | File | — | FormData multipart upload |
| `fixedComponents` | String/Array | — | JSON string or comma-separated, parsed by controller |

> **Note:** Fields like `foRequestID`, `orderID`, `supplierStatus`, `projectLinked`, `fundingSource`, `warrantyOnsite`, `warrantyVendor`, `vendor`, `price` exist in the model and seed data but are **NOT present in the frontend create/edit form**. They can only be set via Excel import or direct API call.

---

## 4. Collection: BorrowRequest

> **Mongoose Model:** `backend/models/BorrowRequest.js` (80 lines)  
> **Controller:** `backend/controllers/borrowRequestController.js` (516 lines)  
> **Status:** ⚠️ Minor validation improvements recommended

### 4.1 Field Definitions

| # | Field Name | Mongoose Type | Required | Unique | Default | Validation | Description |
|---|-----------|---------------|:--------:|:------:|---------|------------|-------------|
| 1 | `requestId` | String | ✅ | ✅ | — | trim | Auto-generated: `REQ-XXX` via Counter |
| 2 | `itemID` | String | ✅ | — | — | trim | Ref → `Item.itemId` |
| 3 | `borrowerID` | String | ✅ | — | — | trim | Ref → `User.userId` (auto-set from JWT) |
| 4 | `status` | String | — | — | `'Pending'` | enum: `['Pending', 'Approved', 'Rejected', 'Returned']` | Request lifecycle |
| 5 | `requestDate` | Date | — | — | `Date.now` | — | When the request was created |
| 6 | `approvalDate` | Date | — | — | `null` | — | When approved/rejected |
| 7 | `approvedBy` | String | — | — | `null` | — | Ref → `User.userId` (admin/operator) |
| 8 | `returnDate` | Date | — | — | `null` | — | Expected return date (set during approval) |
| 9 | `returnedDate` | Date | — | — | `null` | — | Actual return date |
| 10 | `reason` | String | — | — | `''` | trim | Why the user needs the item |
| 11 | `notes` | String | — | — | `''` | trim | Admin/operator notes or rejection reason |
| 12 | `parentRequestId` | String | — | — | `null` | — | Self-reference. Links child component requests to parent. `null` = top-level |
| 13 | `attachments` | [Object] | — | — | `[]` | — | Array of `{ filename, mimetype, size, path }` |
| 14 | `createdAt` | Date | auto | — | auto | — | Mongoose `timestamps: true` |
| 15 | `updatedAt` | Date | auto | — | auto | — | Mongoose `timestamps: true` |

### 4.2 Request Lifecycle State Machine

```
                    ┌──────────────┐
                    │              │
   User creates → [ Pending ] ──────→ [ Rejected ]
                    │                     (terminal)
                    │
                    ▼
               [ Approved ] ──────→ [ Returned ]
                                     (terminal)
```

| Transition | Triggered By | Side Effects |
|-----------|-------------|--------------|
| → Pending | `POST /api/borrow-requests` (user) | Creates child requests for `fixedComponents` |
| Pending → Approved | `PUT /:id/approve` (admin/operator) | Sets `approvalDate`, `approvedBy`, `returnDate`. Updates Item `status` → `In-use`, `currentBorrower`. Cascades to children |
| Pending → Rejected | `PUT /:id/reject` (admin/operator) | Sets `notes` = rejection reason, `approvalDate`, `approvedBy`. Cascades to children |
| Approved → Returned | `PUT /:id/return` (any authenticated) | Sets `returnedDate`. Resets Item `status` → `Available`, `currentBorrower` → `null`. Cascades to children |

### 4.3 Populated Fields (Virtual, added by controller)

These fields are NOT stored in the database. They are populated at response time by batch-looking up User and Item collections:

| Virtual Field | Source | Description |
|---------------|--------|-------------|
| `itemName` | `Item.name` where `Item.itemId === request.itemID` | Display name of the borrowed item |
| `borrowerName` | `User.name` where `User.userId === request.borrowerID` | Display name of the borrower |
| `id` | Copy of `requestId` | Frontend compatibility alias |

### 4.4 Indexes

| Index | Type | Purpose |
|-------|------|---------|
| `{ status: 1 }` | Single | Filter by status |
| `{ borrowerID: 1 }` | Single | My requests lookup |
| `{ itemID: 1 }` | Single | Requests for an item |
| `{ parentRequestId: 1 }` | Single | Find child requests |
| `{ requestDate: -1 }` | Single (desc) | Sort by request date |
| `{ approvalDate: -1 }` | Single (desc) | Sort by approval date |
| `{ returnDate: -1 }` | Single (desc) | Sort by expected return |
| `{ returnedDate: -1 }` | Single (desc) | Sort by actual return |

### 4.5 API Endpoints (BorrowRequest)

| Method | Endpoint | Auth | Roles | Request Body | Response |
|--------|----------|:----:|-------|-------------|----------|
| GET | `/api/borrow-requests` | ✅ | admin, operator | — | `{ requests[], total, page, pageSize }` |
| GET | `/api/borrow-requests/pending` | ✅ | admin, operator | — | `{ requests[], total, count }` |
| GET | `/api/borrow-requests/my` | ✅ | any | — | `{ requests[], total, page, pageSize }` |
| GET | `/api/borrow-requests/:id` | ✅ | any (own) / admin,operator (all) | — | `{ request }` |
| POST | `/api/borrow-requests` | ✅ | user | `{ itemID, reason }` or FormData with `attachments` | `{ request, childRequests[], componentCount }` |
| PUT | `/api/borrow-requests/:id/approve` | ✅ | admin, operator | `{ returnDate, location?, remark? }` | `{ request }` |
| PUT | `/api/borrow-requests/:id/reject` | ✅ | admin, operator | `{ reason }` | `{ request }` |
| PUT | `/api/borrow-requests/:id/return` | ✅ | any (own) / admin,operator | `{ location? }` | `{ request }` |
| POST | `/api/borrow-requests/:id/attachments` | ✅ | any | FormData: `attachments[]` (max 10) | `{ files[] }` |

### 4.6 Query Parameters (GET `/api/borrow-requests`)

| Param | Type | Description |
|-------|------|-------------|
| `status` | String | Filter by status enum |
| `borrowerId` | String | Filter by borrower |
| `search` | String | Regex search across requestId, borrowerID, itemID |
| `requestDateFrom` / `requestDateTo` | Date string | Date range filter |
| `approvalDateFrom` / `approvalDateTo` | Date string | Date range filter |
| `returnDateFrom` / `returnDateTo` | Date string | Date range filter |
| `returnedDateFrom` / `returnedDateTo` | Date string | Date range filter |
| `page` | Number | Page number (default: 1) |
| `pageSize` | Number | Items per page (default: 10) |
| `sortBy` | String | Sort field (default: `requestDate`) |
| `sortDir` | String | `asc` or `desc` (default: `desc`) |

---

## 5. Collection: AuditLog

> **Mongoose Model:** `backend/models/AuditLog.js` (50 lines)  
> **Controller:** `backend/controllers/auditLogController.js` (50 lines)  
> **Status:** ⚠️ `action` field lacks enum constraint

### 5.1 Field Definitions

| # | Field Name | Mongoose Type | Required | Unique | Default | Validation | Description |
|---|-----------|---------------|:--------:|:------:|---------|------------|-------------|
| 1 | `logId` | String | ✅ | ✅ | — | trim | Auto-generated: `LOG-XXX` via Counter |
| 2 | `timestamp` | Date | — | — | `Date.now` | — | When the action occurred |
| 3 | `userID` | String | ✅ | — | — | trim | Ref → `User.userId` (who performed the action) |
| 4 | `action` | String | ✅ | — | — | **None (should be enum)** | Action type code |
| 5 | `details` | String | — | — | `''` | trim | Human-readable description |
| 6 | `affectedItemID` | String | — | — | `null` | — | Ref → `Item.itemId` or `User.userId` (depends on action) |
| 7 | `oldValue` | String | — | — | `null` | — | Previous value (for status/field changes) |
| 8 | `newValue` | String | — | — | `null` | — | New value (for status/field changes) |
| 9 | `createdAt` | Date | auto | — | auto | — | Mongoose `timestamps: true` |
| 10 | `updatedAt` | Date | auto | — | auto | — | Mongoose `timestamps: true` |

### 5.2 Action Types (Used in Codebase)

These are the action strings currently produced by controllers. They should be defined as an enum:

| Action Code | Triggered By | affectedItemID | oldValue | newValue |
|-------------|-------------|----------------|----------|----------|
| `LOGIN` | authController | `null` | `null` | `null` |
| `LOGOUT` | authController | `null` | `null` | `null` |
| `ITEM_ADDED` | itemController.createItem | `Item.itemId` | `null` | `null` |
| `ITEM_STATUS_CHANGE` | itemController.updateItem | `Item.itemId` | old status | new status |
| `ITEM_DELETED` | itemController.deleteItem | `Item.itemId` | `null` | `null` |
| `ITEM_RETURNED` | borrowRequestController.returnRequest | `Item.itemId` | `null` | `null` |
| `INVENTORY_ITEM_ADDED` | itemController.importItems | `Item.itemId` | `null` | `null` |
| `BORROW_REQUEST_CREATED` | borrowRequestController.createRequest | `Item.itemId` | `null` | `null` |
| `BORROW_REQUEST_APPROVED` | borrowRequestController.approveRequest | `Item.itemId` | `null` | `null` |
| `BORROW_REQUEST_REJECTED` | borrowRequestController.rejectRequest | `Item.itemId` | `null` | `null` |
| `USER_CREATED` | userController.createUser | `User.userId` | `null` | `null` |
| `USER_UPDATED` | userController.updateUser | `User.userId` | `null` | `null` |
| `USER_DELETED` | userController.deleteUser | `User.userId` | `null` | `null` |
| `USER_ACTIVATED` | userController.toggleUserStatus | `User.userId` | `null` | `null` |
| `USER_DEACTIVATED` | userController.toggleUserStatus | `User.userId` | `null` | `null` |

### 5.3 Indexes

| Index | Type | Purpose |
|-------|------|---------|
| `{ timestamp: -1 }` | Single (desc) | Sort by time |
| `{ action: 1 }` | Single | Filter by action type |
| `{ userID: 1 }` | Single | Filter by user |

### 5.4 API Endpoints (AuditLog)

| Method | Endpoint | Auth | Roles | Request Body | Response |
|--------|----------|:----:|-------|-------------|----------|
| GET | `/api/audit-logs` | ✅ | admin, operator | — | `{ logs[], total, page, pageSize }` |

> AuditLog entries are **never created via API**. They are created internally by controllers via the `addAuditLog()` utility.

### 5.5 Query Parameters (GET `/api/audit-logs`)

| Param | Type | Description |
|-------|------|-------------|
| `action` | String | Filter by action type |
| `search` | String | Regex search across userID, details, affectedItemID |
| `page` | Number | Page number (default: 1) |
| `pageSize` | Number | Items per page (default: 1000 from frontend) |

---

## 6. Collection: Counter (Internal)

> **Mongoose Model:** `backend/models/Counter.js` (9 lines)  
> **Status:** ✅ No changes needed

### 6.1 Field Definitions

| # | Field Name | Mongoose Type | Required | Unique | Default | Description |
|---|-----------|---------------|:--------:|:------:|---------|-------------|
| 1 | `_id` | String | ✅ | ✅ (pk) | — | Counter name: `'itemId'`, `'requestId'`, `'logId'` |
| 2 | `seq` | Number | — | — | `0` | Current sequence number |

### 6.2 Usage Pattern

```javascript
const counter = await Counter.findByIdAndUpdate(
  { _id: 'itemId' },
  { $inc: { seq: 1 } },
  { new: true, upsert: true }
);
return `INV-${String(counter.seq).padStart(3, '0')}`;
```

### 6.3 Current Seed Values

| Counter _id | Seed seq | Next Generated ID |
|-------------|----------|-------------------|
| `itemId` | 12 | `INV-013` |
| `requestId` | 16 | `REQ-017` |
| `logId` | 18 | `LOG-019` |

---

## 7. API Endpoint Reference

### 7.1 Authentication Endpoints

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| POST | `/api/auth/login` | — | Login with `{ username, password }` → JWT token |
| POST | `/api/auth/logout` | ✅ | Logout (clears session) |
| GET | `/api/auth/me` | ✅ | Get current authenticated user |

### 7.2 Stats Endpoint

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| GET | `/api/stats` | ✅ | admin, operator | Dashboard statistics |

**Response Fields:**
```json
{
  "totalItems": 12,
  "availableItems": 7,
  "lentOutItems": 4,
  "pendingRequests": 4,
  "returnedRequests": 3,
  "approvedRequests": 6,
  "rejectedRequests": 2
}
```

### 7.3 Complete Route Summary

| # | Method | Path | Roles | Controller |
|---|--------|------|-------|-----------|
| 1 | POST | `/api/auth/login` | public | authController.login |
| 2 | POST | `/api/auth/logout` | any | authController.logout |
| 3 | GET | `/api/auth/me` | any | authController.getMe |
| 4 | GET | `/api/items` | admin, operator | itemController.getAllItems |
| 5 | GET | `/api/items/available` | any | itemController.getAvailableItems |
| 6 | GET | `/api/items/lent-out` | admin, operator | itemController.getLentOutItems |
| 7 | POST | `/api/items/import` | admin, operator | itemController.importItems |
| 8 | POST | `/api/items` | admin, operator | itemController.createItem |
| 9 | GET | `/api/items/:id` | any | itemController.getItemById |
| 10 | GET | `/api/items/:id/components` | any | itemController.getItemComponents |
| 11 | GET | `/api/items/:id/invoice` | admin, operator | itemController.getInvoice |
| 12 | PUT | `/api/items/:id` | admin, operator | itemController.updateItem |
| 13 | DELETE | `/api/items/:id` | admin, operator | itemController.deleteItem |
| 14 | GET | `/api/borrow-requests` | admin, operator | borrowRequestController.getAllRequests |
| 15 | GET | `/api/borrow-requests/pending` | admin, operator | borrowRequestController.getPendingRequests |
| 16 | GET | `/api/borrow-requests/my` | any | borrowRequestController.getMyRequests |
| 17 | POST | `/api/borrow-requests` | user | borrowRequestController.createRequest |
| 18 | GET | `/api/borrow-requests/:id` | any (own) | borrowRequestController.getRequestById |
| 19 | PUT | `/api/borrow-requests/:id/approve` | admin, operator | borrowRequestController.approveRequest |
| 20 | PUT | `/api/borrow-requests/:id/reject` | admin, operator | borrowRequestController.rejectRequest |
| 21 | PUT | `/api/borrow-requests/:id/return` | any (own) | borrowRequestController.returnRequest |
| 22 | POST | `/api/borrow-requests/:id/attachments` | any | borrowRequestController.uploadAttachments |
| 23 | GET | `/api/audit-logs` | admin, operator | auditLogController.getAllLogs |
| 24 | GET | `/api/stats` | admin, operator | statsController.getStats |
| 25 | GET | `/api/users` | admin, operator | userController.getAllUsers |
| 26 | POST | `/api/users` | admin | userController.createUser |
| 27 | GET | `/api/users/search/:query` | admin, operator | userController.searchUsers |
| 28 | GET | `/api/users/:id` | any | userController.getUserById |
| 29 | PUT | `/api/users/:id` | any (own) / admin | userController.updateUser |
| 30 | DELETE | `/api/users/:id` | admin | userController.deleteUser |
| 31 | PUT | `/api/users/:id/status` | admin | userController.toggleUserStatus |

---

## 8. Entity Relationships & ER Diagram

### 8.1 Relationship Map

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   User (1) ──────────< (N) BorrowRequest >────────── (1) Item   │
│     │                         │                          │      │
│     │ userId                  │ parentRequestId          │      │
│     │                         ▼                          │      │
│     │                  BorrowRequest (child)             │      │
│     │                  (component auto-requests)         │      │
│     │                                                    │      │
│     └─────────< (N) AuditLog >───────────── (0..1) Item │      │
│       userID               affectedItemID                │      │
│                                                          │      │
│                    Item (parent)                          │      │
│                      │  fixedComponents: [itemId]        │      │
│                      │  motherID: groupId                │      │
│                      ▼                                   │      │
│                    Item (component children)              │      │
│                                                          │      │
│   Counter ─── Auto-ID generator for Item, Request, Log   │      │
│                                                          │      │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Foreign Key References (Logical, not enforced by MongoDB)

| From Collection | Field | To Collection | To Field | Enforced? |
|----------------|-------|--------------|----------|:---------:|
| BorrowRequest | `itemID` | Item | `itemId` | ❌ (manual check in controller) |
| BorrowRequest | `borrowerID` | User | `userId` | ❌ (set from JWT `req.user.userId`) |
| BorrowRequest | `approvedBy` | User | `userId` | ❌ (set from JWT) |
| BorrowRequest | `parentRequestId` | BorrowRequest | `requestId` | ❌ (self-reference) |
| Item | `currentBorrower` | User | `userId` | ❌ (set by controller) |
| Item | `fixedComponents[i]` | Item | `itemId` | ❌ (manual) |
| AuditLog | `userID` | User | `userId` | ❌ |
| AuditLog | `affectedItemID` | Item or User | `itemId` or `userId` | ❌ (polymorphic, unvalidated) |

---

## 9. Enum & Constant Definitions

### 9.1 User Roles

| Value | Access Level | Can Do |
|-------|-------------|--------|
| `admin` | Full | Everything: CRUD users, items, requests. Manage roles. |
| `operator` | Staff | Manage items, approve/reject requests. Cannot manage users. |
| `user` | Student/Basic | Browse available items, create borrow requests, return own items. |

### 9.2 Item Types

| Value | Description |
|-------|-------------|
| `Hardware` | Physical device (laptop, monitor, printer) |
| `Software` | Software license or digital asset |
| `Component` | Part of a larger item (RAM, SSD, etc.) |

### 9.3 Item Statuses

| Value | Description | Transition Rules |
|-------|-------------|-----------------|
| `Available` | Ready to borrow | Initial state. Set on return. |
| `In-use` | Currently borrowed | Set when request approved. Cannot delete. |
| `Missing` | Cannot be located | Manual status set by admin. |
| `Dispose` | Marked for disposal | Manual status set by admin. |
| `Not Available` | Temporarily unavailable | Manual status set by admin. |
| `Transferred` | Transferred to another department | Manual status set by admin. |

### 9.4 BorrowRequest Statuses

| Value | Description |
|-------|-------------|
| `Pending` | Awaiting admin/operator decision |
| `Approved` | Request approved, item lent out |
| `Rejected` | Request denied |
| `Returned` | Item returned successfully |

### 9.5 AuditLog Actions (Proposed Enum)

```javascript
const AUDIT_ACTIONS = [
  'LOGIN',
  'LOGOUT',
  'ITEM_ADDED',
  'ITEM_STATUS_CHANGE',
  'ITEM_DELETED',
  'ITEM_RETURNED',
  'INVENTORY_ITEM_ADDED',      // Import via Excel
  'INVENTORY_ITEM_UPDATED',    // Defined in seed but not in controller
  'INVENTORY_ITEM_DELETED',    // Defined in seed but not in controller
  'BORROW_REQUEST_CREATED',
  'BORROW_REQUEST_APPROVED',
  'BORROW_REQUEST_REJECTED',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_DELETED',
  'USER_ACTIVATED',
  'USER_DEACTIVATED'
];
```

### 9.6 Item Categories (Frontend Defaults)

```javascript
const itemCategories = ["Computer", "Display", "Memory", "Storage", "Peripherals", "Other"];
```

> Currently free-text in the model. Users can add custom categories via `DropdownWithOther` component. Custom values are persisted in `localStorage`.

### 9.7 Locations (Frontend Defaults)

```javascript
const defaultLocations = ["Lab A", "Lab B", "Lab C", "Office", "Storage Room", "Shelf 1", "Shelf 2", "Other"];
```

> Currently free-text. Users can add custom locations via `DropdownWithOther` component.

---

## 10. Index Strategy

### 10.1 Current Index Summary

| Collection | # of Indexes | Text Index | Notes |
|------------|:------------:|:----------:|-------|
| User | 8 (including text) | ✅ | Well-indexed |
| Item | 13 (including text) | ✅ | Heavy indexing for Cosmos DB compat |
| BorrowRequest | 8 | — | No text index |
| AuditLog | 3 | — | Minimal |
| Counter | 1 (_id only) | — | Sufficient |

### 10.2 Index Recommendations

| Collection | Recommended Index | Reason |
|------------|-------------------|--------|
| BorrowRequest | `{ borrowerID: 1, status: 1 }` | Compound index for "my pending requests" query |
| BorrowRequest | `{ parentRequestId: 1, status: 1 }` | Compound index for cascading approve/reject |
| AuditLog | `{ affectedItemID: 1 }` | Missing — needed for `getLogsByItem` search |
| AuditLog | `{ timestamp: -1, action: 1 }` | Compound for filtered timeline queries |

---

## 11. Gap Analysis & Recommendations

### 11.1 Type Corrections Needed

| Collection | Field | Current Type | Recommended Type | Impact |
|------------|-------|-------------|-----------------|--------|
| Item | `purchaseDate` | String | **Date** | Date range queries, sorting accuracy |
| Item | `warrantyEnd` | String | **Date** | Date comparisons, warranty alerts |
| Item | `warrantyStartDate` | String | **Date** | Consistency with other date fields |
| Item | `lastUpdate` | String | **Date** | Auto-managed by Mongoose `updatedAt` — consider removing |

> **Migration Note:** Changing String → Date requires a migration script to convert existing data. The `warrantyEnd` filter in `getAllItems` currently uses string comparison (`$lte`), which works lexicographically for ISO date strings but will need to change to proper Date comparison.

### 11.2 Validation Gaps

| Collection | Field | Current | Recommended | Priority |
|------------|-------|---------|-------------|:--------:|
| Item | `price` | No min | Add `min: 0` | 🟡 Medium |
| Item | `type` | Has enum, no required | Add `required: true` | 🟢 Low |
| Item | `status` | Has enum, no required | Add `required: true` | 🟢 Low |
| BorrowRequest | `reason` | Optional (default `''`) | Add `required: true` | 🟡 Medium |
| AuditLog | `action` | No enum constraint | Add `enum: AUDIT_ACTIONS` | 🔴 High |
| Item | `universityID` | No format validation | Consider regex pattern | 🟢 Low |

### 11.3 Missing Form Fields (In Model/Seed but NOT in Frontend Form)

These fields exist in the Item model and are populated in seed data, but the frontend create/edit form does not include them:

| Field | In Model | In Seed | In Form | Decision |
|-------|:--------:|:-------:|:-------:|----------|
| `foRequestID` | ✅ | ✅ | ❌ | **Add to form** — useful for procurement tracking |
| `orderID` | ✅ | ✅ | ❌ | **Add to form** — useful for procurement tracking |
| `supplierStatus` | ✅ | ✅ | ❌ | **Add to form** — useful for delivery tracking |
| `projectLinked` | ✅ | ✅ | ❌ | **Add to form** — useful for project-based budgeting |
| `fundingSource` | ✅ | ✅ | ❌ | **Add to form** — useful for financial reporting |
| `warrantyOnsite` | ✅ | ✅ | ❌ | **Add to form** — useful for warranty management |
| `warrantyVendor` | ✅ | ✅ | ❌ | **Add to form** — useful for warranty claims |
| `vendor` | ✅ | ✅ | ❌ | **Add to form** — already used as filter in ManageItemsPage |
| `price` | ✅ | ✅ | ❌ | **Add to form** — important for asset accounting |

### 11.4 Inconsistencies & Issues

| # | Issue | Details | Fix |
|---|-------|---------|-----|
| 1 | `motherID` ambiguity | In seed data, `motherID` is a group ID (`COMP-LAPTOP-001`), not a parent `itemId`. But `fixedComponents` in the parent stores child `itemId` values. These are two independent linkage mechanisms. | Standardize: either use `motherID` as ref to parent `itemId`, or remove and rely only on `fixedComponents` |
| 2 | Duplicate audit action names | `ITEM_ADDED` (create) vs `INVENTORY_ITEM_ADDED` (import) serve similar purposes | Unify to a single action code, use `details` to distinguish source |
| 3 | `addAuditLog` inconsistent API | itemController calls `addAuditLog(userId, action, details, itemId)` with positional args, but userController calls `addAuditLog({ action, details, userID, affectedItemID })` with object | Standardize to one calling convention |
| 4 | `borrowerName` filter param | `getLentOutItems` accepts `borrowerName` in query but never uses it in the filter | Either implement the filter or remove the param |
| 5 | `lastUpdate` vs `updatedAt` | Both exist — `lastUpdate` is manually set as ISO date string, `updatedAt` is auto-set by Mongoose | Consider removing `lastUpdate` and using `updatedAt` only |
| 6 | AuditLog `affectedItemID` polymorphic | For item actions it stores `Item.itemId`, for user actions it stores `User.userId`. No way to distinguish. | Add `affectedEntityType: enum ['Item', 'User', 'BorrowRequest']` field |

### 11.5 Potential New Fields

| Collection | Proposed Field | Type | Purpose |
|------------|---------------|------|---------|
| BorrowRequest | `rejectionReason` | String | Separate from `notes` for clearer rejection handling |
| AuditLog | `affectedEntityType` | String (enum) | Distinguish what `affectedItemID` refers to |
| AuditLog | `ipAddress` | String | Security auditing |
| AuditLog | `affectedRequestID` | String | Direct link to borrow request for request-related actions |
| Item | `quantity` | Number | Support consumable items (currently assumed 1:1) |
| Item | `condition` | String (enum) | Track physical condition: `New`, `Good`, `Fair`, `Poor`, `Damaged` |
| Item | `serialNumber` | String | Manufacturer serial number (separate from universityID) |

---

## 12. Migration Checklist

> Implementation order for the next development phase.

### Phase 1 — Validation & Type Fixes (Non-Breaking)

- [ ] Add `enum` constraint on AuditLog `action` field
- [ ] Add `min: 0` validation on Item `price`
- [ ] Add `required: true` on Item `type` and `status`
- [ ] Add `required: true` on BorrowRequest `reason`
- [ ] Standardize `addAuditLog()` calling convention across all controllers

### Phase 2 — Type Migrations (Breaking, needs data migration)

- [ ] Write migration script to convert Item date fields from String → Date:
  - `purchaseDate`
  - `warrantyEnd`
  - `warrantyStartDate`
  - `lastUpdate` (or remove in favor of `updatedAt`)
- [ ] Update `itemController.getAllItems` warranty filter from string `$lte` to Date comparison
- [ ] Update frontend date parsing where needed
- [ ] Update Excel import to parse dates correctly

### Phase 3 — Schema Enhancements

- [ ] Add missing form fields to ManageItemsPage frontend:
  - `vendor`, `price`, `foRequestID`, `orderID`, `supplierStatus`
  - `projectLinked`, `fundingSource`, `warrantyOnsite`, `warrantyVendor`
- [ ] Resolve `motherID` vs `fixedComponents` relationship ambiguity
- [ ] Add `affectedEntityType` to AuditLog schema
- [ ] Consider adding `rejectionReason` to BorrowRequest
- [ ] Add compound indexes for frequently combined queries

### Phase 4 — Optional Enhancements

- [ ] Add `condition`, `serialNumber`, `quantity` fields to Item
- [ ] Add `ipAddress`, `affectedRequestID` to AuditLog
- [ ] Implement `borrowerName` filter in getLentOutItems controller
- [ ] Add enum/predefined list for `category`, `location`, `supplierStatus`, `fundingSource`

---

> **End of Document**  
> This schema plan should be reviewed by the team before any implementation begins.  
> For the existing `DATA_FIELD_PLAN.md` at project root, refer to it as the v1.0 draft that this document supersedes.
