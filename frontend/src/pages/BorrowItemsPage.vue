<template>
  <div class="page-container">
    <UiModulePageHeader title="Borrow Items" subtitle="Browse available items and submit a borrow request">
      <UiButton variant="outline" size="sm" @click="exportItems">
        <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        Export
      </UiButton>
    </UiModulePageHeader>

    <!-- Success Banner -->
    <div v-if="submitted" class="mb-4 p-4 alert-success">
      Request submitted successfully! Please wait for admin approval.
      <span v-if="autoBorrowedComponents.length">
        (Auto-borrowed {{ autoBorrowedComponents.length }} related component(s))
      </span>
    </div>

    <!-- Error Banner -->
    <div v-if="submitError" class="mb-4 p-4 rounded text-sm font-medium" style="background: var(--color-error-bg, #fee2e2); color: var(--color-error, #dc2626);">
      {{ submitError }}
    </div>

    <!-- Filters -->
    <UiModuleFilterPanel :showClear="hasActiveFilters" @clear="clearFilters">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <span class="filter-label">Search</span>
          <UiInput placeholder="Search by name, ID, or description..." v-model="searchText" />
        </div>
        <div>
          <span class="filter-label">Category</span>
          <UiFilterSelect v-model="categoryFilter" :options="categories" emptyLabel="All" label="Category" />
        </div>
        <div>
          <span class="filter-label">Location</span>
          <UiFilterSelect v-model="locationFilter" :options="locations" emptyLabel="All" label="Location" />
        </div>
        <div>
          <span class="filter-label">Owner</span>
          <UiFilterSelect v-model="ownerFilter" :options="ownerOptions" emptyLabel="All Owners" label="Owner" />
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

    <!-- Results Grid -->
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
              <UiBadge :variant="item.status === 'Available' ? 'success' : 'default'">{{ item.status }}</UiBadge>
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
        <div v-if="isStaff && item.warrantyEnd" class="mt-2 text-xs text-secondary">
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

    <!-- Item Detail + Borrow Request Modal -->
    <div v-if="selectedItem" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 overflow-y-auto z-50">
      <div class="modal-card max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-xl font-bold">{{ selectedItem.name }}</h3>
          <button @click="closeModal" class="text-muted hover:text-[color:var(--text-primary)] text-2xl">&times;</button>
        </div>

        <!-- Item Details Grid -->
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
            <UiBadge :variant="selectedItem.status === 'Available' ? 'success' : 'default'">{{ selectedItem.status }}</UiBadge>
          </div>
          <div>
            <p class="field-label">Location</p>
            <p class="font-medium">{{ selectedItem.location }}</p>
          </div>
          <div v-if="isStaff && selectedItem.vendor">
            <p class="field-label">Vendor</p>
            <p class="font-medium">{{ selectedItem.vendor }}</p>
          </div>
          <div v-if="isStaff">
            <p class="field-label">Supplier</p>
            <p class="font-medium">{{ selectedItem.supplier || 'N/A' }}</p>
          </div>
          <div v-if="isStaff && selectedItem.price">
            <p class="field-label">Price</p>
            <p class="font-medium">${{ selectedItem.price }}</p>
          </div>
          <div v-if="isStaff && selectedItem.purchaseDate">
            <p class="field-label">Purchase Date</p>
            <p class="font-medium">{{ formatDate(selectedItem.purchaseDate) }}</p>
          </div>
          <div v-if="isStaff || isTeacher">
            <p class="field-label">Warranty End</p>
            <p class="font-medium">{{ formatDate(selectedItem.warrantyEnd) }}</p>
          </div>
          <div v-if="isStaff && selectedItem.owner">
            <p class="field-label">Owner</p>
            <p class="font-medium">{{ selectedItem.owner }}</p>
          </div>
        </div>

        <div v-if="selectedItem.description" class="mb-4">
          <p class="field-label mb-1">Description</p>
          <p class="text-sm theme-section p-3">{{ selectedItem.description }}</p>
        </div>

        <!-- Mother item info -->
        <div v-if="selectedItem.motherID" class="mb-4 p-3 theme-info-box">
          <p class="text-xs text-accent-subtle uppercase mb-1">Part of Computer</p>
          <p class="font-medium">Mother ID: {{ selectedItem.motherID }}</p>
        </div>

        <!-- Linked Components -->
        <div v-if="linkedComponents.length > 0" class="mb-4">
          <p class="field-label mb-2">Linked Components (borrowed together)</p>
          <div v-if="unavailableComponents.length > 0" class="mb-2 p-2 rounded text-sm font-medium" style="background: var(--color-error-bg, #fee2e2); color: var(--color-error, #dc2626);">
            Cannot borrow: {{ unavailableComponents.length }} component(s) not available
          </div>
          <div class="space-y-2">
            <div v-for="comp in linkedComponents" :key="comp.id" class="theme-section p-3 flex justify-between items-center">
              <div>
                <p class="font-medium">{{ comp.name }}</p>
                <p class="field-label">{{ comp.id }} - {{ comp.category }}</p>
              </div>
              <UiBadge :variant="comp.status === 'Available' ? 'success' : 'warning'" class="text-xs">{{ comp.status }}</UiBadge>
            </div>
          </div>
        </div>

        <!-- Borrow Request Form (inline in modal) -->
        <div v-if="showBorrowForm && selectedItem.status === 'Available'" class="mt-4 pt-4 border-t border-[color:var(--border)]">
          <h4 class="font-bold mb-3">Borrow Request</h4>

          <div class="mb-4">
            <label class="form-label">Reason for Borrowing <span class="text-danger">*</span></label>
            <UiTextarea v-model="reason" rows="3" placeholder="Explain why you need this item..." />
          </div>

          <div class="mb-4">
            <label class="form-label">Upload Approval/Screenshots</label>
            <input ref="fileInputRef" type="file" multiple accept="image/*,.pdf" @change="handleFileUpload" class="form-input text-sm" />
            <div v-if="uploadedFiles.length > 0" class="mt-2 space-y-1">
              <div v-for="(f, idx) in uploadedFiles" :key="idx" class="flex items-center justify-between theme-card p-2 text-sm">
                <div class="flex items-center gap-2 min-w-0">
                  <svg class="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                  <span class="truncate">{{ f.name }}</span>
                  <span class="text-xs text-muted">({{ (f.size / 1024).toFixed(1) }} KB)</span>
                </div>
                <button @click="removeFile(idx)" class="btn-remove ml-2 flex-shrink-0">&times;</button>
              </div>
            </div>
            <div v-if="filePreviews.length > 0" class="mt-2 flex flex-wrap gap-2">
              <img v-for="(preview, idx) in filePreviews" :key="'p'+idx" :src="preview" class="w-16 h-16 object-cover rounded border border-[color:var(--border)]" />
            </div>
          </div>

          <UiButton @click="handleSubmitRequest" :disabled="unavailableComponents.length > 0 || !reason" class="w-full">
            Submit Request
          </UiButton>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-2 mt-4">
          <UiButton variant="outline" @click="closeModal">Close</UiButton>
          <UiButton
            v-if="!showBorrowForm && selectedItem.canBorrow !== false && selectedItem.status === 'Available'"
            @click="showBorrowForm = true"
          >
            <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Borrow This Item
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { inventoryService, borrowingService, authService } from '../utils/services'
import { formatDate, getStatusColor, exportToExcel } from '../utils/helpers'
import { useActionLock } from '../hooks/useActionLock'
import { usePermissions } from '../hooks/usePermissions'
import {
  UiModulePageHeader,
  UiModuleFilterPanel,
  UiInput,
  UiFilterSelect,
  UiButton,
  UiBadge,
  UiCard,
  UiTextarea,
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
    UiCard,
    UiTextarea,
    UiSpinner,
    UiTablePaginationBar,
  },
  setup() {
    const { runAction } = useActionLock()
    const { isStaff, isTeacher } = usePermissions()

    // Browse state
    const items = ref([])
    const totalItems = ref(0)
    const searchText = ref('')
    const categoryFilter = ref('')
    const locationFilter = ref('')
    const ownerFilter = ref('')
    const selectedItem = ref(null)
    const linkedComponents = ref([])
    const currentPage = ref(1)
    const pageSize = 10
    const categories = ref([])
    const locations = ref([])
    const owners = ref([])
    const loading = ref(false)
    const loadError = ref('')
    let searchDebounceTimer = null

    // Borrow form state
    const showBorrowForm = ref(false)
    const reason = ref('')
    const uploadedFiles = ref([])
    const rawFiles = ref([])
    const filePreviews = ref([])
    const submitted = ref(false)
    const submitError = ref('')
    const autoBorrowedComponents = ref([])
    const fileInputRef = ref(null)

    const unavailableComponents = computed(() => linkedComponents.value.filter(c => c.status !== 'Available'))

    const ownerOptions = computed(() => owners.value.map(o => ({ value: o.id, label: o.name })))

    const hasActiveFilters = computed(() => {
      return searchText.value || categoryFilter.value || locationFilter.value || ownerFilter.value
    })

    const clearFilters = () => {
      searchText.value = ''
      categoryFilter.value = ''
      locationFilter.value = ''
      ownerFilter.value = ''
      currentPage.value = 1
    }

    const loadAvailableItems = async () => {
      loading.value = true
      loadError.value = ''
      try {
        const params = { page: currentPage.value, pageSize }
        if (searchText.value) params.search = searchText.value
        if (categoryFilter.value) params.category = categoryFilter.value
        if (locationFilter.value) params.location = locationFilter.value
        if (ownerFilter.value) params.owner = ownerFilter.value
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

    const loadFilterOptions = async () => {
      try {
        const [allResult, ownerList] = await Promise.all([
          inventoryService.getAvailableItems({ pageSize: 9999 }),
          inventoryService.getItemOwners().catch(() => [])
        ])
        categories.value = [...new Set(allResult.items.map(i => i.category).filter(Boolean))]
        locations.value = [...new Set(allResult.items.map(i => i.location).filter(Boolean))]
        owners.value = ownerList
      } catch (e) { /* ignore */ }
    }

    // Watch dropdown filters and page → reload
    watch([categoryFilter, locationFilter, ownerFilter, currentPage], () => {
      loadAvailableItems()
    })

    // Debounced search
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
      showBorrowForm.value = false
      resetBorrowForm()
      if (item.fixedComponents && item.fixedComponents.length > 0) {
        try {
          const results = await Promise.all(item.fixedComponents.map(id => inventoryService.getItemById(id)))
          linkedComponents.value = results.filter(Boolean)
        } catch (e) {
          console.error('Failed to load linked components:', e)
        }
      }
    }

    const closeModal = () => {
      selectedItem.value = null
      linkedComponents.value = []
      showBorrowForm.value = false
      resetBorrowForm()
    }

    const resetBorrowForm = () => {
      reason.value = ''
      uploadedFiles.value = []
      rawFiles.value = []
      filePreviews.value = []
      submitError.value = ''
    }

    const handleFileUpload = (event) => {
      const files = Array.from(event.target.files)
      files.forEach(file => {
        rawFiles.value.push(file)
        uploadedFiles.value.push({ name: file.name, size: file.size, type: file.type })
        if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.onload = (e) => { filePreviews.value.push(e.target.result) }
          reader.readAsDataURL(file)
        }
      })
    }

    const removeFile = (idx) => {
      uploadedFiles.value.splice(idx, 1)
      rawFiles.value.splice(idx, 1)
      if (idx < filePreviews.value.length) {
        filePreviews.value.splice(idx, 1)
      }
    }

    const handleSubmitRequest = async () => {
      if (!selectedItem.value || !reason.value) return
      if (unavailableComponents.value.length > 0) {
        const names = unavailableComponents.value.map(c => `${c.name} (${c.status})`).join(', ')
        alert(`Cannot submit request: the following linked component(s) are not available — ${names}`)
        return
      }

      await runAction('Submitting borrow request...', async () => {
        try {
          submitError.value = ''
          const currentUser = await authService.getCurrentUser()
          const borrowerID = currentUser?.userId || currentUser?.id || 'UNKNOWN'

          const mainReq = await borrowingService.createRequest(
            selectedItem.value.id, borrowerID, reason.value,
            null, rawFiles.value
          )

          // Auto-borrow linked components
          autoBorrowedComponents.value = []
          if (selectedItem.value.fixedComponents && selectedItem.value.fixedComponents.length > 0) {
            const comps = await Promise.all(selectedItem.value.fixedComponents.map(id => inventoryService.getItemById(id)))
            const available = comps.filter(c => c && c.status === 'Available')
            await Promise.all(available.map(comp =>
              borrowingService.createRequest(comp.id, borrowerID, `Auto-borrowed with ${selectedItem.value.name}`, mainReq.id)
            ))
            autoBorrowedComponents.value = available
          }

          submitted.value = true
          closeModal()
          loadAvailableItems()
          setTimeout(() => { submitted.value = false; autoBorrowedComponents.value = [] }, 5000)
        } catch (e) {
          console.error('Failed to submit request:', e)
          submitError.value = e?.response?.data?.message || e?.message || 'Failed to submit borrow request. Please try again.'
        }
      })
    }

    const exportItems = () => {
      exportToExcel(items.value, 'available_items.xlsx')
    }

    onMounted(() => {
      loadAvailableItems()
      loadFilterOptions()
    })

    return {
      items, totalItems, searchText, categoryFilter, locationFilter, ownerFilter,
      categories, locations, ownerOptions,
      currentPage, pageSize, selectedItem, linkedComponents,
      loading, loadError, hasActiveFilters,
      showBorrowForm, reason, uploadedFiles, rawFiles, filePreviews,
      submitted, submitError, autoBorrowedComponents, unavailableComponents,
      fileInputRef,
      clearFilters, loadAvailableItems, showItemDetail, closeModal,
      handleFileUpload, removeFile, handleSubmitRequest, exportItems,
      formatDate, getStatusColor, isStaff, isTeacher,
    }
  }
}
</script>

<style scoped>
</style>
