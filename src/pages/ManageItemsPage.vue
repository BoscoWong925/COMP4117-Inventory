<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">Manage Inventory Items</h2>
      <div class="gap-2 flex flex-wrap">
        <label class="btn cursor-pointer">
          Import Excel
          <input type="file" accept=".xlsx,.xls" @change="handleImport" class="hidden" />
        </label>
        <button @click="exportItems" class="btn">Export to Excel</button>
        <button @click="resetForm(); showForm = true" class="btn">
          Add New Item
        </button>
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
            <td class="border p-2">{{ formatDate(item.warrantyEnd) }}</td>
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
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold">
            {{ editingItem ? 'Edit Item' : 'Add New Item' }}
          </h3>
          <div>
            <button
              v-if="editingItem"
              type="button"
              @click="deleteWhileEditing"
              title="Delete this item"
              class="cross-btn"
            >
              &times;
            </button>
          </div>
        </div>

        <!-- Invoice Upload Section -->
        <div class="mb-6 p-4 border-2 border-dashed border-red-300 rounded-lg bg-red-50">
          <label class="block text-gray-700 font-semibold mb-3">📄 Invoice Upload *REQUIRED</label>
          <p class="text-sm text-gray-600 mb-3">Upload invoice photo or PDF (required - used for OCR extraction and storage)</p>
          
          <div 
            @drop.prevent="handleInvoiceDrop"
            @dragover.prevent="isDraggingInvoice = true"
            @dragleave="isDraggingInvoice = false"
            :class="`p-4 border-2 rounded-lg text-center cursor-pointer transition ${isDraggingInvoice ? 'border-red-500 bg-red-100' : 'border-red-300 bg-white'}`"
          >
            <input 
              type="file" 
              ref="invoiceInput"
              @change="handleInvoiceUpload"
              accept="image/*,.pdf"
              class="hidden"
            />
            <p class="text-gray-600 mb-2">{{ isDraggingInvoice ? '📁 Drop your invoice here' : '📷 Click or drag invoice photo/PDF here' }}</p>
            <button 
              type="button"
              @click="$refs.invoiceInput.click()"
              class="text-red-600 hover:text-red-800 text-sm font-semibold"
            >
              Choose File
            </button>
          </div>

          <!-- Processing Status -->
          <div v-if="ocrProcessing" class="mt-3">
            <div class="flex items-center gap-2">
              <div class="animate-spin h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full"></div>
              <span class="text-sm text-red-600">Processing invoice... {{ ocrProgress }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div class="bg-red-600 h-2 rounded-full" :style="{ width: ocrProgress + '%' }"></div>
            </div>
          </div>

          <!-- Success/Error Message -->
          <div v-if="ocrMessage && !ocrProcessing" :class="`mt-3 p-3 rounded text-sm ${ocrSuccess ? 'bg-green-100 border border-green-300 text-green-700' : 'bg-red-100 border border-red-300 text-red-700'}`">
            {{ ocrMessage }}
          </div>

          <!-- Invoice Preview (when editing) -->
          <div v-if="editingItem && invoiceFileData" class="mt-4 p-3 bg-blue-50 border border-blue-300 rounded">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-blue-600 font-semibold">📎 Invoice Attached:</span>
                <span class="text-sm text-gray-700">{{ invoiceFileData.name }}</span>
                <span class="text-xs text-gray-500">({{ (invoiceFileData.size / 1024).toFixed(2) }} KB)</span>
              </div>
              <div class="flex gap-2">
                <button 
                  type="button"
                  @click="viewInvoice"
                  class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  👁️ View
                </button>
                <button 
                  type="button"
                  @click="downloadInvoice"
                  class="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  ⬇️ Download
                </button>
              </div>
            </div>
          </div>
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
import { ref, onMounted, onUnmounted } from 'vue'
import * as XLSX from 'xlsx'
import * as Tesseract from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist'
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
  warrantyEnd: '',
  invoiceFile: null // Store the invoice file (base64 or blob)
}

export default {
  setup() {
    const items = ref([])
    const showForm = ref(false)
    const editingItem = ref(null)
    const formData = ref({ ...defaultFormData })
    const importMessage = ref('')
    const importSuccess = ref(false)
    const invoiceInput = ref(null)
    const isDraggingInvoice = ref(false)
    const ocrProcessing = ref(false)
    const ocrProgress = ref(0)
    const ocrMessage = ref('')
    const ocrSuccess = ref(false)
    const invoiceFileData = ref(null) // Store invoice file data
    let ocrWorker = null

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

      // Check if invoice is required (only for new items)
      if (!editingItem.value && !formData.value.invoiceFile) {
        alert('Invoice file is required. Please upload an invoice photo or PDF.')
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

    const handleDelete = (id) => {
      if (window.confirm('Are you sure you want to delete this item?')) {
        inventoryService.deleteItem(id)
        loadItems()
      }
    }

    const exportItems = () => {
      exportToExcel(items.value, 'inventory_items.xlsx')
    }

    const handleImport = (event) => {
      const file = event.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)

          if (jsonData.length === 0) {
            importMessage.value = 'No data found in the Excel file'
            importSuccess.value = false
            return
          }

          let imported = 0
          jsonData.forEach(row => {
            // Map Excel columns to item properties
            const newItem = {
              name: row.name || row.Name || row['Item Name'] || '',
              universityID: row.universityID || row['University ID'] || row.UniversityID || `UNI-IMPORT-${Date.now()}`,
              type: row.type || row.Type || 'Hardware',
              category: row.category || row.Category || 'Other',
              status: row.status || row.Status || 'Available',
              location: row.location || row.Location || 'Other',
              description: row.description || row.Description || '',
              supplier: row.supplier || row.Supplier || row.Vendor || '',
              motherID: row.motherID || row['Mother ID'] || null,
              invoiceNumber: row.invoiceNumber || row['Invoice Number'] || '',
              warrantyEnd: row.warrantyEnd || row['Warranty End'] || null
            }

            if (newItem.name) {
              inventoryService.addItem(newItem)
              imported++
            }
          })

          importMessage.value = `Successfully imported ${imported} items from Excel`
          importSuccess.value = true
          loadItems()
        } catch (error) {
          importMessage.value = `Error importing file: ${error.message}`
          importSuccess.value = false
        }
      }
      reader.readAsArrayBuffer(file)
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
      
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        ocrSuccess.value = false
        ocrMessage.value = '❌ File too large. Maximum size is 10MB.'
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
    })

    return {
      items,
      showForm,
      editingItem,
      formData,
      importMessage,
      importSuccess,
      invoiceInput,
      invoiceFileData,
      isDraggingInvoice,
      ocrProcessing,
      ocrProgress,
      ocrMessage,
      ocrSuccess,
      itemTypes,
      itemCategories,
      locations,
      statuses,
      resetForm,
      handleSubmit,
      handleEdit,
      handleDelete,
      exportItems,
      handleImport,
      handleInvoiceUpload,
      handleInvoiceDrop,
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
</style>
