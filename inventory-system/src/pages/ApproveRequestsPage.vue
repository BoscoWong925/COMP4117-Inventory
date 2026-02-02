<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">Approve Borrowing Requests</h2>
      <button @click="exportRequests" class="btn">Export to Excel</button>
    </div>

    <div v-if="requests.length === 0" class="bg-blue-50 p-4 rounded text-center">
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
          <tr v-for="req in requests" :key="req.id">
            <td class="border p-2">{{ req.id }}</td>
            <td class="border p-2">{{ req.itemName }}</td>
            <td class="border p-2">{{ req.borrowerID }}</td>
            <td class="border p-2">{{ formatDate(req.requestDate) }}</td>
            <td class="border p-2">{{ req.reason }}</td>
            <td class="border p-2 text-center">
              <button
                @click="selectedRequest = req.id"
                class="btn text-sm"
              >
                Approve
              </button>
              <button
                @click="showRejectForm = req.id"
                class="btn-danger text-sm ml-2"
              >
                Reject
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="selectedRequest" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 class="text-lg font-bold mb-4">Set Return Date</h3>
        <div class="mb-4">
          <label class="block text-gray-700 text-sm font-medium mb-2">Return Date</label>
          <input
            type="date"
            v-model="returnDate"
            class="form-input"
          />
        </div>
        <div class="flex gap-2">
          <button
            @click="handleApprove(selectedRequest)"
            class="btn-success flex-1"
          >
            Approve
          </button>
          <button
            @click="selectedRequest = null; returnDate = ''"
            class="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 flex-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <div v-if="showRejectForm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
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
            class="btn-danger flex-1"
          >
            Reject
          </button>
          <button
            @click="showRejectForm = null; rejectReason = ''"
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
import { ref, onMounted } from 'vue'
import { inventoryService, borrowingService } from '../utils/services'
import { formatDate, exportToExcel } from '../utils/helpers'

export default {
  setup() {
    const requests = ref([])
    const selectedRequest = ref(null)
    const returnDate = ref('')
    const rejectReason = ref('')
    const showRejectForm = ref(null)

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
      borrowingService.approveRequest(requestId, returnDate.value)
      selectedRequest.value = null
      returnDate.value = ''
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
      selectedRequest,
      returnDate,
      rejectReason,
      showRejectForm,
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
