<template>
  <div class="page-container">
    <ModulePageHeader title="My Items" :subtitle="isTeacher ? 'Items you own and borrow' : 'Items currently checked out to you'">
    </ModulePageHeader>

    <!-- Search -->
    <div class="mb-4">
      <Input
        type="text"
        placeholder="Search by name, ID, or description..."
        v-model="searchText"
      />
    </div>

    <!-- Active status filter banner -->
    <div v-if="statusFilter" class="mb-3 p-3 rounded-lg flex items-center justify-between text-sm" style="background: var(--surface-2); border: 1px solid var(--border);">
      <span>Showing: <strong>{{ statusFilter }}</strong> items only</span>
      <button @click="statusFilter = ''" class="text-accent hover:underline font-medium">Clear Filter &times;</button>
    </div>

    <!-- Tabs for teacher -->
    <div v-if="isTeacher" class="flex gap-2 mb-4">
      <button
        :class="`pill ${activeTab === 'owned' ? 'pill-active' : ''}`"
        @click="activeTab = 'owned'; currentPage = 1"
      >
        Owned ({{ allOwnedItems.length }})
      </button>
      <button
        :class="`pill ${activeTab === 'borrowed' ? 'pill-active' : ''}`"
        @click="activeTab = 'borrowed'; currentPage = 1"
      >
        Borrowed ({{ borrowedItems.length }})
      </button>
    </div>

    <!-- Stats for teacher owned tab -->
    <div v-if="isTeacher && activeTab === 'owned'" class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <Card class="p-4 text-center">
        <p class="text-2xl font-bold text-accent">{{ allOwnedItems.length }}</p>
        <p class="text-xs text-muted">Total Owned</p>
      </Card>
      <Card class="p-4 text-center">
        <p class="text-2xl font-bold" style="color:var(--success)">{{ allOwnedItems.filter(i => i.status === 'Available').length }}</p>
        <p class="text-xs text-muted">Available</p>
      </Card>
      <Card class="p-4 text-center">
        <p class="text-2xl font-bold" style="color:var(--warning)">{{ allOwnedItems.filter(i => i.status === 'In-use').length }}</p>
        <p class="text-xs text-muted">In Use</p>
      </Card>
      <Card class="p-4 text-center">
        <p class="text-2xl font-bold" style="color:var(--info)">{{ allOwnedItems.filter(i => i.canBorrow).length }}</p>
        <p class="text-xs text-muted">Borrowable</p>
      </Card>
    </div>

    <div v-if="loading" class="empty-state">Loading items...</div>

    <!-- Teacher owned items table -->
    <template v-else-if="isTeacher && activeTab === 'owned'">
      <div v-if="filteredOwnedItems.length === 0" class="empty-state">
        <p>No owned items found</p>
      </div>
      <Card v-else class="myitems-table-card">
        <Transition name="bulk-bar">
          <div v-if="selectedOwnedItemIds.length > 0" class="bulk-toolbar">
            <div class="bulk-toolbar-left">
              <span class="bulk-chip">{{ selectedOwnedItemIds.length }} selected</span>
              <DropdownMenu align="start">
                <template #trigger>
                  <button class="toolbar-btn">
                    <Zap :size="12" /> Actions <ChevronDown :size="10" />
                  </button>
                </template>
                <template #default="{ close }">
                  <DropdownMenuItem @click="showBulkSetNotAvailableModal = true; close()">
                    <AlertCircle :size="12" /> Set Not Available ({{ selectedOwnedItemIds.length }})
                  </DropdownMenuItem>
                  <DropdownMenuItem success @click="showBulkSetAvailableModal = true; close()">
                    <CircleCheck :size="12" /> Set Available ({{ selectedOwnedItemIds.length }})
                  </DropdownMenuItem>
                </template>
              </DropdownMenu>
              <button class="bulk-clear-btn" @click="selectedOwnedItemIds = []">Clear</button>
            </div>
          </div>
        </Transition>
        <div class="table-responsive">
          <table class="table-striped theme-table">
            <thead>
              <tr>
                <th class="text-center" style="width:2.5rem">
                  <Checkbox
                    :checked="allOwnedSelected"
                    :indeterminate="selectedOwnedItemIds.length > 0 && !allOwnedSelected"
                    @update:checked="toggleSelectAllOwned"
                  />
                </th>
                <th>Item ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Status</th>
                <th>Location</th>
                <th>Current Borrower</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in paginatedOwnedItems" :key="item.id" @click="showDetail(item)" class="cursor-pointer">
                <td class="text-center" @click.stop>
                  <Checkbox
                    :checked="selectedOwnedItemIds.includes(item.id)"
                    @update:checked="toggleOwnedSelection(item.id, $event)"
                  />
                </td>
                <td class="text-sm" style="font-weight:600">{{ item.id }}</td>
                <td class="text-sm">{{ item.name }}</td>
                <td class="text-sm">{{ item.category }}</td>
                <td class="text-sm">
                  <Badge :variant="getStatusBadgeVariant(item.status)">{{ item.status }}</Badge>
                </td>
                <td class="text-sm">{{ item.location || '-' }}</td>
                <td class="text-sm">{{ item.currentBorrowerName || item.currentBorrower || '-' }}</td>
                <td class="text-center" @click.stop>
                  <DropdownMenu align="end">
                    <template #trigger>
                      <button class="kebab-trigger" aria-label="Row actions">
                        <MoreVertical :size="14" />
                      </button>
                    </template>
                    <template #default="{ close }">
                      <template v-if="item.status === 'Available'">
                        <DropdownMenuItem @click="changeStatus(item, 'Not Available'); close()">
                          <AlertCircle :size="12" /> Set Not Available
                        </DropdownMenuItem>
                      </template>
                      <template v-else-if="item.status === 'Not Available'">
                        <DropdownMenuItem success @click="changeStatus(item, 'Available'); close()">
                          <CircleCheck :size="12" /> Set Available
                        </DropdownMenuItem>
                      </template>
                    </template>
                  </DropdownMenu>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <TablePaginationBar
          v-model:currentPage="currentPage"
          v-model:pageSize="pageSizeRef"
          :total-items="ownedCount"
        />
      </Card>
    </template>

    <!-- Teacher borrowed items table -->
    <template v-else-if="isTeacher && activeTab === 'borrowed'">
      <div v-if="filteredBorrowedItems.length === 0" class="empty-state">
        <p>No borrowed items</p>
        <p class="text-sm mt-1">You haven't borrowed any items yet.</p>
      </div>
      <Card v-else class="myitems-table-card">
        <div class="table-responsive">
          <table class="table-striped theme-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Request ID</th>
                <th>Status</th>
                <th>Return Date</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="req in paginatedBorrowedItems" :key="req.id">
                <td class="text-sm" style="font-weight:500">{{ req.itemName }}</td>
                <td class="text-sm">{{ req.id }}</td>
                <td class="text-sm">
                  <Badge variant="info">Borrowed</Badge>
                </td>
                <td class="text-sm">{{ formatDate(req.returnDate) || 'N/A' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <TablePaginationBar
          v-model:currentPage="currentPage"
          v-model:pageSize="pageSizeRef"
          :total-items="borrowedCount"
        />
      </Card>
    </template>

    <!-- Student view: only checked-out borrowed items -->
    <template v-else>
      <div v-if="filteredBorrowedItems.length === 0" class="empty-state">
        <p>No items currently checked out to you</p>
      </div>
      <Card v-else class="myitems-table-card">
        <div class="table-responsive">
          <table class="table-striped theme-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Request ID</th>
                <th>Return Date</th>
                <th>Due Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="req in paginatedBorrowedItems" :key="req.id" :class="getRowUrgencyClass(req)">
                <td class="text-sm" style="font-weight:500">{{ req.itemName }}</td>
                <td class="text-sm">{{ req.id }}</td>
                <td class="text-sm">{{ formatDate(req.returnDate) || 'N/A' }}</td>
                <td class="text-sm">
                  <Badge :variant="getDueStatusVariant(req)">
                    {{ getDueStatusLabel(req) }}
                    <template v-if="getDueStatusLabel(req) === 'Overdue'"> ({{ getDaysOverdueCount(req) }}d)</template>
                  </Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <TablePaginationBar
          v-model:currentPage="currentPage"
          v-model:pageSize="pageSizeRef"
          :total-items="borrowedCount"
        />
      </Card>
    </template>

    <!-- Item Detail Modal (owned items only) -->
    <div v-if="selectedItem" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-xl font-bold">{{ selectedItem.name }}</h3>
          <button @click="selectedItem = null" class="text-muted hover:text-[color:var(--text-primary)] text-2xl">&times;</button>
        </div>
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div><p class="field-label">Item ID</p><p class="font-medium">{{ selectedItem.id }}</p></div>
          <div><p class="field-label">University ID</p><p class="font-medium">{{ selectedItem.universityID }}</p></div>
          <div><p class="field-label">Type</p><p class="font-medium">{{ selectedItem.type }}</p></div>
          <div><p class="field-label">Category</p><p class="font-medium">{{ selectedItem.category }}</p></div>
          <div><p class="field-label">Status</p><span :class="`px-2 py-1 rounded text-sm ${getStatusColor(selectedItem.status)}`">{{ selectedItem.status }}</span></div>
          <div><p class="field-label">Location</p><p class="font-medium">{{ selectedItem.location || 'N/A' }}</p></div>
          <div><p class="field-label">Current Borrower</p><p class="font-medium">{{ selectedItem.currentBorrowerName || selectedItem.currentBorrower || 'None' }}</p></div>
          <div><p class="field-label">Supplier</p><p class="font-medium">{{ selectedItem.supplier || 'N/A' }}</p></div>
          <div><p class="field-label">Purchase Date</p><p class="font-medium">{{ formatDate(selectedItem.purchaseDate) }}</p></div>
          <div><p class="field-label">Warranty End</p><p class="font-medium">{{ formatDate(selectedItem.warrantyEnd) }}</p></div>
          <div><p class="field-label">Price</p><p class="font-medium">${{ selectedItem.price || 0 }}</p></div>
        </div>
        <div v-if="selectedItem.description" class="mb-4">
          <p class="field-label mb-1">Description</p>
          <p class="text-sm theme-section p-3">{{ selectedItem.description }}</p>
        </div>
        <div class="flex justify-end">
          <button @click="selectedItem = null" class="px-4 py-2 btn-close-neutral">Close</button>
        </div>
      </div>
    </div>

    <!-- Bulk Set Not Available Modal -->
    <div v-if="showBulkSetNotAvailableModal" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Set Not Available ({{ selectedOwnedItemIds.length }} item{{ selectedOwnedItemIds.length !== 1 ? 's' : '' }})</h3>
        <p class="text-sm text-secondary mb-4">Mark all eligible selected items as Not Available?</p>
        <div class="flex gap-2">
          <Button variant="outline" class="flex-1" @click="handleBulkSetNotAvailable">Set Not Available</Button>
          <Button variant="ghost" class="flex-1" @click="showBulkSetNotAvailableModal = false">Cancel</Button>
        </div>
      </div>
    </div>

    <!-- Bulk Set Available Modal -->
    <div v-if="showBulkSetAvailableModal" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Set Available ({{ selectedOwnedItemIds.length }} item{{ selectedOwnedItemIds.length !== 1 ? 's' : '' }})</h3>
        <p class="text-sm text-secondary mb-4">Mark only selected Not Available items as Available?</p>
        <div class="flex gap-2">
          <Button variant="outline" class="flex-1" @click="handleBulkSetAvailable">Set Available</Button>
          <Button variant="ghost" class="flex-1" @click="showBulkSetAvailableModal = false">Cancel</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { inventoryService, borrowingService, authService } from '../utils/services'
import { formatDate, isOverdue } from '../utils/helpers'
import { MoreVertical, AlertCircle, CircleCheck, Zap, ChevronDown } from 'lucide-vue-next'
import {
  UiModulePageHeader as ModulePageHeader,
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
    ModulePageHeader, TablePaginationBar, DropdownMenu, DropdownMenuItem,
    Checkbox, Badge, Card, Button, Input,
    MoreVertical, AlertCircle, CircleCheck, Zap, ChevronDown
  },
  props: {
    pageParams: { type: Object, default: () => ({}) }
  },
  setup(props) {
    const allOwnedItems = ref([])
    const ownedItems = ref([])
    const borrowedItems = ref([])
    const searchText = ref('')
    const statusFilter = ref('')
    const selectedItem = ref(null)
    const loading = ref(true)
    const currentPage = ref(1)
    const pageSize = 15
    const pageSizeRef = ref(pageSize)
    const selectedOwnedItemIds = ref([])
    const showBulkSetNotAvailableModal = ref(false)
    const showBulkSetAvailableModal = ref(false)
    let searchTimer = null

    const currentUser = authService.getCurrentUser()
    const isTeacher = computed(() => currentUser?.subRole === 'teacher')
    const activeTab = ref(isTeacher.value ? 'owned' : 'borrowed')

    const getOwnerId = () => currentUser ? (currentUser.userId || currentUser.id) : null

    const ownedCount = ref(0)
    const borrowedCount = ref(0)
    const filteredOwnedItems = computed(() => {
      return allOwnedItems.value
    })

    const filteredBorrowedItems = computed(() => {
      // Sort: overdue first, then closest to return date, then no-return-date last
      return [...borrowedItems.value].sort((a, b) => {
        const aHas = !!a.returnDate
        const bHas = !!b.returnDate
        if (aHas && !bHas) return -1
        if (!aHas && bHas) return 1
        if (!aHas && !bHas) {
          const aTime = new Date(a.createdAt || 0).getTime()
          const bTime = new Date(b.createdAt || 0).getTime()
          return bTime - aTime
        }
        const now = Date.now()
        const aTime = new Date(a.returnDate).getTime()
        const bTime = new Date(b.returnDate).getTime()
        const aOverdue = aTime < now
        const bOverdue = bTime < now
        if (aOverdue && !bOverdue) return -1
        if (!aOverdue && bOverdue) return 1
        return Math.abs(aTime - now) - Math.abs(bTime - now)
      })
    })

    const dueSoonCount = computed(() => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      return filteredBorrowedItems.value.filter((req) => {
        if (!req.returnDate) return false
        if (isOverdue(req.returnDate)) return false

        const dueDate = new Date(req.returnDate)
        if (Number.isNaN(dueDate.getTime())) return false
        dueDate.setHours(0, 0, 0, 0)

        const diffDays = Math.floor((dueDate - today) / 86400000)
        return diffDays >= 0 && diffDays <= 7
      }).length
    })

    const overdueCount = computed(() => {
      return filteredBorrowedItems.value.filter((req) => req.returnDate && isOverdue(req.returnDate)).length
    })

    const paginatedOwnedItems = computed(() => {
      return filteredOwnedItems.value
    })

    const paginatedBorrowedItems = computed(() => {
      return filteredBorrowedItems.value
    })

    const allOwnedSelected = computed(() => {
      return paginatedOwnedItems.value.length > 0 && paginatedOwnedItems.value.every(item => selectedOwnedItemIds.value.includes(item.id))
    })

    const loadData = async () => {
      loading.value = true
      try {
        // Load owned items (teacher only)
        if (isTeacher.value && activeTab.value === 'owned') {
          const ownerId = getOwnerId()
          if (ownerId) {
            const params = { page: currentPage.value, pageSize }
            if (searchText.value) params.search = searchText.value
            if (statusFilter.value) params.status = statusFilter.value
            
            const { items: data, total } = await inventoryService.getItemsByOwner(ownerId, params)
            allOwnedItems.value = data
            ownedItems.value = data
            ownedCount.value = total
          }
        }

        // Load borrowed items (both teacher and student)
        if (currentUser && activeTab.value === 'borrowed') {
          const params = { page: currentPage.value, pageSize, status: 'Approved' }
          if (searchText.value) params.search = searchText.value

          const userId = currentUser.userId || currentUser.id
          const response = await borrowingService.getRequestsForUser(userId, params)
          borrowedItems.value = response.requests || []
          borrowedCount.value = response.total || 0
        }

      } catch (e) {
        console.error('Failed to load items:', e)
      }
      loading.value = false
    }

    watch([searchText, statusFilter, currentPage, activeTab], () => {
      clearTimeout(searchTimer)
      searchTimer = setTimeout(() => {
        loadData()
      }, 400)
    })

    const showDetail = (item) => {
      selectedItem.value = item
    }

    const changeStatus = async (item, newStatus) => {
      const currentStatus = item.status
      const isValidTransition =
        (currentStatus === 'Available' && newStatus === 'Not Available') ||
        (currentStatus === 'Not Available' && newStatus === 'Available')

      if (!isValidTransition) {
        alert('Status change not allowed. In-use items must go through return procedures.')
        return
      }

      try {
        await inventoryService.updateItemStatus(item.id, newStatus)
        item.status = newStatus
      } catch (e) {
        alert(e.response?.data?.message || 'Failed to update status')
      }
    }

    const toggleSelectAllOwned = (checked) => {
      const pageIds = paginatedOwnedItems.value.map(item => item.id)
      if (checked) {
        const newSet = new Set([...selectedOwnedItemIds.value, ...pageIds])
        selectedOwnedItemIds.value = Array.from(newSet)
      } else {
        selectedOwnedItemIds.value = selectedOwnedItemIds.value.filter(id => !pageIds.includes(id))
      }
    }

    const toggleOwnedSelection = (id, checked) => {
      if (checked) {
        if (!selectedOwnedItemIds.value.includes(id)) selectedOwnedItemIds.value.push(id)
      } else {
        selectedOwnedItemIds.value = selectedOwnedItemIds.value.filter(x => x !== id)
      }
    }

    const getStatusBadgeVariant = (status) => {
      const map = { 'Available': 'success', 'In-use': 'warning', 'Pending': 'info' }
      return map[status] || 'secondary'
    }

    const daysUntilReturn = (returnDate) => {
      if (!returnDate) return null
      const target = new Date(returnDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      target.setHours(0, 0, 0, 0)
      return Math.floor((target - today) / 86400000)
    }

    const getRowUrgencyClass = (req) => {
      const d = daysUntilReturn(req.returnDate)
      if (d === null) return ''
      if (d < 0) return 'row-overdue'
      if (d <= 3) return 'row-due-soon'
      return ''
    }

    const getDaysRemainingClass = (req) => {
      const d = daysUntilReturn(req.returnDate)
      if (d === null) return 'days-unknown'
      if (d < 0) return 'days-overdue'
      if (d === 0) return 'days-today'
      if (d <= 3) return 'days-soon'
      return 'days-ok'
    }

    const getDaysRemainingLabel = (req) => {
      const d = daysUntilReturn(req.returnDate)
      if (d === null) return '—'
      if (d < 0) return `${Math.abs(d)}d overdue`
      if (d === 0) return 'Due today'
      return `${d}d left`
    }

    const getDueStatusVariant = (req) => {
      const d = daysUntilReturn(req.returnDate)
      if (d === null) return 'secondary'
      if (d < 0) return 'destructive'
      if (d <= 3) return 'warning'
      return 'success'
    }

    const getDueStatusLabel = (req) => {
      const d = daysUntilReturn(req.returnDate)
      if (d === null) return 'Unknown'
      if (d < 0) return 'Overdue'
      if (d === 0) return 'Due Today'
      if (d <= 7) return 'Due Soon'
      return 'On Time'
    }

    const getDaysOverdueCount = (req) => {
      const d = daysUntilReturn(req.returnDate)
      if (d === null || d >= 0) return 0
      return Math.abs(d)
    }

    const handleBulkSetNotAvailable = async () => {
      showBulkSetNotAvailableModal.value = false
      try {
        for (const itemId of selectedOwnedItemIds.value) {
          try {
            const item = allOwnedItems.value.find((ownedItem) => ownedItem.id === itemId)
            if (!item || item.status !== 'Available') continue
            await inventoryService.updateItemStatus(itemId, 'Not Available')
          } catch (e) {
            console.error(`Failed to set ${itemId} to Not Available:`, e)
          }
        }
        selectedOwnedItemIds.value = []
        await loadData()
      } catch (e) {
        console.error('Failed to bulk set items to Not Available:', e)
        alert('Error setting items to Not Available')
      }
    }

    const handleBulkSetAvailable = async () => {
      showBulkSetAvailableModal.value = false
      try {
        for (const itemId of selectedOwnedItemIds.value) {
          try {
            const item = allOwnedItems.value.find((ownedItem) => ownedItem.id === itemId)
            if (!item || item.status !== 'Not Available') continue
            await inventoryService.updateItemStatus(itemId, 'Available')
          } catch (e) {
            console.error(`Failed to set ${itemId} to Available:`, e)
          }
        }
        selectedOwnedItemIds.value = []
        await loadData()
      } catch (e) {
        console.error('Failed to bulk set items to Available:', e)
        alert('Error setting items to Available')
      }
    }

    onMounted(() => {
      if (props.pageParams?.filter) {
        const filterMap = { available: 'Available', 'in-use': 'In-use' }
        if (filterMap[props.pageParams.filter]) {
          statusFilter.value = filterMap[props.pageParams.filter]
        }
      }
      loadData()
    })

    return {
      allOwnedItems, borrowedItems, searchText, statusFilter, selectedItem, loading,
      currentPage, pageSize, pageSizeRef, activeTab, isTeacher,
      ownedCount, borrowedCount,
      filteredOwnedItems, filteredBorrowedItems,
      dueSoonCount, overdueCount,
      paginatedOwnedItems, paginatedBorrowedItems,
      selectedOwnedItemIds, showBulkSetNotAvailableModal, showBulkSetAvailableModal, allOwnedSelected,
      showDetail, changeStatus, toggleSelectAllOwned, toggleOwnedSelection,
      handleBulkSetNotAvailable, handleBulkSetAvailable,
      getStatusBadgeVariant, formatDate,
      getRowUrgencyClass, getDaysRemainingClass, getDaysRemainingLabel,
      getDueStatusVariant, getDueStatusLabel, getDaysOverdueCount
    }
  }
}
</script>

<style scoped>
.myitems-table-card { overflow: hidden; }

.kebab-trigger {
  display: inline-flex; align-items: center; justify-content: center;
  width: 1.75rem; height: 1.75rem; border-radius: var(--radius-sm);
  border: 1px solid var(--border); background: var(--card);
  color: var(--muted-foreground); cursor: pointer; transition: all 0.12s;
}
.kebab-trigger:hover { background: var(--surface-100); color: var(--text-primary); }

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
.toolbar-btn {
  display: inline-flex; align-items: center; gap: 0.25rem;
  font-size: 0.7rem; font-weight: 500; padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm); border: 1px solid var(--border);
  background: var(--card); color: var(--text-primary); cursor: pointer; transition: all 0.12s;
}
.toolbar-btn:hover { background: var(--surface-100); }
.bulk-clear-btn {
  font-size: 0.7rem; color: var(--muted-foreground); background: none;
  border: none; cursor: pointer; text-decoration: underline; padding: 0.2rem 0.35rem;
}
.bulk-clear-btn:hover { color: var(--text-primary); }

.bulk-bar-enter-active, .bulk-bar-leave-active { transition: max-height 0.25s ease, opacity 0.2s ease; overflow: hidden; }
.bulk-bar-enter-from, .bulk-bar-leave-to { max-height: 0; opacity: 0; }
.bulk-bar-enter-to, .bulk-bar-leave-from { max-height: 3.5rem; opacity: 1; }

.row-overdue { background: color-mix(in srgb, var(--danger) 6%, transparent) !important; }
.row-due-soon { background: color-mix(in srgb, var(--warning) 6%, transparent) !important; }

.days-remaining-badge {
  display: inline-flex; align-items: center;
  padding: 0.2rem 0.5rem; border-radius: var(--radius-md);
  font-size: 0.6875rem; font-weight: 700; white-space: nowrap;
}
.days-overdue { background: var(--danger-light); color: var(--danger); }
.days-today { background: var(--warning-light); color: var(--warning-dark); }
.days-soon { background: #fff7ed; color: #c2410c; }
.days-ok { background: var(--success-light); color: var(--success); }
.days-unknown { background: var(--surface-100); color: var(--muted-foreground); }
</style>
