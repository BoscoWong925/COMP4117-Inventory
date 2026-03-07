# Dev Summary — 2026-03-07 Merge

## Overview
Merged teammate's teacher role feature from a duplicate project folder into the main project.

---

## Backend Changes

| File | Change | Details |
|------|--------|---------|
| models/User.js | Added field | `subRole` (teacher/student, default student) |
| models/Item.js | Added fields | `owner` (string, default department), `canBorrow` (boolean, default true) + indexes |
| controllers/authController.js | Modified | Login and getMe now return `subRole` |
| controllers/userController.js | Modified | `formatUserResponse`, `createUser`, `updateUser` include subRole; added password change in updateUser |
| controllers/userController.js | Added function | `getTeachers()` — returns active teacher users |
| controllers/itemController.js | Modified | `getAvailableItems` filters by canBorrow, excludes child items, supports owner param |
| controllers/itemController.js | Modified | `createItem` handles owner/canBorrow defaults, child items auto canBorrow=false |
| controllers/itemController.js | Added function | `getItemsByOwner()`, `getItemOwners()` |
| controllers/borrowRequestController.js | Modified | `approveRequest` / `rejectRequest` — teachers can only act on items they own |
| controllers/borrowRequestController.js | Added function | `getTeacherPendingRequests()`, `getTeacherRequestHistory()` |
| routes/users.js | Added route | `GET /teachers` |
| routes/items.js | Added routes | `GET /owners`, `GET /by-owner/:ownerId` |
| routes/borrowRequests.js | Added routes | `GET /teacher-pending`, `GET /teacher-history` |
| routes/borrowRequests.js | Modified | Relaxed auth on POST, approve, reject to allow teacher access |

## Frontend Changes

| File | Change | Details |
|------|--------|---------|
| App.vue | Modified | Separate nav for admin/operator/teacher/student; added routing for 3 new pages |
| utils/services.js | Added | `getItemsByOwner`, `getItemOwners`, `getTeacherPendingRequests`, `getTeacherRequestHistory`, full userService CRUD, `deleteLogs` |
| pages/ManageAccountsPage.vue | New file | Admin account management with teacher/student role support |
| pages/MyItemsPage.vue | New file | View items owned by current user |
| pages/TeacherRequestsPage.vue | New file | Teacher approve/reject requests for their items |

## Cleanup

| Action | Details |
|--------|---------|
| Deleted folder | `Desktop/COMP4117-Inventory-master/` (full duplicate project uploaded by teammate) |
