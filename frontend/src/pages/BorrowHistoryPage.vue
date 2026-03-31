<template>
  <div class="page-container">
    <ModulePageHeader title="Borrowing History" :subtitle="historySummaryText">
      <Button v-if="isAdmin && selectedHistoryIds.length > 0" variant="destructive" size="sm" @click="showDeleteConfirm = true">
        Delete ({{ selectedHistoryIds.length }})
      </Button>
      <Button variant="outline" size="sm" @click="showFilters = !showFilters">
        {{ showFilters ? 'Hide Filters' : 'Show Filters' }}
      </Button>
      <Button size="sm" @click="exportHistory">
        <Download :size="14" /> Export to Excel
      </Button>
    </ModulePageHeader>

    <ModuleFilterPanel v-if="showFilters" @clear="clearAllFilters">
      <div class="history-filter-grid">
        <div>
          <label class="filter-label">Request ID</label>
          <Input v-model="filters.requestId" type="text" placeholder="e.g. REQ-001" />
        </div>
        <div>
          <label class="filter-label">Item Name</label>
          <Input v-model="filters.itemName" type="text" placeholder="Search item..." />
        </div>
        <div>
          <label class="filter-label">Borrower</label>
          <Input v-model="filters.borrower" type="text" placeholder="Name or ID..." />
        </div>
        <div>
          <label class="filter-label">Status</label>
          <Select v-model="filters.status">
            <option value="">All Statuses</option>
            <option v-for="status in ['Approved', 'Returned', 'Pending', 'Rejected']" :key="status" :value="status">{{ status }}</option>
          </Select>
        </div>
        <div>
          <label class="filter-label">Request Date</label>
          <Input v-model="filters.requestDate" type="date" />
        </div>
        <div>
          <label class="filter-label">Approval Date</label>
          <Input v-model="filters.approvalDate" type="date" />
        </div>
        <div>
          <label class="filter-label">Return Date</label>
          <Input v-model="filters.returnDate" type="date" />
        </div>
        <div>
          <label class="filter-label">Returned Date</label>
          <Input v-model="filters.returnedDate" type="date" />
        </div>
      </div>
    </ModuleFilterPanel>

    <Card class="history-table-card">
      <div class="history-tabs">
        <button
          v-for="status in statusTabs"
          :key="status"
          :class="['history-tab', { active: (filters.status === '' && status === 'All') || filters.status === status }]"
          @click="filters.status = status === 'All' ? '' : status"
        >
          {{ status }}
        </button>
      </div>

      <div class="history-toolbar">
        <span v-if="selectedHistoryIds.length > 0" class="history-selected-chip">{{ selectedHistoryIds.length }} selected</span>
        <span v-if="historyLoadState.isFetching" class="history-fetch-chip">Updating...</span>
      </div>

      <div class="table-responsive">
        <table class="table-striped theme-table history-table">
          <thead>
            <tr>
              <th v-if="isAdmin" class="text-center" style="width:2.5rem">
                <Checkbox
                  :checked="allSelected"
                  :indeterminate="selectedHistoryIds.length > 0 && !allSelected"
                  @update:checked="toggleSelectAll"
                />
              </th>
              <th>Request ID</th>
              <th>Item</th>
              <th>Borrower</th>
              <th>Status</th>
              <th class="history-sort-head" @click="toggleSort('requestDate')">Request Date <span>{{ getSortIcon('requestDate') }}</span></th>
              <th class="history-sort-head" @click="toggleSort('approvalDate')">Approval Date <span>{{ getSortIcon('approvalDate') }}</span></th>
              <th class="history-sort-head" @click="toggleSort('returnDate')">Return Date <span>{{ getSortIcon('returnDate') }}</span></th>
              <th class="history-sort-head" @click="toggleSort('returnedDate')">Returned <span>{{ getSortIcon('returnedDate') }}</span></th>
            </tr>
          </thead>

          <tbody>
            <template v-if="showHistorySkeleton">
              <tr v-for="idx in historySkeletonRows" :key="'history-skel-' + idx" class="history-row-skeleton">
                <td v-if="isAdmin" class="text-center"><span class="history-skeleton-box"></span></td>
                <td><span class="history-skeleton-line history-skeleton-id"></span></td>
                <td><span class="history-skeleton-line history-skeleton-item"></span></td>
                <td><span class="history-skeleton-line history-skeleton-user"></span></td>
                <td><span class="history-skeleton-line history-skeleton-short"></span></td>
                <td><span class="history-skeleton-line history-skeleton-short"></span></td>
                <td><span class="history-skeleton-line history-skeleton-short"></span></td>
                <td><span class="history-skeleton-line history-skeleton-short"></span></td>
                <td><span class="history-skeleton-line history-skeleton-short"></span></td>
              </tr>
            </template>

            <tr v-else-if="historyErrorMessage" class="history-empty-row">
              <td :colspan="isAdmin ? 9 : 8" class="history-empty-cell">{{ historyErrorMessage }}</td>
            </tr>

            <template v-else-if="history.length > 0">
              <tr v-for="record in history" :key="record.id">
                <td v-if="isAdmin" class="text-center">
                  <Checkbox
                    :checked="selectedHistoryIds.includes(record.id)"
                    @update:checked="toggleRecordSelection(record.id, $event)"
                  />
                </td>
                <td class="history-cell-id">{{ record.id }}</td>
                <td>{{ record.itemName }}</td>
                <td>{{ record.borrowerName }} ({{ record.borrowerID }})</td>
                <td><Badge :variant="getStatusVariant(record.status)">{{ record.status }}</Badge></td>
                <td class="history-date-cell">{{ formatDateTime(record.requestDate) }}</td>
                <td class="history-date-cell">{{ formatDateTime(record.approvalDate) }}</td>
                <td class="history-date-cell">{{ formatDateTime(record.returnDate) }}</td>
                <td class="history-date-cell">{{ formatDateTime(record.returnedDate) }}</td>
              </tr>
            </template>

            <tr v-else class="history-empty-row">
              <td :colspan="isAdmin ? 9 : 8" class="history-empty-cell">No records found</td>
            </tr>
          </tbody>
        </table>
      </div>

      <TablePaginationBar
        v-model:currentPage="currentPage"
        v-model:pageSize="pageSize"
        :total-items="totalHistory"
        :disabled="showHistorySkeleton"
        item-label="records"
      />
    </Card>

    <div v-if="showDeleteConfirm" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Confirm Delete</h3>
        <p class="mb-4" style="color:var(--text-secondary);font-size:0.875rem">Are you sure you want to delete <strong>{{ selectedHistoryIds.length }}</strong> record(s)?</p>
        <p class="text-sm mb-4" style="color:var(--danger)">This action cannot be undone.</p>
        <div class="flex gap-2">
          <Button variant="destructive" class="flex-1" @click="handleDeleteRecords">Delete</Button>
          <Button variant="outline" class="flex-1" @click="showDeleteConfirm = false">Cancel</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Download } from 'lucide-vue-next'
import { borrowingService, authService } from '../utils/services'
import { formatDate, formatDateTime, exportToExcel } from '../utils/helpers'
import {
  UiButton as Button,
  UiCard as Card,
  UiBadge as Badge,
  UiCheckbox as Checkbox,
  UiInput as Input,
  UiSelect as Select,
  UiModulePageHeader as ModulePageHeader,
  UiModuleFilterPanel as ModuleFilterPanel,
  UiTablePaginationBar as TablePaginationBar,
} from '../components/ui'

export default {
  components: {
    Button, Card, Badge, Checkbox, Input, Select,
    ModulePageHeader, ModuleFilterPanel, TablePaginationBar,
    Download
  },
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
    const pageSize = ref(10)
    const selectedHistoryIds = ref([])
    const showDeleteConfirm = ref(false)
    const statusTabs = ['All', 'Approved', 'Returned', 'Pending', 'Rejected']

    const historyLoadState = reactive({
      isInitialLoading: true,
      isFetching: false,
      isLoaded: false,
      error: null
    })

    let latestHistoryRequestId = 0
    let searchDebounceTimer = null

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

    const allSelected = computed(() =>
      history.value.length > 0 && history.value.every(record => selectedHistoryIds.value.includes(record.id))
    )

    const showHistorySkeleton = computed(() => historyLoadState.isFetching)
    const historyErrorMessage = computed(() => historyLoadState.error || '')
    const historySkeletonRows = computed(() => Math.min(Math.max(pageSize.value, 5), 10))

    const historySummaryText = computed(() => {
      if (historyLoadState.isInitialLoading && !historyLoadState.isLoaded) return 'Loading records...'
      if (historyLoadState.error && !historyLoadState.isLoaded) return 'Unable to load records'
      return `${totalHistory.value} record(s)`
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

    const getStatusVariant = (status) => {
      const normalized = (status || '').toLowerCase()
      if (normalized === 'approved' || normalized === 'returned') return 'success'
      if (normalized === 'pending') return 'warning'
      if (normalized === 'rejected' || normalized === 'overdue') return 'destructive'
      return 'outline'
    }

    const toggleSelectAll = (checked) => {
      const pageIds = history.value.map(record => record.id)
      if (checked) {
        const next = new Set([...selectedHistoryIds.value, ...pageIds])
        selectedHistoryIds.value = Array.from(next)
      } else {
        selectedHistoryIds.value = selectedHistoryIds.value.filter(id => !pageIds.includes(id))
      }
    }

    const toggleRecordSelection = (recordId, checked) => {
      if (checked) {
        if (!selectedHistoryIds.value.includes(recordId)) selectedHistoryIds.value.push(recordId)
      } else {
        selectedHistoryIds.value = selectedHistoryIds.value.filter(id => id !== recordId)
      }
    }

    const handleDeleteRecords = async () => {
      showDeleteConfirm.value = false
      try {
        for (const id of selectedHistoryIds.value) {
          try {
            await borrowingService.deleteRequest(id)
          } catch (error) {
            console.error(`Failed to delete record ${id}:`, error)
          }
        }
        selectedHistoryIds.value = []
        loadHistory()
      } catch (error) {
        console.error('Failed to delete records:', error)
      }
    }

    const buildQueryParams = () => {
      const f = filters.value
      const params = {
        page: currentPage.value,
        pageSize: pageSize.value,
        sortBy: sortField.value,
        sortDir: sortDir.value,
      }
      if (f.status) params.status = f.status

      const searchParts = [f.requestId, f.itemName, f.borrower].filter(Boolean)
      if (searchParts.length > 0) params.search = searchParts.join(' ')

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
      const requestId = ++latestHistoryRequestId
      historyLoadState.isFetching = true
      historyLoadState.error = null
      if (!historyLoadState.isLoaded) historyLoadState.isInitialLoading = true

      try {
        const params = buildQueryParams()
        const result = await borrowingService.getAllRequests(params)
        if (requestId !== latestHistoryRequestId) return

        history.value = (result.requests || []).map(req => ({
          ...req,
          itemName: req.itemName || 'Unknown Item',
          borrowerName: req.borrowerName || req.borrowerID
        }))
        totalHistory.value = result.total || 0
        historyLoadState.isLoaded = true
      } catch (error) {
        if (requestId !== latestHistoryRequestId) return
        console.error('Failed to load history:', error)
        historyLoadState.error = error?.message || 'Failed to load history records'
        if (!historyLoadState.isLoaded) {
          history.value = []
          totalHistory.value = 0
        }
      } finally {
        if (requestId !== latestHistoryRequestId) return
        historyLoadState.isFetching = false
        historyLoadState.isInitialLoading = false
      }
    }

    watch(
      [
        () => filters.value.status,
        () => filters.value.requestDate,
        () => filters.value.approvalDate,
        () => filters.value.returnDate,
        () => filters.value.returnedDate,
        () => sortField.value,
        () => sortDir.value,
        () => pageSize.value
      ],
      async () => {
        selectedHistoryIds.value = []
        if (currentPage.value !== 1) {
          currentPage.value = 1
          return
        }
        await loadHistory()
      }
    )

    watch(currentPage, async () => {
      selectedHistoryIds.value = []
      await loadHistory()
    })

    watch(
      () => [filters.value.requestId, filters.value.itemName, filters.value.borrower],
      () => {
        selectedHistoryIds.value = []
        currentPage.value = 1
        clearTimeout(searchDebounceTimer)
        searchDebounceTimer = setTimeout(() => {
          loadHistory()
        }, 400)
      }
    )

    const exportHistory = () => {
      borrowingService.getAllRequests({ ...buildQueryParams(), page: 1, pageSize: 9999 })
        .then((result) => {
          const data = (result.requests || []).map(req => ({
            ...req,
            itemName: req.itemName || 'Unknown Item',
            borrowerName: req.borrowerName || req.borrowerID
          }))
          exportToExcel(data, 'borrow_history.xlsx')
        })
        .catch(error => console.error('Export failed:', error))
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
      statusTabs,
      sortField,
      sortDir,
      toggleSort,
      getSortIcon,
      getStatusVariant,
      currentPage,
      pageSize,
      exportHistory,
      formatDate,
      formatDateTime,
      selectedHistoryIds,
      showDeleteConfirm,
      isAdmin,
      allSelected,
      toggleSelectAll,
      toggleRecordSelection,
      handleDeleteRecords,
      historyLoadState,
      showHistorySkeleton,
      historyErrorMessage,
      historySkeletonRows,
      historySummaryText,
    }
  }
}
</script>

<style scoped>
.history-filter-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 0.75rem;
}

@media (min-width: 768px) {
  .history-filter-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1120px) {
  .history-filter-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.filter-label {
  display: block;
  margin-bottom: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--muted-foreground);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.history-table-card {
  padding: 0;
  overflow: hidden;
}

.history-tabs {
  display: flex;
  gap: 0.125rem;
  border-bottom: 1px solid var(--border);
  padding: 0.75rem 1rem 0;
  overflow-x: auto;
}

.history-tab {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted-foreground);
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.12s, border-color 0.12s;
}

.history-tab:hover {
  color: var(--text-secondary);
}

.history-tab.active {
  color: var(--text-primary);
  border-bottom-color: var(--accent);
}

.history-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.25rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border);
}

.history-selected-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--danger);
  background: var(--danger-light);
  border-radius: 999px;
}

.history-fetch-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--muted-foreground);
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-50);
}

.history-sort-head {
  cursor: pointer;
  user-select: none;
}

.history-sort-head span {
  display: inline-block;
  width: 0.875rem;
  text-align: center;
  margin-left: 0.1875rem;
  font-size: 0.6875rem;
}

.history-cell-id {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.history-date-cell {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.history-row-skeleton td {
  pointer-events: none;
}

.history-skeleton-line,
.history-skeleton-box {
  display: inline-block;
  background: var(--surface-100);
  border-radius: var(--radius-sm);
  animation: historySkeletonPulse 2.2s ease-in-out infinite;
}

.history-skeleton-line {
  height: 0.625rem;
}

.history-skeleton-box {
  width: 0.875rem;
  height: 0.875rem;
}

.history-skeleton-id { width: 4rem; }
.history-skeleton-item { width: 8rem; max-width: 100%; }
.history-skeleton-user { width: 7rem; max-width: 100%; }
.history-skeleton-short { width: 5rem; max-width: 100%; }

@keyframes historySkeletonPulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 0.95; }
}

.history-empty-row td {
  text-align: center;
}

.history-empty-cell {
  padding: 2rem 1rem;
  color: var(--muted-foreground);
  font-size: 0.875rem;
}
</style>
