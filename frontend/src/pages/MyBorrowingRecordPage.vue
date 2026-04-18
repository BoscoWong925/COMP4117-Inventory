<template>
  <div class="page-container">
    <ModulePageHeader title="My Borrowing Record" subtitle="Track all your borrow requests and their status">
    </ModulePageHeader>

    <!-- Search and Sort -->
    <div class="filter-bar">
      <Input
        type="text"
        placeholder="Search by item name or request ID..."
        v-model="searchText"
        class="filter-search"
      />
      <button class="sort-toggle" @click="toggleSort">
        <ArrowUpDown :size="14" />
        {{ sortOrder === 'desc' ? 'Newest first' : 'Oldest first' }}
      </button>
    </div>

    <!-- Status Filter -->
    <div class="record-filter-tools mb-4">
      <DropdownMenu align="start">
        <template #trigger>
          <button :class="['toolbar-btn', { 'toolbar-btn--active': isStatusFilterActive }]">
            <Filter :size="12" /> Filter
            <span v-if="isStatusFilterActive" class="toolbar-dot"></span>
          </button>
        </template>
        <template #default="{ close }">
          <DropdownMenuItem label>Status</DropdownMenuItem>
          <DropdownMenuItem
            v-for="tab in statusTabs"
            :key="tab.key"
            checkable
            :checked="activeStatusTab === tab.key"
            @click="activeStatusTab = tab.key; currentPage = 1; close()"
          >
            {{ tab.label }}
          </DropdownMenuItem>
        </template>
      </DropdownMenu>

      <div v-if="isStatusFilterActive" class="record-active-filters">
        <span class="filter-tag">
          Status: {{ activeStatusLabel }}
          <button @click="activeStatusTab = 'all'; currentPage = 1" class="filter-tag-x">&times;</button>
        </span>
      </div>
    </div>

    <div v-if="loadError" class="empty-state" style="color:var(--danger)">
      Error loading records: {{ loadError }}
    </div>
    <div v-else-if="loading" class="empty-state">Loading records...</div>
    <div v-else-if="records.length === 0" class="empty-state">
      <p v-if="activeStatusTab !== 'all' || searchText">No matching records found</p>
      <p v-else>No borrowing records yet</p>
    </div>
    <div v-else class="space-y-4">
      <template v-for="group in paginatedGroups" :key="group.parent.id">
        <div class="record-card theme-card">
          <div class="p-4">
            <!-- Request stage indicator -->
            <div class="record-stage-row">
              <span class="stage-badge" :class="getStageClass(group.parent)">
                {{ getStageName(group.parent) }}
              </span>
              <span v-if="isRecordOverdue(group.parent)" class="overdue-badge">
                OVERDUE
              </span>
              <span class="record-date-label">{{ formatDateTime(group.parent.requestDate) }}</span>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
              <div>
                <p class="field-label">Request ID</p>
                <p class="font-medium">{{ group.parent.id }}</p>
              </div>
              <div>
                <p class="field-label">Item</p>
                <p class="font-medium">
                  {{ group.parent.itemName }}
                  <span v-if="group.children.length > 0" class="ml-1 text-xs text-accent-subtle font-normal">
                    (+ {{ group.children.length }} component{{ group.children.length > 1 ? 's' : '' }})
                  </span>
                </p>
              </div>
              <div>
                <p class="field-label">Item Owner</p>
                <span :class="group.parent.itemOwner === 'department' ? 'px-2 py-1 rounded text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'px-2 py-1 rounded text-sm bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'">
                  {{ getOwnerDisplayName(group.parent.itemOwner) }}
                </span>
              </div>
              <div>
                <p class="field-label">Return Date</p>
                <p class="font-medium">
                  {{ formatDateTime(group.parent.returnDate) || '—' }}
                  <span v-if="getDaysLeft(group.parent) !== null" class="days-indicator" :class="getDaysLeftClass(group.parent)">
                    {{ getDaysLeftLabel(group.parent) }}
                  </span>
                </p>
              </div>
            </div>

            <!-- Approval/Rejection result -->
            <div v-if="normalizedStatus(group.parent.status) === 'approved' || normalizedStatus(group.parent.status) === 'pending check-out'" class="result-banner result-banner--approved">
              <CheckCircle2 :size="16" />
              <div>
                <span class="result-label">Approved</span>
                <span v-if="group.parent.approvalDate" class="result-date"> on {{ formatDateTime(group.parent.approvalDate) }}</span>
              </div>
            </div>
            <div v-else-if="normalizedStatus(group.parent.status) === 'rejected'" class="result-banner result-banner--rejected">
              <XCircle :size="16" />
              <div>
                <span class="result-label">Rejected</span>
                <span v-if="group.parent.rejectionReason || group.parent.notes" class="result-reason"> — {{ group.parent.rejectionReason || group.parent.notes }}</span>
              </div>
            </div>
            <div v-else-if="normalizedStatus(group.parent.status) === 'returned'" class="result-banner result-banner--returned">
              <RotateCcw :size="16" />
              <div>
                <span class="result-label">Returned</span>
                <span v-if="group.parent.returnedDate" class="result-date"> on {{ formatDateTime(group.parent.returnedDate) }}</span>
              </div>
            </div>

            <div v-if="group.parent.reason" class="mb-3">
              <p class="field-label">Reason</p>
              <p class="font-medium text-base" style="line-height:1.5">{{ group.parent.reason }}</p>
            </div>

            <!-- Child component records -->
            <div v-if="group.children.length > 0" class="border-t pt-3 mb-3">
              <p class="field-label font-semibold mb-2">Linked Components</p>
              <div v-for="child in group.children" :key="child.id"
                class="flex items-center justify-between py-1.5 pl-4 text-sm text-secondary child-indicator mb-1">
                <div>
                  <span>↳ {{ child.itemName }}</span>
                  <span class="text-muted ml-1">({{ child.id }})</span>
                </div>
                <span :class="`px-2 py-0.5 rounded text-xs ${getStatusColor(child.status)}`">
                  {{ child.status }}
                </span>
              </div>
            </div>

          </div>
        </div>
      </template>

      <PaginationControl v-model:currentPage="currentPage" :totalItems="totalItems" :pageSize="pageSize" />
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { borrowingService, authService } from '../utils/services'
import { formatDate, formatDateTime, getStatusColor, isOverdue } from '../utils/helpers'
import { ArrowUpDown, CheckCircle2, XCircle, RotateCcw, Filter } from 'lucide-vue-next'
import PaginationControl from '../components/PaginationControl.vue'
import {
  UiModulePageHeader as ModulePageHeader,
  UiButton as Button,
  UiInput as Input,
  UiDropdownMenu as DropdownMenu,
  UiDropdownMenuItem as DropdownMenuItem,
} from '../components/ui'

export default {
  components: {
    PaginationControl,
    Button,
    Input,
    ModulePageHeader,
    DropdownMenu,
    DropdownMenuItem,
    ArrowUpDown,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Filter
  },
  props: {
    pageParams: { type: Object, default: () => ({}) },
  },
  setup(props) {
    const records = ref([])
    const loadError = ref('')
    const loading = ref(true)
    const currentPage = ref(1)
    const pageSize = 10
    const totalItems = ref(0)
    const searchText = ref('')
    const activeStatusTab = ref('all')
    const sortOrder = ref('desc')

    const normalizedStatus = (status) => String(status || '').trim().toLowerCase()

    const toggleSort = () => {
      sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
      currentPage.value = 1
    }

    const isRecordOverdue = (record) => {
      const s = normalizedStatus(record.status)
      return (s === 'approved' || s === 'pending check-out') && !record.returnedDate && isOverdue(record.returnDate)
    }

    const daysUntilReturn = (returnDate) => {
      if (!returnDate) return null
      const target = new Date(returnDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      target.setHours(0, 0, 0, 0)
      return Math.floor((target - today) / 86400000)
    }

    const getDaysLeft = (record) => {
      const s = normalizedStatus(record.status)
      if (s !== 'approved' && s !== 'pending check-out') return null
      if (record.returnedDate) return null
      return daysUntilReturn(record.returnDate)
    }

    const getDaysLeftClass = (record) => {
      const d = getDaysLeft(record)
      if (d === null) return ''
      if (d < 0) return 'days-indicator--overdue'
      if (d === 0) return 'days-indicator--today'
      if (d <= 3) return 'days-indicator--soon'
      return 'days-indicator--ok'
    }

    const getDaysLeftLabel = (record) => {
      const d = getDaysLeft(record)
      if (d === null) return ''
      if (d < 0) return `(${Math.abs(d)}d overdue)`
      if (d === 0) return '(due today)'
      return `(${d}d left)`
    }

    const getStageClass = (record) => {
      const s = normalizedStatus(record.status)
      if (s === 'pending') return 'stage--pending'
      if (s === 'pending check-out') return 'stage--checkout'
      if (s === 'approved') return 'stage--approved'
      if (s === 'rejected') return 'stage--rejected'
      if (s === 'returned') return 'stage--returned'
      return ''
    }

    const getStageName = (record) => {
      const s = normalizedStatus(record.status)
      if (s === 'pending') return 'Pending Approval'
      if (s === 'pending check-out') return 'Pending Check-Out'
      if (s === 'approved') return 'Approved (Borrowed)'
      if (s === 'rejected') return 'Rejected'
      if (s === 'returned') return 'Returned'
      return record.status
    }

    const statusTabs = [
      { key: 'all', label: 'All', count: 0, countClass: '' },
      { key: 'pending', label: 'Pending', count: 0, countClass: '' },
      { key: 'approved', label: 'Approved', count: 0, countClass: '' },
      { key: 'rejected', label: 'Rejected', count: 0, countClass: '' },
      { key: 'returned', label: 'Returned', count: 0, countClass: '' },
    ]

    const activeStatusLabel = computed(() => {
      const tab = statusTabs.find(t => t.key === activeStatusTab.value)
      return tab ? tab.label : 'All'
    })

    const isStatusFilterActive = computed(() => activeStatusTab.value !== 'all')

    // Server handles all filtering; groupedRecords just reconstructs parent-child structure
    const groupedRecords = computed(() => {
      const allRecords = records.value
      const childrenByParent = new Map()
      const parentIdSet = new Set()
      allRecords.forEach(r => {
        if (r.parentRequestId) {
          if (!childrenByParent.has(r.parentRequestId)) childrenByParent.set(r.parentRequestId, [])
          childrenByParent.get(r.parentRequestId).push(r)
        } else {
          parentIdSet.add(r.id)
        }
      })

      const groups = []
      allRecords.filter(r => !r.parentRequestId).forEach(parent => {
        groups.push({ parent, children: childrenByParent.get(parent.id) || [] })
      })
      allRecords.filter(r => r.parentRequestId && !parentIdSet.has(r.parentRequestId))
        .forEach(orphan => {
          groups.push({ parent: orphan, children: [] })
        })

      return groups
    })

    const paginatedGroups = computed(() => groupedRecords.value)

    const statusMap = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', returned: 'Returned' }

    const loadRecords = async () => {
      loadError.value = ''
      loading.value = true
      try {
        const currentUser = authService.getCurrentUser()
        const userID = currentUser?.userId || currentUser?.id || 'UNKNOWN'
        const response = await borrowingService.getRequestsForUser(userID, {
          page: currentPage.value,
          pageSize,
          search: searchText.value || undefined,
          status: activeStatusTab.value !== 'all' ? statusMap[activeStatusTab.value] : undefined,
          sortDir: sortOrder.value,
        })
        const userRequests = response.requests || []
        records.value = userRequests.map(req => ({
          ...req,
          itemName: req.itemName || 'Unknown Item'
        }))
        totalItems.value = response.total || 0
      } catch (e) {
        console.error('Failed to load records:', e)
        loadError.value = e.message || 'Failed to load records'
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      loadRecords()
      if (props.pageParams?.tab) {
        activeStatusTab.value = props.pageParams.tab
      }
    })

    watch(() => props.pageParams?.tab, (newTab) => {
      if (newTab) {
        activeStatusTab.value = newTab
        currentPage.value = 1
      }
    })

    watch([searchText, activeStatusTab, sortOrder], () => {
      if (currentPage.value !== 1) {
        currentPage.value = 1
      } else {
        loadRecords()
      }
    })

    watch(currentPage, () => {
      loadRecords()
    })

    const getOwnerDisplayName = (ownerId) => {
      if (!ownerId || ownerId === 'department') return 'Department'
      return ownerId
    }

    return {
      records, loadError, loading,
      searchText, activeStatusTab, sortOrder, toggleSort,
      statusTabs, groupedRecords, paginatedGroups,
      activeStatusLabel, isStatusFilterActive,
      currentPage, pageSize, totalItems,
      normalizedStatus, isRecordOverdue,
      getDaysLeft, getDaysLeftClass, getDaysLeftLabel,
      getStageClass, getStageName,
      formatDate, formatDateTime, getStatusColor, getOwnerDisplayName,
    }
  }
}
</script>

<style scoped>
.filter-bar {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}
.filter-search {
  flex: 1;
  min-width: 200px;
}
.sort-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--card);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.12s;
  white-space: nowrap;
}
.sort-toggle:hover { background: var(--surface-100); }

.record-filter-tools {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.28rem 0.6rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.12s;
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

.record-active-filters {
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

.filter-tag-x:hover { color: var(--text-primary); }

.record-card {
  transition: border-color 0.12s;
}

.record-stage-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}
.record-date-label {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.stage-badge {
  display: inline-flex;
  padding: 0.25rem 0.625rem;
  border-radius: var(--radius-md);
  font-size: 0.6875rem;
  font-weight: 700;
  white-space: nowrap;
}
.stage--pending { background: var(--warning-light); color: var(--warning-dark); }
.stage--checkout { background: #dbeafe; color: #1d4ed8; }
.stage--approved { background: var(--success-light); color: var(--success); }
.stage--rejected { background: var(--danger-light); color: var(--danger); }
.stage--returned { background: var(--surface-100); color: var(--muted-foreground); }

.overdue-badge {
  display: inline-flex;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-md);
  font-size: 0.625rem;
  font-weight: 800;
  background: var(--danger);
  color: white;
  animation: pulse-overdue 2s ease-in-out infinite;
}
@keyframes pulse-overdue {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.days-indicator {
  font-size: 0.6875rem;
  font-weight: 600;
  margin-left: 0.25rem;
}
.days-indicator--overdue { color: var(--danger); }
.days-indicator--today { color: var(--warning-dark); }
.days-indicator--soon { color: #c2410c; }
.days-indicator--ok { color: var(--success); }

.result-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
  border-radius: var(--radius-md);
  margin-bottom: 0.75rem;
  font-size: 0.8125rem;
}
.result-banner--approved {
  background: var(--success-light);
  color: var(--success);
}
.result-banner--rejected {
  background: var(--danger-light);
  color: var(--danger);
}
.result-banner--returned {
  background: var(--surface-100);
  color: var(--muted-foreground);
}
.result-label { font-weight: 700; }
.result-date { font-size: 0.75rem; }
.result-reason { font-size: 0.75rem; opacity: 0.85; }
</style>
