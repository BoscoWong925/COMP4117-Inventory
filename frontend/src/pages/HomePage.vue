<template>
  <div class="home-page">
    <!-- ==================== ADMIN / OPERATOR VIEW ==================== -->
    <template v-if="user?.role !== 'user'">
      <!-- Page heading -->
      <div class="hero-section animate-in">
        <div class="hero-row">
          <div>
            <h2 class="hero-title">Inventory dashboard</h2>
            <p class="hero-subtitle">{{ todayLabel }}</p>
          </div>
          <div class="items-tracked-box">
            <span class="items-tracked-count">{{ stats.totalItems }}</span>
            <span class="items-tracked-label">Items Tracked</span>
          </div>
        </div>
      </div>

      <!-- Tabbed attention section -->
      <div class="section-card animate-in delay-1">
        <!-- Tab bar -->
        <div class="tab-bar">
          <button
            v-for="tab in attentionTabs"
            :key="tab.key"
            :class="['tab-btn', { active: activeTab === tab.key }]"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
            <span v-if="tab.count > 0" :class="['tab-badge', tab.severity]">{{ tab.count }}</span>
          </button>
        </div>

        <!-- Overdue returns table -->
        <div v-if="(activeTab === 'all' || activeTab === 'overdue') && overdueItems.length > 0" class="tab-section">
          <div class="section-header">
            <h3 class="section-title section-title-danger">Overdue returns</h3>
            <button @click="$emit('navigate', 'lent-out-filter', { filter: 'overdue' })" class="section-link">View all →</button>
          </div>
          <div class="table-responsive">
            <table class="table-striped">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Borrower</th>
                  <th>Due date</th>
                  <th>Overdue by</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in overdueItems.slice(0, 5)" :key="item.id" class="row-danger">
                  <td class="font-semibold">{{ item.itemName }}</td>
                  <td>{{ item.borrowerID }}</td>
                  <td>{{ formatDate(item.returnDate) }}</td>
                  <td class="text-danger-em">{{ daysFromNow(item.returnDate) }} days</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Due soon table -->
        <div v-if="(activeTab === 'all' || activeTab === 'overdue') && dueSoonItems.length > 0" class="tab-section">
          <div class="section-header">
            <h3 class="section-title section-title-warning">Due within 7 days</h3>
            <button @click="$emit('navigate', 'lent-out-filter', { filter: 'due-soon' })" class="section-link">View all →</button>
          </div>
          <div class="table-responsive">
            <table class="table-striped">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Borrower</th>
                  <th>Due date</th>
                  <th>Days left</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in dueSoonItems.slice(0, 5)" :key="item.id" class="row-warning">
                  <td class="font-semibold">{{ item.itemName }}</td>
                  <td>{{ item.borrowerID }}</td>
                  <td>{{ formatDate(item.returnDate) }}</td>
                  <td class="text-warning-em">{{ Math.abs(daysFromNow(item.returnDate)) }} days</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pending requests table -->
        <div v-if="(activeTab === 'all' || activeTab === 'pending') && pendingRequests.length > 0" class="tab-section">
          <div class="section-header">
            <h3 class="section-title section-title-accent">Pending requests</h3>
            <button @click="$emit('navigate', 'approve-requests')" class="section-link">View all →</button>
          </div>
          <div class="table-responsive">
            <table class="table-striped">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Borrower</th>
                  <th>Waiting</th>
                  <th>Reason</th>
                  <th v-if="pendingRequests.length <= 5" class="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="req in pendingRequests.slice(0, 5)" :key="req.id">
                  <td class="font-semibold">{{ req.itemName }}</td>
                  <td>{{ req.borrowerID }}
                    <span v-if="overdueBorrowerIDs.has(req.borrowerID)" class="inline-flex items-center ml-1" title="This borrower has overdue items">
                      <span class="inline-block w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                      <span class="text-xs text-red-500 font-semibold ml-1">This user have an overdue item</span>
                    </span>
                  </td>
                  <td>{{ waitingTime(req.requestDate) }}</td>
                  <td class="text-ellip">{{ req.reason || '—' }}</td>
                  <td v-if="pendingRequests.length <= 5" class="text-center whitespace-nowrap">
                    <button @click="inlineApproveId = req.id" class="inline-action-btn success">Approve</button>
                    <button @click="inlineRejectId = req.id" class="inline-action-btn danger">Reject</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Warranty expired table -->
        <div v-if="(activeTab === 'all' || activeTab === 'warranty') && warrantyExpiredItems.length > 0" class="tab-section">
          <div class="section-header">
            <h3 class="section-title section-title-danger">Warranty expired</h3>
            <button @click="$emit('navigate', 'manage-items', { filter: 'warranty-expired' })" class="section-link">View all →</button>
          </div>
          <div class="table-responsive">
            <table class="table-striped">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Supplier</th>
                  <th>Warranty end</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in warrantyExpiredItems.slice(0, 5)" :key="item.id" class="row-danger">
                  <td class="font-semibold">{{ item.itemName || item.name }}</td>
                  <td>{{ item.supplier || '—' }}</td>
                  <td class="text-danger-em">{{ formatDate(item.warrantyEnd) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Warranty expiring soon table -->
        <div v-if="(activeTab === 'all' || activeTab === 'warranty') && warrantyExpiringSoonItems.length > 0" class="tab-section">
          <div class="section-header">
            <h3 class="section-title section-title-warning"><svg class="section-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 1a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 1zM5.05 3.636a.75.75 0 011.06 0l1.061 1.06a.75.75 0 11-1.06 1.061L5.05 4.697a.75.75 0 010-1.06zm9.9 0a.75.75 0 010 1.06l-1.06 1.061a.75.75 0 01-1.061-1.06l1.06-1.061a.75.75 0 011.061 0zM10 7a3 3 0 100 6 3 3 0 000-6zm-6.25 3a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5H3a.75.75 0 01.75.75zm14.5 0a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5H17a.75.75 0 01.75.75zm-11.086 4.95a.75.75 0 010 1.06l-1.06 1.061a.75.75 0 01-1.061-1.06l1.06-1.061a.75.75 0 011.061 0zm7.672 0a.75.75 0 011.06 0l1.061 1.06a.75.75 0 11-1.06 1.061l-1.061-1.06a.75.75 0 010-1.061zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15z" clip-rule="evenodd"/></svg>Warranty expiring soon</h3>
            <button @click="$emit('navigate', 'manage-items', { filter: 'warranty-expiring-soon' })" class="section-link">View all →</button>
          </div>
          <div class="table-responsive">
            <table class="table-striped">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Supplier</th>
                  <th>Warranty end</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in warrantyExpiringSoonItems.slice(0, 5)" :key="item.id" class="row-warning">
                  <td class="font-semibold">{{ item.itemName || item.name }}</td>
                  <td>{{ item.supplier || '—' }}</td>
                  <td class="text-warning-em">{{ formatDate(item.warrantyEnd) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Empty state for active tab -->
        <div v-if="activeTabEmpty" class="empty-state">
          <p>No items need attention</p>
        </div>
      </div>

      <!-- Inline Approve Modal -->
      <div v-if="inlineApproveId" class="modal-overlay">
        <div class="modal-card max-w-md w-full">
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
            <button @click="confirmInlineApprove" class="btn btn-outline-success flex-1">Approve</button>
            <button @click="cancelInlineApprove" class="btn btn-outline-secondary flex-1">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Inline Reject Modal -->
      <div v-if="inlineRejectId" class="modal-overlay">
        <div class="modal-card max-w-md w-full">
          <h3 class="modal-title">Reject Request</h3>
          <div class="mb-4">
            <label class="modal-label">Reason</label>
            <textarea v-model="inlineRejectReason" class="form-input" rows="4" placeholder="Enter rejection reason..." />
          </div>
          <div class="flex gap-2">
            <button @click="confirmInlineReject" class="btn btn-outline-danger flex-1">Reject</button>
            <button @click="cancelInlineReject" class="btn btn-outline-secondary flex-1">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Calendar (collapsed by default) -->
      <div class="section-card animate-in delay-4">
        <button class="section-toggle" @click="showCalendar = !showCalendar">
          <h3 class="section-title">Return calendar</h3>
          <span class="toggle-arrow" :class="{ open: showCalendar }">▸</span>
        </button>
        <div v-if="showCalendar" style="margin-top: 0.75rem;">
          <DashboardCalendar />
        </div>
      </div>

      <!-- Recent Activity section removed -->
    </template>

    <!-- ==================== TEACHER VIEW ==================== -->
    <template v-else-if="user?.subRole === 'teacher'">
      <div class="hero-section animate-in">
        <h2 class="hero-title">Teacher dashboard</h2>
        <p class="hero-subtitle">{{ todayLabel }}</p>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions animate-in delay-1">
        <button @click="$emit('navigate', 'new-borrow-request')" class="quick-action-card action-blue">
          <span class="quick-action-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></span>
          <span class="quick-action-text">New borrow request</span>
        </button>
        <button @click="$emit('navigate', 'my-items')" class="quick-action-card action-purple">
          <span class="quick-action-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></span>
          <span class="quick-action-text">My items</span>
        </button>
        <button @click="$emit('navigate', 'teacher-requests')" class="quick-action-card action-orange">
          <span class="quick-action-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="m9 14 2 2 4-4"/></svg></span>
          <span class="quick-action-text">Pending requests</span>
          <span v-if="teacherPendingCount > 0" class="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-red-500 text-white">{{ teacherPendingCount }}</span>
        </button>
        <button @click="$emit('navigate', 'search-available')" class="quick-action-card action-green">
          <span class="quick-action-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
          <span class="quick-action-text">Search items</span>
        </button>
      </div>

      <!-- Owned Items Summary -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in delay-1 mb-4 px-4">
        <div class="theme-card p-4 text-center">
          <p class="text-2xl font-bold text-accent">{{ teacherOwnedItems.length }}</p>
          <p class="text-xs text-muted">Items Owned</p>
        </div>
        <div class="theme-card p-4 text-center">
          <p class="text-2xl font-bold" style="color:#22c55e">{{ teacherOwnedItems.filter(i => i.status === 'Available').length }}</p>
          <p class="text-xs text-muted">Available</p>
        </div>
        <div class="theme-card p-4 text-center">
          <p class="text-2xl font-bold" style="color:#f59e0b">{{ teacherOwnedItems.filter(i => i.status === 'In-use').length }}</p>
          <p class="text-xs text-muted">In Use</p>
        </div>
        <div class="theme-card p-4 text-center">
          <p class="text-2xl font-bold" style="color:#ef4444">{{ teacherPendingCount }}</p>
          <p class="text-xs text-muted">Pending Requests</p>
        </div>
      </div>

      <!-- My Borrow Records -->
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
        </div>
      </div>
    </template>

    <!-- ==================== STUDENT / USER VIEW ==================== -->
    <template v-else>
      <div class="hero-section animate-in">
        <h2 class="hero-title">My dashboard</h2>
        <p class="hero-subtitle">{{ todayLabel }}</p>
      </div>

      <!-- Quick Actions -->
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

      <!-- My Borrow Records -->
      <div class="section-card animate-in delay-2">
        <div class="section-header">
          <h3 class="section-title">My borrow records</h3>
          <button @click="$emit('navigate', 'my-borrowing-record')" class="section-link">View all →</button>
        </div>
        <div v-if="myBorrows.length === 0" class="empty-state">
          <p>No borrowing records yet</p>
        </div>
        <div v-else class="record-list">
          <div
            v-for="borrow in myBorrows.slice(0, 5)"
            :key="borrow.id"
            class="record-item"
          >
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
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '../hooks/useAuth'
import { inventoryService, borrowingService, auditService, authService, statsService } from '../utils/services'
import { formatDate, formatDateTime, getStatusColor, daysFromNow, waitingTime, isOverdue, isDueSoon, isWarrantyExpired, isWarrantyExpiringSoon } from '../utils/helpers'
import { locations as defaultLocations } from '../data/mockData'
import DashboardCalendar from '../components/DashboardCalendar.vue'
import AlertCard from '../components/AlertCard.vue'
import StatusBadge from '../components/StatusBadge.vue'
import DropdownWithOther from '../components/DropdownWithOther.vue'
import RemarkBox from '../components/RemarkBox.vue'

export default {
  components: { DashboardCalendar, AlertCard, StatusBadge, DropdownWithOther, RemarkBox },
  emits: ['navigate'],
  setup() {
    const { user } = useAuth()
    const stats = ref({
      totalItems: 0,
      availableItems: 0,
      lentOutItems: 0,
      pendingRequests: 0,
      returnedRequests: 0,
      approvedRequests: 0,
      rejectedRequests: 0
    })
    const recentLogs = ref([])
    const myBorrows = ref([])
    const allItems = ref([])
    const allApprovedRequests = ref([])
    const pendingRequests = ref([])
    const showCalendar = ref(false)
    const teacherOwnedItems = ref([])
    const teacherPendingCount = ref(0)

    // Tab & inline approve/reject state
    const activeTab = ref('all')
    const inlineApproveId = ref(null)
    const inlineReturnDate = ref('')
    const inlineRemark = ref('')
    const inlineRejectId = ref(null)
    const inlineRejectReason = ref('')
    const locationOptions = ref([...defaultLocations])
    const inlineLocation = ref(defaultLocations[0])

    const todayLabel = computed(() => {
      return new Date().toLocaleDateString('en-HK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    })

    // Attention-needed computed lists
    const overdueItems = computed(() =>
      allApprovedRequests.value.filter(r => isOverdue(r.returnDate))
    )
    const dueSoonItems = computed(() =>
      allApprovedRequests.value.filter(r => isDueSoon(r.returnDate, 7))
    )
    const warrantyExpiredItems = computed(() =>
      allItems.value.filter(i => isWarrantyExpired(i.warrantyEnd))
    )
    const warrantyExpiringSoonItems = computed(() =>
      allItems.value.filter(i => isWarrantyExpiringSoon(i.warrantyEnd, 30))
    )

    // Borrowers with overdue items (for red mark on pending requests)
    const overdueBorrowerIDs = computed(() => {
      const ids = new Set()
      allApprovedRequests.value.forEach(r => {
        if (isOverdue(r.returnDate) && r.borrowerID) {
          ids.add(r.borrowerID)
        }
      })
      return ids
    })

    // Tab definitions with counts
    const attentionTabs = computed(() => [
      { key: 'all', label: 'All', count: overdueItems.value.length + dueSoonItems.value.length + pendingRequests.value.length + warrantyExpiredItems.value.length + warrantyExpiringSoonItems.value.length, severity: 'neutral' },
      { key: 'overdue', label: 'Overdue / Due soon', count: overdueItems.value.length + dueSoonItems.value.length, severity: 'danger' },
      { key: 'pending', label: 'Pending', count: pendingRequests.value.length, severity: 'neutral' },
      { key: 'warranty', label: 'Warranty', count: warrantyExpiredItems.value.length + warrantyExpiringSoonItems.value.length, severity: 'warning' }
    ])

    const activeTabEmpty = computed(() => {
      if (activeTab.value === 'all') return overdueItems.value.length === 0 && dueSoonItems.value.length === 0 && pendingRequests.value.length === 0 && warrantyExpiredItems.value.length === 0 && warrantyExpiringSoonItems.value.length === 0
      if (activeTab.value === 'overdue') return overdueItems.value.length === 0 && dueSoonItems.value.length === 0
      if (activeTab.value === 'pending') return pendingRequests.value.length === 0
      if (activeTab.value === 'warranty') return warrantyExpiredItems.value.length === 0 && warrantyExpiringSoonItems.value.length === 0
      return true
    })

    // Inline approve/reject handlers
    const addLocation = (val) => {
      if (!locationOptions.value.includes(val)) {
        locationOptions.value.splice(locationOptions.value.length - 1, 0, val)
      }
    }

    const confirmInlineApprove = async () => {
      if (!inlineReturnDate.value) { alert('Please set a return date'); return }
      const returnDatetime = `${inlineReturnDate.value}T17:00:00Z`
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
      try {
        await borrowingService.rejectRequest(inlineRejectId.value, inlineRejectReason.value)
      } catch (e) { console.error('Failed to reject request:', e) }
      cancelInlineReject()
      loadDashboardData()
    }

    const cancelInlineReject = () => {
      inlineRejectId.value = null
      inlineRejectReason.value = ''
    }

    // Filter LOGIN actions from activity
    const filteredLogs = computed(() =>
      recentLogs.value.filter(log => {
        const action = (log.action || '').toUpperCase()
        return !action.includes('LOGIN') && !action.includes('LOGOUT')
      })
    )

    const loadDashboardData = async () => {
      if (user.value?.role !== 'user') {
        try {
          const statsData = await statsService.getStats()
          stats.value = {
            totalItems: statsData.totalItems || 0,
            availableItems: statsData.availableItems || 0,
            lentOutItems: statsData.lentOutItems || 0,
            pendingRequests: statsData.pendingRequests || 0,
            returnedRequests: statsData.returnedRequests || 0,
            approvedRequests: statsData.approvedRequests || 0,
            rejectedRequests: statsData.rejectedRequests || 0
          }
        } catch (e) {
          console.error('Failed to load stats:', e)
        }
      }

      // Admin/operator only data
      if (user.value?.role !== 'user') {
        try {
          const { logs } = await auditService.getAllLogs({ pageSize: 20 })
          recentLogs.value = logs
        } catch (e) {
          console.error('Failed to load logs:', e)
        }

        // Load items for warranty checks
        try {
          const { items } = await inventoryService.getAllItems({ pageSize: 5000 })
          allItems.value = items
        } catch (e) {
          console.error('Failed to load items:', e)
        }

        // Load approved requests for overdue/due-soon checks
        try {
          const { requests: approved } = await borrowingService.getAllRequests({ status: 'Approved', pageSize: 5000 })
          allApprovedRequests.value = approved
        } catch (e) {
          console.error('Failed to load approved requests:', e)
        }

        // Load pending requests for the table
        try {
          const pending = await borrowingService.getPendingRequests()
          pendingRequests.value = pending
        } catch (e) {
          console.error('Failed to load pending requests:', e)
        }
      }

      // Load user borrows (for user role)
      try {
        const currentUser = authService.getCurrentUser()
        if (currentUser) {
          const userRequests = await borrowingService.getRequestsForUser(currentUser.id)
          myBorrows.value = userRequests

          // Load teacher-specific data
          if (currentUser.subRole === 'teacher') {
            try {
              const { items: ownedItems } = await inventoryService.getItemsByOwner(currentUser.userId || currentUser.id)
              teacherOwnedItems.value = ownedItems
            } catch (te) {
              console.error('Failed to load teacher owned items:', te)
            }
            try {
              const tPending = await borrowingService.getTeacherPendingRequests()
              teacherPendingCount.value = tPending.length
            } catch (te) {
              console.error('Failed to load teacher pending:', te)
            }
          }
        }
      } catch (e) {
        console.error('Failed to load user borrows:', e)
      }
    }

    onMounted(() => {
      loadDashboardData()
    })

    return {
      user,
      stats,
      recentLogs,
      filteredLogs,
      myBorrows,
      allItems,
      pendingRequests,
      overdueItems,
      dueSoonItems,
      warrantyExpiredItems,
      warrantyExpiringSoonItems,
      showCalendar,
      todayLabel,
      // Tabs
      activeTab,
      attentionTabs,
      activeTabEmpty,
      // Inline approve/reject
      inlineApproveId,
      inlineReturnDate,
      inlineRemark,
      inlineRejectId,
      inlineRejectReason,
      locationOptions,
      inlineLocation,
      addLocation,
      confirmInlineApprove,
      cancelInlineApprove,
      confirmInlineReject,
      cancelInlineReject,
      formatDate,
      formatDateTime,
      getStatusColor,
      daysFromNow,
      waitingTime,
      overdueBorrowerIDs,
      teacherOwnedItems,
      teacherPendingCount,
    }
  }
}
</script>

<style scoped>
/* ===== Page ===== */
.home-page {
  padding: 1.25rem 1rem 2rem;
  max-width: 64rem;
  margin: 0 auto;
}

@media (min-width: 640px) {
  .home-page { padding: 2rem 1.5rem; }
}

/* ===== Hero ===== */
.hero-section {
  margin-bottom: 1.5rem;
}

.hero-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  line-height: 1.2;
}

@media (min-width: 640px) {
  .hero-title { font-size: 2rem; }
}

.hero-subtitle {
  color: var(--text-muted);
  font-size: 0.9375rem;
  margin-top: 0.25rem;
}

/* ===== Tab Bar ===== */
.tab-bar {
  display: flex;
  gap: 0.25rem;
  border-bottom: 1px solid var(--border-color);
  margin: -1.25rem -1.25rem 1rem;
  padding: 0 1.25rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.tab-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.75rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-muted);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--text-primary);
  border-bottom-color: var(--accent);
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.375rem;
  font-size: 0.6875rem;
  font-weight: 700;
  border-radius: 9999px;
  line-height: 1;
}

.tab-badge.danger {
  background: rgba(239, 68, 68, 0.12);
  color: var(--danger);
}
.tab-badge.warning {
  background: rgba(245, 158, 11, 0.12);
  color: var(--warning);
}
.tab-badge.neutral {
  background: rgba(6, 153, 255, 0.1);
  color: var(--accent);
}

.tab-section {
  margin-bottom: 1.25rem;
}
.tab-section:last-of-type {
  margin-bottom: 0;
}

/* ===== Inline action buttons ===== */
.inline-action-btn {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 0.375rem;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  cursor: pointer;
  margin-left: 0.25rem;
  transition: background 0.15s, border-color 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.inline-action-btn:active { transform: scale(0.96); }
.inline-action-btn.success { color: #16a34a; border-color: #16a34a; }
.inline-action-btn.success:hover { background: rgba(22, 163, 74, 0.08); }
.inline-action-btn.danger { color: var(--danger); border-color: var(--danger); }
.inline-action-btn.danger:hover { background: rgba(239, 68, 68, 0.08); }

.text-warning-em {
  color: var(--warning);
  font-weight: 600;
}
.row-warning td {
  background: rgba(245, 158, 11, 0.04);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 50;
}

.whitespace-nowrap {
  white-space: nowrap;
}

/* ===== Section Card ===== */
.section-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1.0625rem;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
}

.section-title-danger {
  color: var(--danger);
}
.section-title-danger .section-icon { color: var(--danger); }

.section-title-warning {
  color: var(--warning);
}
.section-title-warning .section-icon { color: var(--warning); }

.section-title-accent {
  color: var(--accent);
}
.section-title-accent .section-icon { color: var(--accent); }

.section-link {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--accent);
  background: none;
  border: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

/* ===== Section Toggle (calendar) ===== */
.section-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.toggle-arrow {
  font-size: 1rem;
  color: var(--text-muted);
  transition: transform 0.2s;
}
.toggle-arrow.open {
  transform: rotate(90deg);
}

/* ===== Table helpers ===== */
.text-ellip {
  max-width: 12rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.text-danger-em {
  color: var(--danger);
  font-weight: 600;
}
.row-danger td {
  background: rgba(239, 68, 68, 0.04);
}

/* ===== Empty State ===== */
.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--text-muted);
  font-size: 0.875rem;
}

/* ===== Activity List ===== */
.activity-list {
  display: flex;
  flex-direction: column;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--accent);
  margin-top: 0.375rem;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-action {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.activity-detail {
  font-size: 0.8125rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.activity-user {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.activity-time {
  font-size: 0.6875rem;
  color: var(--text-muted);
  white-space: nowrap;
}

/* ===== Quick Actions (User) ===== */
.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.quick-action-card {
  position: relative;
  padding: 1.5rem 1rem;
  border-radius: 1.25rem;
  border: none;
  cursor: pointer;
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;
  -webkit-tap-highlight-color: transparent;
  overflow: hidden;
}

.quick-action-card:active {
  transform: scale(0.97);
}

.action-blue {
  background: rgba(6, 153, 255, 0.1);
  border: 1px solid rgba(6, 153, 255, 0.2);
}

.action-green {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.quick-action-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.5rem;
}

.quick-action-text {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-primary);
}

/* ===== Record List (User) ===== */
.record-list {
  display: flex;
  flex-direction: column;
}

.record-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
  gap: 0.75rem;
}

.record-item:last-child {
  border-bottom: none;
}

.record-main {
  min-width: 0;
  flex: 1;
}

.record-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.record-id {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.record-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.record-date {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.125rem;
}

.record-more {
  text-align: center;
  font-size: 0.8125rem;
  color: var(--text-muted);
  padding-top: 0.75rem;
}

/* ===== Animations ===== */
.animate-in {
  animation: fadeInUp 0.4s ease-out both;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.delay-1 { animation-delay: 0.06s; }
.delay-2 { animation-delay: 0.12s; }
.delay-3 { animation-delay: 0.18s; }
.delay-4 { animation-delay: 0.24s; }

/* ===== Hero Row with Items Tracked Box ===== */
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
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: 1.125rem 2rem;
  min-width: 140px;
  box-shadow: 0 2px 8px var(--shadow-color);
  backdrop-filter: blur(8px);
  transition: background 0.25s, color 0.25s, border-color 0.25s, box-shadow 0.25s;
}

.items-tracked-count {
  font-size: 2.25rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: var(--accent);
}

.items-tracked-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-top: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
</style>
