<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click.self="closeModal">
        <div class="modal-container" @click.stop>
          <!-- Drag handle (mobile) -->
          <div class="drag-handle"><span></span></div>

          <!-- Header -->
          <div class="modal-header">
            <div class="header-left">
              <div class="header-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <div>
                <h3 class="header-title">Invoice OCR</h3>
                <p class="header-subtitle">Upload &amp; extract data</p>
              </div>
            </div>
            <button @click="closeModal" class="close-btn" aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- Step Progress -->
          <div class="step-progress">
            <div class="step" :class="{ active: activeTab === 'upload', done: uploadedFile }">
              <span class="step-dot">{{ uploadedFile ? '✓' : '1' }}</span>
              <span class="step-text">Upload</span>
            </div>
            <div class="step-line" :class="{ filled: uploadedFile }"></div>
            <div class="step" :class="{ active: processing, done: ocrResults }">
              <span class="step-dot">{{ ocrResults ? '✓' : '2' }}</span>
              <span class="step-text">Scan</span>
            </div>
            <div class="step-line" :class="{ filled: ocrResults }"></div>
            <div class="step" :class="{ active: activeTab === 'preview' && ocrResults }">
              <span class="step-dot">3</span>
              <span class="step-text">Review</span>
            </div>
          </div>

          <!-- Tab Navigation -->
          <div class="tab-nav">
            <button
              @click="activeTab = 'upload'"
              :class="['tab-btn', activeTab === 'upload' ? 'tab-active' : 'tab-inactive']"
            >
              <svg class="tab-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span class="tab-label">Upload</span>
            </button>
            <button
              @click="activeTab = 'camera'"
              :class="['tab-btn', activeTab === 'camera' ? 'tab-active' : 'tab-inactive']"
            >
              <svg class="tab-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <span class="tab-label">Camera</span>
            </button>
            <button
              @click="activeTab = 'preview'"
              :class="['tab-btn', activeTab === 'preview' ? 'tab-active' : 'tab-inactive', !ocrResults ? 'tab-disabled' : '']"
              :disabled="!ocrResults"
            >
              <svg class="tab-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span class="tab-label">Results</span>
            </button>
          </div>

          <!-- Scrollable Content Area -->
          <div class="modal-body">
            <!-- Upload Tab -->
            <div v-if="activeTab === 'upload'" class="tab-content animate-fade-in">
              <div
                class="upload-zone"
                :class="{ 'upload-zone-active': isDragging }"
                @click="$refs.fileInput.click()"
                @dragover.prevent="isDragging = true"
                @dragleave.prevent="isDragging = false"
                @drop.prevent="handleDrop"
              >
                <input
                  type="file"
                  ref="fileInput"
                  @change="handleFileUpload"
                  accept=".jpg,.jpeg,.png,.pdf,.gif"
                  class="hidden"
                />
                <div class="upload-icon-wrap">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <p class="upload-main-text">Tap or drag to upload</p>
                <p class="upload-sub-text">JPG, PNG, PDF, GIF — max 10 MB</p>
              </div>

              <!-- File preview chip -->
              <Transition name="chip">
                <div v-if="uploadedFile" class="file-chip">
                  <div class="file-chip-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <div class="file-chip-info">
                    <span class="file-chip-name">{{ uploadedFile.name }}</span>
                    <span class="file-chip-size">{{ formatFileSize(uploadedFile.size) }}</span>
                  </div>
                  <button @click.stop="clearFile" class="remove-btn" aria-label="Remove file">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </Transition>

              <!-- Thumbnail preview -->
              <Transition name="chip">
                <div v-if="previewImage && uploadedFile" class="thumb-preview">
                  <img :src="previewImage" alt="Preview" />
                </div>
              </Transition>
            </div>

            <!-- Camera Tab -->
            <div v-if="activeTab === 'camera'" class="tab-content animate-fade-in">
              <p class="cam-hint">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                Position the invoice in frame and capture
              </p>
              <div v-if="!showCameraPreview" class="cam-actions">
                <button @click="startCamera" class="btn-action btn-action-primary">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  Start Camera
                </button>
                <button @click="useFrontCamera = !useFrontCamera" class="btn-action btn-action-ghost">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                  {{ useFrontCamera ? 'Back' : 'Front' }}
                </button>
              </div>
              <div v-else class="cam-live">
                <div class="cam-viewfinder-wrap">
                  <video
                    ref="cameraVideo"
                    playsinline
                    autoplay
                    class="cam-viewfinder"
                  ></video>
                  <div class="cam-corners">
                    <span class="corner tl"></span><span class="corner tr"></span>
                    <span class="corner bl"></span><span class="corner br"></span>
                  </div>
                </div>
                <div class="cam-controls">
                  <button @click="stopCamera" class="btn-action btn-action-ghost">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                    Stop
                  </button>
                  <button @click="capturePhoto" class="btn-capture">
                    <span class="capture-ring"></span>
                  </button>
                  <div style="width: 72px"></div>
                </div>
              </div>
              <canvas ref="captureCanvas" class="hidden"></canvas>
            </div>

            <!-- Preview Tab (OCR Results) -->
            <div v-if="activeTab === 'preview'" class="tab-content animate-fade-in">
              <!-- Processing state -->
              <div v-if="processing" class="processing-state">
                <div class="scanner-anim">
                  <div class="scanner-ring"></div>
                  <svg class="scanner-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                </div>
                <p class="processing-label">Extracting text…</p>
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: ocrProgress + '%' }"></div>
                </div>
                <span class="progress-pct">{{ ocrProgress }}%</span>
              </div>

              <!-- Results -->
              <div v-else-if="ocrResults" class="results-content">
                <div v-if="previewImage" class="result-image-wrap">
                  <img :src="previewImage" alt="Scanned document" />
                </div>

                <div class="info-banner">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  Review and correct extracted data before saving
                </div>

                <!-- Form -->
                <div class="ocr-form-grid">
                  <div class="form-group">
                    <label class="ocr-label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                      Item Name
                    </label>
                    <input v-model="extractedData.name" class="ocr-input" placeholder="e.g., Dell Monitor" />
                  </div>
                  <div class="form-group">
                    <label class="ocr-label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      University ID
                    </label>
                    <input v-model="extractedData.universityID" class="ocr-input" placeholder="e.g., UNI-001" />
                  </div>
                  <div class="form-group">
                    <label class="ocr-label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      Supplier
                    </label>
                    <input v-model="extractedData.supplier" class="ocr-input" placeholder="e.g., Dell Inc" />
                  </div>
                  <div class="form-group">
                    <label class="ocr-label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      Invoice #
                    </label>
                    <input v-model="extractedData.invoiceNumber" class="ocr-input" placeholder="e.g., INV-2024-001" />
                  </div>
                  <div class="form-group">
                    <label class="ocr-label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      Price
                    </label>
                    <input v-model="extractedData.price" type="number" inputmode="decimal" class="ocr-input" placeholder="e.g., 299.99" />
                  </div>
                  <div class="form-group">
                    <label class="ocr-label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      Warranty (months)
                    </label>
                    <input v-model="extractedData.warrantyMonths" type="number" inputmode="numeric" class="ocr-input" placeholder="e.g., 24" />
                  </div>
                  <div class="form-group full-width">
                    <label class="ocr-label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
                      Description
                    </label>
                    <textarea v-model="extractedData.description" class="ocr-input ocr-textarea" rows="2" placeholder="Additional notes…"></textarea>
                  </div>
                </div>

                <!-- Collapsible raw text -->
                <details class="raw-text-section">
                  <summary class="raw-text-toggle">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
                    Raw Extracted Text
                  </summary>
                  <pre class="raw-text-content">{{ ocrResults }}</pre>
                </details>
              </div>
            </div>

            <!-- Toast Messages -->
            <Transition name="toast">
              <div v-if="errorMessage" class="toast toast-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                {{ errorMessage }}
              </div>
            </Transition>
            <Transition name="toast">
              <div v-if="successMessage" class="toast toast-success">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                {{ successMessage }}
              </div>
            </Transition>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button
              @click="processOCR"
              v-if="uploadedFile && !processing && !ocrResults"
              class="footer-btn footer-btn-primary"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Process OCR
            </button>
            <button
              @click="applyExtractedData"
              v-if="ocrResults && !processing"
              class="footer-btn footer-btn-success"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Use Data
            </button>
            <button
              @click="resetModal"
              v-if="ocrResults && !processing"
              class="footer-btn footer-btn-ghost"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Restart
            </button>
            <button
              v-if="!uploadedFile && !ocrResults"
              @click="closeModal"
              class="footer-btn footer-btn-ghost"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import * as Tesseract from 'tesseract.js'

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
    const isDragging = ref(false)
    let cameraStream = null

    const formatFileSize = (bytes) => {
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
      return (bytes / 1048576).toFixed(1) + ' MB'
    }

    const handleDrop = (e) => {
      isDragging.value = false
      const file = e.dataTransfer?.files?.[0]
      if (file) {
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
        if (!allowed.includes(file.type)) {
          errorMessage.value = 'Unsupported file type'
          return
        }
        if (file.size > 10 * 1024 * 1024) {
          errorMessage.value = 'File size must be under 10 MB'
          return
        }
        uploadedFile.value = file
        errorMessage.value = ''
        const reader = new FileReader()
        reader.onload = (ev) => { previewImage.value = ev.target.result }
        reader.readAsDataURL(file)
      }
    }

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
        showCameraPreview.value = true
        await nextTick()
        if (cameraVideo.value) {
          cameraVideo.value.srcObject = cameraStream
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
            console.log('[OCR Modal] Starting Tesseract.recognize...')
            const result = await Tesseract.recognize(
              e.target.result,
              'eng',
              {
                logger: (m) => {
                  if (m.status === 'recognizing text' || m.status === 'recognizing') {
                    ocrProgress.value = Math.round(m.progress * 100)
                  }
                }
              }
            )

            ocrResults.value = result.data.text
            console.log('[OCR Modal] Text extracted:', result.data.text.substring(0, 200))

            // Extract key information
            extractInvoiceData(result.data.text)

            activeTab.value = 'preview'
          } catch (error) {
            console.error('[OCR Modal] Error:', error)
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
      // Enhanced extraction patterns
      const lines = text.split('\n')
      
      // Try to extract invoice number - require # or : delimiter, or INV- prefix
      const invoiceMatch = text.match(/(?:invoice\s*[#:]\s*)([A-Z0-9\-]+)/i) || text.match(/\b(INV[- ]?\d[\w\-]*)/i)
      if (invoiceMatch) extractedData.value.invoiceNumber = invoiceMatch[1].trim()

      // Try to extract supplier name
      const supplierMatch = text.match(/(?:supplier|vendor|company|from|by)[\s:]+([A-Z][A-Za-z\s&.,'-]+?)(?=\n|$|invoice|date)/i)
      if (supplierMatch) {
        extractedData.value.supplier = supplierMatch[1].trim()
      } else {
        const firstLine = lines.find(l => l.trim().length > 5)
        if (firstLine) {
          extractedData.value.supplier = firstLine.trim().substring(0, 50)
        }
      }

      // Try to extract price - prefer Total line (not Subtotal)
      const totalPriceMatch = text.match(/(?:(?:grand\s+)?total|amount\s*due)(?<!sub\s*total)[\s:]*[$€£]\s*([0-9,]+[.][0-9]{2})/i) || text.match(/\btotal[\s:]*[$€£]\s*([0-9,]+[.][0-9]{2})/i)
      const priceMatch = totalPriceMatch || text.match(/[$€£]\s*([0-9,]+[.][0-9]{2})|([0-9,]+[.][0-9]{2})\s*[$€£]/i)
      if (priceMatch) {
        const price = (priceMatch[1] || priceMatch[2]).replace(/,/g, '')
        extractedData.value.price = parseFloat(price)
      }

      // Look for warranty information
      const warrantyMatch = text.match(/warranty[:\s]*([0-9]+)\s*(month|year|yr|mo)/i)
      if (warrantyMatch) {
        const period = warrantyMatch[1]
        const unit = warrantyMatch[2].toLowerCase()
        extractedData.value.warrantyMonths = unit.startsWith('y') ? period * 12 : parseInt(period)
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
      isDragging,
      extractedData,
      formatFileSize,
      handleDrop,
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
/* ============================================================
   Invoice OCR Modal — Glassmorphism / Dark-First / Modern 2026
   ============================================================ */

/* --- Transition Wrappers --- */
.modal-enter-active { transition: opacity 0.25s ease; }
.modal-leave-active  { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .modal-container { animation: slideUp 0.3s cubic-bezier(.22,1,.36,1); }
.modal-leave-active .modal-container { animation: slideDown 0.2s ease-in forwards; }

.toast-enter-active { transition: all 0.3s ease; }
.toast-leave-active  { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }

.chip-enter-active { transition: all 0.3s ease; }
.chip-leave-active  { transition: all 0.2s ease; }
.chip-enter-from, .chip-leave-to { opacity: 0; transform: translateY(-6px) scale(0.95); }

.animate-fade-in { animation: fadeContentIn 0.35s ease both; }

@keyframes slideUp   { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes slideDown { from { transform: translateY(0); }    to { transform: translateY(100%); } }
@keyframes fadeContentIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* --- Overlay --- */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
  padding: 0;
}

/* --- Container --- */
.modal-container {
  background: var(--bg-secondary, #1e293b);
  width: 100%;
  max-height: 95dvh;
  display: flex;
  flex-direction: column;
  border-radius: 1.25rem 1.25rem 0 0;
  overflow: hidden;
  box-shadow: 0 -8px 40px rgba(0,0,0,0.4);
  border-top: 1px solid var(--border-glass, rgba(148,163,184,0.1));
}

@media (min-width: 640px) {
  .modal-overlay { align-items: center; padding: 2rem; }
  .modal-container {
    max-width: 44rem;
    max-height: 88vh;
    border-radius: 1.25rem;
    border: 1px solid var(--border-glass);
    box-shadow: 0 24px 80px rgba(0,0,0,0.5);
    animation: fadeScale 0.25s ease;
  }
  @keyframes fadeScale { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
}

/* --- Drag Handle (mobile) --- */
.drag-handle {
  display: flex;
  justify-content: center;
  padding: 0.5rem 0 0;
  flex-shrink: 0;
}
.drag-handle span {
  width: 2.25rem;
  height: 0.25rem;
  border-radius: 9999px;
  background: var(--text-muted, #64748b);
  opacity: 0.5;
}
@media (min-width: 640px) { .drag-handle { display: none; } }

/* --- Header --- */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.header-icon-wrap {
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.625rem;
  background: var(--accent-glow, rgba(6,153,255,0.25));
  color: var(--accent, #0699ff);
  flex-shrink: 0;
}

.header-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary, #f1f5f9);
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.header-subtitle {
  font-size: 0.72rem;
  color: var(--text-muted, #64748b);
  font-weight: 400;
  line-height: 1.3;
}

.close-btn {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  border: 1px solid var(--border-color, rgba(148,163,184,0.15));
  background: var(--bg-tertiary, #334155);
  color: var(--text-secondary, #94a3b8);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}
.close-btn:hover { background: var(--danger, #ef4444); color: #fff; border-color: transparent; }

/* --- Step Progress --- */
.step-progress {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 0.35rem 1.5rem 0.5rem;
  flex-shrink: 0;
}

.step {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  opacity: 0.45;
  transition: opacity 0.3s;
}
.step.active, .step.done { opacity: 1; }

.step-dot {
  width: 1.4rem;
  height: 1.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 0.65rem;
  font-weight: 700;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1.5px solid var(--border-color);
  transition: all 0.3s;
}
.step.active .step-dot {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
  box-shadow: 0 0 10px var(--accent-glow);
}
.step.done .step-dot {
  background: var(--success);
  color: #fff;
  border-color: var(--success);
}

.step-text {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}
.step.active .step-text { color: var(--accent); }
.step.done .step-text { color: var(--success); }

.step-line {
  width: 2rem;
  height: 2px;
  background: var(--border-color);
  margin: 0 0.35rem;
  border-radius: 1px;
  transition: background 0.3s;
}
.step-line.filled { background: var(--success); }

/* --- Tab Navigation --- */
.tab-nav {
  display: flex;
  gap: 0.25rem;
  padding: 0 0.75rem;
  margin-bottom: 0;
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.6rem 0.5rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 500;
  transition: all 0.2s;
  border-radius: 0.5rem 0.5rem 0 0;
  position: relative;
  color: var(--text-muted);
}

.tab-icon-svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.tab-label {
  font-size: 0.78rem;
  font-weight: 500;
}

.tab-active {
  color: var(--accent);
  font-weight: 600;
  background: var(--bg-tertiary);
}
.tab-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  background: var(--accent);
  border-radius: 2px;
}

.tab-inactive:hover { color: var(--text-secondary); background: rgba(255,255,255,0.03); }
.tab-disabled { opacity: 0.3; cursor: not-allowed; }

/* --- Body --- */
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  -webkit-overflow-scrolling: touch;
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

/* --- Upload Zone --- */
.upload-zone {
  border: 2px dashed var(--border-color);
  border-radius: 1rem;
  padding: 2.5rem 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.25s;
  background: var(--bg-tertiary);
}
.upload-zone:hover, .upload-zone:active, .upload-zone-active {
  border-color: var(--accent);
  background: rgba(6, 153, 255, 0.06);
}
.upload-zone-active {
  border-style: solid;
  box-shadow: 0 0 20px var(--accent-glow);
}

.upload-icon-wrap {
  width: 3.5rem;
  height: 3.5rem;
  margin: 0 auto 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  background: var(--accent-glow);
  color: var(--accent);
}

.upload-main-text {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 0.25rem;
}

.upload-sub-text {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* --- File Chip --- */
.file-chip {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  background: var(--bg-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border-glass);
  padding: 0.625rem 0.875rem;
  border-radius: 0.75rem;
}

.file-chip-icon {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  background: var(--accent-glow);
  color: var(--accent);
  flex-shrink: 0;
}

.file-chip-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.file-chip-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-chip-size {
  font-size: 0.68rem;
  color: var(--text-muted);
}

.remove-btn {
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  border: none;
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}
.remove-btn:hover { background: var(--danger); color: #fff; }

/* --- Thumbnail Preview --- */
.thumb-preview {
  border-radius: 0.75rem;
  overflow: hidden;
  border: 1px solid var(--border-glass);
  max-height: 10rem;
}
.thumb-preview img {
  width: 100%;
  display: block;
  object-fit: cover;
  max-height: 10rem;
}

/* --- Camera --- */
.cam-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  text-align: center;
}

.cam-actions {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}
@media (min-width: 640px) { .cam-actions { flex-direction: row; } }

.btn-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 0.75rem;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 2.75rem;
  flex: 1;
  font-family: inherit;
  color: var(--text-primary);
}
.btn-action:active { transform: scale(0.97); }

.btn-action-primary {
  background: var(--accent);
  color: #fff;
}
.btn-action-primary:hover { filter: brightness(1.1); box-shadow: 0 0 16px var(--accent-glow); }

.btn-action-ghost {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
}
.btn-action-ghost:hover { background: var(--bg-glass); }

/* Camera viewfinder */
.cam-viewfinder-wrap {
  position: relative;
  border-radius: 0.875rem;
  overflow: hidden;
  background: #000;
}

.cam-viewfinder {
  width: 100%;
  max-height: 52vh;
  object-fit: cover;
  display: block;
}

.cam-corners .corner {
  position: absolute;
  width: 1.25rem;
  height: 1.25rem;
  border-color: var(--accent);
  border-style: solid;
}
.corner.tl { top: 0.75rem; left: 0.75rem; border-width: 2px 0 0 2px; border-radius: 4px 0 0 0; }
.corner.tr { top: 0.75rem; right: 0.75rem; border-width: 2px 2px 0 0; border-radius: 0 4px 0 0; }
.corner.bl { bottom: 0.75rem; left: 0.75rem; border-width: 0 0 2px 2px; border-radius: 0 0 0 4px; }
.corner.br { bottom: 0.75rem; right: 0.75rem; border-width: 0 2px 2px 0; border-radius: 0 0 4px 0; }

.cam-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0;
}

.btn-capture {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  border: 3px solid var(--accent);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.btn-capture:active { transform: scale(0.9); }
.capture-ring {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: var(--accent);
  transition: transform 0.15s;
}
.btn-capture:active .capture-ring { transform: scale(0.85); }

/* --- Processing State --- */
.processing-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2.5rem 1rem;
  gap: 0.875rem;
}

.scanner-anim {
  position: relative;
  width: 4rem;
  height: 4rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scanner-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: var(--accent);
  border-right-color: var(--accent);
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.scanner-icon { color: var(--accent); }

.processing-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.progress-bar {
  width: 100%;
  max-width: 14rem;
  height: 0.375rem;
  border-radius: 9999px;
  background: var(--bg-tertiary);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 9999px;
  background: linear-gradient(90deg, var(--accent), #38bdf8);
  transition: width 0.3s ease;
  box-shadow: 0 0 8px var(--accent-glow);
}

.progress-pct {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

/* --- Results / Form --- */
.results-content {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.result-image-wrap {
  border-radius: 0.75rem;
  overflow: hidden;
  border: 1px solid var(--border-glass);
  max-height: 9rem;
}
.result-image-wrap img {
  width: 100%;
  display: block;
  object-fit: cover;
  max-height: 9rem;
}

.info-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  color: var(--warning);
  padding: 0.625rem 0.875rem;
  border-radius: 0.75rem;
  font-size: 0.78rem;
  font-weight: 500;
  line-height: 1.4;
}

.ocr-form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}
@media (min-width: 640px) {
  .ocr-form-grid { grid-template-columns: 1fr 1fr; }
}
.full-width { grid-column: 1 / -1; }

.form-group { display: flex; flex-direction: column; gap: 0.3rem; }

.ocr-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ocr-label svg { color: var(--text-muted); flex-shrink: 0; }

.ocr-input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  font-size: 0.9375rem;
  font-family: inherit;
  color: var(--text-primary);
  background: var(--bg-tertiary);
  border: 1.5px solid var(--border-color);
  border-radius: 0.625rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  -webkit-appearance: none;
  appearance: none;
}
.ocr-input::placeholder { color: var(--text-muted); }
.ocr-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}
.ocr-textarea { resize: vertical; min-height: 3rem; }

/* --- Raw Text --- */
.raw-text-section {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  overflow: hidden;
}

.raw-text-toggle {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  list-style: none;
}
.raw-text-toggle::-webkit-details-marker { display: none; }
.raw-text-toggle svg { flex-shrink: 0; }

.raw-text-content {
  padding: 0 0.75rem 0.75rem;
  font-size: 0.72rem;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 8rem;
  overflow-y: auto;
  line-height: 1.6;
  margin: 0;
}

/* --- Toast Messages --- */
.toast {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
  border-radius: 0.75rem;
  font-size: 0.8rem;
  font-weight: 500;
  margin-top: 0.5rem;
}

.toast-error {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #fca5a5;
}

.toast-success {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.25);
  color: #86efac;
}

/* --- Footer --- */
.modal-footer {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border-glass);
  background: var(--bg-glass-heavy);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  flex-shrink: 0;
  padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
}

.footer-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  flex: 1;
  padding: 0.7rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: inherit;
  border-radius: 0.75rem;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 2.75rem;
  white-space: nowrap;
}
.footer-btn:active { transform: scale(0.97); }

.footer-btn-primary {
  background: linear-gradient(135deg, var(--accent), #38bdf8);
  color: #fff;
  box-shadow: 0 4px 14px var(--accent-glow);
}
.footer-btn-primary:hover { filter: brightness(1.08); }

.footer-btn-success {
  background: linear-gradient(135deg, var(--success), #4ade80);
  color: #fff;
  box-shadow: 0 4px 14px rgba(34, 197, 94, 0.25);
}
.footer-btn-success:hover { filter: brightness(1.08); }

.footer-btn-ghost {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  flex: 0 0 auto;
}
.footer-btn-ghost:hover { background: var(--bg-glass); color: var(--text-primary); }
</style>
