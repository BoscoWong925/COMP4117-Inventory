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

    <div v-if="groupedItems.length === 0" class="bg-blue-50 p-4 rounded text-center">
      No items currently borrowed
    </div>
    <div v-else class="space-y-4">
      <div
        v-for="group in groupedItems"
        :key="group.parent.item.id"
        class="border border-gray-300 rounded bg-white hover:shadow-md transition"
      >
        <!-- Parent item -->
        <div class="p-4">
          <div class="mb-3">
            <p class="text-xs text-gray-500 uppercase">Item ID</p>
            <p class="font-bold">{{ group.parent.item.id }}</p>
            <p class="font-medium mt-1">
              {{ group.parent.item.name }}
              <span v-if="group.children.length > 0" class="ml-2 text-xs text-blue-600 font-normal">
                (+ {{ group.children.length }} component{{ group.children.length > 1 ? 's' : '' }})
              </span>
            </p>
          </div>

          <div class="space-y-2 mb-4 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Borrower:</span>
              <span class="font-medium">{{ group.parent.item.currentBorrower }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Status:</span>
              <span :class="`px-2 py-1 rounded text-xs ${getStatusColor(group.parent.item.status)}`">
                {{ group.parent.item.status }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Location:</span>
              <span class="font-medium">{{ group.parent.item.location }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Expected Return:</span>
              <span class="font-medium">{{ formatDate(group.parent.request.returnDate) }}</span>
            </div>
          </div>

          <!-- Child component items -->
          <div v-if="group.children.length > 0" class="mb-4 border-t pt-3">
            <p class="text-xs text-gray-500 font-semibold mb-2 uppercase">Linked Components</p>
            <div v-for="child in group.children" :key="child.item.id" class="flex items-center justify-between py-1 pl-4 text-sm text-gray-600 border-l-2 border-blue-200 mb-1">
              <span>↳ {{ child.item.name }} <span class="text-gray-400">({{ child.item.id }})</span></span>
              <span class="text-xs text-gray-400 italic">Auto with parent</span>
            </div>
          </div>

          <button
            @click="handleReturnItem(group)"
            class="btn btn-success w-full text-sm"
          >
            Mark{{ group.children.length > 0 ? ' All' : '' }} as Returned
          </button>
        </div>
      </div>
    </div>

    <div v-if="showConfirm && selectedGroup" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 class="text-lg font-bold mb-4">Confirm Item Return</h3>
        <div class="mb-4 p-3 bg-gray-50 rounded">
          <p class="text-sm"><strong>Item:</strong> {{ selectedGroup.parent.item.name }}</p>
          <p class="text-sm"><strong>Borrower:</strong> {{ selectedGroup.parent.item.currentBorrower }}</p>
          <p class="text-sm"><strong>ID:</strong> {{ selectedGroup.parent.item.id }}</p>
          <div v-if="selectedGroup.children.length > 0" class="mt-2 pt-2 border-t">
            <p class="text-xs text-gray-500 font-semibold mb-1">+ Components to be returned:</p>
            <p v-for="child in selectedGroup.children" :key="child.item.id" class="text-sm text-gray-600 pl-2">
              ↳ {{ child.item.name }} ({{ child.item.id }})
            </p>
          </div>
        </div>
        <p class="text-gray-600 mb-6">Mark {{ selectedGroup.children.length > 0 ? 'all these items' : 'this item' }} as returned?</p>
        <div class="flex gap-2">
          <button
            @click="confirmReturn"
            class="btn btn-outline-success flex-1"
          >
            Confirm Return
          </button>
          <button
            @click="showConfirm = false; selectedGroup = null"
            class="btn btn-outline-secondary flex-1"
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
    const selectedGroup = ref(null)
    const showConfirm = ref(false)

    const loadBorrowedItems = async () => {
      try {
        // Load items and requests in parallel
        const [lentOut, allReqs] = await Promise.all([
          inventoryService.getLentOutItems(),
          borrowingService.getAllRequests({ status: 'Approved', pageSize: 10000 })
        ])
        const withRequests = lentOut.map(item => {
          const request = allReqs.find(r => r.itemID === item.id && r.status === 'Approved')
          return { item, request }
        }).filter(({ request }) => request)
        borrowedItems.value = withRequests
      } catch (e) {
        console.error('Failed to load borrowed items:', e)
      }
    }

    const filteredItems = computed(() =>
      borrowedItems.value.filter(({ item }) =>
        item.name.toLowerCase().includes(searchText.value.toLowerCase()) ||
        item.id.toLowerCase().includes(searchText.value.toLowerCase())
      )
    )

    // Group items: parent requests with their child component requests
    const groupedItems = computed(() => {
      const allItems = filteredItems.value
      const childRequestIds = new Set()
      // Find all child request item IDs
      allItems.forEach(({ request }) => {
        if (request && request.parentRequestId) {
          childRequestIds.add(request.itemID)
        }
      })

      const groups = []
      allItems.forEach(({ item, request }) => {
        if (!request) return
        // Skip child items - they'll be nested under parent
        if (request.parentRequestId) return

        // Find children for this parent request
        const children = allItems.filter(({ request: childReq }) =>
          childReq && childReq.parentRequestId === request.id
        )
        groups.push({ parent: { item, request }, children: children.map(c => ({ item: c.item, request: c.request })) })
      })

      // Add orphan children (whose parent is not in current filtered list)
      allItems.forEach(({ item, request }) => {
        if (!request || !request.parentRequestId) return
        const parentInList = allItems.find(({ request: pReq }) => pReq && pReq.id === request.parentRequestId)
        if (!parentInList) {
          groups.push({ parent: { item, request }, children: [] })
        }
      })

      return groups
    })

    const handleReturnItem = (group) => {
      selectedGroup.value = group
      showConfirm.value = true
    }

    const confirmReturn = async () => {
      if (selectedGroup.value && selectedGroup.value.parent.request) {
        try {
          await borrowingService.returnItem(selectedGroup.value.parent.request.id)
        } catch (e) {
          console.error('Failed to return item:', e)
        }
        showConfirm.value = false
        selectedGroup.value = null
        loadBorrowedItems()
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
      selectedGroup,
      showConfirm,
      filteredItems,
      groupedItems,
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
