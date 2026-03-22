# Dev Summary

- Added a user dropdown settings section with theme preference, compact layout, and reduced motion options.
- Persisted settings in localStorage and applied system theme changes when selected.
- Wired layout classes and motion controls to the app shell for immediate UI updates.
- Added 1.2 Route Protection test cases in dev/SECURITY_TEST_CASES.md.

## Email Automation Update — 2025-07-18

| # | File Changed | Description | Future Consideration |
|---|---|---|---|
| 1 | `backend/utils/emailService.js` | Rewrote: 2 → 12 email functions (new request, checkout, return, deny, status change, welcome, deactivate, activate, role change, custom) | Add HTML templates; rate-limit bulk sends |
| 2 | `backend/controllers/borrowRequestController.js` | Added email triggers: new request → owner+operators; checkout → borrower; return → owner+operators; deny → borrower | Batch digest for high-volume requests |
| 3 | `backend/controllers/itemController.js` | Email on item status change → owner + operators (excl. changer) | Notify borrower if item is currently lent |
| 4 | `backend/controllers/userController.js` | Fixed 4 broken `addAuditLog` calls (object → positional args); added email: welcome, role change, activate/deactivate; added `sendEmailToUser` endpoint | — |
| 5 | `backend/routes/users.js` | Added `POST /api/users/send-email` route (permission checked in controller for teacher access) | Add rate limiting |
| 6 | `frontend/src/utils/services.js` | Added `userService.sendEmail()` method | — |
| 7 | `frontend/src/components/SendEmailModal.vue` | New reusable modal: subject + message, validation, loading/success/error states | Rich-text editor; file attachments |
| 8 | `frontend/src/pages/ManageAccountsPage.vue` | Added ✉ email button per user row + SendEmailModal | — |
| 9 | `frontend/src/pages/ApproveRequestsPage.vue` | Added ✉ email button in pending & checkout tabs + SendEmailModal | — |
| 10 | `frontend/src/pages/TeacherRequestsPage.vue` | Added ✉ email button in pending & checkout tabs + SendEmailModal | — |
| 11 | `frontend/src/pages/LentOutFilterPage.vue` | Added ✉ email button next to Return + SendEmailModal | — |
