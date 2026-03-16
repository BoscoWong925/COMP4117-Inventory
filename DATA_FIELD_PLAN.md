# COMP4117 Inventory System — Data Field Entry Plan

> **Version:** 1.0  
> **Date:** 2026-03-03  
> **Purpose:** Define all data fields across every collection (table), including types, constraints, and validation rules.

---

## 1. User

| Type | Name | isRequired | isUnique | Reminders |
|------|------|:----------:|:--------:|-----------|
| User | user_id | ✅ | ✅ | Primary key (UUID or auto-increment) |
| User | name | ✅ | | Display name |
| User | email | ✅ | ✅ | University email preferred |
| User | role | ✅ | | Enum: `User` / `Operator` / `Admin` |
| User | is_active | ✅ | | Boolean, default `true` |
| User | created_at | ✅ | | Timestamp |
| User | updated_at | ✅ | | Timestamp (auto) |

### Current Implementation vs Plan

| Field | Current Model | Plan | Gap |
|-------|--------------|------|-----|
| user_id | `userId` (String, required, unique) | ✅ Match | — |
| username | exists (String, required, unique, lowercase) | ❌ Not in plan | **Decide:** keep as login identifier? |
| password | exists (String, required, minlength 6, bcrypt hashed) | ❌ Not in plan | **Decide:** keep (needed for auth) |
| name | `name` (String, required) | ✅ Match | — |
| email | `email` (String, required, lowercase) | ✅ Match, but **no uniqueness constraint** in current model | Add `unique: true` |
| role | `role` (String, required, enum) | ✅ Match | — |
| department | exists (String, required) | ❌ Not in plan | **Decide:** keep? |
| is_active | ❌ Missing | ✅ In plan | **Add** `is_active` field |
| created_at | `timestamps: true` (auto) | ✅ Match | — |
| updated_at | `timestamps: true` (auto) | ✅ Match | — |

### Action Items — User
- [ ] Add `is_active` Boolean field (default `true`)
- [ ] Add `unique: true` to `email`
- [ ] Add email format validation (regex)
- [ ] Decide whether to keep `username` and `department` (not in plan but currently used)
- [ ] Add password field to plan (required for authentication)

---

## 2. Item (Inventory)

| Type | Name | isRequired | isUnique | Reminders |
|------|------|:----------:|:--------:|-----------|
| Item | item_id | ✅ | ✅ | Auto-generated: `INV-XXX` |
| Item | name | ✅ | | Item display name / description |
| Item | university_id | ✅ | | University asset tag number |
| Item | type | ✅ | | Enum: `Hardware` / `Software` / `Component` |
| Item | category | | | e.g., Computer, Display, Peripherals, Memory, Storage. Default: `Other` |
| Item | status | ✅ | | Enum: `Available` / `In-use` / `Missing` / `Dispose` / `Not Available` / `Transferred` |
| Item | location | | | Physical location (e.g., Lab A, Office, Storage Room) |
| Item | current_borrower | | | Reference to `User.user_id`, null when available |
| Item | description | | | Free text description |
| Item | mother_id | | | Parent item ID for component grouping (null if standalone) |
| Item | fixed_components | | | Array of child item IDs `[String]` |
| Item | fo_request_id | | | Financial Office request reference |
| Item | order_id | | | Purchase order reference |
| Item | supplier | | | Supplier / vendor company name |
| Item | invoice_number | | | Invoice reference number |
| Item | supplier_status | | | e.g., Delivered, Pending, Cancelled |
| Item | project_linked | | | Associated project name or code |
| Item | funding_source | | | Budget source (e.g., Department Budget, Research Fund) |
| Item | purchase_date | | | Date of purchase. **Should be Date type, not String** |
| Item | warranty_start_date | | | Warranty start. **Should be Date type** |
| Item | warranty_end | | | Warranty expiry. **Should be Date type** |
| Item | warranty_onsite | | | Boolean: onsite warranty? Default `false` |
| Item | warranty_vendor | | | Warranty service provider |
| Item | vendor | | | Sales vendor (may differ from supplier) |
| Item | price | | | Number, min `0` |
| Item | department_id | | | Owning department |
| Item | invoice_file | | | Embedded: `{ filename, mimetype, size, path }` |
| Item | last_update | | | Last manual update date |
| Item | created_at | ✅ | | Timestamp (auto) |
| Item | updated_at | ✅ | | Timestamp (auto) |

### Action Items — Item
- [ ] Change `purchaseDate`, `warrantyEnd`, `warrantyStartDate` from String to **Date** type
- [ ] Add `min: 0` validation on `price`
- [ ] Add `required: true` to `type` and `status` (currently have defaults but not required)
- [ ] Consider adding format validation for `universityID`
- [ ] Consider adding enum for `supplierStatus` (Delivered, Pending, Cancelled, etc.)
- [ ] Consider adding enum for `fundingSource` and `category` or keep free-text with suggestions

---

## 3. BorrowRequest

| Type | Name | isRequired | isUnique | Reminders |
|------|------|:----------:|:--------:|-----------|
| BorrowRequest | request_id | ✅ | ✅ | Auto-generated: `REQ-XXX` |
| BorrowRequest | item_id | ✅ | | Reference to `Item.item_id` |
| BorrowRequest | borrower_id | ✅ | | Reference to `User.user_id` |
| BorrowRequest | status | ✅ | | Enum: `Pending` / `Approved` / `Rejected` / `Returned` |
| BorrowRequest | request_date | ✅ | | Date, auto-set on creation |
| BorrowRequest | approval_date | | | Date, set when approved/rejected |
| BorrowRequest | approved_by | | | Reference to `User.user_id` (admin/operator who approved) |
| BorrowRequest | return_date | | | Expected return date (set during approval) |
| BorrowRequest | returned_date | | | Actual return date |
| BorrowRequest | reason | ✅ | | Why the user needs the item |
| BorrowRequest | notes | | | Admin/operator notes |
| BorrowRequest | parent_request_id | | | Links child component requests to parent. Null if top-level |
| BorrowRequest | attachments | | | Array of `{ filename, mimetype, size, path }` |
| BorrowRequest | created_at | ✅ | | Timestamp (auto) |
| BorrowRequest | updated_at | ✅ | | Timestamp (auto) |

### Action Items — BorrowRequest
- [ ] Add `required: true` to `reason` (currently optional with default `''`)
- [ ] Add validation: item must exist and be `Available` before creating a request
- [ ] Add validation: `return_date` must be in the future
- [ ] Consider adding `rejection_reason` field (separate from `notes`)

---

## 4. AuditLog

| Type | Name | isRequired | isUnique | Reminders |
|------|------|:----------:|:--------:|-----------|
| AuditLog | log_id | ✅ | ✅ | Auto-generated: `LOG-XXX` |
| AuditLog | timestamp | ✅ | | Date, auto-set on creation |
| AuditLog | user_id | ✅ | | Reference to `User.user_id` (who performed the action) |
| AuditLog | action | ✅ | | Enum: `LOGIN` / `LOGOUT` / `ITEM_STATUS_CHANGE` / `ITEM_RETURNED` / `INVENTORY_ITEM_ADDED` / `INVENTORY_ITEM_UPDATED` / `INVENTORY_ITEM_DELETED` / `BORROW_REQUEST_CREATED` / `BORROW_REQUEST_APPROVED` / `BORROW_REQUEST_REJECTED` |
| AuditLog | details | | | Human-readable description of what happened |
| AuditLog | affected_item_id | | | Reference to `Item.item_id` (null for login/logout) |
| AuditLog | old_value | | | Previous value (for status changes) |
| AuditLog | new_value | | | New value (for status changes) |
| AuditLog | created_at | ✅ | | Timestamp (auto) |
| AuditLog | updated_at | ✅ | | Timestamp (auto) |

### Action Items — AuditLog
- [ ] Add enum constraint on `action` field (currently accepts any string)
- [ ] Consider adding `ip_address` field for security auditing
- [ ] Consider adding `affected_request_id` for borrow request actions

---

## 5. Counter (Internal)

| Type | Name | isRequired | isUnique | Reminders |
|------|------|:----------:|:--------:|-----------|
| Counter | _id | ✅ | ✅ | Counter name: `itemId`, `requestId`, `logId` |
| Counter | seq | ✅ | | Current sequence number |

> This is an internal utility collection for auto-incrementing IDs. No changes needed.

---

## Summary of All Gaps

### Missing Fields (need to add)
| Collection | Field | Type | Description |
|------------|-------|------|-------------|
| User | `is_active` | Boolean | Soft delete / deactivation flag |

### Type Corrections (need to fix)
| Collection | Field | Current | Should Be |
|------------|-------|---------|-----------|
| Item | `purchaseDate` | String | Date |
| Item | `warrantyEnd` | String | Date |
| Item | `warrantyStartDate` | String | Date |

### Validation to Add
| Collection | Field | Validation |
|------------|-------|-----------|
| User | `email` | Unique + regex format check |
| Item | `price` | Min: 0 |
| Item | `type`, `status` | Add `required: true` |
| BorrowRequest | `reason` | Add `required: true` |
| AuditLog | `action` | Add enum constraint |

### Decisions Needed
| Question | Context |
|----------|---------|
| Keep `username` field on User? | Currently used as login identifier, not in the plan table |
| Keep `password` field on User? | Needed for JWT auth, not in the plan table |
| Keep `department` field on User? | Used in some pages, not in the plan table |
| Add `rejection_reason` to BorrowRequest? | Currently uses `notes` for everything |
| Enum vs free-text for Item `category`? | Currently free-text, could standardize |
| Enum vs free-text for Item `supplierStatus`? | Currently free-text |

---

## Entity Relationship Overview

```
User (1) ──────< (N) BorrowRequest >────── (1) Item
  │                      │
  │                      │ parentRequestId (self-reference)
  │                      ▼
  │               BorrowRequest (child component requests)
  │
  └──────< (N) AuditLog >─────── (0..1) Item
  
Item (parent) ──< motherID ── Item (component)
     └── fixedComponents: [Item.itemId]
```

---

> **Next Steps:** Review the "Decisions Needed" section, then implement field additions + validation changes.
