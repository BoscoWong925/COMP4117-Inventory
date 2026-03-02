<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">My Borrowing Record</h2>
      <button @click="exportRecords" class="btn">Export to Excel</button>
    </div>

    <div v-if="records.length === 0" class="empty-state">
      No borrowing records
    </div>
    <div v-else class="space-y-4">
      <template v-for="group in paginatedGroups" :key="group.parent.id">
        <!-- Parent record card -->
        <div class="theme-card">
          <div class="p-4">
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
                <p class="field-label">Status</p>
                <span :class="`px-2 py-1 rounded text-sm ${getStatusColor(group.parent.status)}`">
                  {{ group.parent.status }}
                </span>
              </div>
              <div>
                <p class="field-label">Request Date</p>
                <p class="font-medium">{{ formatDateTime(group.parent.requestDate) }}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
              <div>
                <p class="field-label">Approval Date</p>
                <p class="font-medium">{{ formatDateTime(group.parent.approvalDate) || '-' }}</p>
              </div>
              <div>
                <p class="field-label">Return Date</p>
                <p class="font-medium">{{ formatDateTime(group.parent.returnDate) || '-' }}</p>
              </div>
              <div>
                <p class="field-label">Returned</p>
                <p class="font-medium">{{ formatDateTime(group.parent.returnedDate) || '-' }}</p>
              </div>
              <div>
                <p class="field-label">Reason</p>
                <p class="font-medium text-sm">{{ group.parent.reason }}</p>
              </div>
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

            <button
              v-if="group.parent.status === 'Approved' && !group.parent.returnedDate"
              @click="handleReturn(group.parent.id)"
              class="btn btn-outline-success text-sm"
            >
              Return{{ group.children.length > 0 ? ' All' : ' Item' }}
            </button>
          </div>
        </div>
      </template>

      <PaginationControl v-model:currentPage="currentPage" :totalItems="groupedRecords.length" :pageSize="pageSize" />
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { borrowingService, inventoryService, authService } from '../utils/services'
import { formatDate, formatDateTime, getStatusColor, exportToExcel } from '../utils/helpers'
import PaginationControl from '../components/PaginationControl.vue'

export default {
  components: { PaginationControl },
  setup() {
    const records = ref([])
    const currentPage = ref(1)
    const pageSize = 10

    // Group records: parent records with their child component records
    const groupedRecords = computed(() => {
      const allRecords = [...records.value].sort((a, b) => 
        new Date(b.requestDate) - new Date(a.requestDate)
      )
      const childIds = new Set(allRecords.filter(r => r.parentRequestId).map(r => r.id))

      const groups = []
      // Parent/standalone records (sorted by newest requestDate)
      allRecords.filter(r => !r.parentRequestId).forEach(parent => {
        const children = allRecords.filter(r => r.parentRequestId === parent.id)
        groups.push({ parent, children })
      })
      // Orphan children (parent not in this user's records)
      allRecords.filter(r => r.parentRequestId && !allRecords.find(p => p.id === r.parentRequestId))
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
      try {
        const currentUser = authService.getCurrentUser()
        const userID = currentUser?.id || 'UNKNOWN'
        const userRequests = await borrowingService.getRequestsForUser(userID)
        records.value = userRequests.map(req => ({
          ...req,
          itemName: req.itemName || 'Unknown Item'
        }))
      } catch (e) {
        console.error('Failed to load records:', e)
      }
    }

    const handleReturn = async (requestID) => {
      const group = groupedRecords.value.find(g => g.parent.id === requestID)
      const childCount = group ? group.children.length : 0
      const msg = childCount > 0
        ? `Are you sure you want to return this item and its ${childCount} component(s)?`
        : 'Are you sure you want to return this item?'
      if (window.confirm(msg)) {
        try {
          await borrowingService.returnItem(requestID)
        } catch (e) {
          console.error('Failed to return item:', e)
        }
        loadRecords()
      }
    }

    const exportRecords = () => {
      exportToExcel(records.value, 'my_borrowing_record.xlsx')
    }

    onMounted(() => {
      loadRecords()
    })

    return {
      records,
      groupedRecords,
      paginatedGroups,
      handleReturn,
      exportRecords,
      currentPage,
      pageSize,
      formatDate,
      formatDateTime,
      getStatusColor,
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
