<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">Borrow requests</h2>
      <button @click="exportRequests" class="btn">Export to Excel</button>
    </div>

    <!-- Tabs -->
    <div class="mb-4 flex justify-between items-center">
      <div class="flex gap-2">
        <button
          @click="activeTab = 'pending'; currentPage = 1"
          :class="`pill ${activeTab === 'pending' ? 'pill-active' : ''}`"
        >
          Pending
          <span v-if="pendingGroups.length" class="ml-1 px-2 py-0.5 rounded-full text-sm font-bold bg-red-500 text-white" style="min-width:1.5rem;text-align:center">{{ pendingGroups.length }}</span>
        </button>
        <button
          @click="activeTab = 'checkout'; currentPage = 1"
          :class="`pill ${activeTab === 'checkout' ? 'pill-active' : ''}`"
        >
          Pending Check-Out
          <span v-if="checkoutGroups.length" class="ml-1 px-2 py-0.5 rounded-full text-sm font-bold bg-blue-500 text-white" style="min-width:1.5rem;text-align:center">{{ checkoutGroups.length }}</span>
        </button>
      </div>
      <div class="flex gap-2">
        <button v-if="activeTab === 'pending' && selectedPendingIds.length > 0" @click="showBulkApproveForm = true" class="btn btn-outline-success">
          Approve ({{ selectedPendingIds.length }})
        </button>
        <button v-if="activeTab === 'pending' && selectedPendingIds.length > 0" @click="showBulkRejectForm = true" class="btn btn-outline-danger">
          Reject ({{ selectedPendingIds.length }})
        </button>
        <button v-if="activeTab === 'checkout' && selectedCheckoutIds.length > 0" @click="showBulkCheckoutForm = true" class="btn btn-outline-primary">
          Borrowed Out ({{ selectedCheckoutIds.length }})
        </button>
        <button v-if="activeTab === 'checkout' && selectedCheckoutIds.length > 0" @click="showBulkDenyForm = true" class="btn btn-outline-danger">
          Deny ({{ selectedCheckoutIds.length }})
        </button>
      </div>
    </div>

    <!-- ========== PENDING TAB ========== -->
    <template v-if="activeTab === 'pending'">
      <div v-if="pendingGroups.length === 0" class="empty-state">
        No pending requests
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full border-collapse table-striped theme-table">
          <thead>
            <tr>
              <th class="border p-2 text-center w-10">
                <input type="checkbox" @change="toggleSelectAllPending" :checked="allPendingSelected" />
              </th>
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
            <template v-for="group in paginatedPending" :key="group.parent.id">
              <tr class="row-parent">
                <td class="border p-2 text-center">
                  <input type="checkbox" :value="group.parent.id" v-model="selectedPendingIds" />
                </td>
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
                  <span class="px-2 py-0.5 rounded text-xs font-medium badge-warning">Pending</span>
                </td>
                <td class="border p-2 text-orange-600 font-medium">{{ waitingTime(group.parent.requestDate) }}</td>
                <td class="border p-2">{{ group.parent.reason }}</td>
                <td class="border p-2 text-center whitespace-nowrap">
                  <button @click="selectedRequest = group.parent.id" class="btn btn-outline-success text-sm">
                    Approve{{ group.children.length > 0 ? ' All' : '' }}
                  </button>
                  <button @click="showRejectForm = group.parent.id" class="btn btn-outline-danger text-sm ml-2">
                    Reject{{ group.children.length > 0 ? ' All' : '' }}
                  </button>
                  <button @click="openEmailForRequest(group.parent)" class="btn btn-outline-primary text-sm ml-2" title="Email Borrower">✉</button>
                </td>
              </tr>
              <tr v-for="child in group.children" :key="child.id" class="row-child">
                <td class="border p-2 pl-6 text-sm">↳ {{ child.id }}</td>
                <td class="border p-2 pl-6 text-sm">{{ child.itemName }}</td>
                <td class="border p-2 text-sm">{{ child.borrowerName || child.borrowerID }}</td>
                <td class="border p-2 text-sm">{{ formatDate(child.requestDate) }}</td>
                <td class="border p-2 text-sm">
                  <span class="px-2 py-0.5 rounded text-xs font-medium badge-warning">Pending</span>
                </td>
                <td class="border p-2 text-sm">{{ waitingTime(child.requestDate) }}</td>
                <td class="border p-2 text-sm italic">{{ child.reason }}</td>
                <td class="border p-2 text-center text-xs" style="color:var(--text-muted)">Auto with parent</td>
              </tr>
            </template>
          </tbody>
        </table>
        <PaginationControl v-model:currentPage="currentPage" :totalItems="pendingGroups.length" :pageSize="pageSize" />
      </div>
    </template>

    <!-- ========== PENDING CHECK-OUT TAB ========== -->
    <template v-if="activeTab === 'checkout'">
      <div v-if="checkoutGroups.length === 0" class="empty-state">
        No items pending check-out
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full border-collapse table-striped theme-table">
          <thead>
            <tr>
              <th class="border p-2 text-center w-10">
                <input type="checkbox" @change="toggleSelectAllCheckout" :checked="allCheckoutSelected" />
              </th>
              <th class="border p-2 text-left">Request ID</th>
              <th class="border p-2 text-left">Item Name</th>
              <th class="border p-2 text-left">Borrower</th>
              <th class="border p-2 text-left">Approved Date</th>
              <th class="border p-2 text-left">Status</th>
              <th class="border p-2 text-left">Waiting</th>
              <th class="border p-2 text-left">Return Date</th>
              <th class="border p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="group in paginatedCheckout" :key="group.parent.id">
              <tr class="row-parent">
                <td class="border p-2 text-center">
                  <input type="checkbox" :value="group.parent.id" v-model="selectedCheckoutIds" />
                </td>
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
                <td class="border p-2">{{ formatDate(group.parent.approvalDate) }}</td>
                <td class="border p-2">
                  <span class="px-2 py-0.5 rounded text-xs font-medium badge-info">Pending Check-Out</span>
                  <span v-if="isCheckoutExpiringSoon(group.parent)" class="ml-1 text-xs text-red-500 font-semibold">(expiring soon)</span>
                </td>
                <td class="border p-2 text-orange-600 font-medium">{{ waitingTime(group.parent.approvalDate) }}</td>
                <td class="border p-2">{{ formatDate(group.parent.returnDate) || '-' }}</td>
                <td class="border p-2 text-center whitespace-nowrap">
                  <button @click="handleCheckout(group.parent.id)" class="btn btn-outline-primary text-sm">
                    Borrowed Out{{ group.children.length > 0 ? ' All' : '' }}
                  </button>
                  <button @click="showDenyForm = group.parent.id" class="btn btn-outline-danger text-sm ml-2">
                    Deny{{ group.children.length > 0 ? ' All' : '' }}
                  </button>
                  <button @click="openEmailForRequest(group.parent)" class="btn btn-outline-primary text-sm ml-2" title="Email Borrower">✉</button>
                </td>
              </tr>
              <tr v-for="child in group.children" :key="child.id" class="row-child">
                <td class="border p-2 pl-6 text-sm">↳ {{ child.id }}</td>
                <td class="border p-2 pl-6 text-sm">{{ child.itemName }}</td>
                <td class="border p-2 text-sm">{{ child.borrowerName || child.borrowerID }}</td>
                <td class="border p-2 text-sm">{{ formatDate(child.approvalDate) }}</td>
                <td class="border p-2 text-sm">
                  <span class="px-2 py-0.5 rounded text-xs font-medium badge-info">Pending Check-Out</span>
                </td>
                <td class="border p-2 text-sm">{{ waitingTime(child.approvalDate) }}</td>
                <td class="border p-2 text-sm">{{ formatDate(child.returnDate) || '-' }}</td>
                <td class="border p-2 text-center text-xs" style="color:var(--text-muted)">Auto with parent</td>
              </tr>
            </template>
          </tbody>
        </table>
        <PaginationControl v-model:currentPage="currentPage" :totalItems="checkoutGroups.length" :pageSize="pageSize" />
      </div>
    </template>

    <!-- Approve Modal -->
    <div v-if="selectedRequest" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Approve Request</h3>
        <p v-if="competingCount > 0" class="text-sm text-red-500 mb-3 p-2 rounded" style="background: rgba(239,68,68,0.1);">
          ⚠ Approving this request will auto-reject {{ competingCount }} other pending request(s) for the same item.
        </p>
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
            @click="selectedRequest = null; returnDate = ''; approveRemark = ''; approveLocation = locationOptions[0]; competingCount = 0"
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

    <!-- Deny Check-Out Modal -->
    <div v-if="showDenyForm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Deny Check-Out</h3>
        <p class="text-sm text-secondary mb-3">
          This will reject the approved request and make the item available again.
        </p>
        <div class="mb-4">
          <label class="modal-label">Reason</label>
          <textarea
            v-model="denyReason"
            class="form-input"
            rows="4"
            placeholder="Enter reason for denying check-out..."
          />
        </div>
        <div class="flex gap-2">
          <button
            @click="handleDeny(showDenyForm)"
            class="btn btn-outline-danger flex-1"
          >
            Deny
          </button>
          <button
            @click="showDenyForm = null; denyReason = ''"
            class="btn btn-outline-secondary flex-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Approve Modal -->
    <div v-if="showBulkApproveForm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Approve {{ selectedPendingIds.length }} Request(s)</h3>
        <div class="mb-4">
          <label class="modal-label">Return Date</label>
          <input
            type="date"
            v-model="bulkReturnDate"
            class="form-input"
          />
        </div>
        <div class="mb-4">
          <label class="modal-label">Location</label>
          <DropdownWithOther
            v-model="bulkApproveLocation"
            :options="locationOptions"
            placeholder="Enter new location..."
            @add-option="addLocation"
          />
        </div>
        <div class="mb-4">
          <RemarkBox
            v-model="bulkApproveRemark"
            label="Remark (optional)"
            placeholder="Add any notes..."
          />
        </div>
        <div class="flex gap-2">
          <button
            @click="handleBulkApprove"
            class="btn btn-outline-success flex-1"
          >
            Approve All
          </button>
          <button
            @click="showBulkApproveForm = false; bulkReturnDate = ''; bulkApproveRemark = ''; bulkApproveLocation = locationOptions[0]"
            class="btn btn-outline-secondary flex-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Reject Modal -->
    <div v-if="showBulkRejectForm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Reject {{ selectedPendingIds.length }} Request(s)</h3>
        <div class="mb-4">
          <label class="modal-label">Reason</label>
          <textarea
            v-model="bulkRejectReason"
            class="form-input"
            rows="4"
            placeholder="Enter rejection reason..."
          />
        </div>
        <div class="flex gap-2">
          <button
            @click="handleBulkReject"
            class="btn btn-outline-danger flex-1"
          >
            Reject All
          </button>
          <button
            @click="showBulkRejectForm = false; bulkRejectReason = ''"
            class="btn btn-outline-secondary flex-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Checkout Modal -->
    <div v-if="showBulkCheckoutForm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Mark {{ selectedCheckoutIds.length }} Item(s) as Borrowed Out</h3>
        <p class="text-sm text-secondary mb-4">
          This will mark all selected approved requests as checked out.
        </p>
        <div class="flex gap-2">
          <button
            @click="handleBulkCheckout"
            class="btn btn-outline-primary flex-1"
          >
            Borrowed Out All
          </button>
          <button
            @click="showBulkCheckoutForm = false"
            class="btn btn-outline-secondary flex-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Deny Modal -->
    <div v-if="showBulkDenyForm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Deny {{ selectedCheckoutIds.length }} Check-Out(s)</h3>
        <p class="text-sm text-secondary mb-3">
          This will reject the approved requests and make the items available again.
        </p>
        <div class="mb-4">
          <label class="modal-label">Reason</label>
          <textarea
            v-model="bulkDenyReason"
            class="form-input"
            rows="4"
            placeholder="Enter reason for denying check-out..."
          />
        </div>
        <div class="flex gap-2">
          <button
            @click="handleBulkDeny"
            class="btn btn-outline-danger flex-1"
          >
            Deny All
          </button>
          <button
            @click="showBulkDenyForm = false; bulkDenyReason = ''"
            class="btn btn-outline-secondary flex-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <SendEmailModal
      :visible="showEmailModal"
      :recipientId="emailTarget?.borrowerID"
      :recipientName="emailTarget?.borrowerName"
      :recipientEmail="emailTarget?.borrowerEmail"
      :defaultSubject="emailTarget ? 'Regarding Request ' + emailTarget.id : ''"
      @close="showEmailModal = false"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { inventoryService, borrowingService } from '../utils/services'
import { formatDate, exportToExcel, waitingTime, isOverdue } from '../utils/helpers'
import PaginationControl from '../components/PaginationControl.vue'
import DropdownWithOther from '../components/DropdownWithOther.vue'
import RemarkBox from '../components/RemarkBox.vue'
import SendEmailModal from '../components/SendEmailModal.vue'

export default {
  components: { PaginationControl, DropdownWithOther, RemarkBox, SendEmailModal },
  setup() {
    const requests = ref([])
    const allApprovedRequests = ref([])
    const selectedRequest = ref(null)
    const returnDate = ref('')
    const rejectReason = ref('')
    const showRejectForm = ref(null)
    const showDenyForm = ref(null)
    const denyReason = ref('')
    const currentPage = ref(1)
    const pageSize = 10
    const activeTab = ref('pending')
    const competingCount = ref(0)
    const locationOptions = ref(['Lab A', 'Lab B', 'Lab C', 'Office', 'Storage Room', 'Shelf 1', 'Shelf 2', 'Other'])
    const approveLocation = ref('Lab A')
    const approveRemark = ref('')
    
    // Bulk operations state
    const selectedPendingIds = ref([])
    const selectedCheckoutIds = ref([])
    const showBulkApproveForm = ref(false)
    const showBulkRejectForm = ref(false)
    const showBulkCheckoutForm = ref(false)
    const showBulkDenyForm = ref(false)
    const bulkReturnDate = ref('')
    const bulkApproveLocation = ref('Lab A')
    const bulkApproveRemark = ref('')
    const bulkRejectReason = ref('')
    const bulkDenyReason = ref('')
    const showEmailModal = ref(false)
    const emailTarget = ref(null)

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

    // Separate groups for each tab
    const pendingGroups = computed(() => {
      return buildGroups(requests.value.filter(r => r.status === 'Pending'))
    })

    const checkoutGroups = computed(() => {
      return buildGroups(requests.value.filter(r => r.status === 'Pending Check-Out'))
    })

    const paginatedPending = computed(() => {
      const start = (currentPage.value - 1) * pageSize
      return pendingGroups.value.slice(start, start + pageSize)
    })

    const paginatedCheckout = computed(() => {
      const start = (currentPage.value - 1) * pageSize
      return checkoutGroups.value.slice(start, start + pageSize)
    })

    const allPendingSelected = computed(() => {
      return pendingGroups.value.length > 0 && selectedPendingIds.value.length === pendingGroups.value.length
    })

    const allCheckoutSelected = computed(() => {
      return checkoutGroups.value.length > 0 && selectedCheckoutIds.value.length === checkoutGroups.value.length
    })

    const isCheckoutExpiringSoon = (req) => {
      if (!req.approvalDate) return false
      const daysSinceApproval = (Date.now() - new Date(req.approvalDate).getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceApproval >= 25
    }

    const addLocation = (val) => {
      if (!locationOptions.value.includes(val)) {
        locationOptions.value.splice(locationOptions.value.length - 1, 0, val)
      }
    }

    const loadPendingRequests = async () => {
      try {
        // Trigger auto-expire first
        try { await borrowingService.autoExpirePendingCheckouts() } catch (e) { /* ignore */ }
        const pendingReqs = await borrowingService.getPendingRequests()
        requests.value = pendingReqs
      } catch (e) {
        console.error('Failed to load pending requests:', e)
      }
      // Load approved requests for overdue check
      try {
        const { requests: approved } = await borrowingService.getAllRequests({ status: 'Approved', pageSize: 5000 })
        allApprovedRequests.value = approved
      } catch (e) {
        console.error('Failed to load approved requests:', e)
      }
    }

    const countCompetingRequests = (requestId) => {
      const req = requests.value.find(r => (r.id || r.requestId) === requestId)
      if (!req) return 0
      return requests.value.filter(r =>
        r.itemID === req.itemID &&
        r.status === 'Pending' &&
        (r.id || r.requestId) !== requestId &&
        !r.parentRequestId
      ).length
    }

    const handleApprove = async (requestId) => {
      if (!returnDate.value) {
        alert('Please set a return date')
        return
      }
      const returnDatetime = `${returnDate.value}T17:00:00Z`
      try {
        const req = await borrowingService.approveRequest(requestId, returnDatetime)
        if (req) {
          req.notes = approveRemark.value
          const item = await inventoryService.getItemById(req.itemID)
          if (item && approveLocation.value) {
            await inventoryService.updateItem(item.id, { ...item, location: approveLocation.value })
          }
        }
      } catch (e) {
        console.error('Failed to approve request:', e)
        alert('Failed to approve: ' + e.message)
      }
      selectedRequest.value = null
      returnDate.value = ''
      approveRemark.value = ''
      approveLocation.value = locationOptions.value[0]
      competingCount.value = 0
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

    const handleDeny = async (requestId) => {
      try {
        await borrowingService.denyCheckout(requestId, denyReason.value || '')
      } catch (e) {
        console.error('Failed to deny checkout:', e)
        alert('Failed to deny: ' + e.message)
      }
      showDenyForm.value = null
      denyReason.value = ''
      loadPendingRequests()
    }

    const toggleSelectAllPending = (event) => {
      if (event.target.checked) {
        selectedPendingIds.value = pendingGroups.value.map(group => group.parent.id)
      } else {
        selectedPendingIds.value = []
      }
    }

    const toggleSelectAllCheckout = (event) => {
      if (event.target.checked) {
        selectedCheckoutIds.value = checkoutGroups.value.map(group => group.parent.id)
      } else {
        selectedCheckoutIds.value = []
      }
    }

    const handleBulkApprove = async () => {
      if (!bulkReturnDate.value) {
        alert('Please set a return date')
        return
      }
      const returnDatetime = `${bulkReturnDate.value}T17:00:00Z`
      try {
        for (const requestId of selectedPendingIds.value) {
          try {
            const req = await borrowingService.approveRequest(requestId, returnDatetime)
            if (req) {
              req.notes = bulkApproveRemark.value
              const item = await inventoryService.getItemById(req.itemID)
              if (item && bulkApproveLocation.value) {
                await inventoryService.updateItem(item.id, { ...item, location: bulkApproveLocation.value })
              }
            }
          } catch (e) {
            console.error(`Failed to approve request ${requestId}:`, e)
          }
        }
        selectedPendingIds.value = []
        showBulkApproveForm.value = false
        bulkReturnDate.value = ''
        bulkApproveRemark.value = ''
        bulkApproveLocation.value = locationOptions.value[0]
        loadPendingRequests()
      } catch (e) {
        console.error('Failed to bulk approve:', e)
      }
    }

    const handleBulkReject = async () => {
      if (!bulkRejectReason.value) {
        alert('Please provide a rejection reason')
        return
      }
      try {
        for (const requestId of selectedPendingIds.value) {
          try {
            await borrowingService.rejectRequest(requestId, bulkRejectReason.value)
          } catch (e) {
            console.error(`Failed to reject request ${requestId}:`, e)
          }
        }
        selectedPendingIds.value = []
        showBulkRejectForm.value = false
        bulkRejectReason.value = ''
        loadPendingRequests()
      } catch (e) {
        console.error('Failed to bulk reject:', e)
      }
    }

    const handleBulkCheckout = async () => {
      try {
        for (const requestId of selectedCheckoutIds.value) {
          try {
            await borrowingService.checkoutRequest(requestId)
          } catch (e) {
            console.error(`Failed to checkout request ${requestId}:`, e)
          }
        }
        selectedCheckoutIds.value = []
        showBulkCheckoutForm.value = false
        loadPendingRequests()
      } catch (e) {
        console.error('Failed to bulk checkout:', e)
      }
    }

    const handleBulkDeny = async () => {
      try {
        for (const requestId of selectedCheckoutIds.value) {
          try {
            await borrowingService.denyCheckout(requestId, bulkDenyReason.value || '')
          } catch (e) {
            console.error(`Failed to deny checkout ${requestId}:`, e)
          }
        }
        selectedCheckoutIds.value = []
        showBulkDenyForm.value = false
        bulkDenyReason.value = ''
        loadPendingRequests()
      } catch (e) {
        console.error('Failed to bulk deny:', e)
      }
    }

    const exportRequests = () => {
      exportToExcel(requests.value, 'borrow_requests.xlsx')
    }

    onMounted(() => {
      loadPendingRequests()
    })

    const openEmailForRequest = (req) => {
      emailTarget.value = req
      showEmailModal.value = true
    }

    return {
      requests,
      activeTab,
      pendingGroups,
      checkoutGroups,
      selectedRequest,
      returnDate,
      rejectReason,
      showRejectForm,
      showDenyForm,
      denyReason,
      currentPage,
      pageSize,
      competingCount,
      paginatedPending,
      paginatedCheckout,
      locationOptions,
      approveLocation,
      approveRemark,
      selectedPendingIds,
      selectedCheckoutIds,
      showBulkApproveForm,
      showBulkRejectForm,
      showBulkCheckoutForm,
      showBulkDenyForm,
      bulkReturnDate,
      bulkApproveLocation,
      bulkApproveRemark,
      bulkRejectReason,
      bulkDenyReason,
      allPendingSelected,
      allCheckoutSelected,
      addLocation,
      handleApprove,
      handleReject,
      handleCheckout,
      handleDeny,
      toggleSelectAllPending,
      toggleSelectAllCheckout,
      handleBulkApprove,
      handleBulkReject,
      handleBulkCheckout,
      handleBulkDeny,
      exportRequests,
      formatDate,
      waitingTime,
      overdueBorrowerIDs,
      isCheckoutExpiringSoon,
      countCompetingRequests,
      showEmailModal,
      emailTarget,
      openEmailForRequest,
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
