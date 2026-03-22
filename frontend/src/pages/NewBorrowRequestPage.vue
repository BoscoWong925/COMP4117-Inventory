<template>
  <div class="page-container">
    <h2 class="page-title mb-4">New Borrow Request</h2>

    <div v-if="submitted" class="mb-4 p-4 alert-success">
      Request submitted successfully! Please wait for admin approval.
      <span v-if="autoBorrowedComponents.length">
        (Auto-borrowed {{ autoBorrowedComponents.length }} related component(s))
      </span>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <div class="mb-4">
          <label class="form-label">Search Available Computer Items</label>
          <input
            type="text"
            placeholder="Search by name or ID..."
            v-model="searchText"
            class="form-input"
          />
        </div>

        <div class="mb-4">
          <label class="form-label">Filter by Owner</label>
          <select v-model="ownerFilter" class="form-select" @change="loadAvailableItems">
            <option value="">All Owners</option>
            <option v-for="o in owners" :key="o.id" :value="o.id">{{ o.name }}</option>
          </select>
        </div>

        <div v-if="availableItems.length === 0" class="empty-state">
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
                <span :class="`px-2 py-1 rounded text-sm ${getStatusColor(item.status)}`">
                  {{ item.status }}
                </span>
              </div>
            </div>
            
            <!-- Component Viewer - shown right under clicked item -->
            <div v-if="showComponentViewer && selectedItem?.id === item.id" class="mt-2 mb-2 p-4 theme-section border border-[color:var(--border)] rounded-lg">
              <h4 class="text-md font-bold mb-3">Components of {{ item.name }}</h4>
              <div v-if="linkedComponents.length === 0" class="text-muted text-sm">No linked components</div>
              <div v-else class="space-y-2">
                <div v-for="comp in linkedComponents" :key="comp.id" class="theme-card p-3 flex justify-between items-center">
                  <div>
                    <p class="font-medium text-sm">{{ comp.name }}</p>
                    <p class="field-label">{{ comp.id }} · {{ comp.category }}</p>
                  </div>
                  <span :class="`px-2 py-0.5 rounded text-xs ${getStatusColor(comp.status)}`">{{ comp.status }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-1">
        <div class="theme-section p-4 border border-[color:var(--border)]">
          <h3 class="text-lg font-bold mb-4">Request Details</h3>
          <template v-if="selectedItem">
            <div class="mb-4 p-4 theme-card">
              <p class="font-medium mb-2">{{ selectedItem.name }}</p>
              <p class="text-sm text-secondary mb-2">ID: {{ selectedItem.id }}</p>
              <p class="text-sm text-secondary mb-2">Type: {{ selectedItem.type }}</p>
              <p class="text-sm text-secondary">Location: {{ selectedItem.location }}</p>
            </div>

            <div class="mb-4">
              <label class="form-label">Reason for Borrowing</label>
              <textarea
                v-model="reason"
                class="form-input"
                rows="4"
                placeholder="Explain why you need this item..."
              />
            </div>

            <!-- Multi-file upload for approval -->
            <div class="mb-4">
              <label class="form-label">Upload Approval/Screenshots</label>
              <input
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

            <button
              @click="handleSubmitRequest"
              class="btn btn-outline-primary w-full"
            >
              Submit Request
            </button>
          </template>
          <p v-else class="text-muted text-center">Select an item to request</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue'
import { inventoryService, borrowingService, authService } from '../utils/services'
import { getStatusColor } from '../utils/helpers'

export default {
  setup() {
    const availableItems = ref([])
    const searchText = ref('')
    const selectedItem = ref(null)
    const reason = ref('')
    const submitted = ref(false)
    const linkedComponents = ref([])
    const showComponentViewer = ref(false)
    const uploadedFiles = ref([])
    const filePreviews = ref([])
    const autoBorrowedComponents = ref([])
    const ownerFilter = ref('')
    const owners = ref([])
    let searchDebounceTimer = null

    const loadOwners = async () => {
      try {
        owners.value = await inventoryService.getItemOwners()
      } catch (e) {
        console.error('Failed to load owners:', e)
      }
    }

    const loadAvailableItems = async () => {
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
      // Load linked components
      if (item.fixedComponents && item.fixedComponents.length > 0) {
        try {
          const comps = []
          for (const id of item.fixedComponents) {
            const comp = await inventoryService.getItemById(id)
            if (comp) comps.push(comp)
          }
          linkedComponents.value = comps
          showComponentViewer.value = true
        } catch (e) {
          console.error('Failed to load linked components:', e)
        }
      } else {
        linkedComponents.value = []
        showComponentViewer.value = false
      }
    }

    const handleFileUpload = (event) => {
      const files = Array.from(event.target.files)
      files.forEach(file => {
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
      // Store in localStorage simulation
      localStorage.setItem('requestUploadedFiles', JSON.stringify(uploadedFiles.value.map(f => f.name)))
    }

    const removeFile = (idx) => {
      uploadedFiles.value.splice(idx, 1)
      if (idx < filePreviews.value.length) {
        filePreviews.value.splice(idx, 1)
      }
    }

    const handleSubmitRequest = async () => {
      if (!selectedItem.value || !reason.value) {
        alert('Please select an item and provide a reason')
        return
      }

      try {
        const currentUser = await authService.getCurrentUser()
        const borrowerID = currentUser?.id || 'UNKNOWN'

        // Create main request
        const mainReq = await borrowingService.createRequest(selectedItem.value.id, borrowerID, reason.value)

        // Auto-borrow linked components (mock behavior)
        autoBorrowedComponents.value = []
        if (selectedItem.value.fixedComponents && selectedItem.value.fixedComponents.length > 0) {
          for (const compID of selectedItem.value.fixedComponents) {
            const comp = await inventoryService.getItemById(compID)
            if (comp && comp.status === 'Available') {
              await borrowingService.createRequest(compID, borrowerID, `Auto-borrowed with ${selectedItem.value.name}`, mainReq.id)
              autoBorrowedComponents.value.push(comp)
            }
          }
        }

        submitted.value = true
        setTimeout(() => {
          selectedItem.value = null
          reason.value = ''
          submitted.value = false
          uploadedFiles.value = []
          filePreviews.value = []
          autoBorrowedComponents.value = []
          linkedComponents.value = []
          showComponentViewer.value = false
          loadAvailableItems()
        }, 3000)
      } catch (e) {
        console.error('Failed to submit request:', e)
      }
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
      linkedComponents,
      showComponentViewer,
      uploadedFiles,
      filePreviews,
      autoBorrowedComponents,
      ownerFilter,
      owners,
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
