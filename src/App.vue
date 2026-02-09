<template>
  <div class="container-main" v-if="isAuthenticated">
    <header class="header sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <div class="flex justify-between items-center mb-4">
          <h1 class="text-2xl font-bold text-gray-800">
            Inventory System <span class="text-sm text-gray-500">COMP Dept</span>
          </h1>
          <div class="text-right">
            <p class="text-sm text-gray-600">Welcome, <strong>{{ user?.name }}</strong></p>
            <p class="text-xs text-gray-500 capitalize">Role: {{ user?.role }}</p>
          </div>
        </div>

        <nav class="flex flex-wrap gap-2 border-t border-gray-200 pt-3">
          <button @click="currentPage = 'home'" class="nav-link">
            Dashboard
          </button>

          <template v-if="user?.role === 'admin' || user?.role === 'operator'">
            <button @click="currentPage = 'approve-requests'" class="nav-link">
              Approve Requests
            </button>
            <button @click="currentPage = 'borrow-history'" class="nav-link">
              Borrow History
            </button>
            <button @click="currentPage = 'manage-items'" class="nav-link">
              Manage Items
            </button>
            <button @click="currentPage = 'lent-out-filter'" class="nav-link">
              Lent-Out Items
            </button>
            <button @click="currentPage = 'audit-log'" class="nav-link">
              Audit Log
            </button>
          </template>

          <button v-if="user?.role === 'operator'" @click="currentPage = 'hand-over-tool'" class="nav-link">
            Hand-Over Tool
          </button>

          <template v-if="user?.role === 'user'">
            <button @click="currentPage = 'new-borrow-request'" class="nav-link">
              New Request
            </button>
            <button @click="currentPage = 'my-borrowing-record'" class="nav-link">
              My Records
            </button>
            <button @click="currentPage = 'search-available'" class="nav-link">
              Search Items
            </button>
          </template>

          <button
            @click="logout"
            class="nav-link ml-auto text-red-600 hover:text-red-800 hover:bg-red-50"
          >
            Logout
          </button>
        </nav>
      </div>
    </header>

    <main class="flex-1 max-w-7xl mx-auto w-full">
      <component :is="currentComponent" />
    </main>

    <footer class="border-t border-gray-200 bg-white py-4 mt-8">
      <div class="max-w-7xl mx-auto px-4 text-center text-gray-600 text-sm">
        <p>University COMP Department Inventory System © 2025</p>
      </div>
    </footer>
  </div>

  <LoginPage v-else @login="handleLogin" />
</template>

<script>
import { ref, computed } from 'vue'
import { useAuth } from './hooks/useAuth'
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
  },
  setup() {
    const { user, isAuthenticated, login, logout } = useAuth()
    const currentPage = ref('home')

    const handleLogin = (username, password) => {
      return login(username, password)
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
        default:
          return HomePage
      }
    })

    return {
      user,
      isAuthenticated,
      currentPage,
      currentComponent,
      handleLogin,
      logout,
    }
  }
}
</script>

<style>
@import './index.css';
</style>
