<template>
  <div class="p-6">
    <h2 class="text-2xl font-bold mb-4">New Borrow Request</h2>

    <div v-if="submitted" class="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded">
      Request submitted successfully! Please wait for admin approval.
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <div class="mb-4">
          <label class="block text-gray-700 text-sm font-medium mb-2">Search Available Items</label>
          <input
            type="text"
            placeholder="Search by name or ID..."
            v-model="searchText"
            class="form-input"
          />
        </div>

        <div v-if="filteredItems.length === 0" class="bg-blue-50 p-4 rounded text-center">
          No available items found
        </div>
        <div v-else class="space-y-2 max-h-96 overflow-y-auto">
          <div
            v-for="item in filteredItems"
            :key="item.id"
            @click="selectedItem = item"
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
              </div>
              <span :class="`px-2 py-1 rounded text-sm ${getStatusColor(item.status)}`">
                {{ item.status }}
              </span>
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

            <button
              @click="handleSubmitRequest"
              class="btn w-full"
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

    const loadAvailableItems = async () => {
      const available = await inventoryService.getAvailableItems()
      availableItems.value = available
    }

    const filteredItems = computed(() =>
      availableItems.value.filter(item =>
        item.name.toLowerCase().includes(searchText.value.toLowerCase()) ||
        item.id.toLowerCase().includes(searchText.value.toLowerCase())
      )
    )

    const handleSubmitRequest = async () => {
      if (!selectedItem.value || !reason.value) {
        alert('Please select an item and provide a reason')
        return
      }

      const currentUser = authService.getCurrentUser()
      const borrowerID = currentUser?.id || 'UNKNOWN'
      await borrowingService.createRequest(selectedItem.value.id, borrowerID, reason.value)
      submitted.value = true
      setTimeout(() => {
        selectedItem.value = null
        reason.value = ''
        submitted.value = false
        loadAvailableItems()
      }, 2000)
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
      filteredItems,
      handleSubmitRequest,
      getStatusColor,
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
