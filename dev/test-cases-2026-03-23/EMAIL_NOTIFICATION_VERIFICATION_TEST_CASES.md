# Email Notification Verification Test Cases

This document verifies email notification behavior across workflow triggers, delivery success/failure, audit logging, and fallback behavior.

## 1. Scope and Test Preparation

- Target backend modules: `borrowRequestController.js`, `userController.js`, `itemController.js`, `emailService.js`.
- Validate both functional outcome (business action success/failure) and observability outcome (audit log records).
- Prepare three environment modes for repeatable tests:
  1. **SMTP Valid**: correct `SMTP_HOST/PORT/USER/PASS/FROM`.
  2. **SMTP Disabled**: missing SMTP env (expect `skipped` in email service).
  3. **SMTP Broken**: wrong credential/host/port (expect transport/auth error).
- Use Audit Log page filters by action (`EMAIL_SENT`, `EMAIL_FAILED`, `EMAIL_SKIPPED`) and target record.

## 2. Workflow Trigger Coverage (What triggers email)

| Test Case ID | Description | Steps to Reproduce | Correct Result | Wrong Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-EM-001 | **New borrow request triggers notification** | 1. Use student account to create a new borrow request.<br>2. Keep SMTP Valid. | Request is created successfully; recipients (item owner/operators) receive new-request email; audit includes `EMAIL_SENT` for that request context. | Request created but no email delivered and no failure/skipped observability. | [ ] |
| TC-EM-002 | **Approve request triggers approval email** | 1. Approve a `Pending` request as authorized approver.<br>2. SMTP Valid. | Status changes to `Pending Check-Out`; borrower receives approval email; audit has `EMAIL_SENT`. | Status changes but no email and no audit evidence. | [ ] |
| TC-EM-003 | **Reject request triggers rejection email** | 1. Reject a `Pending` request with reason.<br>2. SMTP Valid. | Status becomes `Rejected`; borrower receives rejection email with reason; audit has `EMAIL_SENT`. | Rejection happens but email missing or missing audit. | [ ] |
| TC-EM-004 | **Checkout triggers checkout email** | 1. Checkout a `Pending Check-Out` request.<br>2. SMTP Valid. | Request becomes `Approved`; borrower receives checkout confirmation email; audit has `EMAIL_SENT`. | Checkout succeeds but no notification or no trace. | [ ] |
| TC-EM-005 | **Return triggers return email** | 1. Return an `Approved` request.<br>2. SMTP Valid. | Request becomes `Returned`; owner/operators are notified; audit has `EMAIL_SENT`. | Return succeeds but no return notification and no trace. | [ ] |
| TC-EM-006 | **Deny checkout triggers denial email** | 1. Deny a `Pending Check-Out` request with reason.<br>2. SMTP Valid. | Request becomes `Rejected`; borrower receives denial email; audit has `EMAIL_SENT`. | Denial succeeds with no borrower notification or no trace. | [ ] |
| TC-EM-007 | **User creation triggers welcome email** | 1. Admin creates new user.<br>2. SMTP Valid. | User creation succeeds; welcome email received by new user. | User created but welcome email missing without clear handling. | [ ] |
| TC-EM-008 | **Role change triggers role-change email** | 1. Admin edits user role/subRole.<br>2. SMTP Valid. | Update succeeds; user receives role-changed email. | Role updated but user not informed. | [ ] |
| TC-EM-009 | **Account deactivation triggers deactivation email** | 1. Admin disables active user.<br>2. SMTP Valid. | User status changes to inactive; deactivation email received. | Account disabled without notification. | [ ] |
| TC-EM-010 | **Account activation triggers activation email** | 1. Admin enables inactive user.<br>2. SMTP Valid. | User status changes to active; activation email received. | Account enabled without notification. | [ ] |
| TC-EM-011 | **Item status change triggers status-change email** | 1. Change item status (e.g., Available -> In-use) as authorized actor.<br>2. SMTP Valid. | Status updates successfully; owner/operators (excluding actor) receive status-change email. | Item status changed but intended recipients not notified. | [ ] |
| TC-EM-012 | **Send custom email (manual)** | 1. Open Send Email flow in account management.<br>2. Send valid subject/message to valid recipient with SMTP Valid. | API returns success true; recipient receives custom email; audit contains `EMAIL_SENT` for custom email. | API shows success but email not received or no audit record. | [ ] |

## 3. Successful Delivery Validation (Content and recipients)

| Test Case ID | Description | Steps to Reproduce | Correct Result | Wrong Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-EM-013 | **Subject/body correctness - approval template** | Approve request and inspect received email. | Subject and body identify request/item/actor context correctly and are readable (no placeholder leakage). | Wrong template used, placeholders unresolved, or missing key context. | [ ] |
| TC-EM-014 | **Subject/body correctness - rejection with reason** | Reject with explicit reason and inspect email. | Reason appears correctly in email content. | Reason omitted, garbled, or incorrect. | [ ] |
| TC-EM-015 | **Recipient set correctness - new request** | Create request for item with owner + operators configured. | Recipients include owner and operators per design; borrower is not incorrectly added unless required. | Missing required recipients or sending to unintended users. | [ ] |
| TC-EM-016 | **No self-notification for item status change actor** | Change item status as user who could otherwise be in recipient set. | Acting user is excluded from recipient list for status-change email. | Actor receives redundant self-notification. | [ ] |
| TC-EM-017 | **Dedup recipients in multi-role overlap** | Use user that is both possible owner and operator candidate; trigger item status email. | Each email address receives at most one message per event. | Duplicate emails sent to same recipient for one action. | [ ] |

## 4. Failure Scenarios (SMTP, credential, and invalid target)

| Test Case ID | Description | Steps to Reproduce | Correct Result | Wrong Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-EM-018 | **SMTP authentication failure on approval email** | Set wrong SMTP credential, then approve request. | Business action still succeeds (`Pending Check-Out`); email send fails; audit includes `EMAIL_FAILED` with failure detail. | Action is rolled back unexpectedly, or failure is silent with no audit trail. | [ ] |
| TC-EM-019 | **SMTP host/port failure on rejection email** | Set invalid SMTP host/port, then reject request. | Rejection succeeds; `EMAIL_FAILED` audit logged. | Rejection blocked entirely or silent failure. | [ ] |
| TC-EM-020 | **SMTP timeout on checkout email** | Simulate SMTP timeout during checkout. | Checkout succeeds; `EMAIL_FAILED` audit logged for checkout email path. | Checkout becomes inconsistent, hangs indefinitely, or no error trace. | [ ] |
| TC-EM-021 | **Missing recipient email in workflow recipient set** | Ensure some potential recipients have blank email; trigger new-request or return notification. | Send attempts skip invalid recipients implicitly; flow continues; valid recipients still receive email if available. | Entire notification flow crashes due to one invalid recipient. | [ ] |
| TC-EM-022 | **Custom email recipient user has no email** | Call custom send for user with empty email field. | API returns clear bad request (recipient has no email), no send attempt, no false success. | API returns success or generic unclear error. | [ ] |
| TC-EM-023 | **Custom email missing required fields** | Omit subject or message in custom send request. | API rejects with clear validation error; no send attempt. | API accepts empty content or crashes. | [ ] |
| TC-EM-024 | **Custom email SMTP failure behavior** | Set broken SMTP and send custom email. | API returns handled error path (non-success response); operation does not create false `EMAIL_SENT`. | API reports success despite SMTP failure. | [ ] |

## 5. Fallback Behavior (SMTP not configured / skipped)

| Test Case ID | Description | Steps to Reproduce | Correct Result | Wrong Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-EM-025 | **Approval email fallback when SMTP disabled** | Remove SMTP env, approve request. | Approval business transition still succeeds; audit includes `EMAIL_SKIPPED` for approval with reason. | Approval blocked by missing SMTP, or no operational/audit visibility. | [ ] |
| TC-EM-026 | **Rejection email fallback when SMTP disabled** | Remove SMTP env, reject request. | Rejection still succeeds; audit includes `EMAIL_SKIPPED` with reason. | Rejection blocked or skipped silently. | [ ] |
| TC-EM-027 | **Checkout email fallback when SMTP disabled** | Remove SMTP env, checkout request. | Checkout still succeeds; no `EMAIL_SENT`; verify whether skip is recorded per current implementation policy. | Checkout fails due to SMTP disabled. | [ ] |
| TC-EM-028 | **Return email fallback when SMTP disabled** | Remove SMTP env, return request. | Return still succeeds; no false success notification; verify audit behavior matches implemented policy. | Return fails because SMTP disabled. | [ ] |
| TC-EM-029 | **Deny-checkout fallback when SMTP disabled** | Remove SMTP env, deny checkout request. | Deny action still succeeds; no false `EMAIL_SENT`; verify skip handling per implementation. | Deny action blocked by missing SMTP. | [ ] |
| TC-EM-030 | **Welcome/role/status email fallback when SMTP disabled** | Remove SMTP env, then create user / change role / toggle status. | Core account action succeeds; email is skipped without crashing; no false success message to user about actual email delivery. | Account action fails solely because SMTP absent. | [ ] |
| TC-EM-031 | **Custom email fallback when SMTP disabled** | Remove SMTP env, call send custom email. | API returns `success: false` with explicit skip reason; no `EMAIL_SENT` audit record. | API returns success true or misleading success message. | [ ] |

## 6. Audit Log Verification for Email Events

| Test Case ID | Description | Steps to Reproduce | Correct Result | Wrong Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-EM-032 | **`EMAIL_SENT` recorded on successful request notifications** | Trigger each successful request flow with SMTP Valid (new/approve/reject/checkout/return/deny). | Corresponding `EMAIL_SENT` records appear where implemented, with correct actor and item/request context. | Sent email but no `EMAIL_SENT`, or wrong actor/target mapping. | [ ] |
| TC-EM-033 | **`EMAIL_FAILED` recorded on send exception** | Trigger broken SMTP in request flows and account flows. | `EMAIL_FAILED` record exists with actionable message and related target ID. | Failure happened but no audit evidence. | [ ] |
| TC-EM-034 | **`EMAIL_SKIPPED` recorded where implemented (approve/reject)** | Disable SMTP and run approve/reject paths. | `EMAIL_SKIPPED` appears for these flows with skip reason text. | Missing `EMAIL_SKIPPED` for approve/reject when SMTP disabled. | [ ] |
| TC-EM-035 | **No false `EMAIL_SENT` on skipped/failure** | Run SMTP disabled and SMTP broken scenarios across all triggers. | Audit never shows `EMAIL_SENT` for events that were skipped/failed. | `EMAIL_SENT` incorrectly logged despite no successful send. | [ ] |
| TC-EM-036 | **Audit chronology integrity** | Perform one action that writes business audit + email audit. | Business action log and email log are both present and time ordering is sensible (email event near action time). | Missing pair or inconsistent chronological ordering. | [ ] |

## 7. End-to-End Resilience and Defect-Oriented Checks

| Test Case ID | Description | Steps to Reproduce | Correct Result | Wrong Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-EM-037 | **Business action should not rollback due to email failure** | Trigger SMTP broken in create request/approve/reject/checkout/return/deny/create user/toggle status. | Primary business transaction is committed; user-facing operation result reflects business success while email failure is observable via audit. | Business transaction is rolled back or left inconsistent because of email exception. | [ ] |
| TC-EM-038 | **Partial-recipient robustness** | Use recipient set where some emails valid and some invalid; trigger item status change/new request. | Valid recipients still receive message (or controlled partial failure strategy is applied); system remains stable. | All deliveries fail due to one bad recipient without clear handling. | [ ] |
| TC-EM-039 | **Email observability gap detection (known risk check)** | Run SMTP disabled on flows without explicit `EMAIL_SKIPPED` logging (e.g., checkout/return/deny/new request/user status/item status). | If no skip audit is produced, record as defect/observability gap for standardization decision. | Team assumes skip is logged everywhere and misses blind spots. | [ ] |
| TC-EM-040 | **Custom email exception handling completeness** | Force exception in custom email send path (broken SMTP) and inspect API + audit outcome. | API returns controlled error and does not report false success; audit policy is consistent and documented. | Unhandled behavior causes unclear response or missing observability. | [ ] |

## 8. Requirement Traceability

- Trigger workflows covered: TC-EM-001 to TC-EM-012.
- Success-send verification covered: TC-EM-013 to TC-EM-017.
- Failure scenarios (credential/SMTP/validation): TC-EM-018 to TC-EM-024.
- Fallback behavior verification: TC-EM-025 to TC-EM-031.
- Audit log expectations: TC-EM-032 to TC-EM-036.
- Overall resilience and gap detection: TC-EM-037 to TC-EM-040.


