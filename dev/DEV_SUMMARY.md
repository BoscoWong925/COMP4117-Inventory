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

## Dashboard Operations Redesign — 2025-07-20

Completely redesigned the admin/operator dashboard (`HomePage.vue`) from a KPI analytics layout to an **inventory operations dashboard** focused on actionable workflow items.

### Architecture Changes

| Section | Old Design | New Design |
|---|---|---|
| Header | Simple title + date | Title + date + summary sentence + quick action buttons (Review Requests, Add Item) |
| Summary Cards | 5 metric cards (Total, Available, Checked Out, Missing, Disposed) | 4 **operational** cards: Requests Waiting, Returns Follow-up, Inventory Available, Inventory Exceptions — each with sub-metrics |
| Main Content | Separate tabbed tables (Overdue, Due Soon, Pending, Warranty) | Unified **"Needs Attention" table** merging all action items with Type/Item/User/Status/Due/Priority/Action columns |
| Sidebar | None | New right-column sidebar: Inventory Status bar chart, Recent Activity feed, Quick Actions grid |
| Calendar | Standalone section | Preserved as collapsible card |
| Modals | Inline approve/reject | Preserved — now uses shadcn-vue Card, Button components |

### Key Technical Details

| # | Change | Details |
|---|---|---|
| 1 | **shadcn-vue integration** | Card, Badge, Button components used throughout admin view; lucide-vue-next icons (14 icons imported) |
| 2 | **Unified attention table** | `attentionItems` computed merges overdue returns, due-soon returns, pending requests, pending checkouts, missing items, and warranty-expired items into a single sorted list (priority: High → Medium → Low) |
| 3 | **Attention filter tabs** | All / Returns / Requests / Inventory — filter the unified table by category |
| 4 | **4 operational summary cards** | Requests Waiting (pending + checkout + long-wait >3d), Returns Follow-up (overdue + due today + due ≤7d), Inventory Available (available + in-use + unavailable + rate%), Inventory Exceptions (missing + disposed + warranty alerts) |
| 5 | **Inventory status sidebar** | Horizontal bar chart showing Available/In-use/Missing/Not Available/Transferred/Disposed counts with proportional bars |
| 6 | **Recent activity feed** | Audit logs (filtered: no LOGIN/LOGOUT) with action badges, entity names, relative timestamps |
| 7 | **New computed properties** | `summaryText`, `dueTodayCount`, `pendingPureCount`, `pendingCheckoutCount`, `longWaitCount`, `notAvailableCount`, `transferredCount`, `warrantyAlertCount`, `exceptionCount`, `availabilityRate`, `inventoryStatusBars`, `attentionItems`, `filteredAttentionItems`, `attentionFilterTabs` |
| 8 | **New helpers** | `relativeTime()` (just now / Xm ago / Xh ago / Xd ago), `getLogVariant()` (action → Badge variant), `formatAction()` (snake_case → Title Case) |
| 9 | **2-column responsive layout** | CSS Grid: single column on mobile, `1fr 300px` on ≥1024px |
| 10 | **Teacher & Student views** | Preserved unchanged |

### Status Color Standardization

| Status | Color Token | Badge Variant |
|---|---|---|
| Available | `--success` | `success` |
| In-use | `--info` | `info` |
| Missing | `--danger` | `destructive` |
| Not Available | `--warning` | `warning` |
| Transferred | `--surface-400` | `default` |
| Dispose | `--muted-foreground` | `outline` |
| Pending | `--warning` | `warning` |
| Pending Check-Out | `--info` | `info` |
| Approved / Returned | `--success` | `success` |
| Rejected / Overdue | `--danger` | `destructive` |

### Build Output
- CSS: 75.54 KB (13.96 KB gzipped)
- JS: 1,170.95 KB (358.19 KB gzipped)
- Build time: ~5s
