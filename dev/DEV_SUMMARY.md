# Dev Summary

- Added a user dropdown settings section with theme preference, compact layout, and reduced motion options.
- Persisted settings in localStorage and applied system theme changes when selected.
- Wired layout classes and motion controls to the app shell for immediate UI updates.
- Added 1.2 Route Protection test cases in dev/SECURITY_TEST_CASES.md.

## Requests + Inventory Module UI Refactor — 2026-04-01

Refactored the Requests and Inventory module pages to a shared shadcn-vue style shell while preserving existing backend behavior and user workflows.

### Scope Completed

- Requests module pages: Approve Requests, Borrow History
- Inventory module pages: Inventory Items, Checked-out Items
- Shared shell patterns: page header, filter panel, rows-per-page pagination footer, unified select control
- Unified loading/empty/error table states with skeleton rows and stable table shells

### File-Level Change Log

| # | File Changed | Description | Future Consideration |
|---|---|---|---|
| 1 | `frontend/src/components/ui/ModulePageHeader.vue` | Added reusable module header with title/subtitle and action slot for consistent page shells | Add optional breadcrumbs variant for deep modules |
| 2 | `frontend/src/components/ui/ModuleFilterPanel.vue` | Added reusable filter container with standardized title/clear action and slot content | Add optional collapsible mode with persisted expanded state |
| 3 | `frontend/src/components/ui/TablePaginationBar.vue` | Added reusable footer with rows-per-page selector, page indicator, and navigation controls | Support server-provided page-size options dynamically |
| 4 | `frontend/src/components/ui/Select.vue` | Added shared Select wrapper to match Input/Button shadcn-style control sizing | Add error/invalid visual state support |
| 5 | `frontend/src/components/ui/index.js` | Extended UI barrel exports with `UiSelect`, `UiModulePageHeader`, `UiModuleFilterPanel`, `UiTablePaginationBar` | Keep `Ui*` alias convention consistent across new UI primitives |
| 6 | `frontend/src/pages/ApproveRequestsPage.vue` | Rebuilt page shell with shared components, tabbed request table, bulk-action toolbar, skeleton loading, and unified pagination; preserved approve/reject/checkout/deny/email flows | Add integration test coverage for bulk paths and race conditions |
| 7 | `frontend/src/pages/BorrowHistoryPage.vue` | Rebuilt history list with shared header/filter shell, status tabs, skeleton/error/empty states, rows-per-page paging, and preserved export/delete/filter/sort behavior | Add server-side filter query snapshot tests |
| 8 | `frontend/src/pages/ManageItemsPage.vue` | Refactored inventory list view to shared shell/components, added stable skeleton/error rows, reactive page size, and selection handling with checkbox component; preserved import/export/add/edit/delete/OCR form workflow | Add optimistic update rollback for bulk delete failures |
| 9 | `frontend/src/pages/LentOutFilterPage.vue` | Refactored checked-out view to shared shell/components, grouped table with skeleton/error/empty states, reactive page size, and preserved return/bulk return/location update/email flows | Add bulk return condition/notes persistence to backend audit trail |

### Technical Notes

- Added stale-response guards for async list fetches to prevent outdated responses from overwriting current UI state.
- Reset pagination to page 1 on filter/page-size changes where applicable.
- Kept backend APIs, permissions, and existing action handlers intact.

### Validation

- Frontend Vue diagnostics: no errors on all touched pages/components.
- Frontend production build: `npm run build` successful.
- Commit and push completed: `ca7fceb9` on `master` to `origin/master`.

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

## Azure Email Migration & Validation — 2026-03-31

| # | File Changed | Description | Future Consideration |
|---|---|---|---|
| 1 | `backend/utils/emailService.js` | Replaced SMTP transport usage with Azure Communication Services client (`@azure/communication-email`); fixed method call to `beginSend`; added recipient normalization for array/comma-separated inputs | Add HTML email body and shared template helper |
| 2 | `backend/controllers/userController.js` | Corrected custom-email endpoint behavior to return server error when provider send fails (instead of false success) | Add explicit provider error code mapping for UI display |
| 3 | `backend/test-azure-email.js` | Updated smoke-test script to Azure SDK `beginSend` flow for consistency with runtime implementation | Add CLI args for subject/recipient override |
| 4 | `backend/package.json` | Removed legacy SMTP dependency (`nodemailer`) and kept Azure email SDK as single provider package | Add dependency audit and lockfile refresh in CI |
| 5 | `backend/.env` | Switched from SMTP variables to Azure variables (`AZURE_COMMUNICATION_CONNECTION_STRING`, `AZURE_EMAIL_FROM`) and verified live config values applied | Move secrets to deployment secret store / Key Vault |
| 6 | `backend/routes/users.js` + `backend/controllers/userController.js` | Revalidated `/api/users/send-email` path with authenticated sender and recipient `dev01` (`24222925@life.hkbu.edu.hk`) | Add request rate limit for manual email endpoint |
| 7 | Runtime Validation | Reproduced previous failure from stale process, force-restarted backend, and confirmed no `beginSendMail is not a function` error on new process | Add startup health-check for email provider initialization |
| 8 | Documentation Consolidation | Merged previously generated Azure email setup/migration docs into this single section and removed redundant standalone files | Keep all future email change logs in this summary section only |

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

## Dashboard Refinement Pass — 2025-07-20

Refined the admin/operator dashboard across 5 phases to improve interaction, clarity, consistency, and usefulness. No redesign — iterative improvements on the existing operations layout.

### Phase 1: Checkbox Selection + Bulk Actions + Pagination

| # | Change | Details |
|---|---|---|
| 1 | **Checkbox column** | Added `UiCheckbox` (new component) to each table row + header with indeterminate state |
| 2 | **Row selection state** | `selectedRows` reactive Set, `toggleRow()`, `toggleSelectAll()`, `isAllPageSelected`, `isSomePageSelected` |
| 3 | **Bulk action bar** | Appears when rows selected — shows count, context-sensitive actions (Approve All / Reject All for requests tab, View in Lent-Out for returns), Clear button |
| 4 | **Pagination** | 8 rows per page, visible page buttons, prev/next, "View full queue" link to dedicated page |
| 5 | **Page reset on tab change** | `watch(attentionActiveTab)` resets page to 1 and clears selection |

### Phase 2: Visual Noise Reduction + Priority Rebalancing

| # | Change | Details |
|---|---|---|
| 1 | **Type column removed** | Merged into Item column as a small muted `outline` badge (`typeShort`: Overdue, Due Soon, Request, Checkout, Missing, Warranty) |
| 2 | **All type badges use `outline` variant** | Reduces visual noise — only Status and Priority badges carry color meaning |
| 3 | **`whitespace-nowrap` on all badges** | Prevents multiline wrapping of chip text |
| 4 | **Tiered priority system** | Replaces flat High/Medium/Low with context-aware tiers: Overdue >30d=Critical (urgent), 8-30d=High, 1-7d=Medium; Requests >7d=High, 4-7d=Medium, ≤3d=Low; Due Soon ≤1d=High, else Low; Missing=High; Warranty=Low |
| 5 | **Fixed table column widths** | `table-layout: fixed` with percentage widths for stable columns across tabs |

### Phase 3: Sidebar Panel Improvements

| # | Change | Details |
|---|---|---|
| 1 | **Inventory Status** | Added percentage display next to each count, wider count column |
| 2 | **Recent Activity** | Replaced badge-based layout with icon-based layout using `getLogIcon()` (Plus/Trash2/Edit/ShieldCheck/AlertTriangle/LogOut/RotateCcw/Activity icons); reduced to 5 items; added "View all activity →" link |
| 3 | **Quick Actions** | Replaced "Audit Log" with "Register Return" (hand-over-tool navigation) for operations focus |

### Phase 4: Card Wording & Summary Refinements

| # | Change | Details |
|---|---|---|
| 1 | **Requests Waiting** | "Pending" → "New", "Checkout" → "Ready for pickup", "Long wait" → "Waiting >3 days" |
| 2 | **Returns Follow-up** | Renamed to "Returns to Chase"; "Due ≤7d" → "Due within 7 days" |
| 3 | **Inventory Available** | Changed hero number from raw count to availability rate percentage; "Unavailable" → "Other" |
| 4 | **Inventory Exceptions** | Renamed to "Missing Items" — hero number is now `stats.missingItems` only; icon turns danger when missing>0; sub-metrics: warranty alerts, disposed, transferred |
| 5 | **Summary text** | Changed from repetitive "X items tracked · Y requests pending · Z overdue" to action-oriented "X items · Y to review, Z overdue" or "X items tracked — all clear" |

### Phase 5: Calendar Removed

| # | Change | Details |
|---|---|---|
| 1 | **Return Calendar section removed** | Was unfinished/placeholder; removed from template, removed `showCalendar` ref, removed `DashboardCalendar` import and `CalendarDays` icon |

### New UI Components Created

| Component | Path | Description |
|---|---|---|
| `UiCheckbox` | `frontend/src/components/ui/Checkbox.vue` | shadcn-style checkbox with checked/indeterminate/disabled states, SVG check/dash icons |
| `UiSeparator` | `frontend/src/components/ui/Separator.vue` | Horizontal/vertical separator using `bg-border` |

### Build Output (Phase 5)
- CSS: 79.28 KB (14.46 KB gzipped)
- JS: 1,172.40 KB (358.63 KB gzipped)
- Build time: ~5s

---

## Dashboard Refinement Pass 2 — Comprehensive 17-Point Update

### New UI Components

| Component | Path | Description |
|---|---|---|
| `UiDropdownMenu` | `frontend/src/components/ui/DropdownMenu.vue` | Teleport-based dropdown with click-outside/Escape handling, configurable align (start/end) and side (bottom/top), scaleIn animation |
| `UiDropdownMenuItem` | `frontend/src/components/ui/DropdownMenuItem.vue` | Item variants: regular, label (section header), separator, checkable (with check SVG), destructive; disabled state support |

### Phase 6: Layout & Width

| # | Change | Details |
|---|---|---|
| 1 | **Page max-width** | 72rem → 90rem for wider desktop utilization |
| 2 | **Responsive padding** | Added 640px and 1280px breakpoints for progressive gutters |
| 3 | **Summary cards grid** | Changed from fixed 2-col to responsive 1→2→4 columns (480px/768px breakpoints) |
| 4 | **Sidebar width** | 300px → 340px (1024px) / 380px (1280px) |

### Phase 7: Row Actions → Kebab Dropdown Menu

| # | Change | Details |
|---|---|---|
| 1 | **Removed inline action buttons** | Approve/Reject/Check Out/View buttons removed from every table row |
| 2 | **Added kebab menu** | MoreVertical icon button per row opens `DropdownMenu` with tab-specific actions |
| 3 | **Context-sensitive options** | Returns: View Details / Send Reminder / Mark Reviewed; Requests: Approve / Reject / View Details; Checkout: Check Out / View Details; Inventory: View Item / Mark Unavailable / Transfer |
| 4 | **Removed `.inline-action-btn`** | All inline action button CSS deleted |

### Phase 8: Toolbar — Bulk Actions, Filter, Columns

| # | Change | Details |
|---|---|---|
| 1 | **Toolbar bar** | New `ops-toolbar` between tabs and table with left (bulk actions) and right (filter, columns) sections |
| 2 | **Bulk actions dropdown** | Tab-specific: universal View/Export; returns Send Reminder/Mark Reviewed; requests Approve/Reject/Mark Checkout-Ready; inventory Mark Unavailable/Transfer |
| 3 | **Filter dropdown** | Priority filter (All/Critical/High/Medium/Low) + Status filter (All/Overdue/Due Soon/Pending/Checkout/Missing) with Clear All |
| 4 | **Filter tags** | Active filters shown as dismissible tags below toolbar |
| 5 | **Customize columns** | Checkable dropdown to toggle Item/User/Status/Date/Priority/Type columns |
| 6 | **`finalFilteredItems` computed** | New computed property applies toolbar filters on top of tab-based `filteredAttentionItems` |
| 7 | **Page size** | Changed from 8 to 10 items per page |

### Phase 9: Promoted Inventory Status

| # | Change | Details |
|---|---|---|
| 1 | **Larger card** | Promoted from small sidebar card to `ops-inv-status-card` with hero availability rate display (2rem font, success color) |
| 2 | **Wider bars** | Status bar tracks 8px tall, dots 8px, label column 90px |
| 3 | **Exception highlighting** | Missing and Not Available rows get bold text via `status-bar-row--exception` class |
| 4 | **`isException` flag** | Added to `inventoryStatusBars` computed entries |

### Phase 10: Table & Miscellaneous Refinements

| # | Change | Details |
|---|---|---|
| 1 | **Table layout** | Removed `table-layout: fixed` + width percentages → auto layout |
| 2 | **Table font** | 0.75rem → 0.8125rem; cell padding 0.5rem → 0.625rem 0.75rem |
| 3 | **Type column** | Moved to separate column (no longer merged with Item cell) |
| 4 | **Card labels** | "Returns to Chase" → "Returns Follow-up"; "Waiting >3 days" → "Waiting >3d" |
| 5 | **Missing Items card** | Reordered: Disposed/Transferred first, warranty alerts last |
| 6 | **Quick Actions** | "Lent Out" → "Process Checkout"; "Inventory" → "View Missing" (AlertTriangle icon, navigates to manage-items with missing filter) |
| 7 | **Activity feed** | Larger icon wrap (1.625rem), more gap (0.75rem), larger entity font |

### Build Output (Refinement Pass 2)
- CSS: 82.91 KB (14.98 KB gzipped)
- JS: 1,188.89 KB (362.96 KB gzipped)
- Build time: ~3.8s

---

## Branding & Shell/Layout Overhaul — 2025-07-21

### Round 1–3: Institutional Branding

| # | Change | Details |
|---|---|---|
| 1 | **Navbar logo** | Replaced accent-colored cube icon with institutional SVG logos (`logo_650.svg` for light, `logo_white_650.svg` for dark) using `v-if="darkMode"` switching |
| 2 | **Login page logo** | Replaced 48×48 cube SVG with institutional SVG; removed "COMP Department" subtitle |
| 3 | **COMPInventory text removed** | Removed `.logo-text` / `.logo-text-accent` from navbar — SVG already contains department name |
| 4 | **Logo sizing** | Navbar: `height: 1.5rem`, max-width 20rem; Login: `height: 2.5rem` |

### Round 4: Shell/Layout Unification (11-point fix)

| # | Point | Change |
|---|---|---|
| 1 | **Unified horizontal grid** | All shell layers (top-bar, sub-nav, main-content, page-container) aligned to `max-width: 90rem` with consistent `1.25rem` horizontal padding |
| 2 | **Navbar left-side grouping** | Added `.nav-divider` (1px vertical line with `--border-strong`) between logo block and primary nav for visual separation |
| 3 | **Logo refinement** | Kept at `1.5rem` height; `flex-shrink: 0` on logo-btn ensures stability; divider provides breathing room |
| 4 | **Softer active nav** | Replaced accent-colored active state (`color: --accent; background: --accent-surface`) with neutral pill (`color: --text-primary; background: --surface-2; box-shadow: inset 0 0 0 1px --border-strong`) |
| 5 | **Nav spacing** | Primary nav gap: `0.125rem → 0.25rem`; tab padding: `0.75rem → 0.625rem`; sub-nav gap: `0.125rem → 0.25rem` |
| 6 | **Sub-nav alignment** | `.nav-sub-inner` max-width: `80rem → 90rem`; padding matches top-bar (`0 1.25rem`) |
| 7 | **Page header alignment** | `.page-container` max-width: `80rem → 90rem`; `.main-content` max-width: `80rem → 90rem`; HomePage padding aligned to `1.25rem` |
| 8 | **Dark mode layered contrast** | Top-bar: `--nav-bg` raised to `rgba(14, 16, 30, 0.95)`, `--nav-border` raised to `rgba(..., 0.10)`; sub-nav uses `--surface-1` (was `--surface-2`) for clear layering |
| 9 | **Branding subtle** | No text branding — institutional SVG only; divider separates logo from navigation |
| 10 | **Cross-page consistency** | All pages using `.page-container` now share the same 90rem grid |
| 11 | **Hover states** | Nav tab hover changed from `--accent-surface` to `--surface-2` for neutral feel |

### Files Changed

| File | Changes |
|---|---|
| `frontend/src/App.vue` | Template: added `.nav-divider`; Styles: grid widths, nav-divider, softer active state, sub-nav surface, main-content width |
| `frontend/src/index.css` | `--nav-bg`/`--nav-border` dark-mode token refinement; `.page-container` max-width 90rem, consistent padding |
| `frontend/src/pages/HomePage.vue` | Horizontal padding aligned to `1.25rem` at all breakpoints |

### Build Output
- CSS: 82.78 KB (15.00 KB gzipped)
- JS: 1,188.11 KB (362.96 KB gzipped)
- Build time: ~4.5s
