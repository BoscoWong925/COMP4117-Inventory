<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">Borrowing History</h2>
      <button @click="exportHistory" class="btn">Export to Excel</button>
    </div>

    <div class="mb-4 flex gap-2">
      <button
        v-for="status in ['All', 'Approved', 'Returned', 'Pending', 'Rejected']"
        :key="status"
        @click="filter = status"
        :class="`px-4 py-2 rounded ${
          filter === status
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`"
      >
        {{ status }}
      </button>
    </div>

    <div v-if="filteredHistory.length === 0" class="bg-blue-50 p-4 rounded text-center">
      No records found
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full border-collapse border border-gray-300 table-striped">
        <thead class="bg-gray-200">
          <tr>
            <th class="border p-2 text-left">Request ID</th>
            <th class="border p-2 text-left">Item</th>
            <th class="border p-2 text-left">Borrower</th>
            <th class="border p-2 text-left">Status</th>
            <th class="border p-2 text-left">Request Date</th>
            <th class="border p-2 text-left">Approval Date</th>
            <th class="border p-2 text-left">Return Date</th>
            <th class="border p-2 text-left">Returned</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in filteredHistory" :key="record.id">
            <td class="border p-2">{{ record.id }}</td>
            <td class="border p-2">{{ record.itemName }}</td>
            <td class="border p-2">{{ record.borrowerID }}</td>
            <td class="border p-2">
              <span :class="`px-2 py-1 rounded text-sm ${getStatusColor(record.status)}`">
                {{ record.status }}
              </span>
            </td>
            <td class="border p-2">{{ formatDate(record.requestDate) }}</td>
            <td class="border p-2">{{ formatDate(record.approvalDate) }}</td>
            <td class="border p-2">{{ formatDate(record.returnDate) }}</td>
            <td class="border p-2">{{ formatDate(record.returnedDate) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { borrowingService, inventoryService } from '../utils/services'
import { formatDate, getStatusColor, exportToExcel } from '../utils/helpers'

export default {
  setup() {
    const history = ref([])
    const filter = ref('All')

    const loadHistory = () => {
      const allRequests = borrowingService.getAllRequests()
      history.value = allRequests.map(req => ({
        ...req,
        itemName: inventoryService.getItemById(req.itemID)?.name || 'Unknown Item'
      }))
    }

    const filteredHistory = computed(() =>
      filter.value === 'All'
        ? history.value
        : history.value.filter(h => h.status === filter.value)
    )

    const exportHistory = () => {
      exportToExcel(filteredHistory.value, 'borrow_history.xlsx')
    }

    onMounted(() => {
      loadHistory()
    })

    return {
      history,
      filter,
      filteredHistory,
      exportHistory,
      formatDate,
      getStatusColor,
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
