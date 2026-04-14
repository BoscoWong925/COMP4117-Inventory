<template>
  <div v-if="isAuthLoading" class="shell-loading" :class="darkMode ? '' : 'light-mode'">
    <div class="shell-loading-inner">
      <div class="shell-loading-logo">
        <img v-if="darkMode" :src="logoWhite" alt="Department Logo" class="loading-logo-img" />
        <img v-else :src="logoDark" alt="Department Logo" class="loading-logo-img" />
      </div>
      <div class="spinner" style="width: 1.5rem; height: 1.5rem;"></div>
    </div>
  </div>
  <template v-else>
    <div :class="['app-shell', darkMode ? '' : 'light-mode', compactMode ? 'compact-mode' : '', reduceMotion ? 'reduce-motion' : '']" v-if="isAuthenticated">
    <div class="shell-layout">
      <div v-if="!sidebarCollapsed && isMobile" class="sidebar-mobile-overlay" @click="sidebarCollapsed = true"></div>
      <aside :class="['left-sidebar', sidebarCollapsed ? 'left-sidebar-collapsed' : '']">
        <div class="sidebar-brand" @click="handleNavigate('home')">
          <img v-if="darkMode" :src="logoWhite" alt="Department Logo" class="sidebar-logo" />
          <img v-else :src="logoDark" alt="Department Logo" class="sidebar-logo" />
        </div>

        <nav class="sidebar-nav">
          <div v-for="group in navGroups" :key="group.key" class="sidebar-group">
            <button
              @click="handleGroupClick(group)"
              :class="['sidebar-nav-btn', isGroupActive(group) ? 'sidebar-nav-btn-active' : '']"
              :title="group.label"
            >
              <span class="nav-tab-icon" v-html="group.icon"></span>
              <span v-if="!sidebarCollapsed" class="sidebar-nav-label">{{ group.label }}</span>
              <NotificationBadge v-if="!sidebarCollapsed && getBadgeCountForGroup(group) > 0" :count="getBadgeCountForGroup(group)" />
            </button>

            <div v-if="!sidebarCollapsed && group.children?.length > 1 && expandedGroup === group.key" class="sidebar-subnav">
              <button
                v-for="item in group.children"
                :key="item.key || (item.page + '-' + (item.params?.tab || 'default'))"
                @click="handleNavigate(item.page, item.params || {})"
                :class="['sidebar-subnav-btn', isSubnavItemActive(item) ? 'sidebar-subnav-active' : '']"
              >
                <span class="nav-tab-icon" v-html="item.icon"></span>
                <span class="sidebar-subnav-label">{{ item.label }}</span>
                <NotificationBadge v-if="getBadgeCountForItem(item) > 0" :count="getBadgeCountForItem(item)" />
              </button>
            </div>
          </div>
        </nav>

        <div class="sidebar-footer">
          <button class="sidebar-footer-btn" @click="handleOpenSettings" :title="sidebarCollapsed ? 'Settings' : ''">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .69.4 1.31 1.02 1.58.26.12.55.19.85.19H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span v-if="!sidebarCollapsed">Settings</span>
          </button>
          <button class="sidebar-footer-btn sidebar-footer-btn-danger" @click="handleLogout" :title="sidebarCollapsed ? 'Logout' : ''">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span v-if="!sidebarCollapsed">Logout</span>
          </button>
        </div>
      </aside>

      <section class="shell-main-pane">
        <header class="content-topbar">
          <div class="content-topbar-left">
            <button class="hamburger-btn" @click="toggleSidebar" :aria-label="sidebarCollapsed ? 'Open menu' : 'Close menu'">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div>
              <h1 class="content-title">Inventory System</h1>
              <p class="content-subtitle">{{ headerDateTimeLabel }}</p>
            </div>
          </div>
          <div class="top-bar-actions">
            <button @click="toggleTheme" class="icon-btn" :title="darkMode ? 'Light mode' : 'Dark mode'">
              <svg v-if="darkMode" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            </button>
            <!-- Notification Bell -->
            <div class="notification-bell-wrapper">
              <button @click="toggleNotificationPanel" class="icon-btn" title="Notifications">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <span v-if="notifUnreadCount > 0" class="notif-badge">{{ notifUnreadCount > 99 ? '99+' : notifUnreadCount }}</span>
              </button>
            </div>
            <div class="user-chip" @click="showUserMenu = !showUserMenu">
              <div class="avatar">{{ user?.name?.charAt(0)?.toUpperCase() || '?' }}</div>
              <span class="user-name hidden sm:inline">{{ user?.name }}</span>
              <svg class="user-chip-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
        </header>

    <!-- User dropdown -->
    <div v-if="showUserMenu" class="user-dropdown" @click.self="showUserMenu = false">
      <div class="dropdown-card animate-scale-in">
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

    <!-- Notification Panel -->
    <div v-if="showNotifPanel" class="notif-overlay" @click.self="showNotifPanel = false">
      <div class="notif-panel animate-scale-in">
        <div class="notif-panel-header">
          <h3 class="notif-panel-title">Notifications</h3>
          <button v-if="notifUnreadCount > 0" @click="handleMarkAllRead" class="notif-mark-all-btn">Mark all read</button>
        </div>
        <div class="notif-panel-body">
          <div v-if="notifLoading" class="notif-empty">Loading...</div>
          <div v-else-if="notifications.length === 0" class="notif-empty">No notifications yet</div>
          <div v-else class="notif-list">
            <button
              v-for="notif in notifications"
              :key="notif._id"
              @click="handleNotifClick(notif)"
              :class="['notif-item', !notif.isRead ? 'notif-item-unread' : '']"
            >
              <div class="notif-item-icon" :class="getNotifIconClass(notif.type)">
                <svg v-if="notif.type === 'request_approved'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <svg v-else-if="notif.type === 'request_rejected' || notif.type === 'checkout_denied'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                <svg v-else-if="notif.type === 'checkout'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
                <svg v-else-if="notif.type === 'item_returned'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
              <div class="notif-item-content">
                <p class="notif-item-subject">{{ notif.subject }}</p>
                <p class="notif-item-sender">From: {{ notif.senderName }}</p>
                <p class="notif-item-time">{{ formatNotifTime(notif.createdAt) }}</p>
              </div>
              <span v-if="!notif.isRead" class="notif-unread-dot"></span>
            </button>
          </div>
          <button v-if="notifications.length < notifTotal" @click="loadMoreNotifications" class="notif-load-more">Load more</button>
        </div>
      </div>
    </div>

    <!-- Notification Detail Modal -->
    <div v-if="selectedNotif" class="notif-overlay" @click.self="selectedNotif = null">
      <div class="notif-detail-card animate-scale-in">
        <div class="notif-detail-header">
          <h3 class="notif-detail-title">{{ selectedNotif.subject }}</h3>
          <button @click="selectedNotif = null" class="notif-close-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="notif-detail-meta">
          <span>From: {{ selectedNotif.senderName }}</span>
          <span>{{ formatNotifTime(selectedNotif.createdAt) }}</span>
        </div>
        <pre class="notif-detail-body">{{ selectedNotif.message }}</pre>
      </div>
    </div>

        <!-- ===== Main Content ===== -->
        <main class="main-content">
          <component :is="currentComponent" @navigate="handleNavigate" :pageParams="pageParams" />
        </main>
      </section>
    </div>
  </div>

  <LoginPage v-else :onLogin="handleLogin" :darkMode="darkMode" @toggle-theme="darkMode = !darkMode" />
  </template>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAuth } from './hooks/useAuth'
import logoDark from '@/Assetes/logo_650.svg'
import logoWhite from '@/Assetes/logo_white_650.svg'
import { borrowingService } from './utils/services'
import { notificationService } from './utils/services'
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
    const pendingApprovalCount = ref(0)
    const pendingCheckoutCount = ref(0)
    const darkMode = ref(true)
    const showSettings = ref(false)
    const themePreference = ref((() => { const saved = localStorage.getItem('inventory_theme'); return (saved === 'dark' || saved === 'light') ? saved : 'dark' })())
    const compactMode = ref(localStorage.getItem('inventory_compact') === 'true')
    const reduceMotion = ref(localStorage.getItem('inventory_reduce_motion') === 'true')
    const showUserMenu = ref(false)
    const headerNow = ref(new Date())
    let pollTimer = null
    let headerClockTimer = null
    const activeGroup = ref('dashboard')
    const expandedGroup = ref(null)
    const isMobile = ref(window.innerWidth <= 768)
    const sidebarCollapsed = ref(isMobile.value ? true : (localStorage.getItem('inventory_sidebar_collapsed') === 'true'))

    // Notification state
    const showNotifPanel = ref(false)
    const notifications = ref([])
    const notifUnreadCount = ref(0)
    const notifTotal = ref(0)
    const notifLoading = ref(false)
    const notifPage = ref(1)
    const selectedNotif = ref(null)
    let notifPollTimer = null

    // Navigation groups with sub-items (two-layer nav)
    const navGroups = computed(() => {
      if (user.value?.role === 'admin') {
        return [
          { key: 'dashboard', label: 'Dashboard', icon: NAV_ICONS.home, page: 'home' },
          { key: 'requests', label: 'Requests', icon: NAV_ICONS.requests, children: [
            { page: 'pending-approval-page', label: 'Pending Approval', icon: NAV_ICONS.requests, params: { tab: 'pending', hideTabs: true } },
            { page: 'pending-checkout-page', label: 'Pending Check-Out', icon: NAV_ICONS.checkedOut, params: { tab: 'checkout', hideTabs: true } },
          ]},
          { key: 'inventory', label: 'Inventory', icon: NAV_ICONS.items, children: [
            { page: 'manage-items', label: 'Items', icon: NAV_ICONS.items },
          ]},
          { key: 'return', label: 'Return', icon: NAV_ICONS.checkedOut, page: 'lent-out-filter' },
          { key: 'history', label: 'History', icon: NAV_ICONS.history, children: [
            { page: 'borrow-history', label: 'Borrow History', icon: NAV_ICONS.history },
          ]},
          { key: 'systems', label: 'Systems', icon: NAV_ICONS.auditLog, children: [
            { page: 'manage-accounts', label: 'Accounts', icon: NAV_ICONS.accounts },
            { page: 'audit-log', label: 'Audit Log', icon: NAV_ICONS.auditLog },
            { page: 'api-status', label: 'API Status', icon: NAV_ICONS.apiStatus },
          ]},
        ]
      } else if (user.value?.role === 'operator') {
        return [
          { key: 'dashboard', label: 'Dashboard', icon: NAV_ICONS.home, page: 'home' },
          { key: 'requests', label: 'Requests', icon: NAV_ICONS.requests, children: [
            { page: 'pending-approval-page', label: 'Pending Approval', icon: NAV_ICONS.requests, params: { tab: 'pending', hideTabs: true } },
            { page: 'pending-checkout-page', label: 'Pending Check-Out', icon: NAV_ICONS.checkedOut, params: { tab: 'checkout', hideTabs: true } },
          ]},
          { key: 'inventory', label: 'Inventory', icon: NAV_ICONS.items, children: [
            { page: 'manage-items', label: 'Items', icon: NAV_ICONS.items },
          ]},
          { key: 'return', label: 'Return', icon: NAV_ICONS.checkedOut, page: 'lent-out-filter' },
          { key: 'history', label: 'History', icon: NAV_ICONS.history, children: [
            { page: 'borrow-history', label: 'Borrow History', icon: NAV_ICONS.history },
          ]},
          { key: 'systems', label: 'Systems', icon: NAV_ICONS.auditLog, children: [
            { page: 'audit-log', label: 'Audit Log', icon: NAV_ICONS.auditLog },
            { page: 'api-status', label: 'API Status', icon: NAV_ICONS.apiStatus },
          ]},
        ]
      } else if (user.value?.role === 'user' && user.value?.subRole === 'teacher') {
        return [
          { key: 'dashboard', label: 'Dashboard', icon: NAV_ICONS.home, page: 'home' },
          { key: 'borrow', label: 'Borrow', icon: NAV_ICONS.newRequest, children: [
            { page: 'new-borrow-request', label: 'Request Borrow', icon: NAV_ICONS.newRequest },
            { page: 'search-available', label: 'Search Available', icon: NAV_ICONS.items },
          ]},
          { key: 'requests', label: 'Requests', icon: NAV_ICONS.requests, children: [
            { page: 'pending-approval-page', label: 'Pending Approval', icon: NAV_ICONS.requests, params: { tab: 'pending', hideTabs: true } },
            { page: 'pending-checkout-page', label: 'Pending Check-Out', icon: NAV_ICONS.checkedOut, params: { tab: 'checkout', hideTabs: true } },
          ]},
          { key: 'inventory', label: 'Inventory', icon: NAV_ICONS.items, children: [
            { page: 'manage-items', label: 'My Items', icon: NAV_ICONS.items },
          ]},
          { key: 'return', label: 'Return', icon: NAV_ICONS.checkedOut, page: 'lent-out-filter' },
          { key: 'history', label: 'History', icon: NAV_ICONS.history, children: [
            { page: 'my-borrowing-record', label: 'My Borrow Records', icon: NAV_ICONS.myRecords },
            { page: 'borrow-history', label: 'Owned Items History', icon: NAV_ICONS.history },
          ]},
          { key: 'systems', label: 'Systems', icon: NAV_ICONS.auditLog, children: [
            { page: 'audit-log', label: 'Audit Log', icon: NAV_ICONS.auditLog },
            { page: 'api-status', label: 'API Status', icon: NAV_ICONS.apiStatus },
          ]},
        ]
      } else if (user.value?.role === 'user') {
        return [
          { key: 'dashboard', label: 'Dashboard', icon: NAV_ICONS.home, page: 'home' },
          { key: 'requests', label: 'Requests', icon: NAV_ICONS.newRequest, children: [
            { page: 'new-borrow-request', label: 'Request Borrow', icon: NAV_ICONS.newRequest },
            { page: 'search-available', label: 'Search Available', icon: NAV_ICONS.items },
          ]},
          { key: 'inventory', label: 'Inventory', icon: NAV_ICONS.items, children: [
            { page: 'my-items', label: 'My Items', icon: NAV_ICONS.myItems },
          ]},
          { key: 'history', label: 'History', icon: NAV_ICONS.history, children: [
            { page: 'my-borrowing-record', label: 'Borrow Records', icon: NAV_ICONS.myRecords },
          ]},
        ]
      }
      return [{ key: 'dashboard', label: 'Dashboard', icon: NAV_ICONS.home, page: 'home' }]
    })

    const routeParamsMatch = (expected = {}, actual = {}) => {
      const keys = Object.keys(expected)
      if (keys.length === 0) return true

      return keys.every((key) => {
        if (key === 'tab' && expected[key] === 'pending' && (actual[key] === undefined || actual[key] === null || actual[key] === '')) {
          return true
        }
        return actual[key] === expected[key]
      })
    }

    const findGroupForPage = (page, params = {}) => {
      for (const group of navGroups.value) {
        if (group.page === page && routeParamsMatch(group.params || {}, params || {})) return group.key
        if (group.children?.some(c => c.page === page && routeParamsMatch(c.params || {}, params || {}))) return group.key
      }

      for (const group of navGroups.value) {
        if (group.page === page) return group.key
        if (group.children?.some(c => c.page === page)) return group.key
      }
      return 'dashboard'
    }

    const handleGroupClick = (group) => {
      activeGroup.value = group.key
      if (group.page) {
        expandedGroup.value = null
        handleNavigate(group.page, group.params || {})
      } else if (group.children?.length) {
        // Always navigate to first child immediately
        expandedGroup.value = null
        const target = group.children[0]
        handleNavigate(target.page, target.params || {})
      }
    }

    const isSubnavItemActive = (item) => {
      if (currentPage.value !== item.page) return false
      if (!item.params) return true

      return Object.entries(item.params).every(([key, value]) => {
        if (key === 'tab' && value === 'pending' && (pageParams.value[key] === undefined || pageParams.value[key] === null || pageParams.value[key] === '')) {
          return true
        }
        return pageParams.value[key] === value
      })
    }

    const isGroupActive = (group) => {
      if (activeGroup.value === group.key) return true
      if (group.page) {
        return currentPage.value === group.page && routeParamsMatch(group.params || {}, pageParams.value || {})
      }
      return group.children?.some(child => isSubnavItemActive(child)) || false
    }

    const toggleSidebar = () => {
      sidebarCollapsed.value = !sidebarCollapsed.value
    }

    const getBadgeCountForItem = (item) => {
      if (item.params?.tab === 'pending') return pendingApprovalCount.value
      if (item.params?.tab === 'checkout') return pendingCheckoutCount.value
      if (item.page === 'teacher-requests') return pendingCount.value
      return 0
    }

    const getBadgeCountForGroup = (group) => {
      if (!group.children?.length) return 0

      const hasPendingTab = group.children.some((item) => item.params?.tab === 'pending')
      const hasCheckoutTab = group.children.some((item) => item.params?.tab === 'checkout')

      if (hasPendingTab || hasCheckoutTab) {
        return pendingApprovalCount.value + pendingCheckoutCount.value
      }

      if (group.children.some((item) => item.page === 'teacher-requests')) {
        return pendingCount.value
      }

      return 0
    }

    const handleOpenSettings = () => {
      showUserMenu.value = true
      showSettings.value = true
    }

    const refreshPendingCount = async () => {
      try {
        if (user.value?.subRole === 'teacher') {
          const data = await borrowingService.getTeacherPendingRequests({ pageSize: 1 })
          pendingApprovalCount.value = data.pendingCount || 0
          pendingCheckoutCount.value = data.checkoutCount || 0
          pendingCount.value = pendingApprovalCount.value + pendingCheckoutCount.value
        } else if (user.value?.role !== 'user') {
          const data = await borrowingService.getPendingRequests({ pageSize: 1 })
          pendingApprovalCount.value = data.pendingCount || 0
          pendingCheckoutCount.value = data.checkoutCount || 0
          pendingCount.value = pendingApprovalCount.value + pendingCheckoutCount.value
        } else {
          pendingApprovalCount.value = 0
          pendingCheckoutCount.value = 0
          pendingCount.value = 0
        }
      } catch (e) {
        pendingApprovalCount.value = 0
        pendingCheckoutCount.value = 0
        pendingCount.value = 0
      }
    }

    // ── Notification methods ──
    const refreshNotifCount = async () => {
      try {
        notifUnreadCount.value = await notificationService.getUnreadCount()
      } catch { notifUnreadCount.value = 0 }
    }

    const loadNotifications = async () => {
      notifLoading.value = true
      try {
        const data = await notificationService.getNotifications({ page: 1, pageSize: 20 })
        notifications.value = data.notifications
        notifTotal.value = data.total
        notifUnreadCount.value = data.unreadCount
        notifPage.value = 1
      } catch { /* silent */ }
      notifLoading.value = false
    }

    const loadMoreNotifications = async () => {
      const nextPage = notifPage.value + 1
      try {
        const data = await notificationService.getNotifications({ page: nextPage, pageSize: 20 })
        notifications.value = [...notifications.value, ...data.notifications]
        notifTotal.value = data.total
        notifPage.value = nextPage
      } catch { /* silent */ }
    }

    const toggleNotificationPanel = async () => {
      showNotifPanel.value = !showNotifPanel.value
      showUserMenu.value = false
      if (showNotifPanel.value) {
        await loadNotifications()
      }
    }

    const handleNotifClick = async (notif) => {
      if (!notif.isRead) {
        await notificationService.markAsRead(notif._id)
        notif.isRead = true
        notifUnreadCount.value = Math.max(0, notifUnreadCount.value - 1)
      }
      selectedNotif.value = notif
      showNotifPanel.value = false
    }

    const handleMarkAllRead = async () => {
      await notificationService.markAllAsRead()
      notifications.value.forEach(n => n.isRead = true)
      notifUnreadCount.value = 0
    }

    const getNotifIconClass = (type) => {
      if (type === 'request_approved' || type === 'checkout') return 'notif-icon-success'
      if (type === 'request_rejected' || type === 'checkout_denied') return 'notif-icon-danger'
      if (type === 'new_request') return 'notif-icon-info'
      return 'notif-icon-default'
    }

    const formatNotifTime = (dateStr) => {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      const now = new Date()
      const diffMs = now - d
      const diffMin = Math.floor(diffMs / 60000)
      if (diffMin < 1) return 'Just now'
      if (diffMin < 60) return `${diffMin}m ago`
      const diffHr = Math.floor(diffMin / 60)
      if (diffHr < 24) return `${diffHr}h ago`
      const diffDay = Math.floor(diffHr / 24)
      if (diffDay < 7) return `${diffDay}d ago`
      return d.toLocaleDateString('en-HK', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const handleNavigate = (page, params = {}) => {
      currentPage.value = page
      pageParams.value = params || {}
      sessionStorage.setItem('inventory_last_page', page)
      showUserMenu.value = false
      showSettings.value = false
      activeGroup.value = findGroupForPage(page, params || {})
      const currentGroup = navGroups.value.find((group) => group.key === activeGroup.value)
      expandedGroup.value = currentGroup?.children?.length > 1 ? currentGroup.key : null
      if (isMobile.value) sidebarCollapsed.value = true
    }

    const afterLoginSetup = async () => {
      if (user.value?.role !== 'user' || user.value?.subRole === 'teacher') {
        refreshPendingCount()
        if (!pollTimer) pollTimer = setInterval(refreshPendingCount, 5000)
      }
      // Start notification polling for all authenticated users
      refreshNotifCount()
      if (!notifPollTimer) notifPollTimer = setInterval(refreshNotifCount, 15000)
      // Check for overdue borrows for user role
      if (user.value?.role === 'user') {
        // Overdue check removed — no popup warning
      }
    }

    const applyThemePreference = () => {
      darkMode.value = themePreference.value === 'dark'
    }

    const setThemePreference = (pref) => {
      themePreference.value = pref
    }

    const toggleTheme = () => {
      themePreference.value = darkMode.value ? 'light' : 'dark'
    }

    const handleLogin = async (username, password) => {
      const ok = await login(username, password)
      if (ok) {
        await afterLoginSetup()
      }
      return ok
    }

    const handleResize = () => {
      isMobile.value = window.innerWidth <= 768
      if (!isMobile.value && localStorage.getItem('inventory_sidebar_collapsed') === 'true') {
        sidebarCollapsed.value = true
      } else if (!isMobile.value && localStorage.getItem('inventory_sidebar_collapsed') !== 'true') {
        sidebarCollapsed.value = false
      } else if (isMobile.value) {
        sidebarCollapsed.value = true
      }
    }

    onMounted(async () => {
      applyThemePreference()
      window.addEventListener('resize', handleResize)
      headerClockTimer = setInterval(() => {
        headerNow.value = new Date()
      }, 1000)
      await initAuth()
      if (isAuthenticated.value) {
        activeGroup.value = findGroupForPage(currentPage.value, pageParams.value || {})
        const currentGroup = navGroups.value.find((group) => group.key === activeGroup.value)
        expandedGroup.value = currentGroup?.children?.length > 1 ? currentGroup.key : null
        await afterLoginSetup()
      }
    })

    const currentComponent = computed(() => {
      switch (currentPage.value) {
        case 'pending-approval-page':
          return ApproveRequestsPage
        case 'pending-checkout-page':
          return ApproveRequestsPage
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

    const headerDateTimeLabel = computed(() => {
      return headerNow.value.toLocaleString('en-HK', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
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
      showNotifPanel.value = false
      selectedNotif.value = null
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
      if (notifPollTimer) { clearInterval(notifPollTimer); notifPollTimer = null }
      await logout()
      currentPage.value = 'home'
    }

    onUnmounted(() => {
      if (pollTimer) clearInterval(pollTimer)
      if (notifPollTimer) clearInterval(notifPollTimer)
      if (headerClockTimer) clearInterval(headerClockTimer)
      window.removeEventListener('resize', handleResize)
    })

    watch(themePreference, (value) => {
      localStorage.setItem('inventory_theme', value)
      applyThemePreference()
    })

    // Sync theme class to <html> so Teleported content (dropdowns, modals) inherits correct CSS variables
    watch(darkMode, (isDark) => {
      document.documentElement.classList.toggle('light-mode', !isDark)
    }, { immediate: true })

    watch(compactMode, (value) => {
      localStorage.setItem('inventory_compact', value ? 'true' : 'false')
    })

    watch(reduceMotion, (value) => {
      localStorage.setItem('inventory_reduce_motion', value ? 'true' : 'false')
    })

    watch(sidebarCollapsed, (value) => {
      if (!isMobile.value) localStorage.setItem('inventory_sidebar_collapsed', value ? 'true' : 'false')
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
      logoDark,
      logoWhite,
      showSettings,
      themePreference,
      compactMode,
      reduceMotion,
      showUserMenu,
      navGroups,
      activeGroup,
      sidebarCollapsed,
      isMobile,
      expandedGroup,
      getBadgeCountForGroup,
      getBadgeCountForItem,
      headerDateTimeLabel,
      handleGroupClick,
      isSubnavItemActive,
      isGroupActive,
      toggleSidebar,
      handleOpenSettings,
      setThemePreference,
      toggleTheme,
      handleLogin,
      handleNavigate,
      handleLogout,
      formatDate,
      // Notification
      showNotifPanel,
      notifications,
      notifUnreadCount,
      notifTotal,
      notifLoading,
      selectedNotif,
      toggleNotificationPanel,
      handleNotifClick,
      handleMarkAllRead,
      loadMoreNotifications,
      getNotifIconClass,
      formatNotifTime,
    }
  }
}
</script>

<style>
@import './index.css';

/* ===== App Shell ===== */
.app-shell {
  min-height: 100dvh;
  display: block;
  background: var(--background);
  color: var(--foreground);
  transition: background 0.25s ease, color 0.25s ease;
}

.shell-layout {
  min-height: 100dvh;
  display: flex;
}

.left-sidebar {
  width: 16.5rem;
  border-right: 1px solid var(--nav-border);
  background: var(--nav-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
  position: sticky;
  top: 0;
  height: 100dvh;
  z-index: 35;
}

.left-sidebar-collapsed {
  width: 4.75rem;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 0.75rem;
  border-bottom: 1px solid var(--nav-border);
  cursor: pointer;
}

.sidebar-logo {
  width: auto;
  height: 1.6rem;
}

.sidebar-brand-text {
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 0.625rem 0.5rem;
}

.sidebar-group {
  margin-bottom: 0.375rem;
}

.sidebar-nav-btn,
.sidebar-subnav-btn,
.sidebar-footer-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid transparent;
  background: transparent;
  color: var(--muted-foreground);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.12s;
}

.sidebar-nav-btn {
  padding: 0.5rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 600;
}

.sidebar-nav-btn:hover,
.sidebar-subnav-btn:hover,
.sidebar-footer-btn:hover {
  background: var(--surface-2);
  color: var(--text-primary);
}

.sidebar-nav-btn-active {
  background: var(--accent-surface);
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
}

.sidebar-nav-label {
  flex: 1;
  text-align: left;
}

.sidebar-subnav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0.25rem 0 0.25rem 1.5rem;
}

.sidebar-subnav-btn {
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
}

.sidebar-subnav-active {
  color: var(--text-primary);
  background: var(--surface-2);
}

.sidebar-subnav-label {
  flex: 1;
  text-align: left;
}

.sidebar-footer {
  border-top: 1px solid var(--nav-border);
  padding: 0.625rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.sidebar-footer-btn {
  padding: 0.5rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 600;
}

.sidebar-footer-btn-danger {
  color: var(--danger);
}

.shell-main-pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.content-topbar {
  height: 3.25rem;
  border-bottom: 1px solid var(--nav-border);
  background: var(--nav-bg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  position: sticky;
  top: 0;
  z-index: 30;
}

.content-topbar-left {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
}

.content-title {
  font-size: 0.95rem;
  line-height: 1.2;
  font-weight: 700;
  color: var(--text-primary);
}

.content-subtitle {
  font-size: 0.7rem;
  color: var(--muted-foreground);
}

/* ===== Loading State ===== */
.shell-loading {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--background);
}
.shell-loading-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}
.shell-loading-logo {
  color: var(--accent);
  opacity: 0.7;
}
.loading-logo-img {
  height: 2rem;
  width: auto;
}

/* ===== Top Bar — Operations Console Header ===== */
.top-bar {
  position: sticky;
  top: 0;
  z-index: 40;
  background: var(--nav-bg);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  border-bottom: 1px solid var(--nav-border);
  box-shadow: var(--shadow-xs);
}

.top-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.25rem;
  max-width: 90rem;
  margin: 0 auto;
  width: 100%;
  height: 3.25rem;
}

.top-bar-brand {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
}

/* Logo */
.logo-btn {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.25rem 0.25rem 0;
  -webkit-tap-highlight-color: transparent;
  flex-shrink: 0;
}

.logo-img {
  height: 1.5rem;
  width: auto;
  max-width: 20rem;
  object-fit: contain;
  flex-shrink: 1;
  min-width: 0;
  overflow: hidden;
}

/* Divider between logo and nav */
.nav-divider {
  width: 1px;
  height: 1.25rem;
  background: var(--border-strong);
  flex-shrink: 0;
  opacity: 0.6;
}

/* ===== Primary Navigation (inline with brand) ===== */
.nav-primary {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.nav-primary::-webkit-scrollbar { display: none; }

.nav-primary-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--muted-foreground);
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s, background 0.15s;
  -webkit-tap-highlight-color: transparent;
  letter-spacing: -0.01em;
}

.nav-primary-tab:hover {
  color: var(--text-primary);
  background: var(--surface-2);
}

.nav-primary-active {
  color: var(--text-primary);
  background: var(--surface-2);
  font-weight: 600;
  box-shadow: inset 0 0 0 1px var(--border-strong);
}

/* ===== Top Bar Actions ===== */
.top-bar-actions {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
}

.icon-btn {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
  -webkit-tap-highlight-color: transparent;
}

.icon-btn:hover {
  background: var(--accent-surface);
  color: var(--accent);
  border-color: transparent;
}

.icon-btn:active {
  transform: scale(0.93);
}

.icon-btn svg { display: block; }

/* ===== Sub Navigation Row ===== */
.nav-sub-row {
  border-top: 1px solid var(--nav-border);
  background: var(--surface-1);
}

.nav-sub-inner {
  display: flex;
  gap: 0.25rem;
  padding: 0 1.25rem;
  max-width: 90rem;
  margin: 0 auto;
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.nav-sub-inner::-webkit-scrollbar { display: none; }

.nav-sub-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.4375rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--muted-foreground);
  border: none;
  background: transparent;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.12s, border-color 0.12s;
  -webkit-tap-highlight-color: transparent;
}

.nav-sub-tab:hover {
  color: var(--text-primary);
}

.nav-sub-active {
  color: var(--accent);
  font-weight: 600;
  border-bottom-color: var(--accent);
}

/* Shared nav icon styles */
.nav-tab-icon {
  display: flex;
  align-items: center;
}
.nav-tab-icon svg { width: 15px; height: 15px; }
.nav-tab-label { line-height: 1; }

/* ===== User Chip ===== */
.user-chip {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.1875rem;
  padding-right: 0.5rem;
  border-radius: 9999px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.12s, background 0.12s;
}

.user-chip:hover {
  border-color: var(--accent);
  background: var(--accent-surface);
}

.user-chip-caret {
  color: var(--muted-foreground);
  margin-left: -0.125rem;
}

.avatar {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), rgba(99, 102, 241, 0.5));
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-lg {
  width: 2.5rem;
  height: 2.5rem;
  font-size: 1rem;
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
  padding: 3.5rem 1.25rem 0;
}

.dropdown-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  width: 15rem;
  height: fit-content;
  overflow: hidden;
  animation: scaleIn 0.12s ease-out;
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem 1rem;
}

.dropdown-name {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-primary);
}

.dropdown-role {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.dropdown-divider {
  height: 1px;
  background: var(--border);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem 1rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--text-secondary);
  transition: background 0.12s;
  -webkit-tap-highlight-color: transparent;
}

.dropdown-item:hover, .dropdown-item:active {
  background: var(--accent-surface);
}

.dropdown-item-danger {
  color: var(--danger);
}
.dropdown-item-danger:hover {
  background: var(--danger-light);
}

.dropdown-item svg { flex-shrink: 0; }

.dropdown-item-text {
  flex: 1;
  text-align: left;
}

.settings-caret {
  transition: transform 0.12s ease;
}

.settings-caret-open {
  transform: rotate(180deg);
}

.settings-panel {
  padding: 0.625rem 1rem 0.875rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface-3);
}

.settings-label {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted-foreground);
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.settings-options {
  display: flex;
  gap: 0.375rem;
  margin-bottom: 0.625rem;
}

.settings-pill {
  flex: 1;
  padding: 0.3rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--muted-foreground);
  cursor: pointer;
  transition: all 0.12s;
}

.settings-pill:hover {
  background: var(--accent-surface);
  color: var(--text-primary);
  border-color: transparent;
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
  width: 1rem;
  height: 1rem;
  accent-color: var(--accent);
}

/* ===== Main Content ===== */
.main-content {
  flex: 1;
  width: 100%;
  padding: 0 0 1.5rem;
}

/* ===== Compact Mode ===== */
.compact-mode .content-topbar { height: 2.75rem; }
.compact-mode .sidebar-nav-btn { padding: 0.35rem 0.5rem; }
.compact-mode .sidebar-subnav-btn { padding: 0.3rem 0.45rem; }
.compact-mode .main-content { padding-bottom: 0.5rem; }

/* ===== Hamburger button (mobile only) ===== */
.hamburger-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s;
  -webkit-tap-highlight-color: transparent;
}
.hamburger-btn:hover {
  background: var(--surface-2);
  color: var(--text-primary);
}

/* ===== Sidebar mobile backdrop ===== */
.sidebar-mobile-overlay {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 44;
  background: rgba(0, 0, 0, 0.45);
}

@media (max-width: 768px) {
  .sidebar-mobile-overlay {
    display: block;
  }

  .left-sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 45;
    box-shadow: var(--shadow-xl);
    transition: transform 0.25s ease, width 0.2s ease;
  }

  .left-sidebar-collapsed {
    transform: translateX(-100%);
    width: 16.5rem;
  }

  .shell-main-pane {
    width: 100%;
  }

  .content-subtitle {
    display: none;
  }

  .notif-panel {
    width: calc(100vw - 2.5rem);
    max-width: 22rem;
  }

  .notif-overlay {
    padding: 3.5rem 0.75rem 0;
  }

  .user-dropdown {
    padding: 3.5rem 0.75rem 0;
  }
}

/* ===== Reduce motion ===== */
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
  animation: scaleIn 0.12s ease-out;
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.96) translateY(-4px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

/* ===== Notification Bell ===== */
.notification-bell-wrapper {
  position: relative;
}

.notif-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.25rem;
  border-radius: 9999px;
  background: var(--danger, #ef4444);
  color: #fff;
  font-size: 0.625rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  pointer-events: none;
}

/* ===== Notification Overlay ===== */
.notif-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  justify-content: flex-end;
  padding: 3.5rem 1.25rem 0;
}

/* ===== Notification Panel ===== */
.notif-panel {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  width: 22rem;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  height: fit-content;
  overflow: hidden;
}

.notif-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--border);
}

.notif-panel-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-primary);
}

.notif-mark-all-btn {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--accent);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-md);
  transition: background 0.12s;
}

.notif-mark-all-btn:hover {
  background: var(--accent-surface);
}

.notif-panel-body {
  overflow-y: auto;
  max-height: calc(70vh - 3.5rem);
}

.notif-empty {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--muted-foreground);
  font-size: 0.8125rem;
}

.notif-list {
  display: flex;
  flex-direction: column;
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  width: 100%;
  border-bottom: 1px solid var(--border);
  transition: background 0.12s;
}

.notif-item:hover {
  background: var(--surface-2);
}

.notif-item:last-child {
  border-bottom: none;
}

.notif-item-unread {
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}

.notif-item-unread:hover {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}

.notif-item-icon {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.notif-icon-success {
  background: color-mix(in srgb, #22c55e 15%, transparent);
  color: #22c55e;
}

.notif-icon-danger {
  background: color-mix(in srgb, #ef4444 15%, transparent);
  color: #ef4444;
}

.notif-icon-info {
  background: color-mix(in srgb, #3b82f6 15%, transparent);
  color: #3b82f6;
}

.notif-icon-default {
  background: var(--surface-2);
  color: var(--muted-foreground);
}

.notif-item-content {
  flex: 1;
  min-width: 0;
}

.notif-item-subject {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

.notif-item-sender {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  margin: 0.125rem 0 0;
}

.notif-item-time {
  font-size: 0.625rem;
  color: var(--muted-foreground);
  margin: 0.125rem 0 0;
}

.notif-unread-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
  margin-top: 0.375rem;
}

.notif-load-more {
  display: block;
  width: 100%;
  padding: 0.625rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
  background: none;
  border: none;
  border-top: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.12s;
}

.notif-load-more:hover {
  background: var(--accent-surface);
}

/* ===== Notification Detail Modal ===== */
.notif-detail-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  width: 28rem;
  max-width: 90vw;
  max-height: 70vh;
  margin: auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.notif-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}

.notif-detail-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-primary);
  flex: 1;
  margin: 0;
}

.notif-close-btn {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: background 0.12s;
  flex-shrink: 0;
}

.notif-close-btn:hover {
  background: var(--surface-2);
}

.notif-detail-meta {
  display: flex;
  justify-content: space-between;
  padding: 0.625rem 1.25rem;
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  border-bottom: 1px solid var(--border);
}

.notif-detail-body {
  padding: 1rem 1.25rem;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
  overflow-y: auto;
  margin: 0;
}
</style>
