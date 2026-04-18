<template>
  <div class="page-container">
    <UiModulePageHeader title="New Borrow Request" subtitle="Select an available item and submit a request" />

    <div v-if="submitted" class="mb-4 p-4 alert-success">
      Request submitted successfully! Please wait for admin approval.
      <span v-if="autoBorrowedComponents.length">
        (Auto-borrowed {{ autoBorrowedComponents.length }} related component(s))
      </span>
    </div>

    <div v-if="submitError" class="mb-4 p-4 rounded text-sm font-medium" style="background: var(--color-error-bg, #fee2e2); color: var(--color-error, #dc2626);">
      {{ submitError }}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <UiModuleFilterPanel :showClear="!!searchText || !!ownerFilter" @clear="searchText = ''; ownerFilter = ''">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <span class="filter-label">Search</span>
              <UiInput
                placeholder="Search by name or ID..."
                v-model="searchText"
              />
            </div>
            <div>
              <span class="filter-label">Filter by Owner</span>
              <UiFilterSelect
                v-model="ownerFilter"
                :options="ownerOptions"
                emptyLabel="All Owners"
                label="Owner"
                @update:modelValue="loadAvailableItems"
              />
            </div>
          </div>
        </UiModuleFilterPanel>

        <!-- Loading state -->
        <div v-if="loadingItems" class="flex flex-col items-center justify-center py-12">
          <UiSpinner size="lg" label="Loading available items..." />
        </div>

        <div v-else-if="availableItems.length === 0" class="empty-state">
          No available computer items found
        </div>
        <div v-else class="space-y-2 max-h-96 overflow-y-auto">
          <div
            v-for="item in availableItems"
            :key="item.id"
          >
            <div
              @click="selectItem(item)"
              :class="`p-4 border rounded cursor-pointer transition ${
                selectedItem?.id === item.id
                  ? 'theme-card-selected'
                  : 'theme-card'
              }`"
            >
              <div class="flex justify-between items-start">
                <div>
                  <p class="font-medium">{{ item.name }}</p>
                  <p class="text-sm text-secondary">ID: {{ item.id }}</p>
                  <p class="text-sm text-secondary">Category: {{ item.category }}</p>
                  <p v-if="item.fixedComponents && item.fixedComponents.length > 0" class="text-xs text-accent-subtle mt-1">
                    {{ item.fixedComponents.length }} linked component(s) — will be auto-borrowed
                  </p>
                </div>
                <UiBadge :variant="item.status === 'Available' ? 'success' : 'default'">
                  {{ item.status }}
                </UiBadge>
              </div>
            </div>
            
            <!-- Component Viewer - shown right under clicked item -->
            <div v-if="showComponentViewer && selectedItem?.id === item.id" class="mt-2 mb-2 p-4 theme-section border border-[color:var(--border)] rounded-lg">
              <h4 class="text-md font-bold mb-3">Components of {{ item.name }}</h4>
              <div v-if="componentLoadError" class="mb-2 p-2 rounded text-sm font-medium" style="background: var(--color-error-bg, #fee2e2); color: var(--color-error, #dc2626);">
                Failed to load some components. <UiButton variant="link" size="sm" @click="selectItem(item)">Retry</UiButton>
              </div>
              <div v-if="linkedComponents.length === 0 && !componentLoadError" class="text-muted text-sm">No linked components</div>
              <div v-if="unavailableComponents.length > 0" class="mb-2 p-2 rounded text-sm font-medium" style="background: var(--color-error-bg, #fee2e2); color: var(--color-error, #dc2626);">
                Cannot borrow: {{ unavailableComponents.length }} component(s) not available
              </div>
              <div v-if="linkedComponents.length > 0" class="space-y-2">
                <div v-for="comp in linkedComponents" :key="comp.id" class="theme-card p-3 flex justify-between items-center">
                  <div>
                    <p class="font-medium text-sm">{{ comp.name }}</p>
                    <p class="field-label">{{ comp.id }} · {{ comp.category }}</p>
                  </div>
                  <UiBadge :variant="comp.status === 'Available' ? 'success' : 'warning'" class="text-xs">{{ comp.status }}</UiBadge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-1">
        <UiCard class="p-4">
          <h3 class="text-lg font-bold mb-4">Request Details</h3>
          <template v-if="selectedItem">
            <div class="mb-4 p-4 theme-card">
              <p class="font-medium mb-2">{{ selectedItem.name }}</p>
              <p class="text-sm text-secondary mb-2">ID: {{ selectedItem.id }}</p>
              <p class="text-sm text-secondary mb-2">Type: {{ selectedItem.type }}</p>
              <p class="text-sm text-secondary">Location: {{ selectedItem.location }}</p>
            </div>

            <div class="mb-4">
              <label class="form-label">Reason for Borrowing <span class="text-danger">*</span></label>
              <UiTextarea
                v-model="reason"
                rows="4"
                placeholder="Explain why you need this item..."
              />
            </div>

            <!-- Multi-file upload for approval -->
            <div class="mb-4">
              <label class="form-label">Upload Approval/Screenshots</label>
              <input
                ref="fileInputRef"
                type="file"
                multiple
                accept="image/*,.pdf"
                @change="handleFileUpload"
                class="form-input text-sm"
              />
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
              <!-- Preview thumbnails -->
              <div v-if="filePreviews.length > 0" class="mt-2 flex flex-wrap gap-2">
                <img
                  v-for="(preview, idx) in filePreviews"
                  :key="'p'+idx"
                  :src="preview"
                  class="w-16 h-16 object-cover rounded border border-[color:var(--border)]"
                />
              </div>
            </div>

            <UiButton
              @click="handleSubmitRequest"
              :disabled="unavailableComponents.length > 0 || !reason"
              class="w-full"
            >
              Submit Request
            </UiButton>
          </template>
          <p v-else class="text-muted text-center py-4">Select an item to request</p>
        </UiCard>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { inventoryService, borrowingService, authService } from '../utils/services'
import { getStatusColor } from '../utils/helpers'
import { useActionLock } from '../hooks/useActionLock'
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
  },
  setup() {
    const { runAction } = useActionLock()
    const availableItems = ref([])
    const searchText = ref('')
    const selectedItem = ref(null)
    const reason = ref('')
    const submitted = ref(false)
    const submitError = ref('')
    const linkedComponents = ref([])
    const showComponentViewer = ref(false)
    const uploadedFiles = ref([])
    const rawFiles = ref([])
    const filePreviews = ref([])
    const autoBorrowedComponents = ref([])
    const unavailableComponents = computed(() => linkedComponents.value.filter(c => c.status !== 'Available'))
    const ownerFilter = ref('')
    const owners = ref([])
    const loadingItems = ref(false)
    const componentLoadError = ref('')
    const fileInputRef = ref(null)
    let searchDebounceTimer = null

    const ownerOptions = computed(() =>
      owners.value.map(o => ({ value: o.id, label: o.name }))
    )

    const loadOwners = async () => {
      try {
        owners.value = await inventoryService.getItemOwners()
      } catch (e) {
        console.error('Failed to load owners:', e)
      }
    }

    const loadAvailableItems = async () => {
      loadingItems.value = true
      try {
        const params = { pageSize: 9999 }
        if (ownerFilter.value) {
          params.owner = ownerFilter.value
        }
        if (searchText.value) {
          params.search = searchText.value
        }
        const result = await inventoryService.getAvailableItems(params)
        availableItems.value = result.items
      } catch (e) {
        console.error('Failed to load available items:', e)
      } finally {
        loadingItems.value = false
      }
    }

    // Debounced watcher for search text
    watch(searchText, () => {
      clearTimeout(searchDebounceTimer)
      searchDebounceTimer = setTimeout(() => {
        loadAvailableItems()
      }, 400)
    })

    const selectItem = async (item) => {
      selectedItem.value = item
      componentLoadError.value = ''
      // Load linked components
      if (item.fixedComponents && item.fixedComponents.length > 0) {
        try {
          const results = await Promise.all(item.fixedComponents.map(id => inventoryService.getItemById(id)))
          linkedComponents.value = results.filter(Boolean)
          showComponentViewer.value = true
        } catch (e) {
          console.error('Failed to load linked components:', e)
          componentLoadError.value = e.message || 'Failed to load components'
          linkedComponents.value = []
          showComponentViewer.value = true
        }
      } else {
        linkedComponents.value = []
        showComponentViewer.value = false
      }
    }

    const handleFileUpload = (event) => {
      const files = Array.from(event.target.files)
      files.forEach(file => {
        rawFiles.value.push(file)
        uploadedFiles.value.push({
          name: file.name,
          size: file.size,
          type: file.type
        })
        // Generate preview for images
        if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.onload = (e) => {
            filePreviews.value.push(e.target.result)
          }
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
      if (!selectedItem.value || !reason.value) {
        alert('Please select an item and provide a reason')
        return
      }
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

          // Create main request (with attachments if any)
          const mainReq = await borrowingService.createRequest(
            selectedItem.value.id, borrowerID, reason.value,
            null, rawFiles.value
          )

          // Auto-borrow linked components in parallel
          autoBorrowedComponents.value = []
          if (selectedItem.value.fixedComponents && selectedItem.value.fixedComponents.length > 0) {
            const comps = await Promise.all(selectedItem.value.fixedComponents.map(id => inventoryService.getItemById(id)))
            const available = comps.filter(c => c && c.status === 'Available')
            await Promise.all(available.map(comp => borrowingService.createRequest(comp.id, borrowerID, `Auto-borrowed with ${selectedItem.value.name}`, mainReq.id)))
            autoBorrowedComponents.value = available
          }

          submitted.value = true
          setTimeout(() => {
            selectedItem.value = null
            reason.value = ''
            submitted.value = false
            uploadedFiles.value = []
            rawFiles.value = []
            filePreviews.value = []
            autoBorrowedComponents.value = []
            linkedComponents.value = []
            showComponentViewer.value = false
            componentLoadError.value = ''
            loadAvailableItems()
          }, 3000)
        } catch (e) {
          console.error('Failed to submit request:', e)
          submitError.value = e?.response?.data?.message || e?.message || 'Failed to submit borrow request. Please try again.'
        }
      })
    }

    onMounted(() => {
      loadAvailableItems()
      loadOwners()
    })

    return {
      availableItems,
      searchText,
      selectedItem,
      reason,
      submitted,
      submitError,
      linkedComponents,
      showComponentViewer,
      uploadedFiles,
      filePreviews,
      autoBorrowedComponents,
      unavailableComponents,
      ownerFilter,
      owners,
      ownerOptions,
      loadingItems,
      componentLoadError,
      fileInputRef,
      selectItem,
      loadAvailableItems,
      handleFileUpload,
      removeFile,
      handleSubmitRequest,
      getStatusColor,
    }
  }
}
</script>

<style scoped>
</style>
