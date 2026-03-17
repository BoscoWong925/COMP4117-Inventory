# Email Automation Plan

## Current System Summary
- Backend handles auth, inventory, and borrow request workflows with audit logging.
- Borrow request state changes happen in `borrowRequestController` (approve/reject/checkout/return).
- Users already store email addresses in the User model.
- No email or notification automation exists today (frontend shows in-app badges only).

## Scope Decisions
- Provider: SMTP (Nodemailer).
- Triggers: approval and rejection only.
- Preferences: always send (no per-user opt-out).

## Implementation Plan
1. Confirm approval and rejection flows and required data fields in `backend/controllers/borrowRequestController.js`.
2. Add an email utility (SMTP) in backend utils with graceful error handling.
3. Define approval and rejection email templates with key request details (borrower, item list, request ID, dates).
4. Trigger email sends after successful approval/rejection state changes; log success/failure via `auditLogger`.
5. Add SMTP env vars and document them in `backend/README.md`.
6. Verify manually in dev and optionally add a lightweight integration test.

## Files Likely Touched
- `backend/controllers/borrowRequestController.js`
- `backend/utils/auditLogger.js`
- `backend/models/User.js`
- `backend/models/BorrowRequest.js`
- `backend/README.md`

## Verification
1. Approve a request -> approval email sent to borrower.
2. Reject a request -> rejection email sent to borrower.
3. Simulate SMTP failure -> request still succeeds; audit log records failure.

## Future Enhancements
- Add checkout/return receipts and reminder emails.
- Add user notification preferences.
- Add a queue (Bull/Agenda) for retries and scheduled sends.
