<template>
  <div class="page-container">
    <ModulePageHeader :title="pageTitle" subtitle="Manage borrow requests for items you own">
    </ModulePageHeader>

    <!-- Tabs -->
    <div v-if="!hideInternalTabs" class="mb-4 flex gap-2">
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
      <div v-else-if="pendingRequests.length === 0" class="empty-state">
        <p>No pending requests</p>
        <p class="text-sm mt-1">Students haven't requested any of your items yet.</p>
      </div>
      <Card v-else class="teacher-table-card">
        <Transition name="bulk-bar">
          <div v-if="selectedPendingIds.length > 0" class="bulk-toolbar">
            <div class="bulk-toolbar-left">
              <span class="bulk-chip">{{ selectedPendingIds.length }} selected</span>
              <DropdownMenu align="start">
                <template #trigger>
                  <button class="toolbar-btn">
                    <Zap :size="12" /> Actions <ChevronDown :size="10" />
                  </button>
                </template>
                <template #default="{ close }">
                  <DropdownMenuItem success @click="showBulkApproveModal = true; close()">
                    <CheckCircle2 :size="12" /> Approve ({{ selectedPendingIds.length }})
                  </DropdownMenuItem>
                  <DropdownMenuItem destructive @click="showBulkRejectModal = true; close()">
                    <XCircle :size="12" /> Reject ({{ selectedPendingIds.length }})
                  </DropdownMenuItem>
                </template>
              </DropdownMenu>
              <button class="bulk-clear-btn" @click="selectedPendingIds = []">Clear</button>
            </div>
          </div>
        </Transition>
        <div class="table-responsive">
          <table class="table-striped theme-table">
            <thead>
              <tr>
                <th class="text-center" style="width:2.5rem">
                  <Checkbox
                    :checked="allPendingSelected"
                    :indeterminate="selectedPendingIds.length > 0 && !allPendingSelected"
                    @update:checked="toggleSelectAllPending"
                  />
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
              <tr v-for="req in pendingRequests" :key="req.id || req._id">
                <td class="text-center">
                  <Checkbox
                    :checked="selectedPendingIds.includes(req.requestId || req.id)"
                    @update:checked="togglePendingSelection(req.requestId || req.id, $event)"
                  />
                </td>
                <td class="text-sm" style="font-weight:600">{{ req.requestId || req.id }}</td>
                <td class="text-sm">{{ req.itemName || req.itemID }}</td>
                <td class="text-sm">{{ req.borrowerName || req.borrowerID }}</td>
                <td class="text-sm">{{ formatDate(req.requestDate) }}</td>
                <td class="text-sm">
                  <Badge variant="warning">Pending</Badge>
                </td>
                <td class="text-sm" style="color:var(--warning-dark);font-weight:500">{{ waitingTime(req.requestDate) }}</td>
                <td class="text-sm">{{ req.reason || '-' }}</td>
                <td class="text-center">
                  <DropdownMenu align="end">
                    <template #trigger>
                      <button class="kebab-trigger" aria-label="Row actions">
                        <MoreVertical :size="14" />
                      </button>
                    </template>
                    <template #default="{ close }">
                      <DropdownMenuItem success @click="openApprove(req); close()">
                        <CheckCircle2 :size="12" /> Approve
                      </DropdownMenuItem>
                      <DropdownMenuItem destructive @click="openReject(req); close()">
                        <XCircle :size="12" /> Reject
                      </DropdownMenuItem>
                      <DropdownMenuItem separator />
                      <DropdownMenuItem @click="openEmailForRequest(req); close()">
                        <Mail :size="12" /> Email Borrower
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
          :total-items="pendingCount"
        />
      </Card>
    </template>

    <!-- ========== PENDING CHECK-OUT TAB ========== -->
    <template v-if="activeTab === 'checkout'">
      <div v-if="loadingPending" class="empty-state">Loading...</div>
      <div v-else-if="pendingRequests.length === 0" class="empty-state">
        <p>No items pending check-out</p>
      </div>
      <Card v-else class="teacher-table-card">
        <Transition name="bulk-bar">
          <div v-if="selectedCheckoutIds.length > 0" class="bulk-toolbar">
            <div class="bulk-toolbar-left">
              <span class="bulk-chip">{{ selectedCheckoutIds.length }} selected</span>
              <DropdownMenu align="start">
                <template #trigger>
                  <button class="toolbar-btn">
                    <Zap :size="12" /> Actions <ChevronDown :size="10" />
                  </button>
                </template>
                <template #default="{ close }">
                  <DropdownMenuItem success @click="showBulkCheckoutModal = true; close()">
                    <Package :size="12" /> Borrowed Out ({{ selectedCheckoutIds.length }})
                  </DropdownMenuItem>
                  <DropdownMenuItem destructive @click="showBulkDenyModal = true; close()">
                    <XCircle :size="12" /> Deny ({{ selectedCheckoutIds.length }})
                  </DropdownMenuItem>
                </template>
              </DropdownMenu>
              <button class="bulk-clear-btn" @click="selectedCheckoutIds = []">Clear</button>
            </div>
          </div>
        </Transition>
        <div class="table-responsive">
          <table class="table-striped theme-table">
            <thead>
              <tr>
                <th class="text-center" style="width:2.5rem">
                  <Checkbox
                    :checked="allCheckoutSelected"
                    :indeterminate="selectedCheckoutIds.length > 0 && !allCheckoutSelected"
                    @update:checked="toggleSelectAllCheckout"
                  />
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
              <tr v-for="req in pendingRequests" :key="req.id || req._id">
                <td class="text-center">
                  <Checkbox
                    :checked="selectedCheckoutIds.includes(req.requestId || req.id)"
                    @update:checked="toggleCheckoutSelection(req.requestId || req.id, $event)"
                  />
                </td>
                <td class="text-sm" style="font-weight:600">{{ req.requestId || req.id }}</td>
                <td class="text-sm">{{ req.itemName || req.itemID }}</td>
                <td class="text-sm">{{ req.borrowerName || req.borrowerID }}</td>
                <td class="text-sm">{{ formatDate(req.approvalDate) }}</td>
                <td class="text-sm">
                  <Badge variant="info">Pending Check-Out</Badge>
                </td>
                <td class="text-sm" style="color:var(--warning-dark);font-weight:500">{{ waitingTime(req.approvalDate) }}</td>
                <td class="text-sm">{{ formatDate(req.returnDate) || '-' }}</td>
                <td class="text-center">
                  <DropdownMenu align="end">
                    <template #trigger>
                      <button class="kebab-trigger" aria-label="Row actions">
                        <MoreVertical :size="14" />
                      </button>
                    </template>
                    <template #default="{ close }">
                      <DropdownMenuItem success @click="handleCheckout(req); close()">
                        <Package :size="12" /> Borrowed Out
                      </DropdownMenuItem>
                      <DropdownMenuItem destructive @click="openDeny(req); close()">
                        <XCircle :size="12" /> Deny
                      </DropdownMenuItem>
                      <DropdownMenuItem separator />
                      <DropdownMenuItem @click="openEmailForRequest(req); close()">
                        <Mail :size="12" /> Email Borrower
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
          :total-items="checkoutCount"
        />
      </Card>
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
      <Card v-else class="teacher-table-card">
        <div class="table-responsive">
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
                  <Badge :variant="getStatusBadgeVariant(req.status)">{{ req.status }}</Badge>
                </td>
                <td class="text-sm">{{ formatDate(req.returnDate) || '-' }}</td>
                <td class="text-sm">{{ req.reason || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <TablePaginationBar
          v-model:currentPage="currentPage"
          v-model:pageSize="pageSizeRef"
          :total-items="totalHistory"
        />
      </Card>
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
          <Input type="date" v-model="returnDate" />
        </div>
        <div class="mb-4">
          <label class="modal-label">Remark</label>
          <Textarea v-model="approveRemark" rows="2" placeholder="Add any notes..." />
        </div>
        <div class="flex gap-2">
          <Button variant="outline" class="flex-1" @click="handleApprove">Approve</Button>
          <Button variant="ghost" class="flex-1" @click="approveTarget = null; returnDate = ''; approveRemark = ''">Cancel</Button>
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
          <Textarea v-model="rejectReason" rows="3" placeholder="Enter rejection reason..." />
        </div>
        <div class="flex gap-2">
          <Button variant="destructive" class="flex-1" @click="handleReject">Reject</Button>
          <Button variant="outline" class="flex-1" @click="rejectTarget = null; rejectReason = ''">Cancel</Button>
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
          <Textarea v-model="denyReason" rows="3" placeholder="Enter reason for denying check-out..." />
        </div>
        <div class="flex gap-2">
          <Button variant="destructive" class="flex-1" @click="handleDeny">Deny</Button>
          <Button variant="outline" class="flex-1" @click="denyTarget = null; denyReason = ''">Cancel</Button>
        </div>
      </div>
    </div>

    <!-- Bulk Approve Modal -->
    <div v-if="showBulkApproveModal" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Bulk Approve ({{ selectedPendingIds.length }} request{{ selectedPendingIds.length !== 1 ? 's' : '' }})</h3>
        <p class="text-sm text-secondary mb-3">Approve all selected requests.</p>
        <div class="mb-4">
          <label class="modal-label">Return Date *</label>
          <Input type="date" v-model="bulkReturnDate" />
        </div>
        <div class="mb-4">
          <label class="modal-label">Remark</label>
          <Textarea v-model="bulkApproveRemark" rows="2" placeholder="Add any notes..." />
        </div>
        <div class="flex gap-2">
          <Button variant="outline" class="flex-1" @click="handleBulkApprove">Approve</Button>
          <Button variant="ghost" class="flex-1" @click="showBulkApproveModal = false; bulkReturnDate = ''; bulkApproveRemark = ''">Cancel</Button>
        </div>
      </div>
    </div>

    <!-- Bulk Reject Modal -->
    <div v-if="showBulkRejectModal" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Bulk Reject ({{ selectedPendingIds.length }} request{{ selectedPendingIds.length !== 1 ? 's' : '' }})</h3>
        <p class="text-sm text-secondary mb-3">Reject all selected requests.</p>
        <div class="mb-4">
          <label class="modal-label">Reason *</label>
          <Textarea v-model="bulkRejectReason" rows="3" placeholder="Enter rejection reason..." />
        </div>
        <div class="flex gap-2">
          <Button variant="destructive" class="flex-1" @click="handleBulkReject">Reject</Button>
          <Button variant="outline" class="flex-1" @click="showBulkRejectModal = false; bulkRejectReason = ''">Cancel</Button>
        </div>
      </div>
    </div>

    <!-- Bulk Checkout Modal -->
    <div v-if="showBulkCheckoutModal" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Bulk Borrowed Out ({{ selectedCheckoutIds.length }} item{{ selectedCheckoutIds.length !== 1 ? 's' : '' }})</h3>
        <p class="text-sm text-secondary mb-4">Mark all selected items as borrowed out?</p>
        <div class="flex gap-2">
          <Button variant="outline" class="flex-1" @click="handleBulkCheckout">Borrowed Out</Button>
          <Button variant="ghost" class="flex-1" @click="showBulkCheckoutModal = false">Cancel</Button>
        </div>
      </div>
    </div>

    <!-- Bulk Deny Modal -->
    <div v-if="showBulkDenyModal" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Bulk Deny ({{ selectedCheckoutIds.length }} item{{ selectedCheckoutIds.length !== 1 ? 's' : '' }})</h3>
        <p class="text-sm text-secondary mb-3">Deny checkout for all selected items.</p>
        <div class="mb-4">
          <label class="modal-label">Reason</label>
          <Textarea v-model="bulkDenyReason" rows="3" placeholder="Enter reason..." />
        </div>
        <div class="flex gap-2">
          <Button variant="destructive" class="flex-1" @click="handleBulkDeny">Deny</Button>
          <Button variant="outline" class="flex-1" @click="showBulkDenyModal = false; bulkDenyReason = ''">Cancel</Button>
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
import { useActionLock } from '../hooks/useActionLock'
import { MoreVertical, CheckCircle2, XCircle, Package, Mail, Zap, ChevronDown } from 'lucide-vue-next'
import {
  UiModulePageHeader as ModulePageHeader,
  UiTablePaginationBar as TablePaginationBar,
  UiDropdownMenu as DropdownMenu,
  UiDropdownMenuItem as DropdownMenuItem,
  UiCheckbox as Checkbox,
  UiBadge as Badge,
  UiCard as Card,
  UiButton as Button,
 UiInput as Input,
 UiTextarea as Textarea
} from '../components/ui'
import SendEmailModal from '../components/SendEmailModal.vue'

export default {
  props: {
    pageParams: {
      type: Object,
      default: () => ({})
    }
  },
  components: {
    ModulePageHeader, TablePaginationBar, DropdownMenu, DropdownMenuItem,
    Checkbox, Badge, Card, Button, Input, Textarea,
    MoreVertical, CheckCircle2, XCircle, Package, Mail, Zap, ChevronDown,
    SendEmailModal
  },
  setup(props) {
    const activeTab = ref('pending')
    const pendingRequests = ref([])
    const historyRequests = ref([])
    const totalHistory = ref(0)
    const loadingPending = ref(true)
    const loadingHistory = ref(false)
    const historyStatus = ref('All')
    const currentPage = ref(1)
    const pageSize = 10
    const pageSizeRef = ref(pageSize)

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
    const pendingCount = ref(0)
    const checkoutCount = ref(0)
    const hideInternalTabs = computed(() => !!props.pageParams?.hideTabs)
    const pageTitle = computed(() => activeTab.value === 'checkout' ? 'Pending Check-Out Requests' : 'Pending Approval Requests')

    const applyIncomingTab = (tabValue) => {
      if (tabValue === 'pending' || tabValue === 'checkout' || tabValue === 'history') {
        activeTab.value = tabValue
      }
    }

    const allPendingSelected = computed(() => {
      return pendingRequests.value.length > 0 && selectedPendingIds.value.length === pendingRequests.value.length
    })

    const allCheckoutSelected = computed(() => {
      return pendingRequests.value.length > 0 && selectedCheckoutIds.value.length === pendingRequests.value.length
    })

    const loadPending = async () => {
      loadingPending.value = true
      pendingRequests.value = []
      try {
        selectedPendingIds.value = []
        selectedCheckoutIds.value = []
        const status = activeTab.value === 'pending' ? 'Pending' : 'Pending Check-Out'
        const response = await borrowingService.getTeacherPendingRequests({ page: currentPage.value, pageSize: pageSizeRef.value, status })
        pendingRequests.value = response.requests || []
        pendingCount.value = response.pendingCount || 0
        checkoutCount.value = response.checkoutCount || 0
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
          pageSize: pageSizeRef.value,
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

    // Watch status filter and page changes
    watch([historyStatus, currentPage, activeTab], () => {
      if (activeTab.value === 'history') {
        loadHistory()
      } else {
        loadPending()
      }
    })

    watch(pageSizeRef, () => {
      if (currentPage.value !== 1) {
        currentPage.value = 1
      } else {
        if (activeTab.value === 'history') {
          loadHistory()
        } else {
          loadPending()
        }
      }
    })

    watch(() => props.pageParams?.tab, (tabValue) => {
      applyIncomingTab(tabValue)
    })

    const getStatusBadgeVariant = (status) => {
      const map = {
        'Approved': 'success',
        'Rejected': 'destructive',
        'Returned': 'info',
        'Pending': 'warning'
      }
      return map[status] || 'secondary'
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

    const { runAction } = useActionLock()

    const handleApprove = async () => {
      if (!returnDate.value) {
        alert('Please set a return date')
        return
      }
      await runAction('Approving request...', async () => {
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
      })
    }

    const handleReject = async () => {
      if (!rejectReason.value) {
        alert('Please provide a rejection reason')
        return
      }
      await runAction('Rejecting request...', async () => {
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
      })
    }

    const handleCheckout = async (req) => {
      if (req.status !== 'Pending Check-Out') {
        alert('This request must be approved first before checking out.')
        return
      }
      await runAction('Processing checkout...', async () => {
        try {
          const reqId = req.requestId || req.id || req._id
          await borrowingService.checkoutRequest(reqId)
          await loadPending()
        } catch (e) {
          console.error('Failed to checkout:', e)
          alert('Failed to checkout: ' + e.message)
        }
      })
    }

    const handleDeny = async () => {
      await runAction('Denying checkout...', async () => {
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
      })
    }

    const toggleSelectAllPending = (checked) => {
      const pageIds = pendingRequests.value.map(req => req.requestId || req.id)
      if (checked) {
        const newSet = new Set([...selectedPendingIds.value, ...pageIds])
        selectedPendingIds.value = Array.from(newSet)
      } else {
        selectedPendingIds.value = selectedPendingIds.value.filter(id => !pageIds.includes(id))
      }
    }

    const toggleSelectAllCheckout = (checked) => {
      const pageIds = pendingRequests.value.map(req => req.requestId || req.id)
      if (checked) {
        const newSet = new Set([...selectedCheckoutIds.value, ...pageIds])
        selectedCheckoutIds.value = Array.from(newSet)
      } else {
        selectedCheckoutIds.value = selectedCheckoutIds.value.filter(id => !pageIds.includes(id))
      }
    }

    const togglePendingSelection = (id, checked) => {
      if (checked) {
        if (!selectedPendingIds.value.includes(id)) selectedPendingIds.value.push(id)
      } else {
        selectedPendingIds.value = selectedPendingIds.value.filter(x => x !== id)
      }
    }

    const toggleCheckoutSelection = (id, checked) => {
      if (checked) {
        if (!selectedCheckoutIds.value.includes(id)) selectedCheckoutIds.value.push(id)
      } else {
        selectedCheckoutIds.value = selectedCheckoutIds.value.filter(x => x !== id)
      }
    }

    const handleBulkApprove = async () => {
      if (!bulkReturnDate.value) {
        alert('Please set a return date')
        return
      }
      showBulkApproveModal.value = false
      const ids = [...selectedPendingIds.value]
      const returnDatetime = `${bulkReturnDate.value}T17:00:00Z`
      await runAction('Approving requests...', async (onProgress) => {
        let done = 0
        for (const reqId of ids) {
          try {
            await borrowingService.approveRequest(reqId, returnDatetime, '', bulkApproveRemark.value)
          } catch (e) {
            console.error(`Failed to approve request ${reqId}:`, e)
          }
          done++
          onProgress(done, ids.length)
        }
        selectedPendingIds.value = []
        bulkReturnDate.value = ''
        bulkApproveRemark.value = ''
        await loadPending()
      })
    }

    const handleBulkReject = async () => {
      if (!bulkRejectReason.value) {
        alert('Please enter a rejection reason')
        return
      }
      showBulkRejectModal.value = false
      const ids = [...selectedPendingIds.value]
      await runAction('Rejecting requests...', async (onProgress) => {
        let done = 0
        for (const reqId of ids) {
          try {
            await borrowingService.rejectRequest(reqId, bulkRejectReason.value)
          } catch (e) {
            console.error(`Failed to reject request ${reqId}:`, e)
          }
          done++
          onProgress(done, ids.length)
        }
        selectedPendingIds.value = []
        bulkRejectReason.value = ''
        await loadPending()
      })
    }

    const handleBulkCheckout = async () => {
      showBulkCheckoutModal.value = false
      const ids = [...selectedCheckoutIds.value]
      await runAction('Processing checkouts...', async (onProgress) => {
        let done = 0
        for (const reqId of ids) {
          try {
            await borrowingService.checkoutRequest(reqId)
          } catch (e) {
            console.error(`Failed to checkout request ${reqId}:`, e)
          }
          done++
          onProgress(done, ids.length)
        }
        selectedCheckoutIds.value = []
        await loadPending()
      })
    }

    const handleBulkDeny = async () => {
      showBulkDenyModal.value = false
      const ids = [...selectedCheckoutIds.value]
      await runAction('Denying checkouts...', async (onProgress) => {
        let done = 0
        for (const reqId of ids) {
          try {
            await borrowingService.denyCheckout(reqId, bulkDenyReason.value || '')
          } catch (e) {
            console.error(`Failed to deny request ${reqId}:`, e)
          }
          done++
          onProgress(done, ids.length)
        }
        selectedCheckoutIds.value = []
        bulkDenyReason.value = ''
        await loadPending()
      })
    }

    onMounted(() => {
      applyIncomingTab(props.pageParams?.tab)
      loadPending()
    })

    const openEmailForRequest = (req) => {
      emailTarget.value = req
      showEmailModal.value = true
    }

    return {
      activeTab, pendingRequests, historyRequests, loadingPending, loadingHistory,
      historyStatus, currentPage, pageSize, pageSizeRef, totalHistory,
      pendingCount, checkoutCount,
      hideInternalTabs, pageTitle,
      approveTarget, returnDate, approveRemark,
      rejectTarget, rejectReason,
      denyTarget, denyReason,
      selectedPendingIds, selectedCheckoutIds, allPendingSelected, allCheckoutSelected,
      showBulkApproveModal, showBulkRejectModal, showBulkCheckoutModal, showBulkDenyModal,
      bulkReturnDate, bulkApproveRemark, bulkRejectReason, bulkDenyReason,
      showEmailModal, emailTarget,
      getStatusBadgeVariant, openApprove, openReject, openDeny,
      handleApprove, handleReject, handleCheckout, handleDeny,
      toggleSelectAllPending, toggleSelectAllCheckout,
      togglePendingSelection, toggleCheckoutSelection,
      handleBulkApprove, handleBulkReject, handleBulkCheckout, handleBulkDeny,
      loadPending, loadHistory,
      formatDate, waitingTime,
      openEmailForRequest
    }
  }
}
</script>

<style scoped>
.teacher-table-card { overflow: hidden; }

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
</style>
