<template>
  <div :class="['app-shell', darkMode ? '' : 'light-mode']" v-if="isAuthenticated">
    <!-- ===== Top Header with Nav Tabs ===== -->
    <header class="top-bar">
      <div class="top-bar-brand">
        <button @click="handleNavigate('home')" class="logo-btn">
          <svg class="logo-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          <span class="logo-text">Inventory</span>
        </button>
        <div class="top-bar-actions">
          <button @click="darkMode = !darkMode" class="icon-btn" :title="darkMode ? 'Light mode' : 'Dark mode'">
            <svg v-if="darkMode" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
          <div class="user-chip" @click="showUserMenu = !showUserMenu">
            <div class="avatar">{{ user?.name?.charAt(0)?.toUpperCase() || '?' }}</div>
            <span class="user-name hidden sm:inline">{{ user?.name }}</span>
          </div>
        </div>
      </div>
      <nav class="top-nav">
        <button
          v-for="item in navItems"
          :key="item.page"
          @click="handleNavigate(item.page)"
          :class="['top-nav-tab', currentPage === item.page ? 'top-nav-active' : '']"
        >
          <span class="top-nav-icon" v-html="item.icon"></span>
          <span class="top-nav-label">{{ item.label }}</span>
          <NotificationBadge v-if="item.page === 'approve-requests'" :count="pendingCount" />
        </button>
      </nav>
    </header>

    <!-- User dropdown -->
    <div v-if="showUserMenu" class="user-dropdown animate-scale-in" @click.self="showUserMenu = false">
      <div class="dropdown-card">
        <div class="dropdown-header">
          <div class="avatar avatar-lg">{{ user?.name?.charAt(0)?.toUpperCase() || '?' }}</div>
          <div>
            <p class="dropdown-name">{{ user?.name }}</p>
            <p class="dropdown-role">{{ user?.role }}</p>
          </div>
        </div>
        <div class="dropdown-divider"></div>
        <button @click="handleLogout" class="dropdown-item dropdown-item-danger">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Logout
        </button>
      </div>
    </div>

    <!-- ===== Main Content ===== -->
    <main class="main-content">
      <component :is="currentComponent" @navigate="handleNavigate" :pageParams="pageParams" />
    </main>
  </div>

  <LoginPage v-else :onLogin="handleLogin" :darkMode="darkMode" @toggle-theme="darkMode = !darkMode" />

  <!-- Overdue Warning Modal -->
  <div v-if="showOverdueWarning" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" @click.self="showOverdueWarning = false">
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
      <div class="bg-red-600 px-6 py-4 flex items-center gap-3">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <h3 class="text-white text-lg font-bold">Overdue Items Warning</h3>
      </div>
      <div class="px-6 py-4">
        <p class="text-red-600 dark:text-red-400 font-medium mb-3">You have {{ overdueItems.length }} overdue item(s) that must be returned immediately:</p>
        <ul class="space-y-2 max-h-60 overflow-y-auto">
          <li v-for="item in overdueItems" :key="item._id" class="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div>
              <span class="font-semibold text-gray-800 dark:text-gray-200">{{ item.itemID || 'N/A' }}</span>
              <span class="text-sm text-red-500 ml-2">({{ item.itemName || 'Unknown Item' }})</span>
            </div>
            <span class="text-sm text-red-600 dark:text-red-400 font-medium">Due: {{ formatDate(item.returnDate) }}</span>
          </li>
        </ul>
      </div>
      <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
        <button @click="showOverdueWarning = false" class="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors">I Understand</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuth } from './hooks/useAuth'
import { borrowingService } from './utils/services'
import { isOverdue, formatDate } from './utils/helpers'
import LoginPage from './pages/LoginPage.vue'
import ApproveRequestsPage from './pages/ApproveRequestsPage.vue'
import BorrowHistoryPage from './pages/BorrowHistoryPage.vue'
import ManageItemsPage from './pages/ManageItemsPage.vue'
import LentOutFilterPage from './pages/LentOutFilterPage.vue'
import AuditLogPage from './pages/AuditLogPage.vue'
import NewBorrowRequestPage from './pages/NewBorrowRequestPage.vue'
import MyBorrowingRecordPage from './pages/MyBorrowingRecordPage.vue'
import SearchAvailableItemsPage from './pages/SearchAvailableItemsPage.vue'
import HandOverToolPage from './pages/HandOverToolPage.vue'
import HomePage from './pages/HomePage.vue'
import ApiStatusPage from './pages/ApiStatusPage.vue'
import NotificationBadge from './components/NotificationBadge.vue'

// SVG icon factory (Lucide-style)
const svgIcon = (d) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`

const NAV_ICONS = {
  home: svgIcon('<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'),
  requests: svgIcon('<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="m9 14 2 2 4-4"/>'),
  history: svgIcon('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
  items: svgIcon('<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>'),
  checkedOut: svgIcon('<path d="M7 7h10v10"/><path d="M7 17 17 7"/>'),
  auditLog: svgIcon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>'),
  newRequest: svgIcon('<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>'),
  myRecords: svgIcon('<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>'),
  search: svgIcon('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'),
  guidelines: svgIcon('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'),
  apiStatus: svgIcon('<circle cx="12" cy="12" r="1"/><path d="M12 8v8M8 12h8"/><circle cx="12" cy="12" r="9" fill="none"/>'),
}

export default {
  components: {
    LoginPage,
    ApproveRequestsPage,
    BorrowHistoryPage,
    ManageItemsPage,
    LentOutFilterPage,
    AuditLogPage,
    NewBorrowRequestPage,
    MyBorrowingRecordPage,
    SearchAvailableItemsPage,
    HandOverToolPage,
    HomePage,
    ApiStatusPage,
    NotificationBadge,
  },
  setup() {
    const { user, isAuthenticated, login, logout } = useAuth()
    const currentPage = ref('home')
    const pageParams = ref({})
    const pendingCount = ref(0)
    const darkMode = ref(true)
    const showUserMenu = ref(false)
    const showOverdueWarning = ref(false)
    const overdueItems = ref([])
    let pollTimer = null

    // Navigation items based on role
    const navItems = computed(() => {
      const items = [
        { page: 'home', label: 'Dashboard', icon: NAV_ICONS.home },
      ]
      if (user.value?.role === 'admin' || user.value?.role === 'operator') {
        items.push(
          { page: 'approve-requests', label: 'Requests', icon: NAV_ICONS.requests },
          { page: 'borrow-history', label: 'History', icon: NAV_ICONS.history },
          { page: 'manage-items', label: 'Items', icon: NAV_ICONS.items },
          { page: 'lent-out-filter', label: 'Checked out', icon: NAV_ICONS.checkedOut },
          { page: 'audit-log', label: 'Audit log', icon: NAV_ICONS.auditLog },
          { page: 'api-status', label: 'API Status', icon: NAV_ICONS.apiStatus },
        )
      }
      if (user.value?.role === 'user') {
        items.push(
          { page: 'new-borrow-request', label: 'New request', icon: NAV_ICONS.newRequest },
          { page: 'my-borrowing-record', label: 'My records', icon: NAV_ICONS.myRecords },
          { page: 'search-available', label: 'Search', icon: NAV_ICONS.search },
        )
      }
      return items
    })

    const refreshPendingCount = async () => {
      try {
        const requests = await borrowingService.getTopLevelPendingRequests()
        pendingCount.value = requests.length
      } catch (e) {
        pendingCount.value = 0
      }
    }

    const handleNavigate = (page, params = {}) => {
      currentPage.value = page
      pageParams.value = params || {}
      showUserMenu.value = false
    }

    const handleLogin = async (username, password) => {
      const ok = await login(username, password)
      if (ok) {
        refreshPendingCount()
        if (!pollTimer) pollTimer = setInterval(refreshPendingCount, 5000)
        // Check for overdue borrows for user role
        if (user.value?.role === 'user') {
          try {
            const requests = await borrowingService.getRequestsForUser(user.value.username)
            const overdue = requests.filter(r => (r.status === 'approved' || r.status === 'Approved') && isOverdue(r.returnDate))
            if (overdue.length > 0) {
              overdueItems.value = overdue
              showOverdueWarning.value = true
            }
          } catch (e) {
            console.error('Failed to check overdue items:', e)
          }
        }
      }
      return ok
    }

    const currentComponent = computed(() => {
      switch (currentPage.value) {
        case 'approve-requests':
          return ApproveRequestsPage
        case 'borrow-history':
          return BorrowHistoryPage
        case 'manage-items':
          return ManageItemsPage
        case 'lent-out-filter':
          return LentOutFilterPage
        case 'audit-log':
          return AuditLogPage
        case 'new-borrow-request':
          return NewBorrowRequestPage
        case 'my-borrowing-record':
          return MyBorrowingRecordPage
        case 'search-available':
          return SearchAvailableItemsPage
        case 'hand-over-tool':
          return HandOverToolPage
        case 'api-status':
          return ApiStatusPage
        default:
          return HomePage
      }
    })

    onMounted(() => {
      if (isAuthenticated.value) {
        refreshPendingCount()
        pollTimer = setInterval(refreshPendingCount, 5000)
      }
    })

    const handleLogout = async () => {
      showUserMenu.value = false
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
      await logout()
      currentPage.value = 'home'
    }

    onUnmounted(() => {
      if (pollTimer) clearInterval(pollTimer)
    })

    return {
      user,
      isAuthenticated,
      currentPage,
      currentComponent,
      pendingCount,
      pageParams,
      darkMode,
      showUserMenu,
      navItems,
      handleLogin,
      handleNavigate,
      handleLogout,
      showOverdueWarning,
      overdueItems,
      formatDate,
    }
  }
}
</script>

<style>
@import './index.css';

/* ===== App Shell ===== */
.app-shell {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: background 0.3s, color 0.3s;
}

/* ===== Top Bar ===== */
.top-bar {
  position: sticky;
  top: 0;
  z-index: 40;
  background: var(--bg-glass-heavy);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  border-bottom: 1px solid var(--border-glass);
}

.top-bar-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  max-width: 80rem;
  margin: 0 auto;
}

.logo-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  -webkit-tap-highlight-color: transparent;
}

.logo-svg {
  color: var(--accent);
}

.logo-text {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.top-bar-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.icon-btn {
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  -webkit-tap-highlight-color: transparent;
}

.icon-btn:active {
  transform: scale(0.92);
}

.icon-btn svg {
  display: block;
}

/* ===== Nav Tabs ===== */
.top-nav {
  display: flex;
  gap: 0.125rem;
  padding: 0 1rem;
  max-width: 80rem;
  margin: 0 auto;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.top-nav::-webkit-scrollbar {
  display: none;
}

.top-nav-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-muted);
  border: none;
  background: transparent;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s;
  -webkit-tap-highlight-color: transparent;
  position: relative;
}

.top-nav-tab:hover {
  color: var(--text-primary);
}

.top-nav-active {
  color: var(--accent);
  font-weight: 600;
  border-bottom-color: var(--accent);
}

.top-nav-icon {
  display: flex;
  align-items: center;
}

.top-nav-icon svg {
  width: 16px;
  height: 16px;
}

.top-nav-label {
  line-height: 1;
}

/* ===== User Chip ===== */
.user-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem 0.25rem 0.25rem;
  border-radius: 9999px;
  background: var(--bg-tertiary);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s;
}

.user-chip:active {
  background: var(--border-color);
}

.avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #A6B1E1, #424874);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-lg {
  width: 2.75rem;
  height: 2.75rem;
  font-size: 1.125rem;
}

.user-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
}

/* ===== User Dropdown ===== */
.user-dropdown {
  position: fixed;
  inset: 0;
  z-index: 45;
  display: flex;
  justify-content: flex-end;
  padding: 3.5rem 1rem 0;
}

.dropdown-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  box-shadow: 0 16px 48px var(--shadow-color);
  width: 16rem;
  height: fit-content;
  overflow: hidden;
  animation: scaleIn 0.15s ease-out;
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
}

.dropdown-name {
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--text-primary);
}

.dropdown-role {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: capitalize;
}

.dropdown-divider {
  height: 1px;
  background: var(--border-color);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--text-secondary);
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.dropdown-item:hover, .dropdown-item:active {
  background: var(--bg-tertiary);
}

.dropdown-item-danger {
  color: var(--danger);
}

.dropdown-item svg {
  flex-shrink: 0;
}

/* ===== Main Content ===== */
.main-content {
  flex: 1;
  max-width: 80rem;
  width: 100%;
  margin: 0 auto;
  padding-bottom: 1rem;
}

/* ===== Animation helpers ===== */
.animate-scale-in {
  animation: scaleIn 0.15s ease-out;
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
