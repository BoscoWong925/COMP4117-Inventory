<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">Borrowing History</h2>
      <div class="flex gap-2">
        <button @click="showFilters = !showFilters" class="btn btn-outline-primary">
          {{ showFilters ? 'Hide Filters' : 'Show Filters' }}
        </button>
        <button @click="exportHistory" class="btn">Export to Excel</button>
      </div>
    </div>

    <!-- Search Filter Panel -->
    <div v-if="showFilters" class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-sm font-semibold text-gray-700">Search &amp; Filter</h3>
        <button @click="clearAllFilters" class="text-xs px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500">Clear All</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <!-- Request ID (text) -->
        <div>
          <label class="block text-gray-600 text-xs font-medium mb-1">Request ID</label>
          <input v-model="filters.requestId" type="text" class="form-input text-sm" placeholder="e.g. REQ-001" />
        </div>
        <!-- Item Name (text) -->
        <div>
          <label class="block text-gray-600 text-xs font-medium mb-1">Item Name</label>
          <input v-model="filters.itemName" type="text" class="form-input text-sm" placeholder="Search item..." />
        </div>
        <!-- Borrower (text) -->
        <div>
          <label class="block text-gray-600 text-xs font-medium mb-1">Borrower</label>
          <input v-model="filters.borrower" type="text" class="form-input text-sm" placeholder="Name or ID..." />
        </div>
        <!-- Status (select) -->
        <div>
          <label class="block text-gray-600 text-xs font-medium mb-1">Status</label>
          <select v-model="filters.status" class="form-select text-sm">
            <option value="">All Statuses</option>
            <option v-for="s in ['Approved', 'Returned', 'Pending', 'Rejected']" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <!-- Request Date (date) -->
        <div>
          <label class="block text-gray-600 text-xs font-medium mb-1">Request Date</label>
          <input v-model="filters.requestDate" type="date" class="form-input text-sm" />
        </div>
        <!-- Approval Date (date) -->
        <div>
          <label class="block text-gray-600 text-xs font-medium mb-1">Approval Date</label>
          <input v-model="filters.approvalDate" type="date" class="form-input text-sm" />
        </div>
        <!-- Return Date (date) -->
        <div>
          <label class="block text-gray-600 text-xs font-medium mb-1">Return Date</label>
          <input v-model="filters.returnDate" type="date" class="form-input text-sm" />
        </div>
        <!-- Returned Date (date) -->
        <div>
          <label class="block text-gray-600 text-xs font-medium mb-1">Returned Date</label>
          <input v-model="filters.returnedDate" type="date" class="form-input text-sm" />
        </div>
      </div>
    </div>

    <!-- Quick Status Tabs -->
    <div class="mb-4 flex flex-wrap gap-2 items-end">
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="status in ['All', 'Approved', 'Returned', 'Pending', 'Rejected']"
          :key="status"
          @click="filters.status = status === 'All' ? '' : status; currentPage = 1"
          :class="`px-4 py-2 rounded ${
            (filters.status === '' && status === 'All') || filters.status === status
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
import { ref, computed, onMounted, watch } from 'vue'
import { borrowingService, inventoryService } from '../utils/services'
import { formatDate, formatDateTime, getStatusColor, exportToExcel } from '../utils/helpers'
import { mockUsers } from '../data/mockData'
import PaginationControl from '../components/PaginationControl.vue'

export default {
  components: { PaginationControl },
  props: {
    pageParams: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props) {
    const history = ref([])
    const showFilters = ref(false)
    const filters = ref({
      requestId: '',
      itemName: '',
      borrower: '',
      status: '',
      requestDate: '',
      approvalDate: '',
      returnDate: '',
      returnedDate: ''
    })
    const sortField = ref('requestDate')
    const sortDir = ref('desc')
    const currentPage = ref(1)
    const pageSize = 10

    // Watch pageParams to set initial filter from dashboard navigation
    watch(() => props.pageParams, (params) => {
      if (params && params.filter) {
        filters.value.status = params.filter
        showFilters.value = false
        currentPage.value = 1
      }
    }, { immediate: true })

    // Reset page when any filter changes
    watch(filters, () => {
      currentPage.value = 1
    }, { deep: true })

    const clearAllFilters = () => {
      filters.value = {
        requestId: '',
        itemName: '',
        borrower: '',
        status: '',
        requestDate: '',
        approvalDate: '',
        returnDate: '',
        returnedDate: ''
      }
    }

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

    const matchesDate = (dateStr, filterDate) => {
      if (!filterDate || !dateStr) return !filterDate
      return dateStr.startsWith(filterDate)
    }

    const loadHistory = () => {
      const allRequests = borrowingService.getAllRequests()
      history.value = allRequests.map(req => ({
        ...req,
        itemName: inventoryService.getItemById(req.itemID)?.name || 'Unknown Item',
        borrowerName: getUserName(req.borrowerID)
      }))
    }

    const filteredHistory = computed(() => {
      let result = history.value

      // Status filter
      if (filters.value.status) {
        result = result.filter(h => h.status === filters.value.status)
      }

      // Request ID (text search)
      if (filters.value.requestId) {
        const q = filters.value.requestId.toLowerCase()
        result = result.filter(h => h.id.toLowerCase().includes(q))
      }

      // Item name (text search)
      if (filters.value.itemName) {
        const q = filters.value.itemName.toLowerCase()
        result = result.filter(h => h.itemName.toLowerCase().includes(q))
      }

      // Borrower (text search on name or ID)
      if (filters.value.borrower) {
        const q = filters.value.borrower.toLowerCase()
        result = result.filter(h =>
          h.borrowerName.toLowerCase().includes(q) ||
          h.borrowerID.toLowerCase().includes(q)
        )
      }

      // Date filters
      if (filters.value.requestDate) {
        result = result.filter(h => matchesDate(h.requestDate, filters.value.requestDate))
      }
      if (filters.value.approvalDate) {
        result = result.filter(h => matchesDate(h.approvalDate, filters.value.approvalDate))
      }
      if (filters.value.returnDate) {
        result = result.filter(h => matchesDate(h.returnDate, filters.value.returnDate))
      }
      if (filters.value.returnedDate) {
        result = result.filter(h => matchesDate(h.returnedDate, filters.value.returnedDate))
      }

      return result
    })

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
      showFilters,
      filters,
      clearAllFilters,
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
