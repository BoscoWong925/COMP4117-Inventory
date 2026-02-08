<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">Lent-Out Items Filter</h2>
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

      <div class="flex items-end">
        <button
          @click="vendorFilter = ''; yearFilter = ''"
          class="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 w-full"
        >
          Clear Filters
        </button>
      </div>
    </div>

    <div v-if="filteredItems.length === 0" class="bg-blue-50 p-4 rounded text-center">
      No lent-out items match your filters
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full border-collapse border border-gray-300 table-striped">
        <thead class="bg-gray-200">
          <tr>
            <th class="border p-2 text-left">ID</th>
            <th class="border p-2 text-left">Name</th>
            <th class="border p-2 text-left">Category</th>
            <th class="border p-2 text-left">Borrower</th>
            <th class="border p-2 text-left">Vendor</th>
            <th class="border p-2 text-left">Location</th>
            <th class="border p-2 text-left">Warranty End</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredItems" :key="item.id">
            <td class="border p-2">{{ item.id }}</td>
            <td class="border p-2">{{ item.name }}</td>
            <td class="border p-2">{{ item.category }}</td>
            <td class="border p-2">{{ item.currentBorrower }}</td>
            <td class="border p-2">{{ item.supplier }}</td>
            <td class="border p-2">{{ item.location }}</td>
            <td class="border p-2">{{ formatDate(item.warrantyEnd) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { inventoryService } from '../utils/services'
import { formatDate, exportToExcel, getUniqueVendors, filterByYear, filterByVendor } from '../utils/helpers'

export default {
  setup() {
    const items = ref([])
    const vendorFilter = ref('')
    const yearFilter = ref('')
    const vendors = ref([])
    const years = ref([])

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
      return result
    })

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
      filteredItems,
      exportFiltered,
      formatDate,
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
