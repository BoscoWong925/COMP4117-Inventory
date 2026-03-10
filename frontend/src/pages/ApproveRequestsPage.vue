<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">Borrow requests</h2>
      <button @click="exportRequests" class="btn">Export to Excel</button>
    </div>

    <!-- ========== UNIFIED PENDING TAB ========== -->
    <div v-if="allPendingGroups.length === 0" class="empty-state">
      No pending requests
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full border-collapse table-striped theme-table">
        <thead>
          <tr>
            <th class="border p-2 text-left">Request ID</th>
            <th class="border p-2 text-left">Item Name</th>
            <th class="border p-2 text-left">Borrower</th>
            <th class="border p-2 text-left">Request Date</th>
            <th class="border p-2 text-left">Status</th>
            <th class="border p-2 text-left">Waiting</th>
            <th class="border p-2 text-left">Reason</th>
            <th class="border p-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="group in paginatedAll" :key="group.parent.id">
            <tr class="row-parent">
              <td class="border p-2 font-semibold">{{ group.parent.id }}</td>
              <td class="border p-2 font-semibold">
                {{ group.parent.itemName }}
                <span v-if="group.children.length > 0" class="ml-2 text-xs text-accent-subtle font-normal">
                  (+ {{ group.children.length }} component{{ group.children.length > 1 ? 's' : '' }})
                </span>
              </td>
              <td class="border p-2">{{ group.parent.borrowerName || group.parent.borrowerID }}
                <span v-if="overdueBorrowerIDs.has(group.parent.borrowerID)" class="inline-flex items-center ml-1" title="This borrower has overdue items">
                  <span class="inline-block w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                  <span class="text-xs text-red-500 font-semibold ml-1">This user have an overdue item</span>
                </span>
              </td>
              <td class="border p-2">{{ formatDate(group.parent.requestDate) }}</td>
              <td class="border p-2">
                <span v-if="group.parent.status === 'Pending'" class="px-2 py-0.5 rounded text-xs font-medium badge-warning">Pending</span>
                <span v-else class="px-2 py-0.5 rounded text-xs font-medium badge-info">Pending Check-Out</span>
              </td>
              <td class="border p-2 text-orange-600 font-medium">{{ waitingTime(group.parent.requestDate) }}</td>
              <td class="border p-2">{{ group.parent.reason }}</td>
              <td class="border p-2 text-center whitespace-nowrap">
                <template v-if="group.parent.status === 'Pending'">
                  <button @click="selectedRequest = group.parent.id" class="btn btn-outline-success text-sm">
                    Approve{{ group.children.length > 0 ? ' All' : '' }}
                  </button>
                  <button @click="showRejectForm = group.parent.id" class="btn btn-outline-danger text-sm ml-2">
                    Reject{{ group.children.length > 0 ? ' All' : '' }}
                  </button>
                </template>
                <template v-else>
                  <button @click="handleCheckout(group.parent.id)" class="btn btn-outline-primary text-sm">
                    Borrowed Out{{ group.children.length > 0 ? ' All' : '' }}
                  </button>
                </template>
              </td>
            </tr>
            <tr v-for="child in group.children" :key="child.id" class="row-child">
              <td class="border p-2 pl-6 text-sm">↳ {{ child.id }}</td>
              <td class="border p-2 pl-6 text-sm">{{ child.itemName }}</td>
              <td class="border p-2 text-sm">{{ child.borrowerName || child.borrowerID }}</td>
              <td class="border p-2 text-sm">{{ formatDate(child.requestDate) }}</td>
              <td class="border p-2 text-sm">
                <span v-if="child.status === 'Pending'" class="px-2 py-0.5 rounded text-xs font-medium badge-warning">Pending</span>
                <span v-else class="px-2 py-0.5 rounded text-xs font-medium badge-info">Pending Check-Out</span>
              </td>
              <td class="border p-2 text-sm">{{ waitingTime(child.requestDate) }}</td>
              <td class="border p-2 text-sm italic">{{ child.reason }}</td>
              <td class="border p-2 text-center text-xs" style="color:var(--text-muted)">Auto with parent</td>
            </tr>
          </template>
        </tbody>
      </table>
      <PaginationControl v-model:currentPage="currentPage" :totalItems="allPendingGroups.length" :pageSize="pageSize" />
    </div>

    <!-- Approve Modal -->
    <div v-if="selectedRequest" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Approve Request</h3>
        <div class="mb-4">
          <label class="modal-label">Return Date</label>
          <input
            type="date"
            v-model="returnDate"
            class="form-input"
          />
        </div>
        <div class="mb-4">
          <label class="modal-label">Location</label>
          <DropdownWithOther
            v-model="approveLocation"
            :options="locationOptions"
            placeholder="Enter new location..."
            @add-option="addLocation"
          />
        </div>
        <div class="mb-4">
          <RemarkBox
            v-model="approveRemark"
            label="Remark"
            placeholder="Add any notes..."
          />
        </div>
        <div class="flex gap-2">
          <button
            @click="handleApprove(selectedRequest)"
            class="btn btn-outline-success flex-1"
          >
            Approve
          </button>
          <button
            @click="selectedRequest = null; returnDate = ''; approveRemark = ''; approveLocation = locationOptions[0]"
            class="btn btn-outline-secondary flex-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <div v-if="showRejectForm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Reject Request</h3>
        <div class="mb-4">
          <label class="modal-label">Reason</label>
          <textarea
            v-model="rejectReason"
            class="form-input"
            rows="4"
            placeholder="Enter rejection reason..."
          />
        </div>
        <div class="flex gap-2">
          <button
            @click="handleReject(showRejectForm)"
            class="btn btn-outline-danger flex-1"
          >
            Reject
          </button>
          <button
            @click="showRejectForm = null; rejectReason = ''"
            class="btn btn-outline-secondary flex-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { inventoryService, borrowingService } from '../utils/services'
import { formatDate, exportToExcel, waitingTime, isOverdue } from '../utils/helpers'
import PaginationControl from '../components/PaginationControl.vue'
import DropdownWithOther from '../components/DropdownWithOther.vue'
import RemarkBox from '../components/RemarkBox.vue'

export default {
  components: { PaginationControl, DropdownWithOther, RemarkBox },
  setup() {
    const requests = ref([])
    const allApprovedRequests = ref([])
    const selectedRequest = ref(null)
    const returnDate = ref('')
    const rejectReason = ref('')
    const showRejectForm = ref(null)
    const currentPage = ref(1)
    const pageSize = 10
    const locationOptions = ref(['Lab A', 'Lab B', 'Lab C', 'Office', 'Storage Room', 'Shelf 1', 'Shelf 2', 'Other'])
    const approveLocation = ref('Lab A')
    const approveRemark = ref('')

    // Borrowers with overdue items
    const overdueBorrowerIDs = computed(() => {
      const ids = new Set()
      allApprovedRequests.value.forEach(r => {
        if (isOverdue(r.returnDate) && r.borrowerID) {
          ids.add(r.borrowerID)
        }
      })
      return ids
    })

    // Build groups from requests by status
    const buildGroups = (reqs) => {
      const childIds = new Set(reqs.filter(r => r.parentRequestId).map(r => r.id))
      const parents = reqs.filter(r => !r.parentRequestId)
      const groups = []
      parents.forEach(parent => {
        const children = reqs.filter(r => r.parentRequestId === parent.id)
        groups.push({ parent, children })
      })
      // Orphan children
      reqs.filter(r => r.parentRequestId && !parents.find(p => p.id === r.parentRequestId))
        .forEach(orphan => {
          groups.push({ parent: orphan, children: [] })
        })
      return groups
    }

    // All pending requests (both Pending and Pending Check-Out) in one list
    const allPendingGroups = computed(() => {
      const all = requests.value.filter(r => r.status === 'Pending' || r.status === 'Pending Check-Out')
      return buildGroups(all)
    })

    const paginatedAll = computed(() => {
      const start = (currentPage.value - 1) * pageSize
      return allPendingGroups.value.slice(start, start + pageSize)
    })

    const addLocation = (val) => {
      if (!locationOptions.value.includes(val)) {
        locationOptions.value.splice(locationOptions.value.length - 1, 0, val)
      }
    }

    const loadPendingRequests = async () => {
      try {
        const pendingReqs = await borrowingService.getPendingRequests()
        requests.value = pendingReqs
      } catch (e) {
        console.error('Failed to load pending requests:', e)
      }
      // Load approved requests for overdue check
      try {
        const approved = await borrowingService.getAllRequests({ status: 'Approved', pageSize: 5000 })
        allApprovedRequests.value = approved
      } catch (e) {
        console.error('Failed to load approved requests:', e)
      }
    }

    const handleApprove = async (requestId) => {
      if (!returnDate.value) {
        alert('Please set a return date')
        return
      }
      // Convert date string to ISO datetime string (with default time 17:00:00)
      const returnDatetime = `${returnDate.value}T17:00:00Z`
      try {
        const req = await borrowingService.approveRequest(requestId, returnDatetime)
        if (req) {
          req.notes = approveRemark.value
          // Update item location if specified
          const item = await inventoryService.getItemById(req.itemID)
          if (item && approveLocation.value) {
            await inventoryService.updateItem(item.id, { ...item, location: approveLocation.value })
          }
          // Also update location for auto-approved child requests
          const allReqs = await borrowingService.getAllRequests()
          const childReqs = allReqs.filter(r => r.parentRequestId === requestId && r.status === 'Approved')
          for (const childReq of childReqs) {
            childReq.notes = approveRemark.value
            const childItem = await inventoryService.getItemById(childReq.itemID)
            if (childItem && approveLocation.value) {
              await inventoryService.updateItem(childItem.id, { ...childItem, location: approveLocation.value })
            }
          }
        }
      } catch (e) {
        console.error('Failed to approve request:', e)
      }
      selectedRequest.value = null
      returnDate.value = ''
      approveRemark.value = ''
      approveLocation.value = locationOptions.value[0]
      loadPendingRequests()
    }

    const handleReject = async (requestId) => {
      if (!rejectReason.value) {
        alert('Please provide a rejection reason')
        return
      }
      try {
        await borrowingService.rejectRequest(requestId, rejectReason.value)
      } catch (e) {
        console.error('Failed to reject request:', e)
      }
      showRejectForm.value = null
      rejectReason.value = ''
      loadPendingRequests()
    }

    const handleCheckout = async (requestId) => {
      try {
        await borrowingService.checkoutRequest(requestId)
      } catch (e) {
        console.error('Failed to checkout request:', e)
        alert('Failed to checkout: ' + e.message)
      }
      loadPendingRequests()
    }

    const exportRequests = () => {
      exportToExcel(requests.value, 'borrow_requests.xlsx')
    }

    onMounted(() => {
      loadPendingRequests()
    })

    return {
      requests,
      allPendingGroups,
      selectedRequest,
      returnDate,
      rejectReason,
      showRejectForm,
      currentPage,
      pageSize,
      paginatedAll,
      locationOptions,
      approveLocation,
      approveRemark,
      addLocation,
      handleApprove,
      handleReject,
      handleCheckout,
      exportRequests,
      formatDate,
      waitingTime,
      overdueBorrowerIDs,
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
