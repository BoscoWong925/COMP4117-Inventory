<template>
  <div v-if="isAuthLoading" class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
    <div class="flex flex-col items-center gap-4">
      <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      <p class="text-gray-500 dark:text-gray-400 font-medium text-lg">Loading...</p>
    </div>
  </div>
  <template v-else>
    <div :class="['app-shell', darkMode ? '' : 'light-mode', compactMode ? 'compact-mode' : '', reduceMotion ? 'reduce-motion' : '']" v-if="isAuthenticated">
    <!-- ===== Top Header with Nav Tabs ===== -->
    <header class="top-bar">
      <div class="top-bar-brand">
        <button @click="handleNavigate('home')" class="logo-btn">
          <svg class="logo-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          <span class="logo-text">Inventory</span>
        </button>
        <div class="top-bar-actions">
          <button @click="toggleTheme" class="icon-btn" :title="darkMode ? 'Light mode' : 'Dark mode'">
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
        <div class="nav-groups">
          <button
            v-for="group in navGroups"
            :key="group.key"
            @click="handleGroupClick(group)"
            :class="['nav-group-tab', activeGroup === group.key ? 'nav-group-active' : '']"
          >
            <span class="top-nav-icon" v-html="group.icon"></span>
            <span class="top-nav-label">{{ group.label }}</span>
            <NotificationBadge v-if="group.children?.some(c => c.page === 'approve-requests' || c.page === 'teacher-requests')" :count="pendingCount" />
          </button>
        </div>
        <div class="nav-sub" v-if="activeSubItems.length">
          <button
            v-for="item in activeSubItems"
            :key="item.page"
            @click="handleNavigate(item.page)"
            :class="['nav-sub-tab', currentPage === item.page ? 'nav-sub-active' : '']"
          >
            <span class="top-nav-icon" v-html="item.icon"></span>
            <span class="top-nav-label">{{ item.label }}</span>
            <NotificationBadge v-if="item.page === 'approve-requests' || item.page === 'teacher-requests'" :count="pendingCount" />
          </button>
        </div>
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
        <button @click="showSettings = !showSettings" class="dropdown-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .69.4 1.31 1.02 1.58.26.12.55.19.85.19H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span class="dropdown-item-text">Settings</span>
          <svg class="settings-caret" :class="showSettings ? 'settings-caret-open' : ''" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div v-if="showSettings" class="settings-panel">
          <p class="settings-label">Theme preference</p>
          <div class="settings-options">
            <button @click="setThemePreference('system')" :class="['settings-pill', themePreference === 'system' ? 'settings-pill-active' : '']">System</button>
            <button @click="setThemePreference('dark')" :class="['settings-pill', themePreference === 'dark' ? 'settings-pill-active' : '']">Dark</button>
            <button @click="setThemePreference('light')" :class="['settings-pill', themePreference === 'light' ? 'settings-pill-active' : '']">Light</button>
          </div>
          <label class="settings-toggle">
            <span>Compact layout</span>
            <input type="checkbox" v-model="compactMode" />
          </label>
          <label class="settings-toggle">
            <span>Reduce motion</span>
            <input type="checkbox" v-model="reduceMotion" />
          </label>
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
  </template>

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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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
import TeacherCheckoutPage from './pages/TeacherCheckoutPage.vue'
import MyItemsPage from './pages/MyItemsPage.vue'
import ManageAccountsPage from './pages/ManageAccountsPage.vue'
import TeacherRequestsPage from './pages/TeacherRequestsPage.vue'
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
  myItems: svgIcon('<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>'),
  accounts: svgIcon('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  teacherRequests: svgIcon('<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="m9 14 2 2 4-4"/>'),
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
    TeacherCheckoutPage,
    MyItemsPage,
    ManageAccountsPage,
    TeacherRequestsPage,
    NotificationBadge,
  },
  setup() {
    const { user, isAuthenticated, login, logout, initAuth, isAuthLoading } = useAuth()
    const currentPage = ref(sessionStorage.getItem('inventory_last_page') || 'home')
    const pageParams = ref({})
    const pendingCount = ref(0)
    const darkMode = ref(true)
    const showSettings = ref(false)
    const themePreference = ref(localStorage.getItem('inventory_theme') || 'system')
    const compactMode = ref(localStorage.getItem('inventory_compact') === 'true')
    const reduceMotion = ref(localStorage.getItem('inventory_reduce_motion') === 'true')
    const showUserMenu = ref(false)
    const showOverdueWarning = ref(false)
    const overdueItems = ref([])
    let pollTimer = null
    const activeGroup = ref('dashboard')

    // Navigation groups with sub-items (two-layer nav)
    const navGroups = computed(() => {
      if (user.value?.role === 'admin') {
        return [
          { key: 'dashboard', label: 'Dashboard', icon: NAV_ICONS.home, page: 'home' },
          { key: 'requests', label: 'Requests', icon: NAV_ICONS.requests, children: [
            { page: 'approve-requests', label: 'Approve Requests', icon: NAV_ICONS.requests },
            { page: 'borrow-history', label: 'History', icon: NAV_ICONS.history },
          ]},
          { key: 'inventory', label: 'Inventory', icon: NAV_ICONS.items, children: [
            { page: 'manage-items', label: 'Items', icon: NAV_ICONS.items },
            { page: 'lent-out-filter', label: 'Checked Out', icon: NAV_ICONS.checkedOut },
          ]},
          { key: 'admin', label: 'Admin', icon: NAV_ICONS.accounts, children: [
            { page: 'manage-accounts', label: 'Accounts', icon: NAV_ICONS.accounts },
            { page: 'audit-log', label: 'Audit Log', icon: NAV_ICONS.auditLog },
            { page: 'api-status', label: 'API Status', icon: NAV_ICONS.apiStatus },
          ]},
        ]
      } else if (user.value?.role === 'operator') {
        return [
          { key: 'dashboard', label: 'Dashboard', icon: NAV_ICONS.home, page: 'home' },
          { key: 'requests', label: 'Requests', icon: NAV_ICONS.requests, children: [
            { page: 'approve-requests', label: 'Approve Requests', icon: NAV_ICONS.requests },
            { page: 'borrow-history', label: 'History', icon: NAV_ICONS.history },
          ]},
          { key: 'inventory', label: 'Inventory', icon: NAV_ICONS.items, children: [
            { page: 'manage-items', label: 'Items', icon: NAV_ICONS.items },
            { page: 'lent-out-filter', label: 'Checked Out', icon: NAV_ICONS.checkedOut },
          ]},
          { key: 'system', label: 'System', icon: NAV_ICONS.auditLog, children: [
            { page: 'audit-log', label: 'Audit Log', icon: NAV_ICONS.auditLog },
            { page: 'api-status', label: 'API Status', icon: NAV_ICONS.apiStatus },
          ]},
        ]
      } else if (user.value?.role === 'user' && user.value?.subRole === 'teacher') {
        return [
          { key: 'dashboard', label: 'Dashboard', icon: NAV_ICONS.home, page: 'home' },
          { key: 'manage', label: 'Manage', icon: NAV_ICONS.teacherRequests, children: [
            { page: 'teacher-requests', label: 'Item Requests', icon: NAV_ICONS.teacherRequests },
            { page: 'my-items', label: 'My Items', icon: NAV_ICONS.myItems },
            { page: 'teacher-checkout', label: 'Checkout', icon: NAV_ICONS.checkedOut },
          ]},
          { key: 'borrow', label: 'Borrow', icon: NAV_ICONS.newRequest, children: [
            { page: 'new-borrow-request', label: 'New Request', icon: NAV_ICONS.newRequest },
            { page: 'search-available', label: 'Search', icon: NAV_ICONS.search },
            { page: 'my-borrowing-record', label: 'My Records', icon: NAV_ICONS.myRecords },
          ]},
        ]
      } else if (user.value?.role === 'user') {
        return [
          { key: 'dashboard', label: 'Dashboard', icon: NAV_ICONS.home, page: 'home' },
          { key: 'borrow', label: 'Borrow', icon: NAV_ICONS.newRequest, children: [
            { page: 'new-borrow-request', label: 'New Request', icon: NAV_ICONS.newRequest },
            { page: 'search-available', label: 'Search', icon: NAV_ICONS.search },
            { page: 'my-borrowing-record', label: 'My Records', icon: NAV_ICONS.myRecords },
          ]},
          { key: 'my-items', label: 'My Items', icon: NAV_ICONS.myItems, page: 'my-items' },
        ]
      }
      return [{ key: 'dashboard', label: 'Dashboard', icon: NAV_ICONS.home, page: 'home' }]
    })

    const findGroupForPage = (page) => {
      for (const group of navGroups.value) {
        if (group.page === page) return group.key
        if (group.children?.some(c => c.page === page)) return group.key
      }
      return 'dashboard'
    }

    const activeSubItems = computed(() => {
      const group = navGroups.value.find(g => g.key === activeGroup.value)
      return group?.children || []
    })

    const handleGroupClick = (group) => {
      activeGroup.value = group.key
      if (group.page) {
        handleNavigate(group.page)
      } else if (group.children?.length) {
        const isOnChildPage = group.children.some(c => c.page === currentPage.value)
        if (!isOnChildPage) {
          handleNavigate(group.children[0].page)
        }
      }
    }

    const refreshPendingCount = async () => {
      try {
        if (user.value?.role !== 'user') {
          const requests = await borrowingService.getTopLevelPendingRequests()
          pendingCount.value = requests.length
        } else if (user.value?.subRole === 'teacher') {
          const requests = await borrowingService.getTeacherPendingRequests()
          pendingCount.value = requests.length
        }
      } catch (e) {
        pendingCount.value = 0
      }
    }

    const handleNavigate = (page, params = {}) => {
      currentPage.value = page
      pageParams.value = params || {}
      sessionStorage.setItem('inventory_last_page', page)
      showUserMenu.value = false
      showSettings.value = false
      activeGroup.value = findGroupForPage(page)
    }

    const afterLoginSetup = async () => {
      if (user.value?.role !== 'user' || user.value?.subRole === 'teacher') {
        refreshPendingCount()
        if (!pollTimer) pollTimer = setInterval(refreshPendingCount, 5000)
      }
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

    const applyThemePreference = () => {
      if (themePreference.value === 'dark') {
        darkMode.value = true
        return
      }
      if (themePreference.value === 'light') {
        darkMode.value = false
        return
      }
      if (window.matchMedia) {
        darkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches
      }
    }

    const setThemePreference = (pref) => {
      themePreference.value = pref
    }

    const toggleTheme = () => {
      themePreference.value = darkMode.value ? 'light' : 'dark'
    }

    let systemThemeListener = null

    const handleLogin = async (username, password) => {
      const ok = await login(username, password)
      if (ok) {
        await afterLoginSetup()
      }
      return ok
    }

    onMounted(async () => {
      applyThemePreference()
      if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        systemThemeListener = () => {
          if (themePreference.value === 'system') applyThemePreference()
        }
        if (mediaQuery.addEventListener) {
          mediaQuery.addEventListener('change', systemThemeListener)
        } else if (mediaQuery.addListener) {
          mediaQuery.addListener(systemThemeListener)
        }
      }
      await initAuth()
      if (isAuthenticated.value) {
        activeGroup.value = findGroupForPage(currentPage.value)
        await afterLoginSetup()
      }
    })

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
        case 'my-items':
          return MyItemsPage
        case 'manage-accounts':
          return ManageAccountsPage
        case 'teacher-requests':
          return TeacherRequestsPage
        case 'teacher-checkout':
          return TeacherCheckoutPage
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
      showSettings.value = false
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
      await logout()
      currentPage.value = 'home'
    }

    onUnmounted(() => {
      if (pollTimer) clearInterval(pollTimer)
      if (systemThemeListener && window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', systemThemeListener)
        } else if (mediaQuery.removeListener) {
          mediaQuery.removeListener(systemThemeListener)
        }
      }
    })

    watch(themePreference, (value) => {
      localStorage.setItem('inventory_theme', value)
      applyThemePreference()
    })

    watch(compactMode, (value) => {
      localStorage.setItem('inventory_compact', value ? 'true' : 'false')
    })

    watch(reduceMotion, (value) => {
      localStorage.setItem('inventory_reduce_motion', value ? 'true' : 'false')
    })

    return {
      user,
      isAuthenticated,
      isAuthLoading,
      currentPage,
      currentComponent,
      pendingCount,
      pageParams,
      darkMode,
      showSettings,
      themePreference,
      compactMode,
      reduceMotion,
      showUserMenu,
      navGroups,
      activeGroup,
      activeSubItems,
      handleGroupClick,
      setThemePreference,
      toggleTheme,
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

/* ===== Nav Tabs (Two-Layer) ===== */
.top-nav {
  display: flex;
  flex-direction: column;
  max-width: 80rem;
  margin: 0 auto;
}

.nav-groups {
  display: flex;
  gap: 0.125rem;
  padding: 0 1rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.nav-groups::-webkit-scrollbar {
  display: none;
}

.nav-group-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
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

.nav-group-tab:hover {
  color: var(--text-primary);
}

.nav-group-active {
  color: var(--accent);
  font-weight: 600;
  border-bottom-color: var(--accent);
}

.nav-sub {
  display: flex;
  gap: 0.125rem;
  padding: 0 1rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  background: var(--bg-tertiary);
  border-top: 1px solid var(--border-glass);
}

.nav-sub::-webkit-scrollbar {
  display: none;
}

.nav-sub-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.4rem 0.75rem;
  font-size: 0.75rem;
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

.nav-sub-tab:hover {
  color: var(--text-primary);
}

.nav-sub-active {
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

.dropdown-item-text {
  flex: 1;
  text-align: left;
}

.settings-caret {
  transition: transform 0.15s ease;
}

.settings-caret-open {
  transform: rotate(180deg);
}

.settings-panel {
  padding: 0.75rem 1rem 1rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
}

.settings-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.settings-options {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.settings-pill {
  flex: 1;
  padding: 0.35rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 9999px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.settings-pill:hover {
  background: var(--bg-glass);
  color: var(--text-primary);
}

.settings-pill-active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.settings-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.settings-toggle input {
  width: 1.05rem;
  height: 1.05rem;
  accent-color: var(--accent);
}

/* ===== Main Content ===== */
.main-content {
  flex: 1;
  max-width: 80rem;
  width: 100%;
  margin: 0 auto;
  padding-bottom: 1rem;
}

.compact-mode .top-bar-brand {
  padding: 0.35rem 0.75rem;
}

.compact-mode .nav-group-tab {
  padding: 0.35rem 0.6rem;
}

.compact-mode .nav-sub-tab {
  padding: 0.3rem 0.6rem;
}

.compact-mode .main-content {
  padding-bottom: 0.5rem;
}

.reduce-motion *,
.reduce-motion *::before,
.reduce-motion *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
  scroll-behavior: auto !important;
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
