<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">Search Available Items</h2>
      <button @click="exportItems" class="btn">Export to Excel</button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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

      <div>
        <label class="block text-gray-700 text-sm font-medium mb-2">Location</label>
        <select v-model="locationFilter" class="form-select">
          <option v-for="loc in locations" :key="loc" :value="loc">{{ loc }}</option>
        </select>
      </div>
    </div>

    <div v-if="filteredItems.length === 0" class="bg-blue-50 p-4 rounded text-center">
      No items match your search
    </div>
    <div v-else class="space-y-3">
      <div 
        v-for="item in paginatedItems" 
        :key="item.id" 
        @click="showItemDetail(item)"
        class="border border-gray-300 rounded p-4 bg-white hover:shadow-md transition cursor-pointer"
      >
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

        <div v-if="item.warrantyEnd" class="mt-2 text-xs text-gray-600">
          Warranty ends: {{ formatDate(item.warrantyEnd) }}
        </div>
      </div>

      <PaginationControl v-model:currentPage="currentPage" :totalItems="filteredItems.length" :pageSize="pageSize" />
    </div>

    <!-- Item Detail Modal -->
    <div v-if="selectedItem" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto z-50">
      <div class="bg-white rounded-lg p-6 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-xl font-bold">{{ selectedItem.name }}</h3>
          <button @click="selectedItem = null" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p class="text-xs text-gray-500 uppercase">Item ID</p>
            <p class="font-medium">{{ selectedItem.id }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 uppercase">University ID</p>
            <p class="font-medium">{{ selectedItem.universityID }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 uppercase">Type</p>
            <p class="font-medium">{{ selectedItem.type }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 uppercase">Category</p>
            <p class="font-medium">{{ selectedItem.category }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 uppercase">Status</p>
            <span :class="`px-2 py-1 rounded text-sm ${getStatusColor(selectedItem.status)}`">
              {{ selectedItem.status }}
            </span>
          </div>
          <div>
            <p class="text-xs text-gray-500 uppercase">Location</p>
            <p class="font-medium">{{ selectedItem.location }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 uppercase">Supplier</p>
            <p class="font-medium">{{ selectedItem.supplier || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 uppercase">Warranty End</p>
            <p class="font-medium">{{ formatDate(selectedItem.warrantyEnd) }}</p>
          </div>
        </div>

        <div v-if="selectedItem.description" class="mb-4">
          <p class="text-xs text-gray-500 uppercase mb-1">Description</p>
          <p class="text-sm bg-gray-50 p-3 rounded">{{ selectedItem.description }}</p>
        </div>

        <!-- Linked Components (Mother/Child) -->
        <div v-if="selectedItem.motherID" class="mb-4 p-3 bg-blue-50 rounded">
          <p class="text-xs text-blue-600 uppercase mb-1">Part of Computer</p>
          <p class="font-medium">Mother ID: {{ selectedItem.motherID }}</p>
        </div>

        <div v-if="linkedComponents.length > 0" class="mb-4">
          <p class="text-xs text-gray-500 uppercase mb-2">Linked Components (borrowed together)</p>
          <div class="space-y-2">
            <div v-for="comp in linkedComponents" :key="comp.id" class="bg-gray-50 p-3 rounded flex justify-between items-center">
              <div>
                <p class="font-medium">{{ comp.name }}</p>
                <p class="text-xs text-gray-500">{{ comp.id }} - {{ comp.category }}</p>
              </div>
              <span :class="`px-2 py-1 rounded text-xs ${getStatusColor(comp.status)}`">
                {{ comp.status }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex justify-end">
          <button @click="selectedItem = null" class="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { inventoryService } from '../utils/services'
import { formatDate, getStatusColor, exportToExcel } from '../utils/helpers'
import PaginationControl from '../components/PaginationControl.vue'

export default {
  components: { PaginationControl },
  setup() {
    const items = ref([])
    const searchText = ref('')
    const categoryFilter = ref('All')
    const locationFilter = ref('All')
    const selectedItem = ref(null)
    const linkedComponents = ref([])
    const currentPage = ref(1)
    const pageSize = 10

    // Reset to page 1 when filters change
    watch([searchText, categoryFilter, locationFilter], () => {
      currentPage.value = 1
    })

    const loadAvailableItems = async () => {
      try {
        const available = await inventoryService.getAvailableItems()
        items.value = available
      } catch (e) {
        console.error('Failed to load available items:', e)
      }
    }

    const categories = computed(() => ['All', ...new Set(items.value.map(i => i.category))])
    const locations = computed(() => ['All', ...new Set(items.value.map(i => i.location))])

    const filteredItems = computed(() => {
      let result = items.value
      if (searchText.value) {
        result = result.filter(item =>
          item.name.toLowerCase().includes(searchText.value.toLowerCase()) ||
          item.id.toLowerCase().includes(searchText.value.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(searchText.value.toLowerCase()))
        )
      }
      if (categoryFilter.value !== 'All') {
        result = result.filter(item => item.category === categoryFilter.value)
      }
      if (locationFilter.value !== 'All') {
        result = result.filter(item => item.location === locationFilter.value)
      }
      return result
    })

    const paginatedItems = computed(() => {
      const start = (currentPage.value - 1) * pageSize
      return filteredItems.value.slice(start, start + pageSize)
    })

    const showItemDetail = async (item) => {
      selectedItem.value = item
      // Load linked components if this is a mother item
      if (item.fixedComponents && item.fixedComponents.length > 0) {
        const comps = []
        for (const id of item.fixedComponents) {
          try {
            const comp = await inventoryService.getItemById(id)
            if (comp) comps.push(comp)
          } catch (e) { /* ignore */ }
        }
        linkedComponents.value = comps
      } else {
        linkedComponents.value = []
      }
    }

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
      locationFilter,
      categories,
      locations,
      filteredItems,
      paginatedItems,
      currentPage,
      pageSize,
      selectedItem,
      linkedComponents,
      showItemDetail,
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
