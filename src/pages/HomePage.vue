<template>
  <div class="p-8">
    <div class="max-w-5xl mx-auto">
      <h2 class="text-3xl font-bold mb-6">Welcome to the Inventory System</h2>

      <!-- Statistics Dashboard -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p class="text-xs text-gray-500 uppercase mb-1">Total Items</p>
          <p class="text-3xl font-bold text-gray-800">{{ stats.totalItems }}</p>
        </div>
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 shadow-sm">
          <p class="text-xs text-green-600 uppercase mb-1">Available</p>
          <p class="text-3xl font-bold text-green-700">{{ stats.availableItems }}</p>
        </div>
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm">
          <p class="text-xs text-blue-600 uppercase mb-1">Lent Out</p>
          <p class="text-3xl font-bold text-blue-700">{{ stats.lentOutItems }}</p>
        </div>
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-sm">
          <p class="text-xs text-yellow-600 uppercase mb-1">Pending Requests</p>
          <p class="text-3xl font-bold text-yellow-700">{{ stats.pendingRequests }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 class="text-xl font-bold mb-3">Your Role: <span class="capitalize">{{ user?.role }}</span></h3>
          <p class="text-gray-700 mb-4">
            <template v-if="user?.role === 'admin'">
              You have full access to all inventory functions including item management, request approval, and audit logs.
            </template>
            <template v-else-if="user?.role === 'operator'">
              You can manage items, approve requests, track items, and use the hand-over tool for status updates.
            </template>
            <template v-else-if="user?.role === 'user'">
              You can browse available items, submit borrowing requests, and track your borrowing history.
            </template>
          </p>
        </div>

        <div class="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 class="text-xl font-bold mb-3">Quick Features</h3>
          <ul class="text-gray-700 space-y-2">
            <li>✓ Real-time inventory tracking</li>
            <li>✓ Excel export/import for all views</li>
            <li>✓ Complete audit trail logging</li>
            <li>✓ Hierarchical borrowing (mothers + components)</li>
            <li>✓ Warranty and purchase tracking</li>
            <li>✓ Role-based access control</li>
          </ul>
        </div>
      </div>

      <!-- Recent Activity for Admin/Operator -->
      <div v-if="user?.role !== 'user'" class="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h3 class="text-xl font-bold mb-4">Recent Activity</h3>
        <div v-if="recentLogs.length === 0" class="text-gray-500 text-center py-4">No recent activity</div>
        <div v-else class="space-y-2">
          <div v-for="log in recentLogs" :key="log.id" class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
            <div>
              <span class="text-sm font-medium">{{ log.action }}</span>
              <span class="text-sm text-gray-500 ml-2">{{ log.details }}</span>
            </div>
            <span class="text-xs text-gray-400">{{ formatDateTime(log.timestamp) }}</span>
          </div>
        </div>
      </div>

      <!-- My Current Borrows for User -->
      <div v-if="user?.role === 'user'" class="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h3 class="text-xl font-bold mb-4">My Active Borrows</h3>
        <div v-if="myActiveBorrows.length === 0" class="text-gray-500 text-center py-4">No active borrows</div>
        <div v-else class="space-y-2">
          <div v-for="borrow in myActiveBorrows" :key="borrow.id" class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
            <div>
              <span class="text-sm font-medium">{{ borrow.itemName }}</span>
              <span :class="`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(borrow.status)}`">{{ borrow.status }}</span>
            </div>
            <span class="text-xs text-gray-500">Due: {{ formatDate(borrow.returnDate) || 'N/A' }}</span>
          </div>
        </div>
      </div>

      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
        <h3 class="text-lg font-bold mb-3">Demo Credentials</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p class="font-medium">Admin</p>
            <p class="text-gray-600">admin / admin123</p>
          </div>
          <div>
            <p class="font-medium">Operator</p>
            <p class="text-gray-600">operator / operator123</p>
          </div>
          <div>
            <p class="font-medium">User</p>
            <p class="text-gray-600">user / user123</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <template v-if="user?.role !== 'user'">
          <DashboardCard 
            title="Approve Requests"
            description="Review and approve/reject borrowing requests from users"
            color="bg-purple-50"
          />
          <DashboardCard 
            title="Manage Items"
            description="Add, edit, or delete inventory items with full details"
            color="bg-blue-50"
          />
          <DashboardCard 
            title="Audit Trail"
            description="View all system actions and changes with timestamps"
            color="bg-indigo-50"
          />
        </template>

        <template v-else>
          <DashboardCard 
            title="Search Items"
            description="Find available items in the inventory"
            color="bg-green-50"
          />
          <DashboardCard 
            title="New Request"
            description="Request to borrow an available item"
            color="bg-blue-50"
          />
          <DashboardCard 
            title="My Records"
            description="Track your borrowing history and active loans"
            color="bg-purple-50"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '../hooks/useAuth'
import { inventoryService, borrowingService, auditService, authService } from '../utils/services'
import { formatDate, formatDateTime, getStatusColor } from '../utils/helpers'
import DashboardCard from '../components/DashboardCard.vue'

export default {
  components: {
    DashboardCard,
  },
  setup() {
    const { user } = useAuth()
    const stats = ref({
      totalItems: 0,
      availableItems: 0,
      lentOutItems: 0,
      pendingRequests: 0
    })
    const recentLogs = ref([])
    const myActiveBorrows = ref([])

    const loadDashboardData = async () => {
      // Load stats
      const allItems = await inventoryService.getAllItems()
      const availableItems = await inventoryService.getAvailableItems()
      const lentOutItems = await inventoryService.getLentOutItems()
      const pendingRequests = await borrowingService.getPendingRequests()

      stats.value = {
        totalItems: allItems.length,
        availableItems: availableItems.length,
        lentOutItems: lentOutItems.length,
        pendingRequests: pendingRequests.length
      }

      // Load recent logs (last 5) for admin/operator
      const allLogs = await auditService.getAllLogs()
      allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      recentLogs.value = allLogs.slice(0, 5)

      // Load current user's active borrows
      const currentUser = authService.getCurrentUser()
      if (currentUser) {
        const userRequests = await borrowingService.getRequestsForUser(currentUser.id)
        const activeBorrows = userRequests.filter(r => r.status === 'Approved' || r.status === 'Pending')
        const borrowsWithNames = []
        for (const r of activeBorrows) {
          const item = await inventoryService.getItemById(r.itemID)
          borrowsWithNames.push({ ...r, itemName: item?.name || 'Unknown Item' })
        }
        myActiveBorrows.value = borrowsWithNames
      }
    }

    onMounted(() => {
      loadDashboardData()
    })

    return {
      user,
      stats,
      recentLogs,
      myActiveBorrows,
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
