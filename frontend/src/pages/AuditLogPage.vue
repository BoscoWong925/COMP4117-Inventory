<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">Audit Log & Trail</h2>
      <div class="flex gap-2">
        <button @click="showFilters = !showFilters" class="btn btn-outline-primary">
          {{ showFilters ? 'Hide Filters' : 'Show Filters' }}
        </button>
        <button @click="exportLogs" class="btn">Export to Excel</button>
      </div>
    </div>

    <!-- Filter Panel -->
    <div v-if="showFilters" class="filter-panel">
      <div class="flex justify-between items-center mb-3">
        <h3 class="filter-panel-title">Search &amp; Filter</h3>
        <button @click="clearAllFilters" class="filter-clear-btn">Clear All</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <div>
          <label class="filter-label">Search</label>
          <input v-model="searchText" type="text" class="form-input text-sm" placeholder="User, details, item ID..." />
        </div>
        <div>
          <label class="filter-label">User ID</label>
          <input v-model="filters.userID" type="text" class="form-input text-sm" placeholder="e.g. U001, S00123456" />
        </div>
        <div>
          <label class="filter-label">Item ID</label>
          <input v-model="filters.itemID" type="text" class="form-input text-sm" placeholder="e.g. INV-001" />
        </div>
        <div>
          <label class="filter-label">Date From</label>
          <input v-model="filters.dateFrom" type="date" class="form-input text-sm" />
        </div>
        <div>
          <label class="filter-label">Date To</label>
          <input v-model="filters.dateTo" type="date" class="form-input text-sm" />
        </div>
      </div>
    </div>

    <!-- Action Category Tabs -->
    <div class="mb-4">
      <div class="flex gap-2 flex-wrap">
        <button
          @click="selectedAction = 'All'; currentPage = 1"
          :class="`pill ${selectedAction === 'All' ? 'pill-active' : ''}`"
        >
          All
        </button>
        <button
          v-for="cat in actionCategories"
          :key="cat.label"
          @click="selectedAction = cat.label; currentPage = 1"
          :class="`pill ${selectedAction === cat.label ? 'pill-active' : ''}`"
        >
          {{ cat.label }}
          <span class="ml-1 text-xs opacity-75">({{ getCategoryCount(cat) }})</span>
        </button>
      </div>
    </div>

    <!-- Results Summary -->
    <p class="results-summary">
      Showing {{ paginatedLogs.length }} of {{ filteredLogs.length }} log entries
    </p>

    <div v-if="filteredLogs.length === 0" class="empty-state">
      No logs found
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full border-collapse table-striped theme-table">
        <thead>
          <tr>
            <th class="border p-2 text-left cursor-pointer select-none" @click="toggleSort('timestamp')">
              Timestamp <span class="sort-icon">{{ getSortIcon('timestamp') }}</span>
            </th>
            <th class="border p-2 text-left">User</th>
            <th class="border p-2 text-left">Action</th>
            <th class="border p-2 text-left">Details</th>
            <th class="border p-2 text-left">Item ID</th>
            <th class="border p-2 text-left">Old Value</th>
            <th class="border p-2 text-left">New Value</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in paginatedLogs" :key="log.id">
            <td class="border p-2 text-sm whitespace-nowrap">{{ formatDateTime(log.timestamp) }}</td>
            <td class="border p-2 text-sm">{{ log.userID }}</td>
            <td class="border p-2 text-sm">
              <span :class="`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`">
                {{ formatAction(log.action) }}
              </span>
            </td>
            <td class="border p-2 text-sm text-secondary">{{ log.details }}</td>
            <td class="border p-2 text-sm">{{ log.affectedItemID || '-' }}</td>
            <td class="border p-2 text-sm">{{ log.oldValue || '-' }}</td>
            <td class="border p-2 text-sm">{{ log.newValue || '-' }}</td>
          </tr>
        </tbody>
      </table>
      <PaginationControl
        v-model:currentPage="currentPage"
        :totalItems="filteredLogs.length"
        :pageSize="pageSize"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { auditService } from '../utils/services'
import { formatDateTime, exportToExcel } from '../utils/helpers'
import PaginationControl from '../components/PaginationControl.vue'

export default {
  components: { PaginationControl },
  setup() {
    const logs = ref([])
    const selectedAction = ref('All')
    const searchText = ref('')
    const showFilters = ref(false)
    const filters = ref({
      userID: '',
      itemID: '',
      dateFrom: '',
      dateTo: ''
    })
    const sortField = ref('timestamp')
    const sortDir = ref('desc')
    const currentPage = ref(1)
    const pageSize = 15

    // Action categories for grouping
    const actionCategories = [
      { label: 'Login / Logout', actions: ['LOGIN', 'LOGOUT'], activeClass: 'pill-active' },
      { label: 'Borrow Requests', actions: ['BORROW_REQUEST_CREATED', 'BORROW_REQUEST_APPROVED', 'BORROW_REQUEST_REJECTED'], activeClass: 'pill-active' },
      { label: 'Item Returns', actions: ['ITEM_RETURNED'], activeClass: 'pill-active' },
      { label: 'Item Changes', actions: ['ITEM_ADDED', 'ITEM_DELETED', 'ITEM_STATUS_CHANGE', 'INVENTORY_ITEM_ADDED'], activeClass: 'pill-active' }
    ]

    // Reset page on any filter change
    watch([searchText, selectedAction, filters], () => {
      currentPage.value = 1
    }, { deep: true })

    const loadLogs = async () => {
      try {
        const allLogs = await auditService.getAllLogs()
        logs.value = allLogs
      } catch (e) {
        console.error('Failed to load logs:', e)
      }
    }

    const clearAllFilters = () => {
      searchText.value = ''
      selectedAction.value = 'All'
      filters.value = { userID: '', itemID: '', dateFrom: '', dateTo: '' }
    }

    const getCategoryCount = (cat) => {
      return logs.value.filter(l => cat.actions.includes(l.action)).length
    }

    const filteredLogs = computed(() => {
      let result = [...logs.value]

      // Action category filter
      if (selectedAction.value === 'All') {
        // Hide login/logout in the default "All" view — use the dedicated tab to see them
        result = result.filter(l => l.action !== 'LOGIN' && l.action !== 'LOGOUT')
      } else {
        const cat = actionCategories.find(c => c.label === selectedAction.value)
        if (cat) {
          result = result.filter(l => cat.actions.includes(l.action))
        }
      }

      // Text search
      if (searchText.value) {
        const q = searchText.value.toLowerCase()
        result = result.filter(l =>
          (l.userID || '').toLowerCase().includes(q) ||
          (l.details || '').toLowerCase().includes(q) ||
          (l.affectedItemID || '').toLowerCase().includes(q) ||
          (l.action || '').toLowerCase().includes(q)
        )
      }

      // User ID filter
      if (filters.value.userID) {
        const q = filters.value.userID.toLowerCase()
        result = result.filter(l => (l.userID || '').toLowerCase().includes(q))
      }

      // Item ID filter
      if (filters.value.itemID) {
        const q = filters.value.itemID.toLowerCase()
        result = result.filter(l => (l.affectedItemID || '').toLowerCase().includes(q))
      }

      // Date range filter
      if (filters.value.dateFrom) {
        const from = new Date(filters.value.dateFrom)
        result = result.filter(l => new Date(l.timestamp) >= from)
      }
      if (filters.value.dateTo) {
        const to = new Date(filters.value.dateTo)
        to.setHours(23, 59, 59, 999)
        result = result.filter(l => new Date(l.timestamp) <= to)
      }

      // Sort
      result.sort((a, b) => {
        const aVal = a[sortField.value] || ''
        const bVal = b[sortField.value] || ''
        if (sortDir.value === 'asc') return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      })

      return result
    })

    const paginatedLogs = computed(() => {
      const start = (currentPage.value - 1) * pageSize
      return filteredLogs.value.slice(start, start + pageSize)
    })

    const toggleSort = (field) => {
      if (sortField.value === field) {
        sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
      } else {
        sortField.value = field
        sortDir.value = 'desc'
      }
    }

    const getSortIcon = (field) => {
      if (sortField.value !== field) return '⇅'
      return sortDir.value === 'asc' ? '▲' : '▼'
    }

    const formatAction = (action) => {
      const map = {
        'LOGIN': 'Login',
        'LOGOUT': 'Logout',
        'BORROW_REQUEST_CREATED': 'Request Created',
        'BORROW_REQUEST_APPROVED': 'Request Approved',
        'BORROW_REQUEST_REJECTED': 'Request Rejected',
        'ITEM_RETURNED': 'Item Returned',
        'ITEM_ADDED': 'Item Added',
        'ITEM_DELETED': 'Item Deleted',
        'ITEM_STATUS_CHANGE': 'Status Change',
        'INVENTORY_ITEM_ADDED': 'Item Added'
      }
      return map[action] || action
    }

    const getActionColor = (action) => {
      const map = {
        'LOGIN': 'action-badge action-badge-neutral',
        'LOGOUT': 'action-badge action-badge-neutral',
        'BORROW_REQUEST_CREATED': 'action-badge action-badge-info',
        'BORROW_REQUEST_APPROVED': 'action-badge action-badge-success',
        'BORROW_REQUEST_REJECTED': 'action-badge action-badge-danger',
        'ITEM_RETURNED': 'action-badge action-badge-accent',
        'ITEM_ADDED': 'action-badge action-badge-accent',
        'ITEM_DELETED': 'action-badge action-badge-danger',
        'ITEM_STATUS_CHANGE': 'action-badge action-badge-warning',
        'INVENTORY_ITEM_ADDED': 'action-badge action-badge-accent'
      }
      return map[action] || 'action-badge action-badge-neutral'
    }

    const exportLogs = () => {
      const exportData = filteredLogs.value.map(l => ({
        Timestamp: formatDateTime(l.timestamp),
        User: l.userID,
        Action: formatAction(l.action),
        Details: l.details,
        'Item ID': l.affectedItemID || '',
        'Old Value': l.oldValue || '',
        'New Value': l.newValue || ''
      }))
      exportToExcel(exportData, 'audit_logs.xlsx')
    }

    onMounted(() => {
      loadLogs()
    })

    return {
      logs,
      selectedAction,
      searchText,
      showFilters,
      filters,
      currentPage,
      pageSize,
      actionCategories,
      filteredLogs,
      paginatedLogs,
      clearAllFilters,
      getCategoryCount,
      toggleSort,
      getSortIcon,
      formatAction,
      getActionColor,
      exportLogs,
      formatDateTime,
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
