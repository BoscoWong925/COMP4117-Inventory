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
            <span class="ops-card-value">{{ pendingRequestsCount }}</span>
          </div>
          <p class="ops-card-label">Requests Waiting</p>
          <div class="ops-card-metrics">
            <span>New <strong>{{ pendingPureCount }}</strong></span>
            <span>Ready for pickup <strong>{{ pendingCheckoutCount }}</strong></span>
            <span v-if="longWaitCount > 0" class="metric-danger">Waiting &gt;3d <strong>{{ longWaitCount }}</strong></span>
          </div>
        </Card>

        <!-- Returns Follow-up -->
        <Card class="ops-summary-card" @click="$emit('navigate', 'lent-out-filter')">
          <div class="ops-card-header">
            <div class="ops-card-icon ops-card-icon--danger">
              <RotateCcw :size="18" />
            </div>
            <span class="ops-card-value">{{ overdueItems.length + dueSoonItems.length }}</span>
          </div>
          <p class="ops-card-label">Returns Follow-up</p>
          <div class="ops-card-metrics">
            <span class="metric-danger">Overdue <strong>{{ overdueItems.length }}</strong></span>
            <span>Due today <strong>{{ dueTodayCount }}</strong></span>
            <span>Due within 7d <strong>{{ dueSoonItems.length }}</strong></span>
          </div>
        </Card>

        <!-- Inventory Availability -->
        <Card class="ops-summary-card" @click="$emit('navigate', 'manage-items')">
          <div class="ops-card-header">
            <div class="ops-card-icon ops-card-icon--success">
              <Package :size="18" />
            </div>
            <span class="ops-card-value">{{ availabilityRate }}%</span>
          </div>
          <p class="ops-card-label">Availability Rate</p>
          <div class="ops-card-metrics">
            <span>Available <strong>{{ stats.availableItems }}</strong></span>
            <span>In-use <strong>{{ stats.lentOutItems }}</strong></span>
            <span>Other <strong>{{ notAvailableCount }}</strong></span>
          </div>
        </Card>

        <!-- Missing Items -->
        <Card class="ops-summary-card" @click="$emit('navigate', 'manage-items', { filter: 'missing' })">
          <div class="ops-card-header">
            <div class="ops-card-icon" :class="stats.missingItems > 0 ? 'ops-card-icon--danger' : 'ops-card-icon--muted'">
              <AlertTriangle :size="18" />
            </div>
            <span class="ops-card-value">{{ stats.missingItems }}</span>
          </div>
          <p class="ops-card-label">Missing Items</p>
          <div class="ops-card-metrics">
            <span>Disposed <strong>{{ stats.disposedItems }}</strong></span>
            <span>Transferred <strong>{{ transferredCount }}</strong></span>
            <span v-if="warrantyAlertCount > 0">Warranty alerts <strong>{{ warrantyAlertCount }}</strong></span>
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
                  <Badge v-if="attentionItems.length > 0" variant="accent" class="ml-2">{{ attentionItems.length }}</Badge>
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
                  <span v-if="tab.count > 0" class="ops-tab-count">{{ tab.count }}</span>
                </button>
              </div>
            </div>

            <!-- Table toolbar: bulk actions + filter + columns -->
            <div class="ops-toolbar">
              <div class="ops-toolbar-left">
                <!-- Bulk actions (visible when rows selected) -->
                <template v-if="selectedRows.size > 0">
                  <span class="bulk-count">{{ selectedRows.size }} selected</span>
                  <DropdownMenu align="start">
                    <template #trigger>
                      <button class="toolbar-btn">
                        <Zap :size="12" /> Actions <ChevronDown :size="10" />
                      </button>
                    </template>
                    <template #default="{ close }">
                      <DropdownMenuItem label>Bulk Actions</DropdownMenuItem>
                      <!-- Universal -->
                      <DropdownMenuItem @click="close()">
                        <Eye :size="12" /> View Selected
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="close()">
                        <Download :size="12" /> Export Selected
                      </DropdownMenuItem>
                      <!-- Returns-specific -->
                      <template v-if="attentionActiveTab === 'returns' || attentionActiveTab === 'all'">
                        <DropdownMenuItem separator />
                        <DropdownMenuItem @click="close()">
                          <Bell :size="12" /> Send Reminder
                        </DropdownMenuItem>
                        <DropdownMenuItem @click="close()">
                          <CheckCircle2 :size="12" /> Mark Reviewed
                        </DropdownMenuItem>
                      </template>
                      <!-- Requests-specific -->
                      <template v-if="attentionActiveTab === 'requests' || attentionActiveTab === 'all'">
                        <DropdownMenuItem separator />
                        <DropdownMenuItem @click="bulkApproveSelected(); close()">
                          <CheckCircle2 :size="12" /> Approve Selected
                        </DropdownMenuItem>
                        <DropdownMenuItem destructive @click="bulkRejectSelected(); close()">
                          <XCircle :size="12" /> Reject Selected
                        </DropdownMenuItem>
                        <DropdownMenuItem @click="close()">
                          <Package :size="12" /> Mark Checkout-Ready
                        </DropdownMenuItem>
                      </template>
                      <!-- Inventory-specific -->
                      <template v-if="attentionActiveTab === 'inventory' || attentionActiveTab === 'all'">
                        <DropdownMenuItem separator />
                        <DropdownMenuItem @click="close()">
                          <Ban :size="12" /> Mark Unavailable
                        </DropdownMenuItem>
                        <DropdownMenuItem @click="close()">
                          <ArrowUpDown :size="12" /> Transfer Selected
                        </DropdownMenuItem>
                      </template>
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

            <div v-if="finalFilteredItems.length > 0">
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
                    <tr
                      v-for="row in paginatedAttentionItems"
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
                              <DropdownMenuItem @click="close()">
                                <CheckCircle2 :size="12" /> Mark Reviewed
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
                  </tbody>
                </table>
              </div>

              <!-- Pagination -->
              <div class="ops-pagination">
                <span class="ops-pagination-info">
                  {{ (attentionPage - 1) * attentionPageSize + 1 }}–{{ Math.min(attentionPage * attentionPageSize, finalFilteredItems.length) }}
                  of {{ finalFilteredItems.length }}
                </span>
                <div class="ops-pagination-btns">
                  <button :disabled="attentionPage <= 1" @click="attentionPage--" class="ops-page-btn">‹</button>
                  <button
                    v-for="p in attentionVisiblePages" :key="p"
                    :class="['ops-page-btn', { active: p === attentionPage }]"
                    @click="attentionPage = p"
                  >{{ p }}</button>
                  <button :disabled="attentionPage >= attentionTotalPages" @click="attentionPage++" class="ops-page-btn">›</button>
                </div>
                <button class="ops-view-full" @click="$emit('navigate', attentionActiveTab === 'requests' ? 'approve-requests' : 'lent-out-filter')">
                  View full queue →
                </button>
              </div>
            </div>

            <div v-else class="empty-state">
              <CheckCircle2 :size="24" class="empty-icon" />
              <p>All clear — nothing needs attention</p>
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
              <span class="ops-inv-total">{{ stats.totalItems }} items</span>
            </div>
            <div class="ops-inv-rate">
              <span class="ops-inv-rate-val">{{ availabilityRate }}%</span>
              <span class="ops-inv-rate-label">Available</span>
            </div>
            <div class="status-bars">
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
            </h3>
            <div class="activity-list">
              <div v-for="log in filteredLogs.slice(0, 5)" :key="log._id || log.id" class="activity-item">
                <div class="activity-icon-wrap" :class="'activity-icon--' + getLogVariant(log.action)">
                  <component :is="getLogIcon(log.action)" :size="12" />
                </div>
                <div class="activity-detail">
                  <span class="activity-entity">{{ formatAction(log.action) }} — {{ log.entityName || log.entityId || '—' }}</span>
                  <span class="activity-meta">{{ log.userName || log.userId || '' }} · {{ relativeTime(log.createdAt || log.timestamp) }}</span>
                </div>
              </div>
              <div v-if="filteredLogs.length === 0" class="empty-state-sm">No recent activity</div>
              <button v-else class="activity-view-all" @click="$emit('navigate', 'audit-log')">View all activity →</button>
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
import { formatDate, formatDateTime, getStatusColor, daysFromNow, waitingTime, isOverdue, isDueSoon, isWarrantyExpired, isWarrantyExpiringSoon } from '../utils/helpers'
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
  setup() {
    const { user } = useAuth()

    // === Core data refs ===
    const stats = ref({
      totalItems: 0, availableItems: 0, lentOutItems: 0,
      missingItems: 0, disposedItems: 0, pendingRequests: 0,
      returnedRequests: 0, approvedRequests: 0, rejectedRequests: 0
    })
    const recentLogs = ref([])
    const myBorrows = ref([])
    const allItems = ref([])
    const allApprovedRequests = ref([])
    const pendingRequests = ref([])
    const pendingRequestsCount = ref(0)

    // Teacher data
    const teacherOwnedItems = ref([])
    const teacherPendingCount = ref(0)
    const teacherPendingRequests = ref([])
    const teacherCheckedOutCount = ref(0)
    const teacherAvailableForBorrow = ref(0)
    const teacherActiveTab = ref('all')

    // Attention tab, pagination & selection state
    const attentionActiveTab = ref('all')
    const attentionPage = ref(1)
    const attentionPageSize = 10
    const selectedRows = reactive(new Set())

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

    // Reset page when tab or filters change
    watch([attentionActiveTab, filterPriority, filterStatus], () => {
      attentionPage.value = 1
      selectedRows.clear()
    })

    // === Computed ===
    const todayLabel = computed(() => {
      return new Date().toLocaleDateString('en-HK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    })

    const hasActiveFilters = computed(() => filterPriority.value !== '' || filterStatus.value !== '')

    // Attention lists
    const overdueItems = computed(() => allApprovedRequests.value.filter(r => isOverdue(r.returnDate)))
    const dueSoonItems = computed(() => allApprovedRequests.value.filter(r => isDueSoon(r.returnDate, 7)))
    const dueTodayCount = computed(() => allApprovedRequests.value.filter(r => {
      const d = daysFromNow(r.returnDate)
      return d !== null && d === 0
    }).length)
    const warrantyExpiredItems = computed(() => allItems.value.filter(i => isWarrantyExpired(i.warrantyEnd)))
    const warrantyExpiringSoonItems = computed(() => allItems.value.filter(i => isWarrantyExpiringSoon(i.warrantyEnd, 30)))

    // Summary card metrics
    const pendingPureCount = computed(() => pendingRequests.value.filter(r => r.status === 'Pending').length)
    const pendingCheckoutCount = computed(() => pendingRequests.value.filter(r => r.status === 'Pending Check-Out').length)
    const longWaitCount = computed(() => pendingRequests.value.filter(r => daysFromNow(r.requestDate) > 3).length)
    const notAvailableCount = computed(() => allItems.value.filter(i => i.status === 'Not Available').length)
    const transferredCount = computed(() => allItems.value.filter(i => i.status === 'Transferred').length)
    const warrantyAlertCount = computed(() => warrantyExpiredItems.value.length + warrantyExpiringSoonItems.value.length)
    const availabilityRate = computed(() => {
      const total = stats.value.totalItems || 1
      return Math.round((stats.value.availableItems / total) * 100)
    })
    const summaryText = computed(() => {
      const total = stats.value.totalItems
      const actionParts = []
      if (pendingRequestsCount.value > 0) actionParts.push(pendingRequestsCount.value + ' to review')
      if (overdueItems.value.length > 0) actionParts.push(overdueItems.value.length + ' overdue')
      if (actionParts.length === 0) return total + ' items tracked — all clear'
      return total + ' items · ' + actionParts.join(', ')
    })

    // Borrowers with overdue items
    const overdueBorrowerIDs = computed(() => {
      const ids = new Set()
      allApprovedRequests.value.forEach(r => {
        if (isOverdue(r.returnDate) && r.borrowerID) ids.add(r.borrowerID)
      })
      return ids
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

    // === Tiered priority logic ===
    const getPriority = (type, dateVal) => {
      if (type === 'overdue') {
        const days = daysFromNow(dateVal) || 0
        if (days > 30) return { label: 'Critical', variant: 'urgent' }
        if (days > 7) return { label: 'High', variant: 'destructive' }
        return { label: 'Medium', variant: 'warning' }
      }
      if (type === 'due-soon') {
        const daysLeft = Math.abs(daysFromNow(dateVal) || 0)
        if (daysLeft <= 1) return { label: 'High', variant: 'destructive' }
        return { label: 'Low', variant: 'outline' }
      }
      if (type === 'request') {
        const waited = daysFromNow(dateVal) || 0
        if (waited > 7) return { label: 'High', variant: 'destructive' }
        if (waited > 3) return { label: 'Medium', variant: 'warning' }
        return { label: 'Low', variant: 'outline' }
      }
      if (type === 'missing') return { label: 'High', variant: 'destructive' }
      return { label: 'Low', variant: 'outline' }
    }

    // Unified attention items
    const attentionItems = computed(() => {
      const items = []

      overdueItems.value.forEach(r => {
        const p = getPriority('overdue', r.returnDate)
        items.push({
          type: 'Overdue Return', typeShort: 'Overdue',
          typeVariant: 'outline',
          name: r.itemName, user: r.borrowerName || r.borrowerID,
          hasOverdue: false,
          status: 'Overdue', statusVariant: 'destructive',
          date: r.returnDate, dateLabel: daysFromNow(r.returnDate) + 'd overdue',
          priority: p.label, priorityVariant: p.variant,
          id: r.id, actionType: 'view-lent',
          _sortOrder: p.label === 'Critical' ? 0 : p.label === 'High' ? 1 : p.label === 'Medium' ? 2 : 3
        })
      })

      dueSoonItems.value.forEach(r => {
        const p = getPriority('due-soon', r.returnDate)
        items.push({
          type: 'Due Soon', typeShort: 'Due Soon',
          typeVariant: 'outline',
          name: r.itemName, user: r.borrowerName || r.borrowerID,
          hasOverdue: false,
          status: 'Due Soon', statusVariant: 'warning',
          date: r.returnDate, dateLabel: Math.abs(daysFromNow(r.returnDate)) + 'd left',
          priority: p.label, priorityVariant: p.variant,
          id: r.id, actionType: 'view-lent',
          _sortOrder: p.label === 'Critical' ? 0 : p.label === 'High' ? 1 : p.label === 'Medium' ? 2 : 3
        })
      })

      pendingRequests.value.forEach(r => {
        const p = getPriority('request', r.requestDate)
        items.push({
          type: r.status === 'Pending' ? 'Pending Request' : 'Pending Checkout',
          typeShort: r.status === 'Pending' ? 'Request' : 'Checkout',
          typeVariant: 'outline',
          name: r.itemName, user: r.borrowerName || r.borrowerID,
          hasOverdue: overdueBorrowerIDs.value.has(r.borrowerID),
          status: r.status === 'Pending' ? 'Pending' : 'Checkout', statusVariant: r.status === 'Pending' ? 'warning' : 'info',
          date: r.requestDate, dateLabel: waitingTime(r.requestDate),
          priority: p.label, priorityVariant: p.variant,
          id: r.id, actionType: r.status === 'Pending' ? 'approve' : 'checkout',
          _sortOrder: p.label === 'Critical' ? 0 : p.label === 'High' ? 1 : p.label === 'Medium' ? 2 : 3
        })
      })

      allItems.value.filter(i => i.status === 'Missing').slice(0, 10).forEach(item => {
        const p = getPriority('missing')
        items.push({
          type: 'Missing Item', typeShort: 'Missing',
          typeVariant: 'outline',
          name: item.name || item.itemName, user: item.currentBorrowerName || '—',
          hasOverdue: false,
          status: 'Missing', statusVariant: 'destructive',
          date: null, dateLabel: '—',
          priority: p.label, priorityVariant: p.variant,
          id: item.id, actionType: 'view-item',
          _sortOrder: p.label === 'Critical' ? 0 : p.label === 'High' ? 1 : p.label === 'Medium' ? 2 : 3
        })
      })

      warrantyExpiredItems.value.slice(0, 5).forEach(item => {
        items.push({
          type: 'Warranty Expired', typeShort: 'Warranty',
          typeVariant: 'outline',
          name: item.name || item.itemName, user: item.supplier || '—',
          hasOverdue: false,
          status: 'Expired', statusVariant: 'outline',
          date: item.warrantyEnd, dateLabel: formatDate(item.warrantyEnd),
          priority: 'Low', priorityVariant: 'outline',
          id: item.id, actionType: 'view-item',
          _sortOrder: 3
        })
      })

      items.sort((a, b) => a._sortOrder - b._sortOrder)
      return items
    })

    // Attention filter tabs
    const attentionFilterTabs = computed(() => [
      { key: 'all', label: 'All', count: attentionItems.value.length },
      { key: 'returns', label: 'Returns', count: overdueItems.value.length + dueSoonItems.value.length },
      { key: 'requests', label: 'Requests', count: pendingRequests.value.length },
      { key: 'inventory', label: 'Inventory', count: allItems.value.filter(i => i.status === 'Missing').length + warrantyExpiredItems.value.length }
    ])

    const filteredAttentionItems = computed(() => {
      if (attentionActiveTab.value === 'all') return attentionItems.value
      if (attentionActiveTab.value === 'returns') return attentionItems.value.filter(i => i.type === 'Overdue Return' || i.type === 'Due Soon')
      if (attentionActiveTab.value === 'requests') return attentionItems.value.filter(i => i.type === 'Pending Request' || i.type === 'Pending Checkout')
      if (attentionActiveTab.value === 'inventory') return attentionItems.value.filter(i => i.type === 'Missing Item' || i.type === 'Warranty Expired')
      return attentionItems.value
    })

    // Apply toolbar filters on top of tab filter
    const finalFilteredItems = computed(() => {
      let items = filteredAttentionItems.value
      if (filterPriority.value) {
        items = items.filter(i => i.priority === filterPriority.value)
      }
      if (filterStatus.value) {
        items = items.filter(i => i.status === filterStatus.value)
      }
      return items
    })

    // Pagination — uses finalFilteredItems
    const attentionTotalPages = computed(() => Math.max(1, Math.ceil(finalFilteredItems.value.length / attentionPageSize)))
    const paginatedAttentionItems = computed(() => {
      const start = (attentionPage.value - 1) * attentionPageSize
      return finalFilteredItems.value.slice(start, start + attentionPageSize)
    })
    const attentionVisiblePages = computed(() => {
      const pages = []
      const total = attentionTotalPages.value
      let start = Math.max(1, attentionPage.value - 2)
      let end = Math.min(total, start + 4)
      start = Math.max(1, end - 4)
      for (let i = start; i <= end; i++) pages.push(i)
      return pages
    })

    // Selection
    const isAllPageSelected = computed(() => {
      if (paginatedAttentionItems.value.length === 0) return false
      return paginatedAttentionItems.value.every(r => selectedRows.has(r.type + '-' + r.id))
    })
    const isSomePageSelected = computed(() => {
      return paginatedAttentionItems.value.some(r => selectedRows.has(r.type + '-' + r.id))
    })
    const toggleSelectAll = () => {
      if (isAllPageSelected.value) {
        paginatedAttentionItems.value.forEach(r => selectedRows.delete(r.type + '-' + r.id))
      } else {
        paginatedAttentionItems.value.forEach(r => selectedRows.add(r.type + '-' + r.id))
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

    // Bulk actions
    const bulkApproveSelected = () => {
      alert('Bulk approve is not yet supported from dashboard. Please use the Review Requests page for batch operations.')
    }
    const bulkRejectSelected = () => {
      alert('Bulk reject is not yet supported from dashboard. Please use the Review Requests page for batch operations.')
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
    const loadDashboardData = async () => {
      if (user.value?.role !== 'user') {
        try {
          const statsData = await statsService.getStats()
          stats.value = {
            totalItems: statsData.totalItems || 0,
            availableItems: statsData.availableItems || 0,
            lentOutItems: statsData.lentOutItems || 0,
            missingItems: statsData.missingItems || 0,
            disposedItems: statsData.disposedItems || 0,
            pendingRequests: statsData.pendingRequests || 0,
            returnedRequests: statsData.returnedRequests || 0,
            approvedRequests: statsData.approvedRequests || 0,
            rejectedRequests: statsData.rejectedRequests || 0
          }
        } catch (e) { console.error('Failed to load stats:', e) }
      }

      if (user.value?.role !== 'user') {
        try {
          const { logs } = await auditService.getAllLogs({ pageSize: 20 })
          recentLogs.value = logs
        } catch (e) { console.error('Failed to load logs:', e) }

        try {
          const { items } = await inventoryService.getAllItems({ pageSize: 5000 })
          allItems.value = items
        } catch (e) { console.error('Failed to load items:', e) }

        try {
          const { requests: approved } = await borrowingService.getAllRequests({ status: 'Approved', pageSize: 5000 })
          allApprovedRequests.value = approved
        } catch (e) { console.error('Failed to load approved requests:', e) }

        try {
          const pending = await borrowingService.getPendingRequests().then(r => r.requests || [])
          pendingRequests.value = pending
        } catch (e) { console.error('Failed to load pending requests:', e) }

        try {
          const count = await borrowingService.getTopLevelPendingCount()
          pendingRequestsCount.value = count
        } catch (e) { console.error('Failed to load pending count:', e) }
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

    onMounted(() => loadDashboardData())

    return {
      user, stats, recentLogs, filteredLogs, myBorrows, allItems,
      pendingRequests, pendingRequestsCount, overdueItems, dueSoonItems,
      warrantyExpiredItems, warrantyExpiringSoonItems, todayLabel,
      summaryText, dueTodayCount, pendingPureCount, pendingCheckoutCount,
      longWaitCount, notAvailableCount, transferredCount,
      warrantyAlertCount, availabilityRate,
      inventoryStatusBars, attentionItems, filteredAttentionItems,
      finalFilteredItems, attentionActiveTab, attentionFilterTabs,
      attentionPage, attentionPageSize, attentionTotalPages,
      paginatedAttentionItems, attentionVisiblePages,
      selectedRows, isAllPageSelected, isSomePageSelected,
      toggleSelectAll, toggleRow,
      bulkApproveSelected, bulkRejectSelected,
      filterPriority, filterStatus, hasActiveFilters,
      visibleColumns,
      inlineApproveId, inlineReturnDate, inlineRemark,
      inlineRejectId, inlineRejectReason,
      locationOptions, inlineLocation, addLocation,
      confirmInlineApprove, cancelInlineApprove,
      confirmInlineReject, cancelInlineReject,
      handleInlineCheckout, handleTeacherCheckout,
      formatDate, formatDateTime, getStatusColor, daysFromNow, waitingTime,
      overdueBorrowerIDs, relativeTime, getLogVariant, getLogIcon, formatAction,
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
.bulk-count {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--accent);
  margin-right: 0.125rem;
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
.ops-pagination-info {
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
