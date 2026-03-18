# Detailed Backend Test Cases Report

This report provides highly granular, endpoint-by-endpoint test cases to validate the Express/Node.js backend, MongoDB models, authentication middleware, and business logic for the COMP4117 Inventory System.

---

## 1. Authentication & Users (`/api/auth` & `/api/users`)

### 1.1 Authentication (`/api/auth`)
- [ ] **POST `/api/auth/login` (Success):** Provide valid `username` and `password`. Expect `200 OK`, a valid JWT token, and the correct user object (ignoring the password hash).
- [ ] **POST `/api/auth/login` (Fail - Wrong Password):** Provide valid `username` but wrong `password`. Expect `401 Unauthorized` with appropriate error message.
- [ ] **POST `/api/auth/login` (Fail - Invalid User):** Provide non-existent `username`. Expect `401 Unauthorized`.
- [ ] **GET `/api/auth/me` (Success):** Provide a valid JWT token in the `Authorization: Bearer <token>` header. Expect `200 OK` and returned user details.
- [ ] **GET `/api/auth/me` (Fail - No Token):** Make request without header. Expect `401 Unauthorized`.
- [ ] **GET `/api/auth/me` (Fail - Invalid Token):** Tamper with token signature. Expect `401 Unauthorized`.

### 1.2 User Management (`/api/users`) - Admin Only
- [ ] **GET `/api/users` (Success):** Admin token provided. Expect `200 OK` with a paginated list of users.
- [ ] **GET `/api/users` (Fail - Unauthorized):** Student/Teacher token provided. Expect `403 Forbidden`.
- [ ] **POST `/api/users` (Success):** Admin creates a new user. Expect `201 Created`. Verify password is automatically hashed in the DB.
- [ ] **POST `/api/users` (Fail - Duplicate):** Attempt to create a user with an existing `username` or `email`. Expect `400 Bad Request`.
- [ ] **PUT `/api/users/:id` (Success):** Admin updates a user's role or email. Expect `200 OK`.
- [ ] **DELETE `/api/users/:id` (Success):** Admin deletes a user. Expect `200 OK`. Verify the user is removed from DB.

---

## 2. Inventory Items (`/api/items`)

### 2.1 Retrieve Items
- [ ] **GET `/api/items` (Success - No Filters):** Expect `200 OK` with paginated items list, total count, limit, and current page.
- [ ] **GET `/api/items` (Success - Search Query):** Pass `?q=Camera`. Expect `200 OK` containing only items where name/description matches "Camera".
- [ ] **GET `/api/items` (Success - Filter by Status):** Pass `?status=Available`. Expect `200 OK` with only available items.
- [ ] **GET `/api/items` (Success - Filter by Category):** Pass `?category=Electronics`. Expect `200 OK` with correctly scoped items.
- [ ] **GET `/api/items/:id` (Success):** Pass valid MongoDB `_id` or logical `itemId`. Expect `200 OK` and item details.
- [ ] **GET `/api/items/:id` (Fail - Not Found):** Pass non-existent valid ObjectId. Expect `404 Not Found`.

### 2.2 Create / Update / Delete Items (Teacher/Admin Only)
- [ ] **POST `/api/items` (Success):** Provide required valid fields (`name`, `itemId`, `category`). Expect `201 Created`.
- [ ] **POST `/api/items` (Success with Image):** Test multipart/form-data upload using Multer (`/middleware/upload.js`). Verify image saves to `/public` and path is stored in DB.
- [ ] **POST `/api/items` (Fail - Validation):** Omit required `name`. Expect `400 Bad Request`.
- [ ] **PUT `/api/items/:id` (Success):** Update item `status` to `Maintenance`. Expect `200 OK` and verify DB update.
- [ ] **DELETE `/api/items/:id` (Success):** Delete item. Expect `200 OK` (Soft delete or hard delete depending on schema logic).

---

## 3. Borrow Requests Lifecycles (`/api/borrowRequests`)

### 3.1 Creating Requests (Student)
- [ ] **POST `/api/borrowRequests` (Success):** Student requests an `Available` item with valid future `startDate` and `endDate`. Expect `201 Created` with status `Pending`.
- [ ] **POST `/api/borrowRequests` (Fail - Item Unavailable):** Request an item currently `Lent Out` or `Maintenance`. Expect `400 Bad Request`.
- [ ] **POST `/api/borrowRequests` (Fail - Invalid Dates):** `startDate` is in the past, or `endDate` is before `startDate`. Expect `400 Bad Request`.

### 3.2 Reading Requests
- [ ] **GET `/api/borrowRequests` (Admin/Teacher):** Admin retrieves all system requests. Can filter by `?status=Pending`. Expect `200 OK`.
- [ ] **GET `/api/borrowRequests/my` (Student):** Student retrieves only their own requests. Expect `200 OK`. Check that other students' requests are not leaked.
- [ ] **GET `/api/borrowRequests/:id` (Success):** Ensure the returned object properly populates `.item` block and `.user` block.

### 3.3 State Machine Transitions (Teacher/Admin)
*For a request initially at **Pending**:*
- [ ] **PUT `/api/borrowRequests/:id/approve` (Success):** Teacher approves. Request status -> `Approved`. (*System check: Does it trigger emailService?*)
- [ ] **PUT `/api/borrowRequests/:id/reject` (Success):** Teacher rejects and provides a `reason` string. Request status -> `Rejected`. Verify `reason` saved to DB.
- [ ] **PUT `/api/borrowRequests/:id/reject` (Fail - No Reason):** Reject without a payload note. Expect validation error `400`.

*For a request at **Approved**:*
- [ ] **PUT `/api/borrowRequests/:id/checkout` (Success):** Item is physically given. Request -> `Borrowed`/`Lent Out`. **CRITICAL:** Ensure the associated Item's `status` in the `items` collection is simultaneously updated to `Lent Out`.
- [ ] **PUT `/api/borrowRequests/:id/checkout` (Fail):** Try to checkout a request that is currently `Pending` or `Rejected`. Expect `400 Bad Request`.

*For a request at **Borrowed**:*
- [ ] **PUT `/api/borrowRequests/:id/return` (Success):** Item is physically returned. Request -> `Returned`. **CRITICAL:** Ensure the Item's `status` reverts to `Available`.

---

## 4. Audit Logging (`/api/auditLogs`)

- [ ] **Audit Trigger - Item Creation:** Create a new Item via API. Verify an entry is automatically inserted into `AuditLog` collection with action `CREATE_ITEM` and the correct Admin/Teacher ID.
- [ ] **Audit Trigger - Status Change:** Approve a borrow request. Verify an AuditLog captures the `APPROVE_REQUEST` action.
- [ ] **GET `/api/auditLogs` (Success):** Admin retrieves logs. Ensure filtering by date ranges or actions works correctly.
- [ ] **GET `/api/auditLogs` (Security):** Student requests logs. Expect `403 Forbidden`.

---

## 5. System Statistics (`/api/stats`)

- [ ] **GET `/api/stats` (Success):** Admin requests stats. Verify response payload includes numerical aggregates:
  - `totalItems`
  - `availableItems`
  - `lentOutItems`
  - `totalUsers`
  - `pendingRequests`
- [ ] **GET `/api/stats` (Data accuracy):** Add an item manually, request stats again, and verify `totalItems` incremented exactly by 1.

---

## 6. Utilities & Middleware Error Handling

- [ ] **Global Error Handler (`errorHandler.js`):** Intentionally trigger a Mongoose CastError (e.g., passing "invalid_id_string" to `GET /items/invalid_id_string`). Verify the response is intercepted by the global error handler and returned as standardized JSON (e.g., `{ success: false, message: "Resource not found" }`) instead of raw HTML/stack trace crash.
- [ ] **Multer Upload Limits (`upload.js`):** Try to upload an image exceeding the defined size limit (e.g., > 5MB). Expect a 400 error indicating payload too large.
- [ ] **Email Service (`emailService.js`):** (If active) Ensure nodemailer doesn't crash the API response if the external SMTP server is down; it should be handled asynchronously or wrapped in a try/catch block.