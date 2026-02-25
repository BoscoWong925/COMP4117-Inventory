<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">Lent-Out Items &amp; Hand-Over</h2>
      <button @click="exportFiltered" class="btn">Export to Excel</button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <div>
        <label class="block text-gray-700 text-sm font-medium mb-2">Filter by Vendor</label>
        <select v-model="vendorFilter" class="form-select">
          <option value="">All Vendors</option>
          <option v-for="v in vendors" :key="v" :value="v">{{ v }}</option>
        </select>
      </div>

      <div>
        <label class="block text-gray-700 text-sm font-medium mb-2">Filter by Year</label>
        <select v-model="yearFilter" class="form-select">
          <option value="">All Years</option>
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>

      <div>
        <label class="block text-gray-700 text-sm font-medium mb-2">Filter by Type</label>
        <select v-model="typeFilter" class="form-select">
          <option value="">All Types</option>
          <option value="Component">Component</option>
          <option value="Hardware">Hardware</option>
          <option value="Software">Software</option>
        </select>
      </div>
    </div>

    <div class="flex justify-end mb-4">
      <button
        @click="vendorFilter = ''; yearFilter = ''; typeFilter = ''"
        class="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
      >
        Clear Filters
      </button>
    </div>

    <div v-if="groupedItems.length === 0" class="bg-blue-50 p-4 rounded text-center">
      No lent-out items match your filters
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full border-collapse border border-gray-300 table-striped">
        <thead class="bg-gray-200">
          <tr>
            <th class="border p-2 text-left">ID</th>
            <th class="border p-2 text-left">Name</th>
            <th class="border p-2 text-left cursor-pointer select-none hover:bg-gray-300" @click="toggleSort('category')">
              Category <span class="sort-icon">{{ getSortIcon('category') }}</span>
            </th>
            <th class="border p-2 text-left cursor-pointer select-none hover:bg-gray-300" @click="toggleSort('currentBorrower')">
              Borrower ID <span class="sort-icon">{{ getSortIcon('currentBorrower') }}</span>
            </th>
            <th class="border p-2 text-left cursor-pointer select-none hover:bg-gray-300" @click="toggleSort('borrowerName')">
              Borrower Name <span class="sort-icon">{{ getSortIcon('borrowerName') }}</span>
            </th>
            <th class="border p-2 text-left cursor-pointer select-none hover:bg-gray-300" @click="toggleSort('supplier')">
              Vendor <span class="sort-icon">{{ getSortIcon('supplier') }}</span>
            </th>
            <th class="border p-2 text-left cursor-pointer select-none hover:bg-gray-300" @click="toggleSort('location')">
              Location <span class="sort-icon">{{ getSortIcon('location') }}</span>
            </th>
            <th class="border p-2 text-left cursor-pointer select-none hover:bg-gray-300" @click="toggleSort('warrantyEnd')">
              Warranty End <span class="sort-icon">{{ getSortIcon('warrantyEnd') }}</span>
            </th>
            <th class="border p-2 text-center">Return</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="group in paginatedGroups" :key="group.parent.id">
            <!-- Parent / standalone item row -->
            <tr class="bg-white">
              <td class="border p-2 font-semibold">{{ group.parent.id }}</td>
              <td class="border p-2 font-semibold">
                {{ group.parent.name }}
                <span v-if="group.children.length > 0" class="ml-2 text-xs text-blue-600 font-normal">
                  (+ {{ group.children.length }} component{{ group.children.length > 1 ? 's' : '' }})
                </span>
              </td>
              <td class="border p-2">{{ group.parent.category }}</td>
              <td class="border p-2">{{ group.parent.currentBorrower }}</td>
              <td class="border p-2">{{ getBorrowerName(group.parent.currentBorrower) }}</td>
              <td class="border p-2">{{ group.parent.supplier }}</td>
              <td class="border p-2">{{ group.parent.location }}</td>
              <td class="border p-2">{{ formatDate(group.parent.warrantyEnd) }}</td>
              <td class="border p-2 text-center">
                <button
                  @click="handleReturnItem(group.parent)"
                  class="btn btn-outline-success text-sm"
                >
                  Return{{ group.children.length > 0 ? ' All' : '' }}
                </button>
              </td>
            </tr>
            <!-- Child component rows -->
            <tr v-for="child in group.children" :key="child.id" class="bg-gray-50">
              <td class="border p-2 pl-6 text-gray-500 text-sm">↳ {{ child.id }}</td>
              <td class="border p-2 pl-6 text-gray-600 text-sm">{{ child.name }}</td>
              <td class="border p-2 text-gray-500 text-sm">{{ child.category }}</td>
              <td class="border p-2 text-gray-500 text-sm">{{ child.currentBorrower }}</td>
              <td class="border p-2 text-gray-500 text-sm">{{ getBorrowerName(child.currentBorrower) }}</td>
              <td class="border p-2 text-gray-500 text-sm">{{ child.supplier }}</td>
              <td class="border p-2 text-gray-500 text-sm">{{ child.location }}</td>
              <td class="border p-2 text-gray-500 text-sm">{{ formatDate(child.warrantyEnd) }}</td>
              <td class="border p-2 text-center text-gray-400 text-xs">Auto with parent</td>
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

    <!-- Update Location Popup -->
    <div v-if="showLocationCard && returnedItem" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:9999;">
      <div style="background:#fff;border-radius:12px;padding:24px 28px;width:340px;box-shadow:0 8px 30px rgba(0,0,0,0.18);border:1px solid #e5e7eb;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <span style="font-size:22px;">📍</span>
          <span style="font-size:16px;font-weight:700;">Update Location</span>
        </div>
        <p style="font-size:13px;color:#666;margin-bottom:16px;">"{{ returnedItem.name }}" has been returned.<br/>Where should it be placed?</p>
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:4px;">Location</label>
          <select v-model="newLocation" class="form-select" style="width:100%;">
            <option v-for="loc in locationOptions" :key="loc" :value="loc">{{ loc }}</option>
          </select>
        </div>
        <div v-if="newLocation === 'Other'" style="margin-bottom:14px;">
          <label style="display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:4px;">Enter new location</label>
          <input v-model="otherLocation" type="text" class="form-input" style="width:100%;" placeholder="Type location name..." @keyup.enter="saveLocation" />
        </div>
        <div style="display:flex;gap:8px;">
          <button @click="saveLocation" class="btn btn-outline-success" style="flex:1;">Save</button>
          <button @click="showLocationCard = false; returnedItem = null" class="btn btn-outline-secondary" style="flex:1;">Skip</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { inventoryService, borrowingService } from '../utils/services'
import { formatDate, exportToExcel, getUniqueVendors, filterByYear, filterByVendor } from '../utils/helpers'
import { mockUsers } from '../data/mockData'
import PaginationControl from '../components/PaginationControl.vue'

export default {
  components: { PaginationControl },
  setup() {
    const items = ref([])
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

    // Reset page when any filter changes
    watch([vendorFilter, yearFilter, typeFilter], () => {
      currentPage.value = 1
    })

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

    const getBorrowerName = (id) => {
      if (!id) return '-'
      const u = mockUsers.find(u => u.id === id)
      return u ? u.name : id
    }

    const loadLentOutItems = () => {
      const lentOut = inventoryService.getLentOutItems()
      items.value = lentOut
      vendors.value = getUniqueVendors(lentOut)
      years.value = [...new Set(lentOut.map(item => {
        if (item.warrantyStartDate) return item.warrantyStartDate.split('-')[0]
        return null
      }).filter(Boolean))].sort().reverse()
    }

    const filteredItems = computed(() => {
      let result = items.value
      if (vendorFilter.value) {
        result = filterByVendor(result, vendorFilter.value)
      }
      if (yearFilter.value) {
        result = filterByYear(result, yearFilter.value)
      }
      if (typeFilter.value) {
        result = result.filter(item => item.type === typeFilter.value)
      }
      return result
    })

    const paginatedItems = computed(() => {
      const start = (currentPage.value - 1) * pageSize
      return filteredItems.value.slice(start, start + pageSize)
    })

    // Group items: parent items with their child component items
    const groupedItems = computed(() => {
      const allItems = filteredItems.value
      const allRequests = borrowingService.getAllRequests()
      const childItemIds = new Set()

      // Find items whose approved request has a parentRequestId
      allItems.forEach(item => {
        const req = allRequests.find(r => r.itemID === item.id && r.status === 'Approved')
        if (req && req.parentRequestId) {
          childItemIds.add(item.id)
        }
      })

      const groups = []
      allItems.forEach(item => {
        if (childItemIds.has(item.id)) return // skip children
        const req = allRequests.find(r => r.itemID === item.id && r.status === 'Approved')
        const children = []
        if (req) {
          // Find child requests linked to this parent request
          const childReqs = allRequests.filter(r => r.parentRequestId === req.id && r.status === 'Approved')
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

    const handleReturnItem = (item) => {
      if (window.confirm(`Are you sure you want to confirm the return of "${item.name}" (${item.id})?`)) {
        const req = borrowingService.getAllRequests().find(
          r => r.itemID === item.id && r.status === 'Approved'
        )
        if (req) {
          borrowingService.returnItem(req.id)
        }
        // Show location update card
        returnedItem.value = item
        newLocation.value = item.location || 'Lab A'
        showLocationCard.value = true
        loadLentOutItems()
      }
    }

    const saveLocation = () => {
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
        inventoryService.updateItem(returnedItem.value.id, { location: loc })
        // Also update location for child component items
        if (returnedItem.value.fixedComponents && returnedItem.value.fixedComponents.length > 0) {
          returnedItem.value.fixedComponents.forEach(compID => {
            const comp = inventoryService.getItemById(compID)
            if (comp) {
              inventoryService.updateItem(comp.id, { location: loc })
            }
          })
        }
        showLocationCard.value = false
        returnedItem.value = null
        otherLocation.value = ''
        loadLentOutItems()
      }
    }

    const exportFiltered = () => {
      exportToExcel(filteredItems.value, 'lent_out_items.xlsx')
    }

    onMounted(() => {
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
      filteredItems,
      paginatedItems,
      groupedItems,
      sortedGroups,
      paginatedGroups,
      toggleSort,
      getSortIcon,
      typeFilter,
      sortField,
      sortDir,
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
    }
  }
}
</script>

<style scoped>
@import '../index.css';
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
