# API Test Report

**Date:** 2026-03-03 08:13:02  
**Server:** http://localhost:5001/api  
**Total Tests:** 48 | **Pass:** 48 | **Fail:** 0  
**Pass Rate:** 100%

---

## Summary

| Group | Pass | Fail | Total | Status |
|-------|------|------|-------|--------|
| Health | 1 | 0 | 1 | ✅ All Pass |
| Auth | 7 | 0 | 7 | ✅ All Pass |
| Users | 9 | 0 | 9 | ✅ All Pass |
| Items | 13 | 0 | 13 | ✅ All Pass |
| BorrowRequests | 12 | 0 | 12 | ✅ All Pass |
| Stats | 2 | 0 | 2 | ✅ All Pass |
| AuditLogs | 4 | 0 | 4 | ✅ All Pass |

---

## Health (1/1)

| # | Result | Method | Path | Expected | Actual | Time | Test Name | Notes |
|---|--------|--------|------|----------|--------|------|-----------|-------|
| 1 | ✅ | GET | `/health` | 200 | 200 | 64ms | Server health check |  |

## Auth (7/7)

| # | Result | Method | Path | Expected | Actual | Time | Test Name | Notes |
|---|--------|--------|------|----------|--------|------|-----------|-------|
| 1 | ✅ | POST | `/auth/login` | 200 | 200 | 1014ms | Login with valid admin credentials |  |
| 2 | ✅ | POST | `/auth/login` | 200 | 200 | 948ms | Login with valid user credentials |  |
| 3 | ✅ | POST | `/auth/login` | 401 | 401 | 478ms | Login with invalid credentials |  |
| 4 | ✅ | POST | `/auth/login` | 400 | 400 | 4ms | Login with missing fields |  |
| 5 | ✅ | GET | `/auth/me` | 200 | 200 | 418ms | Get current user (with token) |  |
| 6 | ✅ | GET | `/auth/me` | 401 | 401 | 3ms | Get current user (no token) |  |
| 7 | ✅ | POST | `/auth/logout` | 200 | 200 | 663ms | Logout |  |

## Users (9/9)

| # | Result | Method | Path | Expected | Actual | Time | Test Name | Notes |
|---|--------|--------|------|----------|--------|------|-----------|-------|
| 1 | ✅ | GET | `/users` | 200 | 200 | 631ms | List all users | 8 users returned |
| 2 | ✅ | GET | `/users/U001` | 200 | 200 | 421ms | Get user by ID (U001) |  |
| 3 | ✅ | GET | `/users/U999` | 404 | 404 | 417ms | Get non-existent user |  |
| 4 | ✅ | GET | `/users/search/admin` | 200 | 200 | 442ms | Search users by "admin" | 1 results |
| 5 | ✅ | POST | `/users` | 201 | 201 | 1120ms | Create new user | userId=UTEST01 |
| 6 | ✅ | PUT | `/users/UTEST01` | 200 | 200 | 888ms | Update user |  |
| 7 | ✅ | PUT | `/users/UTEST01/status` | 200 | 200 | 869ms | Toggle user active status |  |
| 8 | ✅ | DELETE | `/users/UTEST01` | 200 | 200 | 670ms | Delete user (cleanup) |  |
| 9 | ✅ | GET | `/users` | 403 | 403 | 212ms | User role cannot list users (403) |  |

## Items (13/13)

| # | Result | Method | Path | Expected | Actual | Time | Test Name | Notes |
|---|--------|--------|------|----------|--------|------|-----------|-------|
| 1 | ✅ | GET | `/items` | 200 | 200 | 758ms | List all items (paginated) | 5 of 13 total |
| 2 | ✅ | GET | `/items/available` | 200 | 200 | 638ms | Get available items | 8 available |
| 3 | ✅ | GET | `/items/lent-out` | 200 | 200 | 629ms | Get lent-out items | 5 lent out |
| 4 | ✅ | GET | `/items/INV-002` | 200 | 200 | 433ms | Get item by ID (INV-002) |  |
| 5 | ✅ | GET | `/items/INV-999` | 404 | 404 | 421ms | Get non-existent item |  |
| 6 | ✅ | GET | `/items/INV-002/components` | 200 | 200 | 652ms | Get item components (INV-002) | 1 components |
| 7 | ✅ | GET | `/items?search=Dell` | 200 | 200 | 673ms | Search items by "Dell" | 2 results |
| 8 | ✅ | POST | `/items` | 201 | 201 | 1097ms | Create new item | itemId=INV-037 |
| 9 | ✅ | PUT | `/items/INV-037` | 200 | 200 | 654ms | Update item |  |
| 10 | ✅ | DELETE | `/items/INV-037` | 200 | 200 | 1094ms | Delete item (cleanup) |  |
| 11 | ✅ | GET | `/items/INV-002/invoice` | 404/200 | 404 | 420ms | Get invoice for item (INV-002) | No invoice file (expected) |
| 12 | ✅ | GET | `/items/available` | 200 | 200 | 628ms | User role can get available items |  |
| 13 | ✅ | GET | `/items` | 403 | 403 | 216ms | User role cannot list all items (403) |  |

## BorrowRequests (12/12)

| # | Result | Method | Path | Expected | Actual | Time | Test Name | Notes |
|---|--------|--------|------|----------|--------|------|-----------|-------|
| 1 | ✅ | GET | `/borrow-requests` | 200 | 200 | 865ms | List all requests (paginated) | 5 of 10 |
| 2 | ✅ | GET | `/borrow-requests/pending` | 200 | 200 | 836ms | Get pending requests | 3 pending, badge count=3 |
| 3 | ✅ | GET | `/borrow-requests/my` | 200 | 200 | 639ms | Get my requests (admin) | 0 requests |
| 4 | ✅ | GET | `/borrow-requests/my` | 200 | 200 | 853ms | Get my requests (user) | 1 requests |
| 5 | ✅ | GET | `/borrow-requests/REQ-001` | 200 | 200 | 645ms | Get request by ID (REQ-001) |  |
| 6 | ✅ | GET | `/borrow-requests/REQ-999` | 404 | 404 | 481ms | Get non-existent request |  |
| 7 | ✅ | GET | `/borrow-requests?status=Approved` | 200 | 200 | 888ms | Filter by status=Approved | 4 approved |
| 8 | ✅ | POST | `/borrow-requests` | 201 | 201 | 1603ms | Create request (user role) | requestId=REQ-011 |
| 9 | ✅ | POST | `/borrow-requests` | 403 | 403 | 216ms | Admin cannot create request (403) |  |
| 10 | ✅ | PUT | `/borrow-requests/REQ-999/approve` | 404 | 404 | 423ms | Approve non-existent (404) |  |
| 11 | ✅ | PUT | `/borrow-requests/REQ-999/reject` | 404 | 404 | 422ms | Reject non-existent (404) |  |
| 12 | ✅ | PUT | `/borrow-requests/REQ-999/return` | 404 | 404 | 420ms | Return non-existent (404) |  |

## Stats (2/2)

| # | Result | Method | Path | Expected | Actual | Time | Test Name | Notes |
|---|--------|--------|------|----------|--------|------|-----------|-------|
| 1 | ✅ | GET | `/stats` | 200 | 200 | 431ms | Get dashboard statistics | items=13, available=8, pending=4 |
| 2 | ✅ | GET | `/stats` | 403 | 403 | 225ms | User role cannot access stats (403) |  |

## AuditLogs (4/4)

| # | Result | Method | Path | Expected | Actual | Time | Test Name | Notes |
|---|--------|--------|------|----------|--------|------|-----------|-------|
| 1 | ✅ | GET | `/audit-logs` | 200 | 200 | 649ms | List audit logs (paginated) | 5 of 90 total |
| 2 | ✅ | GET | `/audit-logs?action=ITEM_ADDED` | 200 | 200 | 643ms | Filter by action=ITEM_ADDED | 4 results |
| 3 | ✅ | GET | `/audit-logs?search=admin` | 200 | 200 | 696ms | Search logs by "admin" | 5 results |
| 4 | ✅ | GET | `/audit-logs` | 403 | 403 | 218ms | User role cannot access logs (403) |  |

---

## API Confirmation Status

Based on the test results above, here is the confirmation status of each API module:

### ✅ Health — CONFIRMED

All 1 tests passed. API endpoints are working as expected.

### ✅ Auth — CONFIRMED

All 7 tests passed. API endpoints are working as expected.

### ✅ Users — CONFIRMED

All 9 tests passed. API endpoints are working as expected.

### ✅ Items — CONFIRMED

All 13 tests passed. API endpoints are working as expected.

### ✅ BorrowRequests — CONFIRMED

All 12 tests passed. API endpoints are working as expected.

### ✅ Stats — CONFIRMED

All 2 tests passed. API endpoints are working as expected.

### ✅ AuditLogs — CONFIRMED

All 4 tests passed. API endpoints are working as expected.

---

## Notes

- **User API & DB**: Confirmed working — full CRUD (create, read, update, delete, search, status toggle) all pass.
- **Auth**: Login, logout, JWT token verification all functional.
- Tests that create data (users, items) are cleaned up (deleted) after testing.
- Negative tests (invalid credentials, non-existent resources, unauthorized access) verify proper error handling.
- File upload endpoints (import Excel, invoice, attachments) are not tested here as they require multipart form data with actual files.
