# Frontend Submission Reliability Test Cases (Detailed)

This report focuses on high-risk request-submission behaviors in `NewBorrowRequestPage.vue`, especially duplicate submissions and interrupted submissions (refresh/close/offline).

---

## 1) Scope

- Feature under test: **Student request submission**
- Frontend page: `frontend/src/pages/NewBorrowRequestPage.vue`
- API endpoint: `POST /api/borrow-requests`
- Verification endpoint: `GET /api/borrow-requests/my?pageSize=1000`

---

## 2) Shared Example Data

Use the same baseline data for all cases unless stated otherwise.

- Student account:
  - `username`: `s00123456`
  - `password`: `Student123!`
  - `userId`: `S00123456`
- Borrowable item:
  - `itemID`: `INV-013`
  - `name`: `Dell Latitude 7420`
  - `status`: `Available`
- Request payload (JSON mode):

```json
{
  "itemID": "INV-013",
  "reason": "COMP4117 Lab Demo Week 7"
}
```

- If testing parent + component auto-create:
  - Parent item: `INV-020`
  - `fixedComponents`: `["INV-021", "INV-022"]`

---

## 3) Detailed Checklist

### [ ] TC-FE-SUB-001 — Double-click on **Submit Request**

**Goal**: Ensure one user action cannot create duplicate parent requests.

**Steps**
1. Login as student.
2. Open `New Borrow Request` page and select `INV-013`.
3. Enter reason: `COMP4117 Lab Demo Week 7`.
4. Open DevTools Network tab and enable **Preserve log**.
5. Double-click the **Submit Request** button within 200 ms.

**Expected Result (Frontend)**
- Button becomes disabled after first click.
- Only one loading state and one success message appear.
- No second submit is accepted until first completes.

**Expected Result (API/DB)**
- Exactly **1** `POST /api/borrow-requests` request is sent.
- Exactly **1** new parent request for `(borrowerID=S00123456, itemID=INV-013, status=Pending)` is created.
- `GET /api/borrow-requests/my?pageSize=1000` increases by **+1** record only.

**Failure Signal**
- Two `POST` calls observed or two new requests exist with near-identical `requestDate` and same `itemID`.

**Current Risk in This Codebase**
- `handleSubmitRequest` has no in-flight lock (no `isSubmitting` guard), so duplicate clicks can create duplicate requests.

---

### [ ] TC-FE-SUB-002 — Rapid repeated click spam (10 clicks)

**Goal**: Validate anti-spam behavior under aggressive user input.

**Steps**
1. Repeat setup from TC-FE-SUB-001.
2. Click submit button 10 times rapidly using mouse macro or keyboard automation.

**Expected Result (Frontend)**
- First click is accepted; subsequent clicks are ignored while request is pending.
- UI remains stable (no multiple banners, no crash).

**Expected Result (API/DB)**
- Exactly **1** request created.

**Failure Signal**
- Multiple requests inserted for same user/item/reason.

---

### [ ] TC-FE-SUB-003 — Click submit, then immediate page refresh

**Goal**: Ensure request is not silently lost when user refreshes during in-flight network call.

**Steps**
1. In browser DevTools, set network to **Slow 3G**.
2. Submit request for `INV-013`.
3. Immediately press refresh (`Cmd+R`) within 300 ms.
4. Re-login if needed and open `My Borrowing Record`.

**Expected Result (Product Behavior)**
- Request outcome is deterministic and visible to user after reload.
- Acceptable outcomes:
  1. Request was already accepted by server -> appears once in history.
  2. Request was not accepted -> UI recovers unsent draft and prompts re-submit.

**Expected Result (API/DB)**
- Never create duplicate records from one user action.
- Never silently drop user intent without clear recovery prompt.

**Failure Signal**
- User clicked submit, refreshed, and final result is unclear/no request + no recovery message.

**Current Risk in This Codebase**
- No pending-request persistence or recovery mechanism is implemented in `NewBorrowRequestPage.vue`.

---

### [ ] TC-FE-SUB-004 — Submit then close browser tab immediately

**Goal**: Validate behavior when the page lifecycle is terminated.

**Steps**
1. Use normal network.
2. Click submit.
3. Immediately close tab/window.
4. Re-open app and check `My Borrowing Record`.

**Expected Result**
- Request is either created exactly once, or clearly not created with user-visible re-submit guidance.
- No duplicate records.

**Failure Signal**
- Inconsistent behavior across attempts with no user feedback (sometimes created, sometimes lost, no indication).

---

### [ ] TC-FE-SUB-005 — Timeout then manual re-submit

**Goal**: Prevent duplicate requests from retry after uncertain network state.

**Steps**
1. Use network throttling / proxy to force first `POST /api/borrow-requests` to timeout on client.
2. User clicks submit again after seeing timeout/error.
3. Check final request list.

**Expected Result**
- System ensures idempotent outcome: only one logical request is stored.
- If first request actually succeeded on server, second submit should be rejected as duplicate or mapped to same operation.

**Example Duplicate Key (recommended design)**
- `idempotencyKey`: `S00123456-INV-013-20260318T121500Z`

**Failure Signal**
- Two requests created after timeout + retry.

---

### [ ] TC-FE-SUB-006 — Two browser tabs submit same item concurrently

**Goal**: Handle multi-tab race from same user account.

**Steps**
1. Open app in Tab A and Tab B with same student session.
2. In both tabs, choose `INV-013` with same reason.
3. Click submit in both tabs within 1 second.

**Expected Result**
- One request succeeds; second is blocked as duplicate/in-flight conflict.
- User gets clear message in second tab (e.g., "A similar request is already pending").

**Failure Signal**
- Two separate pending requests are created for same user and same item nearly simultaneously.

---

### [ ] TC-FE-SUB-007 — Parent item with fixed components + double submit

**Goal**: Prevent duplicate cascade creation for parent-child request sets.

**Example Data**
- Parent item: `INV-020`
- Components: `INV-021`, `INV-022`
- Reason: `Capstone demo setup`

**Steps**
1. Select parent item `INV-020`.
2. Double-click submit quickly.

**Expected Result**
- Exactly one request set is created:
  - 1 parent request for `INV-020`
  - 2 child requests for `INV-021`, `INV-022`
- Total created from action = **3**, not **6**.

**Failure Signal**
- Duplicate parent and duplicated child cascades are created.

---

### [ ] TC-FE-SUB-008 — User refreshes after successful submit banner appears

**Goal**: Ensure post-submit consistency while page still in temporary UI state.

**Steps**
1. Submit once successfully (success banner visible).
2. Refresh page before 3-second UI reset timer ends.
3. Go to `My Borrowing Record`.

**Expected Result**
- Request remains persisted and visible exactly once in history.
- No additional request generated by refresh.

**Failure Signal**
- Missing request after success message, or duplicate request appears.

---

## 4) Acceptance Criteria for This Feature

Mark this section pass only if all are true:

- [ ] A single user intent produces **at most one** logical request set.
- [ ] Refresh/close during submission never causes silent data loss without user recovery.
- [ ] Retry flows (timeout/offline/reconnect) do not create duplicates.
- [ ] Multi-tab concurrency does not create duplicate pending requests for same user+item.
- [ ] For parent items with components, cascade creation is atomic and non-duplicated.

---

## 5) Notes from Current Implementation Review

Based on current code in `frontend/src/pages/NewBorrowRequestPage.vue` and `backend/controllers/borrowRequestController.js`:

- Frontend currently has no `isSubmitting` lock to disable repeated clicks.
- Backend `createRequest` checks item availability and `Pending Check-Out`, but does **not** enforce idempotency for same user/item rapid duplicates while item remains `Available`.
- Therefore TC-FE-SUB-001/002/006/007 are high-priority and likely to expose duplicate-request risk.