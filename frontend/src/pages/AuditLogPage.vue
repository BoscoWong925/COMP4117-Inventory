<template>
  <div class="page-container">
    <ModulePageHeader title="Audit Log & Trail" :subtitle="totalLogs + ' log entries'">
      <Button variant="outline" size="sm" @click="showFilters = !showFilters">
        {{ showFilters ? 'Hide Filters' : 'Show Filters' }}
      </Button>
      <Button size="sm" @click="exportLogs">Export to Excel</Button>
    </ModulePageHeader>

    <!-- Filter Panel -->
    <ModuleFilterPanel v-if="showFilters" @clear="clearAllFilters">
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <div>
          <label class="filter-label">Search</label>
          <Input v-model="searchText" type="text" placeholder="User, details, item ID..." />
        </div>
        <div>
          <label class="filter-label">User ID</label>
          <Input v-model="filters.userID" type="text" placeholder="e.g. U001, S00123456" />
        </div>
        <div>
          <label class="filter-label">Item ID</label>
          <Input v-model="filters.itemID" type="text" placeholder="e.g. INV-001" />
        </div>
        <div>
          <label class="filter-label">Date From</label>
          <FilterDatePicker v-model="filters.dateFrom" placeholder="Select start date" />
        </div>
        <div>
          <label class="filter-label">Date To</label>
          <FilterDatePicker v-model="filters.dateTo" placeholder="Select end date" />
        </div>
      </div>
    </ModuleFilterPanel>

    <!-- Filter Toolbar -->
    <div class="audit-filter-tools mb-4">
      <DropdownMenu align="start">
        <template #trigger>
          <button :class="['toolbar-btn', { 'toolbar-btn--active': hasActiveAuditFilters }]">
            <Filter :size="12" /> Filter
            <span v-if="hasActiveAuditFilters" class="toolbar-dot"></span>
          </button>
        </template>
        <template #default="{ close }">
          <DropdownMenuItem label>Time Range</DropdownMenuItem>
          <DropdownMenuItem
            v-for="opt in timeRangeOptions"
            :key="opt.value"
            checkable
            :checked="selectedTimeRange === opt.value"
            @click="selectedTimeRange = opt.value; currentPage = 1; close()"
          >
            {{ opt.label }}
          </DropdownMenuItem>

          <DropdownMenuItem separator />
          <DropdownMenuItem label>Action Category</DropdownMenuItem>
          <DropdownMenuItem checkable :checked="selectedAction === 'All'" @click="selectedAction = 'All'; currentPage = 1; close()">
            All Actions
          </DropdownMenuItem>
          <DropdownMenuItem
            v-for="cat in actionCategories"
            :key="cat.label"
            checkable
            :checked="selectedAction === cat.label"
            @click="selectedAction = cat.label; currentPage = 1; close()"
          >
            {{ cat.label }} ({{ getCategoryCount(cat) }})
          </DropdownMenuItem>

          <template v-if="hasActiveAuditFilters">
            <DropdownMenuItem separator />
            <DropdownMenuItem destructive @click="selectedAction = 'All'; selectedTimeRange = 'all'; currentPage = 1; close()">
              <XCircle :size="12" /> Clear All Filters
            </DropdownMenuItem>
          </template>
        </template>
      </DropdownMenu>

      <div v-if="hasActiveAuditFilters" class="audit-active-filters">
        <span v-if="selectedTimeRange !== 'all'" class="filter-tag">
          Time: {{ selectedTimeRangeLabel }}
          <button @click="selectedTimeRange = 'all'; currentPage = 1" class="filter-tag-x">&times;</button>
        </span>
        <span v-if="selectedAction !== 'All'" class="filter-tag">
          Action: {{ selectedAction }}
          <button @click="selectedAction = 'All'; currentPage = 1" class="filter-tag-x">&times;</button>
        </span>
      </div>
    </div>

    <!-- Results Summary -->
    <p class="results-summary">
      Showing {{ logs.length }} of {{ totalLogs }} log entries
      <span v-if="loading" class="ml-2 text-xs opacity-60">(loading...)</span>
    </p>

    <div v-if="logs.length === 0 && !loading" class="empty-state">
      No logs found
    </div>
    <Card v-else class="audit-table-card">
      <Transition name="bulk-bar">
        <div v-if="isAdmin && selectedLogIds.length > 0" class="bulk-toolbar">
          <div class="bulk-toolbar-left">
            <span class="bulk-chip">{{ selectedLogIds.length }} selected</span>
            <DropdownMenu align="start">
              <template #trigger>
                <button class="toolbar-btn">
                  <Zap :size="12" /> Actions <ChevronDown :size="10" />
                </button>
              </template>
              <template #default="{ close }">
                <DropdownMenuItem destructive @click="showDeleteConfirm = true; close()">
                  <Trash2 :size="12" /> Delete ({{ selectedLogIds.length }})
                </DropdownMenuItem>
              </template>
            </DropdownMenu>
            <button class="bulk-clear-btn" @click="selectedLogIds = []">Clear</button>
          </div>
        </div>
      </Transition>
      <div class="table-responsive">
        <table class="table-striped theme-table">
          <thead>
            <tr>
              <th v-if="isAdmin" class="text-center" style="width:2.5rem">
                <Checkbox
                  :checked="allSelected"
                  :indeterminate="selectedLogIds.length > 0 && !allSelected"
                  @update:checked="toggleSelectAll"
                />
              </th>
              <th class="cursor-pointer select-none" @click="toggleSort('timestamp')">
                Timestamp <span class="sort-icon">{{ getSortIcon('timestamp') }}</span>
              </th>
              <th>User</th>
              <th>Action</th>
              <th>Details</th>
              <th>Item ID</th>
              <th>Old Value</th>
              <th>New Value</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in paginatedLogs" :key="log.id">
              <td v-if="isAdmin" class="text-center">
                <Checkbox
                  :checked="selectedLogIds.includes(log.logId || log.id || log._id)"
                  @update:checked="toggleLogSelection(log.logId || log.id || log._id, $event)"
                />
              </td>
              <td class="text-sm whitespace-nowrap">{{ formatDateTime(log.timestamp) }}</td>
              <td class="text-sm">{{ log.userID }}</td>
              <td class="text-sm">
                <Badge :variant="getActionBadgeVariant(log.action)">{{ formatAction(log.action) }}</Badge>
              </td>
              <td class="text-sm text-secondary">{{ log.details }}</td>
              <td class="text-sm">{{ log.affectedItemID || '-' }}</td>
              <td class="text-sm">{{ log.oldValue || '-' }}</td>
              <td class="text-sm">{{ log.newValue || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <TablePaginationBar
        v-model:currentPage="currentPage"
        v-model:pageSize="pageSizeRef"
        :total-items="totalLogs"
      />
    </Card>
    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Confirm Delete</h3>
        <p class="mb-4" style="color:var(--text-secondary);font-size:0.875rem">Are you sure you want to delete <strong>{{ selectedLogIds.length }}</strong> log entries?</p>
        <p class="text-sm mb-4" style="color:var(--danger)">This action cannot be undone.</p>
        <div class="flex gap-2">
          <Button variant="destructive" class="flex-1" @click="handleDeleteLogs">Delete</Button>
          <Button variant="outline" class="flex-1" @click="showDeleteConfirm = false">Cancel</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { auditService, authService } from '../utils/services'
import { formatDateTime, exportToExcel } from '../utils/helpers'
import { useActionLock } from '../hooks/useActionLock'
import { usePermissions } from '../hooks/usePermissions'
import { Zap, ChevronDown, Trash2, Filter, XCircle } from 'lucide-vue-next'
import {
  UiModulePageHeader as ModulePageHeader,
  UiModuleFilterPanel as ModuleFilterPanel,
  UiFilterDatePicker as FilterDatePicker,
  UiTablePaginationBar as TablePaginationBar,
  UiDropdownMenu as DropdownMenu,
  UiDropdownMenuItem as DropdownMenuItem,
  UiCheckbox as Checkbox,
  UiBadge as Badge,
  UiCard as Card,
  UiButton as Button,
  UiInput as Input
} from '../components/ui'

export default {
  components: {
    ModulePageHeader, ModuleFilterPanel, FilterDatePicker, TablePaginationBar,
    DropdownMenu, DropdownMenuItem, Checkbox, Badge, Card, Button, Input,
    Zap, ChevronDown, Trash2, Filter, XCircle
  },
  setup() {
    const { runAction } = useActionLock()
    const logs = ref([])
    const totalLogs = ref(0)
    const loading = ref(false)
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
    const pageSizeRef = ref(pageSize)
    const selectedLogIds = ref([])
    const showDeleteConfirm = ref(false)
    const { isAdmin } = usePermissions()

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

    // Action categories for grouping
    const actionCategories = [
      { label: 'Login / Logout', actions: ['LOGIN', 'LOGOUT'] },
      { label: 'Borrow Requests', actions: ['BORROW_REQUEST_CREATED', 'BORROW_REQUEST_APPROVED', 'BORROW_REQUEST_REJECTED'] },
      { label: 'Item Returns', actions: ['ITEM_RETURNED'] },
      { label: 'Item Changes', actions: ['ITEM_ADDED', 'ITEM_DELETED', 'ITEM_STATUS_CHANGE', 'INVENTORY_ITEM_ADDED'] }
    ]

    // Debounce timer for text inputs
    let debounceTimer = null

    // Load logs from database with all current filters
    const loadLogs = async () => {
      loading.value = true
      try {
        const params = {
          page: currentPage.value,
          pageSize: pageSizeRef.value,
          sortField: sortField.value,
          sortDir: sortDir.value
        }

        // Time range filter
        if (selectedTimeRange.value !== 'all') {
          params.timeRange = selectedTimeRange.value
        }

        // Action category filter
        if (selectedAction.value !== 'All') {
          const cat = actionCategories.find(c => c.label === selectedAction.value)
          if (cat) {
            params.actions = cat.actions.join(',')
          }
        }

        // Text search
        if (searchText.value) {
          params.search = searchText.value
        }

        // User ID filter
        if (filters.value.userID) {
          params.userID = filters.value.userID
        }

        // Item ID filter
        if (filters.value.itemID) {
          params.itemID = filters.value.itemID
        }

        // Date range filters
        if (filters.value.dateFrom) {
          params.dateFrom = filters.value.dateFrom
        }
        if (filters.value.dateTo) {
          params.dateTo = filters.value.dateTo
        }

        const result = await auditService.getAllLogs(params)
        logs.value = result.logs
        totalLogs.value = result.total
      } catch (e) {
        console.error('Failed to load logs:', e)
      } finally {
        loading.value = false
      }
    }

    const clearAllFilters = () => {
      searchText.value = ''
      selectedAction.value = 'All'
      selectedTimeRange.value = 'all'
      filters.value = { userID: '', itemID: '', dateFrom: '', dateTo: '' }
      currentPage.value = 1
    }

    // Load category counts from DB (separate lightweight queries)
    const categoryCounts = ref({})
    const loadCategoryCounts = async () => {
      for (const cat of actionCategories) {
        try {
          const result = await auditService.getAllLogs({ actions: cat.actions.join(','), pageSize: 1 })
          categoryCounts.value[cat.label] = result.total
        } catch (e) {
          categoryCounts.value[cat.label] = 0
        }
      }
    }

    const getCategoryCount = (cat) => {
      return categoryCounts.value[cat.label] ?? '...'
    }

    const hasActiveAuditFilters = computed(() => {
      return selectedTimeRange.value !== 'all' || selectedAction.value !== 'All'
    })

    const paginatedLogs = computed(() => {
      // Server already paginates, so just return logs directly
      return logs.value
    })

    // Watch all filters and reload from DB
    watch([selectedAction, selectedTimeRange, currentPage, sortField, sortDir], () => {
      loadLogs()
    })

    watch(pageSizeRef, () => {
      if (currentPage.value !== 1) {
        currentPage.value = 1
      } else {
        loadLogs()
      }
    })

    // Debounced watch for text inputs
    watch([searchText, filters], () => {
      currentPage.value = 1
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        loadLogs()
      }, 400)
    }, { deep: true })

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

    const getActionBadgeVariant = (action) => {
      const map = {
        'LOGIN': 'secondary',
        'LOGOUT': 'secondary',
        'BORROW_REQUEST_CREATED': 'info',
        'BORROW_REQUEST_APPROVED': 'success',
        'BORROW_REQUEST_REJECTED': 'destructive',
        'ITEM_RETURNED': 'info',
        'ITEM_ADDED': 'info',
        'ITEM_DELETED': 'destructive',
        'ITEM_STATUS_CHANGE': 'warning',
        'INVENTORY_ITEM_ADDED': 'info'
      }
      return map[action] || 'secondary'
    }

    const allSelected = computed(() => {
      if (paginatedLogs.value.length === 0) return false
      return paginatedLogs.value.every(l => selectedLogIds.value.includes(l.logId || l.id || l._id))
    })

    const toggleSelectAll = (checked) => {
      const pageIds = paginatedLogs.value.map(l => l.logId || l.id || l._id)
      if (checked) {
        const current = new Set(selectedLogIds.value)
        pageIds.forEach(id => current.add(id))
        selectedLogIds.value = [...current]
      } else {
        selectedLogIds.value = selectedLogIds.value.filter(id => !pageIds.includes(id))
      }
    }

    const toggleLogSelection = (id, checked) => {
      if (checked) {
        if (!selectedLogIds.value.includes(id)) selectedLogIds.value.push(id)
      } else {
        selectedLogIds.value = selectedLogIds.value.filter(x => x !== id)
      }
    }

    const handleDeleteLogs = async () => {
      const ids = [...selectedLogIds.value]
      if (ids.length === 0) return

      showDeleteConfirm.value = false

      await runAction('Deleting logs...', async () => {
        try {
          await auditService.deleteLogs(ids)
          selectedLogIds.value = []
          await loadLogs()
        } catch (e) {
          console.error('Failed to delete logs:', e)
          alert('Failed to delete logs: ' + e.message)
        }
      })
    }

    const exportLogs = async () => {
      try {
        // Fetch all matching logs (no pagination) for export
        const params = { pageSize: 10000 }
        if (selectedTimeRange.value !== 'all') params.timeRange = selectedTimeRange.value
        if (selectedAction.value !== 'All') {
          const cat = actionCategories.find(c => c.label === selectedAction.value)
          if (cat) params.actions = cat.actions.join(',')
        }
        if (searchText.value) params.search = searchText.value
        if (filters.value.userID) params.userID = filters.value.userID
        if (filters.value.itemID) params.itemID = filters.value.itemID
        if (filters.value.dateFrom) params.dateFrom = filters.value.dateFrom
        if (filters.value.dateTo) params.dateTo = filters.value.dateTo
        const result = await auditService.getAllLogs(params)
        const exportData = (result.logs || []).map(l => ({
          Timestamp: formatDateTime(l.timestamp),
          User: l.userID,
          Action: formatAction(l.action),
          Details: l.details,
          'Item ID': l.affectedItemID || '',
          'Old Value': l.oldValue || '',
          'New Value': l.newValue || ''
        }))
        exportToExcel(exportData, 'audit_logs.xlsx')
      } catch (e) {
        console.error('Failed to export logs:', e)
        alert('Failed to export logs: ' + e.message)
      }
    }

    onMounted(() => {
      loadLogs()
      loadCategoryCounts()
    })

    return {
      logs,
      totalLogs,
      loading,
      selectedAction,
      searchText,
      showFilters,
      filters,
      currentPage,
      pageSize,
      pageSizeRef,
      actionCategories,
      paginatedLogs,
      clearAllFilters,
      getCategoryCount,
      toggleSort,
      getSortIcon,
      formatAction,
      getActionBadgeVariant,
      exportLogs,
      formatDateTime,
      selectedLogIds,
      showDeleteConfirm,
      isAdmin,
      allSelected,
      toggleSelectAll,
      toggleLogSelection,
      handleDeleteLogs,
      hasActiveAuditFilters,
      selectedTimeRange,
      selectedTimeRangeLabel,
      timeRangeOptions,
    }
  }
}
</script>

<style scoped>
.audit-table-card { overflow: hidden; }

.sort-icon {
  display: inline-block;
  width: 14px;
  text-align: center;
  font-size: 11px;
  color: var(--muted-foreground);
}
thead th:hover .sort-icon {
  color: var(--text-primary);
}

.bulk-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 0.5rem; padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border); background: var(--surface-50);
}
.bulk-toolbar-left { display: flex; align-items: center; gap: 0.375rem; flex-wrap: wrap; }
.bulk-chip {
  display: inline-flex; align-items: center;
  font-size: 0.7rem; font-weight: 600; padding: 0.15rem 0.55rem;
  border-radius: 9999px; background: var(--accent-surface); color: var(--accent);
}
.audit-filter-tools {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.toolbar-btn {
  display: inline-flex; align-items: center; gap: 0.35rem;
  font-size: 0.72rem; font-weight: 600; padding: 0.28rem 0.6rem;
  border-radius: 0.5rem; border: 1px solid var(--border);
  background: var(--card); color: var(--text-primary); cursor: pointer; transition: all 0.12s;
}
.toolbar-btn:hover { background: var(--surface-100); }
.toolbar-btn--active {
  border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
  background: var(--surface-100);
}
.toolbar-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: var(--accent);
}
.bulk-clear-btn {
  font-size: 0.7rem; color: var(--muted-foreground); background: none;
  border: none; cursor: pointer; text-decoration: underline; padding: 0.2rem 0.35rem;
}
.bulk-clear-btn:hover { color: var(--text-primary); }

.audit-active-filters {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  padding: 0.18rem 0.5rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--surface-100) 70%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 75%, transparent);
  color: var(--text-primary);
}

.filter-tag-x {
  border: 0;
  background: transparent;
  font-size: 0.78rem;
  color: var(--muted-foreground);
  cursor: pointer;
  line-height: 1;
  padding: 0;
}

.filter-tag-x:hover {
  color: var(--text-primary);
}

.bulk-bar-enter-active, .bulk-bar-leave-active { transition: max-height 0.25s ease, opacity 0.2s ease; overflow: hidden; }
.bulk-bar-enter-from, .bulk-bar-leave-to { max-height: 0; opacity: 0; }
.bulk-bar-enter-to, .bulk-bar-leave-from { max-height: 3.5rem; opacity: 1; }
</style>
