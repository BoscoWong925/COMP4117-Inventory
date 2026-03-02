<template>
  <div :class="['app-shell', darkMode ? '' : 'light-mode']" v-if="isAuthenticated">
    <!-- ===== Top Header (glass) ===== -->
    <header class="top-bar">
      <div class="top-bar-inner">
        <div class="top-bar-left">
          <button @click="handleNavigate('home')" class="logo-btn">
            <span class="logo-icon">📦</span>
            <span class="logo-text">Inventory</span>
          </button>
        </div>
        <div class="top-bar-right">
          <button @click="darkMode = !darkMode" class="icon-btn" :title="darkMode ? 'Light Mode' : 'Dark Mode'">
            {{ darkMode ? '☀️' : '🌙' }}
          </button>
          <div class="user-chip" @click="showUserMenu = !showUserMenu">
            <div class="avatar">{{ user?.name?.charAt(0)?.toUpperCase() || '?' }}</div>
            <span class="user-name hidden sm:inline">{{ user?.name }}</span>
          </div>
        </div>
      </div>

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
          <button @click="logout; showUserMenu = false" class="dropdown-item dropdown-item-danger">
            <span>🚪</span> Logout
          </button>
        </div>
      </div>
    </header>

    <!-- ===== Desktop Side Nav (hidden on mobile) ===== -->
    <!-- ===== Mobile Drawer ===== -->
    <div v-if="mobileMenuOpen" class="drawer-overlay" @click="mobileMenuOpen = false">
      <nav class="drawer" @click.stop>
        <div class="drawer-header">
          <span class="logo-icon">📦</span>
          <span class="drawer-title">Menu</span>
          <button @click="mobileMenuOpen = false" class="icon-btn">✕</button>
        </div>
        <div class="drawer-body">
          <button
            v-for="item in navItems"
            :key="item.page"
            @click="handleNavigate(item.page); mobileMenuOpen = false"
            :class="['drawer-link', currentPage === item.page ? 'drawer-link-active' : '']"
          >
            <span class="drawer-link-icon">{{ item.icon }}</span>
            <span class="drawer-link-text">{{ item.label }}</span>
            <NotificationBadge v-if="item.page === 'approve-requests'" :count="pendingCount" />
          </button>
        </div>
        <div class="drawer-footer">
          <button @click="logout" class="drawer-link drawer-link-danger">
            <span class="drawer-link-icon">🚪</span>
            <span class="drawer-link-text">Logout</span>
          </button>
        </div>
      </nav>
    </div>

    <!-- ===== Main Content ===== -->
    <main class="main-content">
      <component :is="currentComponent" @navigate="handleNavigate" :pageParams="pageParams" />
    </main>

    <!-- ===== Mobile Bottom Nav ===== -->
    <nav class="bottom-nav">
      <button
        v-for="item in bottomNavItems"
        :key="item.page"
        @click="handleNavigate(item.page)"
        :class="['bottom-nav-btn', currentPage === item.page ? 'bottom-nav-active' : '']"
      >
        <span class="bottom-nav-icon">{{ item.icon }}</span>
        <span class="bottom-nav-label">{{ item.label }}</span>
        <span v-if="item.page === 'approve-requests' && pendingCount > 0" class="bottom-nav-badge">
          {{ pendingCount > 9 ? '9+' : pendingCount }}
        </span>
      </button>
      <!-- More / Menu button -->
      <button @click="mobileMenuOpen = true" class="bottom-nav-btn">
        <span class="bottom-nav-icon">☰</span>
        <span class="bottom-nav-label">More</span>
      </button>
    </nav>
  </div>

  <LoginPage v-else :onLogin="handleLogin" :darkMode="darkMode" @toggle-theme="darkMode = !darkMode" />
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuth } from './hooks/useAuth'
import { borrowingService } from './utils/services'
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
import GuidelinePage from './pages/GuidelinePage.vue'
import HomePage from './pages/HomePage.vue'
import NotificationBadge from './components/NotificationBadge.vue'

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
    GuidelinePage,
    HomePage,
    NotificationBadge,
  },
  setup() {
    const { user, isAuthenticated, login, logout } = useAuth()
    const currentPage = ref('home')
    const pageParams = ref({})
    const pendingCount = ref(0)
    const darkMode = ref(true)
    const mobileMenuOpen = ref(false)
    const showUserMenu = ref(false)
    let pollTimer = null

    // Navigation items based on role
    const navItems = computed(() => {
      const items = [
        { page: 'home', label: 'Dashboard', icon: '🏠' },
      ]
      if (user.value?.role === 'admin' || user.value?.role === 'operator') {
        items.push(
          { page: 'approve-requests', label: 'Approve Requests', icon: '✅' },
          { page: 'borrow-history', label: 'Borrow History', icon: '📋' },
          { page: 'manage-items', label: 'Manage Items', icon: '📦' },
          { page: 'lent-out-filter', label: 'Lent-Out Items', icon: '🔄' },
          { page: 'audit-log', label: 'Audit Log', icon: '📝' },
        )
      }
      if (user.value?.role === 'user') {
        items.push(
          { page: 'new-borrow-request', label: 'New Request', icon: '➕' },
          { page: 'my-borrowing-record', label: 'My Records', icon: '📋' },
          { page: 'search-available', label: 'Search Items', icon: '🔍' },
        )
      }
      items.push({ page: 'guideline', label: 'Guidelines', icon: '📖' })
      return items
    })

    // Bottom nav shows first 3-4 key items
    const bottomNavItems = computed(() => {
      if (user.value?.role === 'admin' || user.value?.role === 'operator') {
        return [
          { page: 'home', label: 'Home', icon: '🏠' },
          { page: 'approve-requests', label: 'Approve', icon: '✅' },
          { page: 'manage-items', label: 'Items', icon: '📦' },
          { page: 'lent-out-filter', label: 'Lent Out', icon: '🔄' },
        ]
      }
      return [
        { page: 'home', label: 'Home', icon: '🏠' },
        { page: 'new-borrow-request', label: 'Request', icon: '➕' },
        { page: 'my-borrowing-record', label: 'Records', icon: '📋' },
        { page: 'search-available', label: 'Search', icon: '🔍' },
      ]
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
        case 'guideline':
          return GuidelinePage
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
      mobileMenuOpen,
      showUserMenu,
      navItems,
      bottomNavItems,
      handleLogin,
      handleNavigate,
      logout,
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

.top-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 1rem;
  max-width: 80rem;
  margin: 0 auto;
}

.top-bar-left {
  display: flex;
  align-items: center;
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

.logo-icon {
  font-size: 1.5rem;
}

.logo-text {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.icon-btn {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 1.1rem;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  -webkit-tap-highlight-color: transparent;
}

.icon-btn:active {
  transform: scale(0.92);
}

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
  background: linear-gradient(135deg, var(--accent), #0080ff);
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

/* ===== Mobile Drawer ===== */
.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.5);
  animation: fadeIn 0.2s ease-out;
}

.drawer {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: min(85vw, 20rem);
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  animation: slideInRight 0.25s ease-out;
}

@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.drawer-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.drawer-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-primary);
  flex: 1;
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  -webkit-overflow-scrolling: touch;
}

.drawer-footer {
  border-top: 1px solid var(--border-color);
  padding: 0.5rem;
}

.drawer-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-secondary);
  border: none;
  background: none;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.drawer-link:active, .drawer-link-active {
  background: var(--accent-glow);
  color: var(--accent);
}

.drawer-link-danger {
  color: var(--danger);
}

.drawer-link-icon {
  font-size: 1.25rem;
  width: 1.5rem;
  text-align: center;
}

/* ===== Main Content ===== */
.main-content {
  flex: 1;
  max-width: 80rem;
  width: 100%;
  margin: 0 auto;
  padding-bottom: 5rem; /* space for bottom nav */
}

@media (min-width: 640px) {
  .main-content {
    padding-bottom: 1rem;
  }
}

/* ===== Bottom Nav ===== */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 35;
  display: flex;
  background: var(--bg-glass-heavy);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  border-top: 1px solid var(--border-glass);
  padding-bottom: max(0.25rem, env(safe-area-inset-bottom));
}

@media (min-width: 640px) {
  .bottom-nav {
    display: none;
  }
}

.bottom-nav-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  padding: 0.5rem 0.25rem 0.375rem;
  border: none;
  background: none;
  cursor: pointer;
  position: relative;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.15s;
  color: var(--text-muted);
  min-height: 3rem;
}

.bottom-nav-btn:active {
  color: var(--accent);
}

.bottom-nav-active {
  color: var(--accent);
}

.bottom-nav-icon {
  font-size: 1.25rem;
  line-height: 1;
}

.bottom-nav-label {
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.bottom-nav-badge {
  position: absolute;
  top: 0.125rem;
  right: calc(50% - 1.25rem);
  min-width: 1rem;
  height: 1rem;
  padding: 0 0.25rem;
  font-size: 0.625rem;
  font-weight: 700;
  color: #fff;
  background: var(--danger);
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
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
