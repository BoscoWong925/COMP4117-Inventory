<template>
  <div class="p-8">
    <div class="max-w-4xl mx-auto">
      <h2 class="text-3xl font-bold mb-6">Welcome to the Inventory System</h2>

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
            <li>✓ Excel export for all views</li>
            <li>✓ Complete audit trail logging</li>
            <li>✓ Hierarchical borrowing (mothers + components)</li>
            <li>✓ Warranty and purchase tracking</li>
            <li>✓ Role-based access control</li>
          </ul>
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
import { useAuth } from '../hooks/useAuth'
import DashboardCard from '../components/DashboardCard.vue'

export default {
  components: {
    DashboardCard,
  },
  setup() {
    const { user } = useAuth()

    return {
      user,
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
