# Accounts Management Test Cases


This document outlines the test cases for the account management features, primarily handled in `ManageAccountsPage.vue`.

## 1. Account Creation

| Test Case ID | Description | Steps to Reproduce | Expected Result | Incorrect Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-AM-001 | **Create a new student account** | 1. Navigate to "Manage Accounts".<br>2. Click "Add New Account".<br>3. Fill in all required fields, selecting "Student" as the role.<br>4. Click "Create Account". | A success message appears. The new student account is visible in the user list with the correct details and "Student" role. An audit log entry for `USER_CREATED` is generated. A welcome email is sent. | The account is not created. An error message is unclear. The role is incorrect. No audit log or email is generated. | [ ] |
| TC-AM-002 | **Create a new teacher account** | 1. Navigate to "Manage Accounts".<br>2. Click "Add New Account".<br>3. Fill in all required fields, selecting "Teacher" as the role.<br>4. Click "Create Account". | A success message appears. The new account is in the list with the "Teacher" role. An audit log for `USER_CREATED` is generated. A welcome email is sent. | The account is not created. The role is incorrect. | [ ] |
| TC-AM-003 | **Create an admin/operator account** | 1. Follow steps for TC-AM-001, but select "Admin" or "Operator" as the role. | The new account is created with the correct administrative role. An audit log and welcome email are generated. | The role is not assigned correctly. | [ ] |
| TC-AM-004 | **Create user with existing ID/Username/Email** | 1. Attempt to create a new user with a `userId`, `username`, or `email` that already exists. | The form submission fails. A clear error message is displayed, e.g., "User with this userId already exists". | The system creates a duplicate user or shows a generic error. | [ ] |
| TC-AM-005 | **Create user with missing required fields** | 1. Attempt to create a user without filling in a required field (e.g., Name, Password). | The form prevents submission. HTML5 validation or a custom alert indicates the missing field. | The form submits and causes a backend error. | [ ] |
| TC-AM-006 | **Cancel account creation** | 1. Open the "Create New Account" form.<br>2. Click the "Cancel" or "Back" button. | The form closes, and the user is returned to the account list. No account is created. | The form does not close, or a partially-filled account is created. | [ ] |

## 2. Account Editing

| Test Case ID | Description | Steps to Reproduce | Expected Result | Incorrect Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-AM-007 | **Edit user's name and department** | 1. In the user list, click "Edit" for a specific user.<br>2. Change the user's "Name" and "Department".<br>3. Click "Update Account". | A success message appears. The user's information is updated in the list. An audit log for `USER_UPDATED` is generated. | The information is not saved. The list does not reflect the change. | [ ] |
| TC-AM-008 | **Change a user's role** | 1. Edit a "Student" account.<br>2. Change the "Role" to "Teacher".<br>3. Click "Update Account". | The user's role is updated in the list. An audit log for `USER_UPDATED` is generated. A "Role Changed" email is sent to the user. | The role is not changed. No email is sent. | [ ] |
| TC-AM-009 | **Change a user's password** | 1. Edit a user account.<br>2. Enter a new password in the "New Password" field.<br>3. Click "Update Account". | The user can log in with the new password. The old password no longer works. An audit log for `USER_UPDATED` is generated. | The password is not updated. | [ ] |
| TC-AM-010 | **Update user without changing password** | 1. Edit a user account.<br>2. Make a change (e.g., to Department) but leave the "New Password" field blank.<br>3. Click "Update Account". | The user's department is updated, but their password remains unchanged. | The user's password is accidentally erased or changed. | [ ] |
| TC-AM-011 | **Attempt to edit immutable fields** | 1. Edit a user account. | The `userId` and `username` fields in the form should be disabled and not editable. | The `userId` or `username` fields are editable. | [ ] |

## 3. Account Status (Activation/Deactivation)

| Test Case ID | Description | Steps to Reproduce | Expected Result | Incorrect Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-AM-012 | **Disable an active account** | 1. Find an "Active" user in the list.<br>2. Click the "Disable" button. | The user's status changes to "Inactive". The user can no longer log in. An audit log for `USER_DEACTIVATED` is generated. An "Account Deactivated" email is sent. | The status does not change. The user can still log in. | [ ] |
| TC-AM-013 | **Enable an inactive account** | 1. Find an "Inactive" user in the list.<br>2. Click the "Enable" button. | The user's status changes to "Active". The user can now log in. An audit log for `USER_ACTIVATED` is generated. An "Account Activated" email is sent. | The status does not change. The user cannot log in. | [ ] |
| TC-AM-014 | **Bulk disable accounts** | 1. Select multiple active users using the checkboxes.<br>2. Click the "Disable (X)" button.<br>3. Confirm in the modal. | All selected users are changed to "Inactive". Audit logs and emails are generated for each user. | Not all users are disabled. An error occurs. | [ ] |
| TC-AM-015 | **Bulk enable accounts** | 1. Select multiple inactive users using the checkboxes.<br>2. Click the "Enable (X)" button.<br>3. Confirm in the modal. | All selected users are changed to "Active". Audit logs and emails are generated for each user. | Not all users are enabled. An error occurs. | [ ] |

## 4. Account Deletion

| Test Case ID | Description | Steps to Reproduce | Expected Result | Incorrect Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-AM-016 | **Delete an account** | 1. Click "Delete" for a user.<br>2. In the confirmation modal, click "Delete". | A success message appears. The user is permanently removed from the list and the database. An audit log for `USER_DELETED` is generated. | The user is not removed. An error occurs. | [ ] |
| TC-AM-017 | **Cancel deletion** | 1. Click "Delete" for a user.<br>2. In the confirmation modal, click "Cancel". | The modal closes. The user is not deleted. | The user is accidentally deleted. | [ ] |
| TC-AM-018 | **Bulk delete accounts** | 1. Select multiple users.<br>2. Click "Delete (X)".<br>3. Confirm in the modal. | All selected users are permanently deleted. Audit logs are generated for each. | Not all users are deleted. An error occurs. | [ ] |

## 5. List Filtering, Searching, and Pagination

| Test Case ID | Description | Steps to Reproduce | Expected Result | Incorrect Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-AM-019 | **Search by name/ID/email** | 1. In the "Search" input, type a partial name, ID, or email of a user. | The list dynamically filters to show only users matching the search query. | The list does not filter, or filters incorrectly. | [ ] |
| TC-AM-020 | **Filter by role** | 1. Select a role (e.g., "Teacher") from the "Role" dropdown. | The list filters to show only users with that role. | The list shows users with other roles. | [ ] |
| TC-AM-021 | **Filter by status** | 1. Select a status (e.g., "Inactive") from the "Status" dropdown. | The list filters to show only users with that status. | The list shows users with other statuses. | [ ] |
| TC-AM-022 | **Combined search and filters** | 1. Enter a search term.<br>2. Select a role.<br>3. Select a status. | The list filters to show only users that match all criteria. | The filters conflict or do not apply correctly. | [ ] |
| TC-AM-023 | **Clear filters** | 1. Apply several filters.<br>2. Click the "Clear All" button. | All filter inputs are reset, and the list returns to its default state. | Filters are not cleared. | [ ] |
| TC-AM-024 | **Pagination** | 1. On a list with more users than the page size, use the pagination controls. | The list correctly navigates between pages of users. | Pagination does not work. | [ ] |
| TC-AM-025 | **Select All / Deselect All** | 1. Click the checkbox in the table header. | All users on the current page are selected. Clicking it again deselects all of them. | The selection logic is flawed. | [ ] |

## 6. UI/UX and Error Handling

| Test Case ID | Description | Steps to Reproduce | Expected Result | Incorrect Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-AM-026 | **Modal behavior** | 1. Trigger various modals (Delete, Bulk Disable, etc.). | The modal appears centered with an overlay. It can be closed with the "Cancel" button. Actions are only performed after confirmation. | The modal is misplaced, does not block background interaction, or cannot be closed. | [ ] |
| TC-AM-027 | **Error message display** | 1. Force an error (e.g., by trying to create a user that violates a backend rule not caught by the frontend). | A clear, user-friendly error message is displayed (e.g., in a toast/notification). | A cryptic error code is shown, or the UI crashes. | [ ] |
| TC-AM-028 | **Empty state** | 1. Filter the list so that no users are found. | The table is hidden, and a message like "No accounts found" is displayed. | An empty table is shown without a message. | [ ] |
| TC-AM-029 | **Send Email Modal** | 1. Click the email icon (✉) for a user. | The "Send Email" modal opens, pre-filled with the user's details. | The modal does not open or has incorrect recipient information. | [ ] |

## 7. Error Prompt Deep Validation (錯誤提示)

| Test Case ID | Description | Steps to Reproduce | Expected Result | Incorrect Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-AM-030 | **Backend duplicate conflict message mapping** | 1. Create account using an existing userId.<br>2. Repeat with existing username/email. | UI shows meaningful conflict message from API (e.g., "already exists") and does not close the form. | UI shows generic "Error" only, wrong message, or closes form as if success. | [ ] |
| TC-AM-031 | **Network/API failure on load list** | 1. Simulate API unavailability when opening Manage Accounts page. | UI shows failure notice (e.g., "Failed to load accounts") and remains responsive. | Blank screen, crash, or no feedback shown. | [ ] |
| TC-AM-032 | **Network/API failure on create** | 1. Fill valid create form.<br>2. Simulate server/network failure on submit. | Error toast is displayed, form data remains for retry, no new row appears in table. | Silent failure, lost form data, or false success message shown. | [ ] |
| TC-AM-033 | **Network/API failure on update** | 1. Edit user and submit with simulated failure. | Error toast shown, original user values remain unchanged after refresh. | UI shows success or temporarily shows changed data that is not persisted. | [ ] |
| TC-AM-034 | **Network/API failure on toggle status** | 1. Click Disable/Enable with simulated failure. | Error message shown, user status badge remains unchanged. | Status appears changed in UI despite failed API call. | [ ] |
| TC-AM-035 | **Network/API failure on delete** | 1. Confirm delete with simulated failure. | Error message shown, row remains in table, modal closes or remains with clear retry path. | Row disappears without backend deletion or no feedback appears. | [ ] |
| TC-AM-036 | **Client-side required validation messages** | 1. In create form leave required fields empty.<br>2. Click submit. | Browser/form validation blocks submission; user sees field-level required hints. | API request still sent, producing avoidable backend errors. | [ ] |
| TC-AM-037 | **Password required for new account only** | 1. Create mode: leave password blank and submit.<br>2. Edit mode: leave password blank and submit other changes. | Create mode blocks and warns password required; edit mode allows submit without resetting password. | Create mode allows blank password, or edit mode incorrectly rejects blank password. | [ ] |
| TC-AM-038 | **Error recovery flow after failure** | 1. Trigger any failure (create/update).<br>2. Correct data or restore API and retry. | Retry succeeds without page reload; old error message is replaced by success feedback. | User must refresh page; stale error message persists after success. | [ ] |

## 8. Audit Log Verification (audit log 是否有紀錄)

| Test Case ID | Description | Steps to Reproduce | Expected Result | Incorrect Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-AM-039 | **Audit log for create account** | 1. Create a new account.<br>2. Open Audit Log page and filter by actor/target. | Exactly one new record with action `USER_CREATED`, correct actor userID, affected userID, and readable detail message. | No log created, wrong action type, wrong actor/target, or vague detail. | [ ] |
| TC-AM-040 | **Audit log for update account** | 1. Edit existing account (name/department).<br>2. Check Audit Log. | New `USER_UPDATED` record exists with correct actor and affected account. | Missing record or mismatched target user. | [ ] |
| TC-AM-041 | **Audit log for role change** | 1. Change role student → teacher (or reverse).<br>2. Check Audit Log. | `USER_UPDATED` record exists (role change captured as user update) and timestamp matches operation time. | No audit record for role update. | [ ] |
| TC-AM-042 | **Audit log for disable account** | 1. Disable active account.<br>2. Check Audit Log. | One `USER_DEACTIVATED` record with correct actor and target userID. | Missing record or incorrect action label. | [ ] |
| TC-AM-043 | **Audit log for enable account** | 1. Enable inactive account.<br>2. Check Audit Log. | One `USER_ACTIVATED` record with correct actor and target userID. | Missing record or incorrect action label. | [ ] |
| TC-AM-044 | **Audit log for delete account** | 1. Delete account via modal confirm.<br>2. Check Audit Log. | One `USER_DELETED` record created after deletion with correct deleted user reference in details/affected field. | No delete audit entry or cannot identify which account was deleted. | [ ] |
| TC-AM-045 | **Audit logs for bulk operations count** | 1. Bulk disable/enable/delete N selected accounts.<br>2. Check Audit Log entries count. | N corresponding audit records are created (one per account action), not a single aggregated log only. | Fewer/more than N records or wrong action type mix. | [ ] |
| TC-AM-046 | **Audit log not created on failed operation** | 1. Force an operation to fail (e.g., duplicate create, API validation failure).<br>2. Check Audit Log. | No success-type action log (`USER_CREATED/UPDATED/...`) should be added for failed operation. | Success action logged despite operation failure. | [ ] |
| TC-AM-047 | **Audit timestamp and ordering** | 1. Perform two account actions in sequence (e.g., update then disable).<br>2. Check audit timestamps/order. | Logs appear in correct chronological order with timestamps close to action time. | Reversed ordering or inconsistent timestamps. | [ ] |
| TC-AM-048 | **Email failure logs where applicable** | 1. Simulate email send failure during create/activate/deactivate/role-change.<br>2. Check Audit Log. | Account action log still exists, plus an additional `EMAIL_FAILED` log with target user info. | Missing email-failure audit entry, or action is rolled back unexpectedly without clear log. | [ ] |


