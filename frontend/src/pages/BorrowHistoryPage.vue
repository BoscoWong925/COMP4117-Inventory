<template>
  <div class="page-container">
    <ModulePageHeader title="Borrowing History" :subtitle="historySummaryText">
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
          <FilterSelect
            v-model="filters.status"
            label="Status"
            empty-label="All Statuses"
            :options="['Approved', 'Returned', 'Pending', 'Rejected']"
          />
        </div>
        <div>
          <label class="filter-label">Request Date</label>
          <FilterDatePicker v-model="filters.requestDate" placeholder="Select request date" />
        </div>
        <div>
          <label class="filter-label">Approval Date</label>
          <FilterDatePicker v-model="filters.approvalDate" placeholder="Select approval date" />
        </div>
        <div>
          <label class="filter-label">Return Date</label>
          <FilterDatePicker v-model="filters.returnDate" placeholder="Select return date" />
        </div>
        <div>
          <label class="filter-label">Returned Date</label>
          <FilterDatePicker v-model="filters.returnedDate" placeholder="Select returned date" />
        </div>
      </div>
    </ModuleFilterPanel>

    <Card class="history-table-card">
      <div class="history-filter-tools">
        <DropdownMenu align="start">
          <template #trigger>
            <button :class="['toolbar-btn', { 'toolbar-btn--active': filters.status !== '' }]">
              <Filter :size="12" /> Status <ChevronDown :size="10" />
              <span v-if="filters.status !== ''" class="toolbar-dot"></span>
            </button>
          </template>
          <template #default="{ close }">
            <DropdownMenuItem label>Status</DropdownMenuItem>
            <DropdownMenuItem checkable :checked="filters.status === ''" @click="filters.status = ''; close()">All Statuses</DropdownMenuItem>
            <DropdownMenuItem
              v-for="status in statusTabs.filter(s => s !== 'All')"
              :key="status"
              checkable
              :checked="filters.status === status"
              @click="filters.status = status; close()"
            >
              {{ status }}
            </DropdownMenuItem>
            <template v-if="filters.status !== ''">
              <DropdownMenuItem separator />
              <DropdownMenuItem destructive @click="filters.status = ''; close()">
                <XCircle :size="12" /> Clear Status Filter
              </DropdownMenuItem>
            </template>
          </template>
        </DropdownMenu>
      </div>

      <div v-if="filters.status" class="history-active-filters">
        <span class="filter-tag">
          Status: {{ filters.status }}
          <button @click="filters.status = ''" class="filter-tag-x">&times;</button>
        </span>
      </div>

      <Transition name="bulk-bar">
        <div v-if="isAdmin && selectedHistoryIds.length > 0" class="bulk-toolbar">
          <div class="bulk-toolbar-left">
            <span class="bulk-chip">{{ selectedHistoryIds.length }} selected</span>
            <span v-if="historyLoadState.isFetching" class="history-fetch-chip">Updating...</span>
            <DropdownMenu align="start">
              <template #trigger>
                <button class="toolbar-btn">
                  <Zap :size="12" /> Actions <ChevronDown :size="10" />
                </button>
              </template>
              <template #default="{ close }">
                <DropdownMenuItem destructive @click="showDeleteConfirm = true; close()">
                  <Trash2 :size="12" /> Delete ({{ selectedHistoryIds.length }})
                </DropdownMenuItem>
              </template>
            </DropdownMenu>
            <button class="bulk-clear-btn" @click="selectedHistoryIds = []">Clear</button>
          </div>
        </div>
      </Transition>

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
              <th>Request Date</th>
              <th>Approval Date</th>
              <th>Return Date</th>
              <th>Returned</th>
            </tr>
          </thead>

          <tbody>
            <template v-if="showHistorySkeleton">
              <tr>
                <td :colspan="isAdmin ? 9 : 8" class="table-spinner-cell">
                  <Spinner size="lg" label="Loading history..." />
                </td>
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
        :page-size-options="[20, 50, 100]"
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
import { Download, Zap, ChevronDown, Trash2, Filter, XCircle } from 'lucide-vue-next'
import { borrowingService, authService } from '../utils/services'
import { formatDate, formatDateTime, exportToExcel } from '../utils/helpers'
import { useActionLock } from '../hooks/useActionLock'
import {
  UiButton as Button,
  UiCard as Card,
  UiBadge as Badge,
  UiCheckbox as Checkbox,
  UiFilterDatePicker as FilterDatePicker,
  UiFilterSelect as FilterSelect,
  UiInput as Input,
  UiModulePageHeader as ModulePageHeader,
  UiModuleFilterPanel as ModuleFilterPanel,
  UiTablePaginationBar as TablePaginationBar,
  UiSpinner as Spinner,
  UiDropdownMenu as DropdownMenu,
  UiDropdownMenuItem as DropdownMenuItem,
} from '../components/ui'

export default {
  components: {
    Button, Card, Badge, Checkbox, FilterDatePicker, FilterSelect, Input,
    ModulePageHeader, ModuleFilterPanel, TablePaginationBar, Spinner,
    DropdownMenu, DropdownMenuItem,
    Download, Zap, ChevronDown, Trash2, Filter, XCircle
  },
  props: {
    pageParams: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props) {
    const { runAction } = useActionLock()
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
    // Note: sorting UI removed; sortField/sortDir kept for API default ordering
    const currentPage = ref(1)
    const pageSize = ref(50)
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
      const ids = [...selectedHistoryIds.value]
      await runAction('Deleting records...', async (onProgress) => {
        let done = 0
        for (const id of ids) {
          try {
            await borrowingService.deleteRequest(id)
          } catch (error) {
            console.error(`Failed to delete record ${id}:`, error)
          }
          done++
          onProgress(done, ids.length)
        }
        selectedHistoryIds.value = []
        loadHistory()
      })
    }

    const buildQueryParams = () => {
      const f = filters.value
      const params = {
        page: currentPage.value,
        pageSize: pageSize.value,
        sortBy: sortField.value,
        sortDir: sortDir.value,
      }
      if (f.status) params.historyStatus = f.status

      if (f.requestId) params.requestIdSearch = f.requestId
      if (f.itemName) params.itemNameSearch = f.itemName
      if (f.borrower) params.borrowerSearch = f.borrower

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
          status: req.historyStatus || req.status,
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
            status: req.historyStatus || req.status,
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
.table-spinner-cell {
  text-align: center;
  padding: 3rem 1rem !important;
  background: var(--card);
}
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

.history-filter-tools {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface-50);
}

.history-active-filters {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 1rem;
  border-bottom: 1px solid var(--border);
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

.bulk-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface-50);
}
.bulk-toolbar-left {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}
.bulk-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-surface);
  border-radius: 999px;
}
.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--muted-foreground);
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.12s;
  position: relative;
  white-space: nowrap;
}
.toolbar-btn:hover {
  background: var(--surface-100);
  color: var(--text-secondary);
}

.toolbar-btn--active {
  border-color: var(--accent);
  color: var(--accent);
}

.toolbar-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 6px;
  height: 6px;
  background: var(--accent);
  border-radius: 50%;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  font-weight: 600;
  background: var(--accent-surface);
  color: var(--accent);
  border-radius: var(--radius-sm);
}

.filter-tag-x {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--accent);
  padding: 0;
  line-height: 1;
}

.filter-tag-x:hover {
  opacity: 0.7;
}
.bulk-clear-btn {
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--muted-foreground);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.bulk-clear-btn:hover { color: var(--text-primary); }

.bulk-bar-enter-active, .bulk-bar-leave-active { transition: max-height 0.25s ease, opacity 0.2s ease; overflow: hidden; }
.bulk-bar-enter-from, .bulk-bar-leave-to { max-height: 0; opacity: 0; }
.bulk-bar-enter-to, .bulk-bar-leave-from { max-height: 4rem; opacity: 1; }
</style>
