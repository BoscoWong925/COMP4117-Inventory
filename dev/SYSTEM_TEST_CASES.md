# Comprehensive System Test Case Report

## 1. System Overview
The COMP4117 Inventory Management System is a full-stack application built for a university environment to manage equipment borrowing.
- **Backend**: Node.js, Express, MongoDB (Mongoose). Handles user authentication (JWT), inventory CRUD, complex borrow request lifecycles (pending -> approved -> borrowed -> returned), and audit logging.
- **Frontend**: Vue.js, Vite, Tailwind CSS. Provides a role-based interface isolating functionalities between Students, Teachers, and Admins.

---

## 2. Backend Test Cases Checklist (API & Logic)

### Authentication & Authorization (`/api/auth`)
- [ ] `POST /api/auth/login`: Valid credentials return JWT token and correct user role payload.
- [ ] `POST /api/auth/login`: Invalid credentials return `401 Unauthorized`.
- [ ] **Middleware - `protect`**: Attempting to access any protected route (e.g., `/api/items` with POST) without a JWT returns `401 Unauthorized`.
- [ ] **Middleware - `authorize`**: Attempting to access an Admin-only route (e.g., `/api/auditLogs`) with a Student JWT returns `403 Forbidden`.

### Inventory Management (`/api/items`)
- [ ] `GET /api/items`: Fetch all items successfully. Supports query parameters (search `q`, `category`, `status`, `page`, `limit`).
- [ ] `POST /api/items`: Admin/Teacher can create a new item. Validates required fields (`name`, `itemId`).
- [ ] `POST /api/items`: Attempting to create an item with a duplicate `itemId` returns `400 Bad Request`.
- [ ] `PUT /api/items/:id`: Successfully update item details (e.g., changing status or quantity).
- [ ] `DELETE /api/items/:id`: Successfully soft/hard delete an item.

### Borrow Requests (`/api/borrowRequests`)
- [ ] `POST /api/borrowRequests`: Student can create a request with valid return dates for an `Available` item.
- [ ] `POST /api/borrowRequests`: System prevents creation if the requested item is `Lent Out` or `Maintenance`.
- [ ] `GET /api/borrowRequests/my`: Student can successfully fetch their own history, but cannot fetch others.
- [ ] `PUT /api/borrowRequests/:id/approve`: Teacher/Admin can approve a pending request.
- [ ] `PUT /api/borrowRequests/:id/reject`: Teacher/Admin can reject a request (verifying the rejection `reason` payload is stored).
- [ ] `PUT /api/borrowRequests/:id/checkout`: Item status dynamically changes to `Lent Out` upon physical checkout.
- [ ] `PUT /api/borrowRequests/:id/return`: Request marked as `Returned` and item status resets to `Available`. 

### Audit Logs & Statistics (`/api/auditLogs`, `/api/stats`)
- [ ] `GET /api/auditLogs`: Admin receives paginated system operation logs.
- [ ] **Automatic Audit Creation**: Any POST/PUT/DELETE on items or borrow requests automatically generated a new log entry.
- [ ] `GET /api/stats`: Returns correct aggregate statistics (e.g., total items, total pending requests, active users).

---

## 3. Frontend Test Cases Checklist (UI/UX)

### Authentication Views
- [ ] **Login Page**: Renders correctly. Shows error toast for wrong username/password.
- [ ] **Login Flow**: Successful login redirects Student to `SearchAvailableItemsPage` and Teacher/Admin to `HomePage`/`Dashboard`.
- [ ] **Logout Flow**: Clicking logout clears local storage credentials and redirects to Login.

### Student Features
- [ ] **Search Items**: Search bar filters list. Out-of-stock items have disabled "Borrow" buttons.
- [ ] **Create Request**: Clicking "Borrow" opens modal. Form strictly requires start/end dates. Submit confirms via toast notification.
- [ ] **My Borrowing Record**: Table displays correct status badges (`Pending`, `Approved`, `Borrowed`, `Returned`, `Overdue`).
- [ ] **Route Guard**: Student attempting to visit `/approve-request` via URL gets redirected to unauthorized/home.

### Teacher Features
- [ ] **Approve Requests**: Pending requests list loads correctly. Approve button sends request and removes item from pending list.
- [ ] **Reject Requests**: Reject button opens `RemarkBox`. Prompt ensures reason is collected before API submission.
- [ ] **Teacher Checkout**: Searching student ID/Request ID displays correct approved requests ready for checkout.
- [ ] **Return Items**: "Hand Over" system successfully scans an item barcode/ID and transitions state appropriately.

### Admin Features
- [ ] **Manage Items**: Table displays all details. "Add New" opens clean form. Edit populates form with existing details.
- [ ] **Manage Accounts**: Can successfully view account list, grant permissions, or edit user data.
- [ ] **Audit Log**: Infinite scrolling or pagination (`PaginationControl.vue`) works correctly on log tables.
- [ ] **Dashboard Stats Cards**: Vue components (`DashboardCard.vue`) successfully render fetched KPI values without NaN or undefined errors.

---

## 4. End-to-End (E2E) Integration Scenarios

- [ ] **Lifecycle Scenario A: Happy Path Borrowing**
  1. Admin adds "Camera DSLR-01" to inventory.
  2. Student logs in, searches for "Camera", requests it for next week.
  3. Teacher logs in, goes to "Approve Requests", approves "Camera DSLR-01" for the Student.
  4. Student arrives in person. Teacher goes to "Checkout", validates request, and completes the checkout.
  5. Student returns the item. Teacher goes to "Return", validates return. Item becomes "Available" again.
  
- [ ] **Lifecycle Scenario B: Rejection Flow**
  1. Student requests a "Projector" during blackout dates.
  2. Teacher reviews "Approve Requests" and clicks Reject, adding note "Reserved for finals".
  3. Student views "My Borrowing Record", sees "Rejected" status and can read the note.

- [ ] **Lifecycle Scenario C: Overdue Handling**
  1. Student borrows an item past the due date.
  2. System (or chronological UI check) flags the status as `Overdue` visually using `StatusBadge.vue`.
  3. Dashboards reflect the unreturned item in Overdue Statistics.