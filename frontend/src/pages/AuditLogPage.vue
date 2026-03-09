<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">Audit Log & Trail</h2>
      <div class="flex gap-2">
        <button v-if="isAdmin && selectedLogIds.length > 0" @click="showDeleteConfirm = true" class="btn btn-outline-danger">
          Delete ({{ selectedLogIds.length }})
        </button>
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

    <!-- Filter Dropdown Bar -->
    <div class="mb-4">
      <div class="flex gap-2 flex-wrap relative">
        <!-- All button -->
        <button
          @click="selectedAction = 'All'; selectedTimeRange = 'all'; currentPage = 1; closeDropdowns()"
          :class="`pill ${selectedAction === 'All' && selectedTimeRange === 'all' ? 'pill-active' : ''}`"
        >
          All
        </button>

        <!-- Time Range Dropdown -->
        <div class="relative">
          <button
            @click.stop="toggleDropdown('time')"
            :class="`pill ${selectedTimeRange !== 'all' ? 'pill-active' : ''}`"
          >
            {{ selectedTimeRangeLabel }}
            <svg class="inline-block w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </button>
          <div v-if="openDropdown === 'time'" class="dropdown-menu">
            <button
              v-for="opt in timeRangeOptions"
              :key="opt.value"
              @click="selectTimeRange(opt.value)"
              :class="`dropdown-item ${selectedTimeRange === opt.value ? 'dropdown-item-active' : ''}`"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Action Dropdown -->
        <div class="relative">
          <button
            @click.stop="toggleDropdown('action')"
            :class="`pill ${selectedAction !== 'All' ? 'pill-active' : ''}`"
          >
            {{ selectedAction === 'All' ? 'Action' : selectedAction }}
            <svg class="inline-block w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </button>
          <div v-if="openDropdown === 'action'" class="dropdown-menu">
            <button
              v-for="cat in actionCategories"
              :key="cat.label"
              @click="selectAction(cat.label)"
              :class="`dropdown-item ${selectedAction === cat.label ? 'dropdown-item-active' : ''}`"
            >
              {{ cat.label }} ({{ getCategoryCount(cat) }})
            </button>
          </div>
        </div>
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
            <th v-if="isAdmin" class="border p-2 text-center w-10">
              <input type="checkbox" @change="toggleSelectAll" :checked="allSelected" />
            </th>
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
            <td v-if="isAdmin" class="border p-2 text-center">
              <input type="checkbox" :value="log.logId || log.id || log._id" v-model="selectedLogIds" />
            </td>
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
    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Confirm Delete</h3>
        <p class="mb-4">Are you sure you want to delete <strong>{{ selectedLogIds.length }}</strong> log entries?</p>
        <p class="text-sm text-red-500 mb-4">This action cannot be undone.</p>
        <div class="flex gap-2">
          <button @click="handleDeleteLogs" class="btn btn-outline-danger flex-1">Delete</button>
          <button @click="showDeleteConfirm = false" class="btn btn-outline-secondary flex-1">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { auditService, authService } from '../utils/services'
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
    const selectedLogIds = ref([])
    const showDeleteConfirm = ref(false)
    const isAdmin = computed(() => {
      const user = authService.getCurrentUser()
      return user?.role === 'admin'
    })

    // Dropdown state
    const openDropdown = ref(null)
    const selectedTimeRange = ref('all')

    const timeRangeOptions = [
      { label: 'Past 15 minutes', value: '15m' },
      { label: 'Past 1 hour', value: '1h' },
      { label: 'Past 24 hours', value: '24h' },
      { label: 'Past 7 days', value: '7d' },
      { label: 'Past 4 weeks', value: '4w' },
      { label: 'Past 6 months', value: '6M' },
      { label: 'Past 1 year', value: '1y' },
      { label: 'Past 2 years', value: '2y' },
      { label: 'All time', value: 'all' }
    ]

    const selectedTimeRangeLabel = computed(() => {
      const opt = timeRangeOptions.find(o => o.value === selectedTimeRange.value)
      return opt ? opt.label : 'Time range'
    })

    const toggleDropdown = (name) => {
      openDropdown.value = openDropdown.value === name ? null : name
    }

    const closeDropdowns = () => {
      openDropdown.value = null
    }

    const selectTimeRange = (value) => {
      selectedTimeRange.value = value
      currentPage.value = 1
      closeDropdowns()
    }

    const selectAction = (label) => {
      selectedAction.value = label
      currentPage.value = 1
      closeDropdowns()
    }

    // Close dropdown on click outside
    const handleClickOutside = () => {
      closeDropdowns()
    }

    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    // Action categories for grouping
    const actionCategories = [
      { label: 'Login / Logout', actions: ['LOGIN', 'LOGOUT'], activeClass: 'pill-active' },
      { label: 'Borrow Requests', actions: ['BORROW_REQUEST_CREATED', 'BORROW_REQUEST_APPROVED', 'BORROW_REQUEST_REJECTED'], activeClass: 'pill-active' },
      { label: 'Item Returns', actions: ['ITEM_RETURNED'], activeClass: 'pill-active' },
      { label: 'Item Changes', actions: ['ITEM_ADDED', 'ITEM_DELETED', 'ITEM_STATUS_CHANGE', 'INVENTORY_ITEM_ADDED'], activeClass: 'pill-active' }
    ]

    // Reset page on any filter change
    watch([searchText, selectedAction, selectedTimeRange, filters], () => {
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
      selectedTimeRange.value = 'all'
      filters.value = { userID: '', itemID: '', dateFrom: '', dateTo: '' }
    }

    const getCategoryCount = (cat) => {
      return logs.value.filter(l => cat.actions.includes(l.action)).length
    }

    const filteredLogs = computed(() => {
      let result = [...logs.value]

      // Action category filter
      if (selectedAction.value === 'All') {
        // Show all records
      } else {
        const cat = actionCategories.find(c => c.label === selectedAction.value)
        if (cat) {
          result = result.filter(l => cat.actions.includes(l.action))
        }
      }

      // Time range filter
      if (selectedTimeRange.value !== 'all') {
        const now = Date.now()
        const rangeMs = {
          '15m': 15 * 60 * 1000,
          '1h': 60 * 60 * 1000,
          '24h': 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
          '4w': 28 * 24 * 60 * 60 * 1000,
          '6M': 183 * 24 * 60 * 60 * 1000,
          '1y': 365 * 24 * 60 * 60 * 1000,
          '2y': 730 * 24 * 60 * 60 * 1000
        }
        const cutoff = now - (rangeMs[selectedTimeRange.value] || 0)
        result = result.filter(l => new Date(l.timestamp).getTime() >= cutoff)
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

    const allSelected = computed(() => {
      if (paginatedLogs.value.length === 0) return false
      return paginatedLogs.value.every(l => selectedLogIds.value.includes(l.logId || l.id || l._id))
    })

    const toggleSelectAll = () => {
      if (allSelected.value) {
        const pageIds = paginatedLogs.value.map(l => l.logId || l.id || l._id)
        selectedLogIds.value = selectedLogIds.value.filter(id => !pageIds.includes(id))
      } else {
        const pageIds = paginatedLogs.value.map(l => l.logId || l.id || l._id)
        const current = new Set(selectedLogIds.value)
        pageIds.forEach(id => current.add(id))
        selectedLogIds.value = [...current]
      }
    }

    const handleDeleteLogs = async () => {
      try {
        await auditService.deleteLogs(selectedLogIds.value)
        selectedLogIds.value = []
        showDeleteConfirm.value = false
        await loadLogs()
      } catch (e) {
        console.error('Failed to delete logs:', e)
        alert('Failed to delete logs: ' + e.message)
      }
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
      selectedLogIds,
      showDeleteConfirm,
      isAdmin,
      allSelected,
      toggleSelectAll,
      handleDeleteLogs,
      openDropdown,
      selectedTimeRange,
      selectedTimeRangeLabel,
      timeRangeOptions,
      toggleDropdown,
      closeDropdowns,
      selectTimeRange,
      selectAction,
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
.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  min-width: 200px;
  background: var(--color-bg-card, #1e293b);
  border: 1px solid var(--color-border, #334155);
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  z-index: 50;
  overflow: hidden;
}
.dropdown-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: var(--color-text, #e2e8f0);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.dropdown-item:hover {
  background: var(--color-bg-hover, rgba(99, 102, 241, 0.15));
}
.dropdown-item-active {
  background: var(--color-bg-active, rgba(99, 102, 241, 0.25));
  font-weight: 600;
}
</style>
