<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto z-50">
    <div class="bg-white rounded-lg p-6 max-w-3xl w-full my-8">
      <h3 class="text-xl font-bold mb-4">Invoice Photo/PDF Upload & OCR</h3>
      
      <!-- Tab Navigation -->
      <div class="flex gap-4 mb-6 border-b">
        <button
          @click="activeTab = 'upload'"
          :class="`pb-2 px-4 ${activeTab === 'upload' ? 'border-b-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-600'}`"
        >
          Upload Invoice
        </button>
        <button
          @click="activeTab = 'camera'"
          :class="`pb-2 px-4 ${activeTab === 'camera' ? 'border-b-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-600'}`"
        >
          Camera Capture
        </button>
        <button
          @click="activeTab = 'preview'"
          :class="`pb-2 px-4 ${activeTab === 'preview' ? 'border-b-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-600'} ${!ocrResults ? 'opacity-50 cursor-not-allowed' : ''}`"
          :disabled="!ocrResults"
        >
          OCR Results
        </button>
      </div>

      <!-- Upload Tab -->
      <div v-if="activeTab === 'upload'" class="space-y-4">
        <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition">
          <input
            type="file"
            ref="fileInput"
            @change="handleFileUpload"
            accept=".jpg,.jpeg,.png,.pdf,.gif"
            class="hidden"
          />
          <button
            @click="$refs.fileInput.click()"
            class="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Click to upload or drag & drop
          </button>
          <p class="text-gray-500 text-sm mt-2">JPG, PNG, PDF, GIF up to 10MB</p>
        </div>
        <div v-if="uploadedFile" class="bg-blue-50 p-3 rounded flex justify-between items-center">
          <span>📄 {{ uploadedFile.name }}</span>
          <button @click="clearFile" class="text-red-600 hover:text-red-700">Remove</button>
        </div>
      </div>

      <!-- Camera Tab (Mobile-friendly) -->
      <div v-if="activeTab === 'camera'" class="space-y-4">
        <p class="text-gray-600 text-sm">📱 Take a photo of the invoice using your device camera</p>
        <div v-if="!showCameraPreview" class="flex gap-2">
          <button @click="startCamera" class="flex-1 btn">Start Camera</button>
          <button @click="useFrontCamera = !useFrontCamera" class="btn">
            {{ useFrontCamera ? '🔄 Back Camera' : '🔄 Front Camera' }}
          </button>
        </div>
        <div v-else class="space-y-3">
          <video
            ref="cameraVideo"
            playsinline
            class="w-full bg-black rounded-lg max-h-96"
          ></video>
          <div class="flex gap-2">
            <button @click="capturePhoto" class="flex-1 btn bg-green-600 hover:bg-green-700">📸 Capture Photo</button>
            <button @click="stopCamera" class="flex-1 btn bg-red-600 hover:bg-red-700">Stop Camera</button>
          </div>
        </div>
        <canvas ref="captureCanvas" class="hidden"></canvas>
      </div>

      <!-- Preview Tab (OCR Results) -->
      <div v-if="activeTab === 'preview'" class="space-y-4">
        <div v-if="processing" class="text-center py-8">
          <div class="inline-block">
            <div class="animate-spin inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
          </div>
          <p class="text-gray-600 mt-3">Extracting text from invoice ({{ ocrProgress }}%)...</p>
          <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div :style="{width: ocrProgress + '%'}" class="bg-blue-600 h-2 rounded-full transition-all"></div>
          </div>
        </div>

        <div v-else-if="ocrResults" class="space-y-3">
          <div v-if="previewImage" class="max-h-64 overflow-y-auto border rounded-lg p-3">
            <img :src="previewImage" class="w-full rounded" />
          </div>

          <div class="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm text-yellow-800">
            ⚠️ Please review and correct the extracted information before saving
          </div>

          <div class="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2">
            <div>
              <label class="text-sm font-medium text-gray-700">Item Name</label>
              <input v-model="extractedData.name" class="form-input text-sm" placeholder="e.g., Dell Monitor" />
            </div>
            <div>
              <label class="text-sm font-medium text-gray-700">University ID</label>
              <input v-model="extractedData.universityID" class="form-input text-sm" placeholder="e.g., UNI-001" />
            </div>
            <div>
              <label class="text-sm font-medium text-gray-700">Supplier</label>
              <input v-model="extractedData.supplier" class="form-input text-sm" placeholder="e.g., Dell Inc" />
            </div>
            <div>
              <label class="text-sm font-medium text-gray-700">Invoice #</label>
              <input v-model="extractedData.invoiceNumber" class="form-input text-sm" placeholder="e.g., INV-2024-001" />
            </div>
            <div>
              <label class="text-sm font-medium text-gray-700">Price</label>
              <input v-model="extractedData.price" type="number" class="form-input text-sm" placeholder="e.g., 299.99" />
            </div>
            <div>
              <label class="text-sm font-medium text-gray-700">Warranty Period (months)</label>
              <input v-model="extractedData.warrantyMonths" type="number" class="form-input text-sm" placeholder="e.g., 24" />
            </div>
            <div class="col-span-2">
              <label class="text-sm font-medium text-gray-700">Description</label>
              <textarea v-model="extractedData.description" class="form-input text-sm" rows="2" placeholder="Additional notes from invoice..."></textarea>
            </div>
          </div>

          <div class="bg-gray-50 p-3 rounded max-h-40 overflow-y-auto">
            <p class="text-xs font-semibold text-gray-700 mb-2">Extracted Raw Text:</p>
            <p class="text-xs text-gray-600 whitespace-pre-wrap font-mono">{{ ocrResults }}</p>
          </div>
        </div>
      </div>

      <!-- Error Messages -->
      <div v-if="errorMessage" class="bg-red-50 border border-red-200 text-red-700 p-3 rounded mt-4">
        ❌ {{ errorMessage }}
      </div>

      <!-- Success Message -->
      <div v-if="successMessage" class="bg-green-50 border border-green-200 text-green-700 p-3 rounded mt-4">
        ✅ {{ successMessage }}
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-2 justify-end mt-6">
        <button
          @click="processOCR"
          v-if="uploadedFile && !processing && !ocrResults"
          class="btn bg-blue-600 hover:bg-blue-700"
        >
          🔍 Process with OCR
        </button>
        <button
          @click="applyExtractedData"
          v-if="ocrResults && !processing"
          class="btn bg-green-600 hover:bg-green-700"
        >
          ✓ Use This Data
        </button>
        <button
          @click="resetModal"
          v-if="ocrResults && !processing"
          class="btn bg-gray-400 hover:bg-gray-500"
        >
          Start Over
        </button>
        <button
          @click="closeModal"
          class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { Ocr } from 'tesseract.js'

export default {
  props: {
    show: Boolean
  },
  emits: ['close', 'data-extracted'],
  setup(props, { emit }) {
    const fileInput = ref(null)
    const cameraVideo = ref(null)
    const captureCanvas = ref(null)
    const uploadedFile = ref(null)
    const activeTab = ref('upload')
    const processing = ref(false)
    const ocrProgress = ref(0)
    const ocrResults = ref('')
    const previewImage = ref('')
    const errorMessage = ref('')
    const successMessage = ref('')
    const showCameraPreview = ref(false)
    const useFrontCamera = ref(true)
    let cameraStream = null

    const extractedData = ref({
      name: '',
      universityID: '',
      supplier: '',
      invoiceNumber: '',
      price: '',
      warrantyMonths: 24,
      description: ''
    })

    const handleFileUpload = (event) => {
      const file = event.target.files[0]
      if (!file) return

      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        errorMessage.value = 'File size must be less than 10MB'
        return
      }

      uploadedFile.value = file
      errorMessage.value = ''

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        previewImage.value = e.target.result
      }
      reader.readAsDataURL(file)
    }

    const startCamera = async () => {
      try {
        const constraints = {
          video: {
            facingMode: useFrontCamera.value ? 'user' : 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        }
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints)
        if (cameraVideo.value) {
          cameraVideo.value.srcObject = cameraStream
          showCameraPreview.value = true
          errorMessage.value = ''
        }
      } catch (error) {
        errorMessage.value = `Camera access denied: ${error.message}`
      }
    }

    const capturePhoto = () => {
      if (!cameraVideo.value || !captureCanvas.value) return

      const context = captureCanvas.value.getContext('2d')
      captureCanvas.value.width = cameraVideo.value.videoWidth
      captureCanvas.value.height = cameraVideo.value.videoHeight
      context.drawImage(cameraVideo.value, 0, 0)

      captureCanvas.value.toBlob((blob) => {
        uploadedFile.value = new File([blob], `invoice-${Date.now()}.jpg`, { type: 'image/jpeg' })
        previewImage.value = captureCanvas.value.toDataURL('image/jpeg')
        stopCamera()
        activeTab.value = 'preview'
        successMessage.value = 'Photo captured! Now process with OCR.'
        setTimeout(() => processOCR(), 500)
      })
    }

    const stopCamera = () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
        cameraStream = null
      }
      showCameraPreview.value = false
    }

    const clearFile = () => {
      uploadedFile.value = null
      previewImage.value = ''
      errorMessage.value = ''
    }

    const processOCR = async () => {
      if (!uploadedFile.value) {
        errorMessage.value = 'No file selected'
        return
      }

      processing.value = true
      ocrProgress.value = 0
      errorMessage.value = ''

      try {
        const reader = new FileReader()
        reader.onload = async (e) => {
          try {
            // Initialize Tesseract worker
            const { createWorker } = await import('tesseract.js')
            const worker = await createWorker()

            // Set up progress listener
            worker.on('progress', (progress) => {
              ocrProgress.value = Math.round(progress.progress * 100)
            })

            // Perform OCR
            const result = await worker.recognize(e.target.result)
            ocrResults.value = result.data.text

            // Extract key information
            extractInvoiceData(result.data.text)

            activeTab.value = 'preview'
            await worker.terminate()
          } catch (error) {
            errorMessage.value = `OCR processing failed: ${error.message}`
          } finally {
            processing.value = false
          }
        }
        reader.readAsDataURL(uploadedFile.value)
      } catch (error) {
        errorMessage.value = `Error processing file: ${error.message}`
        processing.value = false
      }
    }

    const extractInvoiceData = (text) => {
      // Simple extraction patterns - can be enhanced
      const lines = text.split('\n')
      
      // Try to extract invoice number (common patterns)
      const invoiceMatch = text.match(/invoice\s*[#:]?\s*([A-Z0-9\-]+)/i)
      if (invoiceMatch) extractedData.value.invoiceNumber = invoiceMatch[1].trim()

      // Try to extract supplier name (first few words often contain company name)
      const firstLine = lines.find(l => l.trim().length > 5)
      if (firstLine) {
        extractedData.value.supplier = firstLine.trim().substring(0, 50)
      }

      // Try to extract price (common currency patterns)
      const priceMatch = text.match(/[$€£]\s*([0-9]+[.,][0-9]{2})|([0-9]+[.,][0-9]{2})\s*[$€£]/i)
      if (priceMatch) {
        const price = priceMatch[1] || priceMatch[2]
        extractedData.value.price = parseFloat(price.replace(',', '.'))
      }

      // Look for warranty information
      const warrantyMatch = text.match(/warranty[:\s]*([0-9]+)\s*(month|year|yr)/i)
      if (warrantyMatch) {
        const period = warrantyMatch[1]
        const unit = warrantyMatch[2].toLowerCase()
        extractedData.value.warrantyMonths = unit.startsWith('y') ? period * 12 : period
      }
    }

    const applyExtractedData = () => {
      // Calculate warranty end date
      const startDate = new Date()
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + parseInt(extractedData.value.warrantyMonths || 24), startDate.getDate())

      const formattedData = {
        name: extractedData.value.name,
        universityID: extractedData.value.universityID,
        supplier: extractedData.value.supplier,
        invoiceNumber: extractedData.value.invoiceNumber,
        description: extractedData.value.description,
        warrantyStartDate: startDate.toISOString().split('T')[0],
        warrantyEnd: endDate.toISOString().split('T')[0]
      }

      emit('data-extracted', formattedData)
      successMessage.value = 'Data applied to form!'
      setTimeout(() => closeModal(), 1000)
    }

    const resetModal = () => {
      clearFile()
      ocrResults.value = ''
      previewImage.value = ''
      successMessage.value = ''
      extractedData.value = {
        name: '',
        universityID: '',
        supplier: '',
        invoiceNumber: '',
        price: '',
        warrantyMonths: 24,
        description: ''
      }
      activeTab.value = 'upload'
    }

    const closeModal = () => {
      stopCamera()
      resetModal()
      emit('close')
    }

    onUnmounted(() => {
      stopCamera()
    })

    return {
      fileInput,
      cameraVideo,
      captureCanvas,
      uploadedFile,
      activeTab,
      processing,
      ocrProgress,
      ocrResults,
      previewImage,
      errorMessage,
      successMessage,
      showCameraPreview,
      useFrontCamera,
      extractedData,
      handleFileUpload,
      startCamera,
      capturePhoto,
      stopCamera,
      clearFile,
      processOCR,
      applyExtractedData,
      resetModal,
      closeModal
    }
  }
}
</script>

<style scoped>
.btn {
  padding: 0.5rem 1rem;
  background-color: #2563eb;
  color: white;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.2s;
  border: none;
}

.btn:hover {
  background-color: #1d4ed8;
}

.form-input {
  width: 100%;
  padding: 0.25rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
</style>
