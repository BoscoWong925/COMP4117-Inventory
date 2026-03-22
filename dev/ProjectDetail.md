# COMP4117 Inventory Management System — Project Detail

> Comprehensive technical documentation for the COMP Department Inventory System.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Database Architecture](#4-database-architecture)
5. [API Reference](#5-api-reference)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Borrow Request Workflow](#8-borrow-request-workflow)
9. [File Upload Handling](#9-file-upload-handling)
10. [Email Service](#10-email-service)
11. [Audit Logging](#11-audit-logging)
12. [Error Handling](#12-error-handling)
13. [Deployment](#13-deployment)
14. [Dependencies](#14-dependencies)
15. [Known Gaps & Improvement Opportunities](#15-known-gaps--improvement-opportunities)

---

## 1. Project Overview

A **university inventory management system** built for the COMP Department to track equipment and manage borrowing workflows. The system supports:

- **Inventory tracking** — Hardware, Software, and Component items with full lifecycle management
- **Borrow requests** — Workflow-based approval, checkout, and return of items
- **Multi-role access** — Admin, Operator, Teacher, and Student roles with granular permissions
- **Audit logging** — Comprehensive activity tracking for compliance and auditing
- **Email notifications** — Automated communications for request approvals, rejections, checkouts, and returns
- **Excel import/export** — Bulk operations for inventory data
- **Parent-child item hierarchy** — Component grouping with cascading borrow/return

**Target users**: Department staff (admin/operators), teachers (can own items and approve requests), and students (request items for coursework).

---

## 2. Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Vue.js 3 | 3.3.4 | UI framework (Composition API) |
| Vite | 7.3.1 | Build tool & dev server |
| Tailwind CSS | 3.3.0 | Utility-first CSS framework |
| jsQR | 1.4.0 | QR code detection |
| pdfjs-dist | 4.0.0 | PDF processing |
| Tesseract.js | 5.0.4 | OCR text extraction from images |
| xlsx | 0.18.5 | Excel export |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Express.js | 4.21.0 | Web server framework |
| MongoDB | — | NoSQL database |
| Mongoose | 8.7.0 | MongoDB ODM |
| JSON Web Token | 9.0.2 | Authentication tokens |
| bcryptjs | 2.4.3 | Password hashing |
| Multer | 1.4.5-lts.1 | File upload handling |
| Nodemailer | 6.9.14 | Email via SMTP |
| Helmet | 7.1.0 | HTTP header security |
| express-validator | 7.2.0 | Input validation |

### Deployment

| Service | Details |
|---------|---------|
| Platform | Render.com (via `render.yaml`) |
| Database | MongoDB Atlas (production) / mongodb-memory-server (development) |
| Frontend | Static hosting (Vite build output) |

---

## 3. Project Structure

```
COMP4117-Inventory/
├── backend/
│   ├── server.js                  # Express app entry point
│   ├── config/
│   │   └── db.js                  # MongoDB connection (Atlas or in-memory)
│   ├── controllers/
│   │   ├── auditLogController.js  # Audit log query & deletion
│   │   ├── authController.js      # Login, logout, session
│   │   ├── borrowRequestController.js  # Full borrow workflow
│   │   ├── itemController.js      # Item CRUD, import/export
│   │   ├── statsController.js     # Dashboard statistics
│   │   └── userController.js      # User CRUD, email sending
│   ├── middleware/
│   │   ├── auth.js                # JWT verification & role checks
│   │   ├── errorHandler.js        # Centralized error handling
│   │   └── upload.js              # Multer file upload config
│   ├── models/
│   │   ├── AuditLog.js            # Audit trail schema
│   │   ├── BorrowRequest.js       # Borrow request schema
│   │   ├── Counter.js             # Auto-ID sequence counters
│   │   ├── Item.js                # Inventory item schema
│   │   └── User.js                # User account schema
│   ├── routes/
│   │   ├── auditLogs.js           # GET/DELETE /api/audit-logs
│   │   ├── auth.js                # POST /api/auth/login|logout
│   │   ├── borrowRequests.js      # /api/borrow-requests/*
│   │   ├── items.js               # /api/items/*
│   │   ├── stats.js               # GET /api/stats
│   │   └── users.js               # /api/users/*
│   ├── utils/
│   │   ├── ApiError.js            # Custom error class
│   │   ├── auditLogger.js         # Audit log helper
│   │   ├── catchAsync.js          # Async error wrapper
│   │   └── emailService.js        # Email sending functions
│   └── public/                    # Built frontend assets (served in production)
│
├── frontend/
│   ├── index.html                 # SPA entry HTML
│   ├── vite.config.js             # Vite build configuration
│   ├── tailwind.config.js         # Tailwind theme & plugins
│   └── src/
│       ├── App.vue                # Root component (router, layout, theme)
│       ├── main.js                # Vue app bootstrap
│       ├── index.css              # Global styles & Tailwind imports
│       ├── components/            # Reusable UI components
│       ├── hooks/
│       │   └── useAuth.js         # Authentication composable
│       ├── pages/                 # Route-level page components
│       └── utils/
│           ├── helpers.js         # Date formatting, export, status utils
│           └── services.js        # API client functions
│
├── dev/                           # Development documentation
├── render.yaml                    # Render.com deployment config
└── package.json                   # Root workspace package.json
```

---

## 4. Database Architecture

### 4.1 Collections Overview

| Collection | ID Pattern | Description |
|------------|------------|-------------|
| **User** | Manual (`U001`, `S00123456`) | System users with role-based access |
| **Item** | Auto `INV-XXXX` | Inventory items (hardware, software, components) |
| **BorrowRequest** | Auto `REQ-XXXX` | Borrow workflow records |
| **AuditLog** | Auto `LOG-XXXX` | Activity audit trail |
| **Counter** | Utility | Maintains auto-increment sequences |

### 4.2 User Schema

| Field | Type | Details |
|-------|------|---------|
| `userId` | String | **Primary key** — unique, required (e.g. `U001`, `S00123456`) |
| `username` | String | Unique login identifier |
| `password` | String | bcrypt hashed (12-round salt), min 6 chars |
| `name` | String | Display name |
| `email` | String | Unique, regex-validated |
| `role` | String | Enum: `admin`, `operator`, `user` |
| `subRole` | String | Optional: `teacher`, `student` (only when role = `user`) |
| `department` | String | Department code (e.g. `COMP`) |
| `isActive` | Boolean | Soft-delete flag (default: `true`) |
| `createdAt` / `updatedAt` | Date | Auto-managed timestamps |

**Behaviour**: Passwords auto-hashed via Mongoose pre-save hook. `toJSON()` strips password from API responses.

### 4.3 Item Schema

| Field | Type | Details |
|-------|------|---------|
| `itemId` | String | Auto-generated: `INV-0001`, `INV-0002`… |
| `name` | String | Item display name |
| `universityID` | String | University asset tag number |
| `type` | String | Enum: `Hardware`, `Software`, `Component` |
| `category` | String | E.g. Computer, Display, Memory, Storage |
| `status` | String | Enum: `Available`, `In-use`, `Missing`, `Dispose`, `Not Available`, `Transferred` |
| `currentBorrower` | String | User ID of current borrower (or empty) |
| `canBorrow` | Boolean | Whether users can request this item |
| `motherID` | String | Parent group ID (for component hierarchy) |
| `fixedComponents` | [String] | Array of child `itemId` values |
| `supplier` | String | Vendor who supplied the item |
| `vendor` | String | May differ from supplier |
| `invoiceNumber` | String | Invoice reference |
| `price` | Number | Purchase price (min: 0) |
| `purchaseDate` | String | ISO date string |
| `location` | String | Physical location |
| `owner` | String | `department` or teacher `userId` |
| `departmentID` | String | Owning department |
| `projectLinked` | String | Associated project (optional) |
| `fundingSource` | String | Budget source |
| `warrantyStartDate` | String | Warranty start (ISO) |
| `warrantyEnd` | String | Warranty expiry (ISO) |
| `warrantyOnsite` | Boolean | On-site warranty flag |
| `warrantyVendor` | String | Warranty provider |
| `invoiceFile` | Object | `{ filename, mimetype, size, path }` |
| `createdAt` / `updatedAt` | Date | Auto-managed timestamps |

**Parent-child relationship**: Items with `fixedComponents` are parents. Child items reference back via `motherID`. Children inherit borrow/return actions from their parent.

### 4.4 BorrowRequest Schema

| Field | Type | Details |
|-------|------|---------|
| `requestId` | String | Auto-generated: `REQ-0001`… |
| `itemID` | String | Reference to `Item.itemId` |
| `borrowerID` | String | Reference to `User.userId` |
| `status` | String | Enum: `Pending`, `Pending Check-Out`, `Approved`, `Rejected`, `Returned` |
| `requestDate` | Date | Auto-set on creation |
| `approvalDate` | Date | When approved or rejected |
| `returnDate` | Date | Expected return date (set during approval) |
| `declaredReturnDate` | Date | When borrower declares they'll return |
| `returnedDate` | Date | Actual return date |
| `approvedBy` | String | User ID of approver |
| `reason` | String | Why the borrower needs the item |
| `notes` | String | Admin/operator notes |
| `returnNotes` | String | Condition notes upon return |
| `condition` | String | Enum: `Good`, `Minor Damage`, `Major Damage`, `Lost` |
| `parentRequestId` | String | For child requests (auto-created for components) |
| `attachments` | Array | `[{ filename, mimetype, size, path }]` |
| `createdAt` / `updatedAt` | Date | Auto-managed timestamps |

### 4.5 AuditLog Schema

| Field | Type | Details |
|-------|------|---------|
| `logId` | String | Auto-generated: `LOG-0001`… |
| `timestamp` | Date | When action occurred |
| `userID` | String | Who performed the action |
| `action` | String | Action type (see list below) |
| `details` | String | Human-readable description |
| `affectedItemID` | String | Item involved (if applicable) |
| `oldValue` | String | Previous value (for changes) |
| `newValue` | String | New value (for changes) |

**Action types**: `LOGIN`, `LOGOUT`, `USER_CREATED`, `USER_UPDATED`, `USER_DELETED`, `USER_ACTIVATED`, `USER_DEACTIVATED`, `ITEM_ADDED`, `ITEM_UPDATED`, `ITEM_DELETED`, `ITEM_STATUS_CHANGE`, `BORROW_REQUEST_CREATED`, `BORROW_REQUEST_APPROVED`, `BORROW_REQUEST_REJECTED`, `EMAIL_SENT`, `EMAIL_FAILED`, `AUDIT_LOGS_DELETED`

### 4.6 Counter Schema

Utility collection for generating sequential IDs. Each document tracks a sequence name and its current value:

| Field | Type | Details |
|-------|------|---------|
| `_id` | String | Sequence name (e.g. `itemId`, `requestId`, `logId`) |
| `seq` | Number | Current sequence number |

---

## 5. API Reference

### 5.1 Authentication — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/login` | No | Login with `{ username, password }` → returns JWT token + user |
| `POST` | `/logout` | Yes | Logout (creates audit log entry) |
| `GET` | `/me` | Yes | Get current authenticated user profile |

### 5.2 Users — `/api/users`

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| `GET` | `/` | Yes | admin, operator | List users (paginated, filterable by role, status, search) |
| `POST` | `/` | Yes | admin | Create new user |
| `GET` | `/search/:query` | Yes | admin, operator | Search users by name/email/ID |
| `GET` | `/teachers` | Yes | any | List all teacher users |
| `GET` | `/:id` | Yes | self or admin | Get user by ID |
| `PUT` | `/:id` | Yes | self or admin | Update user profile |
| `DELETE` | `/:id` | Yes | admin | Hard-delete user |
| `PUT` | `/:id/status` | Yes | admin | Activate/deactivate user |
| `POST` | `/send-email` | Yes | teacher, operator, admin | Send email to a user |

### 5.3 Items — `/api/items`

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| `GET` | `/` | Yes | admin, operator | List all items (paginated, filterable) |
| `GET` | `/available` | Yes | any | List available items (excludes pending/in-use) |
| `GET` | `/lent-out` | Yes | admin, operator | List currently checked-out items |
| `GET` | `/owners` | Yes | any | List teacher owners |
| `GET` | `/by-owner/:ownerId` | Yes | any | Get items owned by a teacher |
| `POST` | `/import` | Yes | admin, operator | Bulk import from Excel file |
| `POST` | `/` | Yes | admin, operator | Create new item (with optional invoice file) |
| `GET` | `/:id` | Yes | any | Get item by ID |
| `GET` | `/:id/components` | Yes | any | Get child components of a parent item |
| `GET` | `/:id/invoice` | Yes | admin, operator | Download invoice file |
| `PUT` | `/:id` | Yes | admin, operator | Update item (with optional invoice file) |
| `PUT` | `/:id/status` | Yes | any | Change item status |
| `DELETE` | `/:id` | Yes | admin, operator | Delete item |

### 5.4 Borrow Requests — `/api/borrow-requests`

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| `GET` | `/` | Yes | admin, operator | List all requests (paginated, filterable) |
| `GET` | `/pending` | Yes | admin, operator | List pending requests |
| `GET` | `/my` | Yes | any | List current user's requests |
| `GET` | `/teacher-pending` | Yes | teacher | Pending requests for teacher's items |
| `GET` | `/teacher-history` | Yes | teacher | History of requests for teacher's items |
| `POST` | `/auto-expire` | Yes | admin, operator | Expire stale pending-checkout requests |
| `POST` | `/` | Yes | any | Create borrow request (auto-creates child requests for components) |
| `GET` | `/:id` | Yes | any (own) | Get request by ID |
| `PUT` | `/:id/approve` | Yes | operator, teacher (own items), admin | Approve request (set return date) |
| `PUT` | `/:id/reject` | Yes | operator, teacher, admin | Reject request |
| `PUT` | `/:id/checkout` | Yes | operator, teacher, admin | Checkout item to borrower |
| `PUT` | `/:id/deny` | Yes | operator, teacher, admin | Deny checkout |
| `PUT` | `/:id/declare-return` | Yes | borrower, teacher, operator, admin | Declare intended return date |
| `PUT` | `/:id/return` | Yes | operator, teacher (own items), admin | Process return with condition |
| `POST` | `/:id/attachments` | Yes | any | Upload attachments to request |

### 5.5 Audit Logs — `/api/audit-logs`

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| `GET` | `/` | Yes | admin, operator | Query logs (filterable by action, user, item, date range) |
| `DELETE` | `/` | Yes | admin | Bulk delete logs by ID array |

### 5.6 Statistics — `/api/stats`

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| `GET` | `/` | Yes | admin, operator | Dashboard KPIs (total, available, lent, missing, disposed, pending, returned, approved, rejected) |

### 5.7 Health Check

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/health` | No | Returns `{ success, message, timestamp }` |

---

## 6. Authentication & Authorization

### JWT Implementation

- **Token generation**: Issued on login; payload includes `userId`, `username`, `name`, `role`, `subRole`, `department`
- **Expiration**: 24 hours (configurable via `JWT_EXPIRES_IN`)
- **Client storage**: `sessionStorage` — cleared on tab close or logout
- **Transmission**: `Authorization: Bearer <token>` header

### Role-Based Access Control

| Role | Sub-Role | Permissions |
|------|----------|-------------|
| **admin** | — | Full system access: manage users, items, all requests, audit logs |
| **operator** | — | Inventory management: manage items, approve/checkout/return requests, view logs |
| **user** | **teacher** | Own items, approve requests for owned items, borrow items, send emails |
| **user** | **student** | Submit borrow requests, view own borrowing history |

### Authorization Flow

```
Request → authenticate middleware (JWT verify)
       → authorize middleware (role check)
       → controller (business logic + ownership checks)
```

Teachers can only approve/reject/checkout/return requests for items they own. Students can only view their own requests.

---

## 7. Frontend Architecture

### 7.1 Pages

| Page | Route | Audience | Description |
|------|-------|----------|-------------|
| **LoginPage** | `/` | Public | Login form |
| **HomePage** | `/home` | All | Dashboard with KPI cards, pending alerts, overdue items, warranty alerts |
| **ManageItemsPage** | `/manage-items` | Admin, Operator | Full inventory CRUD, import/export, filtering |
| **ManageAccountsPage** | `/manage-accounts` | Admin | User account management |
| **ApproveRequestsPage** | `/approve-requests` | Admin, Operator | Review & process pending borrow requests |
| **BorrowHistoryPage** | `/borrow-history` | Admin, Operator | Historical record of all borrow requests |
| **LentOutFilterPage** | `/lent-out-filter` | Admin, Operator | Filter & manage checked-out items |
| **AuditLogPage** | `/audit-log` | Admin, Operator | View & manage audit trail |
| **ApiStatusPage** | `/api-status` | Admin, Operator | Health check & API diagnostics |
| **NewBorrowRequestPage** | `/new-borrow-request` | Teacher, Student | Submit new borrow request |
| **SearchAvailableItemsPage** | `/search-available` | Teacher, Student | Browse available items |
| **MyBorrowingRecordPage** | `/my-borrowing-record` | Teacher, Student | Personal borrow history |
| **MyItemsPage** | `/my-items` | Teacher, Student | Items currently borrowed |
| **TeacherRequestsPage** | `/teacher-requests` | Teacher | Manage requests for owned items |
| **TeacherCheckoutPage** | `/teacher-checkout` | Teacher | Checkout items for approved requests |
| **HandOverToolPage** | `/hand-over-tool` | — | Reserved for future use |
| **GuidelinePage** | `/guide-line` | All | System usage guidelines |

### 7.2 Reusable Components

| Component | Purpose |
|-----------|---------|
| **StatusBadge** | Color-coded status labels for items and requests |
| **AlertCard** | Clickable alert cards with severity levels (danger/warning/neutral) |
| **DashboardCard** | Read-only stat card for KPI display |
| **DashboardCalendar** | Calendar widget for deadline visualization |
| **DeleteBlockModal** | Confirmation dialog for destructive actions |
| **DropdownWithOther** | Dropdown select with "Other" option for custom input |
| **NotificationBadge** | Floating count badge for pending items |
| **PaginationControl** | Page navigation for paginated lists |
| **RemarkBox** | Text area for notes and remarks |
| **SendEmailModal** | Modal form for composing and sending emails |

### 7.3 Composables

- **`useAuth()`** — Manages authentication state, login/logout, JWT session restoration, role checks

### 7.4 API Client (`services.js`)

Grouped by domain:
- `authService` — login, logout, restoreSession, hasRole
- `inventoryService` — getAllItems, getAvailableItems, getLentOutItems, addItem, updateItem, deleteItem, importItems, etc.
- `borrowingService` — getAllRequests, getMyRequests, getPendingRequests, createRequest, approveRequest, checkoutRequest, returnRequest, etc.
- `userService` — getAllUsers, getUserById, createUser, updateUser, deleteUser, toggleStatus, searchUsers, sendEmail

### 7.5 Utilities (`helpers.js`)

- `formatDate()`, `formatDateTime()` — Date formatting
- `exportToExcel()` — Export data to XLSX files
- `isOverdue()`, `isDueSoon()`, `isWarrantyExpired()` — Date comparison checks
- `getStatusColor()` — Map status string to CSS class
- `daysFromNow()`, `waitingTime()` — Human-readable time durations
- Status constants: `ITEM_STATUSES`, `REQUEST_STATUSES`

### 7.6 Theming

- **Dark mode** toggle persisted in `localStorage`
- **Compact layout** option
- **Reduced motion** accessibility setting
- **System theme** detection and auto-switch
- **Design tokens**: Accent blue (`#1eb6ff`–`#0699ff`), surface grays, status colors (green/red/amber/cyan)

---

## 8. Borrow Request Workflow

```
┌─────────────────────────────────────────────────────────┐
│  1. REQUEST SUBMISSION (User / Teacher / Student)       │
│     - Select available item                             │
│     - Provide reason, upload attachments                │
│     - Auto-creates child requests for components        │
│                                         Status: Pending │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼                             ▼
┌─────────────────────┐   ┌────────────────────────┐
│  REJECTED            │   │  2. APPROVAL             │
│  - Reason provided   │   │  - Set return date       │
│  - Email to borrower │   │  - Auto-reject competing │
│                      │   │  - Email to borrower     │
│  Status: Rejected    │   │  Status: Pending Checkout│
└─────────────────────┘   └────────────┬───────────┘
                                       │
                         ┌─────────────┼─────────────┐
                         ▼                           ▼
               ┌─────────────────┐     ┌────────────────────┐
               │  DENIED          │     │  3. CHECKOUT         │
               │  - Blocks at     │     │  - Item handed out   │
               │    checkout      │     │  - Status → In-use   │
               │  Status: Rejected│     │  - Email to borrower │
               └─────────────────┘     │  Status: Approved    │
                                       └────────────┬─────────┘
                                                    │
                                       ┌────────────▼─────────┐
                                       │  4. DECLARE RETURN    │
                                       │  - Borrower sets date │
                                       └────────────┬─────────┘
                                                    │
                                       ┌────────────▼─────────┐
                                       │  5. RETURN            │
                                       │  - Condition assessed │
                                       │  - Item → Available   │
                                       │  - Clear borrower     │
                                       │  - Email to owner     │
                                       │  Status: Returned     │
                                       └──────────────────────┘
```

**Key behaviours**:
- **Component cascading**: When a parent item is requested, child component requests are auto-created with `parentRequestId`
- **Competing request rejection**: When a request is approved, all other pending requests for the same item are auto-rejected
- **Auto-expiration**: Pending-checkout requests can be expired if not completed within a configurable period
- **Condition assessment**: On return, the operator records condition as Good, Minor Damage, Major Damage, or Lost

---

## 9. File Upload Handling

### Backend Configuration (`middleware/upload.js`)

| Setting | Value |
|---------|-------|
| Storage | Disk (`backend/uploads/`) |
| Max file size | 10 MB |
| Allowed types | JPEG, PNG, GIF, WebP, PDF, Excel |
| Invoice field | Single file (`invoiceFile`) |
| Attachment field | Multiple files, up to 10 (`attachments`) |

Files are stored with metadata: `{ filename, mimetype, size, path }`.

### Usage

- **Items**: Invoice file upload during creation or update
- **Borrow requests**: Attachment uploads at creation or via dedicated endpoint
- **Download**: Invoice files downloadable via `GET /api/items/:id/invoice`

---

## 10. Email Service

### Configuration

Uses **Nodemailer** with SMTP. Configured via environment variables:

| Variable | Purpose |
|----------|---------|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | Port (typically 587) |
| `SMTP_SECURE` | TLS flag (true for 465, false for 587) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | Sender address |

### Automated Email Triggers

| Event | Recipient(s) |
|-------|-------------|
| New request submitted | Item owner + operators |
| Request approved | Borrower |
| Request rejected | Borrower |
| Item checked out | Borrower |
| Checkout denied | Borrower |
| Item returned | Item owner + operators |
| Item status changed | Item owner + operators |
| User welcome | New user |
| User role changed | Affected user |
| Account activated | Affected user |
| Account deactivated | Affected user |

### Error Handling

Email failures are **non-blocking** — they don't prevent the primary action from completing. Failures are tracked via audit logs (`EMAIL_SENT` / `EMAIL_FAILED` actions).

---

## 11. Audit Logging

### Implementation (`utils/auditLogger.js`)

Every significant action generates an audit log entry with:
- **Who** — `userID` of the actor
- **What** — Action type (standardized enum)
- **When** — Timestamp (auto-set)
- **Details** — Human-readable description
- **Context** — Affected item ID, old/new values

### Query Capabilities

- Filter by action type, user, item, date range
- Time range presets: 15m, 1h, 24h, 7d, 4w, 6M, 1y, 2y
- Full-text search across user ID, details, affected item ID
- Sortable by timestamp, user, action
- Bulk delete by admin (specific log IDs)

---

## 12. Error Handling

### Backend (`middleware/errorHandler.js`)

Centralized error handler that catches:

| Error Type | HTTP Status | Response |
|------------|-------------|----------|
| Mongoose validation | 400 | Field-level error messages |
| Duplicate key | 400 | Identifies conflicting field |
| JWT expired/invalid | 401 | Authentication required |
| Missing auth token | 401 | Unauthorized |
| Insufficient role | 403 | Forbidden |
| Not found | 404 | Resource not found |
| Multer file errors | 400 | File size/type rejection |
| Unhandled errors | 500 | Internal server error |

**Response format**: `{ success: false, error: "message" }` (stack trace included in development only).

### Frontend

- API client catches HTTP error responses and throws JavaScript errors
- Components display inline alert messages for user-facing errors
- Form-level validation before API submission

---

## 13. Deployment

### Render.com (`render.yaml`)

```yaml
services:
  - type: web
    name: comp4117-inventory-backend
    runtime: node
    rootDir: backend
    buildCommand: npm ci
    startCommand: node server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI       # Set in Render dashboard
      - key: JWT_SECRET        # Set in Render dashboard
      - key: FRONTEND_URL      # Set to frontend hosting URL
```

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `NODE_ENV` | Execution mode | `production` |
| `MONGODB_URI` | Database connection | `mongodb+srv://...` |
| `JWT_SECRET` | Token signing key | (random string) |
| `JWT_EXPIRES_IN` | Token lifetime | `24h` |
| `PORT` | Server port | `5001` |
| `FRONTEND_URL` | CORS whitelist origin | `https://example.github.io` |
| `SMTP_HOST` | Email server | `smtp.gmail.com` |
| `SMTP_PORT` | Email port | `587` |
| `SMTP_SECURE` | TLS flag | `false` |
| `SMTP_USER` | Email login | `noreply@university.edu` |
| `SMTP_PASS` | Email password | (app password) |
| `SMTP_FROM` | Sender address | `inventory@university.edu` |

### Local Development

```bash
# Backend (port 5001, uses in-memory MongoDB if no MONGODB_URI)
cd backend && npm install && npm run dev

# Frontend (Vite dev server)
cd frontend && npm install && npm run dev
```

---

## 14. Dependencies

### Backend (`backend/package.json`)

| Package | Version | Purpose |
|---------|---------|---------|
| express | 4.21.0 | Web framework |
| mongoose | 8.7.0 | MongoDB ODM |
| jsonwebtoken | 9.0.2 | JWT generation & verification |
| bcryptjs | 2.4.3 | Password hashing |
| cors | 2.8.5 | Cross-origin resource sharing |
| helmet | 7.1.0 | HTTP header security |
| multer | 1.4.5-lts.1 | File upload handling |
| nodemailer | 6.9.14 | Email sending |
| morgan | 1.10.0 | HTTP request logging |
| express-validator | 7.2.0 | Input validation |
| dotenv | 16.4.5 | Environment variable loading |
| xlsx | 0.18.5 | Excel file processing |
| mongodb-memory-server | 11.0.1 | In-memory MongoDB for dev |

### Frontend (`frontend/package.json`)

| Package | Version | Purpose |
|---------|---------|---------|
| vue | 3.3.4 | UI framework |
| vite | 7.3.1 | Build tool & dev server |
| @vitejs/plugin-vue | 6.0.4 | Vite Vue plugin |
| tailwindcss | 3.3.0 | CSS framework |
| postcss | 8.4.24 | CSS processing |
| autoprefixer | 10.4.14 | Vendor prefix automation |
| jsqr | 1.4.0 | QR code detection |
| pdfjs-dist | 4.0.0 | PDF rendering |
| tesseract.js | 5.0.4 | OCR text extraction |
| xlsx | 0.18.5 | Excel export |

---

## 15. Known Gaps & Improvement Opportunities

| Area | Current State | Recommendation |
|------|---------------|----------------|
| Date fields on Item | `purchaseDate`, `warrantyStartDate`, `warrantyEnd` stored as String | Convert to Date type for proper comparison/filtering |
| Category validation | No enum constraint on `category`, `supplierStatus` | Add standardized enum or suggestion dropdown |
| Email templates | Plain text only | Migrate to HTML templates with styling |
| Rate limiting | Not implemented | Add `express-rate-limit` to prevent abuse |
| Password reset | No self-service flow | Implement forgot-password via email link |
| Two-factor auth | Not implemented | Consider for admin accounts |
| Automated tests | None in codebase | Add Jest/Vitest unit tests, Playwright E2E tests |
| WebSocket updates | Polling for data refresh | Add real-time push notifications |
| Caching | No caching layer | Add Redis for frequently accessed data |
| Hard delete vs soft | Users use hard delete; items use soft status | Align all entities to soft-delete pattern |
