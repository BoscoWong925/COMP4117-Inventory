<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">Manage Inventory Items</h2>
      <div class="gap-2 flex">
        <button @click="exportItems" class="btn">Export to Excel</button>
        <button @click="resetForm; showForm = true" class="btn">
          Add New Item
        </button>
      </div>
    </div>

    <div v-if="items.length === 0" class="bg-blue-50 p-4 rounded text-center">
      No items in inventory
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full border-collapse border border-gray-300 table-striped">
        <thead class="bg-gray-200">
          <tr>
            <th class="border p-2 text-left">ID</th>
            <th class="border p-2 text-left">Name</th>
            <th class="border p-2 text-left">Type</th>
            <th class="border p-2 text-left">Status</th>
            <th class="border p-2 text-left">Location</th>
            <th class="border p-2 text-left">Supplier</th>
            <th class="border p-2 text-left">Warranty End</th>
            <th class="border p-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td class="border p-2">{{ item.id }}</td>
            <td class="border p-2">{{ item.name }}</td>
            <td class="border p-2">{{ item.type }}</td>
            <td class="border p-2">
              <span :class="`px-2 py-1 rounded text-sm ${getStatusColor(item.status)}`">
                {{ item.status }}
              </span>
            </td>
            <td class="border p-2">{{ item.location }}</td>
            <td class="border p-2">{{ item.supplier }}</td>
            <td class="border p-2">{{ formatDate(item.warrantyEndDate) }}</td>
            <td class="border p-2 text-center">
              <button
                @click="handleEdit(item)"
                class="btn text-sm"
              >
                Edit
              </button>
              <button
                @click="handleDelete(item.id)"
                class="btn-danger text-sm ml-2"
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showForm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto">
      <div class="bg-white rounded-lg p-6 max-w-2xl w-full my-8">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold">
            {{ editingItem ? 'Edit Item' : 'Add New Item' }}
          </h3>
          <button
            @click="showForm = false"
            class="cross-btn"
          >
            &times;
          </button>
        </div>
        <form @submit.prevent="handleSubmit" class="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2">
          <div>
            <label class="block text-gray-700 text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              required
              v-model="formData.name"
              class="form-input"
            />
          </div>

          <div>
            <label class="block text-gray-700 text-sm font-medium mb-1">University ID *</label>
            <input
              type="text"
              required
              v-model="formData.universityID"
              class="form-input"
            />
          </div>

          <div>
            <label class="block text-gray-700 text-sm font-medium mb-1">Type</label>
            <select v-model="formData.type" class="form-select">
              <option v-for="t in itemTypes" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>

          <div>
            <label class="block text-gray-700 text-sm font-medium mb-1">Category</label>
            <select v-model="formData.category" class="form-select">
              <option v-for="c in itemCategories" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>

          <div>
            <label class="block text-gray-700 text-sm font-medium mb-1">Status</label>
            <select v-model="formData.status" class="form-select">
              <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <div>
            <label class="block text-gray-700 text-sm font-medium mb-1">Location</label>
            <select v-model="formData.location" class="form-select">
              <option v-for="l in locations" :key="l" :value="l">{{ l }}</option>
            </select>
          </div>

          <div>
            <label class="block text-gray-700 text-sm font-medium mb-1">Mother ID</label>
            <input
              type="text"
              v-model="formData.motherID"
              class="form-input"
              placeholder="For components only"
            />
          </div>

          <div>
            <label class="block text-gray-700 text-sm font-medium mb-1">Supplier</label>
            <input
              type="text"
              v-model="formData.supplier"
              class="form-input"
            />
          </div>

          <div>
            <label class="block text-gray-700 text-sm font-medium mb-1">Invoice #</label>
            <input
              type="text"
              v-model="formData.invoiceNumber"
              class="form-input"
            />
          </div>

          <div>
            <label class="block text-gray-700 text-sm font-medium mb-1">Warranty Start</label>
            <input
              type="date"
              v-model="formData.warrantyStartDate"
              class="form-input"
            />
          </div>

          <div>
            <label class="block text-gray-700 text-sm font-medium mb-1">Warranty End</label>
            <input
              type="date"
              v-model="formData.warrantyEndDate"
              class="form-input"
            />
          </div>

          <div class="col-span-2">
            <label class="block text-gray-700 text-sm font-medium mb-1">Description</label>
            <textarea
              v-model="formData.description"
              class="form-input"
              rows="3"
            />
          </div>

          <div class="col-span-2 flex gap-2 justify-end">
            <button type="submit" class="btn">
              {{ editingItem ? 'Update' : 'Add' }} Item
            </button>
            <button
              type="button"
              @click="showForm = false; resetForm()"
              class="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { inventoryService } from '../utils/services'
import { formatDate, getStatusColor, exportToExcel } from '../utils/helpers'

const itemTypes = ["Hardware", "Software", "Component"]
const itemCategories = ["Computer", "Display", "Memory", "Storage", "Peripherals", "Other"]
const locations = ["Lab A", "Lab B", "Lab C", "Office", "Storage Room", "Shelf 1", "Shelf 2", "Other"]
const statuses = ["Available", "In-use", "Missing", "Dispose", "Not Available", "Transferred"]

const defaultFormData = {
  name: '',
  type: 'Hardware',
  category: 'Computer',
  status: 'Available',
  location: 'Lab A',
  description: '',
  motherID: '',
  universityID: '',
  supplier: '',
  invoiceNumber: '',
  warrantyStartDate: '',
  warrantyEndDate: ''
}

export default {
  setup() {
    const items = ref([])
    const showForm = ref(false)
    const editingItem = ref(null)
    const formData = ref({ ...defaultFormData })

    const loadItems = () => {
      const allItems = inventoryService.getAllItems()
      items.value = allItems
    }

    const resetForm = () => {
      formData.value = { ...defaultFormData }
      editingItem.value = null
    }

    const handleSubmit = () => {
      if (!formData.value.name || !formData.value.universityID) {
        alert('Please fill in all required fields')
        return
      }

      if (editingItem.value) {
        inventoryService.updateItem(editingItem.value.id, formData.value)
      } else {
        inventoryService.addItem(formData.value)
      }

      resetForm()
      showForm.value = false
      loadItems()
    }

    const handleEdit = (item) => {
      formData.value = { ...item }
      editingItem.value = item
      showForm.value = true
    }

    const handleDelete = (id) => {
      if (window.confirm('Are you sure you want to delete this item?')) {
        inventoryService.deleteItem(id)
        loadItems()
      }
    }

    const exportItems = () => {
      exportToExcel(items.value, 'inventory_items.xlsx')
    }

    onMounted(() => {
      loadItems()
    })

    return {
      items,
      showForm,
      editingItem,
      formData,
      itemTypes,
      itemCategories,
      locations,
      statuses,
      resetForm,
      handleSubmit,
      handleEdit,
      handleDelete,
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
