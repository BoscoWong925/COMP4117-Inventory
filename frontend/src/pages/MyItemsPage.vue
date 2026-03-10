<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">My Items</h2>
      <p class="text-sm text-secondary">{{ isTeacher ? 'Items you own and borrow' : 'Items you are currently borrowing' }}</p>
    </div>

    <!-- Search -->
    <div class="mb-4">
      <input
        type="text"
        placeholder="Search by name, ID, or description..."
        v-model="searchText"
        class="form-input"
      />
    </div>

    <!-- Tabs for teacher -->
    <div v-if="isTeacher" class="flex gap-2 mb-4">
      <button
        :class="['px-4 py-2 rounded-lg text-sm font-medium transition-colors', activeTab === 'owned' ? 'bg-[color:var(--accent)] text-white' : 'theme-card hover:bg-[color:var(--bg-tertiary)]']"
        @click="activeTab = 'owned'; currentPage = 1"
      >
        Owned ({{ allOwnedItems.length }})
      </button>
      <button
        :class="['px-4 py-2 rounded-lg text-sm font-medium transition-colors', activeTab === 'borrowed' ? 'bg-[color:var(--accent)] text-white' : 'theme-card hover:bg-[color:var(--bg-tertiary)]']"
        @click="activeTab = 'borrowed'; currentPage = 1"
      >
        Borrowed ({{ borrowedItems.length }})
      </button>
    </div>

    <!-- Stats for teacher owned tab -->
    <div v-if="isTeacher && activeTab === 'owned'" class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div class="theme-card p-4 text-center">
        <p class="text-2xl font-bold text-accent">{{ allOwnedItems.length }}</p>
        <p class="text-xs text-muted">Total Owned</p>
      </div>
      <div class="theme-card p-4 text-center">
        <p class="text-2xl font-bold" style="color: #22c55e;">{{ allOwnedItems.filter(i => i.status === 'Available').length }}</p>
        <p class="text-xs text-muted">Available</p>
      </div>
      <div class="theme-card p-4 text-center">
        <p class="text-2xl font-bold" style="color: #f59e0b;">{{ allOwnedItems.filter(i => i.status === 'In-use').length }}</p>
        <p class="text-xs text-muted">In Use</p>
      </div>
      <div class="theme-card p-4 text-center">
        <p class="text-2xl font-bold" style="color: #8b5cf6;">{{ allOwnedItems.filter(i => i.canBorrow).length }}</p>
        <p class="text-xs text-muted">Borrowable</p>
      </div>
    </div>

    <div v-if="loading" class="empty-state">Loading items...</div>

    <!-- Teacher owned items table -->
    <template v-else-if="isTeacher && activeTab === 'owned'">
      <div v-if="filteredOwnedItems.length === 0" class="empty-state">
        <p>No owned items found</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full border-collapse table-striped theme-table">
          <thead>
            <tr>
              <th class="border p-2 text-left">Item ID</th>
              <th class="border p-2 text-left">Name</th>
              <th class="border p-2 text-left">Category</th>
              <th class="border p-2 text-left">Status</th>
              <th class="border p-2 text-left">Location</th>
              <th class="border p-2 text-left">Current Borrower</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in paginatedOwnedItems" :key="item.id" @click="showDetail(item)" class="cursor-pointer hover:bg-[color:var(--bg-tertiary)]">
              <td class="border p-2 text-sm font-semibold">{{ item.id }}</td>
              <td class="border p-2 text-sm">{{ item.name }}</td>
              <td class="border p-2 text-sm">{{ item.category }}</td>
              <td class="border p-2 text-sm">
                <span :class="`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(item.status)}`">
                  {{ item.status }}
                </span>
              </td>
              <td class="border p-2 text-sm">{{ item.location || '-' }}</td>
              <td class="border p-2 text-sm">{{ item.currentBorrower || '-' }}</td>
            </tr>
          </tbody>
        </table>
        <PaginationControl v-model:currentPage="currentPage" :totalItems="filteredOwnedItems.length" :pageSize="pageSize" />
      </div>
    </template>

    <!-- Teacher borrowed items table -->
    <template v-else-if="isTeacher && activeTab === 'borrowed'">
      <div v-if="filteredBorrowedItems.length === 0" class="empty-state">
        <p>No borrowed items</p>
        <p class="text-sm mt-1">You haven't borrowed any items yet.</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full border-collapse table-striped theme-table">
          <thead>
            <tr>
              <th class="border p-2 text-left">Item</th>
              <th class="border p-2 text-left">Request ID</th>
              <th class="border p-2 text-left">Status</th>
              <th class="border p-2 text-left">Return Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in paginatedBorrowedItems" :key="req.id" class="hover:bg-[color:var(--bg-tertiary)]">
              <td class="border p-2 text-sm font-semibold">{{ req.itemName }}</td>
              <td class="border p-2 text-sm">{{ req.id }}</td>
              <td class="border p-2 text-sm">
                <span class="px-2 py-0.5 rounded text-xs font-medium badge-info">Borrowed</span>
              </td>
              <td class="border p-2 text-sm">{{ formatDate(req.returnDate) || 'N/A' }}</td>
            </tr>
          </tbody>
        </table>
        <PaginationControl v-model:currentPage="currentPage" :totalItems="filteredBorrowedItems.length" :pageSize="pageSize" />
      </div>
    </template>

    <!-- Student view: only checked-out borrowed items -->
    <template v-else>
      <div v-if="filteredBorrowedItems.length === 0" class="empty-state">
        <p>No items currently checked out to you</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full border-collapse table-striped theme-table">
          <thead>
            <tr>
              <th class="border p-2 text-left">Item</th>
              <th class="border p-2 text-left">Request ID</th>
              <th class="border p-2 text-left">Status</th>
              <th class="border p-2 text-left">Return Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in paginatedBorrowedItems" :key="req.id" class="hover:bg-[color:var(--bg-tertiary)]">
              <td class="border p-2 text-sm font-semibold">{{ req.itemName }}</td>
              <td class="border p-2 text-sm">{{ req.id }}</td>
              <td class="border p-2 text-sm">
                <span class="px-2 py-0.5 rounded text-xs font-medium badge-info">Borrowed</span>
              </td>
              <td class="border p-2 text-sm">{{ formatDate(req.returnDate) || 'N/A' }}</td>
            </tr>
          </tbody>
        </table>
        <PaginationControl v-model:currentPage="currentPage" :totalItems="filteredBorrowedItems.length" :pageSize="pageSize" />
      </div>
    </template>

    <!-- Item Detail Modal (owned items only) -->
    <div v-if="selectedItem" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-xl font-bold">{{ selectedItem.name }}</h3>
          <button @click="selectedItem = null" class="text-muted hover:text-[color:var(--text-primary)] text-2xl">&times;</button>
        </div>
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div><p class="field-label">Item ID</p><p class="font-medium">{{ selectedItem.id }}</p></div>
          <div><p class="field-label">University ID</p><p class="font-medium">{{ selectedItem.universityID }}</p></div>
          <div><p class="field-label">Type</p><p class="font-medium">{{ selectedItem.type }}</p></div>
          <div><p class="field-label">Category</p><p class="font-medium">{{ selectedItem.category }}</p></div>
          <div><p class="field-label">Status</p><span :class="`px-2 py-1 rounded text-sm ${getStatusColor(selectedItem.status)}`">{{ selectedItem.status }}</span></div>
          <div><p class="field-label">Location</p><p class="font-medium">{{ selectedItem.location || 'N/A' }}</p></div>
          <div><p class="field-label">Current Borrower</p><p class="font-medium">{{ selectedItem.currentBorrower || 'None' }}</p></div>
          <div><p class="field-label">Supplier</p><p class="font-medium">{{ selectedItem.supplier || 'N/A' }}</p></div>
          <div><p class="field-label">Purchase Date</p><p class="font-medium">{{ formatDate(selectedItem.purchaseDate) }}</p></div>
          <div><p class="field-label">Warranty End</p><p class="font-medium">{{ formatDate(selectedItem.warrantyEnd) }}</p></div>
          <div><p class="field-label">Price</p><p class="font-medium">${{ selectedItem.price || 0 }}</p></div>
        </div>
        <div v-if="selectedItem.description" class="mb-4">
          <p class="field-label mb-1">Description</p>
          <p class="text-sm theme-section p-3">{{ selectedItem.description }}</p>
        </div>
        <div class="flex justify-end">
          <button @click="selectedItem = null" class="px-4 py-2 btn-close-neutral">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { inventoryService, borrowingService, authService } from '../utils/services'
import { formatDate, getStatusColor } from '../utils/helpers'
import PaginationControl from '../components/PaginationControl.vue'

export default {
  components: { PaginationControl },
  setup() {
    const allOwnedItems = ref([])
    const ownedItems = ref([])
    const borrowedItems = ref([])
    const searchText = ref('')
    const selectedItem = ref(null)
    const loading = ref(true)
    const currentPage = ref(1)
    const pageSize = 15
    const activeTab = ref('owned')
    let searchTimer = null

    const currentUser = authService.getCurrentUser()
    const isTeacher = computed(() => currentUser?.subRole === 'teacher')

    const getOwnerId = () => currentUser ? (currentUser.userId || currentUser.id) : null

    const filteredOwnedItems = computed(() => {
      if (!searchText.value) return allOwnedItems.value
      const q = searchText.value.toLowerCase()
      return allOwnedItems.value.filter(i =>
        (i.name || '').toLowerCase().includes(q) ||
        (i.id || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q)
      )
    })

    const filteredBorrowedItems = computed(() => {
      if (!searchText.value) return borrowedItems.value
      const q = searchText.value.toLowerCase()
      return borrowedItems.value.filter(r =>
        (r.itemName || '').toLowerCase().includes(q) ||
        (r.id || '').toLowerCase().includes(q)
      )
    })

    const paginatedOwnedItems = computed(() => {
      const start = (currentPage.value - 1) * pageSize
      return filteredOwnedItems.value.slice(start, start + pageSize)
    })

    const paginatedBorrowedItems = computed(() => {
      const start = (currentPage.value - 1) * pageSize
      return filteredBorrowedItems.value.slice(start, start + pageSize)
    })

    const loadData = async () => {
      loading.value = true
      try {
        // Load owned items (teacher only)
        if (isTeacher.value) {
          const ownerId = getOwnerId()
          if (ownerId) {
            const { items: data } = await inventoryService.getItemsByOwner(ownerId, { pageSize: 9999 })
            allOwnedItems.value = data
            ownedItems.value = data
          }
        }

        // Load borrowed items (both teacher and student)
        if (currentUser) {
          const requests = await borrowingService.getRequestsForUser(currentUser.id)
          // Only show items with status 'Approved' (physically checked out)
          borrowedItems.value = requests.filter(r => r.status === 'Approved')
        }

        // Student defaults to borrowed tab
        if (!isTeacher.value) {
          activeTab.value = 'borrowed'
        }
      } catch (e) {
        console.error('Failed to load items:', e)
      }
      loading.value = false
    }

    watch(searchText, () => {
      currentPage.value = 1
      clearTimeout(searchTimer)
      searchTimer = setTimeout(() => {}, 400)
    })

    const showDetail = (item) => {
      selectedItem.value = item
    }

    onMounted(loadData)

    return {
      allOwnedItems, borrowedItems, searchText, selectedItem, loading,
      currentPage, pageSize, activeTab, isTeacher,
      filteredOwnedItems, filteredBorrowedItems,
      paginatedOwnedItems, paginatedBorrowedItems,
      showDetail, formatDate, getStatusColor
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
