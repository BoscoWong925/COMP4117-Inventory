<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">My Borrowing Record</h2>
    </div>

    <div v-if="loadError" class="empty-state text-red-500">
      Error loading records: {{ loadError }}
    </div>
    <div v-else-if="records.length === 0" class="empty-state">
      No borrowing records
    </div>
    <div v-else class="space-y-4">
      <template v-for="group in groupedRecords" :key="group.parent.id">
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
                <p class="field-label">Item Owner</p>
                <span :class="group.parent.itemOwner === 'department' ? 'px-2 py-1 rounded text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'px-2 py-1 rounded text-sm bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'">
                  {{ getOwnerDisplayName(group.parent.itemOwner) }}
                </span>
              </div>
              <div>
                <p class="field-label">Status</p>
                <span :class="`px-2 py-1 rounded text-sm ${getStatusColor(group.parent.status)}`">
                  {{ group.parent.status }}
                </span>
                <span v-if="isRecordOverdue(group.parent)" class="ml-2 px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-600 border border-red-300 animate-pulse">
                  OVERDUE
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
                <p class="field-label">Declared Return</p>
                <p class="font-medium">{{ formatDateTime(group.parent.declaredReturnDate) || '-' }}</p>
              </div>
              <div>
                <p class="field-label">Returned</p>
                <p class="font-medium">{{ formatDateTime(group.parent.returnedDate) || '-' }}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
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

            <div class="flex gap-2 flex-wrap">
              <Button
                v-if="group.parent.status === 'Approved' && !group.parent.returnedDate"
                variant="outline"
                size="sm"
                @click="openDeclareReturn(group.parent)"
              >
                Declare Return Date
              </Button>
            </div>

          </div>
        </div>
      </template>

      <PaginationControl v-model:currentPage="currentPage" :totalItems="totalItems" :pageSize="pageSize" />
    </div>


    <!-- Declare Return Date Modal -->
    <div v-if="declareReturnTarget" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Declare Return Date</h3>
        <p class="text-sm text-muted mb-3">
          Select when you plan to return <strong>{{ declareReturnTarget.itemName }}</strong>.
          <span v-if="declareReturnTarget.returnDate">Must be on or before {{ formatDate(declareReturnTarget.returnDate) }}.</span>
        </p>
        <div class="mb-4">
          <label class="modal-label">Return Date</label>
          <Input
            type="date"
            v-model="declareReturnDateValue"
            :max="declareReturnMaxDate"
          />
        </div>
        <div v-if="declareReturnError" class="text-sm mb-3" style="color:var(--danger)">{{ declareReturnError }}</div>
        <div class="flex gap-2">
          <Button variant="success" class="flex-1" @click="confirmDeclareReturn">Confirm</Button>
          <Button variant="outline" class="flex-1" @click="declareReturnTarget = null; declareReturnDateValue = ''; declareReturnError = ''">Cancel</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { borrowingService, authService } from '../utils/services'
import { formatDate, formatDateTime, getStatusColor, isOverdue } from '../utils/helpers'
import PaginationControl from '../components/PaginationControl.vue'
import {
  UiButton as Button,
  UiInput as Input,
} from '../components/ui'

export default {
  components: { PaginationControl, Button, Input },
  setup() {
    const records = ref([])
    const loadError = ref('')
    const currentPage = ref(1)
    const pageSize = 10
    const declareReturnTarget = ref(null)
    const declareReturnDateValue = ref('')
    const declareReturnError = ref('')

    const isRecordOverdue = (record) => {
      return (record.status === 'Approved' || record.status === 'approved') && !record.returnedDate && isOverdue(record.returnDate)
    }

    const declareReturnMaxDate = computed(() => {
      if (!declareReturnTarget.value?.returnDate) return ''
      return new Date(declareReturnTarget.value.returnDate).toISOString().split('T')[0]
    })

    const openDeclareReturn = (record) => {
      declareReturnTarget.value = record
      declareReturnDateValue.value = record.declaredReturnDate
        ? new Date(record.declaredReturnDate).toISOString().split('T')[0]
        : ''
      declareReturnError.value = ''
    }

    const confirmDeclareReturn = async () => {
      if (!declareReturnDateValue.value) {
        declareReturnError.value = 'Please select a return date'
        return
      }
      const declared = new Date(declareReturnDateValue.value)
      if (declareReturnTarget.value.returnDate && declared > new Date(declareReturnTarget.value.returnDate)) {
        declareReturnError.value = 'Return date cannot be later than the set return date'
        return
      }
      try {
        await borrowingService.declareReturnDate(
          declareReturnTarget.value.id,
          `${declareReturnDateValue.value}T17:00:00Z`
        )
        declareReturnTarget.value = null
        declareReturnDateValue.value = ''
        declareReturnError.value = ''
        loadRecords()
      } catch (e) {
        declareReturnError.value = e.message || 'Failed to declare return date'
      }
    }

    // Group records: parent records with their child component records
    const groupedRecords = computed(() => {
      const allRecords = [...records.value].sort((a, b) => 
        new Date(b.requestDate) - new Date(a.requestDate)
      )

      // Build a Map from parentId → children[] for O(1) lookup
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
      // Parent/standalone records (sorted by newest requestDate)
      allRecords.filter(r => !r.parentRequestId).forEach(parent => {
        groups.push({ parent, children: childrenByParent.get(parent.id) || [] })
      })
      // Orphan children (parent not in this user's records)
      allRecords.filter(r => r.parentRequestId && !parentIdSet.has(r.parentRequestId))
        .forEach(orphan => {
          groups.push({ parent: orphan, children: [] })
        })

      return groups
    })

    const totalItems = ref(0)

    const loadRecords = async () => {
      loadError.value = ''
      try {
        const currentUser = authService.getCurrentUser()
        const userID = currentUser?.id || 'UNKNOWN'
        const response = await borrowingService.getRequestsForUser(userID, { page: currentPage.value, pageSize })
        const userRequests = response.requests || []
        totalItems.value = response.total || 0
        records.value = userRequests.map(req => ({
          ...req,
          itemName: req.itemName || 'Unknown Item'
        }))
      } catch (e) {
        console.error('Failed to load records:', e)
        loadError.value = e.message || 'Failed to load records'
      }
    }

    watch(currentPage, () => {
      loadRecords()
    })

    onMounted(() => {
      loadRecords()
    })

    const getOwnerDisplayName = (ownerId) => {
      if (!ownerId || ownerId === 'department') {
        return 'Department'
      }
      // TODO: fetch teacher name from API if needed
      return ownerId
    }

    return {
      records,
      loadError,
      groupedRecords,
      totalItems,
      declareReturnTarget,
      declareReturnDateValue,
      declareReturnError,
      declareReturnMaxDate,
      openDeclareReturn,
      confirmDeclareReturn,
      currentPage,
      pageSize,
      formatDate,
      formatDateTime,
      getStatusColor,
      isRecordOverdue,
      getOwnerDisplayName,
    }
  }
}
</script>

<style scoped>
</style>
