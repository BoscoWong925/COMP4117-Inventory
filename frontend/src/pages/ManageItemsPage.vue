<template>
  <div class="p-6">
    <!-- ========== TABLE VIEW ========== -->
    <template v-if="!showForm">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold">Manage Inventory Items</h2>
        <div class="gap-2 flex flex-wrap">
          <button @click="showFilterPanel = !showFilterPanel" class="btn btn-outline-primary">
            {{ showFilterPanel ? 'Hide Filters' : 'Show Filters' }}
          </button>
          <label class="btn btn-outline-primary cursor-pointer">
            Import Excel
            <input type="file" accept=".xlsx,.xls" @change="handleImport" class="hidden" />
          </label>
          <button @click="exportItems" class="btn">Export to Excel</button>
          <button @click="openNewItemForm" class="btn btn-outline-primary">
            Add New Item
          </button>
        </div>
      </div>

      <!-- Search Filter Panel -->
      <div v-if="showFilterPanel" class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-sm font-semibold text-gray-700">Search &amp; Filter</h3>
          <button @click="clearFilters" class="text-xs px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500">Clear All</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <!-- ID (text) -->
          <div>
            <label class="block text-gray-600 text-xs font-medium mb-1">Item ID</label>
            <input v-model="searchFilters.id" type="text" class="form-input text-sm" placeholder="e.g. INV-001" />
          </div>
          <!-- Name (text) -->
          <div>
            <label class="block text-gray-600 text-xs font-medium mb-1">Name</label>
            <input v-model="searchFilters.name" type="text" class="form-input text-sm" placeholder="Search name..." />
          </div>
          <!-- Type (select) -->
          <div>
            <label class="block text-gray-600 text-xs font-medium mb-1">Type</label>
            <select v-model="searchFilters.type" class="form-select text-sm">
              <option value="">All Types</option>
              <option v-for="t in itemTypes" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <!-- Category (select) -->
          <div>
            <label class="block text-gray-600 text-xs font-medium mb-1">Category</label>
            <select v-model="searchFilters.category" class="form-select text-sm">
              <option value="">All Categories</option>
              <option v-for="c in mutableCategories.filter(x => x !== 'Other')" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <!-- Status (select) -->
          <div>
            <label class="block text-gray-600 text-xs font-medium mb-1">Status</label>
            <select v-model="searchFilters.status" class="form-select text-sm">
              <option value="">All Statuses</option>
              <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <!-- Location (select) -->
          <div>
            <label class="block text-gray-600 text-xs font-medium mb-1">Location</label>
            <select v-model="searchFilters.location" class="form-select text-sm">
              <option value="">All Locations</option>
              <option v-for="l in mutableLocations.filter(x => x !== 'Other')" :key="l" :value="l">{{ l }}</option>
            </select>
          </div>
          <!-- Vendor (select) -->
          <div>
            <label class="block text-gray-600 text-xs font-medium mb-1">Vendor</label>
            <select v-model="searchFilters.vendor" class="form-select text-sm">
              <option value="">All Vendors</option>
              <option v-for="v in uniqueVendors" :key="v" :value="v">{{ v }}</option>
            </select>
          </div>
          <!-- Supplier (text) -->
          <div>
            <label class="block text-gray-600 text-xs font-medium mb-1">Supplier</label>
            <input v-model="searchFilters.supplier" type="text" class="form-input text-sm" placeholder="Search supplier..." />
          </div>
          <!-- University ID (text) -->
          <div>
            <label class="block text-gray-600 text-xs font-medium mb-1">University ID</label>
            <input v-model="searchFilters.universityID" type="text" class="form-input text-sm" placeholder="Search uni ID..." />
          </div>
          <!-- Warranty End (date) -->
          <div>
            <label class="block text-gray-600 text-xs font-medium mb-1">Warranty End</label>
            <input v-model="searchFilters.warrantyEnd" type="date" class="form-input text-sm" />
          </div>
          <!-- Description (text) -->
          <div>
            <label class="block text-gray-600 text-xs font-medium mb-1">Description</label>
            <input v-model="searchFilters.description" type="text" class="form-input text-sm" placeholder="Search description..." />
          </div>
        </div>
      </div>

      <!-- Import Results Message -->
      <div v-if="importMessage" :class="`mb-4 p-4 rounded ${importSuccess ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`">
        {{ importMessage }}
        <button @click="importMessage = ''" class="ml-2 font-bold">&times;</button>
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
              <th class="border p-2 text-left cursor-pointer select-none hover:bg-gray-300" @click="toggleSort('type')">
                Type <span class="sort-icon">{{ getSortIcon('type') }}</span>
              </th>
              <th class="border p-2 text-left cursor-pointer select-none hover:bg-gray-300" @click="toggleSort('status')">
                Status <span class="sort-icon">{{ getSortIcon('status') }}</span>
              </th>
              <th class="border p-2 text-left cursor-pointer select-none hover:bg-gray-300" @click="toggleSort('location')">
                Location <span class="sort-icon">{{ getSortIcon('location') }}</span>
              </th>
              <th class="border p-2 text-left cursor-pointer select-none hover:bg-gray-300" @click="toggleSort('supplier')">
                Supplier <span class="sort-icon">{{ getSortIcon('supplier') }}</span>
              </th>
              <th class="border p-2 text-left cursor-pointer select-none hover:bg-gray-300" @click="toggleSort('warrantyEnd')">
                Warranty End <span class="sort-icon">{{ getSortIcon('warrantyEnd') }}</span>
              </th>
              <th class="border p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in paginatedItems" :key="item.id">
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
              <td class="border p-2">{{ formatDate(item.warrantyEnd) }}</td>
              <td class="border p-2 text-center">
                <button
                  @click="handleEdit(item)"
                  class="btn btn-outline-success text-sm"
                >
                  Edit
                </button>
                <button
                  @click="handleDelete(item.id)"
                  class="btn btn-outline-danger text-sm ml-2"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <PaginationControl
          v-model:currentPage="currentPage"
          :totalItems="sortedItems.length"
          :pageSize="pageSize"
        />
      </div>

      <!-- Delete Block Modal -->
      <DeleteBlockModal
        :show="showDeleteBlock"
        message="This item is currently in use (lent out) and cannot be deleted. Please return it first."
        @close="showDeleteBlock = false"
      />
    </template>

    <!-- ========== FULL-PAGE FORM VIEW ========== -->
    <template v-if="showForm">
      <div class="max-w-3xl mx-auto pt-8">
        <div class="flex items-center justify-between mb-2">
          <button @click="showForm = false; resetForm()" class="text-gray-500 hover:text-gray-800 text-lg px-3 py-1 rounded hover:bg-gray-100">
            &larr; Back
          </button>
          <button
            v-if="editingItem"
            type="button"
            @click="deleteWhileEditing"
            title="Delete this item"
            class="btn btn-outline-danger text-sm"
          >
            Delete Item
          </button>
        </div>
        <h2 class="text-2xl font-bold mb-6">
          {{ editingItem ? 'Edit Item' : 'Add New Item' }}
        </h2>

        <!-- Invoice Scanner Header -->
        <div class="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-lg">
          <h4 class="text-lg font-bold text-red-700 mb-3">📄 Invoice Scanner</h4>
          
          <!-- Invoice Input Mode Selection -->
          <div class="flex gap-3">
            <button
              type="button"
              @click="invoiceMode = 'upload'"
              :class="`flex-1 px-4 py-3 rounded-lg font-semibold transition transform hover:scale-105 ${invoiceMode === 'upload' ? 'bg-red-600 text-white shadow-lg' : 'bg-white text-red-600 border-2 border-red-300 hover:bg-red-50'}`"
            >
              📁 Upload Invoice
            </button>
            <button
              type="button"
              @click="invoiceMode = 'camera'"
              :class="`flex-1 px-4 py-3 rounded-lg font-semibold transition transform hover:scale-105 ${invoiceMode === 'camera' ? 'bg-red-600 text-white shadow-lg' : 'bg-white text-red-600 border-2 border-red-300 hover:bg-red-50'}`"
            >
              📷 Take Photo
            </button>
          </div>
        </div>

        <!-- Invoice Upload Section -->
        <div v-if="invoiceMode === 'upload'" class="mb-6 p-6 border-2 border-red-300 rounded-lg bg-white">
          <label class="block text-gray-700 font-semibold mb-4">Upload Invoice File</label>
          
          <div 
            @drop.prevent="handleInvoiceDrop"
            @dragover.prevent="isDraggingInvoice = true"
            @dragleave="isDraggingInvoice = false"
            :class="`p-8 border-3 border-dashed rounded-lg text-center cursor-pointer transition ${isDraggingInvoice ? 'border-red-600 bg-red-100' : 'border-red-300 bg-red-50 hover:bg-red-100'}`"
          >
            <input 
              type="file" 
              ref="invoiceInput"
              @change="handleInvoiceUpload"
              accept="image/*,.pdf"
              class="hidden"
            />
            <div @click="$refs.invoiceInput.click()">
              <p class="text-4xl mb-3">📷</p>
              <p class="text-gray-800 font-semibold mb-2">{{ isDraggingInvoice ? 'Drop invoice here' : 'Click to upload or drag & drop' }}</p>
              <p class="text-sm text-gray-600 mb-4">PNG, JPG, PDF (Max 10MB)</p>
              <div class="p-3 bg-white border-2 border-red-400 rounded-lg inline-block">
                <button 
                  type="button"
                  class="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition transform hover:scale-105 shadow-md hover:shadow-lg"
                >
                  📁 Browse Files
                </button>
              </div>
            </div>
          </div>

          <!-- Upload Preview -->
          <div v-if="uploadedImage" class="mt-6 p-4 border-2 border-green-300 rounded-lg bg-green-50">
            <p class="text-sm font-semibold text-green-700 mb-3">✓ Invoice Preview:</p>
            <img :src="uploadedImage" class="w-full max-h-72 rounded border border-green-300 object-contain bg-white" />
            <p v-if="invoiceFileData" class="text-xs text-gray-600 mt-2">{{ invoiceFileData.name }} • {{ (invoiceFileData.size / 1024).toFixed(2) }} KB</p>
          </div>
        </div>

        <!-- Invoice Camera Section -->
        <div v-if="invoiceMode === 'camera'" class="mb-6 p-6 border-2 border-red-300 rounded-lg bg-white">
          <label class="block text-gray-700 font-semibold mb-4">Capture Invoice with Camera</label>
          
          <!-- Camera Feed with Large Display -->
          <div class="bg-black border-4 border-red-500 rounded-lg overflow-hidden mb-4" style="aspect-ratio: 4/3; max-height: 500px;">
            <video
              v-if="cameraActive"
              ref="invoiceVideoElement"
              class="w-full h-full object-cover"
              autoplay
              playsinline
            ></video>
            <div v-else class="w-full h-full bg-gray-900 flex items-center justify-center">
              <div class="text-center">
                <p class="text-4xl mb-3">📷</p>
                <p class="text-gray-400 text-lg">Camera ready</p>
              </div>
            </div>
          </div>

          <!-- Camera Controls with Box -->
          <div class="mb-4 p-4 border-2 border-red-400 rounded-lg bg-red-50">
            <p class="text-sm font-semibold text-red-700 mb-3">Camera Controls:</p>
            <div class="flex gap-2">
              <button
                v-if="!cameraActive"
                type="button"
                @click="startInvoiceCamera"
                class="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition transform hover:scale-105 shadow-md hover:shadow-lg"
                :disabled="invoiceCameraStarting"
              >
                {{ invoiceCameraStarting ? '⏳ Starting...' : '▶️ Start Camera' }}
              </button>
              <button
                v-else
                type="button"
                @click="stopInvoiceCamera"
                class="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition transform hover:scale-105 shadow-md hover:shadow-lg"
              >
                ⏹️ Stop Camera
              </button>
              <button
                v-if="cameraActive"
                type="button"
                @click="captureInvoicePhoto"
                class="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition transform hover:scale-105 shadow-md hover:shadow-lg"
                :disabled="ocrProcessing"
              >
                {{ ocrProcessing ? '⏳ Processing...' : '📸 Capture' }}
              </button>
            </div>
          </div>

          <!-- Captured Image Preview -->
          <div v-if="uploadedImage" class="p-4 border-2 border-green-300 rounded-lg bg-green-50">
            <p class="text-sm font-semibold text-green-700 mb-3">✓ Captured Invoice Preview:</p>
            <img :src="uploadedImage" class="w-full max-h-72 rounded border border-green-300 object-contain bg-white" />
          </div>
        </div>

        <!-- Processing Status -->
        <div v-if="ocrProcessing" class="mb-6 p-6 border-2 border-blue-400 rounded-lg bg-blue-50">
          <div class="flex items-center justify-center gap-3 mb-4">
            <div class="animate-spin h-6 w-6 border-3 border-blue-500 border-t-transparent rounded-full"></div>
            <span class="text-lg font-semibold text-blue-700">Processing Invoice... {{ ocrProgress }}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3">
            <div class="bg-blue-500 h-3 rounded-full transition-all duration-300" :style="{ width: ocrProgress + '%' }"></div>
          </div>
        </div>

        <!-- Success/Error Message -->
        <div v-if="ocrMessage && !ocrProcessing" :class="`mb-6 p-4 rounded-lg border-2 font-semibold ${ocrSuccess ? 'bg-green-50 border-green-400 text-green-700' : 'bg-red-50 border-red-400 text-red-700'}`">
          {{ ocrMessage }}
        </div>

        <!-- Invoice Preview (when editing) -->
        <div v-if="editingItem && invoiceFileData" class="mb-6 p-4 border-2 border-blue-400 rounded-lg bg-blue-50">
          <p class="text-sm font-semibold text-blue-700 mb-3">📎 Invoice Attached:</p>
          <img 
            v-if="uploadedImage" 
            :src="uploadedImage" 
            class="w-full max-h-64 rounded border-2 border-blue-300 object-contain bg-white mb-4" 
          />
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-700 font-medium">{{ invoiceFileData.name }}</span>
              <span class="text-xs text-gray-500">({{ (invoiceFileData.size / 1024).toFixed(2) }} KB)</span>
            </div>
            <div class="flex gap-2 p-3 bg-white border-2 border-blue-300 rounded-lg">
              <button 
                type="button"
                @click="viewInvoice"
                class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition font-medium shadow-md hover:shadow-lg"
              >
                👁️ View
              </button>
              <button 
                type="button"
                @click="downloadInvoice"
                class="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition font-medium shadow-md hover:shadow-lg"
              >
                ⬇️ Download
              </button>
            </div>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="grid grid-cols-2 gap-4 pr-2">
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
            <DropdownWithOther
              v-model="formData.category"
              :options="mutableCategories"
              placeholder="Enter new category..."
              @add-option="addCategory"
            />
          </div>

          <div>
            <label class="block text-gray-700 text-sm font-medium mb-1">Status</label>
            <select v-model="formData.status" class="form-select">
              <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <div>
            <label class="block text-gray-700 text-sm font-medium mb-1">Location</label>
            <DropdownWithOther
              v-model="formData.location"
              :options="mutableLocations"
              placeholder="Enter new location..."
              @add-option="addLocationOption"
            />
          </div>

          <div>
            <label class="block text-gray-700 text-sm font-medium mb-1">Department ID</label>
            <input
              type="text"
              v-model="formData.departmentID"
              class="form-input"
              placeholder="e.g. COMP"
            />
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
              v-model="formData.warrantyEnd"
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

          <div class="col-span-2 flex gap-3 justify-end p-4 bg-gray-50 border-2 border-gray-300 rounded-lg">
            <button type="submit" class="btn btn-outline-success px-6 py-2 shadow-md hover:shadow-lg">
              ✓ {{ editingItem ? 'Update' : 'Add' }} Item
            </button>
            <button
              type="button"
              @click="showForm = false; resetForm()"
              class="btn btn-outline-secondary px-6 py-2 shadow-md hover:shadow-lg"
            >
              ✕ Cancel
            </button>
          </div>
        </form>

        <!-- Delete Block Modal (also available in form view) -->
        <DeleteBlockModal
          :show="showDeleteBlock"
          message="This item is currently in use (lent out) and cannot be deleted. Please return it first."
          @close="showDeleteBlock = false"
        />
      </div>
    </template>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import * as XLSX from 'xlsx'
import * as Tesseract from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist'
import { inventoryService } from '../utils/services'
import { formatDate, getStatusColor, exportToExcel } from '../utils/helpers'
import PaginationControl from '../components/PaginationControl.vue'
import DropdownWithOther from '../components/DropdownWithOther.vue'
import DeleteBlockModal from '../components/DeleteBlockModal.vue'

const itemTypes = ["Hardware", "Software", "Component"]
const itemCategories = ["Computer", "Display", "Memory", "Storage", "Peripherals", "Other"]
const defaultLocations = ["Lab A", "Lab B", "Lab C", "Office", "Storage Room", "Shelf 1", "Shelf 2", "Other"]
const statuses = ["Available", "In-use", "Missing", "Dispose", "Not Available", "Transferred"]

// Load persisted custom locations / categories from localStorage
const loadSavedList = (key, defaults) => {
  try {
    const saved = localStorage.getItem(key)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Merge: keep all defaults + any saved custom values, ensure "Other" stays last
      const base = defaults.filter(d => d !== 'Other')
      const custom = parsed.filter(v => !defaults.includes(v))
      return [...base, ...custom, 'Other']
    }
  } catch (e) { /* ignore */ }
  return [...defaults]
}

const savePersistList = (key, list) => {
  try { localStorage.setItem(key, JSON.stringify(list)) } catch (e) { /* ignore */ }
}

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
  warrantyEnd: '',
  invoiceFile: null,
  departmentID: 'COMP'
}

export default {
  components: { PaginationControl, DropdownWithOther, DeleteBlockModal },
  setup() {
    const items = ref([])
    const showForm = ref(false)
    const editingItem = ref(null)
    const formData = ref({ ...defaultFormData })
    const importMessage = ref('')
    const importSuccess = ref(false)
    const invoiceInput = ref(null)
    const invoiceVideoElement = ref(null)
    const invoiceMode = ref('upload')
    const cameraActive = ref(false)
    const invoiceCameraStarting = ref(false)
    const isDraggingInvoice = ref(false)
    const ocrProcessing = ref(false)
    const ocrProgress = ref(0)
    const ocrMessage = ref('')
    const ocrSuccess = ref(false)
    const invoiceFileData = ref(null)
    const invoiceRawFile = ref(null)  // Store actual File object for upload
    const currentPage = ref(1)
    const pageSize = 10
    const showDeleteBlock = ref(false)
    const sortField = ref('')
    const sortDir = ref('asc')
    const mutableLocations = ref(loadSavedList('inv_custom_locations', defaultLocations))
    const mutableCategories = ref(loadSavedList('inv_custom_categories', itemCategories))
    let ocrWorker = null
    let invoiceCameraStream = null

    const showFilterPanel = ref(false)
    const searchFilters = ref({
      id: '', name: '', type: '', category: '', status: '',
      location: '', vendor: '', supplier: '', universityID: '',
      warrantyEnd: '', description: ''
    })

    const uniqueVendors = computed(() => {
      const vendors = items.value.map(i => i.vendor || i.supplier).filter(Boolean)
      return [...new Set(vendors)].sort()
    })

    const clearFilters = () => {
      searchFilters.value = {
        id: '', name: '', type: '', category: '', status: '',
        location: '', vendor: '', supplier: '', universityID: '',
        warrantyEnd: '', description: ''
      }
    }

    // Watch filters to reset page
    watch(searchFilters, () => {
      currentPage.value = 1
    }, { deep: true })

    const filteredItems = computed(() => {
      let result = items.value
      const f = searchFilters.value
      if (f.id) {
        const q = f.id.toLowerCase()
        result = result.filter(i => i.id.toLowerCase().includes(q))
      }
      if (f.name) {
        const q = f.name.toLowerCase()
        result = result.filter(i => i.name.toLowerCase().includes(q))
      }
      if (f.type) {
        result = result.filter(i => i.type === f.type)
      }
      if (f.category) {
        result = result.filter(i => i.category === f.category)
      }
      if (f.status) {
        result = result.filter(i => i.status === f.status)
      }
      if (f.location) {
        result = result.filter(i => i.location === f.location)
      }
      if (f.vendor) {
        result = result.filter(i => (i.vendor || i.supplier) === f.vendor)
      }
      if (f.supplier) {
        const q = f.supplier.toLowerCase()
        result = result.filter(i => (i.supplier || '').toLowerCase().includes(q))
      }
      if (f.universityID) {
        const q = f.universityID.toLowerCase()
        result = result.filter(i => (i.universityID || '').toLowerCase().includes(q))
      }
      if (f.warrantyEnd) {
        result = result.filter(i => i.warrantyEnd && i.warrantyEnd.startsWith(f.warrantyEnd))
      }
      if (f.description) {
        const q = f.description.toLowerCase()
        result = result.filter(i => (i.description || '').toLowerCase().includes(q))
      }
      return result
    })

    const paginatedItems = computed(() => {
      const start = (currentPage.value - 1) * pageSize
      return sortedItems.value.slice(start, start + pageSize)
    })

    const sortedItems = computed(() => {
      const list = [...filteredItems.value]
      if (!sortField.value) return list
      list.sort((a, b) => {
        const valA = a[sortField.value] || ''
        const valB = b[sortField.value] || ''
        if (sortDir.value === 'asc') return valA < valB ? -1 : valA > valB ? 1 : 0
        return valA > valB ? -1 : valA < valB ? 1 : 0
      })
      return list
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

    const uploadedImage = computed(() => {
      return invoiceFileData.value ? invoiceFileData.value.data : null
    })

    const addLocationOption = (val) => {
      if (!mutableLocations.value.includes(val)) {
        // Insert before "Other" (last element)
        const idx = mutableLocations.value.indexOf('Other')
        if (idx >= 0) {
          mutableLocations.value.splice(idx, 0, val)
        } else {
          mutableLocations.value.push(val)
        }
        savePersistList('inv_custom_locations', mutableLocations.value)
      }
    }

    const addCategory = (val) => {
      if (!mutableCategories.value.includes(val)) {
        const idx = mutableCategories.value.indexOf('Other')
        if (idx >= 0) {
          mutableCategories.value.splice(idx, 0, val)
        } else {
          mutableCategories.value.push(val)
        }
        savePersistList('inv_custom_categories', mutableCategories.value)
      }
    }

    const openNewItemForm = () => {
      resetForm()
      showForm.value = true
    }

    const loadItems = async () => {
      try {
        const allItems = await inventoryService.getAllItems()
        items.value = allItems
      } catch (e) {
        console.error('Failed to load items:', e)
      }
    }

    const resetForm = () => {
      formData.value = { ...defaultFormData }
      editingItem.value = null
      invoiceRawFile.value = null
      invoiceFileData.value = null
      ocrMessage.value = ''
      ocrSuccess.value = false
    }

    const handleSubmit = async () => {
      if (!formData.value.name || !formData.value.universityID) {
        alert('Please fill in all required fields')
        return
      }

      // Check if invoice is required (only for new items)
      if (!editingItem.value && !formData.value.invoiceFile) {
        alert('Invoice file is required. Please upload an invoice photo or PDF.')
        return
      }

      try {
        // Prepare form data without the base64 invoiceFile blob (backend expects a real file)
        const submitData = { ...formData.value }
        delete submitData.invoiceFile
        
        if (editingItem.value) {
          await inventoryService.updateItem(editingItem.value.id, submitData, invoiceRawFile.value)
        } else {
          await inventoryService.addItem(submitData, invoiceRawFile.value)
        }
      } catch (e) {
        console.error('Failed to submit item:', e)
      }

      resetForm()
      showForm.value = false
      loadItems()
    }

    const handleEdit = (item) => {
      formData.value = { ...item }
      editingItem.value = item
      
      // Load stored invoice file if it exists
      if (item.invoiceFile) {
        invoiceFileData.value = item.invoiceFile
        ocrMessage.value = `✅ Invoice ${item.invoiceFile.name} loaded`
        ocrSuccess.value = true
      } else {
        invoiceFileData.value = null
        ocrMessage.value = ''
        ocrSuccess.value = false
      }
      
      showForm.value = true
    }

    const viewInvoice = () => {
      if (!invoiceFileData.value) {
        alert('No invoice file available')
        return
      }
      
      // Open invoice in new window/tab
      const link = document.createElement('a')
      link.href = invoiceFileData.value.data
      link.target = '_blank'
      link.download = invoiceFileData.value.name
      link.click()
    }

    const downloadInvoice = () => {
      if (!invoiceFileData.value) {
        alert('No invoice file available')
        return
      }
      
      // Download invoice file
      const link = document.createElement('a')
      link.href = invoiceFileData.value.data
      link.download = invoiceFileData.value.name
      link.click()
    }

    const handleDelete = async (id) => {
      // Block deletion if item is in-use
      try {
        const item = await inventoryService.getItemById(id)
        if (item && item.status === 'In-use') {
          showDeleteBlock.value = true
          return
        }
      } catch (e) {
        console.error('Failed to check item:', e)
      }
      if (window.confirm('Are you sure you want to delete this item?')) {
        try {
          await inventoryService.deleteItem(id)
        } catch (e) {
          console.error('Failed to delete item:', e)
        }
        loadItems()
      }
    }

    const deleteWhileEditing = async () => {
      if (editingItem.value && editingItem.value.status === 'In-use') {
        showDeleteBlock.value = true
        return
      }
      if (window.confirm('Delete this item?')) {
        try {
          await inventoryService.deleteItem(editingItem.value.id)
        } catch (e) {
          console.error('Failed to delete item:', e)
        }
        showForm.value = false
        resetForm()
        loadItems()
      }
    }

    const exportItems = () => {
      exportToExcel(items.value, 'inventory_items.xlsx')
    }

    const handleImport = (event) => {
      const file = event.target.files[0]
      if (!file) return

      // Use server-side bulk import instead of parsing + creating one-by-one
      const doImport = async () => {
        try {
          importMessage.value = 'Importing... Please wait.'
          importSuccess.value = true
          const result = await inventoryService.importItems(file)
          importMessage.value = `Successfully imported ${result.imported} items from Excel`
          importSuccess.value = true
          loadItems()
        } catch (error) {
          importMessage.value = `Error importing file: ${error.message}`
          importSuccess.value = false
        }
      }
      doImport()
      event.target.value = '' // Reset file input
    }

    const applyOCRData = (extractedData) => {
      // Auto-fill form with OCR extracted data
      formData.value = {
        ...defaultFormData,
        ...extractedData
      }
      showForm.value = true
      importMessage.value = '✅ Invoice data extracted! Please review and complete the form.'
      importSuccess.value = true
    }

    const extractTextFromImage = async (imageFile) => {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = async (e) => {
          try {
            ocrProcessing.value = true
            ocrProgress.value = 0
            ocrMessage.value = 'Reading invoice...'

            const result = await Tesseract.recognize(
              e.target.result,
              'eng',
              {
                logger: (m) => {
                  if (m.status === 'recognizing') {
                    ocrProgress.value = Math.round(m.progress * 100)
                  }
                }
              }
            )

            const text = result.data.text
            const extractedData = smartExtractData(text)
            
            ocrProcessing.value = false
            ocrSuccess.value = true
            ocrMessage.value = '✅ Invoice data extracted! Form fields have been pre-filled.'
            
            // Auto-fill form fields - PRESERVE invoiceFile!
            formData.value = {
              ...defaultFormData,
              ...extractedData,
              invoiceFile: invoiceFileData.value // Keep the stored invoice file!
            }
            
            resolve(extractedData)
          } catch (error) {
            ocrProcessing.value = false
            ocrSuccess.value = false
            // Important: File is already saved before OCR attempt, so show warning but allow save
            ocrMessage.value = `⚠️ Could not extract text from image, but invoice is saved. Error: ${error.message}`
            // Keep the invoice file that was already saved
            resolve({})
          }
        }
        reader.readAsDataURL(imageFile)
      })
    }

    const extractTextFromPDF = async (pdfFile) => {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = async (e) => {
          try {
            ocrProcessing.value = true
            ocrProgress.value = 0
            ocrMessage.value = 'Reading PDF...'

            const pdf = await pdfjsLib.getDocument(e.target.result).promise
            let fullText = ''

            for (let i = 1; i <= pdf.numPages; i++) {
              ocrProgress.value = Math.round((i / pdf.numPages) * 100)
              const page = await pdf.getPage(i)
              const textContent = await page.getTextContent()
              fullText += textContent.items.map(item => item.str).join(' ')
            }

            const extractedData = smartExtractData(fullText)
            
            ocrProcessing.value = false
            ocrSuccess.value = true
            ocrMessage.value = '✅ PDF data extracted! Form fields have been pre-filled.'
            
            // Auto-fill form fields - PRESERVE invoiceFile!
            formData.value = {
              ...defaultFormData,
              ...extractedData,
              invoiceFile: invoiceFileData.value // Keep the stored invoice file!
            }
            
            resolve(extractedData)
          } catch (error) {
            ocrProcessing.value = false
            ocrSuccess.value = false
            // Important: File is already saved before OCR attempt, so show warning but allow save
            ocrMessage.value = `⚠️ Could not extract text from PDF, but invoice is saved. Error: ${error.message}`
            // Keep the invoice file that was already saved
            resolve({})
          }
        }
        reader.readAsArrayBuffer(pdfFile)
      })
    }

    const smartExtractData = (text) => {
      const extracted = {}

      // Invoice Number pattern (INV-2024-001, Invoice #123, etc)
      const invoiceMatch = text.match(/(?:invoice\s*[#:]?\s*|inv[#:]?\s*)([A-Z0-9\-]+)/i)
      if (invoiceMatch) {
        extracted.invoiceNumber = invoiceMatch[1]
      }

      // Supplier/Company name (Look for common patterns)
      const supplierMatch = text.match(/(?:supplier|vendor|company|from|by)[\s:]+([A-Z][A-Za-z\s&.,'-]+?)(?=\n|$|invoice|date)/i)
      if (supplierMatch) {
        extracted.supplier = supplierMatch[1].trim()
      }

      // Price pattern (supports $, €, £)
      const priceMatch = text.match(/[$€£]\s*([0-9]+[.,][0-9]{2}|[0-9]+)/i)
      if (priceMatch) {
        extracted.price = priceMatch[1]
      }

      // Warranty period (months or years)
      const warrantyMatch = text.match(/warranty[\s:]*([0-9]+)\s*(month|year|yr|mo)/i)
      if (warrantyMatch) {
        const months = warrantyMatch[2].toLowerCase().includes('year') ? parseInt(warrantyMatch[1]) * 12 : parseInt(warrantyMatch[1])
        extracted.warrantyMonths = months
        
        // Calculate warranty end date
        const today = new Date()
        const endDate = new Date(today.setMonth(today.getMonth() + months))
        extracted.warrantyEnd = endDate.toISOString().split('T')[0]
        extracted.warrantyStartDate = new Date().toISOString().split('T')[0]
      }

      // Item description or model
      const modelMatch = text.match(/(?:model|product|item)[\s:]+([A-Za-z0-9\s\-]+)/i)
      if (modelMatch) {
        extracted.name = modelMatch[1].trim().substring(0, 100)
      }

      return extracted
    }

    const handleInvoiceUpload = async (event) => {
      const file = event.target.files[0]
      if (!file) return
      
      ocrMessage.value = ''
      invoiceRawFile.value = file  // Store actual File object for upload
      
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        ocrSuccess.value = false
        ocrMessage.value = '❌ File too large. Maximum size is 10MB.'
        invoiceRawFile.value = null
        return
      }

      // Step 1: Store file as base64 FIRST - wait for it to complete
      await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          invoiceFileData.value = {
            data: e.target.result, // Base64 encoded file
            name: file.name,
            type: file.type,
            size: file.size
          }
          // Store in form data
          formData.value.invoiceFile = invoiceFileData.value
          ocrMessage.value = `✅ Invoice ${file.name} saved successfully!`
          ocrSuccess.value = true
          resolve() // COMPLETE STORAGE BEFORE PROCEEDING
        }
        reader.readAsDataURL(file)
      })

      // Step 2: THEN attempt OCR (optional - file is already saved)
      if (file.type === 'application/pdf') {
        await extractTextFromPDF(file)
      } else if (file.type.startsWith('image/')) {
        await extractTextFromImage(file)
      }
      
      event.target.value = '' // Reset file input
    }

    const handleInvoiceDrop = (event) => {
      isDraggingInvoice.value = false
      const files = event.dataTransfer.files
      if (files.length > 0) {
        invoiceInput.value.files = files
        handleInvoiceUpload({ target: invoiceInput.value })
      }
    }

    const startInvoiceCamera = async () => {
      try {
        invoiceCameraStarting.value = true
        invoiceCameraStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        })
        invoiceVideoElement.value.srcObject = invoiceCameraStream
        cameraActive.value = true
        ocrMessage.value = '✓ Camera ready. Click "Capture" to take invoice photo.'
        ocrSuccess.value = true
      } catch (error) {
        ocrMessage.value = `❌ Camera error: ${error.message}`
        ocrSuccess.value = false
        console.error('Camera error:', error)
      } finally {
        invoiceCameraStarting.value = false
      }
    }

    const stopInvoiceCamera = () => {
      if (invoiceCameraStream) {
        invoiceCameraStream.getTracks().forEach(track => track.stop())
        invoiceCameraStream = null
      }
      cameraActive.value = false
      ocrMessage.value = ''
    }

    const captureInvoicePhoto = async () => {
      if (!invoiceVideoElement.value) return

      try {
        ocrProcessing.value = true
        ocrMessage.value = '⏳ Capturing and processing invoice...'

        const canvas = document.createElement('canvas')
        canvas.width = invoiceVideoElement.value.videoWidth
        canvas.height = invoiceVideoElement.value.videoHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(invoiceVideoElement.value, 0, 0)

        const imageData = canvas.toDataURL('image/jpeg')
        
        // Store the captured image
        invoiceFileData.value = {
          data: imageData,
          name: `invoice_${Date.now()}.jpg`,
          type: 'image/jpeg',
          size: imageData.length
        }
        formData.value.invoiceFile = invoiceFileData.value

        ocrSuccess.value = true
        ocrMessage.value = '✅ Invoice captured! Processing text...'

        // Process the captured image - need to convert dataURL to blob
        const blob = await (await fetch(imageData)).blob()
        const file = new File([blob], 'invoice.jpg', { type: 'image/jpeg' })
        await extractTextFromImage(file)
        
        stopInvoiceCamera()
      } catch (error) {
        ocrMessage.value = `❌ Error capturing invoice: ${error.message}`
        ocrSuccess.value = false
        console.error('Error:', error)
      } finally {
        ocrProcessing.value = false
      }
    }

    onMounted(() => {
      loadItems()
      // Set PDF.js worker - use local node_modules path
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).href
      } catch (e) {
        // Fallback to jsdelivr CDN
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`
      }
    })

    onUnmounted(() => {
      // Cleanup OCR worker if needed
      if (ocrWorker) {
        ocrWorker.terminate()
      }
      // Cleanup camera stream
      stopInvoiceCamera()
    })

    return {
      items,
      showForm,
      editingItem,
      formData,
      importMessage,
      importSuccess,
      invoiceInput,
      invoiceVideoElement,
      invoiceMode,
      cameraActive,
      invoiceCameraStarting,
      invoiceFileData,
      isDraggingInvoice,
      ocrProcessing,
      ocrProgress,
      ocrMessage,
      ocrSuccess,
      itemTypes,
      itemCategories,
      defaultLocations,
      statuses,
      currentPage,
      pageSize,
      paginatedItems,
      sortedItems,
      filteredItems,
      toggleSort,
      getSortIcon,
      sortField,
      sortDir,
      uploadedImage,
      showDeleteBlock,
      showFilterPanel,
      searchFilters,
      uniqueVendors,
      clearFilters,
      mutableLocations,
      mutableCategories,
      addLocationOption,
      addCategory,
      openNewItemForm,
      deleteWhileEditing,
      resetForm,
      handleSubmit,
      handleEdit,
      handleDelete,
      exportItems,
      handleImport,
      handleInvoiceUpload,
      handleInvoiceDrop,
      startInvoiceCamera,
      stopInvoiceCamera,
      captureInvoicePhoto,
      viewInvoice,
      downloadInvoice,
      formatDate,
      getStatusColor,
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
