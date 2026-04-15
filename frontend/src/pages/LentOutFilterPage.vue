<template>
  <div class="page-container">
    <ModulePageHeader title="Checked Out Items" :subtitle="checkedOutSummaryText">
      <Button variant="outline" size="sm" @click="showFilterPanel = !showFilterPanel">
        {{ showFilterPanel ? 'Hide Filters' : 'Show Filters' }}
      </Button>
      <Button size="sm" @click="exportFiltered">Export to Excel</Button>
    </ModulePageHeader>

    <Card v-if="activeStatusFilter" class="checked-banner">
      <span class="checked-banner-text">
        Showing:
        <span :class="activeStatusFilter === 'overdue' ? 'checked-banner-overdue' : 'checked-banner-soon'">
          {{ activeStatusFilter === 'overdue' ? 'Overdue returns' : 'Due within 7 days' }}
        </span>
      </span>
      <Button variant="ghost" size="sm" @click="activeStatusFilter = ''">Clear filter</Button>
    </Card>

    <ModuleFilterPanel v-if="showFilterPanel" @clear="clearAllFilters">
      <div class="checked-filter-grid">
        <div>
          <label class="filter-label">Item ID</label>
          <Input v-model="searchFilters.id" type="text" placeholder="e.g. INV-001" />
        </div>
        <div>
          <label class="filter-label">Name</label>
          <Input v-model="searchFilters.name" type="text" placeholder="Search name..." />
        </div>
        <div>
          <label class="filter-label">Category</label>
          <Select v-model="searchFilters.category">
            <option value="">All Categories</option>
            <option v-for="c in uniqueCategories" :key="c" :value="c">{{ c }}</option>
          </Select>
        </div>
        <div>
          <label class="filter-label">Vendor</label>
          <Select v-model="searchFilters.vendor">
            <option value="">All Vendors</option>
            <option v-for="v in vendors" :key="v" :value="v">{{ v }}</option>
          </Select>
        </div>
        <div>
          <label class="filter-label">Location</label>
          <Select v-model="searchFilters.location">
            <option value="">All Locations</option>
            <option v-for="l in uniqueLocations" :key="l" :value="l">{{ l }}</option>
          </Select>
        </div>
        <div>
          <label class="filter-label">Type</label>
          <Select v-model="searchFilters.type">
            <option value="">All Types</option>
            <option value="Component">Component</option>
            <option value="Hardware">Hardware</option>
            <option value="Software">Software</option>
          </Select>
        </div>
        <div>
          <label class="filter-label">Borrower ID</label>
          <Input v-model="searchFilters.borrowerId" type="text" placeholder="e.g. S00123456" />
        </div>
        <div>
          <label class="filter-label">Borrower Name</label>
          <Input v-model="searchFilters.borrowerName" type="text" placeholder="Search borrower..." />
        </div>
        <div>
          <label class="filter-label">Year</label>
          <Select v-model="searchFilters.year">
            <option value="">All Years</option>
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </Select>
        </div>
      </div>
    </ModuleFilterPanel>

    <Card class="checked-table-card">
      <div class="return-sub-tabs">
        <button class="return-sub-tab" :class="{ active: returnViewTab === 'department' }" @click="returnViewTab = 'department'; selectedReturnIds = []">
          Department Items
        </button>
        <button class="return-sub-tab" :class="{ active: returnViewTab === 'teacher' }" @click="returnViewTab = 'teacher'; selectedReturnIds = []">
          Teacher Items
        </button>
      </div>
      <Transition name="bulk-bar">
        <div v-if="selectedReturnIds.length > 0" class="bulk-toolbar">
          <div class="bulk-toolbar-left">
            <span class="bulk-chip">{{ selectedReturnIds.length }} selected</span>
            <DropdownMenu align="start">
              <template #trigger>
                <button class="toolbar-btn">
                  <Zap :size="12" /> Actions <ChevronDown :size="10" />
                </button>
              </template>
              <template #default="{ close }">
                <DropdownMenuItem success @click="showBulkReturnModal = true; close()">
                  <RotateCcw :size="12" /> Return Bulk ({{ selectedReturnIds.length }})
                </DropdownMenuItem>
              </template>
            </DropdownMenu>
            <button class="bulk-clear-btn" @click="selectedReturnIds = []">Clear</button>
          </div>
        </div>
      </Transition>
      <div class="table-responsive">
        <table class="table-striped theme-table">
          <thead>
            <tr>
              <th class="text-center" style="width:3rem">
                <Checkbox
                  :checked="allReturnSelected"
                  :indeterminate="selectedReturnIds.length > 0 && !allReturnSelected"
                  @update:checked="toggleSelectAllReturn"
                />
              </th>
              <th>ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Borrower ID</th>
              <th>Borrower Name</th>
              <th>Vendor</th>
              <th>Location</th>
              <th class="sortable-th" @click="toggleReturnDateSort" style="cursor:pointer;user-select:none;">
                Return Date
                <span v-if="returnDateSortDir === 'asc'" class="sort-arrow">▲</span>
                <span v-else class="sort-arrow">▼</span>
              </th>
              <th>Due / Status</th>
              <th class="text-center">Return</th>
            </tr>
          </thead>

          <tbody>
            <template v-if="showLentSkeleton">
              <tr>
                <td colspan="11" class="table-spinner-cell">
                  <Spinner size="lg" label="Loading items..." />
                </td>
              </tr>
            </template>

            <tr v-else-if="lentErrorMessage" class="checked-empty-row">
              <td colspan="11" class="checked-empty-cell">{{ lentErrorMessage }}</td>
            </tr>

            <tr v-else-if="groupedItems.length === 0" class="checked-empty-row">
              <td colspan="11" class="checked-empty-cell">No checked-out items match your filters</td>
            </tr>

            <!-- Department-owned items -->
            <template v-else-if="returnViewTab === 'department'">
            <template v-for="group in paginatedGroups" :key="group.parent.id">
              <tr class="row-parent">
                <td class="text-center">
                  <Checkbox
                    :checked="selectedReturnIds.includes(group.parent.id)"
                    @update:checked="toggleReturnItem(group.parent.id, $event)"
                  />
                </td>
                <td class="checked-parent-id">{{ group.parent.id }}</td>
                <td class="checked-parent-name">
                  {{ group.parent.name }}
                  <span v-if="group.children.length > 0" class="checked-child-count">
                    (+ {{ group.children.length }} component{{ group.children.length > 1 ? 's' : '' }})
                  </span>
                </td>
                <td>{{ group.parent.category }}</td>
                <td>{{ group.parent.currentBorrower }}</td>
                <td>{{ getBorrowerName(group.parent.currentBorrower, group.parent) }}</td>
                <td>{{ group.parent.supplier }}</td>
                <td>{{ group.parent.location }}</td>
                <td>{{ formatDate(getReturnMeta(group.parent).returnDate) || '-' }}</td>
                <td><span class="due-badge" :class="getReturnMeta(group.parent).dueClass">{{ getReturnMeta(group.parent).dueLabel }}</span></td>
                <td class="text-center">
                  <DropdownMenu align="end">
                    <template #trigger>
                      <button class="kebab-trigger" aria-label="Row actions">
                        <MoreVertical :size="14" />
                      </button>
                    </template>
                    <template #default="{ close }">
                      <DropdownMenuItem v-if="canReturnItem(group.parent)" success @click="handleReturnItem(group.parent); close()">
                        <RotateCcw :size="12" /> Return{{ group.children.length > 0 ? ' All' : '' }}
                      </DropdownMenuItem>
                      <DropdownMenuItem v-if="!canReturnItem(group.parent)" disabled>
                        <RotateCcw :size="12" /> No permission for this owner
                      </DropdownMenuItem>
                      <DropdownMenuItem v-if="group.parent.currentBorrower" @click="openEmailForBorrower(group.parent); close()">
                        <Mail :size="12" /> Email Borrower
                      </DropdownMenuItem>
                    </template>
                  </DropdownMenu>
                </td>
              </tr>

              <tr v-for="child in group.children" :key="child.id" class="row-child">
                <td></td>
                <td class="checked-child-id">↳ {{ child.id }}</td>
                <td class="checked-child-name">{{ child.name }}</td>
                <td>{{ child.category }}</td>
                <td>{{ child.currentBorrower }}</td>
                <td>{{ getBorrowerName(child.currentBorrower, child) }}</td>
                <td>{{ child.supplier }}</td>
                <td>{{ child.location }}</td>
                <td>{{ formatDate(getReturnMeta(child).returnDate) || '-' }}</td>
                <td><span class="due-badge" :class="getReturnMeta(child).dueClass">{{ getReturnMeta(child).dueLabel }}</span></td>
                <td class="checked-child-return">Auto with parent</td>
              </tr>
            </template>
            </template>

            <!-- Teacher-owned items (view-only for operators) -->
            <template v-else>
            <template v-for="group in paginatedGroups" :key="'t-' + group.parent.id">
              <tr class="row-parent row-teacher-owned">
                <td class="text-center">
                  <Checkbox
                    v-if="canReturnItem(group.parent)"
                    :checked="selectedReturnIds.includes(group.parent.id)"
                    @update:checked="toggleReturnItem(group.parent.id, $event)"
                  />
                </td>
                <td class="checked-parent-id">{{ group.parent.id }}</td>
                <td class="checked-parent-name">
                  {{ group.parent.name }}
                  <span v-if="group.children.length > 0" class="checked-child-count">
                    (+ {{ group.children.length }} component{{ group.children.length > 1 ? 's' : '' }})
                  </span>
                  <span class="teacher-owner-tag">Owner: {{ getOwnerDisplayName(group.parent.owner) }}</span>
                </td>
                <td>{{ group.parent.category }}</td>
                <td>{{ group.parent.currentBorrower }}</td>
                <td>{{ getBorrowerName(group.parent.currentBorrower, group.parent) }}</td>
                <td>{{ group.parent.supplier }}</td>
                <td>{{ group.parent.location }}</td>
                <td>{{ formatDate(getReturnMeta(group.parent).returnDate) || '-' }}</td>
                <td><span class="due-badge" :class="getReturnMeta(group.parent).dueClass">{{ getReturnMeta(group.parent).dueLabel }}</span></td>
                <td class="text-center">
                  <DropdownMenu align="end">
                    <template #trigger>
                      <button class="kebab-trigger" aria-label="Row actions">
                        <MoreVertical :size="14" />
                      </button>
                    </template>
                    <template #default="{ close }">
                      <DropdownMenuItem v-if="canReturnItem(group.parent)" success @click="handleReturnItem(group.parent); close()">
                        <RotateCcw :size="12" /> Return{{ group.children.length > 0 ? ' All' : '' }}
                      </DropdownMenuItem>
                      <DropdownMenuItem v-else disabled>
                        <RotateCcw :size="12" /> View only (teacher-owned)
                      </DropdownMenuItem>
                      <DropdownMenuItem v-if="group.parent.currentBorrower" @click="openEmailForBorrower(group.parent); close()">
                        <Mail :size="12" /> Email Borrower
                      </DropdownMenuItem>
                    </template>
                  </DropdownMenu>
                </td>
              </tr>

              <tr v-for="child in group.children" :key="child.id" class="row-child row-teacher-owned">
                <td></td>
                <td class="checked-child-id">↳ {{ child.id }}</td>
                <td class="checked-child-name">{{ child.name }}</td>
                <td>{{ child.category }}</td>
                <td>{{ child.currentBorrower }}</td>
                <td>{{ getBorrowerName(child.currentBorrower, child) }}</td>
                <td>{{ child.supplier }}</td>
                <td>{{ child.location }}</td>
                <td>{{ formatDate(getReturnMeta(child).returnDate) || '-' }}</td>
                <td><span class="due-badge" :class="getReturnMeta(child).dueClass">{{ getReturnMeta(child).dueLabel }}</span></td>
                <td class="checked-child-return">Auto with parent</td>
              </tr>
            </template>
            </template>
          </tbody>
        </table>
      </div>

      <TablePaginationBar
        v-model:currentPage="currentPage"
        v-model:pageSize="pageSize"
        :total-items="totalItems"
        :page-size-options="[20, 50, 100]"
        :disabled="showLentSkeleton"
      />
    </Card>

    <!-- Bulk Return Modal -->
    <div v-if="showBulkReturnModal" class="modal-overlay">
      <div class="modal-card" style="width:400px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <svg class="w-6 h-6" style="color:var(--accent)" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span style="font-size:16px;font-weight:700;">Confirm Bulk Return</span>
        </div>
        <p class="text-muted" style="font-size:13px;margin-bottom:16px;">
          You are about to return <strong>{{ selectedReturnIds.length }}</strong> item{{ selectedReturnIds.length !== 1 ? 's' : '' }}. This action will mark them as returned.
        </p>
        <div style="margin-bottom:14px;">
          <label class="form-label">Return Condition</label>
          <Select v-model="bulkReturnCondition" style="width:100%;">
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Damaged">Damaged</option>
          </Select>
        </div>
        <div style="margin-bottom:14px;">
          <label class="form-label">Notes (Optional)</label>
          <Textarea v-model="bulkReturnNotes" style="width:100%;height:80px;" placeholder="Add any notes about the returns..." />
        </div>
        <div style="display:flex;gap:8px;">
          <Button variant="success" class="flex-1" @click="handleBulkReturn">Confirm Return</Button>
          <Button variant="outline" class="flex-1" @click="showBulkReturnModal = false">Cancel</Button>
        </div>
      </div>
    </div>

    <!-- Update Location Popup -->
    <div v-if="showLocationCard && returnedItem" class="modal-overlay">
      <div class="modal-card" style="width:340px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <svg class="w-6 h-6" style="color:var(--accent)" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <span style="font-size:16px;font-weight:700;">Update Location</span>
        </div>
        <p class="text-muted" style="font-size:13px;margin-bottom:16px;">"{{ returnedItem.name }}" has been returned.<br/>Where should it be placed?</p>
        <div style="margin-bottom:14px;">
          <label class="form-label">Location</label>
          <Select v-model="newLocation" style="width:100%;">
            <option v-for="loc in locationOptions" :key="loc" :value="loc">{{ loc }}</option>
          </Select>
        </div>
        <div v-if="newLocation === 'Other'" style="margin-bottom:14px;">
          <label class="form-label">Enter new location</label>
          <Input v-model="otherLocation" type="text" style="width:100%;" placeholder="Type location name..." @keyup.enter="saveLocation" />
        </div>
        <div style="display:flex;gap:8px;">
          <Button variant="success" class="flex-1" @click="saveLocation">Save</Button>
          <Button variant="outline" class="flex-1" @click="showLocationCard = false; returnedItem = null">Skip</Button>
        </div>
      </div>
    </div>
    <!-- Send Email Modal -->
    <SendEmailModal
      :visible="showEmailModal"
      :recipientId="emailTarget?.currentBorrower"
      :recipientName="emailTarget?.currentBorrowerName || emailTarget?.currentBorrower"
      :defaultSubject="emailTarget ? `Regarding item ${emailTarget.id} - ${emailTarget.name}` : ''"
      @close="showEmailModal = false"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { inventoryService, borrowingService, authService } from '../utils/services'
import { exportToExcel, getUniqueVendors, formatDate } from '../utils/helpers'
import { useActionLock } from '../hooks/useActionLock'
import { MoreVertical, Zap, ChevronDown, Mail, RotateCcw } from 'lucide-vue-next'
import SendEmailModal from '../components/SendEmailModal.vue'
import {
  UiButton as Button,
  UiCard as Card,
  UiCheckbox as Checkbox,
  UiDropdownMenu as DropdownMenu,
  UiDropdownMenuItem as DropdownMenuItem,
  UiInput as Input,
  UiModuleFilterPanel as ModuleFilterPanel,
  UiModulePageHeader as ModulePageHeader,
  UiSelect as Select,
  UiTextarea as Textarea,
  UiTablePaginationBar as TablePaginationBar,
  UiSpinner as Spinner,
} from '../components/ui'

export default {
  components: {
    Button,
    Card,
    Checkbox,
    ChevronDown,
    DropdownMenu,
    DropdownMenuItem,
    Input,
    Mail,
    ModuleFilterPanel,
    ModulePageHeader,
    MoreVertical,
    RotateCcw,
    Select,
    SendEmailModal,
    Spinner,
    Textarea,
    TablePaginationBar,
    Zap,
  },
  props: {
    pageParams: { type: Object, default: () => ({}) }
  },
  setup(props) {
    const { runAction } = useActionLock()
    const currentUser = authService.getCurrentUser()
    const items = ref([])
    const allRequests = ref([])
    const vendorFilter = ref('')
    const yearFilter = ref('')
    const vendors = ref([])
    const years = ref([])
    const currentPage = ref(1)
    const totalItems = ref(0)
    const pageSize = ref(50)
    const isLentLoaded = ref(false)
    const isLentInitialLoading = ref(false)
    const isLentFetching = ref(false)
    const lentErrorMessage = ref('')
    const showLocationCard = ref(false)
    const returnedItem = ref(null)
    const newLocation = ref('')
    const otherLocation = ref('')
    const typeFilter = ref('')
    const sortField = ref('updatedAt')
    const sortDir = ref('desc')
    // Note: sorting UI removed; sortField/sortDir kept for API default ordering
    const returnDateSortDir = ref('asc') // asc = soonest/overdue first, desc = latest first
    const showFilterPanel = ref(false)
    const activeStatusFilter = ref('')
    const selectedReturnIds = ref([])
    const showBulkReturnModal = ref(false)
    const bulkReturnCondition = ref('Good')
    const bulkReturnNotes = ref('')
    let searchDebounceTimer = null
    let loadRequestToken = 0
    const returnViewTab = ref('department')

    const searchFilters = ref({
      id: '', name: '', category: '', vendor: '', location: '',
      type: '', borrowerId: '', borrowerName: '',
      year: ''
    })

    const uniqueCategories = computed(() => {
      return [...new Set(items.value.map(i => i.category).filter(Boolean))].sort()
    })

    const uniqueLocations = computed(() => {
      return [...new Set(items.value.map(i => i.location).filter(Boolean))].sort()
    })

    const allReturnSelected = computed(() => {
      const returnableGroups = paginatedGroups.value.filter(g => canReturnItem(g.parent))
      return returnableGroups.length > 0 && returnableGroups.every(g => selectedReturnIds.value.includes(g.parent.id))
    })

    const checkedOutSummaryText = computed(() => {
      if (!isLentLoaded.value && isLentInitialLoading.value) {
        return 'Loading checked-out items...'
      }
      if (totalItems.value === 0) {
        return 'No checked-out items'
      }
      return `${totalItems.value} checked-out item${totalItems.value === 1 ? '' : 's'}`
    })

    const showLentSkeleton = computed(() => {
      return !isLentLoaded.value || isLentInitialLoading.value || isLentFetching.value
    })

    const lentSkeletonRows = computed(() => {
      const rows = Number(pageSize.value) || 10
      return Math.max(4, Math.min(rows, 8))
    })

    const clearAllFilters = () => {
      searchFilters.value = {
        id: '', name: '', category: '', vendor: '', location: '',
        type: '', borrowerId: '', borrowerName: '',
        year: ''
      }
      vendorFilter.value = ''
      yearFilter.value = ''
      typeFilter.value = ''
      activeStatusFilter.value = ''
      currentPage.value = 1
    }

    const toggleSelectAllReturn = (checkedOrEvent) => {
      const shouldSelect = typeof checkedOrEvent === 'boolean'
        ? checkedOrEvent
        : Boolean(checkedOrEvent?.target?.checked)
      const pageIds = paginatedGroups.value
        .filter(g => canReturnItem(g.parent))
        .map(g => g.parent.id)

      if (shouldSelect) {
        const newSet = new Set([...selectedReturnIds.value, ...pageIds])
        selectedReturnIds.value = Array.from(newSet)
      } else {
        selectedReturnIds.value = selectedReturnIds.value.filter(id => !pageIds.includes(id))
      }
    }

    const toggleReturnItem = (itemId, isChecked) => {
      if (isChecked) {
        if (!selectedReturnIds.value.includes(itemId)) {
          selectedReturnIds.value.push(itemId)
        }
      } else {
        selectedReturnIds.value = selectedReturnIds.value.filter(id => id !== itemId)
      }
    }



    // Load persisted custom locations
    const loadLocations = () => {
      const defaults = ['Lab A', 'Lab B', 'Lab C', 'Office', 'Storage Room', 'Shelf 1', 'Shelf 2']
      try {
        const saved = localStorage.getItem('inv_custom_locations')
        if (saved) {
          const parsed = JSON.parse(saved)
          const custom = parsed.filter(v => !defaults.includes(v) && v !== 'Other')
          return [...defaults, ...custom, 'Other']
        }
      } catch (e) { /* ignore */ }
      return [...defaults, 'Other']
    }
    const locationOptions = ref(loadLocations())

    const showEmailModal = ref(false)
    const emailTarget = ref(null)
    const openEmailForBorrower = (item) => {
      emailTarget.value = item
      showEmailModal.value = true
    }

    const getBorrowerName = (id, item) => {
      if (!id) return '-'
      if (item && item.currentBorrowerName) return item.currentBorrowerName
      return id
    }

    const canReturnItem = (item) => {
      if (!item) return false
      if (currentUser?.role === 'admin') return true
      if (currentUser?.role === 'operator') return item.owner === 'department'
      if (currentUser?.role === 'user' && currentUser?.subRole === 'teacher') {
        return item.owner === currentUser.userId
      }
      return false
    }

    const getLinkedApprovedRequest = (itemId) => {
      return allRequests.value.find((request) => request.itemID === itemId && request.status === 'Approved')
    }

    const getReturnMeta = (item) => {
      const request = getLinkedApprovedRequest(item.id)
      const returnDate = request?.returnDate ? new Date(request.returnDate) : null
      if (!returnDate || Number.isNaN(returnDate.getTime())) {
        return { returnDate: null, dueLabel: 'No due date', dueSort: Number.POSITIVE_INFINITY, dueClass: 'due-badge--unknown' }
      }

      const dueDay = new Date(returnDate)
      dueDay.setHours(0, 0, 0, 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const diffDays = Math.floor((dueDay - today) / 86400000)

      if (diffDays < 0) {
        return { returnDate, dueLabel: `Overdue (${Math.abs(diffDays)}d)`, dueSort: diffDays, dueClass: 'due-badge--overdue' }
      }
      if (diffDays === 0) {
        return { returnDate, dueLabel: 'Due Today', dueSort: 0, dueClass: 'due-badge--today' }
      }
      if (diffDays <= 3) {
        return { returnDate, dueLabel: `${diffDays}d left`, dueSort: diffDays, dueClass: 'due-badge--soon' }
      }
      if (diffDays <= 7) {
        return { returnDate, dueLabel: `${diffDays}d left`, dueSort: diffDays, dueClass: 'due-badge--warning' }
      }

      return { returnDate, dueLabel: `${diffDays}d left`, dueSort: diffDays, dueClass: 'due-badge--ok' }
    }

    const toggleReturnDateSort = () => {
      returnDateSortDir.value = returnDateSortDir.value === 'asc' ? 'desc' : 'asc'
    }

    const buildQueryParams = () => {
      const f = searchFilters.value
      const params = { page: currentPage.value, pageSize: pageSize.value }
      if (f.category) params.category = f.category
      if (f.location) params.location = f.location
      if (f.type || typeFilter.value) params.type = f.type || typeFilter.value
      if (f.vendor || vendorFilter.value) params.vendor = f.vendor || vendorFilter.value
      if (f.year || yearFilter.value) params.year = f.year || yearFilter.value
      if (f.borrowerId) params.borrowerId = f.borrowerId
      if (f.borrowerName) params.borrowerName = f.borrowerName
      if (activeStatusFilter.value) params.statusFilter = activeStatusFilter.value
      // Send item ID and name as separate search params
      if (f.id) params.itemIdSearch = f.id
      if (f.name) params.itemNameSearch = f.name
      // Owner-type filter for tab-based navigation
      if (returnViewTab.value) params.ownerType = returnViewTab.value
      params.sortBy = sortField.value
      params.sortDir = sortDir.value
      return params
    }

    const loadLentOutItems = async () => {
      const requestToken = ++loadRequestToken

      if (!isLentLoaded.value) {
        isLentInitialLoading.value = true
      } else {
        isLentFetching.value = true
      }
      lentErrorMessage.value = ''

      try {
        const params = buildQueryParams()
        const result = await inventoryService.getLentOutItems(params)

        if (requestToken !== loadRequestToken) {
          return
        }

        const pageItems = Array.isArray(result?.items) ? result.items : []
        items.value = pageItems
        totalItems.value = Number(result?.total ?? 0)
        vendors.value = getUniqueVendors(pageItems)
        years.value = [...new Set(pageItems.map(item => {
          if (item.warrantyStartDate) return item.warrantyStartDate.split('-')[0]
          return null
        }).filter(Boolean))].sort().reverse()

        // Load approved request links in background so item rows are not blocked by this heavier query.
        allRequests.value = []
        borrowingService.getAllRequests({ status: 'Approved', pageSize: 9999 })
          .then((reqResult) => {
            if (requestToken !== loadRequestToken) return
            allRequests.value = Array.isArray(reqResult?.requests) ? reqResult.requests : []
          })
          .catch((linkError) => {
            if (requestToken !== loadRequestToken) return
            console.warn('Failed to load approved requests for return metadata:', linkError)
          })
      } catch (e) {
        if (requestToken !== loadRequestToken) {
          return
        }

        console.error('Failed to load lent-out items:', e)

        items.value = []
        totalItems.value = 0
        allRequests.value = []
        lentErrorMessage.value = 'Failed to load checked-out items. Please try again.'
      } finally {
        if (requestToken !== loadRequestToken) {
          return
        }

        isLentInitialLoading.value = false
        isLentFetching.value = false
        isLentLoaded.value = true
      }
    }

    // Watch select filters - reload from server immediately
    const selectFields = computed(() => {
      const f = searchFilters.value
      return [f.category, f.vendor, f.location, f.type, f.year, vendorFilter.value, yearFilter.value, typeFilter.value]
    })

    watch(selectFields, () => {
      if (currentPage.value !== 1) {
        currentPage.value = 1
        return
      }
      loadLentOutItems()
    })

    watch(activeStatusFilter, () => {
      if (currentPage.value !== 1) {
        currentPage.value = 1
        return
      }
      loadLentOutItems()
    })

    watch(returnViewTab, () => {
      selectedReturnIds.value = []
      if (currentPage.value !== 1) {
        currentPage.value = 1
        return
      }
      loadLentOutItems()
    })

    watch(() => pageSize.value, () => {
      if (currentPage.value !== 1) {
        currentPage.value = 1
      } else {
        loadLentOutItems()
      }
    })

    // Reload when page changes (server-side pagination)
    watch(currentPage, () => {
      loadLentOutItems()
    })

    // Debounced watcher for text inputs
    const textFields = computed(() => {
      const f = searchFilters.value
      return [f.id, f.name, f.borrowerId, f.borrowerName]
    })
    watch(textFields, () => {
      clearTimeout(searchDebounceTimer)
      searchDebounceTimer = setTimeout(() => {
        if (currentPage.value !== 1) {
          currentPage.value = 1
          return
        }
        loadLentOutItems()
      }, 400)
    })

    // Group items: parent items with their child component items
    const groupedItems = computed(() => {
      let allItems = items.value
      const reqs = allRequests.value

      const childItemIds = new Set()

      // Find items whose approved request has a parentRequestId
      allItems.forEach(item => {
        const req = reqs.find(r => r.itemID === item.id && r.status === 'Approved')
        if (req && req.parentRequestId) {
          // Verify parent item is also in our paged list
          const parentReq = reqs.find(r => (r.requestId || r.id) === req.parentRequestId && r.status === 'Approved')
          if (parentReq) {
            const parentItem = allItems.find(i => i.id === parentReq.itemID)
            if (parentItem) {
              childItemIds.add(item.id)
            }
          }
        }
      })

      const groups = []
      allItems.forEach(item => {
        if (childItemIds.has(item.id)) return // skip children
        const req = reqs.find(r => r.itemID === item.id && r.status === 'Approved')
        const children = []
        if (req) {
          // Find child requests linked to this parent request
          const parentReqId = req.requestId || req.id
          const childReqs = reqs.filter(r => r.parentRequestId === parentReqId && r.status === 'Approved')
          childReqs.forEach(cr => {
            const childItem = allItems.find(i => i.id === cr.itemID)
            if (childItem) children.push(childItem)
          })
        }
        groups.push({ parent: item, children })
      })

      return groups
    })

    const sortedGroups = computed(() => {
      const isAsc = returnDateSortDir.value === 'asc'
      return [...groupedItems.value].sort((a, b) => {
        const aMeta = getReturnMeta(a.parent)
        const bMeta = getReturnMeta(b.parent)
        const aSort = aMeta.dueSort
        const bSort = bMeta.dueSort
        // Both have no due date — fall back to createdAt desc
        if (aSort === Number.POSITIVE_INFINITY && bSort === Number.POSITIVE_INFINITY) {
          const aTime = new Date(a.parent.createdAt || 0).getTime()
          const bTime = new Date(b.parent.createdAt || 0).getTime()
          return bTime - aTime
        }
        // No due date goes last regardless of direction
        if (aSort === Number.POSITIVE_INFINITY) return 1
        if (bSort === Number.POSITIVE_INFINITY) return -1

        // Get actual return dates for chronological sort
        const aDate = aMeta.returnDate ? aMeta.returnDate.getTime() : 0
        const bDate = bMeta.returnDate ? bMeta.returnDate.getTime() : 0
        return isAsc ? aDate - bDate : bDate - aDate
      })
    })

    const departmentGroups = computed(() => {
      return sortedGroups.value.filter(g => !g.parent.owner || g.parent.owner === 'department')
    })

    const teacherGroups = computed(() => {
      return sortedGroups.value.filter(g => g.parent.owner && g.parent.owner !== 'department')
    })

    const getOwnerDisplayName = (ownerId) => {
      if (!ownerId || ownerId === 'department') return 'Department'
      return ownerId
    }

    const paginatedGroups = computed(() => {
      const tab = returnViewTab.value
      let groups = sortedGroups.value
      if (tab === 'department') {
        groups = groups.filter(g => !g.parent.owner || g.parent.owner === 'department')
      } else if (tab === 'teacher') {
        groups = groups.filter(g => g.parent.owner && g.parent.owner !== 'department')
      }
      return groups
    })

    const totalFilteredGroups = computed(() => {
      const tab = returnViewTab.value
      let groups = sortedGroups.value
      if (tab === 'department') {
        groups = groups.filter(g => !g.parent.owner || g.parent.owner === 'department')
      } else if (tab === 'teacher') {
        groups = groups.filter(g => g.parent.owner && g.parent.owner !== 'department')
      }
      return groups.length
    })

    const handleReturnItem = async (item) => {
      if (!canReturnItem(item)) {
        alert('You do not have permission to return this item.')
        return
      }

      if (window.confirm(`Are you sure you want to confirm the return of "${item.name}" (${item.id})?`)) {
        await runAction('Returning item...', async () => {
          try {
            const reqs = allRequests.value
            const req = reqs.find(
              r => r.itemID === item.id && r.status === 'Approved'
            )
            if (req) {
              await borrowingService.returnItem(req.id || req.requestId)
            }
          } catch (e) {
            console.error('Failed to return item:', e)
          }
          // Show location update card
          returnedItem.value = item
          newLocation.value = item.location || 'Lab A'
          showLocationCard.value = true
          loadLentOutItems()
        })
      }
    }

    const saveLocation = async () => {
      if (returnedItem.value) {
        let loc = newLocation.value
        if (loc === 'Other') {
          const custom = otherLocation.value.trim()
          if (!custom) return
          loc = custom
          // Add to list and persist
          if (!locationOptions.value.includes(loc)) {
            const idx = locationOptions.value.indexOf('Other')
            locationOptions.value.splice(idx, 0, loc)
            try { localStorage.setItem('inv_custom_locations', JSON.stringify(locationOptions.value)) } catch (e) { /* ignore */ }
          }
        }
        await runAction('Saving location...', async () => {
          try {
            await inventoryService.updateItem(returnedItem.value.id, { location: loc })
            // Also update location for child component items
            if (returnedItem.value.fixedComponents && returnedItem.value.fixedComponents.length > 0) {
              for (const compID of returnedItem.value.fixedComponents) {
                const comp = await inventoryService.getItemById(compID)
                if (comp) {
                  await inventoryService.updateItem(comp.id, { location: loc })
                }
              }
            }
          } catch (e) {
            console.error('Failed to save location:', e)
          }
          showLocationCard.value = false
          returnedItem.value = null
          otherLocation.value = ''
          loadLentOutItems()
        })
      }
    }

    const exportFiltered = () => {
      exportToExcel(items.value, 'lent_out_items.xlsx')
    }

    const handleBulkReturn = async () => {
      showBulkReturnModal.value = false
      const ids = [...selectedReturnIds.value]
      await runAction('Returning items...', async (onProgress) => {
        let done = 0
        let skipped = 0
        for (const itemId of ids) {
          try {
            const itemData = items.value.find(i => i.id === itemId)
            if (!canReturnItem(itemData)) {
              skipped += 1
              done++
              onProgress(done, ids.length)
              continue
            }
            const req = allRequests.value.find(
              r => r.itemID === itemId && r.status === 'Approved'
            )
            if (req) {
              await borrowingService.returnItem(req.id || req.requestId)
            }
          } catch (e) {
            console.error(`Failed to return item ${itemId}:`, e)
          }
          done++
          onProgress(done, ids.length)
        }
        selectedReturnIds.value = []
        bulkReturnCondition.value = 'Good'
        bulkReturnNotes.value = ''
        await loadLentOutItems()
        if (skipped > 0) {
          alert(`${skipped} selected item(s) were skipped due to owner permission restrictions.`)
        }
      })
    }

    onMounted(() => {
      // Apply auto-filter from dashboard navigation
      if (props.pageParams?.filter) {
        // Setting activeStatusFilter triggers its watcher which calls loadLentOutItems
        activeStatusFilter.value = props.pageParams.filter
      } else {
        loadLentOutItems()
      }
    })

    onUnmounted(() => {
      clearTimeout(searchDebounceTimer)
    })

    return {
      items,
      totalItems,
      vendorFilter,
      yearFilter,
      vendors,
      years,
      currentPage,
      pageSize,
      checkedOutSummaryText,
      showLentSkeleton,
      lentSkeletonRows,
      lentErrorMessage,
      groupedItems,
      sortedGroups,
      paginatedGroups,
      totalFilteredGroups,
      showFilterPanel,
      searchFilters,
      uniqueCategories,
      uniqueLocations,
      clearAllFilters,
      activeStatusFilter,
      getBorrowerName,
      getReturnMeta,
      returnDateSortDir,
      toggleReturnDateSort,
      handleReturnItem,
      saveLocation,
      showLocationCard,
      returnedItem,
      newLocation,
      otherLocation,
      locationOptions,
      exportFiltered,
      selectedReturnIds,
      showBulkReturnModal,
      bulkReturnCondition,
      bulkReturnNotes,
      allReturnSelected,
      toggleSelectAllReturn,
      toggleReturnItem,
      handleBulkReturn,
      showEmailModal,
      emailTarget,
      openEmailForBorrower,
      canReturnItem,
      formatDate,
      departmentGroups,
      teacherGroups,
      getOwnerDisplayName,
      returnViewTab,
    }
  }
}
</script>

<style scoped>
.table-spinner-cell {
  text-align: center;
  padding: 3rem 1rem !important;
  background: var(--card);
}
.checked-banner {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--filter-border);
  background: var(--filter-bg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.checked-banner-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.checked-banner-overdue {
  color: var(--danger);
}

.checked-banner-soon {
  color: var(--warning);
}

.checked-filter-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 0.75rem;
}

@media (min-width: 768px) {
  .checked-filter-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1200px) {
  .checked-filter-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.filter-label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted-foreground);
}

.checked-table-card {
  padding: 0;
}

.checked-empty-row .checked-empty-cell {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--muted-foreground);
  font-size: 0.9rem;
}

.checked-parent-id,
.checked-parent-name {
  font-weight: 600;
}

.checked-child-count {
  margin-left: 0.5rem;
  font-size: 0.75rem;
  color: var(--accent);
  font-weight: 400;
}

.checked-child-id,
.checked-child-name {
  padding-left: 1.5rem;
  font-size: 0.85rem;
}

.checked-child-return {
  text-align: center;
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.checked-row-skeleton td {
  padding-top: 0.85rem;
  padding-bottom: 0.85rem;
}

.checked-skeleton-line {
  display: inline-block;
  height: 0.75rem;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--table-header) 0%, var(--filter-bg) 50%, var(--table-header) 100%);
  background-size: 200% 100%;
  animation: checked-skeleton-wave 1.2s linear infinite;
}

.checked-skeleton-box {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;
  background: linear-gradient(90deg, var(--table-header) 0%, var(--filter-bg) 50%, var(--table-header) 100%);
  background-size: 200% 100%;
  animation: checked-skeleton-wave 1.2s linear infinite;
}

.checked-skeleton-id {
  width: 4.5rem;
}

.checked-skeleton-name {
  width: 8rem;
}

.checked-skeleton-short {
  width: 5.5rem;
}

@keyframes checked-skeleton-wave {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.sort-icon {
  display: inline-block;
  width: 14px;
  text-align: center;
  font-size: 11px;
  color: var(--muted-foreground);
}
thead th:hover .sort-icon {
  color: var(--text-primary);
}

/* Kebab trigger */
.kebab-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--muted-foreground);
  cursor: pointer;
  transition: all 0.12s;
}
.kebab-trigger:hover { background: var(--surface-100); color: var(--text-primary); }

/* Bulk toolbar */
.bulk-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface-50);
}
.bulk-toolbar-left {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}
.bulk-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-surface);
  border-radius: 999px;
}
.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--muted-foreground);
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
}
.toolbar-btn:hover { background: var(--surface-100); color: var(--text-secondary); }
.bulk-clear-btn {
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--muted-foreground);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.bulk-clear-btn:hover { color: var(--text-primary); }

/* Bulk bar animation */
.bulk-bar-enter-active,
.bulk-bar-leave-active {
  transition: max-height 0.25s ease, opacity 0.2s ease;
  overflow: hidden;
}
.bulk-bar-enter-from,
.bulk-bar-leave-to {
  max-height: 0;
  opacity: 0;
}
.bulk-bar-enter-to,
.bulk-bar-leave-from {
  max-height: 4rem;
  opacity: 1;
}

/* Teacher-owned section separator */
.teacher-section-row td {
  padding: 0 !important;
  border-bottom: none !important;
}
.teacher-section-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  margin-top: 0.5rem;
  background: var(--accent-surface);
  border-top: 2px solid var(--accent);
}
.teacher-section-label {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--accent);
  white-space: nowrap;
}
.teacher-section-hint {
  font-size: 0.7rem;
  color: var(--muted-foreground);
  font-style: italic;
}

/* Teacher-owned row tint */
.row-teacher-owned {
  background: color-mix(in srgb, var(--accent-surface) 35%, transparent);
}

/* Inline teacher owner tag */
.teacher-owner-tag {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.1rem 0.45rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-surface);
  border-radius: 999px;
  vertical-align: middle;
}

/* Return sub-tabs */
.return-sub-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border);
  background: var(--surface-50);
}
.return-sub-tab {
  padding: 0.625rem 1.25rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--muted-foreground);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.return-sub-tab:hover {
  color: var(--text-primary);
  background: var(--surface-100);
}
.return-sub-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

/* Due status badges */
.due-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-md, 0.375rem);
  font-size: 0.6875rem;
  font-weight: 700;
  white-space: nowrap;
}
.due-badge--overdue {
  background: var(--danger-light);
  color: var(--danger);
}
.due-badge--today {
  background: var(--warning-light);
  color: var(--warning-dark);
}
.due-badge--soon {
  background: #fff7ed;
  color: #c2410c;
}
.due-badge--warning {
  background: #fffbeb;
  color: #b45309;
}
.due-badge--ok {
  background: var(--success-light);
  color: var(--success);
}
.due-badge--unknown {
  background: var(--surface-100);
  color: var(--muted-foreground);
}

.sortable-th {
  cursor: pointer;
  user-select: none;
}
.sortable-th:hover {
  color: var(--primary);
}
.sort-arrow {
  font-size: 0.7em;
  margin-left: 2px;
  opacity: 0.7;
}
</style>
