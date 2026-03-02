<template>
  <div class="p-6">
    <h2 class="text-3xl font-bold mb-6">User Guidelines & Role Information</h2>

    <!-- Role Information Section -->
    <div class="mb-8">
      <h3 class="text-2xl font-bold mb-4">Your Role: <span class="text-blue-600 capitalize">{{ user?.role }}</span></h3>
      
      <!-- Admin Role -->
      <div v-if="user?.role === 'admin'" class="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-lg mb-6">
        <h4 class="text-xl font-bold text-blue-800 mb-3">👨‍💼 Administrator</h4>
        <p class="text-gray-700 mb-4">As an administrator, you have full access to all inventory management functions.</p>
        
        <div class="bg-white p-4 rounded border border-blue-200">
          <p class="font-semibold text-gray-800 mb-2">Your Permissions:</p>
          <ul class="space-y-2 text-gray-700">
            <li class="flex items-start"><span class="text-blue-600 mr-2">✓</span> Manage all inventory items (Add, Edit, Delete)</li>
            <li class="flex items-start"><span class="text-blue-600 mr-2">✓</span> Approve or reject borrowing requests</li>
            <li class="flex items-start"><span class="text-blue-600 mr-2">✓</span> View complete borrow history</li>
            <li class="flex items-start"><span class="text-blue-600 mr-2">✓</span> Track lent-out items</li>
            <li class="flex items-start"><span class="text-blue-600 mr-2">✓</span> View audit logs of all system activities</li>
            <li class="flex items-start"><span class="text-blue-600 mr-2">✓</span> Use Hand-Over Tool for status updates</li>
            <li class="flex items-start"><span class="text-blue-600 mr-2">✓</span> Export data to Excel</li>
          </ul>
        </div>
      </div>

      <!-- Operator Role -->
      <div v-if="user?.role === 'operator'" class="bg-green-50 border-l-4 border-green-600 p-6 rounded-lg mb-6">
        <h4 class="text-xl font-bold text-green-800 mb-3">👨‍🔧 Operator</h4>
        <p class="text-gray-700 mb-4">As an operator, you manage day-to-day inventory operations and request approvals.</p>
        
        <div class="bg-white p-4 rounded border border-green-200">
          <p class="font-semibold text-gray-800 mb-2">Your Permissions:</p>
          <ul class="space-y-2 text-gray-700">
            <li class="flex items-start"><span class="text-green-600 mr-2">✓</span> Manage inventory items (Add, Edit, Delete)</li>
            <li class="flex items-start"><span class="text-green-600 mr-2">✓</span> Approve or reject borrowing requests</li>
            <li class="flex items-start"><span class="text-green-600 mr-2">✓</span> View complete borrow history</li>
            <li class="flex items-start"><span class="text-green-600 mr-2">✓</span> Track lent-out items</li>
            <li class="flex items-start"><span class="text-green-600 mr-2">✓</span> View audit logs</li>
            <li class="flex items-start"><span class="text-green-600 mr-2">✓</span> Use Hand-Over Tool for item status updates</li>
            <li class="flex items-start"><span class="text-green-600 mr-2">✓</span> Export data to Excel</li>
          </ul>
        </div>
      </div>

      <!-- User Role -->
      <div v-if="user?.role === 'user'" class="bg-yellow-50 border-l-4 border-yellow-600 p-6 rounded-lg mb-6">
        <h4 class="text-xl font-bold text-yellow-800 mb-3">👤 Regular User</h4>
        <p class="text-gray-700 mb-4">As a regular user, you can browse and request items for borrowing.</p>
        
        <div class="bg-white p-4 rounded border border-yellow-200">
          <p class="font-semibold text-gray-800 mb-2">Your Permissions:</p>
          <ul class="space-y-2 text-gray-700">
            <li class="flex items-start"><span class="text-yellow-600 mr-2">✓</span> Search and browse available items</li>
            <li class="flex items-start"><span class="text-yellow-600 mr-2">✓</span> Submit borrowing requests</li>
            <li class="flex items-start"><span class="text-yellow-600 mr-2">✓</span> View your borrowing history</li>
            <li class="flex items-start"><span class="text-yellow-600 mr-2">✓</span> Track your active borrows</li>
            <li class="flex items-start"><span class="text-yellow-600 mr-2">✓</span> Return items you borrowed</li>
            <li class="flex items-start"><span class="text-yellow-600 mr-2">✗</span> Cannot manage items or approve requests</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Page Descriptions Section -->
    <div class="mb-8">
      <h3 class="text-2xl font-bold mb-4">📋 Page Descriptions</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Dashboard -->
        <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
          <h4 class="text-lg font-bold text-gray-800 mb-2">📊 Dashboard</h4>
          <p class="text-gray-600 text-sm mb-2">Your main hub showing inventory statistics and quick features overview.</p>
          <p class="text-xs text-gray-500"><strong>Shows:</strong> Total items, available items, lent-out items, pending requests</p>
        </div>

        <!-- Search Available Items -->
        <div v-if="user?.role === 'user'" class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
          <h4 class="text-lg font-bold text-gray-800 mb-2">🔍 Search Items</h4>
          <p class="text-gray-600 text-sm mb-2">Browse and search for items available for borrowing.</p>
          <p class="text-xs text-gray-500"><strong>Features:</strong> Filter by category, location, view item details</p>
        </div>

        <!-- New Borrow Request -->
        <div v-if="user?.role === 'user'" class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
          <h4 class="text-lg font-bold text-gray-800 mb-2">📝 New Request</h4>
          <p class="text-gray-600 text-sm mb-2">Submit a new request to borrow an item from the inventory.</p>
          <p class="text-xs text-gray-500"><strong>Features:</strong> Select item, specify reason, submit for approval</p>
        </div>

        <!-- My Borrowing Record -->
        <div v-if="user?.role === 'user'" class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
          <h4 class="text-lg font-bold text-gray-800 mb-2">📚 My Records</h4>
          <p class="text-gray-600 text-sm mb-2">View your complete borrowing history and active borrows.</p>
          <p class="text-xs text-gray-500"><strong>Features:</strong> Track active items, view request status, return items</p>
        </div>

        <!-- Manage Items -->
        <div v-if="user?.role === 'admin' || user?.role === 'operator'" class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
          <h4 class="text-lg font-bold text-gray-800 mb-2">🛠️ Manage Items</h4>
          <p class="text-gray-600 text-sm mb-2">Add, edit, delete, and manage all inventory items with OCR invoice support.</p>
          <p class="text-xs text-gray-500"><strong>Features:</strong> CRUD operations, import/export Excel, invoice OCR extraction</p>
        </div>

        <!-- Approve Requests -->
        <div v-if="user?.role === 'admin' || user?.role === 'operator'" class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
          <h4 class="text-lg font-bold text-gray-800 mb-2">✅ Approve Requests</h4>
          <p class="text-gray-600 text-sm mb-2">Review and approve or reject pending borrowing requests from users.</p>
          <p class="text-xs text-gray-500"><strong>Features:</strong> Set return dates, reject with reasons, track approvals</p>
        </div>

        <!-- Borrow History -->
        <div v-if="user?.role === 'admin' || user?.role === 'operator'" class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
          <h4 class="text-lg font-bold text-gray-800 mb-2">📖 Borrow History</h4>
          <p class="text-gray-600 text-sm mb-2">Complete record of all borrowing transactions in the system.</p>
          <p class="text-xs text-gray-500"><strong>Shows:</strong> All past and current borrows, borrowers, return status</p>
        </div>

        <!-- Lent-Out Items -->
        <div v-if="user?.role === 'admin' || user?.role === 'operator'" class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
          <h4 class="text-lg font-bold text-gray-800 mb-2">📤 Lent-Out Items</h4>
          <p class="text-gray-600 text-sm mb-2">Track all items currently lent out to users with expected return dates.</p>
          <p class="text-xs text-gray-500"><strong>Features:</strong> Filter items, view borrower info, track returns</p>
        </div>

        <!-- Hand-Over Tool -->
        <div v-if="user?.role === 'admin' || user?.role === 'operator'" class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
          <h4 class="text-lg font-bold text-gray-800 mb-2">🔄 Hand-Over Tool</h4>
          <p class="text-gray-600 text-sm mb-2">Update item status when they are returned or transferred between locations.</p>
          <p class="text-xs text-gray-500"><strong>Features:</strong> Mark items as returned, update status, confirm transactions</p>
        </div>

        <!-- Audit Log -->
        <div v-if="user?.role === 'admin' || user?.role === 'operator'" class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
          <h4 class="text-lg font-bold text-gray-800 mb-2">📋 Audit Log</h4>
          <p class="text-gray-600 text-sm mb-2">Complete audit trail of all system activities and changes.</p>
          <p class="text-xs text-gray-500"><strong>Shows:</strong> Who did what, when they did it, changes made</p>
        </div>
      </div>
    </div>

    <!-- Quick Tips Section -->
    <div class="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-lg">
      <h3 class="text-xl font-bold text-blue-800 mb-4">💡 Quick Tips</h3>
      <ul class="space-y-3 text-gray-700">
        <li class="flex items-start">
          <span class="text-blue-600 font-bold mr-3">1.</span>
          <span><strong>Excel Export:</strong> Most pages have an "Export to Excel" button to download data for reporting.</span>
        </li>
        <li class="flex items-start">
          <span class="text-blue-600 font-bold mr-3">2.</span>
          <span><strong>Item Search:</strong> Use filters by category and location to find items more easily.</span>
        </li>
        <li class="flex items-start">
          <span class="text-blue-600 font-bold mr-3">3.</span>
          <span><strong>Invoice Upload:</strong> When adding items, invoice upload is required for tracking purposes.</span>
        </li>
        <li class="flex items-start">
          <span class="text-blue-600 font-bold mr-3">4.</span>
          <span><strong>Request Status:</strong> Check "My Records" to track the status of your borrowing requests.</span>
        </li>
        <li class="flex items-start">
          <span class="text-blue-600 font-bold mr-3">5.</span>
          <span><strong>Warranty Tracking:</strong> All items have warranty information tracked for maintenance planning.</span>
        </li>
        <li class="flex items-start">
          <span class="text-blue-600 font-bold mr-3">6.</span>
          <span><strong>Hierarchical Items:</strong> Items can have a "Mother ID" if they are components of a larger system.</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { useAuth } from '../hooks/useAuth'

export default {
  setup() {
    const { user } = useAuth()

    return {
      user
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
