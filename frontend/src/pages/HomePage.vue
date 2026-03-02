<template>
  <div class="p-6">
    <div class="max-w-6xl mx-auto">
      <!-- ==================== ADMIN / OPERATOR VIEW ==================== -->
      <template v-if="user?.role !== 'user'">
        <!-- Stats Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div
            @click="$emit('navigate', 'manage-items')"
            class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md hover:border-gray-400 transition"
          >
            <p class="text-sm font-bold text-gray-500 uppercase mb-1">Total Items</p>
            <p class="text-lg font-bold text-gray-800">{{ stats.totalItems }}</p>
            <p class="text-xs text-gray-500 mt-1">Manage Items &rarr;</p>
          </div>
          <div
            @click="$emit('navigate', 'search-available')"
            class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md hover:border-gray-400 transition"
          >
            <p class="text-sm font-bold text-gray-500 uppercase mb-1">Available</p>
            <p class="text-lg font-bold text-gray-800">{{ stats.availableItems }}</p>
            <p class="text-xs text-gray-500 mt-1">Available Items &rarr;</p>
          </div>
          <div
            @click="$emit('navigate', 'lent-out-filter')"
            class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md hover:border-gray-400 transition"
          >
            <p class="text-sm font-bold text-gray-500 uppercase mb-1">Lent Out</p>
            <p class="text-lg font-bold text-gray-800">{{ stats.lentOutItems }}</p>
            <p class="text-xs text-gray-500 mt-1">Lent-Out Items &rarr;</p>
          </div>
          <div
            @click="$emit('navigate', 'approve-requests')"
            class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md hover:border-gray-400 transition relative"
          >
            <p class="text-sm font-bold text-gray-500 uppercase mb-1">Pending Requests</p>
            <p class="text-lg font-bold text-gray-800">{{ stats.pendingRequests }}</p>
            <p class="text-xs text-gray-500 mt-1">Approve Requests &rarr;</p>
            <span v-if="stats.pendingRequests > 0" class="absolute top-2 right-2 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">{{ stats.pendingRequests }}</span>
          </div>
        </div>

        <!-- Additional Status Cards -->
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div
            @click="$emit('navigate', 'borrow-history', { filter: 'Returned' })"
            class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md hover:border-gray-400 transition"
          >
            <p class="text-sm font-bold text-gray-500 uppercase mb-1">Returned</p>
            <p class="text-lg font-bold text-gray-800">{{ stats.returnedRequests }}</p>
            <p class="text-xs text-gray-500 mt-1">Borrow History &rsaquo; Returned &rarr;</p>
          </div>
          <div
            @click="$emit('navigate', 'borrow-history', { filter: 'Approved' })"
            class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md hover:border-gray-400 transition"
          >
            <p class="text-sm font-bold text-gray-500 uppercase mb-1">Approved Record</p>
            <p class="text-lg font-bold text-gray-800">{{ stats.approvedRequests }}</p>
            <p class="text-xs text-gray-500 mt-1">Borrow History &rsaquo; Approved &rarr;</p>
          </div>
          <div
            @click="$emit('navigate', 'borrow-history', { filter: 'Rejected' })"
            class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md hover:border-gray-400 transition"
          >
            <p class="text-sm font-bold text-gray-500 uppercase mb-1">Rejected</p>
            <p class="text-lg font-bold text-gray-800">{{ stats.rejectedRequests }}</p>
            <p class="text-xs text-gray-500 mt-1">Borrow History &rsaquo; Rejected &rarr;</p>
          </div>
        </div>

        <!-- Lending Calendar -->
        <DashboardCalendar />

        <!-- Recent Activity -->
        <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div class="flex justify-between items-center mb-3">
            <h3 class="text-lg font-bold">Recent Activity</h3>
            <button @click="$emit('navigate', 'audit-log')" class="text-sm text-blue-600 hover:text-blue-800 hover:underline">View Full Audit Log &rarr;</button>
          </div>
          <div v-if="recentLogs.length === 0" class="text-gray-500 text-center py-4">No recent activity</div>
          <table v-else class="w-full border-collapse border border-gray-300 table-striped">
            <thead class="bg-gray-200">
              <tr>
                <th class="border p-2 text-left text-sm">Action</th>
                <th class="border p-2 text-left text-sm">Details</th>
                <th class="border p-2 text-left text-sm">User</th>
                <th class="border p-2 text-left text-sm">Time</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in recentLogs" :key="log.id" class="bg-white cursor-pointer hover:bg-blue-50" @click="$emit('navigate', 'audit-log')">
                <td class="border p-2 text-sm font-medium">{{ log.action }}</td>
                <td class="border p-2 text-sm text-gray-600">{{ log.details }}</td>
                <td class="border p-2 text-sm text-gray-500">{{ log.userID }}</td>
                <td class="border p-2 text-xs text-gray-400 whitespace-nowrap">{{ formatDateTime(log.timestamp) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </template>

      <!-- ==================== USER VIEW ==================== -->
      <template v-else>
        <h2 class="text-2xl font-bold mb-6">Welcome to the Inventory System</h2>

        <!-- My Borrow Records -->
        <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-bold">My Borrow Records</h3>
            <button @click="$emit('navigate', 'my-borrowing-record')"
              class="btn text-sm">
              View All Records &rarr;
            </button>
          </div>
          <div v-if="myBorrows.length === 0" class="text-gray-500 text-center py-4">No borrowing records</div>
          <div v-else class="overflow-x-auto">
            <table class="w-full border-collapse border border-gray-300 table-striped">
              <thead class="bg-gray-200">
                <tr>
                  <th class="border p-2 text-left text-sm">Request ID</th>
                  <th class="border p-2 text-left text-sm">Item</th>
                  <th class="border p-2 text-left text-sm">Status</th>
                  <th class="border p-2 text-left text-sm">Request Date</th>
                  <th class="border p-2 text-left text-sm">Due Date</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="borrow in myBorrows.slice(0, 5)" :key="borrow.id" class="bg-white">
                  <td class="border p-2 text-sm">{{ borrow.id }}</td>
                  <td class="border p-2 text-sm font-medium">{{ borrow.itemName }}</td>
                  <td class="border p-2">
                    <span :class="`px-2 py-0.5 rounded text-xs ${getStatusColor(borrow.status)}`">{{ borrow.status }}</span>
                  </td>
                  <td class="border p-2 text-sm">{{ formatDateTime(borrow.requestDate) }}</td>
                  <td class="border p-2 text-sm">{{ formatDate(borrow.returnDate) || 'N/A' }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="myBorrows.length > 5" class="text-sm text-gray-500 mt-2 text-center">
              Showing 5 of {{ myBorrows.length }} records.
              <button @click="$emit('navigate', 'my-borrowing-record')" class="text-blue-600 hover:underline">View all</button>
            </p>
          </div>
        </div>

        <!-- Navigation for user -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button @click="$emit('navigate', 'new-borrow-request')"
            class="border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg p-4 text-sm font-medium text-blue-800 transition text-center">
            Click here to make a borrow request
          </button>
          <button @click="$emit('navigate', 'search-available')"
            class="border border-green-200 bg-green-50 hover:bg-green-100 rounded-lg p-4 text-sm font-medium text-green-800 transition text-center">
            Click here to search available items
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
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

    const loadDashboardData = async () => {
      try {
        // Load stats from the dedicated stats endpoint
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
        // Recent logs (last 8) for admin/operator
        const allLogs = await auditService.getAllLogs({ pageSize: 8 })
        recentLogs.value = allLogs
      } catch (e) {
        console.error('Failed to load logs:', e)
      }

      try {
        // Current user's borrow records
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
      formatDate,
      formatDateTime,
      getStatusColor,
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
