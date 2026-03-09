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
    <div v-if="showFilters" class="filter-panel">
      <div class="flex justify-between items-center mb-3">
        <h3 class="filter-panel-title">Search &amp; Filter</h3>
        <button @click="clearAllFilters" class="filter-clear-btn">Clear All</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <!-- Request ID (text) -->
        <div>
          <label class="filter-label">Request ID</label>
          <input v-model="filters.requestId" type="text" class="form-input text-sm" placeholder="e.g. REQ-001" />
        </div>
        <!-- Item Name (text) -->
        <div>
          <label class="filter-label">Item Name</label>
          <input v-model="filters.itemName" type="text" class="form-input text-sm" placeholder="Search item..." />
        </div>
        <!-- Borrower (text) -->
        <div>
          <label class="filter-label">Borrower</label>
          <input v-model="filters.borrower" type="text" class="form-input text-sm" placeholder="Name or ID..." />
        </div>
        <!-- Status (select) -->
        <div>
          <label class="filter-label">Status</label>
          <select v-model="filters.status" class="form-select text-sm">
            <option value="">All Statuses</option>
            <option v-for="s in ['Approved', 'Returned', 'Pending', 'Rejected']" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <!-- Request Date (date) -->
        <div>
          <label class="filter-label">Request Date</label>
          <input v-model="filters.requestDate" type="date" class="form-input text-sm" />
        </div>
        <!-- Approval Date (date) -->
        <div>
          <label class="filter-label">Approval Date</label>
          <input v-model="filters.approvalDate" type="date" class="form-input text-sm" />
        </div>
        <!-- Return Date (date) -->
        <div>
          <label class="filter-label">Return Date</label>
          <input v-model="filters.returnDate" type="date" class="form-input text-sm" />
        </div>
        <!-- Returned Date (date) -->
        <div>
          <label class="filter-label">Returned Date</label>
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
          :class="`pill ${(filters.status === '' && status === 'All') || filters.status === status ? 'pill-active' : ''}`"
        >
          {{ status }}
        </button>
      </div>
    </div>

    <div v-if="history.length === 0" class="empty-state">
      No records found
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full border-collapse table-striped theme-table">
        <thead>
          <tr>
            <th class="border p-2 text-left">Request ID</th>
            <th class="border p-2 text-left">Item</th>
            <th class="border p-2 text-left">Borrower</th>
            <th class="border p-2 text-left">Status</th>
            <th class="border p-2 text-left cursor-pointer select-none" @click="toggleSort('requestDate')">
              Request Date <span class="sort-icon">{{ getSortIcon('requestDate') }}</span>
            </th>
            <th class="border p-2 text-left cursor-pointer select-none" @click="toggleSort('approvalDate')">
              Approval Date <span class="sort-icon">{{ getSortIcon('approvalDate') }}</span>
            </th>
            <th class="border p-2 text-left cursor-pointer select-none" @click="toggleSort('returnDate')">
              Return Date <span class="sort-icon">{{ getSortIcon('returnDate') }}</span>
            </th>
            <th class="border p-2 text-left cursor-pointer select-none" @click="toggleSort('returnedDate')">
              Returned <span class="sort-icon">{{ getSortIcon('returnedDate') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in history" :key="record.id">
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
        :totalItems="totalHistory"
        :pageSize="pageSize"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { borrowingService } from '../utils/services'
import { formatDate, formatDateTime, getStatusColor, exportToExcel } from '../utils/helpers'
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
    const totalHistory = ref(0)
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
    let searchDebounceTimer = null

    // Watch pageParams to set initial filter from dashboard navigation
    watch(() => props.pageParams, (params) => {
      if (params && params.filter) {
        filters.value.status = params.filter
        showFilters.value = false
        currentPage.value = 1
      }
    }, { immediate: true })

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

    const buildQueryParams = () => {
      const f = filters.value
      const params = {
        page: currentPage.value,
        pageSize,
        sortBy: sortField.value,
        sortDir: sortDir.value,
      }
      if (f.status) params.status = f.status
      // Combine text search fields into one search param
      const searchParts = [f.requestId, f.itemName, f.borrower].filter(Boolean)
      if (searchParts.length > 0) params.search = searchParts.join(' ')
      // Date filters
      if (f.requestDate) {
        params.requestDateFrom = f.requestDate
        params.requestDateTo = f.requestDate + 'T23:59:59'
      }
      if (f.approvalDate) {
        params.approvalDateFrom = f.approvalDate
        params.approvalDateTo = f.approvalDate + 'T23:59:59'
      }
      if (f.returnDate) {
        params.returnDateFrom = f.returnDate
        params.returnDateTo = f.returnDate + 'T23:59:59'
      }
      if (f.returnedDate) {
        params.returnedDateFrom = f.returnedDate
        params.returnedDateTo = f.returnedDate + 'T23:59:59'
      }
      return params
    }

    const loadHistory = async () => {
      try {
        const params = buildQueryParams()
        const result = await borrowingService.getAllRequests(params)
        history.value = (result.requests || []).map(req => ({
          ...req,
          itemName: req.itemName || 'Unknown Item',
          borrowerName: req.borrowerName || req.borrowerID
        }))
        totalHistory.value = result.total || 0
      } catch (e) {
        console.error('Failed to load history:', e)
      }
    }

    // Watch dropdown/date/sort/page filters -> reload immediately
    const selectFields = computed(() => {
      const f = filters.value
      return [f.status, f.requestDate, f.approvalDate, f.returnDate, f.returnedDate]
    })
    watch([selectFields, currentPage, () => sortField.value, () => sortDir.value], () => {
      loadHistory()
    })

    // Debounced watcher for text inputs
    const textFields = computed(() => {
      const f = filters.value
      return [f.requestId, f.itemName, f.borrower]
    })
    watch(textFields, () => {
      currentPage.value = 1
      clearTimeout(searchDebounceTimer)
      searchDebounceTimer = setTimeout(() => {
        loadHistory()
      }, 400)
    })

    const exportHistory = () => {
      // Fetch all matching records for export
      borrowingService.getAllRequests({ ...buildQueryParams(), page: 1, pageSize: 9999 })
        .then(result => {
          const data = (result.requests || []).map(req => ({
            ...req,
            itemName: req.itemName || 'Unknown Item',
            borrowerName: req.borrowerName || req.borrowerID
          }))
          exportToExcel(data, 'borrow_history.xlsx')
        })
        .catch(e => console.error('Export failed:', e))
    }

    onMounted(() => {
      loadHistory()
    })

    return {
      history,
      totalHistory,
      showFilters,
      filters,
      clearAllFilters,
      sortField,
      sortDir,
      toggleSort,
      getSortIcon,
      currentPage,
      pageSize,
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
