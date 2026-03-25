<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">My Items</h2>
      <p class="page-description">{{ isTeacher ? 'Items you own and borrow' : 'Items you are currently borrowing' }}</p>
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

    <!-- Active status filter banner -->
    <div v-if="statusFilter" class="mb-3 p-3 rounded-lg flex items-center justify-between text-sm" style="background: var(--surface-2); border: 1px solid var(--border);">
      <span>Showing: <strong>{{ statusFilter }}</strong> items only</span>
      <button @click="statusFilter = ''" class="text-accent hover:underline font-medium">Clear Filter &times;</button>
    </div>

    <!-- Tabs for teacher -->
    <div v-if="isTeacher" class="flex gap-2 mb-4">
      <button
        :class="`pill ${activeTab === 'owned' ? 'pill-active' : ''}`"
        @click="activeTab = 'owned'; currentPage = 1"
      >
        Owned ({{ allOwnedItems.length }})
      </button>
      <button
        :class="`pill ${activeTab === 'borrowed' ? 'pill-active' : ''}`"
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
        <p class="text-2xl font-bold" style="color:var(--success)">{{ allOwnedItems.filter(i => i.status === 'Available').length }}</p>
        <p class="text-xs text-muted">Available</p>
      </div>
      <div class="theme-card p-4 text-center">
        <p class="text-2xl font-bold" style="color:var(--warning)">{{ allOwnedItems.filter(i => i.status === 'In-use').length }}</p>
        <p class="text-xs text-muted">In Use</p>
      </div>
      <div class="theme-card p-4 text-center">
        <p class="text-2xl font-bold" style="color:var(--info)">{{ allOwnedItems.filter(i => i.canBorrow).length }}</p>
        <p class="text-xs text-muted">Borrowable</p>
      </div>
    </div>

    <!-- Bulk Actions for Owned Items Tab -->
    <div v-if="isTeacher && activeTab === 'owned' && selectedOwnedItemIds.length > 0" class="mb-4 flex gap-2">
      <button @click="showBulkSetInuseModal = true" class="btn btn-outline-warning">
        Set In-use ({{ selectedOwnedItemIds.length }})
      </button>
      <button @click="showBulkSetAvailableModal = true" class="btn btn-outline-success">
        Set Available ({{ selectedOwnedItemIds.length }})
      </button>
    </div>

    <div v-if="loading" class="empty-state">Loading items...</div>

    <!-- Teacher owned items table -->
    <template v-else-if="isTeacher && activeTab === 'owned'">
      <div v-if="filteredOwnedItems.length === 0" class="empty-state">
        <p>No owned items found</p>
      </div>
      <div v-else class="table-responsive">
        <table class="table-striped theme-table">
          <thead>
            <tr>
              <th class="text-center" style="width:2.5rem">
                <input type="checkbox" @change="toggleSelectAllOwned" :checked="allOwnedSelected" />
              </th>
              <th>Item ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Status</th>
              <th>Location</th>
              <th>Current Borrower</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in paginatedOwnedItems" :key="item.id" @click="showDetail(item)" class="cursor-pointer">
              <td class="text-center" @click.stop>
                <input type="checkbox" :value="item.id" v-model="selectedOwnedItemIds" />
              </td>
              <td class="text-sm" style="font-weight:600">{{ item.id }}</td>
              <td class="text-sm">{{ item.name }}</td>
              <td class="text-sm">{{ item.category }}</td>
              <td class="text-sm">
                <span :class="`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(item.status)}`">
                  {{ item.status }}
                </span>
              </td>
              <td class="text-sm">{{ item.location || '-' }}</td>
              <td class="text-sm">{{ item.currentBorrowerName || item.currentBorrower || '-' }}</td>
              <td class="text-center whitespace-nowrap" @click.stop>
                <template v-if="item.status === 'Available'">
                  <button @click="changeStatus(item, 'In-use')" class="btn btn-outline-warning text-xs">Set In-use</button>
                </template>
                <template v-else-if="item.status === 'In-use'">
                  <button @click="changeStatus(item, 'Available')" class="btn btn-outline-success text-xs">Set Available</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
        <PaginationControl v-model:currentPage="currentPage" :totalItems="ownedCount" :pageSize="pageSize" />
      </div>
    </template>

    <!-- Teacher borrowed items table -->
    <template v-else-if="isTeacher && activeTab === 'borrowed'">
      <div v-if="filteredBorrowedItems.length === 0" class="empty-state">
        <p>No borrowed items</p>
        <p class="text-sm mt-1">You haven't borrowed any items yet.</p>
      </div>
      <div v-else class="table-responsive">
        <table class="table-striped theme-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Request ID</th>
              <th>Status</th>
              <th>Return Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in paginatedBorrowedItems" :key="req.id">
              <td class="text-sm" style="font-weight:500">{{ req.itemName }}</td>
              <td class="text-sm">{{ req.id }}</td>
              <td class="text-sm">
                <span class="px-2 py-0.5 rounded text-xs font-medium badge-info">Borrowed</span>
              </td>
              <td class="text-sm">{{ formatDate(req.returnDate) || 'N/A' }}</td>
            </tr>
          </tbody>
        </table>
        <PaginationControl v-model:currentPage="currentPage" :totalItems="borrowedCount" :pageSize="pageSize" />
      </div>
    </template>

    <!-- Student view: only checked-out borrowed items -->
    <template v-else>
      <div v-if="filteredBorrowedItems.length === 0" class="empty-state">
        <p>No items currently checked out to you</p>
      </div>
      <div v-else class="table-responsive">
        <table class="table-striped theme-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Request ID</th>
              <th>Status</th>
              <th>Return Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in paginatedBorrowedItems" :key="req.id">
              <td class="text-sm" style="font-weight:500">{{ req.itemName }}</td>
              <td class="text-sm">{{ req.id }}</td>
              <td class="text-sm">
                <span class="px-2 py-0.5 rounded text-xs font-medium badge-info">Borrowed</span>
              </td>
              <td class="text-sm">{{ formatDate(req.returnDate) || 'N/A' }}</td>
            </tr>
          </tbody>
        </table>
        <PaginationControl v-model:currentPage="currentPage" :totalItems="borrowedCount" :pageSize="pageSize" />
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
          <div><p class="field-label">Current Borrower</p><p class="font-medium">{{ selectedItem.currentBorrowerName || selectedItem.currentBorrower || 'None' }}</p></div>
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

    <!-- Bulk Set In-use Modal -->
    <div v-if="showBulkSetInuseModal" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Set In-use ({{ selectedOwnedItemIds.length }} item{{ selectedOwnedItemIds.length !== 1 ? 's' : '' }})</h3>
        <p class="text-sm text-secondary mb-4">
          Mark all selected items as In-use?
        </p>
        <div class="flex gap-2">
          <button @click="handleBulkSetInuse" class="btn btn-outline-warning flex-1">Set In-use</button>
          <button @click="showBulkSetInuseModal = false" class="btn btn-outline-secondary flex-1">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Bulk Set Available Modal -->
    <div v-if="showBulkSetAvailableModal" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Set Available ({{ selectedOwnedItemIds.length }} item{{ selectedOwnedItemIds.length !== 1 ? 's' : '' }})</h3>
        <p class="text-sm text-secondary mb-4">
          Mark all selected items as Available?
        </p>
        <div class="flex gap-2">
          <button @click="handleBulkSetAvailable" class="btn btn-outline-success flex-1">Set Available</button>
          <button @click="showBulkSetAvailableModal = false" class="btn btn-outline-secondary flex-1">Cancel</button>
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
  props: {
    pageParams: { type: Object, default: () => ({}) }
  },
  setup(props) {
    const allOwnedItems = ref([])
    const ownedItems = ref([])
    const borrowedItems = ref([])
    const searchText = ref('')
    const statusFilter = ref('')
    const selectedItem = ref(null)
    const loading = ref(true)
    const currentPage = ref(1)
    const pageSize = 15
    const activeTab = ref('owned')
    const selectedOwnedItemIds = ref([])
    const showBulkSetInuseModal = ref(false)
    const showBulkSetAvailableModal = ref(false)
    let searchTimer = null

    const currentUser = authService.getCurrentUser()
    const isTeacher = computed(() => currentUser?.subRole === 'teacher')

    const getOwnerId = () => currentUser ? (currentUser.userId || currentUser.id) : null

    const ownedCount = ref(0)
    const borrowedCount = ref(0)
    const filteredOwnedItems = computed(() => {
      return allOwnedItems.value
    })

    const filteredBorrowedItems = computed(() => {
      return borrowedItems.value
    })

    const paginatedOwnedItems = computed(() => {
      return filteredOwnedItems.value
    })

    const paginatedBorrowedItems = computed(() => {
      return filteredBorrowedItems.value
    })

    const allOwnedSelected = computed(() => {
      return filteredOwnedItems.value.length > 0 && selectedOwnedItemIds.value.length === filteredOwnedItems.value.length
    })

    const loadData = async () => {
      loading.value = true
      try {
        // Load owned items (teacher only)
        if (isTeacher.value && activeTab.value === 'owned') {
          const ownerId = getOwnerId()
          if (ownerId) {
            const params = { page: currentPage.value, pageSize }
            if (searchText.value) params.search = searchText.value
            if (statusFilter.value) params.status = statusFilter.value
            
            const { items: data, total } = await inventoryService.getItemsByOwner(ownerId, params)
            allOwnedItems.value = data
            ownedItems.value = data
            ownedCount.value = total
          }
        }

        // Load borrowed items (both teacher and student)
        if (currentUser && activeTab.value === 'borrowed') {
          const params = { page: currentPage.value, pageSize, status: 'Approved' }
          if (searchText.value) params.search = searchText.value

          const response = await borrowingService.getRequestsForUser(currentUser.id, params)
          borrowedItems.value = response.requests || []
          borrowedCount.value = response.total || 0
        }

        // Student defaults to borrowed tab
        if (!isTeacher.value && activeTab.value === 'owned') {
          activeTab.value = 'borrowed'
        }
      } catch (e) {
        console.error('Failed to load items:', e)
      }
      loading.value = false
    }

    watch([searchText, statusFilter, currentPage, activeTab], () => {
      clearTimeout(searchTimer)
      searchTimer = setTimeout(() => {
        loadData()
      }, 400)
    })

    const showDetail = (item) => {
      selectedItem.value = item
    }

    const changeStatus = async (item, newStatus) => {
      try {
        await inventoryService.updateItemStatus(item.id, newStatus)
        item.status = newStatus
      } catch (e) {
        alert(e.response?.data?.message || 'Failed to update status')
      }
    }

    const toggleSelectAllOwned = (event) => {
      if (event.target.checked) {
        selectedOwnedItemIds.value = filteredOwnedItems.value.map(item => item.id)
      } else {
        selectedOwnedItemIds.value = []
      }
    }

    const handleBulkSetInuse = async () => {
      showBulkSetInuseModal.value = false
      try {
        for (const itemId of selectedOwnedItemIds.value) {
          try {
            await inventoryService.updateItemStatus(itemId, 'In-use')
          } catch (e) {
            console.error(`Failed to set ${itemId} to In-use:`, e)
          }
        }
        selectedOwnedItemIds.value = []
        await loadData()
      } catch (e) {
        console.error('Failed to bulk set items to In-use:', e)
        alert('Error setting items to In-use')
      }
    }

    const handleBulkSetAvailable = async () => {
      showBulkSetAvailableModal.value = false
      try {
        for (const itemId of selectedOwnedItemIds.value) {
          try {
            await inventoryService.updateItemStatus(itemId, 'Available')
          } catch (e) {
            console.error(`Failed to set ${itemId} to Available:`, e)
          }
        }
        selectedOwnedItemIds.value = []
        await loadData()
      } catch (e) {
        console.error('Failed to bulk set items to Available:', e)
        alert('Error setting items to Available')
      }
    }

    onMounted(() => {
      if (props.pageParams?.filter) {
        const filterMap = { available: 'Available', 'in-use': 'In-use' }
        if (filterMap[props.pageParams.filter]) {
          statusFilter.value = filterMap[props.pageParams.filter]
        }
      }
      loadData()
    })

    return {
      allOwnedItems, borrowedItems, searchText, statusFilter, selectedItem, loading,
      currentPage, pageSize, activeTab, isTeacher,
      ownedCount, borrowedCount,
      filteredOwnedItems, filteredBorrowedItems,
      paginatedOwnedItems, paginatedBorrowedItems,
      selectedOwnedItemIds, showBulkSetInuseModal, showBulkSetAvailableModal, allOwnedSelected,
      showDetail, changeStatus, toggleSelectAllOwned, handleBulkSetInuse, handleBulkSetAvailable,
      formatDate, getStatusColor
    }
  }
}
</script>

<style scoped>
</style>
