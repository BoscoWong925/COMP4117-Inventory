<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">Hand-Over Tool (Status Updates)</h2>
      <button @click="exportItems" class="btn">Export to Excel</button>
    </div>

    <div class="mb-4">
      <label class="block text-gray-700 text-sm font-medium mb-2">Search Items</label>
      <input
        type="text"
        placeholder="Search by item name or ID..."
        v-model="searchText"
        class="form-input"
      />
    </div>

    <div v-if="filteredItems.length === 0" class="bg-blue-50 p-4 rounded text-center">
      No items currently borrowed
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="{ item, request } in filteredItems"
        :key="item.id"
        class="border border-gray-300 rounded p-4 bg-white hover:shadow-md transition"
      >
        <div class="mb-3">
          <p class="text-xs text-gray-500 uppercase">Item ID</p>
          <p class="font-bold">{{ item.id }}</p>
          <p class="font-medium mt-1">{{ item.name }}</p>
        </div>

        <div class="space-y-2 mb-4 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Borrower:</span>
            <span class="font-medium">{{ item.currentBorrower }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Status:</span>
            <span :class="`px-2 py-1 rounded text-xs ${getStatusColor(item.status)}`">
              {{ item.status }}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Location:</span>
            <span class="font-medium">{{ item.location }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Expected Return:</span>
            <span class="font-medium">{{ formatDate(request.returnDate) }}</span>
          </div>
        </div>

        <button
          @click="handleReturnItem({ item, request })"
          class="btn-success w-full text-sm"
        >
          Mark as Returned
        </button>
      </div>
    </div>

    <div v-if="showConfirm && selectedItem" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 class="text-lg font-bold mb-4">Confirm Item Return</h3>
        <div class="mb-4 p-3 bg-gray-50 rounded">
          <p class="text-sm"><strong>Item:</strong> {{ selectedItem.item.name }}</p>
          <p class="text-sm"><strong>Borrower:</strong> {{ selectedItem.item.currentBorrower }}</p>
          <p class="text-sm"><strong>ID:</strong> {{ selectedItem.item.id }}</p>
        </div>
        <p class="text-gray-600 mb-6">Mark this item as returned?</p>
        <div class="flex gap-2">
          <button
            @click="confirmReturn"
            class="btn-success flex-1"
          >
            Confirm Return
          </button>
          <button
            @click="showConfirm = false; selectedItem = null"
            class="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 flex-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { borrowingService, inventoryService } from '../utils/services'
import { formatDate, getStatusColor, exportToExcel } from '../utils/helpers'

export default {
  setup() {
    const borrowedItems = ref([])
    const searchText = ref('')
    const selectedItem = ref(null)
    const showConfirm = ref(false)

    const loadBorrowedItems = async () => {
      const lentOut = await inventoryService.getLentOutItems()
      const allRequests = await borrowingService.getAllRequests()
      const withRequests = lentOut.map(item => {
        const request = allRequests.find(r => r.itemID === item.id && r.status === 'Approved')
        return { item, request }
      }).filter(({ request }) => request)
      borrowedItems.value = withRequests
    }

    const filteredItems = computed(() =>
      borrowedItems.value.filter(({ item }) =>
        item.name.toLowerCase().includes(searchText.value.toLowerCase()) ||
        item.id.toLowerCase().includes(searchText.value.toLowerCase())
      )
    )

    const handleReturnItem = (itemData) => {
      selectedItem.value = itemData
      showConfirm.value = true
    }

    const confirmReturn = async () => {
      if (selectedItem.value && selectedItem.value.request) {
        await borrowingService.returnItem(selectedItem.value.request.id)
        showConfirm.value = false
        selectedItem.value = null
        await loadBorrowedItems()
      }
    }

    const exportItems = () => {
      const exportData = borrowedItems.value.map(({ item, request }) => ({
        'Item ID': item.id,
        'Name': item.name,
        'Borrower': item.currentBorrower,
        'Status': item.status,
        'Location': item.location,
        'Request ID': request.id,
        'Approval Date': formatDate(request.approvalDate),
        'Expected Return': formatDate(request.returnDate)
      }))
      exportToExcel(exportData, 'hand_over_items.xlsx')
    }

    onMounted(() => {
      loadBorrowedItems()
    })

    return {
      borrowedItems,
      searchText,
      selectedItem,
      showConfirm,
      filteredItems,
      handleReturnItem,
      confirmReturn,
      exportItems,
      formatDate,
      getStatusColor,
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
