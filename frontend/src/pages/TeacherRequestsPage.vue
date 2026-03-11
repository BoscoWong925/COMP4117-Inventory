<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">My Item Requests</h2>
      <p class="text-sm text-secondary">Manage borrow requests for items you own</p>
    </div>

    <!-- Tabs -->
    <div class="mb-4 flex gap-2">
      <button
        @click="activeTab = 'pending'; currentPage = 1"
        :class="`pill ${activeTab === 'pending' ? 'pill-active' : ''}`"
      >
        Pending
        <span v-if="pendingOnly.length" class="ml-1 px-2 py-0.5 rounded-full text-sm font-bold bg-red-500 text-white" style="min-width:1.5rem;text-align:center">{{ pendingOnly.length }}</span>
      </button>
      <button
        @click="activeTab = 'checkout'; currentPage = 1"
        :class="`pill ${activeTab === 'checkout' ? 'pill-active' : ''}`"
      >
        Pending Check-Out
        <span v-if="checkoutOnly.length" class="ml-1 px-2 py-0.5 rounded-full text-sm font-bold bg-blue-500 text-white" style="min-width:1.5rem;text-align:center">{{ checkoutOnly.length }}</span>
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
      <div v-else class="overflow-x-auto">
        <table class="w-full border-collapse table-striped theme-table">
          <thead>
            <tr>
              <th class="border p-2 text-left">Request ID</th>
              <th class="border p-2 text-left">Item</th>
              <th class="border p-2 text-left">Borrower</th>
              <th class="border p-2 text-left">Request Date</th>
              <th class="border p-2 text-left">Status</th>
              <th class="border p-2 text-left">Waiting</th>
              <th class="border p-2 text-left">Reason</th>
              <th class="border p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in paginatedPending" :key="req.id || req._id">
              <td class="border p-2 text-sm font-semibold">{{ req.requestId || req.id }}</td>
              <td class="border p-2 text-sm">{{ req.itemName || req.itemID }}</td>
              <td class="border p-2 text-sm">{{ req.borrowerName || req.borrowerID }}</td>
              <td class="border p-2 text-sm">{{ formatDate(req.requestDate) }}</td>
              <td class="border p-2 text-sm">
                <span class="px-2 py-0.5 rounded text-xs font-medium badge-warning">Pending</span>
              </td>
              <td class="border p-2 text-sm text-orange-500 font-medium">{{ waitingTime(req.requestDate) }}</td>
              <td class="border p-2 text-sm">{{ req.reason || '-' }}</td>
              <td class="border p-2 text-center whitespace-nowrap">
                <button @click="openApprove(req)" class="btn btn-outline-success text-sm">Approve</button>
                <button @click="openReject(req)" class="btn btn-outline-danger text-sm ml-1">Reject</button>
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
      <div v-else class="overflow-x-auto">
        <table class="w-full border-collapse table-striped theme-table">
          <thead>
            <tr>
              <th class="border p-2 text-left">Request ID</th>
              <th class="border p-2 text-left">Item</th>
              <th class="border p-2 text-left">Borrower</th>
              <th class="border p-2 text-left">Approved Date</th>
              <th class="border p-2 text-left">Status</th>
              <th class="border p-2 text-left">Waiting</th>
              <th class="border p-2 text-left">Return Date</th>
              <th class="border p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in paginatedCheckout" :key="req.id || req._id">
              <td class="border p-2 text-sm font-semibold">{{ req.requestId || req.id }}</td>
              <td class="border p-2 text-sm">{{ req.itemName || req.itemID }}</td>
              <td class="border p-2 text-sm">{{ req.borrowerName || req.borrowerID }}</td>
              <td class="border p-2 text-sm">{{ formatDate(req.approvalDate) }}</td>
              <td class="border p-2 text-sm">
                <span class="px-2 py-0.5 rounded text-xs font-medium badge-info">Pending Check-Out</span>
              </td>
              <td class="border p-2 text-sm text-orange-500 font-medium">{{ waitingTime(req.approvalDate) }}</td>
              <td class="border p-2 text-sm">{{ formatDate(req.returnDate) || '-' }}</td>
              <td class="border p-2 text-center whitespace-nowrap">
                <button @click="handleCheckout(req)" class="btn btn-outline-primary text-sm">Borrowed Out</button>
                <button @click="openDeny(req)" class="btn btn-outline-danger text-sm ml-1">Deny</button>
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
      <div v-else class="overflow-x-auto">
        <table class="w-full border-collapse table-striped theme-table">
          <thead>
            <tr>
              <th class="border p-2 text-left">Request ID</th>
              <th class="border p-2 text-left">Item</th>
              <th class="border p-2 text-left">Borrower</th>
              <th class="border p-2 text-left">Request Date</th>
              <th class="border p-2 text-left">Status</th>
              <th class="border p-2 text-left">Return Date</th>
              <th class="border p-2 text-left">Reason</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in historyRequests" :key="req.id || req._id">
              <td class="border p-2 text-sm font-semibold">{{ req.requestId || req.id }}</td>
              <td class="border p-2 text-sm">{{ req.itemName || req.itemID }}</td>
              <td class="border p-2 text-sm">{{ req.borrowerName || req.borrowerID }}</td>
              <td class="border p-2 text-sm">{{ formatDate(req.requestDate) }}</td>
              <td class="border p-2 text-sm">
                <span :class="`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(req.status)}`">
                  {{ req.status }}
                </span>
              </td>
              <td class="border p-2 text-sm">{{ formatDate(req.returnDate) || '-' }}</td>
              <td class="border p-2 text-sm">{{ req.reason || '-' }}</td>
            </tr>
          </tbody>
        </table>
        <PaginationControl v-model:currentPage="currentPage" :totalItems="totalHistory" :pageSize="pageSize" />
      </div>
    </template>

    <!-- Approve Modal -->
    <div v-if="approveTarget" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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
    <div v-if="rejectTarget" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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
    <div v-if="denyTarget" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { borrowingService } from '../utils/services'
import { formatDate, waitingTime } from '../utils/helpers'
import PaginationControl from '../components/PaginationControl.vue'

export default {
  components: { PaginationControl },
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

    onMounted(() => { loadPending() })

    return {
      activeTab, pendingRequests, historyRequests, loadingPending, loadingHistory,
      historyStatus, currentPage, pageSize, totalHistory,
      pendingOnly, checkoutOnly,
      approveTarget, returnDate, approveRemark,
      rejectTarget, rejectReason,
      denyTarget, denyReason,
      paginatedPending, paginatedCheckout,
      getStatusBadge, openApprove, openReject, openDeny,
      handleApprove, handleReject, handleCheckout, handleDeny,
      loadPending, loadHistory,
      formatDate, waitingTime
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
