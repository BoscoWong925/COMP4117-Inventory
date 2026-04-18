<template>
  <div class="page-container">
    <UiModulePageHeader title="Search Available Items" subtitle="Browse items available to borrow">
      <UiButton variant="outline" size="sm" @click="exportItems">
        <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        Export
      </UiButton>
    </UiModulePageHeader>

    <UiModuleFilterPanel :showClear="hasActiveFilters" @clear="clearFilters">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <span class="filter-label">Search</span>
          <UiInput
            placeholder="Search by name, ID, or description..."
            v-model="searchText"
          />
        </div>
        <div>
          <span class="filter-label">Category</span>
          <UiFilterSelect
            v-model="categoryFilter"
            :options="categories"
            emptyLabel="All"
            label="Category"
          />
        </div>
        <div>
          <span class="filter-label">Location</span>
          <UiFilterSelect
            v-model="locationFilter"
            :options="locations"
            emptyLabel="All"
            label="Location"
          />
        </div>
      </div>
    </UiModuleFilterPanel>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-16">
      <UiSpinner size="lg" label="Loading available items..." />
    </div>

    <!-- Error State -->
    <div v-else-if="loadError" class="empty-state">
      <p class="text-danger font-medium mb-2">Failed to load items</p>
      <p class="text-sm text-muted mb-3">{{ loadError }}</p>
      <UiButton size="sm" @click="loadAvailableItems">Retry</UiButton>
    </div>

    <!-- Empty State -->
    <div v-else-if="items.length === 0" class="empty-state">
      No items match your search
    </div>

    <!-- Results -->
    <div v-else class="space-y-3">
      <div
        v-for="item in items"
        :key="item.id"
        @click="showItemDetail(item)"
        class="theme-card p-4 cursor-pointer hover:border-[color:var(--accent)] transition-colors"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="field-label">Item ID</p>
            <p class="font-bold text-lg">{{ item.id }}</p>
            <p class="text-sm font-medium mt-2">{{ item.name }}</p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="field-label">Type</p>
              <p class="font-medium">{{ item.type }}</p>
            </div>
            <div>
              <p class="field-label">Category</p>
              <p class="font-medium">{{ item.category }}</p>
            </div>
            <div>
              <p class="field-label">Status</p>
              <UiBadge :variant="item.status === 'Available' ? 'success' : 'default'">
                {{ item.status }}
              </UiBadge>
            </div>
            <div>
              <p class="field-label">Location</p>
              <p class="font-medium">{{ item.location }}</p>
            </div>
          </div>
        </div>

        <div v-if="item.description" class="mt-3 pt-3 border-t border-[color:var(--border)]">
          <p class="field-label">Description</p>
          <p class="text-sm">{{ item.description }}</p>
        </div>

        <div v-if="item.warrantyEnd" class="mt-2 text-xs text-secondary">
          Warranty ends: {{ formatDate(item.warrantyEnd) }}
        </div>
      </div>

      <UiTablePaginationBar
        :currentPage="currentPage"
        :pageSize="pageSize"
        :totalItems="totalItems"
        @update:currentPage="currentPage = $event"
      />
    </div>

    <!-- Item Detail Modal -->
    <div v-if="selectedItem" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 overflow-y-auto z-50">
      <div class="modal-card max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-xl font-bold">{{ selectedItem.name }}</h3>
          <button @click="selectedItem = null" class="text-muted hover:text-[color:var(--text-primary)] text-2xl">&times;</button>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p class="field-label">Item ID</p>
            <p class="font-medium">{{ selectedItem.id }}</p>
          </div>
          <div>
            <p class="field-label">University ID</p>
            <p class="font-medium">{{ selectedItem.universityID }}</p>
          </div>
          <div>
            <p class="field-label">Type</p>
            <p class="font-medium">{{ selectedItem.type }}</p>
          </div>
          <div>
            <p class="field-label">Category</p>
            <p class="font-medium">{{ selectedItem.category }}</p>
          </div>
          <div>
            <p class="field-label">Status</p>
            <UiBadge :variant="selectedItem.status === 'Available' ? 'success' : 'default'">
              {{ selectedItem.status }}
            </UiBadge>
          </div>
          <div>
            <p class="field-label">Location</p>
            <p class="font-medium">{{ selectedItem.location }}</p>
          </div>
          <div>
            <p class="field-label">Supplier</p>
            <p class="font-medium">{{ selectedItem.supplier || 'N/A' }}</p>
          </div>
          <div>
            <p class="field-label">Warranty End</p>
            <p class="font-medium">{{ formatDate(selectedItem.warrantyEnd) }}</p>
          </div>
        </div>

        <div v-if="selectedItem.description" class="mb-4">
          <p class="field-label mb-1">Description</p>
          <p class="text-sm theme-section p-3">{{ selectedItem.description }}</p>
        </div>

        <!-- Linked Components (Mother/Child) -->
        <div v-if="selectedItem.motherID" class="mb-4 p-3 theme-info-box">
          <p class="text-xs text-accent-subtle uppercase mb-1">Part of Computer</p>
          <p class="font-medium">Mother ID: {{ selectedItem.motherID }}</p>
        </div>

        <div v-if="linkedComponents.length > 0" class="mb-4">
          <p class="field-label mb-2">Linked Components (borrowed together)</p>
          <div class="space-y-2">
            <div v-for="comp in linkedComponents" :key="comp.id" class="theme-section p-3 flex justify-between items-center">
              <div>
                <p class="font-medium">{{ comp.name }}</p>
                <p class="field-label">{{ comp.id }} - {{ comp.category }}</p>
              </div>
              <UiBadge :variant="comp.status === 'Available' ? 'success' : 'default'" class="text-xs">
                {{ comp.status }}
              </UiBadge>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2">
          <UiButton variant="outline" @click="selectedItem = null">
            Close
          </UiButton>
          <UiButton v-if="selectedItem.canBorrow !== false && selectedItem.status === 'Available'" @click="handleBorrowRequest">
            <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Request to Borrow
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { inventoryService } from '../utils/services'
import { formatDate, getStatusColor, exportToExcel } from '../utils/helpers'
import {
  UiModulePageHeader,
  UiModuleFilterPanel,
  UiInput,
  UiFilterSelect,
  UiButton,
  UiBadge,
  UiSpinner,
  UiTablePaginationBar,
} from '../components/ui'

export default {
  components: {
    UiModulePageHeader,
    UiModuleFilterPanel,
    UiInput,
    UiFilterSelect,
    UiButton,
    UiBadge,
    UiSpinner,
    UiTablePaginationBar,
  },
  emits: ['navigate'],
  setup(props, { emit }) {
    const items = ref([])
    const totalItems = ref(0)
    const searchText = ref('')
    const categoryFilter = ref('')
    const locationFilter = ref('')
    const selectedItem = ref(null)
    const linkedComponents = ref([])
    const currentPage = ref(1)
    const pageSize = 10
    const categories = ref([])
    const locations = ref([])
    const loading = ref(false)
    const loadError = ref('')
    let searchDebounceTimer = null

    const hasActiveFilters = computed(() => {
      return searchText.value || categoryFilter.value || locationFilter.value
    })

    const clearFilters = () => {
      searchText.value = ''
      categoryFilter.value = ''
      locationFilter.value = ''
      currentPage.value = 1
    }

    const loadAvailableItems = async () => {
      loading.value = true
      loadError.value = ''
      try {
        const params = {
          page: currentPage.value,
          pageSize,
        }
        if (searchText.value) params.search = searchText.value
        if (categoryFilter.value) params.category = categoryFilter.value
        if (locationFilter.value) params.location = locationFilter.value

        const result = await inventoryService.getAvailableItems(params)
        items.value = result.items
        totalItems.value = result.total
      } catch (e) {
        console.error('Failed to load available items:', e)
        loadError.value = e.message || 'An unexpected error occurred'
      } finally {
        loading.value = false
      }
    }

    // Load unique categories and locations for dropdowns
    const loadFilterOptions = async () => {
      try {
        const result = await inventoryService.getAvailableItems({ pageSize: 9999 })
        categories.value = [...new Set(result.items.map(i => i.category).filter(Boolean))]
        locations.value = [...new Set(result.items.map(i => i.location).filter(Boolean))]
      } catch (e) { /* ignore */ }
    }

    // Watch dropdown filters and page -> reload immediately
    watch([categoryFilter, locationFilter, currentPage], () => {
      loadAvailableItems()
    })

    // Debounced watcher for search text
    watch(searchText, () => {
      currentPage.value = 1
      clearTimeout(searchDebounceTimer)
      searchDebounceTimer = setTimeout(() => {
        loadAvailableItems()
      }, 400)
    })

    const showItemDetail = async (item) => {
      selectedItem.value = item
      linkedComponents.value = []
      // Load linked components if this is a mother item
      if (item.fixedComponents && item.fixedComponents.length > 0) {
        try {
          const results = await Promise.all(
            item.fixedComponents.map(id => inventoryService.getItemById(id))
          )
          linkedComponents.value = results.filter(Boolean)
        } catch (e) {
          console.error('Failed to load linked components:', e)
        }
      }
    }

    const handleBorrowRequest = () => {
      selectedItem.value = null
      emit('navigate', 'new-borrow-request')
    }

    const exportItems = () => {
      exportToExcel(items.value, 'available_items.xlsx')
    }

    onMounted(() => {
      loadAvailableItems()
      loadFilterOptions()
    })

    return {
      items,
      totalItems,
      searchText,
      categoryFilter,
      locationFilter,
      categories,
      locations,
      currentPage,
      pageSize,
      selectedItem,
      linkedComponents,
      loading,
      loadError,
      hasActiveFilters,
      clearFilters,
      showItemDetail,
      handleBorrowRequest,
      exportItems,
      formatDate,
      getStatusColor,
    }
  }
}
</script>

<style scoped>
</style>
