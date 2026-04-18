<template>
  <div class="home-page">
    <!-- ==================== ADMIN / OPERATOR VIEW ==================== -->
    <template v-if="user?.role === 'admin' || user?.role === 'operator' || (user?.role === 'user' && user?.subRole === 'teacher')">
      <!-- Header -->
      <div class="ops-header animate-in">
        <div class="ops-header-info">
          <h2 class="ops-title">Inventory Operations</h2>
          <p class="ops-subtitle">{{ todayLabel }} · {{ summaryText }}</p>
        </div>
        <div class="ops-header-actions">
          <Button size="sm" @click="$emit('navigate', 'approve-requests')">
            <ClipboardCheck :size="14" /> Review Requests
          </Button>
          <Button variant="outline" size="sm" @click="$emit('navigate', 'manage-items')">
            <Plus :size="14" /> Add Item
          </Button>
        </div>
      </div>

      <!-- 4 Operational Summary Cards -->
      <div class="ops-cards animate-in delay-1">
        <!-- Requests Waiting -->
        <Card class="ops-summary-card" @click="$emit('navigate', 'approve-requests')">
          <div class="ops-card-header">
            <div class="ops-card-icon ops-card-icon--warning">
              <ClipboardList :size="18" />
            </div>
            <span v-if="!isCardsInitialLoading" class="ops-card-value">{{ pendingRequestsCount }}</span>
            <span v-else class="ops-skeleton-line ops-skeleton-line--value"></span>
          </div>
          <p class="ops-card-label">Request Queue</p>
          <div v-if="!isCardsInitialLoading" class="ops-card-metrics">
            <span>Pending approval <strong>{{ pendingPureCount }}</strong></span>
            <span>Pending check-out <strong>{{ pendingCheckoutCount }}</strong></span>
            <span v-if="longWaitCount > 0" class="metric-danger">Stuck &gt;3 days <strong>{{ longWaitCount }}</strong></span>
          </div>
          <div v-else class="ops-card-metrics ops-card-metrics-skeleton">
            <span class="ops-skeleton-line ops-skeleton-line--metric"></span>
            <span class="ops-skeleton-line ops-skeleton-line--metric"></span>
            <span class="ops-skeleton-line ops-skeleton-line--metric"></span>
          </div>
        </Card>

        <!-- Returns Follow-up -->
        <Card class="ops-summary-card" @click="$emit('navigate', 'lent-out-filter')">
          <div class="ops-card-header">
            <div class="ops-card-icon ops-card-icon--danger">
              <RotateCcw :size="18" />
            </div>
            <span v-if="!isCardsInitialLoading" class="ops-card-value">{{ overdueCount + dueSoonCount }}</span>
            <span v-else class="ops-skeleton-line ops-skeleton-line--value"></span>
          </div>
          <p class="ops-card-label">Return Follow-up</p>
          <div v-if="!isCardsInitialLoading" class="ops-card-metrics">
            <span class="metric-danger">Overdue <strong>{{ overdueCount }}</strong></span>
            <span>Due today <strong>{{ dueTodayCount }}</strong></span>
            <span>Due in next 7 days <strong>{{ dueSoonCount }}</strong></span>
          </div>
          <div v-else class="ops-card-metrics ops-card-metrics-skeleton">
            <span class="ops-skeleton-line ops-skeleton-line--metric"></span>
            <span class="ops-skeleton-line ops-skeleton-line--metric"></span>
            <span class="ops-skeleton-line ops-skeleton-line--metric"></span>
          </div>
        </Card>

        <!-- Inventory Readiness -->
        <Card class="ops-summary-card" @click="$emit('navigate', 'manage-items')">
          <div class="ops-card-header">
            <div class="ops-card-icon ops-card-icon--success">
              <Package :size="18" />
            </div>
            <span v-if="!isCardsInitialLoading" class="ops-card-value">{{ readyForNewRequestCount }}</span>
            <span v-else class="ops-skeleton-line ops-skeleton-line--value"></span>
          </div>
          <p class="ops-card-label">Ready for New Requests</p>
          <div v-if="!isCardsInitialLoading" class="ops-card-metrics">
            <span>In stock <strong>{{ stats.availableItems ?? 0 }}</strong></span>
            <span>Reserved pickup <strong>{{ pendingCheckoutCount }}</strong></span>
            <span>In-use <strong>{{ stats.lentOutItems ?? 0 }}</strong></span>
          </div>
          <div v-else class="ops-card-metrics ops-card-metrics-skeleton">
            <span class="ops-skeleton-line ops-skeleton-line--metric"></span>
            <span class="ops-skeleton-line ops-skeleton-line--metric"></span>
            <span class="ops-skeleton-line ops-skeleton-line--metric"></span>
          </div>
        </Card>

        <!-- Missing Items -->
        <Card class="ops-summary-card" @click="$emit('navigate', 'manage-items', { filter: 'missing' })">
          <div class="ops-card-header">
            <div class="ops-card-icon" :class="(stats.missingItems || 0) > 0 ? 'ops-card-icon--danger' : 'ops-card-icon--muted'">
              <AlertTriangle :size="18" />
            </div>
            <span v-if="!isCardsInitialLoading" class="ops-card-value">{{ stats.missingItems ?? 0 }}</span>
            <span v-else class="ops-skeleton-line ops-skeleton-line--value"></span>
          </div>
          <p class="ops-card-label">Inventory Exceptions</p>
          <div v-if="!isCardsInitialLoading" class="ops-card-metrics">
            <span>Disposed <strong>{{ stats.disposedItems ?? 0 }}</strong></span>
            <span>Transferred <strong>{{ transferredCount }}</strong></span>
            <span v-if="warrantyAlertCount > 0">Warranty alerts <strong>{{ warrantyAlertCount }}</strong></span>
          </div>
          <div v-else class="ops-card-metrics ops-card-metrics-skeleton">
            <span class="ops-skeleton-line ops-skeleton-line--metric"></span>
            <span class="ops-skeleton-line ops-skeleton-line--metric"></span>
            <span class="ops-skeleton-line ops-skeleton-line--metric"></span>
          </div>
        </Card>
      </div>

      <!-- Main content row: table + sidebar -->
      <div class="ops-main animate-in delay-2">
        <!-- LEFT: Needs Attention Table -->
        <div class="ops-attention">
          <Card class="ops-attention-card">
            <!-- Attention header: title + tabs -->
            <div class="ops-attention-header">
              <div class="ops-attention-title-row">
                <h3 class="ops-section-title">
                  <AlertCircle :size="16" /> Needs Attention
                  <Badge v-if="dashboardLoadState.queue.isLoaded && attentionCounts.tabs.all > 0" variant="accent" class="ml-2">{{ attentionCounts.tabs.all }}</Badge>
                  <span v-if="isQueueBackgroundFetching" class="ops-fetching-chip">Updating...</span>
                </h3>
              </div>
              <div class="ops-attention-tabs-row">
                <div class="ops-attention-tabs">
                  <button
                    v-for="tab in attentionFilterTabs"
                    :key="tab.key"
                    :class="['ops-tab', { active: attentionActiveTab === tab.key }]"
                    @click="attentionActiveTab = tab.key; selectedRows.clear()"
                  >
                    {{ tab.label }}
                    <span v-if="dashboardLoadState.queue.isLoaded && tab.count > 0" class="ops-tab-count">{{ tab.count }}</span>
                  </button>
                </div>
                <div class="ops-tab-tools">
                  <!-- Filter -->
                  <DropdownMenu align="end">
                    <template #trigger>
                      <button :class="['toolbar-btn', { 'toolbar-btn--active': hasActiveFilters }]">
                        <Filter :size="12" /> Filter
                        <span v-if="hasActiveFilters" class="toolbar-dot"></span>
                      </button>
                    </template>
                    <template #default="{ close }">
                      <DropdownMenuItem label>Priority</DropdownMenuItem>
                      <DropdownMenuItem checkable :checked="filterPriority === ''" @click="filterPriority = ''; close()">All Priorities</DropdownMenuItem>
                      <DropdownMenuItem checkable :checked="filterPriority === 'Critical'" @click="filterPriority = 'Critical'; close()">Critical</DropdownMenuItem>
                      <DropdownMenuItem checkable :checked="filterPriority === 'High'" @click="filterPriority = 'High'; close()">High</DropdownMenuItem>
                      <DropdownMenuItem checkable :checked="filterPriority === 'Medium'" @click="filterPriority = 'Medium'; close()">Medium</DropdownMenuItem>
                      <DropdownMenuItem checkable :checked="filterPriority === 'Low'" @click="filterPriority = 'Low'; close()">Low</DropdownMenuItem>
                      <DropdownMenuItem separator />
                      <DropdownMenuItem label>Status</DropdownMenuItem>
                      <DropdownMenuItem checkable :checked="filterStatus === ''" @click="filterStatus = ''; close()">All Statuses</DropdownMenuItem>
                      <DropdownMenuItem checkable :checked="filterStatus === 'Pending Approval'" @click="filterStatus = 'Pending Approval'; close()">Pending Approval</DropdownMenuItem>
                      <DropdownMenuItem checkable :checked="filterStatus === 'Pending Check-Out'" @click="filterStatus = 'Pending Check-Out'; close()">Pending Check-Out</DropdownMenuItem>
                      <DropdownMenuItem checkable :checked="filterStatus === 'In-use'" @click="filterStatus = 'In-use'; close()">In-use</DropdownMenuItem>
                      <DropdownMenuItem checkable :checked="filterStatus === 'Available'" @click="filterStatus = 'Available'; close()">Available</DropdownMenuItem>
                      <DropdownMenuItem checkable :checked="filterStatus === 'Missing'" @click="filterStatus = 'Missing'; close()">Missing</DropdownMenuItem>
                      <DropdownMenuItem checkable :checked="filterStatus === 'Not Available'" @click="filterStatus = 'Not Available'; close()">Not Available</DropdownMenuItem>
                      <DropdownMenuItem checkable :checked="filterStatus === 'Transferred'" @click="filterStatus = 'Transferred'; close()">Transferred</DropdownMenuItem>
                      <template v-if="hasActiveFilters">
                        <DropdownMenuItem separator />
                        <DropdownMenuItem destructive @click="filterPriority = ''; filterStatus = ''; close()">
                          <XCircle :size="12" /> Clear All Filters
                        </DropdownMenuItem>
                      </template>
                    </template>
                  </DropdownMenu>

                  <!-- Customize columns -->
                  <DropdownMenu align="end">
                    <template #trigger>
                      <button class="toolbar-btn">
                        <SlidersHorizontal :size="12" /> Columns
                      </button>
                    </template>
                    <template #default>
                      <DropdownMenuItem label>Show Columns</DropdownMenuItem>
                      <DropdownMenuItem checkable :checked="visibleColumns.item" @click="visibleColumns.item = !visibleColumns.item">Item</DropdownMenuItem>
                      <DropdownMenuItem checkable :checked="visibleColumns.user" @click="visibleColumns.user = !visibleColumns.user">User</DropdownMenuItem>
                      <DropdownMenuItem checkable :checked="visibleColumns.status" @click="visibleColumns.status = !visibleColumns.status">Status</DropdownMenuItem>
                      <DropdownMenuItem checkable :checked="visibleColumns.date" @click="visibleColumns.date = !visibleColumns.date">Due / Date</DropdownMenuItem>
                      <DropdownMenuItem checkable :checked="visibleColumns.priority" @click="visibleColumns.priority = !visibleColumns.priority">Priority</DropdownMenuItem>
                      <DropdownMenuItem checkable :checked="visibleColumns.type" @click="visibleColumns.type = !visibleColumns.type">Type</DropdownMenuItem>
                    </template>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            <!-- Bulk actions bar (animated) -->
            <Transition name="bulk-bar">
              <div v-if="selectedAttentionRows.length > 0" class="ops-toolbar">
                <div class="ops-toolbar-left">
                  <div class="bulk-summary">
                    <span class="bulk-count">{{ bulkSelectionSummary.total }} selected</span>
                    <span class="bulk-meta">
                      Req {{ bulkSelectionSummary.byGroup.requests }} · Ret {{ bulkSelectionSummary.byGroup.returns }} · Inv {{ bulkSelectionSummary.byGroup.inventory }}
                    </span>
                    <span class="bulk-meta bulk-meta-muted">Current page only</span>
                  </div>
                  <DropdownMenu align="start">
                    <template #trigger>
                      <button class="toolbar-btn">
                        <Zap :size="12" /> Actions <ChevronDown :size="10" />
                      </button>
                    </template>
                    <template #default="{ close }">
                      <DropdownMenuItem label>Safe Actions</DropdownMenuItem>
                      <DropdownMenuItem @click="triggerBulkAction('view-selected', close)">
                        <Eye :size="12" /> View Selected ({{ bulkSelectionSummary.total }})
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="triggerBulkAction('export-selected', close)">
                        <Download :size="12" /> Export Selected ({{ bulkSelectionSummary.total }})
                      </DropdownMenuItem>

                      <DropdownMenuItem separator />
                      <DropdownMenuItem label>State-Changing Actions</DropdownMenuItem>
                      <DropdownMenuItem
                        v-for="action in visibleStateBulkActions"
                        :key="action.id"
                        :disabled="action.disabled"
                        :destructive="action.destructive"
                        @click="triggerBulkAction(action.id, close)"
                      >
                        <component :is="action.icon" :size="12" />
                        {{ action.menuLabel }}
                      </DropdownMenuItem>
                    </template>
                  </DropdownMenu>
                  <button class="bulk-clear" @click="selectedRows.clear()">Clear</button>
                </div>
              </div>
            </Transition>

            <!-- Active filters indicator -->
            <div v-if="hasActiveFilters" class="ops-active-filters">
              <span v-if="filterPriority" class="filter-tag">
                Priority: {{ filterPriority }}
                <button @click="filterPriority = ''" class="filter-tag-x">&times;</button>
              </span>
              <span v-if="filterStatus" class="filter-tag">
                Status: {{ filterStatus }}
                <button @click="filterStatus = ''" class="filter-tag-x">&times;</button>
              </span>
            </div>

            <div class="table-responsive ops-table-scroll">
              <table class="ops-table">
                <thead>
                  <tr>
                    <th class="th-checkbox">
                      <Checkbox
                        :checked="isAllPageSelected"
                        :indeterminate="isSomePageSelected && !isAllPageSelected"
                        @update:checked="toggleSelectAll"
                      />
                    </th>
                    <th v-if="visibleColumns.item">Item</th>
                    <th v-if="visibleColumns.type">Type</th>
                    <th v-if="visibleColumns.user">User</th>
                    <th v-if="visibleColumns.status">Status</th>
                    <th v-if="visibleColumns.date">Due / Date</th>
                    <th v-if="visibleColumns.priority">Priority</th>
                    <th class="th-action"></th>
                  </tr>
                </thead>
                <tbody>
                  <template v-if="showQueueSkeleton">
                    <tr>
                      <td :colspan="attentionVisibleColumnCount" class="table-spinner-cell">
                        <Spinner size="lg" label="Loading queue..." />
                      </td>
                    </tr>
                  </template>

                  <tr v-else-if="queueErrorMessage" class="ops-table-empty-row">
                    <td :colspan="attentionVisibleColumnCount" class="ops-table-empty-cell">
                      <div class="empty-state-inline">
                        <AlertTriangle :size="16" class="empty-icon-warning" />
                        <p>{{ queueErrorMessage }}</p>
                      </div>
                    </td>
                  </tr>

                  <template v-else-if="attentionRows.length > 0">
                    <tr
                      v-for="row in attentionRows"
                      :key="row.type + '-' + row.id"
                      :class="{ 'row-selected': selectedRows.has(row.type + '-' + row.id) }"
                    >
                      <td class="td-checkbox">
                        <Checkbox :checked="selectedRows.has(row.type + '-' + row.id)" @update:checked="toggleRow(row.type + '-' + row.id)" />
                      </td>
                      <td v-if="visibleColumns.item" class="cell-item">
                        <div class="cell-item-inner">
                          <span class="cell-item-name">{{ row.name }}</span>
                        </div>
                      </td>
                      <td v-if="visibleColumns.type">
                        <Badge variant="outline" class="cell-type-badge whitespace-nowrap">{{ row.typeShort }}</Badge>
                      </td>
                      <td v-if="visibleColumns.user" class="cell-ellip">
                        {{ row.user }}
                        <span v-if="row.hasOverdue" class="overdue-dot-wrap" @mouseenter="showOverdueTooltip" @mouseleave="hideOverdueTooltip">
                          <span class="overdue-dot"></span>
                        </span>
                      </td>
                      <td v-if="visibleColumns.status"><Badge :variant="row.statusVariant" class="whitespace-nowrap">{{ row.status }}</Badge></td>
                      <td v-if="visibleColumns.date" class="whitespace-nowrap cell-date">{{ row.dateLabel }}</td>
                      <td v-if="visibleColumns.priority"><Badge :variant="row.priorityVariant" class="whitespace-nowrap">{{ row.priority }}</Badge></td>
                      <td class="td-action">
                        <DropdownMenu align="end">
                          <template #trigger>
                            <button class="kebab-btn" aria-label="Row actions">
                              <MoreVertical :size="14" />
                            </button>
                          </template>
                          <template #default="{ close }">
                            <!-- Returns rows -->
                            <template v-if="row.actionType === 'view-lent'">
                              <DropdownMenuItem @click="$emit('navigate', 'lent-out-filter'); close()">
                                <Eye :size="12" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem @click="close()">
                                <Bell :size="12" /> Send Reminder
                              </DropdownMenuItem>

                            </template>
                            <!-- Approve rows -->
                            <template v-else-if="row.actionType === 'approve'">
                              <DropdownMenuItem success @click="inlineApproveId = row.id; close()">
                                <CheckCircle2 :size="12" /> Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem destructive @click="inlineRejectId = row.id; close()">
                                <XCircle :size="12" /> Reject
                              </DropdownMenuItem>
                              <DropdownMenuItem separator />
                              <DropdownMenuItem @click="$emit('navigate', 'approve-requests'); close()">
                                <Eye :size="12" /> View Details
                              </DropdownMenuItem>
                            </template>
                            <!-- Checkout rows -->
                            <template v-else-if="row.actionType === 'checkout'">
                              <DropdownMenuItem success @click="handleInlineCheckout(row.id); close()">
                                <Package :size="12" /> Check Out
                              </DropdownMenuItem>
                              <DropdownMenuItem @click="$emit('navigate', 'approve-requests'); close()">
                                <Eye :size="12" /> View Details
                              </DropdownMenuItem>
                            </template>
                            <!-- Inventory rows (missing, warranty) -->
                            <template v-else>
                              <DropdownMenuItem @click="$emit('navigate', 'manage-items'); close()">
                                <Eye :size="12" /> View Item
                              </DropdownMenuItem>
                              <DropdownMenuItem @click="close()">
                                <Ban :size="12" /> Mark Unavailable
                              </DropdownMenuItem>
                              <DropdownMenuItem @click="close()">
                                <ArrowUpDown :size="12" /> Transfer
                              </DropdownMenuItem>
                            </template>
                          </template>
                        </DropdownMenu>
                      </td>
                    </tr>
                  </template>

                  <tr v-else class="ops-table-empty-row">
                    <td :colspan="attentionVisibleColumnCount" class="ops-table-empty-cell">
                      <div class="empty-state-inline">
                        <CheckCircle2 :size="18" class="empty-icon" />
                        <p>All clear — nothing needs attention</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div class="ops-pagination">
              <div class="ops-pagination-left">
                <div class="ops-page-size-wrap">
                  <span class="ops-page-size-label">Rows per page</span>
                  <DropdownMenu align="start">
                    <template #trigger>
                      <button class="ops-page-size-trigger">
                        {{ attentionPageSize }}
                        <ChevronDown :size="10" />
                      </button>
                    </template>
                    <template #default="{ close }">
                      <DropdownMenuItem label>Rows per page</DropdownMenuItem>
                      <DropdownMenuItem
                        v-for="size in attentionPageSizeOptions"
                        :key="size"
                        checkable
                        :checked="attentionPageSize === size"
                        @click="setAttentionPageSize(size); close()"
                      >
                        {{ size }}
                      </DropdownMenuItem>
                    </template>
                  </DropdownMenu>
                </div>
                <span class="ops-pagination-info">{{ attentionPaginationText }}</span>
              </div>

              <div class="ops-pagination-right">
                <span class="ops-pagination-page">{{ attentionPageIndicator }}</span>
                <div class="ops-pagination-btns">
                  <button :disabled="attentionPage <= 1" @click="attentionPage--" class="ops-page-btn">‹</button>
                  <button
                    v-for="p in attentionVisiblePages" :key="p"
                    :class="['ops-page-btn', { active: p === attentionPage }]"
                    @click="attentionPage = p"
                  >{{ p }}</button>
                  <button :disabled="attentionPage >= attentionTotalPages" @click="attentionPage++" class="ops-page-btn">›</button>
                </div>
              </div>

              <button class="ops-view-full" @click="$emit('navigate', attentionActiveTab === 'requests' ? 'approve-requests' : attentionActiveTab === 'inventory' ? 'manage-items' : 'lent-out-filter')">
                View full queue →
              </button>
            </div>
          </Card>
        </div>

        <!-- RIGHT: Support Rail -->
        <div class="ops-sidebar">
          <!-- Inventory Status Overview — promoted to larger module -->
          <Card class="ops-inv-status-card">
            <div class="ops-inv-header">
              <h3 class="ops-inv-title">
                <BarChart3 :size="16" /> Inventory Status
              </h3>
              <span v-if="isStatsInitialLoading" class="ops-skeleton-line ops-skeleton-line--inv-total"></span>
              <span v-else-if="dashboardLoadState.stats.error && !dashboardLoadState.stats.isLoaded" class="ops-inv-total">—</span>
              <span v-else class="ops-inv-total">{{ stats.totalItems ?? 0 }} items</span>
            </div>

            <div v-if="isStatsBackgroundFetching" class="ops-inv-rate">
              <span class="ops-fetching-chip">Updating...</span>
            </div>

            <div v-if="isStatsInitialLoading" class="status-bars">
              <div v-for="idx in 6" :key="'inv-skel-' + idx" class="status-bar-row">
                <div class="status-bar-label"><span class="ops-skeleton-line ops-skeleton-line--status-label"></span></div>
                <div class="status-bar-track"><div class="status-bar-fill status-bar-fill--skeleton"></div></div>
                <span class="status-bar-count"><span class="ops-skeleton-line ops-skeleton-line--status-count"></span></span>
              </div>
            </div>
            <div v-else-if="dashboardLoadState.stats.error && !dashboardLoadState.stats.isLoaded" class="empty-state-sm">
              Unable to load inventory status
            </div>
            <div v-else class="status-bars">
              <div v-for="s in inventoryStatusBars" :key="s.label" class="status-bar-row" :class="{ 'status-bar-row--exception': s.isException && s.count > 0 }">
                <div class="status-bar-label">
                  <span class="status-dot" :style="{ background: s.color }"></span>
                  {{ s.label }}
                </div>
                <div class="status-bar-track">
                  <div class="status-bar-fill" :style="{ width: Math.max(s.percent, s.count > 0 ? 2 : 0) + '%', background: s.color }"></div>
                </div>
                <span class="status-bar-count">{{ s.count }} <span class="status-bar-pct">({{ Math.round(s.percent) }}%)</span></span>
              </div>
            </div>
          </Card>

          <!-- Recent Activity -->
          <Card class="ops-sidebar-card">
            <h3 class="ops-sidebar-title">
              <Activity :size="14" /> Recent Activity
              <span v-if="isLogsBackgroundFetching" class="ops-fetching-chip">Updating...</span>
            </h3>
            <div class="activity-list">
              <template v-if="isLogsInitialLoading">
                <div v-for="idx in 5" :key="'activity-skel-' + idx" class="activity-item activity-item--skeleton">
                  <div class="activity-icon-wrap activity-icon--default"></div>
                  <div class="activity-detail">
                    <span class="ops-skeleton-line ops-skeleton-line--activity-title"></span>
                    <span class="ops-skeleton-line ops-skeleton-line--activity-meta"></span>
                  </div>
                </div>
              </template>
              <template v-else>
                <div v-for="log in filteredLogs.slice(0, 5)" :key="log._id || log.id" class="activity-item">
                  <div class="activity-icon-wrap" :class="'activity-icon--' + getLogVariant(log.action)">
                    <component :is="getLogIcon(log.action)" :size="12" />
                  </div>
                  <div class="activity-detail">
                    <span class="activity-entity">{{ formatAction(log.action) }} — {{ log.entityName || log.entityId || '—' }}</span>
                    <span class="activity-meta">{{ log.userName || log.userId || '' }} · {{ relativeTime(log.createdAt || log.timestamp) }}</span>
                  </div>
                </div>
                <div v-if="logsErrorMessage && !dashboardLoadState.logs.isLoaded" class="empty-state-sm">Unable to load recent activity</div>
                <div v-else-if="filteredLogs.length === 0" class="empty-state-sm">No recent activity</div>
                <button v-else class="activity-view-all" @click="$emit('navigate', 'audit-log')">View all activity →</button>
              </template>
            </div>
          </Card>

          <!-- Quick Actions -->
          <Card class="ops-sidebar-card">
            <h3 class="ops-sidebar-title">
              <Zap :size="14" /> Quick Actions
            </h3>
            <div class="ops-quick-grid">
              <Button variant="outline" size="sm" class="ops-quick-btn" @click="$emit('navigate', 'approve-requests')">
                <ClipboardCheck :size="14" /> Review Requests
              </Button>
              <Button variant="outline" size="sm" class="ops-quick-btn" @click="$emit('navigate', 'hand-over-tool')">
                <RotateCcw :size="14" /> Register Return
              </Button>
              <Button variant="outline" size="sm" class="ops-quick-btn" @click="$emit('navigate', 'lent-out-filter')">
                <Package :size="14" /> Process Checkout
              </Button>
              <Button variant="outline" size="sm" class="ops-quick-btn" @click="$emit('navigate', 'manage-items', { filter: 'missing' })">
                <AlertTriangle :size="14" /> View Missing
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <!-- Inline Approve Modal -->
      <div v-if="inlineApproveId" class="modal-overlay">
        <Card class="modal-card">
          <h3 class="modal-title">Approve Request</h3>
          <div class="mb-4">
            <label class="modal-label">Return Date</label>
            <input type="date" v-model="inlineReturnDate" class="form-input" />
          </div>
          <div class="mb-4">
            <label class="modal-label">Location</label>
            <DropdownWithOther
              v-model="inlineLocation"
              :options="locationOptions"
              placeholder="Enter new location..."
              @add-option="addLocation"
            />
          </div>
          <div class="mb-4">
            <RemarkBox
              v-model="inlineRemark"
              label="Remark"
              placeholder="Add any notes..."
            />
          </div>
          <div class="flex gap-2">
            <Button variant="success" class="flex-1" @click="confirmInlineApprove">Approve</Button>
            <Button variant="outline" class="flex-1" @click="cancelInlineApprove">Cancel</Button>
          </div>
        </Card>
      </div>

      <!-- Inline Reject Modal -->
      <div v-if="inlineRejectId" class="modal-overlay">
        <Card class="modal-card">
          <h3 class="modal-title">Reject Request</h3>
          <div class="mb-4">
            <label class="modal-label">Reason</label>
            <Textarea v-model="inlineRejectReason" rows="4" placeholder="Enter rejection reason..." />
          </div>
          <div class="flex gap-2">
            <Button variant="destructive" class="flex-1" @click="confirmInlineReject">Reject</Button>
            <Button variant="outline" class="flex-1" @click="cancelInlineReject">Cancel</Button>
          </div>
        </Card>
      </div>

      <div v-if="bulkConfirmAction" class="modal-overlay">
        <Card class="modal-card">
          <h3 class="modal-title">{{ bulkConfirmAction.label }}</h3>
          <div class="bulk-confirm-stats">
            <div><strong>Selected:</strong> {{ bulkSelectionSummary.total }}</div>
            <div><strong>Eligible:</strong> {{ bulkConfirmStats.eligibleCount }}</div>
            <div><strong>Skipped:</strong> {{ bulkConfirmStats.ineligibleCount }}</div>
          </div>
          <p class="bulk-confirm-note">{{ bulkConfirmAction.description }}</p>
          <p class="bulk-confirm-note bulk-confirm-note--muted">Ineligible rows will be skipped.</p>

          <div v-if="bulkConfirmAction.id === 'approve-selected'" class="mb-4">
            <label class="modal-label">Return Date</label>
            <input type="date" v-model="bulkApproveReturnDate" class="form-input" />
            <label class="modal-label mt-3">Location</label>
            <DropdownWithOther
              v-model="bulkApproveLocation"
              :options="locationOptions"
              placeholder="Enter new location..."
              @add-option="addLocation"
            />
            <div class="mt-3">
              <RemarkBox
                v-model="bulkApproveRemark"
                label="Remark"
                placeholder="Add any notes..."
              />
            </div>
          </div>

          <div v-if="bulkConfirmAction.id === 'reject-selected'" class="mb-4">
            <label class="modal-label">Reason</label>
            <Textarea v-model="bulkRejectReason" rows="4" placeholder="Enter rejection reason..." />
          </div>

          <p v-if="!bulkConfirmAction.implemented" class="bulk-confirm-note bulk-confirm-note--warning">
            This action is not connected to backend execution yet.
          </p>
          <div class="flex gap-2">
            <Button variant="outline" class="flex-1" :disabled="bulkActionSubmitting" @click="cancelBulkAction">Cancel</Button>
            <Button
              :variant="bulkConfirmAction.destructive ? 'destructive' : 'default'"
              class="flex-1"
              :disabled="bulkConfirmDisabled || bulkActionSubmitting"
              @click="confirmBulkAction"
            >
              {{ bulkActionSubmitting ? 'Processing...' : 'Confirm' }}
            </Button>
          </div>
        </Card>
      </div>
    </template>

    <!-- ==================== TEACHER VIEW ==================== -->
    <template v-else-if="user?.role === 'user' && user?.subRole === 'teacher'">
      <div class="role-dashboard role-dashboard--teacher">
        <div class="role-header animate-in">
          <div>
            <h2 class="role-title">Inventory Dashboard</h2>
            <p class="role-subtitle">{{ todayLabel }} · Manage requests, items, and shortcuts.</p>
          </div>
          <div class="role-header-actions">
            <Button size="sm" @click="$emit('navigate', 'teacher-requests')">Review Requests</Button>
            <Button variant="outline" size="sm" @click="$emit('navigate', 'borrow-items')">Browse & Borrow Items</Button>
          </div>
        </div>

        <div class="role-summary-grid animate-in delay-1">
          <button class="role-summary-card" @click="$emit('navigate', 'teacher-requests')">
            <span class="role-summary-label">Pending Approvals</span>
            <span class="role-summary-value role-summary-value--danger">{{ teacherPendingOnly.length }}</span>
            <span class="role-summary-meta">Needs your approval</span>
          </button>
          <button class="role-summary-card" @click="$emit('navigate', 'teacher-checkout')">
            <span class="role-summary-label">Pending Check-Out</span>
            <span class="role-summary-value role-summary-value--warning">{{ teacherPendingCheckoutOnly.length }}</span>
            <span class="role-summary-meta">Ready for handover</span>
          </button>
          <button class="role-summary-card" @click="$emit('navigate', 'my-items', { filter: 'available' })">
            <span class="role-summary-label">Available Items</span>
            <span class="role-summary-value role-summary-value--success">{{ teacherOwnedAvailableCount }}</span>
            <span class="role-summary-meta">Items ready to borrow</span>
          </button>
          <button class="role-summary-card" @click="$emit('navigate', 'teacher-checkout')">
            <span class="role-summary-label">In-use Items</span>
            <span class="role-summary-value">{{ teacherOwnedInUseItems.length }}</span>
            <span class="role-summary-meta">Currently borrowed out</span>
          </button>
        </div>

        <div class="role-main-grid animate-in delay-2">
          <div class="section-card role-section-card">
            <div class="section-header">
              <h3 class="section-title">Request Queue</h3>
              <Button variant="link" size="sm" @click="$emit('navigate', 'teacher-requests')">Open full queue →</Button>
            </div>
            <div v-if="teacherPendingRequests.length === 0" class="empty-state-sm">No pending requests right now.</div>
            <div v-else class="table-responsive">
              <table class="table-striped role-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Borrower</th>
                    <th>Status</th>
                    <th>Waiting</th>
                    <th class="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="req in teacherPendingRequests.slice(0, 6)" :key="req.id">
                    <td class="font-semibold">{{ req.itemName }}</td>
                    <td>{{ req.borrowerName || req.borrowerID }}</td>
                    <td><StatusBadge :status="req.status" type="request" /></td>
                    <td>{{ waitingTime(req.requestDate) }}</td>
                    <td class="text-center whitespace-nowrap">
                      <Button v-if="req.status === 'Pending Check-Out'" size="sm" @click="handleTeacherCheckout(req.id)">Borrowed Out</Button>
                      <Button v-else variant="outline" size="sm" @click="$emit('navigate', 'teacher-requests')">Review</Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="section-card role-section-card">
            <div class="section-header">
              <h3 class="section-title">Shortcuts</h3>
            </div>
            <div class="role-shortcuts-grid">
              <button class="role-shortcut-btn" @click="$emit('navigate', 'my-items')">
                <span class="role-shortcut-title">Items</span>
                <span class="role-shortcut-meta">View all owned assets</span>
              </button>
              <button class="role-shortcut-btn" @click="$emit('navigate', 'borrow-items')">
                <span class="role-shortcut-title">Borrow Items</span>
                <span class="role-shortcut-meta">Browse & request items</span>
              </button>
              <button class="role-shortcut-btn" @click="$emit('navigate', 'my-borrowing-record')">
                <span class="role-shortcut-title">Borrow Records</span>
                <span class="role-shortcut-meta">Track your request history</span>
              </button>
            </div>
          </div>
        </div>

        <div class="role-main-grid animate-in delay-3">
          <div class="section-card role-section-card">
            <div class="section-header">
              <h3 class="section-title">Items Currently In-use</h3>
              <Button variant="link" size="sm" @click="$emit('navigate', 'teacher-checkout')">View all →</Button>
            </div>
            <div v-if="teacherOwnedInUseItems.length === 0" class="empty-state-sm">No owned items are currently in-use.</div>
            <div v-else class="table-responsive">
              <table class="table-striped role-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Borrower</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in teacherOwnedInUseItems.slice(0, 6)" :key="item.id">
                    <td class="font-semibold">{{ item.name }}</td>
                    <td>{{ item.currentBorrowerName || item.currentBorrower || '—' }}</td>
                    <td><StatusBadge :status="item.status" type="item" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="section-card role-section-card">
            <div class="section-header">
              <h3 class="section-title">Borrow Records</h3>
              <Button variant="link" size="sm" @click="$emit('navigate', 'my-borrowing-record')">View all →</Button>
            </div>
            <div v-if="myRecentBorrows.length === 0" class="empty-state-sm">No borrowing records yet.</div>
            <div v-else class="record-list">
              <div v-for="borrow in myRecentBorrows.slice(0, 6)" :key="borrow.id" class="record-item">
                <div class="record-main">
                  <p class="record-name">{{ borrow.itemName }}</p>
                  <p class="record-id">#{{ borrow.id }}</p>
                </div>
                <div class="record-right">
                  <StatusBadge :status="borrow.status" type="request" />
                  <span class="record-date">{{ formatDate(borrow.returnDate) || 'N/A' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== STUDENT / USER VIEW ==================== -->
    <template v-else>
      <div class="role-dashboard role-dashboard--student">
        <div class="role-header animate-in">
          <div>
            <h2 class="role-title">My Inventory Dashboard</h2>
            <p class="role-subtitle">{{ todayLabel }} · Track your items, requests, and return schedules.</p>
          </div>
          <div class="role-header-actions">
            <Button size="sm" @click="$emit('navigate', 'borrow-items')">Browse & Borrow Items</Button>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="ops-cards animate-in delay-1">
          <Card class="ops-summary-card" @click="$emit('navigate', 'my-items')">
            <div class="ops-card-header">
              <div class="ops-card-icon ops-card-icon--success"><Package :size="18" /></div>
              <span class="ops-card-value">{{ myActiveBorrows.length }}</span>
            </div>
            <span class="ops-card-label">Active Borrows</span>
            <div class="ops-card-metrics">
              <span>Checked out <strong>{{ myCheckedOutBorrows.length }}</strong></span>
              <span>Pending pickup <strong>{{ myPendingCheckoutBorrows.length }}</strong></span>
            </div>
          </Card>

          <Card class="ops-summary-card" @click="$emit('navigate', 'my-borrowing-record', { tab: 'pending' })">
            <div class="ops-card-header">
              <div class="ops-card-icon ops-card-icon--warning"><ClipboardList :size="18" /></div>
              <span class="ops-card-value">{{ myPendingBorrows.length }}</span>
            </div>
            <span class="ops-card-label">Pending Requests</span>
            <div class="ops-card-metrics">
              <span>Awaiting approval <strong>{{ myPendingApprovalBorrows.length }}</strong></span>
              <span>Awaiting pickup <strong>{{ myPendingCheckoutBorrows.length }}</strong></span>
            </div>
          </Card>

          <Card class="ops-summary-card" @click="scrollToStudentTab('borrowed')">
            <div class="ops-card-header">
              <div class="ops-card-icon ops-card-icon--danger"><AlertTriangle :size="18" /></div>
              <span class="ops-card-value" :class="{ 'ops-card-value--danger': myOverdueBorrows.length > 0 }">{{ myOverdueBorrows.length }}</span>
            </div>
            <span class="ops-card-label">Overdue Returns</span>
            <div class="ops-card-metrics">
              <span :class="{ 'metric-danger': myOverdueOver7d.length > 0 }">Over 7 days <strong>{{ myOverdueOver7d.length }}</strong></span>
              <span :class="{ 'metric-danger': myOverdue1to7d.length > 0 }">1–7 days <strong>{{ myOverdue1to7d.length }}</strong></span>
            </div>
          </Card>

          <Card class="ops-summary-card" @click="scrollToStudentTab('borrowed')">
            <div class="ops-card-header">
              <div class="ops-card-icon ops-card-icon--warning"><Clock :size="18" /></div>
              <span class="ops-card-value" :class="{ 'ops-card-value--warning': myDueSoonBorrows.length > 0 }">{{ myDueSoonBorrows.length }}</span>
            </div>
            <span class="ops-card-label">Due Within 7 Days</span>
            <div class="ops-card-metrics">
              <span>Due today <strong>{{ myDueTodayBorrowsList.length }}</strong></span>
              <span>Due in 1–3d <strong>{{ myDue1to3d.length }}</strong></span>
              <span>Due in 4–7d <strong>{{ myDue4to7d.length }}</strong></span>
            </div>
          </Card>
        </div>

        <!-- Main 2-column layout -->
        <div class="ops-main animate-in delay-2">
          <!-- LEFT: Items & Requests Table -->
          <Card class="student-main-card" ref="studentMainCardRef">
            <div class="student-tabs-header">
              <h3 class="ops-section-title">My Items & Requests</h3>
            </div>
            <div class="ops-attention-tabs-row">
              <div class="ops-attention-tabs">
                <button class="ops-tab" :class="{ active: studentActiveTab === 'borrowed' }" @click="studentActiveTab = 'borrowed'">
                  Currently Borrowed <span class="ops-tab-count">{{ myCheckedOutBorrows.length }}</span>
                </button>
                <button class="ops-tab" :class="{ active: studentActiveTab === 'pending' }" @click="studentActiveTab = 'pending'">
                  Pending Requests <span class="ops-tab-count" :class="{ 'ops-tab-count--warning': myAllPendingRequests.length > 0 }">{{ myAllPendingRequests.length }}</span>
                </button>
                <button class="ops-tab" :class="{ active: studentActiveTab === 'all' }" @click="studentActiveTab = 'all'">
                  All Records <span class="ops-tab-count">{{ myBorrows.length }}</span>
                </button>
              </div>
            </div>

            <!-- Currently Borrowed Tab -->
            <div v-if="studentActiveTab === 'borrowed'" class="student-table-wrap">
              <table v-if="myCheckedOutBorrows.length > 0" class="ops-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Item ID</th>
                    <th>Return Date</th>
                    <th>Days Left</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="borrow in paginatedBorrowed" :key="borrow.id"
                      :class="getBorrowRowClass(borrow)">
                    <td class="student-item-name">{{ borrow.itemName }}</td>
                    <td class="student-item-id">{{ borrow.itemID }}</td>
                    <td>{{ formatDate(borrow.returnDate) || '—' }}</td>
                    <td>
                      <span class="student-days-badge" :class="getDaysLeftClass(borrow)">
                        {{ getDaysLeftLabel(borrow) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="student-empty">No items currently borrowed.</div>
              <div v-if="borrowedTotalPages > 1" class="student-pagination">
                <button :disabled="borrowedPage <= 1" @click="borrowedPage--">&laquo;</button>
                <span>{{ borrowedPage }} / {{ borrowedTotalPages }}</span>
                <button :disabled="borrowedPage >= borrowedTotalPages" @click="borrowedPage++">&raquo;</button>
              </div>
            </div>

            <!-- Pending Requests Tab -->
            <div v-if="studentActiveTab === 'pending'" class="student-table-wrap">
              <table v-if="myAllPendingRequests.length > 0" class="ops-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Request ID</th>
                    <th>Stage</th>
                    <th>Requested</th>
                    <th>Decision</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="borrow in paginatedPending" :key="borrow.id">
                    <td class="student-item-name">{{ borrow.itemName }}</td>
                    <td class="student-item-id">#{{ borrow.requestId || borrow.id }}</td>
                    <td>
                      <span class="student-stage-badge" :class="getStageClass(borrow)">
                        {{ getStageName(borrow) }}
                      </span>
                    </td>
                    <td>{{ formatDate(borrow.requestDate || borrow.createdAt) }}</td>
                    <td>
                      <span v-if="normalizedStatus(borrow.status) === 'approved'" class="student-decision student-decision--approved">
                        <CheckCircle2 :size="14" /> Ready for pickup
                      </span>
                      <span v-else-if="normalizedStatus(borrow.status) === 'rejected'" class="student-decision student-decision--rejected" :title="borrow.rejectionReason || borrow.notes || ''">
                        <XCircle :size="14" /> Rejected
                      </span>
                      <span v-else class="student-decision student-decision--waiting">
                        <Clock :size="14" /> Waiting
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="student-empty">No pending requests.</div>
              <div v-if="pendingTotalPages > 1" class="student-pagination">
                <button :disabled="pendingPage <= 1" @click="pendingPage--">&laquo;</button>
                <span>{{ pendingPage }} / {{ pendingTotalPages }}</span>
                <button :disabled="pendingPage >= pendingTotalPages" @click="pendingPage++">&raquo;</button>
              </div>
            </div>

            <!-- All Records Tab -->
            <div v-if="studentActiveTab === 'all'" class="student-table-wrap">
              <table v-if="myRecentBorrows.length > 0" class="ops-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Request ID</th>
                    <th>Status</th>
                    <th>Request Date</th>
                    <th>Return Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="borrow in paginatedAll" :key="borrow.id">
                    <td class="student-item-name">{{ borrow.itemName }}</td>
                    <td class="student-item-id">#{{ borrow.requestId || borrow.id }}</td>
                    <td><StatusBadge :status="borrow.status" type="request" /></td>
                    <td>{{ formatDate(borrow.requestDate || borrow.createdAt) }}</td>
                    <td>{{ formatDate(borrow.returnDate) || '—' }}</td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="student-empty">No borrowing records yet.</div>
              <div v-if="allTotalPages > 1" class="student-pagination">
                <button :disabled="allPage <= 1" @click="allPage--">&laquo;</button>
                <span>{{ allPage }} / {{ allTotalPages }}</span>
                <button :disabled="allPage >= allTotalPages" @click="allPage++">&raquo;</button>
              </div>
            </div>
          </Card>

          <!-- RIGHT: Sidebar -->
          <div class="student-sidebar">
            <!-- Return Schedule -->
            <Card class="student-sidebar-card">
              <div class="section-header">
                <h3 class="ops-section-title"><Calendar :size="16" /> Return Schedule</h3>
              </div>
              <div v-if="myCheckedOutBorrows.length === 0" class="student-empty">No upcoming returns</div>
              <div v-else class="student-schedule">
                <div v-if="returnSchedule.overdue.length > 0" class="student-schedule-group">
                  <div class="student-schedule-label student-schedule-label--danger">OVERDUE</div>
                  <div v-for="item in returnSchedule.overdue" :key="item.id" class="student-schedule-item student-schedule-item--overdue">
                    <span class="student-schedule-dot student-schedule-dot--danger"></span>
                    <div class="student-schedule-info">
                      <span class="student-schedule-name">{{ item.itemName }}</span>
                      <span class="student-schedule-date">{{ formatDate(item.returnDate) }} · {{ Math.abs(daysUntilReturn(item.returnDate)) }}d overdue</span>
                    </div>
                  </div>
                </div>
                <div v-if="returnSchedule.today.length > 0" class="student-schedule-group">
                  <div class="student-schedule-label student-schedule-label--warning">DUE TODAY</div>
                  <div v-for="item in returnSchedule.today" :key="item.id" class="student-schedule-item">
                    <span class="student-schedule-dot student-schedule-dot--warning"></span>
                    <div class="student-schedule-info">
                      <span class="student-schedule-name">{{ item.itemName }}</span>
                      <span class="student-schedule-date">{{ formatDate(item.returnDate) }}</span>
                    </div>
                  </div>
                </div>
                <div v-if="returnSchedule.tomorrow.length > 0" class="student-schedule-group">
                  <div class="student-schedule-label">TOMORROW</div>
                  <div v-for="item in returnSchedule.tomorrow" :key="item.id" class="student-schedule-item">
                    <span class="student-schedule-dot student-schedule-dot--info"></span>
                    <div class="student-schedule-info">
                      <span class="student-schedule-name">{{ item.itemName }}</span>
                      <span class="student-schedule-date">{{ formatDate(item.returnDate) }}</span>
                    </div>
                  </div>
                </div>
                <div v-if="returnSchedule.thisWeek.length > 0" class="student-schedule-group">
                  <div class="student-schedule-label">THIS WEEK</div>
                  <div v-for="item in returnSchedule.thisWeek" :key="item.id" class="student-schedule-item">
                    <span class="student-schedule-dot student-schedule-dot--muted"></span>
                    <div class="student-schedule-info">
                      <span class="student-schedule-name">{{ item.itemName }}</span>
                      <span class="student-schedule-date">{{ formatDate(item.returnDate) }} · {{ Math.abs(daysUntilReturn(item.returnDate)) }}d left</span>
                    </div>
                  </div>
                </div>
                <div v-if="returnSchedule.later.length > 0" class="student-schedule-group">
                  <div class="student-schedule-label">LATER</div>
                  <div v-for="item in returnSchedule.later" :key="item.id" class="student-schedule-item">
                    <span class="student-schedule-dot student-schedule-dot--muted"></span>
                    <div class="student-schedule-info">
                      <span class="student-schedule-name">{{ item.itemName }}</span>
                      <span class="student-schedule-date">{{ formatDate(item.returnDate) }} · {{ Math.abs(daysUntilReturn(item.returnDate)) }}d left</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <!-- Request Status / Notifications -->
            <Card class="student-sidebar-card">
              <div class="section-header">
                <h3 class="ops-section-title"><Bell :size="16" /> Request Updates</h3>
              </div>
              <div v-if="studentNotifications.length === 0" class="student-empty">No recent updates</div>
              <div v-else class="student-notifications">
                <div v-for="notif in studentNotifications" :key="notif.id" class="student-notification-item">
                  <span v-if="notif.isApproved" class="student-notif-icon student-notif-icon--approved"><CheckCircle2 :size="16" /></span>
                  <span v-else class="student-notif-icon student-notif-icon--rejected"><XCircle :size="16" /></span>
                  <div class="student-notif-info">
                    <span class="student-notif-name">{{ notif.itemName }}</span>
                    <span class="student-notif-status" :class="notif.isApproved ? 'student-notif-status--approved' : 'student-notif-status--rejected'">
                      {{ notif.isApproved ? 'Approved' : 'Rejected' }}
                    </span>
                    <span v-if="!notif.isApproved && notif.reason" class="student-notif-reason">{{ notif.reason }}</span>
                    <span class="student-notif-date">{{ formatDate(notif.date) }}</span>
                  </div>
                </div>
              </div>
            </Card>

            <!-- Quick Actions -->
            <Card class="student-sidebar-card">
              <div class="section-header">
                <h3 class="ops-section-title"><Zap :size="16" /> Quick Actions</h3>
              </div>
              <div class="role-shortcuts-grid">
                <button class="role-shortcut-btn" @click="$emit('navigate', 'my-items')">
                  <span class="role-shortcut-title">My Items</span>
                  <span class="role-shortcut-meta">View borrowed items</span>
                </button>
                <button class="role-shortcut-btn" @click="$emit('navigate', 'my-borrowing-record')">
                  <span class="role-shortcut-title">Borrow Records</span>
                  <span class="role-shortcut-meta">View all request history</span>
                </button>
                <button class="role-shortcut-btn" @click="$emit('navigate', 'borrow-items')">
                  <span class="role-shortcut-title">Borrow Items</span>
                  <span class="role-shortcut-meta">Browse & request items</span>
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </template>
  </div>
  <Teleport to="body">
    <div v-if="overdueTooltipVisible" class="overdue-fixed-tooltip" :style="overdueTooltipStyle">
      This user has overdue item(s) to return
    </div>
  </Teleport>
</template>

<script>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useAuth } from '../hooks/useAuth'
import { inventoryService, borrowingService, auditService, authService, statsService } from '../utils/services'
import { formatDate, waitingTime, isOverdue } from '../utils/helpers'
import { useActionLock } from '../hooks/useActionLock'
import {
  ClipboardList, ClipboardCheck, RotateCcw, Package, AlertTriangle,
  AlertCircle, CheckCircle2, BarChart3, Activity, Zap, Plus,
  ArrowUpDown, FileText, Edit, Trash2, ShieldCheck, LogOut,
  MoreVertical, Eye, Bell, XCircle, Ban, Filter, SlidersHorizontal,
  ChevronDown, Download, Clock, Calendar, Timer, ChevronRight
} from 'lucide-vue-next'
import StatusBadge from '../components/StatusBadge.vue'
import DropdownWithOther from '../components/DropdownWithOther.vue'
import RemarkBox from '../components/RemarkBox.vue'
import {
  UiCard as Card, UiBadge as Badge, UiButton as Button,
  UiCheckbox as Checkbox, UiDropdownMenu as DropdownMenu,
  UiDropdownMenuItem as DropdownMenuItem,
  UiInput as Input, UiTextarea as Textarea,
  UiSpinner as Spinner
} from '../components/ui'

export default {
  components: {
    StatusBadge, DropdownWithOther, RemarkBox,
    Card, Badge, Button, Checkbox, DropdownMenu, DropdownMenuItem, Input, Textarea, Spinner,
    ClipboardList, ClipboardCheck, RotateCcw, Package, AlertTriangle,
    AlertCircle, CheckCircle2, BarChart3, Activity, Zap, Plus,
    ArrowUpDown, FileText, Edit, Trash2, ShieldCheck, LogOut,
    MoreVertical, Eye, Bell, XCircle, Ban, Filter, SlidersHorizontal,
    ChevronDown, Download, Clock, Calendar, Timer, ChevronRight
  },
  emits: ['navigate'],
  setup(props, { emit }) {
    const { user } = useAuth()

    // === Core data refs ===
    const createStatsSnapshot = () => ({
      totalItems: null,
      availableItems: null,
      lentOutItems: null,
      missingItems: null,
      notAvailableItems: null,
      transferredItems: null,
      disposedItems: null,
      pendingRequests: null,
      returnedRequests: null,
      approvedRequests: null,
      rejectedRequests: null,
      warrantyExpiredItems: null,
      warrantyExpiringSoonItems: null
    })

    const createLoadState = () => ({
      isInitialLoading: true,
      isFetching: false,
      isLoaded: false,
      error: null
    })

    const stats = ref(createStatsSnapshot())
    const recentLogs = ref([])
    const myBorrows = ref([])
    const dashboardLoadState = reactive({
      stats: createLoadState(),
      queue: createLoadState(),
      logs: createLoadState()
    })

    const createEmptyAttentionCounts = () => ({
      tabs: { all: 0, returns: 0, requests: 0, inventory: 0 },
      returns: { overdue: 0, dueSoon: 0, dueToday: 0 },
      requests: { pending: 0, pendingCheckout: 0, longWait: 0 },
      inventory: { missing: 0, notAvailable: 0, transferred: 0, warrantyExpired: 0, warrantyExpiringSoon: 0 }
    })

    const normalizeAttentionCounts = (incoming = {}) => {
      const base = createEmptyAttentionCounts()
      return {
        tabs: { ...base.tabs, ...(incoming.tabs || {}) },
        returns: { ...base.returns, ...(incoming.returns || {}) },
        requests: { ...base.requests, ...(incoming.requests || {}) },
        inventory: { ...base.inventory, ...(incoming.inventory || {}) }
      }
    }

    const attentionRows = ref([])
    const attentionTotal = ref(0)
    const attentionTotalPages = ref(1)
    const attentionCounts = ref(createEmptyAttentionCounts())

    // Teacher data
    const teacherOwnedItems = ref([])
    const teacherPendingCount = ref(0)
    const teacherPendingRequests = ref([])
    const teacherCheckedOutCount = ref(0)
    const teacherActiveTab = ref('all')

    // Attention tab, pagination & selection state
    const attentionActiveTab = ref('all')
    const attentionPage = ref(1)
    const attentionPageSize = ref(10)
    const attentionPageSizeOptions = [10, 20, 30, 40, 50]
    const attentionSortBy = ref('priority')
    const attentionSortOrder = ref('desc')
    const selectedRows = reactive(new Set())
    const queueFetchMode = ref('initial')
    let latestStatsRequestId = 0
    let latestLogsRequestId = 0
    let latestAttentionQueueRequestId = 0
    let lastQueueQueryKey = ''
    let skipNextAttentionPageWatch = false

    // Filter state
    const filterPriority = ref('')
    const filterStatus = ref('')

    // Visible columns state
    const visibleColumns = reactive({
      item: true,
      type: true,
      user: true,
      status: true,
      date: true,
      priority: true
    })

    // Inline modal state
    const inlineApproveId = ref(null)
    const inlineReturnDate = ref('')
    const inlineRemark = ref('')
    const inlineRejectId = ref(null)
    const inlineRejectReason = ref('')
    const locationOptions = ref(['Lab A', 'Lab B', 'Lab C', 'Office', 'Storage Room', 'Shelf 1', 'Shelf 2', 'Other'])
    const inlineLocation = ref('Lab A')
    const bulkConfirmActionId = ref('')
    const bulkActionSubmitting = ref(false)
    const { runAction } = useActionLock()
    const bulkApproveReturnDate = ref('')
    const bulkApproveLocation = ref('Lab A')
    const bulkApproveRemark = ref('')
    const bulkRejectReason = ref('')

    // === Computed ===
    const todayLabel = computed(() => {
      return new Date().toLocaleDateString('en-HK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    })

    const hasActiveFilters = computed(() => filterPriority.value !== '' || filterStatus.value !== '')
    const isStatsInitialLoading = computed(() => dashboardLoadState.stats.isInitialLoading && !dashboardLoadState.stats.isLoaded)
    const isStatsBackgroundFetching = computed(() => dashboardLoadState.stats.isFetching && dashboardLoadState.stats.isLoaded)
    const isQueueInitialLoading = computed(() => dashboardLoadState.queue.isInitialLoading && !dashboardLoadState.queue.isLoaded)
    const isQueueFetching = computed(() => dashboardLoadState.queue.isFetching)
    const showQueueSkeleton = computed(() => isQueueFetching.value && queueFetchMode.value !== 'background')
    const isQueueBackgroundFetching = computed(() => isQueueFetching.value && queueFetchMode.value === 'background' && dashboardLoadState.queue.isLoaded)
    const isLogsInitialLoading = computed(() => dashboardLoadState.logs.isInitialLoading && !dashboardLoadState.logs.isLoaded)
    const isLogsBackgroundFetching = computed(() => dashboardLoadState.logs.isFetching && dashboardLoadState.logs.isLoaded)
    const isCardsInitialLoading = computed(() => isStatsInitialLoading.value || isQueueInitialLoading.value)
    const queueErrorMessage = computed(() => dashboardLoadState.queue.error || '')
    const logsErrorMessage = computed(() => dashboardLoadState.logs.error || '')

    const attentionSkeletonRows = computed(() => {
      const count = Math.min(Math.max(attentionPageSize.value || 10, 5), 10)
      return Array.from({ length: count }, (_, index) => index)
    })

    const attentionVisibleColumnCount = computed(() => {
      const toggled = ['item', 'type', 'user', 'status', 'date', 'priority']
        .reduce((count, key) => count + (visibleColumns[key] ? 1 : 0), 0)
      return toggled + 2
    })

    const pendingRequestsCount = computed(() =>
      (attentionCounts.value.requests.pending || 0) + (attentionCounts.value.requests.pendingCheckout || 0)
    )
    const overdueCount = computed(() => attentionCounts.value.returns.overdue || 0)
    const dueSoonCount = computed(() => attentionCounts.value.returns.dueSoon || 0)
    const dueTodayCount = computed(() => attentionCounts.value.returns.dueToday || 0)

    // Summary card metrics
    const pendingPureCount = computed(() => attentionCounts.value.requests.pending || 0)
    const pendingCheckoutCount = computed(() => attentionCounts.value.requests.pendingCheckout || 0)
    const longWaitCount = computed(() => attentionCounts.value.requests.longWait || 0)
    const notAvailableCount = computed(() => stats.value.notAvailableItems || attentionCounts.value.inventory.notAvailable || 0)
    const transferredCount = computed(() => stats.value.transferredItems || attentionCounts.value.inventory.transferred || 0)
    const warrantyExpiredCount = computed(() => stats.value.warrantyExpiredItems || attentionCounts.value.inventory.warrantyExpired || 0)
    const warrantyExpiringSoonCount = computed(() => stats.value.warrantyExpiringSoonItems || attentionCounts.value.inventory.warrantyExpiringSoon || 0)
    const warrantyAlertCount = computed(() => warrantyExpiredCount.value + warrantyExpiringSoonCount.value)
    const readyForNewRequestCount = computed(() => {
      const available = Number(stats.value.availableItems) || 0
      const reservedForPickup = Number(pendingCheckoutCount.value) || 0
      return Math.max(available - reservedForPickup, 0)
    })
    const summaryText = computed(() => {
      if (isStatsInitialLoading.value || isQueueInitialLoading.value) return 'Loading dashboard data...'
      if (dashboardLoadState.stats.error || dashboardLoadState.queue.error) return 'Dashboard data unavailable'

      const total = Number(stats.value.totalItems) || 0
      const actionParts = []
      if (pendingRequestsCount.value > 0) actionParts.push(pendingRequestsCount.value + ' to review')
      if (overdueCount.value > 0) actionParts.push(overdueCount.value + ' overdue')
      if (actionParts.length === 0) return total + ' items tracked — all clear'
      return total + ' items · ' + actionParts.join(', ')
    })

    const attentionPaginationText = computed(() => {
      if (isQueueInitialLoading.value) return 'Loading queue...'
      if (showQueueSkeleton.value) return 'Loading queue...'
      if (dashboardLoadState.queue.error) return 'Queue unavailable'
      if (isQueueBackgroundFetching.value) return 'Updating queue...'
      if (attentionTotal.value === 0) return '0 of 0'
      return `${attentionPageStart.value}–${attentionPageEnd.value} of ${attentionTotal.value}`
    })

    const attentionPageIndicator = computed(() => {
      if (!dashboardLoadState.queue.isLoaded) return ''
      if (dashboardLoadState.queue.error) return ''
      const totalPages = Math.max(1, attentionTotalPages.value || 1)
      const currentPage = Math.min(Math.max(attentionPage.value, 1), totalPages)
      return `Page ${currentPage} of ${totalPages}`
    })

    // Inventory status bars
    const inventoryStatusBars = computed(() => {
      const total = stats.value.totalItems || 1
      return [
        { label: 'Available', count: stats.value.availableItems, color: 'var(--success)', percent: (stats.value.availableItems / total) * 100, isException: false },
        { label: 'In-use', count: stats.value.lentOutItems, color: 'var(--info)', percent: (stats.value.lentOutItems / total) * 100, isException: false },
        { label: 'Missing', count: stats.value.missingItems, color: 'var(--danger)', percent: (stats.value.missingItems / total) * 100, isException: true },
        { label: 'Not Available', count: notAvailableCount.value, color: 'var(--warning)', percent: (notAvailableCount.value / total) * 100, isException: true },
        { label: 'Transferred', count: transferredCount.value, color: 'var(--surface-400)', percent: (transferredCount.value / total) * 100, isException: false },
        { label: 'Disposed', count: stats.value.disposedItems, color: 'var(--muted-foreground)', percent: (stats.value.disposedItems / total) * 100, isException: false },
      ]
    })

    const attentionFilterTabs = computed(() => [
      { key: 'all', label: 'All', count: attentionCounts.value.tabs.all || 0 },
      { key: 'returns', label: 'Returns', count: attentionCounts.value.tabs.returns || 0 },
      { key: 'requests', label: 'Requests', count: attentionCounts.value.tabs.requests || 0 },
      { key: 'inventory', label: 'Inventory', count: attentionCounts.value.tabs.inventory || 0 }
    ])

    const attentionVisiblePages = computed(() => {
      const pages = []
      const total = attentionTotalPages.value
      let start = Math.max(1, attentionPage.value - 2)
      let end = Math.min(total, start + 4)
      start = Math.max(1, end - 4)
      for (let i = start; i <= end; i++) pages.push(i)
      return pages
    })

    const attentionPageStart = computed(() => {
      if (attentionTotal.value === 0) return 0
      return (attentionPage.value - 1) * attentionPageSize.value + 1
    })

    const attentionPageEnd = computed(() => {
      if (attentionTotal.value === 0) return 0
      return Math.min(attentionPage.value * attentionPageSize.value, attentionTotal.value)
    })

    const getAttentionRowKey = (row) => row.type + '-' + row.id
    const getAttentionRowGroup = (row) => {
      if (row.queueTab === 'returns' || row.queueTab === 'requests' || row.queueTab === 'inventory') return row.queueTab
      if (row.actionType === 'approve' || row.actionType === 'checkout') return 'requests'
      if (row.actionType === 'view-lent') return 'returns'
      return 'inventory'
    }

    const selectedAttentionRows = computed(() =>
      attentionRows.value.filter(row => selectedRows.has(getAttentionRowKey(row)))
    )

    const bulkSelectionSummary = computed(() => {
      const byGroup = { returns: 0, requests: 0, inventory: 0 }
      selectedAttentionRows.value.forEach((row) => {
        const group = getAttentionRowGroup(row)
        if (group in byGroup) byGroup[group] += 1
      })
      return {
        total: selectedAttentionRows.value.length,
        byGroup
      }
    })

    const isPendingApprovalRow = (row) =>
      getAttentionRowGroup(row) === 'requests' &&
      (row.actionType === 'approve' || row.rawStatus === 'Pending' || row.status === 'Pending Approval')

    const isPendingCheckoutRow = (row) =>
      getAttentionRowGroup(row) === 'requests' &&
      (row.actionType === 'checkout' || row.rawStatus === 'Pending Check-Out' || row.status === 'Pending Check-Out')

    const isReturnFollowUpRow = (row) =>
      getAttentionRowGroup(row) === 'returns' &&
      (String(row.dateLabel || '').includes('Overdue') || String(row.dateLabel || '').includes('Due Soon') || String(row.dateLabel || '').includes('Due Today'))

    const isInventoryRow = (row) => getAttentionRowGroup(row) === 'inventory'
    const canMarkUnavailableRow = (row) => isInventoryRow(row) && row.rawStatus !== 'Not Available' && row.rawStatus !== 'Transferred'
    const canTransferRow = (row) => isInventoryRow(row) && row.rawStatus !== 'Transferred'

    const bulkActionDefinitions = [
      {
        id: 'view-selected',
        label: 'View Selected',
        kind: 'safe',
        tabs: ['all', 'returns', 'requests', 'inventory'],
        icon: Eye,
        destructive: false,
        implemented: true,
        description: 'Open the relevant queue page for the current selection.',
        isEligible: () => true
      },
      {
        id: 'export-selected',
        label: 'Export Selected',
        kind: 'safe',
        tabs: ['all', 'returns', 'requests', 'inventory'],
        icon: Download,
        destructive: false,
        implemented: true,
        description: 'Export selected rows from the current page as CSV.',
        isEligible: () => true
      },
      {
        id: 'send-reminder',
        label: 'Send Reminder',
        kind: 'state',
        tabs: ['returns', 'all'],
        icon: Bell,
        destructive: false,
        implemented: false,
        description: 'Only return follow-up rows can receive reminders.',
        isEligible: isReturnFollowUpRow
      },
      {
        id: 'mark-reviewed',
        label: 'Mark Reviewed',
        kind: 'state',
        tabs: ['returns', 'all'],
        icon: CheckCircle2,
        destructive: false,
        implemented: false,
        description: 'Only return follow-up rows can be marked reviewed.',
        isEligible: isReturnFollowUpRow
      },
      {
        id: 'approve-selected',
        label: 'Approve Selected',
        kind: 'state',
        tabs: ['requests', 'all'],
        icon: CheckCircle2,
        destructive: false,
        implemented: true,
        description: 'Only pending request rows can be approved.',
        isEligible: isPendingApprovalRow
      },
      {
        id: 'reject-selected',
        label: 'Reject Selected',
        kind: 'state',
        tabs: ['requests', 'all'],
        icon: XCircle,
        destructive: true,
        implemented: true,
        description: 'Only pending request rows can be rejected.',
        isEligible: isPendingApprovalRow
      },
      {
        id: 'mark-checkout-ready',
        label: 'Checkout Selected',
        kind: 'state',
        tabs: ['requests', 'all'],
        icon: Package,
        destructive: false,
        implemented: true,
        description: 'Only pending check-out rows can be marked as borrowed out.',
        isEligible: isPendingCheckoutRow
      },
      {
        id: 'mark-unavailable',
        label: 'Mark Unavailable',
        kind: 'state',
        tabs: ['inventory', 'all'],
        icon: Ban,
        destructive: false,
        implemented: false,
        description: 'Only eligible inventory rows can be marked unavailable.',
        isEligible: canMarkUnavailableRow
      },
      {
        id: 'transfer-selected',
        label: 'Transfer Selected',
        kind: 'state',
        tabs: ['inventory', 'all'],
        icon: ArrowUpDown,
        destructive: false,
        implemented: false,
        description: 'Only eligible inventory rows can be transferred.',
        isEligible: canTransferRow
      }
    ]

    const bulkActionMap = Object.fromEntries(bulkActionDefinitions.map(action => [action.id, action]))

    const bulkActionStats = computed(() => {
      const rows = selectedAttentionRows.value
      return bulkActionDefinitions.reduce((acc, action) => {
        const eligibleRows = action.kind === 'safe'
          ? rows
          : rows.filter(row => action.isEligible(row))
        acc[action.id] = {
          eligibleRows,
          eligibleCount: eligibleRows.length,
          ineligibleCount: Math.max(0, rows.length - eligibleRows.length)
        }
        return acc
      }, {})
    })

    const visibleStateBulkActions = computed(() => {
      const activeTab = attentionActiveTab.value
      return bulkActionDefinitions
        .filter(action => action.kind === 'state' && action.tabs.includes(activeTab))
        .map((action) => {
          const statsForAction = bulkActionStats.value[action.id] || { eligibleCount: 0, ineligibleCount: bulkSelectionSummary.value.total }
          return {
            ...action,
            ...statsForAction,
            disabled: statsForAction.eligibleCount === 0,
            menuLabel: `${action.label} (${statsForAction.eligibleCount})${action.implemented ? '' : ' · Not Connected'}`
          }
        })
    })

    const bulkConfirmAction = computed(() => {
      if (!bulkConfirmActionId.value) return null
      return bulkActionMap[bulkConfirmActionId.value] || null
    })

    const bulkConfirmStats = computed(() => {
      const statsForAction = bulkActionStats.value[bulkConfirmActionId.value]
      if (statsForAction) return statsForAction
      return {
        eligibleRows: [],
        eligibleCount: 0,
        ineligibleCount: bulkSelectionSummary.value.total
      }
    })

    const bulkConfirmDisabled = computed(() => {
      const action = bulkConfirmAction.value
      if (!action) return true
      if (action.id === 'approve-selected') return !bulkApproveReturnDate.value
      if (action.id === 'reject-selected') return !bulkRejectReason.value.trim()
      return false
    })

    // Selection
    const isAllPageSelected = computed(() => {
      if (attentionRows.value.length === 0) return false
      return attentionRows.value.every(r => selectedRows.has(getAttentionRowKey(r)))
    })
    const isSomePageSelected = computed(() => {
      return attentionRows.value.some(r => selectedRows.has(getAttentionRowKey(r)))
    })
    const toggleSelectAll = () => {
      if (isAllPageSelected.value) {
        attentionRows.value.forEach(r => selectedRows.delete(getAttentionRowKey(r)))
      } else {
        attentionRows.value.forEach(r => selectedRows.add(getAttentionRowKey(r)))
      }
    }
    const toggleRow = (rowKey) => {
      if (selectedRows.has(rowKey)) selectedRows.delete(rowKey)
      else selectedRows.add(rowKey)
    }

    // Filtered logs (remove login/logout)
    const filteredLogs = computed(() =>
      recentLogs.value.filter(log => {
        const action = (log.action || '').toUpperCase()
        return !action.includes('LOGIN') && !action.includes('LOGOUT')
      })
    )

    // Teacher computed
    const teacherAttentionTabs = computed(() => [
      { key: 'all', label: 'All', count: teacherPendingRequests.value.length + teacherCheckedOutCount.value, severity: 'neutral' },
      { key: 'pending', label: 'Pending', count: teacherPendingRequests.value.length, severity: 'danger' },
      { key: 'checkout', label: 'Checked out', count: teacherCheckedOutCount.value, severity: 'neutral' }
    ])
    const teacherActiveTabEmpty = computed(() => {
      if (teacherActiveTab.value === 'all') return teacherPendingRequests.value.length === 0 && teacherCheckedOutCount.value === 0
      if (teacherActiveTab.value === 'pending') return teacherPendingRequests.value.length === 0
      if (teacherActiveTab.value === 'checkout') return teacherCheckedOutCount.value === 0
      return true
    })

    const normalizedStatus = (status) => String(status || '').trim().toLowerCase()
    const teacherPendingOnly = computed(() =>
      teacherPendingRequests.value.filter(req => normalizedStatus(req.status) === 'pending')
    )
    const teacherPendingCheckoutOnly = computed(() =>
      teacherPendingRequests.value.filter(req => normalizedStatus(req.status) === 'pending check-out')
    )
    const teacherOwnedAvailableCount = computed(() =>
      teacherOwnedItems.value.filter(item => normalizedStatus(item.status) === 'available').length
    )
    const teacherOwnedInUseItems = computed(() =>
      teacherOwnedItems.value.filter(item => normalizedStatus(item.status) === 'in-use')
    )
    const myActiveBorrows = computed(() =>
      myBorrows.value.filter((borrow) => {
        const status = normalizedStatus(borrow.status)
        return status === 'approved' || status === 'pending check-out'
      })
    )
    const myPendingBorrows = computed(() =>
      myBorrows.value.filter((borrow) => normalizedStatus(borrow.status) === 'pending')
    )
    const myOverdueBorrows = computed(() =>
      myActiveBorrows.value.filter((borrow) => isOverdue(borrow.returnDate))
    )
    const myRecentBorrows = computed(() => {
      return [...myBorrows.value].sort((a, b) => {
        const aTime = new Date(a.requestDate || a.createdAt || a.updatedAt || 0).getTime()
        const bTime = new Date(b.requestDate || b.createdAt || b.updatedAt || 0).getTime()
        return bTime - aTime
      })
    })

    // === Student dashboard state & computed ===
    const studentActiveTab = ref('borrowed')
    const studentMainCardRef = ref(null)
    const borrowedPage = ref(1)
    const pendingPage = ref(1)
    const allPage = ref(1)
    const STUDENT_PAGE_SIZE = 5

    const scrollToStudentTab = (tab) => {
      studentActiveTab.value = tab
      nextTick(() => {
        const el = studentMainCardRef.value?.$el || studentMainCardRef.value
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }

    const daysUntilReturn = (returnDate) => {
      if (!returnDate) return null
      const target = new Date(returnDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      target.setHours(0, 0, 0, 0)
      return Math.floor((target - today) / 86400000)
    }

    const myCheckedOutBorrows = computed(() =>
      myActiveBorrows.value.filter(b => normalizedStatus(b.status) === 'approved')
    )
    const myPendingCheckoutBorrows = computed(() =>
      myActiveBorrows.value.filter(b => normalizedStatus(b.status) === 'pending check-out')
    )
    const myPendingApprovalBorrows = computed(() =>
      myBorrows.value.filter(b => normalizedStatus(b.status) === 'pending')
    )
    const myDueSoonBorrows = computed(() =>
      myCheckedOutBorrows.value.filter(b => {
        const d = daysUntilReturn(b.returnDate)
        return d !== null && d >= 0 && d <= 7
      })
    )
    const myDueTodayBorrowsList = computed(() =>
      myCheckedOutBorrows.value.filter(b => daysUntilReturn(b.returnDate) === 0)
    )
    const myDue1to3d = computed(() =>
      myCheckedOutBorrows.value.filter(b => {
        const d = daysUntilReturn(b.returnDate)
        return d !== null && d >= 1 && d <= 3
      })
    )
    const myDue4to7d = computed(() =>
      myCheckedOutBorrows.value.filter(b => {
        const d = daysUntilReturn(b.returnDate)
        return d !== null && d >= 4 && d <= 7
      })
    )
    const myOverdueOver7d = computed(() =>
      myOverdueBorrows.value.filter(b => {
        const d = daysUntilReturn(b.returnDate)
        return d !== null && d < -7
      })
    )
    const myOverdue1to7d = computed(() =>
      myOverdueBorrows.value.filter(b => {
        const d = daysUntilReturn(b.returnDate)
        return d !== null && d >= -7 && d < 0
      })
    )

    const myAllPendingRequests = computed(() =>
      myBorrows.value.filter(b => {
        const s = normalizedStatus(b.status)
        return s === 'pending' || s === 'pending check-out'
      }).sort((a, b) => {
        const aTime = new Date(a.requestDate || a.createdAt || 0).getTime()
        const bTime = new Date(b.requestDate || b.createdAt || 0).getTime()
        return bTime - aTime
      })
    )

    const sortedBorrowed = computed(() =>
      [...myCheckedOutBorrows.value].sort((a, b) => {
        const aD = daysUntilReturn(a.returnDate)
        const bD = daysUntilReturn(b.returnDate)
        if (aD === null) return 1
        if (bD === null) return -1
        return aD - bD
      })
    )

    const borrowedTotalPages = computed(() => Math.max(1, Math.ceil(sortedBorrowed.value.length / STUDENT_PAGE_SIZE)))
    const pendingTotalPages = computed(() => Math.max(1, Math.ceil(myAllPendingRequests.value.length / STUDENT_PAGE_SIZE)))
    const allTotalPages = computed(() => Math.max(1, Math.ceil(myRecentBorrows.value.length / STUDENT_PAGE_SIZE)))

    const paginatedBorrowed = computed(() => {
      const start = (borrowedPage.value - 1) * STUDENT_PAGE_SIZE
      return sortedBorrowed.value.slice(start, start + STUDENT_PAGE_SIZE)
    })
    const paginatedPending = computed(() => {
      const start = (pendingPage.value - 1) * STUDENT_PAGE_SIZE
      return myAllPendingRequests.value.slice(start, start + STUDENT_PAGE_SIZE)
    })
    const paginatedAll = computed(() => {
      const start = (allPage.value - 1) * STUDENT_PAGE_SIZE
      return myRecentBorrows.value.slice(start, start + STUDENT_PAGE_SIZE)
    })

    const returnSchedule = computed(() => {
      const groups = { overdue: [], today: [], tomorrow: [], thisWeek: [], later: [] }
      for (const b of myCheckedOutBorrows.value) {
        const d = daysUntilReturn(b.returnDate)
        if (d === null) { groups.later.push(b); continue }
        if (d < 0) groups.overdue.push(b)
        else if (d === 0) groups.today.push(b)
        else if (d === 1) groups.tomorrow.push(b)
        else if (d <= 7) groups.thisWeek.push(b)
        else groups.later.push(b)
      }
      groups.overdue.sort((a, b) => daysUntilReturn(a.returnDate) - daysUntilReturn(b.returnDate))
      groups.thisWeek.sort((a, b) => daysUntilReturn(a.returnDate) - daysUntilReturn(b.returnDate))
      groups.later.sort((a, b) => daysUntilReturn(a.returnDate) - daysUntilReturn(b.returnDate))
      return groups
    })

    const studentNotifications = computed(() => {
      return myBorrows.value
        .filter(b => {
          const s = normalizedStatus(b.status)
          return s === 'approved' || s === 'rejected' || s === 'pending check-out'
        })
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
        .slice(0, 5)
        .map(b => ({
          id: b.id,
          itemName: b.itemName,
          isApproved: normalizedStatus(b.status) !== 'rejected',
          reason: b.rejectionReason || b.notes || '',
          date: b.updatedAt || b.createdAt
        }))
    })

    const getBorrowRowClass = (borrow) => {
      const d = daysUntilReturn(borrow.returnDate)
      if (d === null) return ''
      if (d < 0) return 'student-overdue-row'
      if (d <= 3) return 'student-due-soon-row'
      return ''
    }

    const getDaysLeftClass = (borrow) => {
      const d = daysUntilReturn(borrow.returnDate)
      if (d === null) return 'student-days--unknown'
      if (d < 0) return 'student-days--overdue'
      if (d === 0) return 'student-days--today'
      if (d <= 3) return 'student-days--soon'
      return 'student-days--ok'
    }

    const getDaysLeftLabel = (borrow) => {
      const d = daysUntilReturn(borrow.returnDate)
      if (d === null) return '—'
      if (d < 0) return `OVERDUE (${Math.abs(d)}d)`
      if (d === 0) return 'Due today'
      return `${d}d left`
    }

    const getStageClass = (borrow) => {
      const s = normalizedStatus(borrow.status)
      if (s === 'pending') return 'student-stage--pending'
      if (s === 'pending check-out') return 'student-stage--checkout'
      if (s === 'approved') return 'student-stage--approved'
      if (s === 'rejected') return 'student-stage--rejected'
      return ''
    }

    const getStageName = (borrow) => {
      const s = normalizedStatus(borrow.status)
      if (s === 'pending') return 'Pending Approval'
      if (s === 'pending check-out') return 'Pending Check-Out'
      if (s === 'approved') return 'Approved'
      if (s === 'rejected') return 'Rejected'
      return borrow.status
    }

    // === Handlers ===
    const addLocation = (val) => {
      if (!locationOptions.value.includes(val)) locationOptions.value.splice(locationOptions.value.length - 1, 0, val)
    }

    const confirmInlineApprove = async () => {
      if (!inlineReturnDate.value) { alert('Please set a return date'); return }
      await runAction('Approving request...', async () => {
        const returnDatetime = inlineReturnDate.value + 'T17:00:00Z'
        try {
          const req = await borrowingService.approveRequest(inlineApproveId.value, returnDatetime)
          if (req) {
            req.notes = inlineRemark.value
            const item = await inventoryService.getItemById(req.itemID)
            if (item && inlineLocation.value) {
              await inventoryService.updateItem(item.id, { ...item, location: inlineLocation.value })
            }
          }
        } catch (e) { console.error('Failed to approve request:', e) }
        cancelInlineApprove()
        loadDashboardData()
      })
    }

    const cancelInlineApprove = () => {
      inlineApproveId.value = null
      inlineReturnDate.value = ''
      inlineRemark.value = ''
      inlineLocation.value = locationOptions.value[0]
    }

    const confirmInlineReject = async () => {
      if (!inlineRejectReason.value) { alert('Please provide a rejection reason'); return }
      await runAction('Rejecting request...', async () => {
        try { await borrowingService.rejectRequest(inlineRejectId.value, inlineRejectReason.value) }
        catch (e) { console.error('Failed to reject request:', e) }
        cancelInlineReject()
        loadDashboardData()
      })
    }

    const cancelInlineReject = () => {
      inlineRejectId.value = null
      inlineRejectReason.value = ''
    }

    const handleInlineCheckout = async (requestId) => {
      if (!confirm('Confirm item has been borrowed out?')) return
      await runAction('Processing checkout...', async () => {
        try { await borrowingService.checkoutRequest(requestId) }
        catch (e) { console.error('Failed to checkout request:', e) }
        loadDashboardData()
      })
    }

    const handleTeacherCheckout = async (requestId) => {
      if (!confirm('Confirm item has been borrowed out?')) return
      await runAction('Processing checkout...', async () => {
        try { await borrowingService.checkoutRequest(requestId) }
        catch (e) { console.error('Failed to checkout request:', e) }
        loadDashboardData()
      })
    }

    const resolveBulkViewTarget = () => {
      if (attentionActiveTab.value === 'returns') return 'lent-out-filter'
      if (attentionActiveTab.value === 'requests') return 'approve-requests'
      if (attentionActiveTab.value === 'inventory') return 'manage-items'

      const { requests, returns, inventory } = bulkSelectionSummary.value.byGroup
      if (requests >= returns && requests >= inventory) return 'approve-requests'
      if (returns >= inventory) return 'lent-out-filter'
      return 'manage-items'
    }

    const exportSelectedRows = (rows) => {
      if (!rows.length) return

      const headers = ['Type', 'Item', 'User', 'Status', 'Date', 'Priority']
      const encodeCsv = (value) => {
        const raw = String(value ?? '')
        if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
          return `"${raw.replace(/"/g, '""')}"`
        }
        return raw
      }

      const lines = rows.map(row => [
        row.type || row.typeShort || '',
        row.name || '',
        row.user || '',
        row.status || '',
        row.dateLabel || '',
        row.priority || ''
      ].map(encodeCsv).join(','))

      const csv = [headers.join(','), ...lines].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `needs-attention-selection-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
    }

    const runSafeBulkAction = (actionId, eligibleRows) => {
      if (actionId === 'view-selected') {
        emit('navigate', resolveBulkViewTarget())
        return
      }
      if (actionId === 'export-selected') {
        exportSelectedRows(eligibleRows)
      }
    }

    const setAttentionPageSize = (size) => {
      const parsed = Number(size)
      if (!attentionPageSizeOptions.includes(parsed)) return
      if (attentionPageSize.value === parsed) return
      attentionPageSize.value = parsed
    }

    const resetBulkActionInputs = () => {
      bulkApproveReturnDate.value = ''
      bulkApproveLocation.value = locationOptions.value[0]
      bulkApproveRemark.value = ''
      bulkRejectReason.value = ''
    }

    const runSequentialBulkProcessor = async (rows, processor) => {
      const successfulRows = []
      const failedRows = []

      for (const row of rows) {
        try {
          await processor(row)
          successfulRows.push(row)
        } catch (error) {
          failedRows.push({ row, error })
        }
      }

      return { successfulRows, failedRows }
    }

    const processBulkApprove = async (eligibleRows) => {
      const returnDatetime = `${bulkApproveReturnDate.value}T17:00:00Z`
      return runSequentialBulkProcessor(eligibleRows, async (row) => {
        const req = await borrowingService.approveRequest(row.id, returnDatetime, null, bulkApproveRemark.value || null)
        if (!req) throw new Error('Approval response missing request payload')
        const item = await inventoryService.getItemById(req.itemID)
        if (item && bulkApproveLocation.value) {
          await inventoryService.updateItem(item.id, { ...item, location: bulkApproveLocation.value })
        }
      })
    }

    const processBulkReject = async (eligibleRows) => {
      const reason = bulkRejectReason.value.trim()
      return runSequentialBulkProcessor(eligibleRows, async (row) => {
        await borrowingService.rejectRequest(row.id, reason)
      })
    }

    const processBulkCheckout = async (eligibleRows) => {
      return runSequentialBulkProcessor(eligibleRows, async (row) => {
        await borrowingService.checkoutRequest(row.id)
      })
    }

    const triggerBulkAction = (actionId, closeMenu) => {
      if (bulkActionSubmitting.value) return
      const action = bulkActionMap[actionId]
      const statsForAction = bulkActionStats.value[actionId]
      if (!action || !statsForAction) return

      if (action.kind === 'safe') {
        runSafeBulkAction(actionId, statsForAction.eligibleRows)
        closeMenu()
        return
      }

      if (statsForAction.eligibleCount === 0) return
      resetBulkActionInputs()
      bulkConfirmActionId.value = actionId
      closeMenu()
    }

    const cancelBulkAction = () => {
      if (bulkActionSubmitting.value) return
      bulkConfirmActionId.value = ''
      resetBulkActionInputs()
    }

    const confirmBulkAction = async () => {
      if (bulkActionSubmitting.value) return
      const action = bulkConfirmAction.value
      const statsForAction = bulkConfirmStats.value
      if (!action) {
        cancelBulkAction()
        return
      }

      if (bulkConfirmDisabled.value) return

      if (!action.implemented) {
        alert(
          `${action.label} is not connected yet.\n\n` +
          `Selected: ${bulkSelectionSummary.value.total}\n` +
          `Eligible: ${statsForAction.eligibleCount}\n` +
          `Skipped: ${statsForAction.ineligibleCount}`
        )
        cancelBulkAction()
        return
      }

      const failurePreview = (failedRows) => {
        if (!failedRows.length) return ''
        const preview = failedRows
          .slice(0, 3)
          .map(({ row, error }) => `${row.id}: ${error?.message || 'Request failed'}`)
          .join('\n')
        const more = failedRows.length > 3 ? `\n...and ${failedRows.length - 3} more` : ''
        return `\n\nFailures:\n${preview}${more}`
      }

      let result = { successfulRows: [], failedRows: [] }
      const selectedTotal = bulkSelectionSummary.value.total
      const eligibleCount = statsForAction.eligibleCount
      const skippedCount = statsForAction.ineligibleCount
      bulkActionSubmitting.value = true
      try {
        await runAction('Processing bulk action...', async () => {
          if (action.id === 'approve-selected') {
            result = await processBulkApprove(statsForAction.eligibleRows)
          } else if (action.id === 'reject-selected') {
            result = await processBulkReject(statsForAction.eligibleRows)
          } else if (action.id === 'mark-checkout-ready') {
            result = await processBulkCheckout(statsForAction.eligibleRows)
          } else {
            alert(`${action.label} is not connected yet.`)
            cancelBulkAction()
            return
          }
        })
      } finally {
        bulkActionSubmitting.value = false
      }

      result.successfulRows.forEach((row) => {
        selectedRows.delete(getAttentionRowKey(row))
      })

      if (result.successfulRows.length > 0) {
        await loadDashboardData()
      }

      alert(
        `${action.label} completed.\n\n` +
        `Selected: ${selectedTotal}\n` +
        `Eligible: ${eligibleCount}\n` +
        `Skipped: ${skippedCount}\n` +
        `Succeeded: ${result.successfulRows.length}\n` +
        `Failed: ${result.failedRows.length}` +
        failurePreview(result.failedRows)
      )

      bulkConfirmActionId.value = ''
      resetBulkActionInputs()
    }

    // Helpers
    const relativeTime = (dateStr) => {
      if (!dateStr) return ''
      const now = Date.now()
      const then = new Date(dateStr).getTime()
      const diffMs = now - then
      const mins = Math.floor(diffMs / 60000)
      if (mins < 1) return 'just now'
      if (mins < 60) return mins + 'm ago'
      const hrs = Math.floor(mins / 60)
      if (hrs < 24) return hrs + 'h ago'
      const days = Math.floor(hrs / 24)
      if (days < 7) return days + 'd ago'
      return formatDate(dateStr)
    }

    const getLogVariant = (action) => {
      if (!action) return 'default'
      const upper = action.toUpperCase()
      if (upper.includes('CREATE') || upper.includes('ADD') || upper.includes('APPROVE')) return 'success'
      if (upper.includes('DELETE') || upper.includes('REMOVE') || upper.includes('REJECT')) return 'destructive'
      if (upper.includes('UPDATE') || upper.includes('EDIT') || upper.includes('RETURN')) return 'info'
      if (upper.includes('CHECKOUT') || upper.includes('BORROW')) return 'accent'
      return 'default'
    }

    const getLogIcon = (action) => {
      if (!action) return Activity
      const upper = action.toUpperCase()
      if (upper.includes('CREATE') || upper.includes('ADD')) return Plus
      if (upper.includes('DELETE') || upper.includes('REMOVE')) return Trash2
      if (upper.includes('UPDATE') || upper.includes('EDIT')) return Edit
      if (upper.includes('APPROVE')) return ShieldCheck
      if (upper.includes('REJECT')) return AlertTriangle
      if (upper.includes('CHECKOUT') || upper.includes('BORROW')) return LogOut
      if (upper.includes('RETURN')) return RotateCcw
      return Activity
    }

    const formatAction = (action) => {
      if (!action) return '—'
      return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }

    // === Data Loading ===
    const loadStats = async () => {
      if (user.value?.role === 'user' && user.value?.subRole !== 'teacher') return

      const state = dashboardLoadState.stats
      const requestId = ++latestStatsRequestId
      state.isFetching = true
      state.error = null
      if (!state.isLoaded) state.isInitialLoading = true

      try {
        const statsData = await statsService.getStats()
        if (requestId !== latestStatsRequestId) return

        stats.value = {
          totalItems: statsData.totalItems ?? 0,
          availableItems: statsData.availableItems ?? 0,
          lentOutItems: statsData.lentOutItems ?? 0,
          missingItems: statsData.missingItems ?? 0,
          notAvailableItems: statsData.notAvailableItems ?? 0,
          transferredItems: statsData.transferredItems ?? 0,
          disposedItems: statsData.disposedItems ?? 0,
          pendingRequests: statsData.pendingRequests ?? 0,
          returnedRequests: statsData.returnedRequests ?? 0,
          approvedRequests: statsData.approvedRequests ?? 0,
          rejectedRequests: statsData.rejectedRequests ?? 0,
          warrantyExpiredItems: statsData.warrantyExpiredItems ?? 0,
          warrantyExpiringSoonItems: statsData.warrantyExpiringSoonItems ?? 0
        }

        state.isLoaded = true
      } catch (e) {
        if (requestId !== latestStatsRequestId) return
        console.error('Failed to load stats:', e)
        state.error = e?.message || 'Failed to load summary stats'
        if (!state.isLoaded) stats.value = createStatsSnapshot()
      } finally {
        if (requestId !== latestStatsRequestId) return
        state.isFetching = false
        state.isInitialLoading = false
      }
    }

    const loadRecentLogs = async () => {
      if (user.value?.role === 'user' && user.value?.subRole !== 'teacher') return

      const state = dashboardLoadState.logs
      const requestId = ++latestLogsRequestId
      state.isFetching = true
      state.error = null
      if (!state.isLoaded) state.isInitialLoading = true

      try {
        const { logs } = await auditService.getAllLogs({ pageSize: 20 })
        if (requestId !== latestLogsRequestId) return
        recentLogs.value = logs || []
        state.isLoaded = true
      } catch (e) {
        if (requestId !== latestLogsRequestId) return
        console.error('Failed to load logs:', e)
        state.error = e?.message || 'Failed to load activity logs'
        if (!state.isLoaded) recentLogs.value = []
      } finally {
        if (requestId !== latestLogsRequestId) return
        state.isFetching = false
        state.isInitialLoading = false
      }
    }

    const loadAttentionQueue = async () => {
      if (user.value?.role === 'user' && user.value?.subRole !== 'teacher') return

      const state = dashboardLoadState.queue
      const requestId = ++latestAttentionQueueRequestId
      const requestedPage = attentionPage.value
      const queueQuery = {
        tab: attentionActiveTab.value,
        page: requestedPage,
        pageSize: attentionPageSize.value,
        status: filterStatus.value,
        priority: filterPriority.value,
        sortBy: attentionSortBy.value,
        sortOrder: attentionSortOrder.value
      }
      const queryKey = JSON.stringify(queueQuery)
      const fetchMode = state.isLoaded ? (queryKey === lastQueueQueryKey ? 'background' : 'context') : 'initial'

      queueFetchMode.value = fetchMode
      state.isFetching = true
      state.error = null
      if (!state.isLoaded) state.isInitialLoading = true
      if (fetchMode !== 'background') {
        attentionRows.value = []
      }

      try {
        const queueData = await statsService.getDashboardQueue(queueQuery)

        if (requestId !== latestAttentionQueueRequestId) return

        attentionRows.value = queueData.items || []
        attentionTotal.value = queueData.total || 0
        attentionTotalPages.value = Math.max(1, queueData.totalPages || 1)
        attentionCounts.value = normalizeAttentionCounts(queueData.counts || {})
        state.isLoaded = true
        lastQueueQueryKey = queryKey

        const responsePage = Number(queueData.page) || requestedPage
        const correctedPage = Math.min(Math.max(requestedPage, 1), attentionTotalPages.value)
        if (responsePage !== attentionPage.value && responsePage === correctedPage) {
          skipNextAttentionPageWatch = true
          attentionPage.value = responsePage
        }
      } catch (e) {
        if (requestId !== latestAttentionQueueRequestId) return
        console.error('Failed to load dashboard queue:', e)
        state.error = e?.message || 'Failed to load queue data'
        if (fetchMode !== 'background') {
          attentionRows.value = []
          attentionTotal.value = 0
          attentionTotalPages.value = 1
          attentionCounts.value = createEmptyAttentionCounts()
        }
      } finally {
        if (requestId !== latestAttentionQueueRequestId) return
        state.isFetching = false
        state.isInitialLoading = false
      }
    }

    const loadDashboardData = async () => {
      const isOpsDashboardRole =
        user.value?.role === 'admin' ||
        user.value?.role === 'operator' ||
        (user.value?.role === 'user' && user.value?.subRole === 'teacher')

      if (isOpsDashboardRole) {
        await Promise.all([
          loadStats(),
          loadRecentLogs(),
          loadAttentionQueue()
        ])
      }

      try {
        const currentUser = authService.getCurrentUser()
        if (currentUser) {
          const userId = currentUser.userId || currentUser.id
          const userRequests = await borrowingService.getRequestsForUser(userId).then(r => r.requests || [])
          myBorrows.value = userRequests

          if (currentUser.subRole === 'teacher') {
            try {
              const { items: ownedItems } = await inventoryService.getItemsByOwner(userId)
              teacherOwnedItems.value = ownedItems
            } catch (te) { console.error('Failed to load teacher owned items:', te) }
            try {
              const tPending = await borrowingService.getTeacherPendingRequests().then(r => r.requests || [])
              teacherPendingRequests.value = tPending
              teacherPendingCount.value = tPending.length
            } catch (te) { console.error('Failed to load teacher pending:', te) }
            teacherCheckedOutCount.value = teacherOwnedItems.value.filter(i => i.status === 'In-use').length
          }
        }
      } catch (e) { console.error('Failed to load user borrows:', e) }
    }

    watch(
      [attentionActiveTab, filterPriority, filterStatus, attentionPageSize, attentionSortBy, attentionSortOrder],
      async () => {
        if (user.value?.role === 'user' && user.value?.subRole !== 'teacher') return
        cancelBulkAction()
        selectedRows.clear()
        if (attentionPage.value !== 1) {
          attentionPage.value = 1
          return
        }
        await loadAttentionQueue()
      }
    )

    watch(attentionPage, async () => {
      if (user.value?.role === 'user' && user.value?.subRole !== 'teacher') return
      if (skipNextAttentionPageWatch) {
        skipNextAttentionPageWatch = false
        return
      }
      cancelBulkAction()
      selectedRows.clear()
      await loadAttentionQueue()
    })

    onMounted(() => loadDashboardData())

    const overdueTooltipVisible = ref(false)
    const overdueTooltipStyle = ref({})
    const showOverdueTooltip = (e) => {
      const rect = e.currentTarget.getBoundingClientRect()
      overdueTooltipStyle.value = {
        top: rect.top + rect.height / 2 + 'px',
        left: rect.right + 8 + 'px',
        transform: 'translateY(-50%)',
      }
      overdueTooltipVisible.value = true
    }
    const hideOverdueTooltip = () => {
      overdueTooltipVisible.value = false
    }

    return {
      user, stats, recentLogs, filteredLogs, myBorrows,
      dashboardLoadState,
      isCardsInitialLoading, isStatsInitialLoading, isStatsBackgroundFetching,
      isQueueInitialLoading, isQueueFetching, showQueueSkeleton, isQueueBackgroundFetching,
      isLogsInitialLoading, isLogsBackgroundFetching,
      queueErrorMessage, logsErrorMessage,
      pendingRequestsCount, overdueCount, dueSoonCount, todayLabel,
      summaryText, dueTodayCount, pendingPureCount, pendingCheckoutCount,
      longWaitCount, notAvailableCount, transferredCount,
      warrantyAlertCount, readyForNewRequestCount,
      inventoryStatusBars, attentionRows, attentionTotal, attentionCounts,
      attentionActiveTab, attentionFilterTabs,
      attentionPage, attentionPageSize, attentionTotalPages,
      attentionPageSizeOptions, setAttentionPageSize,
      attentionVisiblePages, attentionPageStart, attentionPageEnd,
      attentionPageIndicator,
      attentionSkeletonRows, attentionVisibleColumnCount, attentionPaginationText,
      selectedRows, selectedAttentionRows, bulkSelectionSummary,
      visibleStateBulkActions, bulkConfirmAction, bulkConfirmStats,
      bulkConfirmDisabled, bulkActionSubmitting,
      isAllPageSelected, isSomePageSelected,
      toggleSelectAll, toggleRow,
      triggerBulkAction, confirmBulkAction, cancelBulkAction,
      filterPriority, filterStatus, hasActiveFilters,
      visibleColumns,
      inlineApproveId, inlineReturnDate, inlineRemark,
      inlineRejectId, inlineRejectReason,
      locationOptions, inlineLocation, addLocation,
      bulkApproveReturnDate, bulkApproveLocation, bulkApproveRemark,
      bulkRejectReason,
      confirmInlineApprove, cancelInlineApprove,
      confirmInlineReject, cancelInlineReject,
      handleInlineCheckout, handleTeacherCheckout,
      formatDate, waitingTime,
      relativeTime, getLogVariant, getLogIcon, formatAction,
      teacherOwnedItems, teacherPendingCount, teacherPendingRequests,
      teacherCheckedOutCount, teacherActiveTab, teacherAttentionTabs, teacherActiveTabEmpty,
      teacherPendingOnly, teacherPendingCheckoutOnly,
      teacherOwnedAvailableCount, teacherOwnedInUseItems,
      myActiveBorrows, myPendingBorrows, myOverdueBorrows, myRecentBorrows,
      studentActiveTab, borrowedPage, pendingPage, allPage,
      myCheckedOutBorrows, myPendingCheckoutBorrows, myPendingApprovalBorrows,
      myDueSoonBorrows, myDueTodayBorrowsList, myDue1to3d, myDue4to7d,
      myOverdueOver7d, myOverdue1to7d, myAllPendingRequests,
      sortedBorrowed, borrowedTotalPages, pendingTotalPages, allTotalPages,
      paginatedBorrowed, paginatedPending, paginatedAll,
      returnSchedule, studentNotifications, daysUntilReturn,
      getBorrowRowClass, getDaysLeftClass, getDaysLeftLabel,
      getStageClass, getStageName,
      scrollToStudentTab, studentMainCardRef,
      normalizedStatus,
      overdueTooltipVisible, overdueTooltipStyle, showOverdueTooltip, hideOverdueTooltip,
    }
  }
}
</script>

<style scoped src="./HomePage.scoped.css"></style>
<style>
.overdue-fixed-tooltip {
  position: fixed;
  padding: 0.375rem 0.625rem;
  background: var(--danger);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 6px;
  white-space: nowrap;
  z-index: 9999;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
}
</style>
