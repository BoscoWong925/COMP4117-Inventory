<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">Search Available Items</h2>
      <button @click="exportItems" class="btn">Export to Excel</button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div>
        <label class="block text-gray-700 text-sm font-medium mb-2">Search</label>
        <input
          type="text"
          placeholder="Search by name, ID, or description..."
          v-model="searchText"
          class="form-input"
        />
      </div>

      <div>
        <label class="block text-gray-700 text-sm font-medium mb-2">Category</label>
        <select v-model="categoryFilter" class="form-select">
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </div>
    </div>

    <div v-if="filteredItems.length === 0" class="bg-blue-50 p-4 rounded text-center">
      No items match your search
    </div>
    <div v-else class="space-y-3">
      <div v-for="item in filteredItems" :key="item.id" class="border border-gray-300 rounded p-4 bg-white hover:shadow-md transition">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-xs text-gray-500 uppercase">Item ID</p>
            <p class="font-bold text-lg">{{ item.id }}</p>
            <p class="text-sm font-medium mt-2">{{ item.name }}</p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs text-gray-500 uppercase">Type</p>
              <p class="font-medium">{{ item.type }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 uppercase">Category</p>
              <p class="font-medium">{{ item.category }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 uppercase">Status</p>
              <span :class="`px-2 py-1 rounded text-sm ${getStatusColor(item.status)}`">
                {{ item.status }}
              </span>
            </div>
            <div>
              <p class="text-xs text-gray-500 uppercase">Location</p>
              <p class="font-medium">{{ item.location }}</p>
            </div>
          </div>
        </div>

        <div v-if="item.description" class="mt-3 pt-3 border-t border-gray-200">
          <p class="text-xs text-gray-500 uppercase">Description</p>
          <p class="text-sm">{{ item.description }}</p>
        </div>

        <div v-if="item.warrantyEndDate" class="mt-2 text-xs text-gray-600">
          Warranty ends: {{ formatDate(item.warrantyEndDate) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { inventoryService } from '../utils/services'
import { formatDate, getStatusColor, exportToExcel } from '../utils/helpers'

export default {
  setup() {
    const items = ref([])
    const searchText = ref('')
    const categoryFilter = ref('All')

    const loadAvailableItems = () => {
      const available = inventoryService.getAvailableItems()
      items.value = available
    }

    const categories = computed(() => ['All', ...new Set(items.value.map(i => i.category))])

    const filteredItems = computed(() => {
      let result = items.value
      if (searchText.value) {
        result = result.filter(item =>
          item.name.toLowerCase().includes(searchText.value.toLowerCase()) ||
          item.id.toLowerCase().includes(searchText.value.toLowerCase()) ||
          item.description.toLowerCase().includes(searchText.value.toLowerCase())
        )
      }
      if (categoryFilter.value !== 'All') {
        result = result.filter(item => item.category === categoryFilter.value)
      }
      return result
    })

    const exportItems = () => {
      exportToExcel(filteredItems.value, 'available_items.xlsx')
    }

    onMounted(() => {
      loadAvailableItems()
    })

    return {
      items,
      searchText,
      categoryFilter,
      categories,
      filteredItems,
      exportItems,
      formatDate,
      getStatusColor,
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
