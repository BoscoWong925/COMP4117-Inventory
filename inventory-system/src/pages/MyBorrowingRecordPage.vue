<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">My Borrowing Record</h2>
      <button @click="exportRecords" class="btn">Export to Excel</button>
    </div>

    <div v-if="records.length === 0" class="bg-blue-50 p-4 rounded text-center">
      No borrowing records
    </div>
    <div v-else class="space-y-4">
      <div v-for="record in records" :key="record.id" class="border border-gray-300 rounded p-4 bg-white">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
          <div>
            <p class="text-xs text-gray-500">Request ID</p>
            <p class="font-medium">{{ record.id }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500">Item</p>
            <p class="font-medium">{{ record.itemName }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500">Status</p>
            <span :class="`px-2 py-1 rounded text-sm ${getStatusColor(record.status)}`">
              {{ record.status }}
            </span>
          </div>
          <div>
            <p class="text-xs text-gray-500">Request Date</p>
            <p class="font-medium">{{ formatDate(record.requestDate) }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
          <div>
            <p class="text-xs text-gray-500">Approval Date</p>
            <p class="font-medium">{{ formatDate(record.approvalDate) || '-' }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500">Return Date</p>
            <p class="font-medium">{{ formatDate(record.returnDate) || '-' }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500">Returned</p>
            <p class="font-medium">{{ formatDate(record.returnedDate) || '-' }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500">Reason</p>
            <p class="font-medium text-sm">{{ record.reason }}</p>
          </div>
        </div>

        <button
          v-if="record.status === 'Approved' && !record.returnedDate"
          @click="handleReturn(record.id)"
          class="btn-success text-sm"
        >
          Return Item
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { borrowingService, inventoryService } from '../utils/services'
import { formatDate, getStatusColor, exportToExcel } from '../utils/helpers'

export default {
  setup() {
    const records = ref([])

    const loadRecords = () => {
      const userID = 'S00123456'
      const userRequests = borrowingService.getRequestsForUser(userID)
      records.value = userRequests.map(req => ({
        ...req,
        itemName: inventoryService.getItemById(req.itemID)?.name || 'Unknown Item'
      }))
    }

    const handleReturn = (requestID) => {
      if (window.confirm('Are you sure you want to return this item?')) {
        borrowingService.returnItem(requestID)
        loadRecords()
      }
    }

    const exportRecords = () => {
      exportToExcel(records.value, 'my_borrowing_record.xlsx')
    }

    onMounted(() => {
      loadRecords()
    })

    return {
      records,
      handleReturn,
      exportRecords,
      formatDate,
      getStatusColor,
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
