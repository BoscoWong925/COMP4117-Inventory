<template>
  <div class="p-6">
    <h2 class="text-2xl font-bold mb-4">New Borrow Request</h2>

    <div v-if="submitted" class="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded">
      Request submitted successfully! Please wait for admin approval.
      <span v-if="autoBorrowedComponents.length">
        (Auto-borrowed {{ autoBorrowedComponents.length }} related component(s))
      </span>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <div class="mb-4">
          <label class="block text-gray-700 text-sm font-medium mb-2">Search Available Computer Items</label>
          <input
            type="text"
            placeholder="Search by name or ID..."
            v-model="searchText"
            class="form-input"
          />
        </div>

        <div v-if="filteredItems.length === 0" class="bg-blue-50 p-4 rounded text-center">
          No available computer items found
        </div>
        <div v-else class="space-y-2 max-h-96 overflow-y-auto">
          <div
            v-for="item in filteredItems"
            :key="item.id"
          >
            <div
              @click="selectItem(item)"
              :class="`p-4 border rounded cursor-pointer transition ${
                selectedItem?.id === item.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`"
            >
              <div class="flex justify-between items-start">
                <div>
                  <p class="font-medium">{{ item.name }}</p>
                  <p class="text-sm text-gray-600">ID: {{ item.id }}</p>
                  <p class="text-sm text-gray-600">Category: {{ item.category }}</p>
                  <p v-if="item.fixedComponents && item.fixedComponents.length > 0" class="text-xs text-blue-600 mt-1">
                    {{ item.fixedComponents.length }} linked component(s) — will be auto-borrowed
                  </p>
                </div>
                <span :class="`px-2 py-1 rounded text-sm ${getStatusColor(item.status)}`">
                  {{ item.status }}
                </span>
              </div>
            </div>
            
            <!-- Component Viewer - shown right under clicked item -->
            <div v-if="showComponentViewer && selectedItem?.id === item.id" class="mt-2 mb-2 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 class="text-md font-bold mb-3">Components of {{ item.name }}</h4>
              <div v-if="linkedComponents.length === 0" class="text-gray-500 text-sm">No linked components</div>
              <div v-else class="space-y-2">
                <div v-for="comp in linkedComponents" :key="comp.id" class="bg-white p-3 rounded border flex justify-between items-center">
                  <div>
                    <p class="font-medium text-sm">{{ comp.name }}</p>
                    <p class="text-xs text-gray-500">{{ comp.id }} · {{ comp.category }}</p>
                  </div>
                  <span :class="`px-2 py-0.5 rounded text-xs ${getStatusColor(comp.status)}`">{{ comp.status }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-1">
        <div class="bg-gray-50 p-4 rounded border border-gray-300">
          <h3 class="text-lg font-bold mb-4">Request Details</h3>
          <template v-if="selectedItem">
            <div class="mb-4 p-4 bg-white rounded border border-gray-300">
              <p class="font-medium mb-2">{{ selectedItem.name }}</p>
              <p class="text-sm text-gray-600 mb-2">ID: {{ selectedItem.id }}</p>
              <p class="text-sm text-gray-600 mb-2">Type: {{ selectedItem.type }}</p>
              <p class="text-sm text-gray-600">Location: {{ selectedItem.location }}</p>
            </div>

            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-medium mb-2">Reason for Borrowing</label>
              <textarea
                v-model="reason"
                class="form-input"
                rows="4"
                placeholder="Explain why you need this item..."
              />
            </div>

            <!-- Multi-file upload for approval -->
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-medium mb-2">Upload Approval/Screenshots</label>
              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                @change="handleFileUpload"
                class="form-input text-sm"
              />
              <div v-if="uploadedFiles.length > 0" class="mt-2 space-y-1">
                <div v-for="(f, idx) in uploadedFiles" :key="idx" class="flex items-center justify-between bg-white border rounded p-2 text-sm">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="text-gray-500">📎</span>
                    <span class="truncate">{{ f.name }}</span>
                    <span class="text-xs text-gray-400">({{ (f.size / 1024).toFixed(1) }} KB)</span>
                  </div>
                  <button @click="removeFile(idx)" class="text-red-500 hover:text-red-700 ml-2 flex-shrink-0">&times;</button>
                </div>
              </div>
              <!-- Preview thumbnails -->
              <div v-if="filePreviews.length > 0" class="mt-2 flex flex-wrap gap-2">
                <img
                  v-for="(preview, idx) in filePreviews"
                  :key="'p'+idx"
                  :src="preview"
                  class="w-16 h-16 object-cover rounded border border-gray-200"
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
          <p v-else class="text-gray-500 text-center">Select an item to request</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
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

    const loadAvailableItems = async () => {
      try {
        const available = await inventoryService.getAvailableItems()
        // Only show computer / main hardware items (not loose components that are children)
        availableItems.value = available.filter(item =>
          item.category === 'Computer' || item.type === 'Hardware'
        )
      } catch (e) {
        console.error('Failed to load available items:', e)
      }
    }

    const filteredItems = computed(() =>
      availableItems.value.filter(item =>
        item.name.toLowerCase().includes(searchText.value.toLowerCase()) ||
        item.id.toLowerCase().includes(searchText.value.toLowerCase())
      )
    )

    const selectItem = async (item) => {
      selectedItem.value = item
      // Load linked components using the batch endpoint
      if (item.fixedComponents && item.fixedComponents.length > 0) {
        try {
          const comps = await inventoryService.getComponentsForMother(item.id)
          linkedComponents.value = comps
          showComponentViewer.value = true
        } catch (e) {
          console.error('Failed to load linked components:', e)
          linkedComponents.value = []
          showComponentViewer.value = false
        }
      } else {
        linkedComponents.value = []
        showComponentViewer.value = false
      }
    }

    // Store actual File objects for upload
    const actualFiles = ref([])

    const handleFileUpload = (event) => {
      const files = Array.from(event.target.files)
      files.forEach(file => {
        actualFiles.value.push(file)
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
      actualFiles.value.splice(idx, 1)
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

        // Create main request — backend auto-creates child requests for components
        const mainReq = await borrowingService.createRequest(
          selectedItem.value.id, borrowerID, reason.value, null, actualFiles.value
        )

        // Show auto-borrowed components from the server response
        autoBorrowedComponents.value = linkedComponents.value || []

        submitted.value = true
        setTimeout(() => {
          selectedItem.value = null
          reason.value = ''
          submitted.value = false
          uploadedFiles.value = []
          actualFiles.value = []
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
      filteredItems,
      selectItem,
      handleFileUpload,
      removeFile,
      handleSubmitRequest,
      getStatusColor,
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
