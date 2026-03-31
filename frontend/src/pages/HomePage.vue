<template>
  <div class="home-page">
    <!-- ==================== ADMIN / OPERATOR VIEW ==================== -->
    <template v-if="user?.role !== 'user'">
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
          <p class="ops-card-label">Requests Waiting</p>
          <div v-if="!isCardsInitialLoading" class="ops-card-metrics">
            <span>New <strong>{{ pendingPureCount }}</strong></span>
            <span>Ready for pickup <strong>{{ pendingCheckoutCount }}</strong></span>
            <span v-if="longWaitCount > 0" class="metric-danger">Waiting &gt;3d <strong>{{ longWaitCount }}</strong></span>
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
          <p class="ops-card-label">Returns Follow-up</p>
          <div v-if="!isCardsInitialLoading" class="ops-card-metrics">
            <span class="metric-danger">Overdue <strong>{{ overdueCount }}</strong></span>
            <span>Due today <strong>{{ dueTodayCount }}</strong></span>
            <span>Due within 7d <strong>{{ dueSoonCount }}</strong></span>
          </div>
          <div v-else class="ops-card-metrics ops-card-metrics-skeleton">
            <span class="ops-skeleton-line ops-skeleton-line--metric"></span>
            <span class="ops-skeleton-line ops-skeleton-line--metric"></span>
            <span class="ops-skeleton-line ops-skeleton-line--metric"></span>
          </div>
        </Card>

        <!-- Inventory Availability -->
        <Card class="ops-summary-card" @click="$emit('navigate', 'manage-items')">
          <div class="ops-card-header">
            <div class="ops-card-icon ops-card-icon--success">
              <Package :size="18" />
            </div>
            <span v-if="!isCardsInitialLoading" class="ops-card-value">{{ availabilityRate }}%</span>
            <span v-else class="ops-skeleton-line ops-skeleton-line--value"></span>
          </div>
          <p class="ops-card-label">Availability Rate</p>
          <div v-if="!isCardsInitialLoading" class="ops-card-metrics">
            <span>Available <strong>{{ stats.availableItems ?? 0 }}</strong></span>
            <span>In-use <strong>{{ stats.lentOutItems ?? 0 }}</strong></span>
            <span>Other <strong>{{ notAvailableCount }}</strong></span>
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
          <p class="ops-card-label">Missing Items</p>
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
            </div>

            <!-- Table toolbar: bulk actions + filter + columns -->
            <div class="ops-toolbar">
              <div class="ops-toolbar-left">
                <!-- Bulk actions (visible when rows selected) -->
                <template v-if="selectedAttentionRows.length > 0">
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
                </template>
              </div>
              <div class="ops-toolbar-right">
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
                    <DropdownMenuItem checkable :checked="filterStatus === 'Overdue'" @click="filterStatus = 'Overdue'; close()">Overdue</DropdownMenuItem>
                    <DropdownMenuItem checkable :checked="filterStatus === 'Due Soon'" @click="filterStatus = 'Due Soon'; close()">Due Soon</DropdownMenuItem>
                    <DropdownMenuItem checkable :checked="filterStatus === 'Pending'" @click="filterStatus = 'Pending'; close()">Pending</DropdownMenuItem>
                    <DropdownMenuItem checkable :checked="filterStatus === 'Checkout'" @click="filterStatus = 'Checkout'; close()">Checkout</DropdownMenuItem>
                    <DropdownMenuItem checkable :checked="filterStatus === 'Missing'" @click="filterStatus = 'Missing'; close()">Missing</DropdownMenuItem>
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
                    <tr v-for="idx in attentionSkeletonRows" :key="'attn-skel-' + idx" class="ops-row-skeleton">
                      <td class="td-checkbox"><span class="ops-skeleton-box ops-skeleton-box--check"></span></td>
                      <td v-if="visibleColumns.item"><span class="ops-skeleton-line ops-skeleton-line--cell ops-skeleton-line--item"></span></td>
                      <td v-if="visibleColumns.type"><span class="ops-skeleton-line ops-skeleton-line--cell ops-skeleton-line--short"></span></td>
                      <td v-if="visibleColumns.user"><span class="ops-skeleton-line ops-skeleton-line--cell ops-skeleton-line--mid"></span></td>
                      <td v-if="visibleColumns.status"><span class="ops-skeleton-line ops-skeleton-line--cell ops-skeleton-line--short"></span></td>
                      <td v-if="visibleColumns.date"><span class="ops-skeleton-line ops-skeleton-line--cell ops-skeleton-line--short"></span></td>
                      <td v-if="visibleColumns.priority"><span class="ops-skeleton-line ops-skeleton-line--cell ops-skeleton-line--short"></span></td>
                      <td class="td-action"><span class="ops-skeleton-box ops-skeleton-box--icon"></span></td>
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
                        <span class="cell-item-name">{{ row.name }}</span>
                      </td>
                      <td v-if="visibleColumns.type">
                        <Badge variant="outline" class="cell-type-badge whitespace-nowrap">{{ row.typeShort }}</Badge>
                      </td>
                      <td v-if="visibleColumns.user" class="cell-ellip">
                        {{ row.user }}
                        <span v-if="row.hasOverdue" class="overdue-dot-wrap" title="This borrower has overdue items">
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
                              <DropdownMenuItem @click="inlineApproveId = row.id; close()">
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
                              <DropdownMenuItem @click="handleInlineCheckout(row.id); close()">
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

            <div v-if="isStatsInitialLoading" class="ops-inv-rate">
              <span class="ops-skeleton-line ops-skeleton-line--inv-rate"></span>
              <span class="ops-skeleton-line ops-skeleton-line--inv-rate-label"></span>
            </div>
            <div v-else-if="dashboardLoadState.stats.error && !dashboardLoadState.stats.isLoaded" class="ops-inv-rate">
              <span class="ops-inv-rate-val">—</span>
              <span class="ops-inv-rate-label">Unavailable</span>
            </div>
            <div v-else class="ops-inv-rate">
              <span class="ops-inv-rate-val">{{ availabilityRate }}%</span>
              <span class="ops-inv-rate-label">Available</span>
              <span v-if="isStatsBackgroundFetching" class="ops-fetching-chip">Updating...</span>
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
            <textarea v-model="inlineRejectReason" class="form-input" rows="4" placeholder="Enter rejection reason..." />
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
            <textarea v-model="bulkRejectReason" class="form-input" rows="4" placeholder="Enter rejection reason..." />
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
    <template v-else-if="user?.subRole === 'teacher'">
      <div class="hero-section animate-in">
        <div class="hero-row">
          <div>
            <h2 class="hero-title">Teacher dashboard</h2>
            <p class="hero-subtitle">{{ todayLabel }}</p>
          </div>
          <div class="items-tracked-box">
            <span class="items-tracked-count">{{ teacherOwnedItems.length }}</span>
            <span class="items-tracked-label">Items Owned</span>
          </div>
        </div>
      </div>

      <div class="stat-grid stat-grid-2 animate-in delay-1">
        <button class="stat-card" @click="$emit('navigate', 'my-items', { filter: 'available' })">
          <div class="stat-value" style="color: var(--success)">{{ teacherOwnedItems.filter(i => i.status === 'Available').length }}</div>
          <div class="stat-label">Available to Borrow</div>
        </button>
        <button class="stat-card" @click="$emit('navigate', 'my-items', { filter: 'in-use' })">
          <div class="stat-value" style="color: var(--warning)">{{ teacherCheckedOutCount }}</div>
          <div class="stat-label">Checked Out</div>
        </button>
      </div>

      <div class="section-card animate-in delay-2">
        <div class="tab-bar">
          <button
            v-for="tab in teacherAttentionTabs"
            :key="tab.key"
            :class="['tab-btn', { active: teacherActiveTab === tab.key }]"
            @click="teacherActiveTab = tab.key"
          >
            {{ tab.label }}
            <span v-if="tab.count > 0" :class="['tab-badge', tab.severity]">{{ tab.count }}</span>
          </button>
        </div>

        <div v-if="(teacherActiveTab === 'all' || teacherActiveTab === 'pending') && teacherPendingRequests.length > 0" class="tab-section">
          <div class="section-header">
            <h3 class="section-title section-title-accent">Pending requests</h3>
            <button @click="$emit('navigate', 'teacher-requests')" class="section-link">View all →</button>
          </div>
          <div class="table-responsive">
            <table class="table-striped">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Borrower</th>
                  <th>Status</th>
                  <th>Waiting</th>
                  <th>Reason</th>
                  <th class="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="req in teacherPendingRequests.slice(0, 5)" :key="req.id">
                  <td class="font-semibold">{{ req.itemName }}</td>
                  <td>{{ req.borrowerName || req.borrowerID }}</td>
                  <td>
                    <span v-if="req.status === 'Pending'" class="px-2 py-0.5 rounded text-xs font-medium badge-warning">Pending</span>
                    <span v-else class="px-2 py-0.5 rounded text-xs font-medium badge-info">Pending Check-Out</span>
                  </td>
                  <td>{{ waitingTime(req.requestDate) }}</td>
                  <td class="cell-ellip">{{ req.reason || '—' }}</td>
                  <td class="text-center whitespace-nowrap">
                    <template v-if="req.status === 'Pending Check-Out'">
                      <button @click="handleTeacherCheckout(req.id)" class="inline-action-btn primary">Borrowed Out</button>
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="(teacherActiveTab === 'all' || teacherActiveTab === 'checkout') && teacherOwnedItems.filter(i => i.status === 'In-use').length > 0" class="tab-section">
          <div class="section-header">
            <h3 class="section-title section-title-warning">Items currently checked out</h3>
            <button @click="$emit('navigate', 'teacher-checkout')" class="section-link">View all →</button>
          </div>
          <div class="table-responsive">
            <table class="table-striped">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Borrower</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in teacherOwnedItems.filter(i => i.status === 'In-use').slice(0, 5)" :key="item.id">
                  <td class="font-semibold">{{ item.name }}</td>
                  <td>{{ item.currentBorrowerName || item.currentBorrower || '—' }}</td>
                  <td><StatusBadge :status="item.status" type="item" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="teacherActiveTabEmpty" class="empty-state">
          <p>No items need attention</p>
        </div>
      </div>

      <div class="section-card animate-in delay-3">
        <div class="section-header">
          <h3 class="section-title">My borrow records</h3>
          <button @click="$emit('navigate', 'my-borrowing-record')" class="section-link">View all →</button>
        </div>
        <div v-if="myBorrows.length === 0" class="empty-state">
          <p>No borrowing records yet</p>
        </div>
        <div v-else class="record-list">
          <div v-for="borrow in myBorrows.slice(0, 5)" :key="borrow.id" class="record-item">
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
    </template>

    <!-- ==================== STUDENT / USER VIEW ==================== -->
    <template v-else>
      <div class="hero-section animate-in">
        <h2 class="hero-title">My dashboard</h2>
        <p class="hero-subtitle">{{ todayLabel }}</p>
      </div>

      <div class="quick-actions animate-in delay-1">
        <button @click="$emit('navigate', 'new-borrow-request')" class="quick-action-card action-blue">
          <span class="quick-action-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></span>
          <span class="quick-action-text">New borrow request</span>
        </button>
        <button @click="$emit('navigate', 'search-available')" class="quick-action-card action-green">
          <span class="quick-action-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
          <span class="quick-action-text">Search items</span>
        </button>
      </div>

      <div class="section-card animate-in delay-2">
        <div class="section-header">
          <h3 class="section-title">My borrow records</h3>
          <button @click="$emit('navigate', 'my-borrowing-record')" class="section-link">View all →</button>
        </div>
        <div v-if="myBorrows.length === 0" class="empty-state">
          <p>No borrowing records yet</p>
        </div>
        <div v-else class="record-list">
          <div v-for="borrow in myBorrows.slice(0, 5)" :key="borrow.id" class="record-item">
            <div class="record-main">
              <p class="record-name">{{ borrow.itemName }}</p>
              <p class="record-id">#{{ borrow.id }}</p>
            </div>
            <div class="record-right">
              <StatusBadge :status="borrow.status" type="request" />
              <span class="record-date">{{ formatDate(borrow.returnDate) || 'N/A' }}</span>
            </div>
          </div>
          <p v-if="myBorrows.length > 5" class="record-more">
            Showing 5 of {{ myBorrows.length }}
            <button @click="$emit('navigate', 'my-borrowing-record')" class="text-accent">→ View all</button>
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useAuth } from '../hooks/useAuth'
import { inventoryService, borrowingService, auditService, authService, statsService } from '../utils/services'
import { formatDate, waitingTime } from '../utils/helpers'
import {
  ClipboardList, ClipboardCheck, RotateCcw, Package, AlertTriangle,
  AlertCircle, CheckCircle2, BarChart3, Activity, Zap, Plus,
  ArrowUpDown, FileText, Edit, Trash2, ShieldCheck, LogOut,
  MoreVertical, Eye, Bell, XCircle, Ban, Filter, SlidersHorizontal,
  ChevronDown, Download
} from 'lucide-vue-next'
import StatusBadge from '../components/StatusBadge.vue'
import DropdownWithOther from '../components/DropdownWithOther.vue'
import RemarkBox from '../components/RemarkBox.vue'
import {
  UiCard as Card, UiBadge as Badge, UiButton as Button,
  UiCheckbox as Checkbox, UiDropdownMenu as DropdownMenu,
  UiDropdownMenuItem as DropdownMenuItem
} from '../components/ui'

export default {
  components: {
    StatusBadge, DropdownWithOther, RemarkBox,
    Card, Badge, Button, Checkbox, DropdownMenu, DropdownMenuItem,
    ClipboardList, ClipboardCheck, RotateCcw, Package, AlertTriangle,
    AlertCircle, CheckCircle2, BarChart3, Activity, Zap, Plus,
    ArrowUpDown, FileText, Edit, Trash2, ShieldCheck, LogOut,
    MoreVertical, Eye, Bell, XCircle, Ban, Filter, SlidersHorizontal,
    ChevronDown, Download
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
    const availabilityRate = computed(() => {
      if (!dashboardLoadState.stats.isLoaded) return null
      const total = Number(stats.value.totalItems) || 0
      if (total === 0) return 0
      return Math.round(((Number(stats.value.availableItems) || 0) / total) * 100)
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
      (row.actionType === 'approve' || row.rawStatus === 'Pending' || row.status === 'Pending')

    const isPendingCheckoutRow = (row) =>
      getAttentionRowGroup(row) === 'requests' &&
      (row.actionType === 'checkout' || row.rawStatus === 'Pending Check-Out' || row.status === 'Checkout')

    const isReturnFollowUpRow = (row) =>
      getAttentionRowGroup(row) === 'returns' &&
      (row.status === 'Overdue' || row.status === 'Due Soon')

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

    // === Handlers ===
    const addLocation = (val) => {
      if (!locationOptions.value.includes(val)) locationOptions.value.splice(locationOptions.value.length - 1, 0, val)
    }

    const confirmInlineApprove = async () => {
      if (!inlineReturnDate.value) { alert('Please set a return date'); return }
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
    }

    const cancelInlineApprove = () => {
      inlineApproveId.value = null
      inlineReturnDate.value = ''
      inlineRemark.value = ''
      inlineLocation.value = locationOptions.value[0]
    }

    const confirmInlineReject = async () => {
      if (!inlineRejectReason.value) { alert('Please provide a rejection reason'); return }
      try { await borrowingService.rejectRequest(inlineRejectId.value, inlineRejectReason.value) }
      catch (e) { console.error('Failed to reject request:', e) }
      cancelInlineReject()
      loadDashboardData()
    }

    const cancelInlineReject = () => {
      inlineRejectId.value = null
      inlineRejectReason.value = ''
    }

    const handleInlineCheckout = async (requestId) => {
      if (!confirm('Confirm item has been borrowed out?')) return
      try { await borrowingService.checkoutRequest(requestId) }
      catch (e) { console.error('Failed to checkout request:', e) }
      loadDashboardData()
    }

    const handleTeacherCheckout = async (requestId) => {
      if (!confirm('Confirm item has been borrowed out?')) return
      try { await borrowingService.checkoutRequest(requestId) }
      catch (e) { console.error('Failed to checkout request:', e) }
      loadDashboardData()
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
      if (user.value?.role === 'user') return

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
      if (user.value?.role === 'user') return

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
      if (user.value?.role === 'user') return

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
      if (user.value?.role !== 'user') {
        await Promise.all([
          loadStats(),
          loadRecentLogs(),
          loadAttentionQueue()
        ])
      }

      try {
        const currentUser = authService.getCurrentUser()
        if (currentUser) {
          const userRequests = await borrowingService.getRequestsForUser(currentUser.id).then(r => r.requests || [])
          myBorrows.value = userRequests

          if (currentUser.subRole === 'teacher') {
            try {
              const { items: ownedItems } = await inventoryService.getItemsByOwner(currentUser.userId || currentUser.id)
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
        if (user.value?.role === 'user') return
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
      if (user.value?.role === 'user') return
      if (skipNextAttentionPageWatch) {
        skipNextAttentionPageWatch = false
        return
      }
      cancelBulkAction()
      selectedRows.clear()
      await loadAttentionQueue()
    })

    onMounted(() => loadDashboardData())

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
      warrantyAlertCount, availabilityRate,
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
    }
  }
}
</script>

<style scoped>
/* ===== Page — wider layout for desktop ===== */
.home-page {
  padding: 1.5rem 1.25rem 2rem;
  max-width: 90rem;
  margin: 0 auto;
}
@media (min-width: 640px) { .home-page { padding: 2rem 1.25rem; } }
@media (min-width: 1280px) { .home-page { padding: 2rem 1.25rem; } }

/* ===== Header ===== */
.ops-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}
.ops-title {
  font-size: 1.375rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  line-height: 1.2;
}
@media (min-width: 640px) { .ops-title { font-size: 1.5rem; } }
.ops-subtitle {
  color: var(--muted-foreground);
  font-size: 0.8125rem;
  margin-top: 0.25rem;
}
.ops-header-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* ===== Summary Cards — responsive grid ===== */
.ops-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}
@media (min-width: 480px) { .ops-cards { grid-template-columns: 1fr 1fr; } }
@media (min-width: 768px) { .ops-cards { grid-template-columns: repeat(4, 1fr); } }

.ops-summary-card {
  padding: 1.125rem 1.25rem;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}
.ops-summary-card:hover {
  border-color: var(--accent);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-1px);
}
.ops-summary-card:active { transform: scale(0.98); }

.ops-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.375rem;
}
.ops-card-icon {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ops-card-icon--warning { background: var(--warning-light); color: var(--warning-dark); }
.ops-card-icon--danger { background: var(--danger-light); color: var(--danger); }
.ops-card-icon--success { background: var(--success-light); color: var(--success); }
.ops-card-icon--muted { background: var(--surface-100); color: var(--muted-foreground); }

.ops-card-value {
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}
.ops-card-label {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--muted-foreground);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.625rem;
}
.ops-card-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.875rem;
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  line-height: 1.6;
}
.ops-card-metrics strong {
  font-weight: 700;
  color: var(--text-secondary);
}
.metric-danger { color: var(--danger); }
.metric-danger strong { color: var(--danger); }

/* ===== Main Grid — wider on desktop ===== */
.ops-main {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}
@media (min-width: 1024px) {
  .ops-main { grid-template-columns: 1fr 340px; }
}
@media (min-width: 1280px) {
  .ops-main { grid-template-columns: 1fr 380px; }
}

/* ===== Attention Card ===== */
.ops-attention-card {
  padding: 0;
  overflow: hidden;
}
.ops-attention-header {
  padding: 1rem 1.25rem 0;
  margin-bottom: 0;
}
.ops-attention-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.ops-section-title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.375rem;
}
.ops-attention-tabs {
  display: flex;
  gap: 0.125rem;
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.ops-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted-foreground);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.12s, border-color 0.12s;
}
.ops-tab:hover { color: var(--text-secondary); }
.ops-tab.active { color: var(--text-primary); border-bottom-color: var(--accent); }
.ops-tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1rem;
  height: 1rem;
  padding: 0 0.25rem;
  font-size: 0.5625rem;
  font-weight: 700;
  border-radius: var(--radius-sm);
  background: var(--accent-surface);
  color: var(--accent);
}

/* ===== Toolbar ===== */
.ops-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1.25rem;
  border-bottom: 1px solid var(--border);
  gap: 0.5rem;
  flex-wrap: wrap;
  min-height: 2.25rem;
}
.ops-toolbar-left {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}
.ops-toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}
.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--muted-foreground);
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
  position: relative;
}
.toolbar-btn:hover { background: var(--surface-100); color: var(--text-secondary); }
.toolbar-btn--active { border-color: var(--accent); color: var(--accent); }
.toolbar-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 6px;
  height: 6px;
  background: var(--accent);
  border-radius: 50%;
}

/* Active filters */
.ops-active-filters {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 1.25rem;
  border-bottom: 1px solid var(--border);
}
.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  font-weight: 600;
  background: var(--accent-surface);
  color: var(--accent);
  border-radius: var(--radius-sm);
}
.filter-tag-x {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--accent);
  padding: 0;
  line-height: 1;
}
.filter-tag-x:hover { opacity: 0.7; }

/* ===== Bulk Actions ===== */
.bulk-summary {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}
.bulk-count {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--accent);
  margin-right: 0.125rem;
}
.bulk-meta {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--muted-foreground);
}
.bulk-meta-muted {
  color: var(--text-tertiary);
}
.bulk-clear {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--muted-foreground);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
}
.bulk-clear:hover { color: var(--text-secondary); }

/* ===== Ops Table ===== */
.ops-table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.ops-table {
  width: 100%;
  font-size: 0.8125rem;
  border-collapse: collapse;
}
.ops-table th {
  text-align: left;
  padding: 0.625rem 0.75rem;
  font-weight: 700;
  color: var(--muted-foreground);
  text-transform: uppercase;
  font-size: 0.625rem;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border);
  background: var(--surface-50);
  white-space: nowrap;
}
.ops-table td {
  padding: 0.625rem 0.75rem;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
.ops-table tbody tr { transition: background 0.1s; }
.ops-table tbody tr:hover td { background: var(--surface-50); }
.ops-table tbody tr.row-selected td { background: var(--accent-surface); }

/* Column widths */
.th-checkbox, .td-checkbox { width: 2.25rem; text-align: center; }
.th-action { width: 2.5rem; text-align: center; }
.td-action { text-align: center; }

/* Item cell */
.cell-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
}
.cell-item-name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.cell-type-badge {
  flex-shrink: 0;
  font-size: 0.5625rem !important;
  padding: 0.0625rem 0.3125rem !important;
  opacity: 0.7;
}
.cell-date {
  font-variant-numeric: tabular-nums;
  font-size: 0.75rem;
}

.overdue-dot-wrap {
  display: inline-flex;
  align-items: center;
  margin-left: 0.25rem;
}
.overdue-dot {
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  background: var(--danger);
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* Kebab action button */
.kebab-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: var(--radius-sm);
  border: none;
  background: none;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: all 0.12s;
}
.kebab-btn:hover { background: var(--surface-100); color: var(--text-primary); }

/* ===== Pagination ===== */
.ops-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 1.25rem;
  border-top: 1px solid var(--border);
  gap: 0.5rem;
  flex-wrap: wrap;
}
.ops-pagination-left,
.ops-pagination-right {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.ops-page-size-wrap {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.ops-page-size-label {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
}

.ops-page-size-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 3rem;
  height: 1.75rem;
  padding: 0 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.12s;
}

.ops-page-size-trigger:hover {
  background: var(--surface-100);
  color: var(--text-primary);
}

.ops-pagination-info {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}
.ops-pagination-page {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}
.ops-pagination-btns {
  display: flex;
  gap: 0.125rem;
}
.ops-page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.625rem;
  height: 1.625rem;
  padding: 0 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.12s;
}
.ops-page-btn:hover:not(:disabled) { background: var(--surface-100); }
.ops-page-btn.active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}
.ops-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.ops-view-full {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--accent);
  background: none;
  border: none;
  cursor: pointer;
}
.ops-view-full:hover { text-decoration: underline; }

/* ===== Sidebar ===== */
.ops-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Promoted Inventory Status card */
.ops-inv-status-card {
  padding: 1.25rem 1.5rem;
}
.ops-inv-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}
.ops-inv-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.375rem;
}
.ops-inv-total {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--muted-foreground);
}
.ops-inv-rate {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
}
.ops-inv-rate-val {
  font-size: 2rem;
  font-weight: 800;
  color: var(--success);
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.ops-inv-rate-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted-foreground);
}

/* Status bars */
.status-bars { display: flex; flex-direction: column; gap: 0.625rem; }
.status-bar-row {
  display: grid;
  grid-template-columns: 90px 1fr auto;
  align-items: center;
  gap: 0.625rem;
}
.status-bar-row--exception .status-bar-label { font-weight: 700; }
.status-bar-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: nowrap;
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-bar-track {
  height: 8px;
  background: var(--surface-100);
  border-radius: 4px;
  overflow: hidden;
}
.status-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
  min-width: 2px;
}
.status-bar-count {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-primary);
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.status-bar-pct {
  font-weight: 500;
  color: var(--muted-foreground);
  font-size: 0.6875rem;
}

/* Sidebar cards */
.ops-sidebar-card { padding: 1.125rem; }
.ops-sidebar-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Activity */
.activity-list { display: flex; flex-direction: column; gap: 0.75rem; }
.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}
.activity-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.625rem;
  height: 1.625rem;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}
.activity-icon--success { background: var(--success-light); color: var(--success); }
.activity-icon--destructive { background: var(--danger-light); color: var(--danger); }
.activity-icon--info { background: var(--info-light, var(--accent-surface)); color: var(--info, var(--accent)); }
.activity-icon--accent { background: var(--accent-surface); color: var(--accent); }
.activity-icon--default { background: var(--surface-100); color: var(--muted-foreground); }
.activity-detail {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.activity-entity {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.activity-meta {
  font-size: 0.625rem;
  color: var(--muted-foreground);
  margin-top: 0.0625rem;
}
.activity-view-all {
  display: block;
  width: 100%;
  text-align: center;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--accent);
  background: none;
  border: none;
  cursor: pointer;
  padding-top: 0.625rem;
  margin-top: 0.375rem;
  border-top: 1px solid var(--border);
}
.activity-view-all:hover { text-decoration: underline; }

/* Quick actions */
.ops-quick-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
.ops-quick-btn {
  justify-content: flex-start !important;
  font-size: 0.6875rem !important;
}

/* ===== Shared: Empty State ===== */
.empty-state {
  text-align: center;
  padding: 2.5rem 1rem;
  color: var(--muted-foreground);
  font-size: 0.8125rem;
}
.empty-state-sm {
  text-align: center;
  padding: 1rem 0.5rem;
  color: var(--muted-foreground);
  font-size: 0.75rem;
}
.empty-icon {
  color: var(--success);
  margin: 0 auto 0.5rem;
  display: block;
}

/* ===== Modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 50;
}
.modal-card {
  max-width: 28rem;
  width: 100%;
  padding: 1.5rem;
}
.modal-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 1rem;
}
.modal-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.375rem;
}
.bulk-confirm-stats {
  display: grid;
  gap: 0.25rem;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  margin-bottom: 0.875rem;
}
.bulk-confirm-note {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0 0 0.625rem;
}
.bulk-confirm-note--muted {
  color: var(--muted-foreground);
}
.bulk-confirm-note--warning {
  color: var(--warning-dark);
  font-weight: 600;
}

/* ===== Table helpers ===== */
.table-responsive { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.font-semibold { font-weight: 600; }
.text-center { text-align: center; }
.whitespace-nowrap { white-space: nowrap; }
.cell-ellip {
  max-width: 12rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ml-2 { margin-left: 0.5rem; }
.mb-4 { margin-bottom: 1rem; }
.flex { display: flex; }
.flex-1 { flex: 1; }
.gap-2 { gap: 0.5rem; }
.text-accent { color: var(--accent); }
/* ===== Teacher / Student shared styles ===== */
.hero-section { margin-bottom: 1.5rem; }
.hero-title {
  font-size: 1.375rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  line-height: 1.2;
}
@media (min-width: 640px) { .hero-title { font-size: 1.5rem; } }
.hero-subtitle {
  color: var(--muted-foreground);
  font-size: 0.8125rem;
  margin-top: 0.25rem;
}
.hero-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}
.items-tracked-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 0.875rem 1.5rem;
  min-width: 120px;
  box-shadow: var(--shadow-card);
}
.items-tracked-count {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.items-tracked-label {
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--muted-foreground);
  margin-top: 0.125rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* Stat grid */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.625rem;
  margin-bottom: 1.25rem;
}
.stat-grid-2 { grid-template-columns: repeat(2, 1fr); }
.stat-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 1rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.12s, box-shadow 0.12s, transform 0.12s;
}
.stat-card:hover {
  border-color: var(--accent);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-1px);
}
.stat-value {
  font-size: 1.625rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}
.stat-label {
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--muted-foreground);
  margin-top: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* Tab bar (teacher) */
.tab-bar {
  display: flex;
  gap: 0.125rem;
  border-bottom: 1px solid var(--border);
  margin: -1.25rem -1.25rem 1.25rem;
  padding: 0 1.25rem;
  overflow-x: auto;
}
.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--muted-foreground);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.12s, border-color 0.12s;
}
.tab-btn:hover { color: var(--text-secondary); }
.tab-btn.active { color: var(--text-primary); border-bottom-color: var(--accent); }
.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.125rem;
  height: 1.125rem;
  padding: 0 0.3125rem;
  font-size: 0.625rem;
  font-weight: 700;
  border-radius: var(--radius-sm);
}
.tab-badge.danger { background: var(--danger-light); color: var(--danger); }
.tab-badge.warning { background: var(--warning-light); color: var(--warning-dark); }
.tab-badge.neutral { background: var(--accent-surface); color: var(--accent); }

/* Section card / header / link */
.section-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-2xl);
  padding: 1.25rem;
  margin-bottom: 0.75rem;
  box-shadow: var(--shadow-card);
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.section-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.section-title-danger { color: var(--danger); }
.section-title-warning { color: var(--warning-dark); }
.section-title-accent { color: var(--accent); }
.section-link {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
  background: none;
  border: none;
  cursor: pointer;
  transition: opacity 0.12s;
}
.section-link:hover { opacity: 0.8; }
.tab-section { margin-bottom: 1.25rem; }
.tab-section:last-of-type { margin-bottom: 0; }

/* Table striped (teacher) */
.table-striped {
  width: 100%;
  font-size: 0.75rem;
  border-collapse: collapse;
}
.table-striped th {
  text-align: left;
  padding: 0.5rem 0.625rem;
  font-weight: 700;
  color: var(--muted-foreground);
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border);
}
.table-striped td {
  padding: 0.5rem 0.625rem;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
}

/* Quick actions (student) */
.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}
.quick-action-card {
  padding: 1.25rem 1rem;
  border-radius: var(--radius-xl);
  border: none;
  cursor: pointer;
  text-align: center;
  transition: transform 0.12s, box-shadow 0.12s;
  overflow: hidden;
}
.quick-action-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.action-blue { background: var(--accent-surface); border: 1px solid rgba(99, 102, 241, 0.15); }
.action-green { background: var(--success-light); border: 1px solid rgba(34, 197, 94, 0.15); }
.quick-action-icon { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
.quick-action-text { font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); }

/* Record list */
.record-list { display: flex; flex-direction: column; }
.record-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0;
  border-bottom: 1px solid var(--border);
  gap: 0.75rem;
}
.record-item:last-child { border-bottom: none; }
.record-main { min-width: 0; flex: 1; }
.record-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.record-id { font-size: 0.6875rem; color: var(--muted-foreground); }
.record-right { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
.record-date { font-size: 0.6875rem; color: var(--muted-foreground); margin-top: 0.125rem; }
.record-more { text-align: center; font-size: 0.8125rem; color: var(--muted-foreground); padding-top: 0.75rem; }
</style>
