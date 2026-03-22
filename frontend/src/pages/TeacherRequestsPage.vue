<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h2 class="page-title">My Item Requests</h2>
        <p class="page-description">Manage borrow requests for items you own</p>
      </div>
      <!-- Bulk Actions for Pending Tab -->
      <div v-if="activeTab === 'pending' && selectedPendingIds.length > 0" class="flex gap-2">
        <button @click="showBulkApproveModal = true" class="btn btn-outline-success">
          Approve ({{ selectedPendingIds.length }})
        </button>
        <button @click="showBulkRejectModal = true" class="btn btn-outline-danger">
          Reject ({{ selectedPendingIds.length }})
        </button>
      </div>
      <!-- Bulk Actions for Check-Out Tab -->
      <div v-if="activeTab === 'checkout' && selectedCheckoutIds.length > 0" class="flex gap-2">
        <button @click="showBulkCheckoutModal = true" class="btn btn-outline-primary">
          Borrowed Out ({{ selectedCheckoutIds.length }})
        </button>
        <button @click="showBulkDenyModal = true" class="btn btn-outline-danger">
          Deny ({{ selectedCheckoutIds.length }})
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="mb-4 flex gap-2">
      <button
        @click="activeTab = 'pending'; currentPage = 1"
        :class="`pill ${activeTab === 'pending' ? 'pill-active' : ''}`"
      >
        Pending
        <span v-if="pendingOnly.length" class="ml-1 px-2 py-0.5 rounded-full text-sm font-bold" style="min-width:1.5rem;text-align:center;background:var(--danger);color:#fff">{{ pendingOnly.length }}</span>
      </button>
      <button
        @click="activeTab = 'checkout'; currentPage = 1"
        :class="`pill ${activeTab === 'checkout' ? 'pill-active' : ''}`"
      >
        Pending Check-Out
        <span v-if="checkoutOnly.length" class="ml-1 px-2 py-0.5 rounded-full text-sm font-bold" style="min-width:1.5rem;text-align:center;background:var(--info);color:#fff">{{ checkoutOnly.length }}</span>
      </button>
      <button
        @click="activeTab = 'history'; currentPage = 1; loadHistory()"
        :class="`pill ${activeTab === 'history' ? 'pill-active' : ''}`"
      >
        History
      </button>
    </div>

    <!-- ========== PENDING TAB ========== -->
    <template v-if="activeTab === 'pending'">
      <div v-if="loadingPending" class="empty-state">Loading pending requests...</div>
      <div v-else-if="pendingOnly.length === 0" class="empty-state">
        <p>No pending requests</p>
        <p class="text-sm mt-1">Students haven't requested any of your items yet.</p>
      </div>
      <div v-else class="table-responsive">
        <table class="table-striped theme-table">
          <thead>
            <tr>
              <th class="text-center" style="width:2.5rem">
                <input type="checkbox" @change="toggleSelectAllPending" :checked="allPendingSelected" />
              </th>
              <th>Request ID</th>
              <th>Item</th>
              <th>Borrower</th>
              <th>Request Date</th>
              <th>Status</th>
              <th>Waiting</th>
              <th>Reason</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in paginatedPending" :key="req.id || req._id">
              <td class="text-center">
                <input type="checkbox" :value="req.requestId || req.id" v-model="selectedPendingIds" />
              </td>
              <td class="text-sm" style="font-weight:600">{{ req.requestId || req.id }}</td>
              <td class="text-sm">{{ req.itemName || req.itemID }}</td>
              <td class="text-sm">{{ req.borrowerName || req.borrowerID }}</td>
              <td class="text-sm">{{ formatDate(req.requestDate) }}</td>
              <td class="text-sm">
                <span class="px-2 py-0.5 rounded text-xs font-medium badge-warning">Pending</span>
              </td>
              <td class="text-sm" style="color:var(--warning-dark);font-weight:500">{{ waitingTime(req.requestDate) }}</td>
              <td class="text-sm">{{ req.reason || '-' }}</td>
              <td class="text-center whitespace-nowrap">
                <button @click="openApprove(req)" class="btn btn-outline-success text-sm">Approve</button>
                <button @click="openReject(req)" class="btn btn-outline-danger text-sm ml-1">Reject</button>
                <button @click="openEmailForRequest(req)" class="btn btn-ghost text-sm ml-1" title="Email Borrower">✉</button>
              </td>
            </tr>
          </tbody>
        </table>
        <PaginationControl v-model:currentPage="currentPage" :totalItems="pendingOnly.length" :pageSize="pageSize" />
      </div>
    </template>

    <!-- ========== PENDING CHECK-OUT TAB ========== -->
    <template v-if="activeTab === 'checkout'">
      <div v-if="loadingPending" class="empty-state">Loading...</div>
      <div v-else-if="checkoutOnly.length === 0" class="empty-state">
        <p>No items pending check-out</p>
      </div>
      <div v-else class="table-responsive">
        <table class="table-striped theme-table">
          <thead>
            <tr>
              <th class="text-center" style="width:2.5rem">
                <input type="checkbox" @change="toggleSelectAllCheckout" :checked="allCheckoutSelected" />
              </th>
              <th>Request ID</th>
              <th>Item</th>
              <th>Borrower</th>
              <th>Approved Date</th>
              <th>Status</th>
              <th>Waiting</th>
              <th>Return Date</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in paginatedCheckout" :key="req.id || req._id">
              <td class="text-center">
                <input type="checkbox" :value="req.requestId || req.id" v-model="selectedCheckoutIds" />
              </td>
              <td class="text-sm" style="font-weight:600">{{ req.requestId || req.id }}</td>
              <td class="text-sm">{{ req.itemName || req.itemID }}</td>
              <td class="text-sm">{{ req.borrowerName || req.borrowerID }}</td>
              <td class="text-sm">{{ formatDate(req.approvalDate) }}</td>
              <td class="text-sm">
                <span class="px-2 py-0.5 rounded text-xs font-medium badge-info">Pending Check-Out</span>
              </td>
              <td class="text-sm" style="color:var(--warning-dark);font-weight:500">{{ waitingTime(req.approvalDate) }}</td>
              <td class="text-sm">{{ formatDate(req.returnDate) || '-' }}</td>
              <td class="text-center whitespace-nowrap">
                <button @click="handleCheckout(req)" class="btn btn-outline-primary text-sm">Borrowed Out</button>
                <button @click="openDeny(req)" class="btn btn-outline-danger text-sm ml-1">Deny</button>
                <button @click="openEmailForRequest(req)" class="btn btn-ghost text-sm ml-1" title="Email Borrower">✉</button>
              </td>
            </tr>
          </tbody>
        </table>
        <PaginationControl v-model:currentPage="currentPage" :totalItems="checkoutOnly.length" :pageSize="pageSize" />
      </div>
    </template>

    <!-- ========== HISTORY TAB ========== -->
    <template v-if="activeTab === 'history'">
      <div class="mb-3 flex gap-2">
        <button
          v-for="s in ['All', 'Approved', 'Rejected', 'Returned']"
          :key="s"
          @click="historyStatus = s; currentPage = 1"
          :class="`pill ${historyStatus === s ? 'pill-active' : ''}`"
        >{{ s }}</button>
      </div>
      <div v-if="loadingHistory" class="empty-state">Loading history...</div>
      <div v-else-if="historyRequests.length === 0" class="empty-state">No history records found</div>
      <div v-else class="table-responsive">
        <table class="table-striped theme-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Item</th>
              <th>Borrower</th>
              <th>Request Date</th>
              <th>Status</th>
              <th>Return Date</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in historyRequests" :key="req.id || req._id">
              <td class="text-sm" style="font-weight:600">{{ req.requestId || req.id }}</td>
              <td class="text-sm">{{ req.itemName || req.itemID }}</td>
              <td class="text-sm">{{ req.borrowerName || req.borrowerID }}</td>
              <td class="text-sm">{{ formatDate(req.requestDate) }}</td>
              <td class="text-sm">
                <span :class="`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(req.status)}`">
                  {{ req.status }}
                </span>
              </td>
              <td class="text-sm">{{ formatDate(req.returnDate) || '-' }}</td>
              <td class="text-sm">{{ req.reason || '-' }}</td>
            </tr>
          </tbody>
        </table>
        <PaginationControl v-model:currentPage="currentPage" :totalItems="totalHistory" :pageSize="pageSize" />
      </div>
    </template>

    <!-- Approve Modal -->
    <div v-if="approveTarget" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Approve Request</h3>
        <p class="text-sm text-secondary mb-3">
          Approve <strong>{{ approveTarget.borrowerName || approveTarget.borrowerID }}</strong>'s
          request for <strong>{{ approveTarget.itemName || approveTarget.itemID }}</strong>
        </p>
        <div class="mb-4">
          <label class="modal-label">Return Date *</label>
          <input type="date" v-model="returnDate" class="form-input" />
        </div>
        <div class="mb-4">
          <label class="modal-label">Remark</label>
          <textarea v-model="approveRemark" class="form-input" rows="2" placeholder="Add any notes..." />
        </div>
        <div class="flex gap-2">
          <button @click="handleApprove" class="btn btn-outline-success flex-1">Approve</button>
          <button @click="approveTarget = null; returnDate = ''; approveRemark = ''" class="btn btn-outline-secondary flex-1">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <div v-if="rejectTarget" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Reject Request</h3>
        <p class="text-sm text-secondary mb-3">
          Reject <strong>{{ rejectTarget.borrowerName || rejectTarget.borrowerID }}</strong>'s
          request for <strong>{{ rejectTarget.itemName || rejectTarget.itemID }}</strong>
        </p>
        <div class="mb-4">
          <label class="modal-label">Reason for Rejection *</label>
          <textarea v-model="rejectReason" class="form-input" rows="3" placeholder="Enter rejection reason..." />
        </div>
        <div class="flex gap-2">
          <button @click="handleReject" class="btn btn-outline-danger flex-1">Reject</button>
          <button @click="rejectTarget = null; rejectReason = ''" class="btn btn-outline-secondary flex-1">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Deny Check-Out Modal -->
    <div v-if="denyTarget" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Deny Check-Out</h3>
        <p class="text-sm text-secondary mb-3">
          This will reject the approved request for <strong>{{ denyTarget.itemName || denyTarget.itemID }}</strong> and make the item available again.
        </p>
        <div class="mb-4">
          <label class="modal-label">Reason</label>
          <textarea v-model="denyReason" class="form-input" rows="3" placeholder="Enter reason for denying check-out..." />
        </div>
        <div class="flex gap-2">
          <button @click="handleDeny" class="btn btn-outline-danger flex-1">Deny</button>
          <button @click="denyTarget = null; denyReason = ''" class="btn btn-outline-secondary flex-1">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Bulk Approve Modal -->
    <div v-if="showBulkApproveModal" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Bulk Approve ({{ selectedPendingIds.length }} request{{ selectedPendingIds.length !== 1 ? 's' : '' }})</h3>
        <p class="text-sm text-secondary mb-3">
          Approve all selected requests.
        </p>
        <div class="mb-4">
          <label class="modal-label">Return Date *</label>
          <input type="date" v-model="bulkReturnDate" class="form-input" />
        </div>
        <div class="mb-4">
          <label class="modal-label">Remark</label>
          <textarea v-model="bulkApproveRemark" class="form-input" rows="2" placeholder="Add any notes..." />
        </div>
        <div class="flex gap-2">
          <button @click="handleBulkApprove" class="btn btn-outline-success flex-1">Approve</button>
          <button @click="showBulkApproveModal = false; bulkReturnDate = ''; bulkApproveRemark = ''" class="btn btn-outline-secondary flex-1">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Bulk Reject Modal -->
    <div v-if="showBulkRejectModal" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Bulk Reject ({{ selectedPendingIds.length }} request{{ selectedPendingIds.length !== 1 ? 's' : '' }})</h3>
        <p class="text-sm text-secondary mb-3">
          Reject all selected requests.
        </p>
        <div class="mb-4">
          <label class="modal-label">Reason *</label>
          <textarea v-model="bulkRejectReason" class="form-input" rows="3" placeholder="Enter rejection reason..." />
        </div>
        <div class="flex gap-2">
          <button @click="handleBulkReject" class="btn btn-outline-danger flex-1">Reject</button>
          <button @click="showBulkRejectModal = false; bulkRejectReason = ''" class="btn btn-outline-secondary flex-1">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Bulk Checkout Modal -->
    <div v-if="showBulkCheckoutModal" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Bulk Borrowed Out ({{ selectedCheckoutIds.length }} item{{ selectedCheckoutIds.length !== 1 ? 's' : '' }})</h3>
        <p class="text-sm text-secondary mb-4">
          Mark all selected items as borrowed out?
        </p>
        <div class="flex gap-2">
          <button @click="handleBulkCheckout" class="btn btn-outline-primary flex-1">Borrowed Out</button>
          <button @click="showBulkCheckoutModal = false" class="btn btn-outline-secondary flex-1">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Bulk Deny Modal -->
    <div v-if="showBulkDenyModal" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Bulk Deny ({{ selectedCheckoutIds.length }} item{{ selectedCheckoutIds.length !== 1 ? 's' : '' }})</h3>
        <p class="text-sm text-secondary mb-3">
          Deny checkout for all selected items.
        </p>
        <div class="mb-4">
          <label class="modal-label">Reason</label>
          <textarea v-model="bulkDenyReason" class="form-input" rows="3" placeholder="Enter reason..." />
        </div>
        <div class="flex gap-2">
          <button @click="handleBulkDeny" class="btn btn-outline-danger flex-1">Deny</button>
          <button @click="showBulkDenyModal = false; bulkDenyReason = ''" class="btn btn-outline-secondary flex-1">Cancel</button>
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
import { ref, computed, onMounted, watch } from 'vue'
import { borrowingService } from '../utils/services'
import { formatDate, waitingTime } from '../utils/helpers'
import PaginationControl from '../components/PaginationControl.vue'
import SendEmailModal from '../components/SendEmailModal.vue'

export default {
  components: { PaginationControl, SendEmailModal },
  setup() {
    const activeTab = ref('pending')
    const pendingRequests = ref([])
    const historyRequests = ref([])
    const totalHistory = ref(0)
    const loadingPending = ref(true)
    const loadingHistory = ref(false)
    const historyStatus = ref('All')
    const currentPage = ref(1)
    const pageSize = 10

    // Approve modal
    const approveTarget = ref(null)
    const returnDate = ref('')
    const approveRemark = ref('')

    // Reject modal
    const rejectTarget = ref(null)
    const rejectReason = ref('')

    // Deny modal
    const denyTarget = ref(null)
    const denyReason = ref('')

    // Bulk operations
    const selectedPendingIds = ref([])
    const selectedCheckoutIds = ref([])
    const showBulkApproveModal = ref(false)
    const showBulkRejectModal = ref(false)
    const showBulkCheckoutModal = ref(false)
    const showBulkDenyModal = ref(false)
    const bulkReturnDate = ref('')
    const bulkApproveRemark = ref('')
    const bulkRejectReason = ref('')
    const bulkDenyReason = ref('')
    const showEmailModal = ref(false)
    const emailTarget = ref(null)

    // Split pending requests by status
    const pendingOnly = computed(() => pendingRequests.value.filter(r => r.status === 'Pending'))
    const checkoutOnly = computed(() => pendingRequests.value.filter(r => r.status === 'Pending Check-Out'))

    const paginatedPending = computed(() => {
      const start = (currentPage.value - 1) * pageSize
      return pendingOnly.value.slice(start, start + pageSize)
    })

    const paginatedCheckout = computed(() => {
      const start = (currentPage.value - 1) * pageSize
      return checkoutOnly.value.slice(start, start + pageSize)
    })

    const allPendingSelected = computed(() => {
      return pendingOnly.value.length > 0 && selectedPendingIds.value.length === pendingOnly.value.length
    })

    const allCheckoutSelected = computed(() => {
      return checkoutOnly.value.length > 0 && selectedCheckoutIds.value.length === checkoutOnly.value.length
    })

    const loadPending = async () => {
      loadingPending.value = true
      try {
        pendingRequests.value = await borrowingService.getTeacherPendingRequests()
      } catch (e) {
        console.error('Failed to load teacher pending requests:', e)
      }
      loadingPending.value = false
    }

    const loadHistory = async () => {
      loadingHistory.value = true
      try {
        const params = {
          page: currentPage.value,
          pageSize,
        }
        if (historyStatus.value !== 'All') params.status = historyStatus.value
        const result = await borrowingService.getTeacherRequestHistory(params)
        historyRequests.value = result.requests || []
        totalHistory.value = result.total || 0
      } catch (e) {
        console.error('Failed to load teacher request history:', e)
      }
      loadingHistory.value = false
    }

    // Watch status filter and page changes when on history tab
    watch([historyStatus, currentPage], () => {
      if (activeTab.value === 'history') {
        loadHistory()
      }
    })

    const getStatusBadge = (status) => {
      const map = {
        'Approved': 'action-badge action-badge-success',
        'Rejected': 'action-badge action-badge-danger',
        'Returned': 'action-badge action-badge-accent',
        'Pending': 'action-badge action-badge-warning'
      }
      return map[status] || 'action-badge action-badge-neutral'
    }

    const openApprove = (req) => {
      approveTarget.value = req
      returnDate.value = ''
      approveRemark.value = ''
    }

    const openReject = (req) => {
      rejectTarget.value = req
      rejectReason.value = ''
    }

    const openDeny = (req) => {
      denyTarget.value = req
      denyReason.value = ''
    }

    const handleApprove = async () => {
      if (!returnDate.value) {
        alert('Please set a return date')
        return
      }
      const returnDatetime = `${returnDate.value}T17:00:00Z`
      try {
        const reqId = approveTarget.value.requestId || approveTarget.value.id || approveTarget.value._id
        await borrowingService.approveRequest(reqId, returnDatetime)
        approveTarget.value = null
        returnDate.value = ''
        approveRemark.value = ''
        await loadPending()
      } catch (e) {
        console.error('Failed to approve:', e)
        alert('Failed to approve: ' + e.message)
      }
    }

    const handleReject = async () => {
      if (!rejectReason.value) {
        alert('Please provide a rejection reason')
        return
      }
      try {
        const reqId = rejectTarget.value.requestId || rejectTarget.value.id || rejectTarget.value._id
        await borrowingService.rejectRequest(reqId, rejectReason.value)
        rejectTarget.value = null
        rejectReason.value = ''
        await loadPending()
      } catch (e) {
        console.error('Failed to reject:', e)
        alert('Failed to reject: ' + e.message)
      }
    }

    const handleCheckout = async (req) => {
      try {
        const reqId = req.requestId || req.id || req._id
        await borrowingService.checkoutRequest(reqId)
        await loadPending()
      } catch (e) {
        console.error('Failed to checkout:', e)
        alert('Failed to checkout: ' + e.message)
      }
    }

    const handleDeny = async () => {
      try {
        const reqId = denyTarget.value.requestId || denyTarget.value.id || denyTarget.value._id
        await borrowingService.denyCheckout(reqId, denyReason.value || '')
        denyTarget.value = null
        denyReason.value = ''
        await loadPending()
      } catch (e) {
        console.error('Failed to deny:', e)
        alert('Failed to deny: ' + e.message)
      }
    }

    const toggleSelectAllPending = (event) => {
      if (event.target.checked) {
        selectedPendingIds.value = pendingOnly.value.map(req => req.requestId || req.id)
      } else {
        selectedPendingIds.value = []
      }
    }

    const toggleSelectAllCheckout = (event) => {
      if (event.target.checked) {
        selectedCheckoutIds.value = checkoutOnly.value.map(req => req.requestId || req.id)
      } else {
        selectedCheckoutIds.value = []
      }
    }

    const handleBulkApprove = async () => {
      if (!bulkReturnDate.value) {
        alert('Please set a return date')
        return
      }
      showBulkApproveModal.value = false
      const returnDatetime = `${bulkReturnDate.value}T17:00:00Z`
      try {
        for (const reqId of selectedPendingIds.value) {
          try {
            await borrowingService.approveRequest(reqId, returnDatetime, '', bulkApproveRemark.value)
          } catch (e) {
            console.error(`Failed to approve request ${reqId}:`, e)
          }
        }
        selectedPendingIds.value = []
        bulkReturnDate.value = ''
        bulkApproveRemark.value = ''
        await loadPending()
      } catch (e) {
        console.error('Failed to bulk approve:', e)
        alert('Error during bulk approval')
      }
    }

    const handleBulkReject = async () => {
      if (!bulkRejectReason.value) {
        alert('Please enter a rejection reason')
        return
      }
      showBulkRejectModal.value = false
      try {
        for (const reqId of selectedPendingIds.value) {
          try {
            await borrowingService.rejectRequest(reqId, bulkRejectReason.value)
          } catch (e) {
            console.error(`Failed to reject request ${reqId}:`, e)
          }
        }
        selectedPendingIds.value = []
        bulkRejectReason.value = ''
        await loadPending()
      } catch (e) {
        console.error('Failed to bulk reject:', e)
        alert('Error during bulk rejection')
      }
    }

    const handleBulkCheckout = async () => {
      showBulkCheckoutModal.value = false
      try {
        for (const reqId of selectedCheckoutIds.value) {
          try {
            await borrowingService.checkoutRequest(reqId)
          } catch (e) {
            console.error(`Failed to checkout request ${reqId}:`, e)
          }
        }
        selectedCheckoutIds.value = []
        await loadPending()
      } catch (e) {
        console.error('Failed to bulk checkout:', e)
        alert('Error during bulk checkout')
      }
    }

    const handleBulkDeny = async () => {
      showBulkDenyModal.value = false
      try {
        for (const reqId of selectedCheckoutIds.value) {
          try {
            await borrowingService.denyCheckout(reqId, bulkDenyReason.value || '')
          } catch (e) {
            console.error(`Failed to deny request ${reqId}:`, e)
          }
        }
        selectedCheckoutIds.value = []
        bulkDenyReason.value = ''
        await loadPending()
      } catch (e) {
        console.error('Failed to bulk deny:', e)
        alert('Error during bulk denial')
      }
    }

    onMounted(() => { loadPending() })

    const openEmailForRequest = (req) => {
      emailTarget.value = req
      showEmailModal.value = true
    }

    return {
      activeTab, pendingRequests, historyRequests, loadingPending, loadingHistory,
      historyStatus, currentPage, pageSize, totalHistory,
      pendingOnly, checkoutOnly,
      approveTarget, returnDate, approveRemark,
      rejectTarget, rejectReason,
      denyTarget, denyReason,
      selectedPendingIds, selectedCheckoutIds, allPendingSelected, allCheckoutSelected,
      showBulkApproveModal, showBulkRejectModal, showBulkCheckoutModal, showBulkDenyModal,
      bulkReturnDate, bulkApproveRemark, bulkRejectReason, bulkDenyReason,
      paginatedPending, paginatedCheckout,
      showEmailModal, emailTarget,
      getStatusBadge, openApprove, openReject, openDeny,
      handleApprove, handleReject, handleCheckout, handleDeny,
      toggleSelectAllPending, toggleSelectAllCheckout,
      handleBulkApprove, handleBulkReject, handleBulkCheckout, handleBulkDeny,
      loadPending, loadHistory,
      formatDate, waitingTime,
      openEmailForRequest
    }
  }
}
</script>

<style scoped>
</style>
