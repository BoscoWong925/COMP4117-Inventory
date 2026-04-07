<template>
  <div class="page-container">
    <ModulePageHeader title="Checkout / Returns" subtitle="Items borrowed from you - process returns when students hand back">
    </ModulePageHeader>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <Card class="p-4 text-center">
        <p class="text-2xl font-bold text-accent">{{ borrowedItems.length }}</p>
        <p class="text-xs text-muted">Total Borrowed</p>
      </Card>
      <Card class="p-4 text-center">
        <p class="text-2xl font-bold" style="color:var(--warning)">{{ borrowedItems.filter(i => i.status === 'In-use').length }}</p>
        <p class="text-xs text-muted">In Use</p>
      </Card>
      <Card class="p-4 text-center">
        <p class="text-2xl font-bold" style="color:var(--info)">{{ borrowedItems.filter(i => i.status === 'Available').length }}</p>
        <p class="text-xs text-muted">Available for Return</p>
      </Card>
      <Card class="p-4 text-center">
        <p class="text-2xl font-bold" style="color:var(--danger)">{{ overdueCount }}</p>
        <p class="text-xs text-muted">Overdue</p>
      </Card>
    </div>

    <!-- Search -->
    <div class="mb-4">
      <Input
        type="text"
        placeholder="Search by item name or ID..."
        v-model="searchText"
      />
    </div>

    <!-- Items Table -->
    <div v-if="loading" class="empty-state">Loading borrowed items...</div>
    <div v-else-if="filteredItems.length === 0" class="empty-state">
      <p>No borrowed items</p>
      <p class="text-sm mt-1">You haven't borrowed any items yet.</p>
    </div>
    <Card v-else class="checkout-table-card">
      <div class="table-responsive">
        <table class="table-striped theme-table">
          <thead>
            <tr>
              <th>Item ID</th>
              <th>Item Name</th>
              <th>Category</th>
              <th>Status</th>
              <th>Borrowed Date</th>
              <th>Return Date</th>
              <th>Overdue Days</th>
              <th class="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in paginatedItems" :key="item.id">
              <td class="text-sm" style="font-weight:600">{{ item.itemID }}</td>
              <td class="text-sm">{{ item.itemName }}</td>
              <td class="text-sm">{{ item.category }}</td>
              <td class="text-sm">
                <Badge :variant="getStatusBadgeVariant(item.status)">{{ item.status }}</Badge>
              </td>
              <td class="text-sm">{{ formatDate(item.borrowDate || item.requestDate) }}</td>
              <td class="text-sm">{{ formatDate(item.returnDate) || 'Not set' }}</td>
              <td class="text-sm">
                <span :class="`font-medium ${getDaysColor(item.daysOverdue)}`">
                  {{ item.daysOverdue > 0 ? `+${item.daysOverdue}` : '-' }}
                </span>
              </td>
              <td class="text-center">
                <DropdownMenu align="end">
                  <template #trigger>
                    <button class="kebab-trigger" aria-label="Row actions">
                      <MoreVertical :size="14" />
                    </button>
                  </template>
                  <template #default="{ close }">
                    <DropdownMenuItem success @click="openReturnModal(item); close()">
                      <RotateCcw :size="12" /> Return
                    </DropdownMenuItem>
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
        :total-items="totalItems"
      />
    </Card>

    <!-- Return Modal -->
    <div v-if="returnTarget" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Return Item</h3>
        <p class="text-sm text-secondary mb-4">
          Returning <strong>{{ returnTarget.itemName }}</strong> ({{ returnTarget.itemId }})
        </p>
        
        <div class="mb-4">
          <label class="modal-label">Condition *</label>
          <Select v-model="returnCondition">
            <option value="">Select condition...</option>
            <option value="Good">Good</option>
            <option value="Minor Damage">Minor Damage</option>
            <option value="Major Damage">Major Damage</option>
            <option value="Lost">Lost</option>
          </Select>
        </div>

        <div class="mb-4">
          <label class="modal-label">Notes</label>
          <Textarea
            v-model="returnNotes"
            rows="3"
            placeholder="Any additional notes about the item's condition..."
          />
        </div>

        <div class="flex gap-2">
          <Button variant="outline" class="flex-1" :disabled="returnLoading" @click="handleReturn">
            <span v-if="returnLoading" class="inline-flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
              Processing...
            </span>
            <span v-else>Confirm Return</span>
          </Button>
          <Button variant="ghost" class="flex-1" :disabled="returnLoading" @click="closeReturnModal">Cancel</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { borrowingService } from '../utils/services'
import { formatDate } from '../utils/helpers'
import { MoreVertical, RotateCcw } from 'lucide-vue-next'
import {
  UiModulePageHeader as ModulePageHeader,
  UiTablePaginationBar as TablePaginationBar,
  UiDropdownMenu as DropdownMenu,
  UiDropdownMenuItem as DropdownMenuItem,
  UiBadge as Badge,
  UiCard as Card,
  UiButton as Button,
  UiInput as Input,
  UiSelect as Select,
  UiTextarea as Textarea
} from '../components/ui'

export default {
  components: {
    ModulePageHeader, TablePaginationBar,
    DropdownMenu, DropdownMenuItem, Badge, Card, Button, Input, Select, Textarea,
    MoreVertical, RotateCcw
  },
  setup() {
    const borrowedItems = ref([])
    const loading = ref(true)
    const searchText = ref('')
    const currentPage = ref(1)
    const pageSize = 10
    const pageSizeRef = ref(pageSize)
    const totalItems = ref(0)

    const returnTarget = ref(null)
    const returnCondition = ref('')
    const returnNotes = ref('')
    const returnLoading = ref(false)

    const filteredItems = computed(() => {
      let items = borrowedItems.value
      if (searchText.value?.trim()) {
        const q = searchText.value.trim().toLowerCase()
        items = items.filter(i =>
          (i.itemID || '').toLowerCase().includes(q) ||
          (i.itemName || '').toLowerCase().includes(q)
        )
      }
      // Sort: overdue first, then closest return date, no-return-date last (fallback to createdAt desc)
      const now = Date.now()
      return [...items].sort((a, b) => {
        const aHas = !!a.returnDate
        const bHas = !!b.returnDate
        if (aHas && !bHas) return -1
        if (!aHas && bHas) return 1
        if (!aHas && !bHas) {
          const aTime = new Date(a.createdAt || a.requestDate || 0).getTime()
          const bTime = new Date(b.createdAt || b.requestDate || 0).getTime()
          return bTime - aTime
        }
        const aTime = new Date(a.returnDate).getTime()
        const bTime = new Date(b.returnDate).getTime()
        const aOverdue = aTime < now
        const bOverdue = bTime < now
        if (aOverdue && !bOverdue) return -1
        if (!aOverdue && bOverdue) return 1
        return Math.abs(aTime - now) - Math.abs(bTime - now)
      })
    })

    const paginatedItems = computed(() => filteredItems.value)

    const overdueCount = computed(() => {
      return borrowedItems.value.filter(item => {
        if (!item.returnDate) return false
        const returnDate = new Date(item.returnDate)
        return new Date() > returnDate
      }).length
    })

    const getStatusBadgeVariant = (status) => {
      const map = { 'Available': 'success', 'In-use': 'warning', 'Pending': 'info' }
      return map[status] || 'secondary'
    }

    const getDaysColor = (days) => {
      if (days <= 0) return 'text-green-500'
      if (days <= 7) return 'text-orange-500'
      return 'text-red-500'
    }

    const loadBorrowedItems = async () => {
      loading.value = true
      try {
        const params = {
          page: currentPage.value,
          pageSize,
          status: 'Approved'
        }

        const response = await borrowingService.getTeacherRequestHistory(params)
        const records = response.requests || []
        totalItems.value = response.total || 0
        
        borrowedItems.value = records
          .map(r => ({
            ...r,
            daysOverdue: r.returnDate ? Math.floor((new Date() - new Date(r.returnDate)) / (1000 * 60 * 60 * 24)) : 0,
            borrowDate: r.approvalDate,
            category: r.category || 'Unknown'
          }))
      } catch (e) {
        console.error('Failed to load borrowed items:', e)
      }
      loading.value = false
    }

    const openReturnModal = (item) => {
      returnTarget.value = item
      returnCondition.value = ''
      returnNotes.value = ''
    }

    const closeReturnModal = () => {
      returnTarget.value = null
      returnCondition.value = ''
      returnNotes.value = ''
    }

    const handleReturn = async () => {
      if (!returnCondition.value) {
        alert('Please select the item condition')
        return
      }

      returnLoading.value = true
      try {
        const reqId = returnTarget.value.requestId || returnTarget.value._id || returnTarget.value.id
        
        // Return the item
        await borrowingService.returnItem(reqId, {
          condition: returnCondition.value,
          notes: returnNotes.value
        })

        closeReturnModal()
        alert('Item returned successfully!')
        await loadBorrowedItems()
      } catch (e) {
        console.error('Failed to return item:', e)
        alert('Error: ' + e.message)
      } finally {
        returnLoading.value = false
      }
    }

    onMounted(() => {
      loadBorrowedItems()
    })

    watch(searchText, () => {
      currentPage.value = 1
    })

    watch(currentPage, () => {
      loadBorrowedItems()
    })

    return {
      borrowedItems,
      loading,
      searchText,
      currentPage,
      pageSize,
      pageSizeRef,
      totalItems,
      returnTarget,
      returnCondition,
      returnNotes,
      returnLoading,
      filteredItems,
      paginatedItems,
      overdueCount,
      getStatusBadgeVariant,
      getDaysColor,
      openReturnModal,
      closeReturnModal,
      handleReturn,
      formatDate
    }
  }
}
</script>

<style scoped>
.checkout-table-card { overflow: hidden; }

.kebab-trigger {
  display: inline-flex; align-items: center; justify-content: center;
  width: 1.75rem; height: 1.75rem; border-radius: var(--radius-sm);
  border: 1px solid var(--border); background: var(--card);
  color: var(--muted-foreground); cursor: pointer; transition: all 0.12s;
}
.kebab-trigger:hover { background: var(--surface-100); color: var(--text-primary); }
</style>
