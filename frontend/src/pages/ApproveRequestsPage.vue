<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">Borrow requests</h2>
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
          <span v-if="pendingCount" class="ml-1 px-2 py-0.5 rounded-full text-sm font-bold" style="min-width:1.5rem;text-align:center;background:var(--danger);color:#fff">{{ pendingCount }}</span>
        </button>
        <button
          @click="activeTab = 'checkout'; currentPage = 1"
          :class="`pill ${activeTab === 'checkout' ? 'pill-active' : ''}`"
        >
          Pending Check-Out
          <span v-if="checkoutCount" class="ml-1 px-2 py-0.5 rounded-full text-sm font-bold" style="min-width:1.5rem;text-align:center;background:var(--info);color:#fff">{{ checkoutCount }}</span>
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
      <div v-else class="table-responsive">
        <table class="table-striped theme-table">
          <thead>
            <tr>
              <th class="text-center" style="width:2.5rem">
                <input type="checkbox" @change="toggleSelectAllPending" :checked="allPendingSelected" />
              </th>
              <th>Request ID</th>
              <th>Item Name</th>
              <th>Borrower</th>
              <th>Request Date</th>
              <th>Status</th>
              <th>Waiting</th>
              <th>Reason</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="group in paginatedPending" :key="group.parent.id">
              <tr class="row-parent">
                <td class="text-center">
                  <input type="checkbox" :value="group.parent.id" v-model="selectedPendingIds" />
                </td>
                <td style="font-weight:600">{{ group.parent.id }}</td>
                <td style="font-weight:600">
                  {{ group.parent.itemName }}
                  <span v-if="group.children.length > 0" class="ml-2 text-xs text-accent-subtle font-normal">
                    (+ {{ group.children.length }} component{{ group.children.length > 1 ? 's' : '' }})
                  </span>
                </td>
                <td>{{ group.parent.borrowerName || group.parent.borrowerID }}
                  <span v-if="overdueBorrowerIDs.has(group.parent.borrowerID)" class="inline-flex items-center ml-1" title="This borrower has overdue items">
                    <span class="inline-block w-2.5 h-2.5 rounded-full animate-pulse" style="background:var(--danger)"></span>
                    <span class="text-xs font-semibold ml-1" style="color:var(--danger)">This user have an overdue item</span>
                  </span>
                </td>
                <td>{{ formatDate(group.parent.requestDate) }}</td>
                <td>
                  <span class="px-2 py-0.5 rounded text-xs font-medium badge-warning">Pending</span>
                </td>
                <td style="color:var(--warning-dark);font-weight:500">{{ waitingTime(group.parent.requestDate) }}</td>
                <td>{{ group.parent.reason }}</td>
                <td class="text-center whitespace-nowrap">
                  <button @click="selectedRequest = group.parent.id" class="btn btn-outline-success text-sm">
                    Approve{{ group.children.length > 0 ? ' All' : '' }}
                  </button>
                  <button @click="showRejectForm = group.parent.id" class="btn btn-outline-danger text-sm ml-2">
                    Reject{{ group.children.length > 0 ? ' All' : '' }}
                  </button>
                  <button @click="openEmailForRequest(group.parent)" class="btn btn-ghost text-sm ml-2" title="Email Borrower">✉</button>
                </td>
              </tr>
              <tr v-for="child in group.children" :key="child.id" class="row-child">
                <td class="pl-6 text-sm">↳ {{ child.id }}</td>
                <td class="pl-6 text-sm">{{ child.itemName }}</td>
                <td class="text-sm">{{ child.borrowerName || child.borrowerID }}</td>
                <td class="text-sm">{{ formatDate(child.requestDate) }}</td>
                <td class="text-sm">
                  <span class="px-2 py-0.5 rounded text-xs font-medium badge-warning">Pending</span>
                </td>
                <td class="text-sm">{{ waitingTime(child.requestDate) }}</td>
                <td class="text-sm italic">{{ child.reason }}</td>
                <td class="text-center text-xs" style="color:var(--muted-foreground)">Auto with parent</td>
              </tr>
            </template>
          </tbody>
        </table>
        <PaginationControl v-model:currentPage="currentPage" :totalItems="pendingCount" :pageSize="pageSize" />
      </div>
    </template>

    <!-- ========== PENDING CHECK-OUT TAB ========== -->
    <template v-if="activeTab === 'checkout'">
      <div v-if="checkoutGroups.length === 0" class="empty-state">
        No items pending check-out
      </div>
      <div v-else class="table-responsive">
        <table class="table-striped theme-table">
          <thead>
            <tr>
              <th class="text-center" style="width:2.5rem">
                <input type="checkbox" @change="toggleSelectAllCheckout" :checked="allCheckoutSelected" />
              </th>
              <th>Request ID</th>
              <th>Item Name</th>
              <th>Borrower</th>
              <th>Approved Date</th>
              <th>Status</th>
              <th>Waiting</th>
              <th>Return Date</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="group in paginatedCheckout" :key="group.parent.id">
              <tr class="row-parent">
                <td class="text-center">
                  <input type="checkbox" :value="group.parent.id" v-model="selectedCheckoutIds" />
                </td>
                <td style="font-weight:600">{{ group.parent.id }}</td>
                <td style="font-weight:600">
                  {{ group.parent.itemName }}
                  <span v-if="group.children.length > 0" class="ml-2 text-xs text-accent-subtle font-normal">
                    (+ {{ group.children.length }} component{{ group.children.length > 1 ? 's' : '' }})
                  </span>
                </td>
                <td>{{ group.parent.borrowerName || group.parent.borrowerID }}
                  <span v-if="overdueBorrowerIDs.has(group.parent.borrowerID)" class="inline-flex items-center ml-1" title="This borrower has overdue items">
                    <span class="inline-block w-2.5 h-2.5 rounded-full animate-pulse" style="background:var(--danger)"></span>
                    <span class="text-xs font-semibold ml-1" style="color:var(--danger)">This user have an overdue item</span>
                  </span>
                </td>
                <td>{{ formatDate(group.parent.approvalDate) }}</td>
                <td>
                  <span class="px-2 py-0.5 rounded text-xs font-medium badge-info">Pending Check-Out</span>
                  <span v-if="isCheckoutExpiringSoon(group.parent)" class="ml-1 text-xs font-semibold" style="color:var(--danger)">(expiring soon)</span>
                </td>
                <td style="color:var(--warning-dark);font-weight:500">{{ waitingTime(group.parent.approvalDate) }}</td>
                <td>{{ formatDate(group.parent.returnDate) || '-' }}</td>
                <td class="text-center whitespace-nowrap">
                  <button @click="handleCheckout(group.parent.id)" class="btn btn-outline-primary text-sm">
                    Borrowed Out{{ group.children.length > 0 ? ' All' : '' }}
                  </button>
                  <button @click="showDenyForm = group.parent.id" class="btn btn-outline-danger text-sm ml-2">
                    Deny{{ group.children.length > 0 ? ' All' : '' }}
                  </button>
                  <button @click="openEmailForRequest(group.parent)" class="btn btn-ghost text-sm ml-2" title="Email Borrower">✉</button>
                </td>
              </tr>
              <tr v-for="child in group.children" :key="child.id" class="row-child">
                <td class="pl-6 text-sm">↳ {{ child.id }}</td>
                <td class="pl-6 text-sm">{{ child.itemName }}</td>
                <td class="text-sm">{{ child.borrowerName || child.borrowerID }}</td>
                <td class="text-sm">{{ formatDate(child.approvalDate) }}</td>
                <td class="text-sm">
                  <span class="px-2 py-0.5 rounded text-xs font-medium badge-info">Pending Check-Out</span>
                </td>
                <td class="text-sm">{{ waitingTime(child.approvalDate) }}</td>
                <td class="text-sm">{{ formatDate(child.returnDate) || '-' }}</td>
                <td class="text-center text-xs" style="color:var(--muted-foreground)">Auto with parent</td>
              </tr>
            </template>
          </tbody>
        </table>
        <PaginationControl v-model:currentPage="currentPage" :totalItems="checkoutCount" :pageSize="pageSize" />
      </div>
    </template>

    <!-- Approve Modal -->
    <div v-if="selectedRequest" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
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
    <div v-if="showRejectForm" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
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
    <div v-if="showDenyForm" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
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
    <div v-if="showBulkApproveForm" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
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
    <div v-if="showBulkRejectForm" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
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
    <div v-if="showBulkCheckoutForm" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
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
    <div v-if="showBulkDenyForm" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
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
import { ref, computed, watch, onMounted } from 'vue'
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
      return pendingGroups.value
    })

    const paginatedCheckout = computed(() => {
      return checkoutGroups.value
    })

    const allPendingSelected = computed(() => {
      return paginatedPending.value.length > 0 && paginatedPending.value.every(g => selectedPendingIds.value.includes(g.parent.id))
    })

    const allCheckoutSelected = computed(() => {
      return paginatedCheckout.value.length > 0 && paginatedCheckout.value.every(g => selectedCheckoutIds.value.includes(g.parent.id))
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

    const pendingCount = ref(0)
    const checkoutCount = ref(0)

    const loadPendingRequests = async () => {
      try {
        // Trigger auto-expire first
        try { await borrowingService.autoExpirePendingCheckouts() } catch (e) { /* ignore */ }
        const status = activeTab.value === 'pending' ? 'Pending' : 'Pending Check-Out'
        const data = await borrowingService.getPendingRequests({ page: currentPage.value, pageSize, status })
        requests.value = data.requests || []
        pendingCount.value = data.pendingCount || 0
        checkoutCount.value = data.checkoutCount || 0
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
      const pageIds = paginatedPending.value.map(group => group.parent.id)
      if (event.target.checked) {
        const newSet = new Set([...selectedPendingIds.value, ...pageIds])
        selectedPendingIds.value = Array.from(newSet)
      } else {
        selectedPendingIds.value = selectedPendingIds.value.filter(id => !pageIds.includes(id))
      }
    }

    const toggleSelectAllCheckout = (event) => {
      const pageIds = paginatedCheckout.value.map(group => group.parent.id)
      if (event.target.checked) {
        const newSet = new Set([...selectedCheckoutIds.value, ...pageIds])
        selectedCheckoutIds.value = Array.from(newSet)
      } else {
        selectedCheckoutIds.value = selectedCheckoutIds.value.filter(id => !pageIds.includes(id))
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

    watch([currentPage, activeTab], () => {
      loadPendingRequests()
    })

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
      pendingCount,
      checkoutCount,
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
.row-parent td { font-size: 0.8125rem; }
.row-child td { color: var(--muted-foreground); }
.text-accent-subtle { color: var(--accent); opacity: 0.7; }
</style>
