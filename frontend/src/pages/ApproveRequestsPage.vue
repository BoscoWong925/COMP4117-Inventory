<template>
  <div class="page-container">
    <ModulePageHeader title="Borrow Requests" :subtitle="requestSummaryText">
      <Button variant="outline" size="sm" @click="exportRequests">
        <Download :size="14" /> Export to Excel
      </Button>
    </ModulePageHeader>

    <Card class="request-table-card">
      <div class="request-tabs">
        <button
          :class="['request-tab', { active: activeTab === 'pending' }]"
          @click="activeTab = 'pending'"
        >
          Pending
          <Badge v-if="pendingCount" variant="destructive" class="request-tab-count">{{ pendingCount }}</Badge>
        </button>
        <button
          :class="['request-tab', { active: activeTab === 'checkout' }]"
          @click="activeTab = 'checkout'"
        >
          Pending Check-Out
          <Badge v-if="checkoutCount" variant="info" class="request-tab-count">{{ checkoutCount }}</Badge>
        </button>
      </div>

      <div class="request-toolbar">
        <div class="request-toolbar-info">
          <span v-if="selectedCount > 0" class="request-selected-chip">{{ selectedCount }} selected</span>
          <span v-if="requestsLoadState.isFetching" class="request-fetch-chip">Updating...</span>
        </div>
        <div class="request-toolbar-actions">
          <template v-if="activeTab === 'pending' && selectedPendingIds.length > 0">
            <Button variant="success" size="sm" @click="showBulkApproveForm = true">
              <CheckCircle2 :size="14" /> Approve ({{ selectedPendingIds.length }})
            </Button>
            <Button variant="destructive" size="sm" @click="showBulkRejectForm = true">
              <XCircle :size="14" /> Reject ({{ selectedPendingIds.length }})
            </Button>
          </template>
          <template v-if="activeTab === 'checkout' && selectedCheckoutIds.length > 0">
            <Button size="sm" @click="showBulkCheckoutForm = true">
              <Package :size="14" /> Borrowed Out ({{ selectedCheckoutIds.length }})
            </Button>
            <Button variant="destructive" size="sm" @click="showBulkDenyForm = true">
              <XCircle :size="14" /> Deny ({{ selectedCheckoutIds.length }})
            </Button>
          </template>
        </div>
      </div>

      <div class="table-responsive">
        <table class="table-striped theme-table request-table">
          <thead v-if="activeTab === 'pending'">
            <tr>
              <th class="text-center" style="width:2.5rem">
                <Checkbox
                  :checked="isCurrentAllSelected"
                  :indeterminate="selectedCount > 0 && !isCurrentAllSelected"
                  @update:checked="toggleSelectAllCurrent"
                />
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
          <thead v-else>
            <tr>
              <th class="text-center" style="width:2.5rem">
                <Checkbox
                  :checked="isCurrentAllSelected"
                  :indeterminate="selectedCount > 0 && !isCurrentAllSelected"
                  @update:checked="toggleSelectAllCurrent"
                />
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
            <template v-if="showRequestsSkeleton">
              <tr v-for="idx in tableSkeletonRows" :key="'req-skel-' + idx" class="request-row-skeleton">
                <td class="text-center"><span class="req-skeleton-box"></span></td>
                <td><span class="req-skeleton-line req-skeleton-line-id"></span></td>
                <td><span class="req-skeleton-line req-skeleton-line-item"></span></td>
                <td><span class="req-skeleton-line req-skeleton-line-user"></span></td>
                <td><span class="req-skeleton-line req-skeleton-line-short"></span></td>
                <td><span class="req-skeleton-line req-skeleton-line-short"></span></td>
                <td><span class="req-skeleton-line req-skeleton-line-short"></span></td>
                <td><span class="req-skeleton-line req-skeleton-line-short"></span></td>
                <td class="text-center"><span class="req-skeleton-box"></span></td>
              </tr>
            </template>

            <tr v-else-if="requestsErrorMessage" class="request-empty-row">
              <td colspan="9" class="request-empty-cell">{{ requestsErrorMessage }}</td>
            </tr>

            <template v-else-if="activeTab === 'pending' && pendingGroups.length > 0">
              <template v-for="group in pendingGroups" :key="group.parent.id">
                <tr class="row-parent">
                  <td class="text-center">
                    <Checkbox
                      :checked="selectedPendingIds.includes(group.parent.id)"
                      @update:checked="togglePendingSelection(group.parent.id, $event)"
                    />
                  </td>
                  <td class="request-cell-id">{{ group.parent.id }}</td>
                  <td class="request-cell-item">
                    <span class="request-item-name">{{ group.parent.itemName }}</span>
                    <span v-if="group.children.length > 0" class="request-item-sub">+ {{ group.children.length }} component{{ group.children.length > 1 ? 's' : '' }}</span>
                  </td>
                  <td>
                    {{ group.parent.borrowerName || group.parent.borrowerID }}
                    <span v-if="overdueBorrowerIDs.has(group.parent.borrowerID)" class="request-overdue-dot" title="This borrower has overdue items"></span>
                  </td>
                  <td>{{ formatDate(group.parent.requestDate) }}</td>
                  <td><Badge variant="warning">Pending</Badge></td>
                  <td class="request-waiting-text">{{ waitingTime(group.parent.requestDate) }}</td>
                  <td class="request-cell-reason">{{ group.parent.reason || '-' }}</td>
                  <td class="text-center request-action-cell">
                    <Button variant="success" size="sm" @click="openApproveModal(group.parent.id)">
                      Approve{{ group.children.length > 0 ? ' All' : '' }}
                    </Button>
                    <DropdownMenu align="end">
                      <template #trigger>
                        <button class="request-row-menu-trigger" aria-label="Row actions">
                          <MoreVertical :size="14" />
                        </button>
                      </template>
                      <template #default="{ close }">
                        <DropdownMenuItem @click="showRejectForm = group.parent.id; close()">
                          <XCircle :size="12" /> Reject{{ group.children.length > 0 ? ' All' : '' }}
                        </DropdownMenuItem>
                        <DropdownMenuItem @click="openEmailForRequest(group.parent); close()">
                          <Mail :size="12" /> Email Borrower
                        </DropdownMenuItem>
                      </template>
                    </DropdownMenu>
                  </td>
                </tr>

                <tr v-for="child in group.children" :key="child.id" class="row-child">
                  <td></td>
                  <td class="request-child-id">↳ {{ child.id }}</td>
                  <td class="request-child-cell">{{ child.itemName }}</td>
                  <td class="request-child-cell">{{ child.borrowerName || child.borrowerID }}</td>
                  <td class="request-child-cell">{{ formatDate(child.requestDate) }}</td>
                  <td class="request-child-cell"><Badge variant="warning">Pending</Badge></td>
                  <td class="request-child-cell">{{ waitingTime(child.requestDate) }}</td>
                  <td class="request-child-cell">{{ child.reason || '-' }}</td>
                  <td class="request-child-cell text-center">Auto with parent</td>
                </tr>
              </template>
            </template>

            <template v-else-if="activeTab === 'checkout' && checkoutGroups.length > 0">
              <template v-for="group in checkoutGroups" :key="group.parent.id">
                <tr class="row-parent">
                  <td class="text-center">
                    <Checkbox
                      :checked="selectedCheckoutIds.includes(group.parent.id)"
                      @update:checked="toggleCheckoutSelection(group.parent.id, $event)"
                    />
                  </td>
                  <td class="request-cell-id">{{ group.parent.id }}</td>
                  <td class="request-cell-item">
                    <span class="request-item-name">{{ group.parent.itemName }}</span>
                    <span v-if="group.children.length > 0" class="request-item-sub">+ {{ group.children.length }} component{{ group.children.length > 1 ? 's' : '' }}</span>
                  </td>
                  <td>
                    {{ group.parent.borrowerName || group.parent.borrowerID }}
                    <span v-if="overdueBorrowerIDs.has(group.parent.borrowerID)" class="request-overdue-dot" title="This borrower has overdue items"></span>
                  </td>
                  <td>{{ formatDate(group.parent.approvalDate) }}</td>
                  <td>
                    <Badge variant="info">Pending Check-Out</Badge>
                    <span v-if="isCheckoutExpiringSoon(group.parent)" class="request-expiring-soon">expiring soon</span>
                  </td>
                  <td class="request-waiting-text">{{ waitingTime(group.parent.approvalDate) }}</td>
                  <td>{{ formatDate(group.parent.returnDate) || '-' }}</td>
                  <td class="text-center request-action-cell">
                    <Button size="sm" @click="handleCheckout(group.parent.id)">
                      Borrowed Out{{ group.children.length > 0 ? ' All' : '' }}
                    </Button>
                    <DropdownMenu align="end">
                      <template #trigger>
                        <button class="request-row-menu-trigger" aria-label="Row actions">
                          <MoreVertical :size="14" />
                        </button>
                      </template>
                      <template #default="{ close }">
                        <DropdownMenuItem @click="showDenyForm = group.parent.id; close()">
                          <XCircle :size="12" /> Deny{{ group.children.length > 0 ? ' All' : '' }}
                        </DropdownMenuItem>
                        <DropdownMenuItem @click="openEmailForRequest(group.parent); close()">
                          <Mail :size="12" /> Email Borrower
                        </DropdownMenuItem>
                      </template>
                    </DropdownMenu>
                  </td>
                </tr>

                <tr v-for="child in group.children" :key="child.id" class="row-child">
                  <td></td>
                  <td class="request-child-id">↳ {{ child.id }}</td>
                  <td class="request-child-cell">{{ child.itemName }}</td>
                  <td class="request-child-cell">{{ child.borrowerName || child.borrowerID }}</td>
                  <td class="request-child-cell">{{ formatDate(child.approvalDate) }}</td>
                  <td class="request-child-cell"><Badge variant="info">Pending Check-Out</Badge></td>
                  <td class="request-child-cell">{{ waitingTime(child.approvalDate) }}</td>
                  <td class="request-child-cell">{{ formatDate(child.returnDate) || '-' }}</td>
                  <td class="request-child-cell text-center">Auto with parent</td>
                </tr>
              </template>
            </template>

            <tr v-else class="request-empty-row">
              <td colspan="9" class="request-empty-cell">
                {{ activeTab === 'pending' ? 'No pending requests' : 'No items pending check-out' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <TablePaginationBar
        v-model:currentPage="currentPage"
        v-model:pageSize="pageSize"
        :total-items="currentTotal"
        :disabled="showRequestsSkeleton"
      />
    </Card>

    <div v-if="selectedRequest" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Approve Request</h3>
        <p v-if="competingCount > 0" class="request-modal-warning">
          Approving this request will auto-reject {{ competingCount }} other pending request(s) for the same item.
        </p>
        <div class="mb-4">
          <label class="modal-label">Return Date</label>
          <input type="date" v-model="returnDate" class="form-input" />
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
          <Button variant="success" class="flex-1" @click="handleApprove(selectedRequest)">Approve</Button>
          <Button variant="outline" class="flex-1" @click="closeApproveModal">Cancel</Button>
        </div>
      </div>
    </div>

    <div v-if="showRejectForm" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Reject Request</h3>
        <div class="mb-4">
          <label class="modal-label">Reason</label>
          <textarea v-model="rejectReason" class="form-input" rows="4" placeholder="Enter rejection reason..." />
        </div>
        <div class="flex gap-2">
          <Button variant="destructive" class="flex-1" @click="handleReject(showRejectForm)">Reject</Button>
          <Button variant="outline" class="flex-1" @click="showRejectForm = null; rejectReason = ''">Cancel</Button>
        </div>
      </div>
    </div>

    <div v-if="showDenyForm" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Deny Check-Out</h3>
        <p class="text-sm text-secondary mb-3">
          This will reject the approved request and make the item available again.
        </p>
        <div class="mb-4">
          <label class="modal-label">Reason</label>
          <textarea v-model="denyReason" class="form-input" rows="4" placeholder="Enter reason for denying check-out..." />
        </div>
        <div class="flex gap-2">
          <Button variant="destructive" class="flex-1" @click="handleDeny(showDenyForm)">Deny</Button>
          <Button variant="outline" class="flex-1" @click="showDenyForm = null; denyReason = ''">Cancel</Button>
        </div>
      </div>
    </div>

    <div v-if="showBulkApproveForm" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Approve {{ selectedPendingIds.length }} Request(s)</h3>
        <div class="mb-4">
          <label class="modal-label">Return Date</label>
          <input type="date" v-model="bulkReturnDate" class="form-input" />
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
          <Button variant="success" class="flex-1" @click="handleBulkApprove">Approve All</Button>
          <Button variant="outline" class="flex-1" @click="showBulkApproveForm = false; bulkReturnDate = ''; bulkApproveRemark = ''; bulkApproveLocation = locationOptions[0]">Cancel</Button>
        </div>
      </div>
    </div>

    <div v-if="showBulkRejectForm" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Reject {{ selectedPendingIds.length }} Request(s)</h3>
        <div class="mb-4">
          <label class="modal-label">Reason</label>
          <textarea v-model="bulkRejectReason" class="form-input" rows="4" placeholder="Enter rejection reason..." />
        </div>
        <div class="flex gap-2">
          <Button variant="destructive" class="flex-1" @click="handleBulkReject">Reject All</Button>
          <Button variant="outline" class="flex-1" @click="showBulkRejectForm = false; bulkRejectReason = ''">Cancel</Button>
        </div>
      </div>
    </div>

    <div v-if="showBulkCheckoutForm" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Mark {{ selectedCheckoutIds.length }} Item(s) as Borrowed Out</h3>
        <p class="text-sm text-secondary mb-4">This will mark all selected approved requests as checked out.</p>
        <div class="flex gap-2">
          <Button class="flex-1" @click="handleBulkCheckout">Borrowed Out All</Button>
          <Button variant="outline" class="flex-1" @click="showBulkCheckoutForm = false">Cancel</Button>
        </div>
      </div>
    </div>

    <div v-if="showBulkDenyForm" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Deny {{ selectedCheckoutIds.length }} Check-Out(s)</h3>
        <p class="text-sm text-secondary mb-3">This will reject the approved requests and make the items available again.</p>
        <div class="mb-4">
          <label class="modal-label">Reason</label>
          <textarea v-model="bulkDenyReason" class="form-input" rows="4" placeholder="Enter reason for denying check-out..." />
        </div>
        <div class="flex gap-2">
          <Button variant="destructive" class="flex-1" @click="handleBulkDeny">Deny All</Button>
          <Button variant="outline" class="flex-1" @click="showBulkDenyForm = false; bulkDenyReason = ''">Cancel</Button>
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
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { Download, MoreVertical, Mail, CheckCircle2, XCircle, Package } from 'lucide-vue-next'
import { inventoryService, borrowingService } from '../utils/services'
import { formatDate, exportToExcel, waitingTime, isOverdue } from '../utils/helpers'
import DropdownWithOther from '../components/DropdownWithOther.vue'
import RemarkBox from '../components/RemarkBox.vue'
import SendEmailModal from '../components/SendEmailModal.vue'
import {
  UiButton as Button,
  UiCard as Card,
  UiBadge as Badge,
  UiCheckbox as Checkbox,
  UiDropdownMenu as DropdownMenu,
  UiDropdownMenuItem as DropdownMenuItem,
  UiModulePageHeader as ModulePageHeader,
  UiTablePaginationBar as TablePaginationBar
} from '../components/ui'

export default {
  components: {
    Button, Card, Badge, Checkbox, DropdownMenu, DropdownMenuItem,
    ModulePageHeader, TablePaginationBar,
    DropdownWithOther, RemarkBox, SendEmailModal,
    Download, MoreVertical, Mail, CheckCircle2, XCircle, Package
  },
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
    const pageSize = ref(10)
    const activeTab = ref('pending')
    const competingCount = ref(0)
    const locationOptions = ref(['Lab A', 'Lab B', 'Lab C', 'Office', 'Storage Room', 'Shelf 1', 'Shelf 2', 'Other'])
    const approveLocation = ref('Lab A')
    const approveRemark = ref('')

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

    const pendingCount = ref(0)
    const checkoutCount = ref(0)

    const requestsLoadState = reactive({
      isInitialLoading: true,
      isFetching: false,
      isLoaded: false,
      error: null
    })

    let latestRequestsRequestId = 0

    const overdueBorrowerIDs = computed(() => {
      const ids = new Set()
      allApprovedRequests.value.forEach((request) => {
        if (isOverdue(request.returnDate) && request.borrowerID) ids.add(request.borrowerID)
      })
      return ids
    })

    const buildGroups = (reqs) => {
      const parents = reqs.filter(r => !r.parentRequestId)
      const groups = []
      parents.forEach((parent) => {
        const children = reqs.filter(r => r.parentRequestId === parent.id)
        groups.push({ parent, children })
      })

      reqs
        .filter(r => r.parentRequestId && !parents.find(p => p.id === r.parentRequestId))
        .forEach((orphan) => groups.push({ parent: orphan, children: [] }))

      return groups
    }

    const pendingGroups = computed(() => buildGroups(requests.value.filter(r => r.status === 'Pending')))
    const checkoutGroups = computed(() => buildGroups(requests.value.filter(r => r.status === 'Pending Check-Out')))

    const currentGroups = computed(() => activeTab.value === 'pending' ? pendingGroups.value : checkoutGroups.value)
    const currentTotal = computed(() => activeTab.value === 'pending' ? pendingCount.value : checkoutCount.value)

    const selectedCount = computed(() =>
      activeTab.value === 'pending' ? selectedPendingIds.value.length : selectedCheckoutIds.value.length
    )

    const isCurrentAllSelected = computed(() => {
      if (currentGroups.value.length === 0) return false
      if (activeTab.value === 'pending') {
        return currentGroups.value.every(group => selectedPendingIds.value.includes(group.parent.id))
      }
      return currentGroups.value.every(group => selectedCheckoutIds.value.includes(group.parent.id))
    })

    const requestSummaryText = computed(() => {
      if (requestsLoadState.isInitialLoading && !requestsLoadState.isLoaded) return 'Loading request queue...'
      if (requestsLoadState.error && !requestsLoadState.isLoaded) return 'Unable to load request queue'
      return `${pendingCount.value + checkoutCount.value} request record(s)`
    })

    const showRequestsSkeleton = computed(() => requestsLoadState.isFetching)
    const tableSkeletonRows = computed(() => Math.min(Math.max(pageSize.value, 5), 10))
    const requestsErrorMessage = computed(() => requestsLoadState.error || '')

    const clearCurrentSelection = () => {
      if (activeTab.value === 'pending') selectedPendingIds.value = []
      else selectedCheckoutIds.value = []
    }

    const toggleSelectAllPending = (checked) => {
      const pageIds = pendingGroups.value.map(group => group.parent.id)
      if (checked) {
        const next = new Set([...selectedPendingIds.value, ...pageIds])
        selectedPendingIds.value = Array.from(next)
      } else {
        selectedPendingIds.value = selectedPendingIds.value.filter(id => !pageIds.includes(id))
      }
    }

    const toggleSelectAllCheckout = (checked) => {
      const pageIds = checkoutGroups.value.map(group => group.parent.id)
      if (checked) {
        const next = new Set([...selectedCheckoutIds.value, ...pageIds])
        selectedCheckoutIds.value = Array.from(next)
      } else {
        selectedCheckoutIds.value = selectedCheckoutIds.value.filter(id => !pageIds.includes(id))
      }
    }

    const toggleSelectAllCurrent = (checked) => {
      if (activeTab.value === 'pending') toggleSelectAllPending(checked)
      else toggleSelectAllCheckout(checked)
    }

    const togglePendingSelection = (requestId, checked) => {
      if (checked) {
        if (!selectedPendingIds.value.includes(requestId)) selectedPendingIds.value.push(requestId)
      } else {
        selectedPendingIds.value = selectedPendingIds.value.filter(id => id !== requestId)
      }
    }

    const toggleCheckoutSelection = (requestId, checked) => {
      if (checked) {
        if (!selectedCheckoutIds.value.includes(requestId)) selectedCheckoutIds.value.push(requestId)
      } else {
        selectedCheckoutIds.value = selectedCheckoutIds.value.filter(id => id !== requestId)
      }
    }

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

    const openApproveModal = (requestId) => {
      selectedRequest.value = requestId
      competingCount.value = countCompetingRequests(requestId)
    }

    const closeApproveModal = () => {
      selectedRequest.value = null
      returnDate.value = ''
      approveRemark.value = ''
      approveLocation.value = locationOptions.value[0]
      competingCount.value = 0
    }

    const loadPendingRequests = async () => {
      const requestId = ++latestRequestsRequestId
      requestsLoadState.isFetching = true
      requestsLoadState.error = null
      if (!requestsLoadState.isLoaded) requestsLoadState.isInitialLoading = true

      try {
        try {
          await borrowingService.autoExpirePendingCheckouts()
        } catch (error) {
          console.error('Auto-expire pending check-outs failed:', error)
        }

        const status = activeTab.value === 'pending' ? 'Pending' : 'Pending Check-Out'
        const data = await borrowingService.getPendingRequests({ page: currentPage.value, pageSize: pageSize.value, status })
        if (requestId !== latestRequestsRequestId) return

        requests.value = data.requests || []
        pendingCount.value = data.pendingCount || 0
        checkoutCount.value = data.checkoutCount || 0

        const approvedData = await borrowingService.getAllRequests({ status: 'Approved', pageSize: 5000 })
        if (requestId !== latestRequestsRequestId) return

        allApprovedRequests.value = approvedData.requests || []
        requestsLoadState.isLoaded = true
      } catch (error) {
        if (requestId !== latestRequestsRequestId) return
        console.error('Failed to load pending requests:', error)
        requestsLoadState.error = error?.message || 'Failed to load requests'
        if (!requestsLoadState.isLoaded) {
          requests.value = []
          pendingCount.value = 0
          checkoutCount.value = 0
        }
      } finally {
        if (requestId !== latestRequestsRequestId) return
        requestsLoadState.isFetching = false
        requestsLoadState.isInitialLoading = false
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
      } catch (error) {
        console.error('Failed to approve request:', error)
        alert('Failed to approve: ' + error.message)
      }

      closeApproveModal()
      loadPendingRequests()
    }

    const handleReject = async (requestId) => {
      if (!rejectReason.value) {
        alert('Please provide a rejection reason')
        return
      }
      try {
        await borrowingService.rejectRequest(requestId, rejectReason.value)
      } catch (error) {
        console.error('Failed to reject request:', error)
      }
      showRejectForm.value = null
      rejectReason.value = ''
      loadPendingRequests()
    }

    const handleCheckout = async (requestId) => {
      try {
        await borrowingService.checkoutRequest(requestId)
      } catch (error) {
        console.error('Failed to checkout request:', error)
        alert('Failed to checkout: ' + error.message)
      }
      loadPendingRequests()
    }

    const handleDeny = async (requestId) => {
      try {
        await borrowingService.denyCheckout(requestId, denyReason.value || '')
      } catch (error) {
        console.error('Failed to deny checkout:', error)
        alert('Failed to deny: ' + error.message)
      }
      showDenyForm.value = null
      denyReason.value = ''
      loadPendingRequests()
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
          } catch (error) {
            console.error(`Failed to approve request ${requestId}:`, error)
          }
        }

        selectedPendingIds.value = []
        showBulkApproveForm.value = false
        bulkReturnDate.value = ''
        bulkApproveRemark.value = ''
        bulkApproveLocation.value = locationOptions.value[0]
        loadPendingRequests()
      } catch (error) {
        console.error('Failed to bulk approve:', error)
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
          } catch (error) {
            console.error(`Failed to reject request ${requestId}:`, error)
          }
        }

        selectedPendingIds.value = []
        showBulkRejectForm.value = false
        bulkRejectReason.value = ''
        loadPendingRequests()
      } catch (error) {
        console.error('Failed to bulk reject:', error)
      }
    }

    const handleBulkCheckout = async () => {
      try {
        for (const requestId of selectedCheckoutIds.value) {
          try {
            await borrowingService.checkoutRequest(requestId)
          } catch (error) {
            console.error(`Failed to checkout request ${requestId}:`, error)
          }
        }
        selectedCheckoutIds.value = []
        showBulkCheckoutForm.value = false
        loadPendingRequests()
      } catch (error) {
        console.error('Failed to bulk checkout:', error)
      }
    }

    const handleBulkDeny = async () => {
      try {
        for (const requestId of selectedCheckoutIds.value) {
          try {
            await borrowingService.denyCheckout(requestId, bulkDenyReason.value || '')
          } catch (error) {
            console.error(`Failed to deny checkout ${requestId}:`, error)
          }
        }
        selectedCheckoutIds.value = []
        showBulkDenyForm.value = false
        bulkDenyReason.value = ''
        loadPendingRequests()
      } catch (error) {
        console.error('Failed to bulk deny:', error)
      }
    }

    const exportRequests = () => {
      exportToExcel(requests.value, 'borrow_requests.xlsx')
    }

    const openEmailForRequest = (req) => {
      emailTarget.value = req
      showEmailModal.value = true
    }

    watch([activeTab, pageSize], async () => {
      clearCurrentSelection()
      if (currentPage.value !== 1) {
        currentPage.value = 1
        return
      }
      await loadPendingRequests()
    })

    watch(currentPage, async () => {
      clearCurrentSelection()
      await loadPendingRequests()
    })

    onMounted(() => {
      loadPendingRequests()
    })

    return {
      activeTab,
      currentPage,
      pageSize,
      pendingCount,
      checkoutCount,
      pendingGroups,
      checkoutGroups,
      requestsLoadState,
      showRequestsSkeleton,
      tableSkeletonRows,
      requestsErrorMessage,
      requestSummaryText,
      currentTotal,
      selectedCount,
      isCurrentAllSelected,
      selectedPendingIds,
      selectedCheckoutIds,
      selectedRequest,
      returnDate,
      rejectReason,
      showRejectForm,
      showDenyForm,
      denyReason,
      competingCount,
      locationOptions,
      approveLocation,
      approveRemark,
      showBulkApproveForm,
      showBulkRejectForm,
      showBulkCheckoutForm,
      showBulkDenyForm,
      bulkReturnDate,
      bulkApproveLocation,
      bulkApproveRemark,
      bulkRejectReason,
      bulkDenyReason,
      overdueBorrowerIDs,
      showEmailModal,
      emailTarget,
      toggleSelectAllCurrent,
      togglePendingSelection,
      toggleCheckoutSelection,
      addLocation,
      openApproveModal,
      closeApproveModal,
      handleApprove,
      handleReject,
      handleCheckout,
      handleDeny,
      handleBulkApprove,
      handleBulkReject,
      handleBulkCheckout,
      handleBulkDeny,
      openEmailForRequest,
      exportRequests,
      isCheckoutExpiringSoon,
      formatDate,
      waitingTime,
    }
  }
}
</script>

<style scoped>
.request-table-card {
  padding: 0;
  overflow: hidden;
}

.request-tabs {
  display: flex;
  gap: 0.125rem;
  border-bottom: 1px solid var(--border);
  padding: 0.75rem 1rem 0;
  overflow-x: auto;
}

.request-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted-foreground);
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.12s, border-color 0.12s;
}

.request-tab:hover {
  color: var(--text-secondary);
}

.request-tab.active {
  color: var(--text-primary);
  border-bottom-color: var(--accent);
}

.request-tab-count {
  min-width: 1.1rem;
  text-align: center;
}

.request-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
  min-height: 2.5rem;
  padding: 0.625rem 1rem;
  border-bottom: 1px solid var(--border);
}

.request-toolbar-info,
.request-toolbar-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.request-selected-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-surface);
  border-radius: 999px;
}

.request-fetch-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--muted-foreground);
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-50);
}

.request-table {
  margin-bottom: 0;
}

.request-cell-id {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.request-cell-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
}

.request-item-name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.request-item-sub {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
}

.request-waiting-text {
  color: var(--warning-dark);
  font-weight: 600;
}

.request-cell-reason {
  max-width: 16rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.request-overdue-dot {
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  margin-left: 0.375rem;
  border-radius: 50%;
  background: var(--danger);
  animation: requestPulse 1.6s ease-in-out infinite;
}

@keyframes requestPulse {
  0%, 100% { opacity: 0.95; }
  50% { opacity: 0.35; }
}

.request-expiring-soon {
  display: inline-block;
  margin-left: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--danger);
}

.request-action-cell {
  white-space: nowrap;
}

.request-row-menu-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  margin-left: 0.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--card);
  color: var(--muted-foreground);
  cursor: pointer;
  transition: all 0.12s;
}

.request-row-menu-trigger:hover {
  background: var(--surface-100);
  color: var(--text-primary);
}

.request-row-skeleton td {
  pointer-events: none;
}

.req-skeleton-line,
.req-skeleton-box {
  display: inline-block;
  background: var(--surface-100);
  border-radius: var(--radius-sm);
  animation: requestSkeletonPulse 2.2s ease-in-out infinite;
}

.req-skeleton-line {
  height: 0.625rem;
}

.req-skeleton-box {
  width: 0.875rem;
  height: 0.875rem;
}

.req-skeleton-line-id { width: 4rem; }
.req-skeleton-line-item { width: 9rem; max-width: 100%; }
.req-skeleton-line-user { width: 7rem; max-width: 100%; }
.req-skeleton-line-short { width: 5rem; max-width: 100%; }

@keyframes requestSkeletonPulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 0.95; }
}

.request-empty-row td {
  text-align: center;
}

.request-empty-cell {
  padding: 2rem 1rem;
  color: var(--muted-foreground);
  font-size: 0.875rem;
}

.row-parent td {
  font-size: 0.8125rem;
}

.row-child td {
  color: var(--muted-foreground);
  font-size: 0.75rem;
}

.request-child-id {
  padding-left: 1.5rem;
}

.request-child-cell {
  font-style: italic;
}

.request-modal-warning {
  margin-bottom: 0.75rem;
  padding: 0.5rem 0.625rem;
  border-radius: var(--radius-sm);
  background: var(--danger-light);
  color: var(--danger-dark);
  font-size: 0.75rem;
  font-weight: 600;
}
</style>
