<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">Approve Borrowing Requests</h2>
      <button @click="exportRequests" class="btn">Export to Excel</button>
    </div>

    <div v-if="groupedRequests.length === 0" class="bg-blue-50 p-4 rounded text-center">
      No pending requests
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full border-collapse border border-gray-300 table-striped">
        <thead class="bg-gray-200">
          <tr>
            <th class="border p-2 text-left">Request ID</th>
            <th class="border p-2 text-left">Item Name</th>
            <th class="border p-2 text-left">Borrower</th>
            <th class="border p-2 text-left">Request Date</th>
            <th class="border p-2 text-left">Reason</th>
            <th class="border p-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="group in paginatedRequests" :key="group.parent.id">
            <!-- Parent / standalone request row -->
            <tr class="bg-white">
              <td class="border p-2 font-semibold">{{ group.parent.id }}</td>
              <td class="border p-2 font-semibold">
                {{ group.parent.itemName }}
                <span v-if="group.children.length > 0" class="ml-2 text-xs text-blue-600 font-normal">
                  (+ {{ group.children.length }} component{{ group.children.length > 1 ? 's' : '' }})
                </span>
              </td>
              <td class="border p-2">{{ group.parent.borrowerID }}</td>
              <td class="border p-2">{{ formatDate(group.parent.requestDate) }}</td>
              <td class="border p-2">{{ group.parent.reason }}</td>
              <td class="border p-2 text-center whitespace-nowrap">
                <button
                  @click="selectedRequest = group.parent.id"
                  class="btn btn-outline-success text-sm"
                >
                  Approve{{ group.children.length > 0 ? ' All' : '' }}
                </button>
                <button
                  @click="showRejectForm = group.parent.id"
                  class="btn btn-outline-danger text-sm ml-2"
                >
                  Reject{{ group.children.length > 0 ? ' All' : '' }}
                </button>
              </td>
            </tr>
            <!-- Child component rows (indented) -->
            <tr v-for="child in group.children" :key="child.id" class="bg-gray-50">
              <td class="border p-2 pl-6 text-gray-500 text-sm">↳ {{ child.id }}</td>
              <td class="border p-2 pl-6 text-gray-600 text-sm">{{ child.itemName }}</td>
              <td class="border p-2 text-gray-500 text-sm">{{ child.borrowerID }}</td>
              <td class="border p-2 text-gray-500 text-sm">{{ formatDate(child.requestDate) }}</td>
              <td class="border p-2 text-gray-500 text-sm italic">{{ child.reason }}</td>
              <td class="border p-2 text-center text-gray-400 text-xs">
                Auto with parent
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <PaginationControl
        v-model:currentPage="currentPage"
        :totalItems="groupedRequests.length"
        :pageSize="pageSize"
      />
    </div>

    <!-- Approve Modal -->
    <div v-if="selectedRequest" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 class="text-lg font-bold mb-4">Approve Request</h3>
        <div class="mb-4">
          <label class="block text-gray-700 text-sm font-medium mb-2">Return Date</label>
          <input
            type="date"
            v-model="returnDate"
            class="form-input"
          />
        </div>
        <div class="mb-4">
          <label class="block text-gray-700 text-sm font-medium mb-2">Location</label>
          <DropdownWithOther
            v-model="approveLocation"
            :options="locationOptions"
            placeholder="Enter new location..."
            @add-option="addLocation"
          />
        </div>
        <div class="mb-4">
          <RemarkBox
            v-model="approveRemark"
            label="Remark"
            placeholder="Add any notes..."
          />
        </div>
        <div class="flex gap-2">
          <button
            @click="handleApprove(selectedRequest)"
            class="btn btn-outline-success flex-1"
          >
            Approve
          </button>
          <button
            @click="selectedRequest = null; returnDate = ''; approveRemark = ''; approveLocation = locationOptions[0]"
            class="btn btn-outline-secondary flex-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <div v-if="showRejectForm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 class="text-lg font-bold mb-4">Reject Request</h3>
        <div class="mb-4">
          <label class="block text-gray-700 text-sm font-medium mb-2">Reason</label>
          <textarea
            v-model="rejectReason"
            class="form-input"
            rows="4"
            placeholder="Enter rejection reason..."
          />
        </div>
        <div class="flex gap-2">
          <button
            @click="handleReject(showRejectForm)"
            class="btn btn-outline-danger flex-1"
          >
            Reject
          </button>
          <button
            @click="showRejectForm = null; rejectReason = ''"
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
import { inventoryService, borrowingService } from '../utils/services'
import { formatDate, exportToExcel } from '../utils/helpers'
import { locations as defaultLocations } from '../data/mockData'
import PaginationControl from '../components/PaginationControl.vue'
import DropdownWithOther from '../components/DropdownWithOther.vue'
import RemarkBox from '../components/RemarkBox.vue'

export default {
  components: { PaginationControl, DropdownWithOther, RemarkBox },
  setup() {
    const requests = ref([])
    const selectedRequest = ref(null)
    const returnDate = ref('')
    const rejectReason = ref('')
    const showRejectForm = ref(null)
    const currentPage = ref(1)
    const pageSize = 10
    const locationOptions = ref([...defaultLocations])
    const approveLocation = ref(defaultLocations[0])
    const approveRemark = ref('')

    // Group requests: parent requests with their children nested underneath
    const groupedRequests = computed(() => {
      const allReqs = requests.value
      // Collect IDs of child requests (those with a parentRequestId)
      const childIds = new Set(allReqs.filter(r => r.parentRequestId).map(r => r.id))
      // Parent/standalone requests = those that are NOT children
      const parents = allReqs.filter(r => !childIds.has(r.id) || !r.parentRequestId)
        .filter(r => !r.parentRequestId) // true standalone / parent
      // Also include standalone requests that have no parent (non-child)
      const standalones = allReqs.filter(r => !r.parentRequestId && !parents.find(p => p.id === r.id))

      const groups = []
      // Build groups for parent requests
      parents.forEach(parent => {
        const children = allReqs.filter(r => r.parentRequestId === parent.id)
        groups.push({ parent, children })
      })
      // Add standalone requests that are children without a matching parent in pending
      allReqs.filter(r => r.parentRequestId && !parents.find(p => p.id === r.parentRequestId))
        .forEach(orphan => {
          groups.push({ parent: orphan, children: [] })
        })

      return groups
    })

    const paginatedRequests = computed(() => {
      const start = (currentPage.value - 1) * pageSize
      return groupedRequests.value.slice(start, start + pageSize)
    })

    const addLocation = (val) => {
      if (!locationOptions.value.includes(val)) {
        locationOptions.value.splice(locationOptions.value.length - 1, 0, val)
      }
    }

    const loadPendingRequests = () => {
      const pendingReqs = borrowingService.getPendingRequests()
      requests.value = pendingReqs.map(req => ({
        ...req,
        itemName: inventoryService.getItemById(req.itemID)?.name || 'Unknown Item'
      }))
    }

    const handleApprove = (requestId) => {
      if (!returnDate.value) {
        alert('Please set a return date')
        return
      }
      const req = borrowingService.approveRequest(requestId, returnDate.value)
      if (req) {
        req.notes = approveRemark.value
        // Update item location if specified
        const item = inventoryService.getItemById(req.itemID)
        if (item && approveLocation.value) {
          inventoryService.updateItem(item.id, { ...item, location: approveLocation.value })
        }
        // Also update location for auto-approved child requests
        const childReqs = borrowingService.getAllRequests().filter(r => r.parentRequestId === requestId && r.status === 'Approved')
        childReqs.forEach(childReq => {
          childReq.notes = approveRemark.value
          const childItem = inventoryService.getItemById(childReq.itemID)
          if (childItem && approveLocation.value) {
            inventoryService.updateItem(childItem.id, { ...childItem, location: approveLocation.value })
          }
        })
      }
      selectedRequest.value = null
      returnDate.value = ''
      approveRemark.value = ''
      approveLocation.value = locationOptions.value[0]
      loadPendingRequests()
    }

    const handleReject = (requestId) => {
      if (!rejectReason.value) {
        alert('Please provide a rejection reason')
        return
      }
      borrowingService.rejectRequest(requestId, rejectReason.value)
      showRejectForm.value = null
      rejectReason.value = ''
      loadPendingRequests()
    }

    const exportRequests = () => {
      exportToExcel(requests.value, 'borrow_requests.xlsx')
    }

    onMounted(() => {
      loadPendingRequests()
    })

    return {
      requests,
      groupedRequests,
      selectedRequest,
      returnDate,
      rejectReason,
      showRejectForm,
      currentPage,
      pageSize,
      paginatedRequests,
      locationOptions,
      approveLocation,
      approveRemark,
      addLocation,
      handleApprove,
      handleReject,
      exportRequests,
      formatDate,
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
