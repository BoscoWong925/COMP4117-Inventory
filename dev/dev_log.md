# Dev Log

## 2026-03-07 — Merge teammate's duplicate project

### Stage 1: Discovery
- **Aim:** Find out what the teammate uploaded
- **How:** Listed `Desktop/COMP4117-Inventory-master/` and compared directory structure with main project
- **Result:** Found a full copy of the project with changes scattered across backend models, controllers, routes, frontend pages, and services

### Stage 2: Diff analysis
- **Aim:** Identify exactly which files differ and what changed
- **How:** Read every file in both copies side by side, compared content
- **Result:** Found 5 modified backend files, 3 modified route files, 1 modified frontend App.vue, 1 modified services.js, and 3 completely new Vue pages. All changes related to adding teacher role support

### Stage 3: Merge backend models
- **Aim:** Add new fields to User and Item schemas
- **How:** Added `subRole` to User.js, added `owner` + `canBorrow` to Item.js with indexes
- **Result:** Models updated, backward compatible (new fields have defaults)

### Stage 4: Merge backend controllers
- **Aim:** Bring in teacher logic for auth, users, items, borrow requests
- **How:** Patched authController (subRole in responses), patched userController (subRole + getTeachers), copied full itemController and borrowRequestController from teammate's version (too many scattered changes to patch)
- **Result:** All controller changes applied — teacher ownership checks, new endpoints for teacher pending/history, item owner endpoints

### Stage 5: Merge backend routes
- **Aim:** Wire up new endpoints
- **How:** Copied teammate's route files for users.js, items.js, borrowRequests.js
- **Result:** New routes live: `/teachers`, `/owners`, `/by-owner/:id`, `/teacher-pending`, `/teacher-history`. Auth relaxed on approve/reject to allow teachers

### Stage 6: Merge frontend
- **Aim:** Add new pages and update navigation
- **How:** Copied App.vue, services.js, and 3 new page files (ManageAccountsPage, MyItemsPage, TeacherRequestsPage)
- **Result:** Frontend has role-specific navigation (admin/operator/teacher/student), all new pages wired up

### Stage 7: Install and test
- **Aim:** Verify everything runs
- **How:** `npm install` in backend and frontend, started both dev servers
- **Result:** Backend running (duplicate index warnings only, non-blocking), frontend running at localhost:3000

### Stage 8: Cleanup
- **Aim:** Remove the duplicate project
- **How:** Deleted `Desktop/` folder entirely
- **Result:** Single clean project, no duplicates
