<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">Checked-out items</h2>
      <div class="flex gap-2 flex-wrap">
        <button @click="showFilterPanel = !showFilterPanel" class="btn btn-ghost">
          {{ showFilterPanel ? 'Hide Filters' : 'Show Filters' }}
        </button>
        <button @click="exportFiltered" class="btn">Export to Excel</button>
        <button
          v-if="selectedReturnIds.length > 0"
          @click="showBulkReturnModal = true"
          class="btn btn-outline-danger"
        >
          Return Bulk ({{ selectedReturnIds.length }})
        </button>
      </div>
    </div>

    <!-- Active status filter banner -->
    <div v-if="activeStatusFilter" class="mb-4 p-3 rounded-lg flex items-center justify-between" style="background:var(--filter-bg);border:1px solid var(--filter-border)">
      <span class="text-sm font-semibold">
        Showing: <span :style="`color:${activeStatusFilter === 'overdue' ? 'var(--danger)' : 'var(--warning)'}`">{{ activeStatusFilter === 'overdue' ? 'Overdue returns' : 'Due within 7 days' }}</span>
      </span>
      <button @click="activeStatusFilter = ''" class="text-sm font-medium" style="color:var(--accent)">Clear filter ×</button>
    </div>

    <!-- Comprehensive Search Filter Panel -->
    <div v-if="showFilterPanel" class="filter-panel">
      <div class="flex justify-between items-center mb-3">
        <h3 class="filter-panel-title">Search &amp; Filter</h3>
        <button @click="clearAllFilters" class="filter-clear-btn">Clear All</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <!-- ID (text) -->
        <div>
          <label class="filter-label">Item ID</label>
          <input v-model="searchFilters.id" type="text" class="form-input text-sm" placeholder="e.g. INV-001" />
        </div>
        <!-- Name (text) -->
        <div>
          <label class="filter-label">Name</label>
          <input v-model="searchFilters.name" type="text" class="form-input text-sm" placeholder="Search name..." />
        </div>
        <!-- Category (select) -->
        <div>
          <label class="filter-label">Category</label>
          <select v-model="searchFilters.category" class="form-select text-sm">
            <option value="">All Categories</option>
            <option v-for="c in uniqueCategories" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <!-- Vendor (select) -->
        <div>
          <label class="filter-label">Vendor</label>
          <select v-model="searchFilters.vendor" class="form-select text-sm">
            <option value="">All Vendors</option>
            <option v-for="v in vendors" :key="v" :value="v">{{ v }}</option>
          </select>
        </div>
        <!-- Location (select) -->
        <div>
          <label class="filter-label">Location</label>
          <select v-model="searchFilters.location" class="form-select text-sm">
            <option value="">All Locations</option>
            <option v-for="l in uniqueLocations" :key="l" :value="l">{{ l }}</option>
          </select>
        </div>
        <!-- Type (select) -->
        <div>
          <label class="filter-label">Type</label>
          <select v-model="searchFilters.type" class="form-select text-sm">
            <option value="">All Types</option>
            <option value="Component">Component</option>
            <option value="Hardware">Hardware</option>
            <option value="Software">Software</option>
          </select>
        </div>
        <!-- Borrower ID (text) -->
        <div>
          <label class="filter-label">Borrower ID</label>
          <input v-model="searchFilters.borrowerId" type="text" class="form-input text-sm" placeholder="e.g. S00123456" />
        </div>
        <!-- Borrower Name (text) -->
        <div>
          <label class="filter-label">Borrower Name</label>
          <input v-model="searchFilters.borrowerName" type="text" class="form-input text-sm" placeholder="Search borrower..." />
        </div>
        <!-- Year (select - keep for convenience) -->
        <div>
          <label class="filter-label">Year</label>
          <select v-model="searchFilters.year" class="form-select text-sm">
            <option value="">All Years</option>
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="groupedItems.length === 0" class="empty-state">
      No checked-out items match your filters
    </div>
    <div v-else class="table-responsive">
      <table class="table-striped theme-table">
        <thead>
          <tr>
            <th class="text-center" style="width:3rem">
              <input
                type="checkbox"
                :checked="allReturnSelected"
                @change="toggleSelectAllReturn"
                class="form-checkbox"
              />
            </th>
            <th>ID</th>
            <th>Name</th>
            <th class="cursor-pointer select-none" @click="toggleSort('category')">
              Category <span class="sort-icon">{{ getSortIcon('category') }}</span>
            </th>
            <th class="cursor-pointer select-none" @click="toggleSort('currentBorrower')">
              Borrower ID <span class="sort-icon">{{ getSortIcon('currentBorrower') }}</span>
            </th>
            <th class="cursor-pointer select-none" @click="toggleSort('borrowerName')">
              Borrower Name <span class="sort-icon">{{ getSortIcon('borrowerName') }}</span>
            </th>
            <th class="cursor-pointer select-none" @click="toggleSort('supplier')">
              Vendor <span class="sort-icon">{{ getSortIcon('supplier') }}</span>
            </th>
            <th class="cursor-pointer select-none" @click="toggleSort('location')">
              Location <span class="sort-icon">{{ getSortIcon('location') }}</span>
            </th>
            <th class="text-center">Return</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="group in paginatedGroups" :key="group.parent.id">
            <!-- Parent / standalone item row -->
            <tr class="row-parent">
              <td class="text-center">
                <input
                  type="checkbox"
                  :checked="selectedReturnIds.includes(group.parent.id)"
                  @change="e => toggleReturnItem(group.parent.id, e.target.checked)"
                  class="form-checkbox"
                />
              </td>
              <td style="font-weight:600">{{ group.parent.id }}</td>
              <td style="font-weight:600">
                {{ group.parent.name }}
                <span v-if="group.children.length > 0" class="ml-2 text-xs text-accent-subtle font-normal">
                  (+ {{ group.children.length }} component{{ group.children.length > 1 ? 's' : '' }})
                </span>
              </td>
              <td>{{ group.parent.category }}</td>
              <td>{{ group.parent.currentBorrower }}</td>
              <td>{{ getBorrowerName(group.parent.currentBorrower, group.parent) }}</td>
              <td>{{ group.parent.supplier }}</td>
              <td>{{ group.parent.location }}</td>
              <td class="text-center">
                <button
                  @click="handleReturnItem(group.parent)"
                  class="btn btn-outline-success text-sm"
                >
                  Return{{ group.children.length > 0 ? ' All' : '' }}
                </button>
                <button
                  v-if="group.parent.currentBorrower"
                  @click="openEmailForBorrower(group.parent)"
                  class="btn btn-ghost text-sm ml-1"
                  title="Send email to borrower"
                >
                  ✉
                </button>
              </td>
            </tr>
            <!-- Child component rows -->
            <tr v-for="child in group.children" :key="child.id" class="row-child">
              <td></td>
              <td class="pl-6 text-sm">↳ {{ child.id }}</td>
              <td class="pl-6 text-sm">{{ child.name }}</td>
              <td class="text-sm">{{ child.category }}</td>
              <td class="text-sm">{{ child.currentBorrower }}</td>
              <td class="text-sm">{{ getBorrowerName(child.currentBorrower, child) }}</td>
              <td class="text-sm">{{ child.supplier }}</td>
              <td class="text-sm">{{ child.location }}</td>
              <td class="text-center text-xs" style="color:var(--muted-foreground)">Auto with parent</td>
            </tr>
          </template>
        </tbody>
      </table>
      <PaginationControl
        v-model:currentPage="currentPage"
        :totalItems="sortedGroups.length"
        :pageSize="pageSize"
      />
    </div>

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
          <select v-model="bulkReturnCondition" class="form-select" style="width:100%;">
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Damaged">Damaged</option>
          </select>
        </div>
        <div style="margin-bottom:14px;">
          <label class="form-label">Notes (Optional)</label>
          <textarea v-model="bulkReturnNotes" class="form-textarea" style="width:100%;height:80px;" placeholder="Add any notes about the returns..." />
        </div>
        <div style="display:flex;gap:8px;">
          <button @click="handleBulkReturn" class="btn btn-outline-success" style="flex:1;">Confirm Return</button>
          <button @click="showBulkReturnModal = false" class="btn btn-outline-secondary" style="flex:1;">Cancel</button>
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
          <select v-model="newLocation" class="form-select" style="width:100%;">
            <option v-for="loc in locationOptions" :key="loc" :value="loc">{{ loc }}</option>
          </select>
        </div>
        <div v-if="newLocation === 'Other'" style="margin-bottom:14px;">
          <label class="form-label">Enter new location</label>
          <input v-model="otherLocation" type="text" class="form-input" style="width:100%;" placeholder="Type location name..." @keyup.enter="saveLocation" />
        </div>
        <div style="display:flex;gap:8px;">
          <button @click="saveLocation" class="btn btn-outline-success" style="flex:1;">Save</button>
          <button @click="showLocationCard = false; returnedItem = null" class="btn btn-outline-secondary" style="flex:1;">Skip</button>
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
import { ref, computed, onMounted, watch } from 'vue'
import { inventoryService, borrowingService } from '../utils/services'
import { formatDate, exportToExcel, getUniqueVendors, filterByYear, filterByVendor, isOverdue, isDueSoon, daysFromNow } from '../utils/helpers'
import PaginationControl from '../components/PaginationControl.vue'
import SendEmailModal from '../components/SendEmailModal.vue'

export default {
  components: { PaginationControl, SendEmailModal },
  props: {
    pageParams: { type: Object, default: () => ({}) }
  },
  setup(props) {
    const items = ref([])
    const allRequests = ref([])
    const vendorFilter = ref('')
    const yearFilter = ref('')
    const vendors = ref([])
    const years = ref([])
    const currentPage = ref(1)
    const pageSize = 10
    const showLocationCard = ref(false)
    const returnedItem = ref(null)
    const newLocation = ref('')
    const otherLocation = ref('')
    const typeFilter = ref('')
    const sortField = ref('')
    const sortDir = ref('asc')
    const showFilterPanel = ref(false)
    const activeStatusFilter = ref('')
    const selectedReturnIds = ref([])
    const showBulkReturnModal = ref(false)
    const bulkReturnCondition = ref('Good')
    const bulkReturnNotes = ref('')

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
      const parentCount = paginatedGroups.value.length
      return parentCount > 0 && paginatedGroups.value.every(g => selectedReturnIds.value.includes(g.parent.id))
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
    }

    const toggleSelectAllReturn = (event) => {
      const pageIds = paginatedGroups.value.map(g => g.parent.id)
      if (event.target.checked) {
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
    let searchDebounceTimer = null

    const toggleSort = (field) => {
      if (sortField.value === field) {
        sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
      } else {
        sortField.value = field
        sortDir.value = 'asc'
      }
      currentPage.value = 1
    }

    const getSortIcon = (field) => {
      if (sortField.value !== field) return '⇅'
      return sortDir.value === 'asc' ? '▲' : '▼'
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

    const buildQueryParams = () => {
      const f = searchFilters.value
      const params = { pageSize: 9999 }
      if (f.category) params.category = f.category
      if (f.location) params.location = f.location
      if (f.type || typeFilter.value) params.type = f.type || typeFilter.value
      if (f.vendor || vendorFilter.value) params.vendor = f.vendor || vendorFilter.value
      if (f.year || yearFilter.value) params.year = f.year || yearFilter.value
      if (f.borrowerId) params.borrowerId = f.borrowerId
      // Combine text searches
      const textParts = [f.id, f.name, f.borrowerName].filter(Boolean)
      if (textParts.length > 0) params.search = textParts.join(' ')
      if (sortField.value) {
        params.sortBy = sortField.value
        params.sortDir = sortDir.value
      }
      return params
    }

    const loadLentOutItems = async () => {
      try {
        const params = buildQueryParams()
        const result = await inventoryService.getLentOutItems(params)
        items.value = result.items
        vendors.value = getUniqueVendors(result.items)
        years.value = [...new Set(result.items.map(item => {
          if (item.warrantyStartDate) return item.warrantyStartDate.split('-')[0]
          return null
        }).filter(Boolean))].sort().reverse()
        const reqResult = await borrowingService.getAllRequests({ status: 'Approved', pageSize: 9999 })
        allRequests.value = reqResult.requests || []
      } catch (e) {
        console.error('Failed to load lent-out items:', e)
      }
    }

    // Watch select filters - reload from server immediately
    const selectFields = computed(() => {
      const f = searchFilters.value
      return [f.category, f.vendor, f.location, f.type, f.year, f.warrantyEnd]
    })
    watch([selectFields, vendorFilter, yearFilter, typeFilter, activeStatusFilter], () => {
      currentPage.value = 1
      loadLentOutItems()
    })

    // Debounced watcher for text inputs
    const textFields = computed(() => {
      const f = searchFilters.value
      return [f.id, f.name, f.borrowerId, f.borrowerName]
    })
    watch(textFields, () => {
      currentPage.value = 1
      clearTimeout(searchDebounceTimer)
      searchDebounceTimer = setTimeout(() => {
        loadLentOutItems()
      }, 400)
    })

    // Group items: parent items with their child component items
    const groupedItems = computed(() => {
      let allItems = items.value
      const reqs = allRequests.value

      // Apply overdue/due-soon filter client-side (needs cross-reference with requests)
      if (activeStatusFilter.value) {
        if (activeStatusFilter.value === 'overdue') {
          const overdueItemIds = new Set(
            reqs.filter(r => r.status === 'Approved' && isOverdue(r.returnDate))
              .map(r => r.itemID)
          )
          allItems = allItems.filter(i => overdueItemIds.has(i.id))
        } else if (activeStatusFilter.value === 'due-soon') {
          const dueSoonItemIds = new Set(
            reqs.filter(r => r.status === 'Approved' && isDueSoon(r.returnDate, 7))
              .map(r => r.itemID)
          )
          allItems = allItems.filter(i => dueSoonItemIds.has(i.id))
        }
      }

      const childItemIds = new Set()

      // Find items whose approved request has a parentRequestId
      allItems.forEach(item => {
        const req = reqs.find(r => r.itemID === item.id && r.status === 'Approved')
        if (req && req.parentRequestId) {
          childItemIds.add(item.id)
        }
      })

      const groups = []
      allItems.forEach(item => {
        if (childItemIds.has(item.id)) return // skip children
        const req = reqs.find(r => r.itemID === item.id && r.status === 'Approved')
        const children = []
        if (req) {
          // Find child requests linked to this parent request
          const childReqs = reqs.filter(r => r.parentRequestId === req.id && r.status === 'Approved')
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
      const groups = [...groupedItems.value]
      if (!sortField.value) return groups
      groups.sort((a, b) => {
        let valA, valB
        if (sortField.value === 'borrowerName') {
          valA = getBorrowerName(a.parent.currentBorrower)
          valB = getBorrowerName(b.parent.currentBorrower)
        } else {
          valA = a.parent[sortField.value] || ''
          valB = b.parent[sortField.value] || ''
        }
        if (sortDir.value === 'asc') return valA < valB ? -1 : valA > valB ? 1 : 0
        return valA > valB ? -1 : valA < valB ? 1 : 0
      })
      return groups
    })

    const paginatedGroups = computed(() => {
      const start = (currentPage.value - 1) * pageSize
      return sortedGroups.value.slice(start, start + pageSize)
    })

    const handleReturnItem = async (item) => {
      if (window.confirm(`Are you sure you want to confirm the return of "${item.name}" (${item.id})?`)) {
        try {
          const reqs = allRequests.value
          const req = reqs.find(
            r => r.itemID === item.id && r.status === 'Approved'
          )
          if (req) {
            await borrowingService.returnItem(req.id)
          }
        } catch (e) {
          console.error('Failed to return item:', e)
        }
        // Show location update card
        returnedItem.value = item
        newLocation.value = item.location || 'Lab A'
        showLocationCard.value = true
        loadLentOutItems()
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
      }
    }

    const exportFiltered = () => {
      exportToExcel(items.value, 'lent_out_items.xlsx')
    }

    const handleBulkReturn = async () => {
      showBulkReturnModal.value = false
      try {
        for (const itemId of selectedReturnIds.value) {
          try {
            const req = allRequests.value.find(
              r => r.itemID === itemId && r.status === 'Approved'
            )
            if (req) {
              await borrowingService.returnItem(req.id)
            }
          } catch (e) {
            console.error(`Failed to return item ${itemId}:`, e)
          }
        }
        selectedReturnIds.value = []
        bulkReturnCondition.value = 'Good'
        bulkReturnNotes.value = ''
        await loadLentOutItems()
      } catch (e) {
        console.error('Failed to bulk return items:', e)
      }
    }

    onMounted(() => {
      // Apply auto-filter from dashboard navigation
      if (props.pageParams?.filter) {
        activeStatusFilter.value = props.pageParams.filter
      }
      loadLentOutItems()
    })

    return {
      items,
      vendorFilter,
      yearFilter,
      vendors,
      years,
      currentPage,
      pageSize,
      groupedItems,
      sortedGroups,
      paginatedGroups,
      toggleSort,
      getSortIcon,
      typeFilter,
      sortField,
      sortDir,
      showFilterPanel,
      searchFilters,
      uniqueCategories,
      uniqueLocations,
      clearAllFilters,
      activeStatusFilter,
      getBorrowerName,
      handleReturnItem,
      saveLocation,
      showLocationCard,
      returnedItem,
      newLocation,
      otherLocation,
      locationOptions,
      exportFiltered,
      formatDate,
      isOverdue,
      daysFromNow,
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
    }
  }
}
</script>

<style scoped>
.sort-icon {
  display: inline-block;
  width: 14px;
  text-align: center;
  font-size: 11px;
  color: #6b7280;
}
thead th:hover .sort-icon {
  color: #1f2937;
}
</style>
