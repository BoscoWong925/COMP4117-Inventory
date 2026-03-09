<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">Hand-Over Tool (Status Updates)</h2>
      <button @click="exportItems" class="btn">Export to Excel</button>
    </div>

    <div class="mb-4">
      <label class="form-label">Search Items</label>
      <input
        type="text"
        placeholder="Search by item name or ID..."
        v-model="searchText"
        class="form-input"
      />
    </div>

    <div v-if="groupedItems.length === 0" class="empty-state">
      No items currently borrowed
    </div>
    <div v-else class="space-y-4">
      <div
        v-for="group in groupedItems"
        :key="group.parent.item.id"
        class="theme-card"
      >
        <!-- Parent item -->
        <div class="p-4">
          <div class="mb-3">
            <p class="field-label">Item ID</p>
            <p class="font-bold">{{ group.parent.item.id }}</p>
            <p class="font-medium mt-1">
              {{ group.parent.item.name }}
              <span v-if="group.children.length > 0" class="ml-2 text-xs text-accent-subtle font-normal">
                (+ {{ group.children.length }} component{{ group.children.length > 1 ? 's' : '' }})
              </span>
            </p>
          </div>

          <div class="space-y-2 mb-4 text-sm">
            <div class="flex justify-between">
              <span class="text-secondary">Borrower:</span>
              <span class="font-medium">{{ group.parent.item.currentBorrower }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-secondary">Status:</span>
              <span :class="`px-2 py-1 rounded text-xs ${getStatusColor(group.parent.item.status)}`">
                {{ group.parent.item.status }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-secondary">Location:</span>
              <span class="font-medium">{{ group.parent.item.location }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-secondary">Expected Return:</span>
              <span class="font-medium">{{ formatDate(group.parent.request.returnDate) }}</span>
            </div>
          </div>

          <!-- Child component items -->
          <div v-if="group.children.length > 0" class="mb-4 border-t pt-3">
            <p class="field-label font-semibold mb-2">Linked Components</p>
            <div v-for="child in group.children" :key="child.item.id" class="flex items-center justify-between py-1 pl-4 text-sm text-secondary child-indicator mb-1">
              <span>↳ {{ child.item.name }} <span class="text-muted">({{ child.item.id }})</span></span>
              <span class="text-xs text-muted italic">Auto with parent</span>
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

    <div v-if="showConfirm && selectedGroup" class="fixed inset-0 modal-overlay flex items-center justify-center p-4">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Confirm Item Return</h3>
        <div class="mb-4 p-3 theme-section">
          <p class="text-sm"><strong>Item:</strong> {{ selectedGroup.parent.item.name }}</p>
          <p class="text-sm"><strong>Borrower:</strong> {{ selectedGroup.parent.item.currentBorrower }}</p>
          <p class="text-sm"><strong>ID:</strong> {{ selectedGroup.parent.item.id }}</p>
          <div v-if="selectedGroup.children.length > 0" class="mt-2 pt-2 border-t">
            <p class="field-label font-semibold mb-1">+ Components to be returned:</p>
            <p v-for="child in selectedGroup.children" :key="child.item.id" class="text-sm text-secondary pl-2">
              ↳ {{ child.item.name }} ({{ child.item.id }})
            </p>
          </div>
        </div>
        <p class="text-secondary mb-6">Mark {{ selectedGroup.children.length > 0 ? 'all these items' : 'this item' }} as returned?</p>
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
import { ref, computed, onMounted, watch } from 'vue'
import { borrowingService, inventoryService } from '../utils/services'
import { formatDate, getStatusColor, exportToExcel } from '../utils/helpers'

export default {
  setup() {
    const borrowedItems = ref([])
    const searchText = ref('')
    const selectedGroup = ref(null)
    const showConfirm = ref(false)
    let searchTimer = null

    const loadBorrowedItems = async () => {
      try {
        const params = { pageSize: 9999 }
        if (searchText.value) params.search = searchText.value
        const { items: lentOut } = await inventoryService.getLentOutItems(params)
        const { requests: allReqs } = await borrowingService.getAllRequests({ status: 'Approved', pageSize: 9999 })
        const withRequests = lentOut.map(item => {
          const request = allReqs.find(r => r.itemID === item.id && r.status === 'Approved')
          return { item, request }
        }).filter(({ request }) => request)
        borrowedItems.value = withRequests
      } catch (e) {
        console.error('Failed to load borrowed items:', e)
      }
    }

    // Group items: parent requests with their child component requests
    const groupedItems = computed(() => {
      const allItems = borrowedItems.value
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

    // Debounced search watcher
    watch(searchText, () => {
      clearTimeout(searchTimer)
      searchTimer = setTimeout(() => loadBorrowedItems(), 400)
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
