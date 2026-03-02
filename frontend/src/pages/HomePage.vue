<template>
  <div class="home-page">
    <!-- ==================== ADMIN / OPERATOR VIEW ==================== -->
    <template v-if="user?.role !== 'user'">
      <!-- Hero greeting -->
      <div class="hero-section animate-in">
        <h2 class="hero-title">Good {{ timeOfDay }}, <span class="hero-name">{{ user?.name }}</span></h2>
        <p class="hero-subtitle">Here's your inventory overview</p>
      </div>

      <!-- Bento Stats Grid -->
      <div class="bento-grid animate-in delay-1">
        <button
          @click="$emit('navigate', 'manage-items')"
          class="bento-item bento-primary"
        >
          <div class="bento-icon">📦</div>
          <div class="bento-value">{{ stats.totalItems }}</div>
          <div class="bento-label">Total Items</div>
        </button>
        <button
          @click="$emit('navigate', 'search-available')"
          class="bento-item bento-success"
        >
          <div class="bento-icon">✅</div>
          <div class="bento-value">{{ stats.availableItems }}</div>
          <div class="bento-label">Available</div>
        </button>
        <button
          @click="$emit('navigate', 'lent-out-filter')"
          class="bento-item bento-warning"
        >
          <div class="bento-icon">🔄</div>
          <div class="bento-value">{{ stats.lentOutItems }}</div>
          <div class="bento-label">Lent Out</div>
        </button>
        <button
          @click="$emit('navigate', 'approve-requests')"
          class="bento-item bento-danger"
        >
          <div class="bento-icon">⏳</div>
          <div class="bento-value">{{ stats.pendingRequests }}</div>
          <div class="bento-label">Pending</div>
          <span v-if="stats.pendingRequests > 0" class="bento-badge pulse-badge">!</span>
        </button>
      </div>

      <!-- Status Row -->
      <div class="status-row animate-in delay-2">
        <button @click="$emit('navigate', 'borrow-history', { filter: 'Returned' })" class="status-chip">
          <span class="status-dot status-dot-green"></span>
          <span class="status-count">{{ stats.returnedRequests }}</span>
          <span class="status-text">Returned</span>
        </button>
        <button @click="$emit('navigate', 'borrow-history', { filter: 'Approved' })" class="status-chip">
          <span class="status-dot status-dot-blue"></span>
          <span class="status-count">{{ stats.approvedRequests }}</span>
          <span class="status-text">Approved</span>
        </button>
        <button @click="$emit('navigate', 'borrow-history', { filter: 'Rejected' })" class="status-chip">
          <span class="status-dot status-dot-red"></span>
          <span class="status-count">{{ stats.rejectedRequests }}</span>
          <span class="status-text">Rejected</span>
        </button>
      </div>

      <!-- Calendar -->
      <div class="section-card animate-in delay-3">
        <DashboardCalendar />
      </div>

      <!-- Recent Activity -->
      <div class="section-card animate-in delay-4">
        <div class="section-header">
          <h3 class="section-title">Recent Activity</h3>
          <button @click="$emit('navigate', 'audit-log')" class="section-link">View All →</button>
        </div>
        <div v-if="recentLogs.length === 0" class="empty-state">
          <span class="empty-icon">📭</span>
          <p>No recent activity</p>
        </div>
        <div v-else class="activity-list">
          <div
            v-for="(log, i) in recentLogs"
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
        <h2 class="hero-title">Welcome, <span class="hero-name">{{ user?.name }}</span></h2>
        <p class="hero-subtitle">What would you like to do?</p>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions animate-in delay-1">
        <button @click="$emit('navigate', 'new-borrow-request')" class="quick-action-card action-blue">
          <span class="quick-action-icon">➕</span>
          <span class="quick-action-text">New Borrow Request</span>
        </button>
        <button @click="$emit('navigate', 'search-available')" class="quick-action-card action-green">
          <span class="quick-action-icon">🔍</span>
          <span class="quick-action-text">Search Items</span>
        </button>
      </div>

      <!-- My Borrow Records -->
      <div class="section-card animate-in delay-2">
        <div class="section-header">
          <h3 class="section-title">My Borrow Records</h3>
          <button @click="$emit('navigate', 'my-borrowing-record')" class="section-link">View All →</button>
        </div>
        <div v-if="myBorrows.length === 0" class="empty-state">
          <span class="empty-icon">📋</span>
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
              <span :class="['record-status', getStatusClass(borrow.status)]">{{ borrow.status }}</span>
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
import { formatDate, formatDateTime, getStatusColor } from '../utils/helpers'
import DashboardCalendar from '../components/DashboardCalendar.vue'

export default {
  components: { DashboardCalendar },
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

    const timeOfDay = computed(() => {
      const h = new Date().getHours()
      if (h < 12) return 'morning'
      if (h < 17) return 'afternoon'
      return 'evening'
    })

    const getStatusClass = (status) => {
      const s = (status || '').toLowerCase()
      if (s === 'approved' || s === 'returned') return 'status-green'
      if (s === 'pending') return 'status-yellow'
      if (s === 'rejected') return 'status-red'
      return 'status-gray'
    }

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
        const allLogs = await auditService.getAllLogs({ pageSize: 8 })
        recentLogs.value = allLogs
      } catch (e) {
        console.error('Failed to load logs:', e)
      }

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
      myBorrows,
      timeOfDay,
      formatDate,
      formatDateTime,
      getStatusColor,
      getStatusClass,
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

.hero-name {
  background: linear-gradient(135deg, var(--accent), #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  color: var(--text-muted);
  font-size: 0.9375rem;
  margin-top: 0.25rem;
}

/* ===== Bento Grid ===== */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

@media (min-width: 640px) {
  .bento-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }
}

.bento-item {
  position: relative;
  background: var(--bg-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-glass);
  border-radius: 1.25rem;
  padding: 1.25rem 1rem;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  overflow: hidden;
}

.bento-item:active {
  transform: scale(0.97);
}

@media (hover: hover) {
  .bento-item:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 32px var(--shadow-color);
  }
}

.bento-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 3px 3px 0 0;
}

.bento-primary::before { background: var(--accent); }
.bento-success::before { background: var(--success); }
.bento-warning::before { background: var(--warning); }
.bento-danger::before { background: var(--danger); }

.bento-icon {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.bento-value {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
  letter-spacing: -0.03em;
}

.bento-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-top: 0.375rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.bento-badge {
  position: absolute;
  top: 0.625rem;
  right: 0.625rem;
  width: 1.25rem;
  height: 1.25rem;
  background: var(--danger);
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 800;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse-badge {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
}

/* ===== Status Row ===== */
.status-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 0.25rem;
}

.status-chip {
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

.status-chip:active {
  transform: scale(0.96);
  background: var(--bg-tertiary);
}

.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
}

.status-dot-green { background: var(--success); }
.status-dot-blue { background: var(--accent); }
.status-dot-red { background: var(--danger); }

.status-count {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-primary);
}

.status-text {
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

/* ===== Empty State ===== */
.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.empty-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.5rem;
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
  background: linear-gradient(135deg, rgba(6, 153, 255, 0.15), rgba(6, 153, 255, 0.05));
  border: 1px solid rgba(6, 153, 255, 0.2);
}

.action-green {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05));
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

.record-status {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  text-transform: uppercase;
}

.status-green { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
.status-yellow { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
.status-red { background: rgba(239, 68, 68, 0.15); color: #f87171; }
.status-gray { background: rgba(148, 163, 184, 0.15); color: #94a3b8; }

.light-mode .status-green { color: #16a34a; }
.light-mode .status-yellow { color: #d97706; }
.light-mode .status-red { color: #dc2626; }

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
