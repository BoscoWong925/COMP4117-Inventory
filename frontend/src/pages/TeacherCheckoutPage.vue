<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">Checkout / Returns</h2>
      <p class="text-sm text-secondary">Items you've borrowed - return when done</p>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div class="theme-card p-4 text-center">
        <p class="text-2xl font-bold text-accent">{{ borrowedItems.length }}</p>
        <p class="text-xs text-muted">Total Borrowed</p>
      </div>
      <div class="theme-card p-4 text-center">
        <p class="text-2xl font-bold" style="color: #f59e0b;">{{ borrowedItems.filter(i => i.status === 'In-use').length }}</p>
        <p class="text-xs text-muted">In Use</p>
      </div>
      <div class="theme-card p-4 text-center">
        <p class="text-2xl font-bold" style="color: #8b5cf6;">{{ borrowedItems.filter(i => i.status === 'Available').length }}</p>
        <p class="text-xs text-muted">Available for Return</p>
      </div>
      <div class="theme-card p-4 text-center">
        <p class="text-2xl font-bold" style="color: #ef4444;">{{ overdueCount }}</p>
        <p class="text-xs text-muted">Overdue</p>
      </div>
    </div>

    <!-- Search -->
    <div class="mb-4">
      <input
        type="text"
        placeholder="Search by item name or ID..."
        v-model="searchText"
        class="form-input"
      />
    </div>

    <!-- Items Table -->
    <div v-if="loading" class="empty-state">Loading borrowed items...</div>
    <div v-else-if="filteredItems.length === 0" class="empty-state">
      <p>No borrowed items</p>
      <p class="text-sm mt-1">You haven't borrowed any items yet.</p>
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full border-collapse table-striped theme-table">
        <thead>
          <tr>
            <th class="border p-2 text-left">Item ID</th>
            <th class="border p-2 text-left">Item Name</th>
            <th class="border p-2 text-left">Category</th>
            <th class="border p-2 text-left">Status</th>
            <th class="border p-2 text-left">Borrowed Date</th>
            <th class="border p-2 text-left">Return Date</th>
            <th class="border p-2 text-left">Days</th>
            <th class="border p-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in paginatedItems" :key="item.id">
            <td class="border p-2 text-sm font-semibold">{{ item.itemId }}</td>
            <td class="border p-2 text-sm">{{ item.itemName }}</td>
            <td class="border p-2 text-sm">{{ item.category }}</td>
            <td class="border p-2 text-sm">
              <span :class="`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(item.status)}`">
                {{ item.status }}
              </span>
            </td>
            <td class="border p-2 text-sm">{{ formatDate(item.borrowDate || item.requestDate) }}</td>
            <td class="border p-2 text-sm">{{ formatDate(item.returnDate) || 'Not set' }}</td>
            <td class="border p-2 text-sm">
              <span :class="`font-medium ${getDaysColor(item.daysOverdue)}`">
                {{ item.daysOverdue > 0 ? `+${item.daysOverdue}` : '-' }}
              </span>
            </td>
            <td class="border p-2 text-center whitespace-nowrap">
              <button 
                @click="openReturnModal(item)" 
                class="btn btn-outline-success text-sm"
              >
                Return
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <PaginationControl v-model:currentPage="currentPage" :totalItems="filteredItems.length" :pageSize="pageSize" />
    </div>

    <!-- Return Modal -->
    <div v-if="returnTarget" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Return Item</h3>
        <p class="text-sm text-secondary mb-4">
          Returning <strong>{{ returnTarget.itemName }}</strong> ({{ returnTarget.itemId }})
        </p>
        
        <div class="mb-4">
          <label class="modal-label">Condition *</label>
          <select v-model="returnCondition" class="form-input">
            <option value="">Select condition...</option>
            <option value="Good">Good</option>
            <option value="Minor Damage">Minor Damage</option>
            <option value="Major Damage">Major Damage</option>
            <option value="Lost">Lost</option>
          </select>
        </div>

        <div class="mb-4">
          <label class="modal-label">Notes</label>
          <textarea 
            v-model="returnNotes" 
            class="form-input" 
            rows="3" 
            placeholder="Any additional notes about the item's condition..."
          />
        </div>

        <div class="flex gap-2">
          <button @click="handleReturn" class="btn btn-outline-success flex-1">Confirm Return</button>
          <button @click="closeReturnModal" class="btn btn-outline-secondary flex-1">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { borrowingService } from '../utils/services'
import { formatDate } from '../utils/helpers'
import PaginationControl from '../components/PaginationControl.vue'

export default {
  components: { PaginationControl },
  setup() {
    const borrowedItems = ref([])
    const loading = ref(true)
    const searchText = ref('')
    const currentPage = ref(1)
    const pageSize = 10

    const returnTarget = ref(null)
    const returnCondition = ref('')
    const returnNotes = ref('')

    const filteredItems = computed(() => {
      const q = searchText.value.toLowerCase()
      return borrowedItems.value.filter(item =>
        (item.itemName || '').toLowerCase().includes(q) ||
        (item.itemId || '').toLowerCase().includes(q)
      )
    })

    const paginatedItems = computed(() => {
      const start = (currentPage.value - 1) * pageSize
      return filteredItems.value.slice(start, start + pageSize)
    })

    const overdueCount = computed(() => {
      return borrowedItems.value.filter(item => {
        if (!item.returnDate) return false
        const returnDate = new Date(item.returnDate)
        return new Date() > returnDate
      }).length
    })

    const getStatusColor = (status) => {
      const map = {
        'Available': 'px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        'In-use': 'px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        'Pending': 'px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      }
      return map[status] || 'px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }

    const getDaysColor = (days) => {
      if (days <= 0) return 'text-green-500'
      if (days <= 7) return 'text-orange-500'
      return 'text-red-500'
    }

    const loadBorrowedItems = async () => {
      loading.value = true
      try {
        // Get user's borrowing records
        const records = await borrowingService.getRequestsForUser()
        
        // Filter for items currently borrowed (status might be Approved or in-use)
        // Calculate days overdue
        borrowedItems.value = records
          .filter(r => r.status === 'Approved' || r.status === 'In-use')
          .map(r => ({
            ...r,
            daysOverdue: r.returnDate ? Math.floor((new Date() - new Date(r.returnDate)) / (1000 * 60 * 60 * 24)) : 0,
            borrowDate: r.approvalDate,
            category: r.category || 'Unknown'
          }))
      } catch (e) {
        console.error('Failed to load borrowed items:', e)
      }
      loading.value = false
    }

    const openReturnModal = (item) => {
      returnTarget.value = item
      returnCondition.value = ''
      returnNotes.value = ''
    }

    const closeReturnModal = () => {
      returnTarget.value = null
      returnCondition.value = ''
      returnNotes.value = ''
    }

    const handleReturn = async () => {
      if (!returnCondition.value) {
        alert('Please select the item condition')
        return
      }

      try {
        const reqId = returnTarget.value.requestId || returnTarget.value._id || returnTarget.value.id
        
        // Return the item
        await borrowingService.returnItem(reqId, {
          condition: returnCondition.value,
          notes: returnNotes.value
        })

        alert('Item returned successfully!')
        closeReturnModal()
        await loadBorrowedItems()
      } catch (e) {
        console.error('Failed to return item:', e)
        alert('Error: ' + e.message)
      }
    }

    onMounted(() => {
      loadBorrowedItems()
    })

    return {
      borrowedItems,
      loading,
      searchText,
      currentPage,
      pageSize,
      returnTarget,
      returnCondition,
      returnNotes,
      filteredItems,
      paginatedItems,
      overdueCount,
      getStatusColor,
      getDaysColor,
      openReturnModal,
      closeReturnModal,
      handleReturn,
      formatDate
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
