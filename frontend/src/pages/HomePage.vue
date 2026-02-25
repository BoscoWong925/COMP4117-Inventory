<template>
  <div class="p-6">
    <div class="max-w-6xl mx-auto">
      <!-- ==================== ADMIN / OPERATOR VIEW ==================== -->
      <template v-if="user?.role !== 'user'">
        <!-- Stats Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <p class="text-xl font-bold text-gray-500 uppercase mb-1">Total Items</p>
            <p class="text-lg font-bold text-gray-800">{{ stats.totalItems }}</p>
          </div>
          <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <p class="text-xl font-bold text-gray-500 uppercase mb-1">Available</p>
            <p class="text-lg font-bold text-gray-800">{{ stats.availableItems }}</p>
          </div>
          <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <p class="text-xl font-bold text-gray-500 uppercase mb-1">Lent Out</p>
            <p class="text-lg font-bold text-gray-800">{{ stats.lentOutItems }}</p>
          </div>
          <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <p class="text-xl font-bold text-gray-500 uppercase mb-1">Pending Requests</p>
            <p class="text-lg font-bold text-gray-800">{{ stats.pendingRequests }}</p>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 class="text-lg font-bold mb-3">Recent Activity</h3>
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
              <tr v-for="log in recentLogs" :key="log.id" class="bg-white">
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
import { inventoryService, borrowingService, auditService, authService } from '../utils/services'
import { formatDate, formatDateTime, getStatusColor } from '../utils/helpers'

export default {
  emits: ['navigate'],
  setup() {
    const { user } = useAuth()
    const stats = ref({
      totalItems: 0,
      availableItems: 0,
      lentOutItems: 0,
      pendingRequests: 0
    })
    const recentLogs = ref([])
    const myBorrows = ref([])

    const loadDashboardData = () => {
      const allItems = inventoryService.getAllItems()
      const availableItems = inventoryService.getAvailableItems()
      const lentOutItems = inventoryService.getLentOutItems()
      const pendingRequests = borrowingService.getPendingRequests()

      stats.value = {
        totalItems: allItems.length,
        availableItems: availableItems.length,
        lentOutItems: lentOutItems.length,
        pendingRequests: pendingRequests.length
      }

      // Recent logs (last 8) for admin/operator
      const allLogs = auditService.getAllLogs()
      allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      recentLogs.value = allLogs.slice(0, 8)

      // Current user's borrow records (all statuses)
      const currentUser = authService.getCurrentUser()
      if (currentUser) {
        const userRequests = borrowingService.getRequestsForUser(currentUser.id)
        myBorrows.value = userRequests.map(r => ({
          ...r,
          itemName: inventoryService.getItemById(r.itemID)?.name || 'Unknown Item'
        }))
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
