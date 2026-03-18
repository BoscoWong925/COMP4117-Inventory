# Detailed Frontend Test Cases Report

This report provides highly granular, view-by-view test cases to validate the Vue.js frontend application, user interface components, routing guards, and API integrations for the COMP4117 Inventory System.

---

## 1. Authentication & Route Guarding (`useAuth.js` & Vue Router)

### 1.1 Login View (`LoginPage.vue`)
- [ ] **UI Rendering:** Username and password input fields are visible, along with the Login button.
- [ ] **Client-side Validation:** Clicking "Login" with empty fields shows a local UI validation error (e.g., "Username is required").
- [ ] **Invalid Login:** Submitting incorrect credentials triggers an error toast/alert card indicating login failure.
- [ ] **Student Login Success:** Logging in with a Student account successfully stores the JWT in `localStorage` and redirects to `/search-items` (or Student Dashboard).
- [ ] **Teacher/Admin Login Success:** Logging in with Teacher/Admin credentials redirects to `/home` (or Admin Dashboard).

### 1.2 Route Protection
- [ ] **Unauthenticated Access:** Attempting to manually navigate to `/home` or `/manage-items` without a token forces a redirect back to `/login`.
- [ ] **Role-based Guard (Student):** A logged-in Student attempting to navigate to `/approve-requests` or `/manage-accounts` is blocked and redirected to an unauthorized page or dashboard.
- [ ] **Logout Flow:** Clicking the "Logout" button/link clears `localStorage` (token and user data) and immediately redirects to `/login`. Pressing the browser "Back" button after logout should not allow access to protected pages.

---

## 2. Student Interface (`SearchAvailableItemsPage`, `NewBorrowRequestPage`, `MyBorrowingRecordPage`)

### 2.1 Searching & Viewing Items (`SearchAvailableItemsPage.vue`)
- [ ] **Initial Load:** Page fetches and displays a grid/list of available items. Loading spinners appear during the API fetch.
- [ ] **Search Filter:** Typing in the search bar dynamically filters the displayed items based on the item name or ID.
- [ ] **Status UI:** Items with status `Available` have an enabled "Borrow" button.
- [ ] **Disabled States:** Items that are `Lent Out` or `Maintenance` display appropriately disabled buttons and grayed-out UI styling.

### 2.2 Submitting a Request (`NewBorrowRequestPage.vue` / Modal)
- [ ] **Date Picker Validation (Past Dates):** Attempting to select a `startDate` in the past displays an error message and prevents submission.
- [ ] **Date Picker Validation (Logical Range):** Attempting to set an `endDate` that is earlier than the `startDate` is blocked.
- [ ] **Successful Submission:** Submitting a valid request shows a success toast ("Request submitted successfully") and closes the modal/form.
- [ ] **UI State Clear:** Re-opening the borrow form for a new item resets the previously entered dates.

### 2.3 Borrowing History (`MyBorrowingRecordPage.vue`)
- [ ] **Data Fetching:** The table strictly displays only the logged-in student's requests.
- [ ] **Status Badges:** The `StatusBadge.vue` component renders correct colors (e.g., Gray/Yellow = `Pending`, Green = `Approved`, Blue = `Borrowed`, Red = `Rejected`).
- [ ] **Rejection Remarks:** If a request is `Rejected`, the UI displays the Teacher's "Reason for rejection" clearly to the student.

---

## 3. Teacher Interface (`ApproveRequestsPage`, `TeacherCheckoutPage`, `HandOverToolPage`)

### 3.1 Managing Requests (`ApproveRequestsPage.vue`)
- [ ] **Pending List:** Table populates exclusively with requests in the `Pending` state.
- [ ] **Approve Action:** Clicking "Approve" triggers an API call, shows a success toast, and magically removes that row from the pending list without requiring a full page reload.
- [ ] **Reject Action (RemarkBox):** Clicking "Reject" opens the `RemarkBox.vue` modal prompting for a reason.
- [ ] **Reject Validation:** Attempting to submit a rejection without typing a reason is blocked by the UI.

### 3.2 Physical Checkout (`TeacherCheckoutPage.vue`)
- [ ] **Search Student/Request:** Teacher can search for an `Approved` request by Student ID or Request ID.
- [ ] **Checkout Execution:** Clicking "Checkout" / "Hand Over" updates the item status on the screen and triggers the API. Success message is shown.

### 3.3 Physical Return (`HandOverToolPage.vue` / Returns)
- [ ] **Scan/Enter Item ID:** Teacher enters a currently `Borrowed` item ID. UI retrieves the correct active borrow session.
- [ ] **Process Return:** Clicking "Confirm Return" transitions the request to `Returned` and clears it from the active checkout screen.

---

## 4. Admin Interface (`ManageItemsPage`, `ManageAccountsPage`, `AuditLogPage`, `HomePage`)

### 4.1 Inventory Management (`ManageItemsPage.vue`)
- [ ] **Add Item Form:** Clicking "Add New" opens a clean modal. Validates mandatory fields (`Name`, `Item ID`, `Category`).
- [ ] **Image Upload (UI):** Selecting an image file updates the form with a local image preview before submitting.
- [ ] **Edit Item:** Clicking "Edit" on an existing item populates the modal with the item's current MongoDB data.
- [ ] **Delete Item Confirmation:** Clicking "Delete" opens a confirmation dialog (preventing accidental clicks). Confirming removes the item from the UI table.

### 4.2 Account Management (`ManageAccountsPage.vue`)
- [ ] **Account List:** Renders all users. Admin can visually distinguish roles via layout or badges.
- [ ] **Role Editing:** Admin can select a user and change their role from `Student` to `Teacher`. The UI updates immediately upon API success.

### 4.3 Dashboard & Auditing (`HomePage.vue` / `AuditLogPage.vue`)
- [ ] **Dashboard KPI Cards (`DashboardCard.vue`):** Fetched `/api/stats` data (Total Items, Pending Requests) renders correctly. Verify counters do not show `NaN` or `undefined` while loading.
- [ ] **Pagination Control (`PaginationControl.vue`):** On the Audit Log page, if on Page 1, the "Previous" button is disabled. Clicking "Next" loads Page 2 data and updates the page counter.
- [ ] **Log Readability:** Audit logs distinctly format standard actions (e.g., highlighting `CREATE_ITEM` or `APPROVE_REQUEST` with specific colors).

---

## 5. Global UI / Component Health

- [ ] **Responsive Design (Mobile/Tablet):** Top navigation collapses into a hamburger menu (if implemented in Tailwind) on mobile. Data tables transform or allow horizontal scrolling so layout doesn't break on narrow screens.
- [ ] **Axios Interceptors / Global Error Handling:** If the JWT expires seamlessly in the background, making any `/api` call catches the `401 Unauthorized` via Axios interceptor, alerts the user ("Session expired"), and redirects back to `/login`.
- [ ] **Not Found (`404` Page):** Navigating to a random non-existent frontend route (e.g., `/xyz-fake-page`) renders a friendly 404 UI component instead of a blank white screen.