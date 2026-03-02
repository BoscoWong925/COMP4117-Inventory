<template>
  <div class="home-page">
    <!-- ==================== ADMIN / OPERATOR VIEW ==================== -->
    <template v-if="user?.role !== 'user'">
      <!-- Page heading -->
      <div class="hero-section animate-in">
        <h2 class="hero-title">Inventory dashboard</h2>
        <p class="hero-subtitle">{{ todayLabel }} &middot; {{ stats.totalItems }} items tracked</p>
      </div>

      <!-- Attention-needed cards -->
      <div class="attention-grid animate-in delay-1">
        <AlertCard
          :count="overdueItems.length"
          label="Overdue returns"
          severity="danger"
          @click="$emit('navigate', 'lent-out-filter')"
        />
        <AlertCard
          :count="dueSoonItems.length"
          label="Due within 7 days"
          severity="warning"
          @click="$emit('navigate', 'lent-out-filter')"
        />
        <AlertCard
          :count="stats.pendingRequests"
          label="Pending requests"
          severity="neutral"
          @click="$emit('navigate', 'approve-requests')"
        />
        <AlertCard
          :count="warrantyExpiredItems.length"
          label="Warranty expired"
          severity="danger"
          @click="$emit('navigate', 'manage-items')"
        />
        <AlertCard
          :count="warrantyExpiringSoonItems.length"
          label="Warranty expiring soon"
          sublabel="Within 30 days"
          severity="warning"
          @click="$emit('navigate', 'manage-items')"
        />
      </div>

      <!-- Summary counts -->
      <div class="summary-row animate-in delay-2">
        <button @click="$emit('navigate', 'manage-items')" class="summary-chip">
          <span class="summary-count">{{ stats.totalItems }}</span>
          <span class="summary-label">Total</span>
        </button>
        <button @click="$emit('navigate', 'search-available')" class="summary-chip">
          <span class="summary-count">{{ stats.availableItems }}</span>
          <span class="summary-label">Available</span>
        </button>
        <button @click="$emit('navigate', 'lent-out-filter')" class="summary-chip">
          <span class="summary-count">{{ stats.lentOutItems }}</span>
          <span class="summary-label">Checked out</span>
        </button>
      </div>

      <!-- Pending requests table (top 5) -->
      <div v-if="pendingRequests.length > 0" class="section-card animate-in delay-3">
        <div class="section-header">
          <h3 class="section-title">Pending requests</h3>
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
              </tr>
            </thead>
            <tbody>
              <tr v-for="req in pendingRequests.slice(0, 5)" :key="req.id">
                <td class="font-semibold">{{ req.itemName }}</td>
                <td>{{ req.borrowerID }}</td>
                <td>{{ waitingTime(req.requestDate) }}</td>
                <td class="text-ellip">{{ req.reason || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Overdue borrowers table (top 5) -->
      <div v-if="overdueItems.length > 0" class="section-card animate-in delay-3">
        <div class="section-header">
          <h3 class="section-title">Overdue returns</h3>
          <button @click="$emit('navigate', 'lent-out-filter')" class="section-link">View all →</button>
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

      <!-- Recent Activity (filtered) -->
      <div class="section-card animate-in delay-4">
        <div class="section-header">
          <h3 class="section-title">Recent activity</h3>
          <button @click="$emit('navigate', 'audit-log')" class="section-link">View all →</button>
        </div>
        <div v-if="filteredLogs.length === 0" class="empty-state">
          <p>No recent activity</p>
        </div>
        <div v-else class="activity-list">
          <div
            v-for="(log, i) in filteredLogs"
            :key="log.id || i"
            class="activity-item"
            @click="$emit('navigate', 'audit-log')"
          >
            <div class="activity-dot"></div>
            <div class="activity-content">
              <p class="activity-action">{{ log.action }}</p>
              <p class="activity-detail">{{ log.details }}</p>
            </div>
            <div class="activity-meta">
              <span class="activity-user">{{ log.userID }}</span>
              <span class="activity-time">{{ formatDateTime(log.timestamp) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== USER VIEW ==================== -->
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
import DashboardCalendar from '../components/DashboardCalendar.vue'
import AlertCard from '../components/AlertCard.vue'
import StatusBadge from '../components/StatusBadge.vue'

export default {
  components: { DashboardCalendar, AlertCard, StatusBadge },
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
      allItems.value.filter(i => isWarrantyExpired(i.warrantyEndDate))
    )
    const warrantyExpiringSoonItems = computed(() =>
      allItems.value.filter(i => isWarrantyExpiringSoon(i.warrantyEndDate, 30))
    )

    // Filter LOGIN actions from activity
    const filteredLogs = computed(() =>
      recentLogs.value.filter(log => {
        const action = (log.action || '').toUpperCase()
        return !action.includes('LOGIN') && !action.includes('LOGOUT')
      })
    )

    const loadDashboardData = async () => {
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

      try {
        const allLogs = await auditService.getAllLogs({ pageSize: 20 })
        recentLogs.value = allLogs
      } catch (e) {
        console.error('Failed to load logs:', e)
      }

      // Load items for warranty checks
      try {
        const items = await inventoryService.getAllItems({ pageSize: 5000 })
        allItems.value = items
      } catch (e) {
        console.error('Failed to load items:', e)
      }

      // Load approved requests for overdue/due-soon checks
      try {
        const approved = await borrowingService.getAllRequests({ status: 'Approved', pageSize: 5000 })
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

      // Load user borrows (for user role)
      try {
        const currentUser = authService.getCurrentUser()
        if (currentUser) {
          const userRequests = await borrowingService.getRequestsForUser(currentUser.id)
          myBorrows.value = userRequests
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
      formatDate,
      formatDateTime,
      getStatusColor,
      daysFromNow,
      waitingTime,
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

/* ===== Attention Grid ===== */
.attention-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

@media (min-width: 640px) {
  .attention-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
}

@media (min-width: 1024px) {
  .attention-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

/* ===== Summary Row ===== */
.summary-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 0.25rem;
}

.summary-chip {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 9999px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, transform 0.1s;
  -webkit-tap-highlight-color: transparent;
  flex-shrink: 0;
}

.summary-chip:active {
  transform: scale(0.96);
  background: var(--bg-tertiary);
}

.summary-count {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-primary);
}

.summary-label {
  font-size: 0.75rem;
  color: var(--text-muted);
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
}

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
</style>
