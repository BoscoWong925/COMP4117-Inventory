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

    <!-- Status Tabs -->
    <div class="status-tabs">
      <button v-for="tab in statusTabs" :key="tab.key"
        class="status-tab" :class="{ active: activeStatusTab === tab.key }"
        @click="activeStatusTab = tab.key; currentPage = 1">
        {{ tab.label }}
        <span class="tab-count" :class="tab.countClass">{{ tab.count }}</span>
      </button>
    </div>

    <div v-if="loadError" class="empty-state" style="color:var(--danger)">
      Error loading records: {{ loadError }}
    </div>
    <div v-else-if="loading" class="empty-state">Loading records...</div>
    <div v-else-if="filteredRecords.length === 0" class="empty-state">
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

      <PaginationControl v-model:currentPage="currentPage" :totalItems="filteredRecords.length" :pageSize="pageSize" />
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { borrowingService, authService } from '../utils/services'
import { formatDate, formatDateTime, getStatusColor, isOverdue } from '../utils/helpers'
import { ArrowUpDown, CheckCircle2, XCircle, RotateCcw } from 'lucide-vue-next'
import PaginationControl from '../components/PaginationControl.vue'
import {
  UiModulePageHeader as ModulePageHeader,
  UiButton as Button,
  UiInput as Input,
} from '../components/ui'

export default {
  components: { PaginationControl, Button, Input, ModulePageHeader, ArrowUpDown, CheckCircle2, XCircle, RotateCcw },
  props: {
    pageParams: { type: Object, default: () => ({}) },
  },
  setup(props) {
    const records = ref([])
    const loadError = ref('')
    const loading = ref(true)
    const currentPage = ref(1)
    const pageSize = 10
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

    const statusTabs = computed(() => {
      const counts = { all: 0, pending: 0, approved: 0, rejected: 0, returned: 0 }
      for (const r of records.value) {
        counts.all++
        const s = normalizedStatus(r.status)
        if (s === 'pending') counts.pending++
        else if (s === 'approved' || s === 'pending check-out') counts.approved++
        else if (s === 'rejected') counts.rejected++
        else if (s === 'returned') counts.returned++
      }
      return [
        { key: 'all', label: 'All', count: counts.all, countClass: '' },
        { key: 'pending', label: 'Pending', count: counts.pending, countClass: counts.pending > 0 ? 'tab-count--warning' : '' },
        { key: 'approved', label: 'Approved', count: counts.approved, countClass: counts.approved > 0 ? 'tab-count--success' : '' },
        { key: 'rejected', label: 'Rejected', count: counts.rejected, countClass: counts.rejected > 0 ? 'tab-count--danger' : '' },
        { key: 'returned', label: 'Returned', count: counts.returned, countClass: '' },
      ]
    })

    const filteredRecords = computed(() => {
      let filtered = [...records.value]

      // Status filter
      if (activeStatusTab.value !== 'all') {
        filtered = filtered.filter(r => {
          const s = normalizedStatus(r.status)
          if (activeStatusTab.value === 'pending') return s === 'pending'
          if (activeStatusTab.value === 'approved') return s === 'approved' || s === 'pending check-out'
          if (activeStatusTab.value === 'rejected') return s === 'rejected'
          if (activeStatusTab.value === 'returned') return s === 'returned'
          return true
        })
      }

      // Search filter
      if (searchText.value.trim()) {
        const q = searchText.value.trim().toLowerCase()
        filtered = filtered.filter(r =>
          (r.itemName || '').toLowerCase().includes(q) ||
          (r.id || '').toLowerCase().includes(q) ||
          (r.requestId || '').toLowerCase().includes(q)
        )
      }

      // Sort
      if (activeStatusTab.value === 'approved') {
        // Checked-out tab: overdue first, then by closest return date, then no-return-date last
        const now = Date.now()
        filtered.sort((a, b) => {
          const aHas = !!a.returnDate
          const bHas = !!b.returnDate
          // Items without returnDate go to the end
          if (aHas && !bHas) return -1
          if (!aHas && bHas) return 1
          if (!aHas && !bHas) {
            // Both without returnDate: fall back to createdAt
            const aTime = new Date(a.requestDate || a.createdAt || 0).getTime()
            const bTime = new Date(b.requestDate || b.createdAt || 0).getTime()
            return bTime - aTime
          }
          // Both have returnDate
          const aTime = new Date(a.returnDate).getTime()
          const bTime = new Date(b.returnDate).getTime()
          const aOverdue = aTime < now
          const bOverdue = bTime < now
          // Overdue items come first
          if (aOverdue && !bOverdue) return -1
          if (!aOverdue && bOverdue) return 1
          // Within same group: closer to today ranks higher
          const aDist = Math.abs(aTime - now)
          const bDist = Math.abs(bTime - now)
          return aDist - bDist
        })
      } else {
        filtered.sort((a, b) => {
          const aTime = new Date(a.requestDate || a.createdAt || 0).getTime()
          const bTime = new Date(b.requestDate || b.createdAt || 0).getTime()
          return sortOrder.value === 'desc' ? bTime - aTime : aTime - bTime
        })
      }

      return filtered
    })

    // Group records: parent records with their child component records
    const groupedRecords = computed(() => {
      const allRecords = filteredRecords.value
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

    const paginatedGroups = computed(() => {
      const start = (currentPage.value - 1) * pageSize
      return groupedRecords.value.slice(start, start + pageSize)
    })

    const loadRecords = async () => {
      loadError.value = ''
      loading.value = true
      try {
        const currentUser = authService.getCurrentUser()
        const userID = currentUser?.userId || currentUser?.id || 'UNKNOWN'
        const response = await borrowingService.getRequestsForUser(userID)
        const userRequests = response.requests || []
        records.value = userRequests.map(req => ({
          ...req,
          itemName: req.itemName || 'Unknown Item'
        }))
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

    const getOwnerDisplayName = (ownerId) => {
      if (!ownerId || ownerId === 'department') return 'Department'
      return ownerId
    }

    return {
      records, loadError, loading,
      searchText, activeStatusTab, sortOrder, toggleSort,
      statusTabs, filteredRecords, groupedRecords, paginatedGroups,
      currentPage, pageSize,
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

.status-tabs {
  display: flex;
  gap: 0.125rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1rem;
  overflow-x: auto;
}
.status-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 0.875rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--muted-foreground);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.12s, border-color 0.12s;
}
.status-tab:hover { color: var(--text-secondary); }
.status-tab.active { color: var(--text-primary); border-bottom-color: var(--accent); }

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.375rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 700;
  background: var(--surface-100);
  color: var(--muted-foreground);
}
.tab-count--warning { background: var(--warning-light); color: var(--warning-dark); }
.tab-count--success { background: var(--success-light); color: var(--success); }
.tab-count--danger { background: var(--danger-light); color: var(--danger); }

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
