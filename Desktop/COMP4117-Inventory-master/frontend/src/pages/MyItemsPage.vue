<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">My Items</h2>
      <p class="text-sm text-secondary">Items you currently own</p>
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

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div class="theme-card p-4 text-center">
        <p class="text-2xl font-bold text-accent">{{ items.length }}</p>
        <p class="text-xs text-muted">Total Owned</p>
      </div>
      <div class="theme-card p-4 text-center">
        <p class="text-2xl font-bold" style="color: #22c55e;">{{ items.filter(i => i.status === 'Available').length }}</p>
        <p class="text-xs text-muted">Available</p>
      </div>
      <div class="theme-card p-4 text-center">
        <p class="text-2xl font-bold" style="color: #f59e0b;">{{ items.filter(i => i.status === 'In-use').length }}</p>
        <p class="text-xs text-muted">In Use</p>
      </div>
      <div class="theme-card p-4 text-center">
        <p class="text-2xl font-bold" style="color: #8b5cf6;">{{ items.filter(i => i.canBorrow).length }}</p>
        <p class="text-xs text-muted">Borrowable</p>
      </div>
    </div>

    <div v-if="loading" class="empty-state">Loading items...</div>
    <div v-else-if="filteredItems.length === 0" class="empty-state">
      <p>No items found</p>
      <p class="text-sm mt-1">You don't own any inventory items yet.</p>
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
            <th class="border p-2 text-left">Borrowable</th>
            <th class="border p-2 text-left">Current Borrower</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in paginatedItems" :key="item.id" @click="showDetail(item)" class="cursor-pointer hover:bg-[color:var(--bg-tertiary)]">
            <td class="border p-2 text-sm font-semibold">{{ item.id }}</td>
            <td class="border p-2 text-sm">{{ item.name }}</td>
            <td class="border p-2 text-sm">{{ item.category }}</td>
            <td class="border p-2 text-sm">
              <span :class="`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(item.status)}`">
                {{ item.status }}
              </span>
            </td>
            <td class="border p-2 text-sm">{{ item.location || '-' }}</td>
            <td class="border p-2 text-sm">
              <span v-if="item.canBorrow" class="text-green-500 font-medium">Yes</span>
              <span v-else class="text-red-400 font-medium">No</span>
            </td>
            <td class="border p-2 text-sm">{{ item.currentBorrower || '-' }}</td>
          </tr>
        </tbody>
      </table>
      <PaginationControl v-model:currentPage="currentPage" :totalItems="filteredItems.length" :pageSize="pageSize" />
    </div>

    <!-- Item Detail Modal -->
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
          <div><p class="field-label">Borrowable</p><p class="font-medium">{{ selectedItem.canBorrow ? 'Yes' : 'No' }}</p></div>
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
import { inventoryService, authService } from '../utils/services'
import { formatDate, getStatusColor } from '../utils/helpers'
import PaginationControl from '../components/PaginationControl.vue'

export default {
  components: { PaginationControl },
  setup() {
    const items = ref([])
    const searchText = ref('')
    const selectedItem = ref(null)
    const loading = ref(true)
    const currentPage = ref(1)
    const pageSize = 15

    watch(searchText, () => { currentPage.value = 1 })

    const loadItems = async () => {
      loading.value = true
      try {
        const currentUser = authService.getCurrentUser()
        if (currentUser) {
          items.value = await inventoryService.getItemsByOwner(currentUser.userId || currentUser.id)
        }
      } catch (e) {
        console.error('Failed to load owned items:', e)
      }
      loading.value = false
    }

    const filteredItems = computed(() => {
      if (!searchText.value) return items.value
      const q = searchText.value.toLowerCase()
      return items.value.filter(i =>
        (i.name || '').toLowerCase().includes(q) ||
        (i.id || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.category || '').toLowerCase().includes(q)
      )
    })

    const paginatedItems = computed(() => {
      const start = (currentPage.value - 1) * pageSize
      return filteredItems.value.slice(start, start + pageSize)
    })

    const showDetail = (item) => {
      selectedItem.value = item
    }

    onMounted(() => { loadItems() })

    return {
      items, searchText, selectedItem, loading, currentPage, pageSize,
      filteredItems, paginatedItems, showDetail,
      formatDate, getStatusColor
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
