<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">Borrowing History</h2>
      <button @click="exportHistory" class="btn">Export to Excel</button>
    </div>

    <div class="mb-4 flex flex-wrap gap-2 items-end">
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="status in ['All', 'Approved', 'Returned', 'Pending', 'Rejected']"
          :key="status"
          @click="filter = status; currentPage = 1"
          :class="`px-4 py-2 rounded ${
            filter === status
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`"
        >
          {{ status }}
        </button>
      </div>
    </div>

    <div v-if="sortedHistory.length === 0" class="bg-blue-50 p-4 rounded text-center">
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
            <th class="border p-2 text-left cursor-pointer select-none hover:bg-gray-300" @click="toggleSort('requestDate')">
              Request Date <span class="sort-icon">{{ getSortIcon('requestDate') }}</span>
            </th>
            <th class="border p-2 text-left cursor-pointer select-none hover:bg-gray-300" @click="toggleSort('approvalDate')">
              Approval Date <span class="sort-icon">{{ getSortIcon('approvalDate') }}</span>
            </th>
            <th class="border p-2 text-left cursor-pointer select-none hover:bg-gray-300" @click="toggleSort('returnDate')">
              Return Date <span class="sort-icon">{{ getSortIcon('returnDate') }}</span>
            </th>
            <th class="border p-2 text-left cursor-pointer select-none hover:bg-gray-300" @click="toggleSort('returnedDate')">
              Returned <span class="sort-icon">{{ getSortIcon('returnedDate') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in paginatedHistory" :key="record.id">
            <td class="border p-2">{{ record.id }}</td>
            <td class="border p-2">{{ record.itemName }}</td>
            <td class="border p-2">{{ record.borrowerName }} ({{ record.borrowerID }})</td>
            <td class="border p-2">
              <span :class="`px-2 py-1 rounded text-sm ${getStatusColor(record.status)}`">
                {{ record.status }}
              </span>
            </td>
            <td class="border p-2 text-sm">{{ formatDateTime(record.requestDate) }}</td>
            <td class="border p-2 text-sm">{{ formatDateTime(record.approvalDate) }}</td>
            <td class="border p-2 text-sm">{{ formatDateTime(record.returnDate) }}</td>
            <td class="border p-2 text-sm">{{ formatDateTime(record.returnedDate) }}</td>
          </tr>
        </tbody>
      </table>
      <PaginationControl
        v-model:currentPage="currentPage"
        :totalItems="sortedHistory.length"
        :pageSize="pageSize"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { borrowingService, inventoryService } from '../utils/services'
import { formatDate, formatDateTime, getStatusColor, exportToExcel } from '../utils/helpers'
import { mockUsers } from '../data/mockData'
import PaginationControl from '../components/PaginationControl.vue'

export default {
  components: { PaginationControl },
  setup() {
    const history = ref([])
    const filter = ref('All')
    const sortField = ref('requestDate')
    const sortDir = ref('desc')
    const currentPage = ref(1)
    const pageSize = 10

    const toggleSort = (field) => {
      if (sortField.value === field) {
        sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
      } else {
        sortField.value = field
        sortDir.value = 'desc'
      }
      currentPage.value = 1
    }

    const getSortIcon = (field) => {
      if (sortField.value !== field) return '⇅'
      return sortDir.value === 'asc' ? '▲' : '▼'
    }

    const getUserName = (id) => {
      const u = mockUsers.find(u => u.id === id)
      return u ? u.name : id
    }

    const loadHistory = () => {
      const allRequests = borrowingService.getAllRequests()
      history.value = allRequests.map(req => ({
        ...req,
        itemName: inventoryService.getItemById(req.itemID)?.name || 'Unknown Item',
        borrowerName: getUserName(req.borrowerID)
      }))
    }

    const filteredHistory = computed(() =>
      filter.value === 'All'
        ? history.value
        : history.value.filter(h => h.status === filter.value)
    )

    const sortedHistory = computed(() => {
      const sorted = [...filteredHistory.value]
      sorted.sort((a, b) => {
        const aVal = a[sortField.value] || ''
        const bVal = b[sortField.value] || ''
        if (sortDir.value === 'asc') return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      })
      return sorted
    })

    const paginatedHistory = computed(() => {
      const start = (currentPage.value - 1) * pageSize
      return sortedHistory.value.slice(start, start + pageSize)
    })

    const exportHistory = () => {
      exportToExcel(sortedHistory.value, 'borrow_history.xlsx')
    }

    onMounted(() => {
      loadHistory()
    })

    return {
      history,
      filter,
      sortField,
      sortDir,
      toggleSort,
      getSortIcon,
      currentPage,
      pageSize,
      sortedHistory,
      paginatedHistory,
      exportHistory,
      formatDate,
      formatDateTime,
      getStatusColor,
    }
  }
}
</script>

<style scoped>
@import '../index.css';
.sort-icon {
  display: inline-block;
  width: 14px;
  text-align: center;
  font-size: 11px;
  color: #6b7280;
}
thead th:hover .sort-icon {
  color: #1f2937;
}
</style>
