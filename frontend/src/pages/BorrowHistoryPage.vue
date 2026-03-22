<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h2 class="page-title">Borrowing History</h2>
        <p class="page-description">{{ totalHistory }} record(s)</p>
      </div>
      <div class="flex gap-2">
        <button v-if="isAdmin && selectedHistoryIds.length > 0" @click="showDeleteConfirm = true" class="btn btn-outline-danger">
          Delete ({{ selectedHistoryIds.length }})
        </button>
        <button @click="showFilters = !showFilters" class="btn btn-ghost">
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
    <div v-else class="table-responsive">
      <table class="table-striped theme-table">
        <thead>
          <tr>
            <th v-if="isAdmin" class="text-center" style="width:2.5rem">
              <input type="checkbox" @change="toggleSelectAll" :checked="allSelected" />
            </th>
            <th>Request ID</th>
            <th>Item</th>
            <th>Borrower</th>
            <th>Status</th>
            <th class="cursor-pointer select-none" @click="toggleSort('requestDate')">
              Request Date <span class="sort-icon">{{ getSortIcon('requestDate') }}</span>
            </th>
            <th class="cursor-pointer select-none" @click="toggleSort('approvalDate')">
              Approval Date <span class="sort-icon">{{ getSortIcon('approvalDate') }}</span>
            </th>
            <th class="cursor-pointer select-none" @click="toggleSort('returnDate')">
              Return Date <span class="sort-icon">{{ getSortIcon('returnDate') }}</span>
            </th>
            <th class="cursor-pointer select-none" @click="toggleSort('returnedDate')">
              Returned <span class="sort-icon">{{ getSortIcon('returnedDate') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in history" :key="record.id">
            <td v-if="isAdmin" class="text-center">
              <input type="checkbox" :value="record.id" v-model="selectedHistoryIds" />
            </td>
            <td style="font-weight:500">{{ record.id }}</td>
            <td>{{ record.itemName }}</td>
            <td>{{ record.borrowerName }} ({{ record.borrowerID }})</td>
            <td>
              <span :class="`px-2 py-1 rounded text-sm ${getStatusColor(record.status)}`">
                {{ record.status }}
              </span>
            </td>
            <td class="text-sm">{{ formatDateTime(record.requestDate) }}</td>
            <td class="text-sm">{{ formatDateTime(record.approvalDate) }}</td>
            <td class="text-sm">{{ formatDateTime(record.returnDate) }}</td>
            <td class="text-sm">{{ formatDateTime(record.returnedDate) }}</td>
          </tr>
        </tbody>
      </table>
      <PaginationControl
        v-model:currentPage="currentPage"
        :totalItems="totalHistory"
        :pageSize="pageSize"
      />
    </div>

    <!-- Bulk Delete Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Confirm Delete</h3>
        <p class="mb-4" style="color:var(--text-secondary);font-size:0.875rem">Are you sure you want to delete <strong>{{ selectedHistoryIds.length }}</strong> record(s)?</p>
        <p class="text-sm mb-4" style="color:var(--danger)">This action cannot be undone.</p>
        <div class="flex gap-2">
          <button @click="handleDeleteRecords" class="btn btn-outline-danger flex-1">Delete</button>
          <button @click="showDeleteConfirm = false" class="btn btn-outline-secondary flex-1">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { borrowingService, authService } from '../utils/services'
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
    const selectedHistoryIds = ref([])
    const showDeleteConfirm = ref(false)
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

    const isAdmin = computed(() => {
      const user = authService.getCurrentUser()
      return user?.role === 'admin'
    })

    const allSelected = computed(() => {
      return history.value.length > 0 && selectedHistoryIds.value.length === history.value.length
    })

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

    const toggleSelectAll = (event) => {
      if (event.target.checked) {
        selectedHistoryIds.value = history.value.map(record => record.id)
      } else {
        selectedHistoryIds.value = []
      }
    }

    const handleDeleteRecords = async () => {
      showDeleteConfirm.value = false
      try {
        // Delete all selected records
        for (const id of selectedHistoryIds.value) {
          try {
            await borrowingService.deleteRequest(id)
          } catch (e) {
            console.error(`Failed to delete record ${id}:`, e)
          }
        }
        // Clear selection and reload
        selectedHistoryIds.value = []
        loadHistory()
      } catch (e) {
        console.error('Failed to delete records:', e)
      }
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
      selectedHistoryIds,
      showDeleteConfirm,
      isAdmin,
      allSelected,
      toggleSelectAll,
      handleDeleteRecords,
    }
  }
}
</script>

<style scoped>
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
