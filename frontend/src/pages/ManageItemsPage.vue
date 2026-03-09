<template>
  <div class="p-6">
    <!-- ========== TABLE VIEW ========== -->
    <template v-if="!showForm">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold">Inventory items</h2>
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

      <!-- Status Filter Banner -->
      <div v-if="activeStatusFilter" class="mb-3 p-3 bg-yellow-50 border border-yellow-300 rounded-lg flex items-center justify-between">
        <span class="text-yellow-800 font-medium">
          Showing: {{ activeStatusFilter === 'warranty-expired' ? 'Warranty Expired' : 'Warranty Expiring Soon' }} items
        </span>
        <button @click="activeStatusFilter = ''" class="text-yellow-600 hover:text-yellow-800 underline text-sm">Clear Filter</button>
      </div>

      <!-- Search Filter Panel -->
      <div v-if="showFilterPanel" class="filter-panel">
        <div class="flex justify-between items-center mb-3">
          <h3 class="filter-panel-title">Search &amp; Filter</h3>
          <button @click="clearFilters" class="filter-clear-btn">Clear All</button>
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
          <!-- Type (select) -->
          <div>
            <label class="filter-label">Type</label>
            <select v-model="searchFilters.type" class="form-select text-sm">
              <option value="">All Types</option>
              <option v-for="t in itemTypes" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <!-- Category (select) -->
          <div>
            <label class="filter-label">Category</label>
            <select v-model="searchFilters.category" class="form-select text-sm">
              <option value="">All Categories</option>
              <option v-for="c in mutableCategories.filter(x => x !== 'Other')" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <!-- Status (select) -->
          <div>
            <label class="filter-label">Status</label>
            <select v-model="searchFilters.status" class="form-select text-sm">
              <option value="">All Statuses</option>
              <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <!-- Location (select) -->
          <div>
            <label class="filter-label">Location</label>
            <select v-model="searchFilters.location" class="form-select text-sm">
              <option value="">All Locations</option>
              <option v-for="l in mutableLocations.filter(x => x !== 'Other')" :key="l" :value="l">{{ l }}</option>
            </select>
          </div>
          <!-- Vendor (select) -->
          <div>
            <label class="filter-label">Vendor</label>
            <select v-model="searchFilters.vendor" class="form-select text-sm">
              <option value="">All Vendors</option>
              <option v-for="v in uniqueVendors" :key="v" :value="v">{{ v }}</option>
            </select>
          </div>
          <!-- Supplier (text) -->
          <div>
            <label class="filter-label">Supplier</label>
            <input v-model="searchFilters.supplier" type="text" class="form-input text-sm" placeholder="Search supplier..." />
          </div>
          <!-- University ID (text) -->
          <div>
            <label class="filter-label">University ID</label>
            <input v-model="searchFilters.universityID" type="text" class="form-input text-sm" placeholder="Search uni ID..." />
          </div>
          <!-- Warranty End (date) -->
          <div>
            <label class="filter-label">Warranty End</label>
            <input v-model="searchFilters.warrantyEnd" type="date" class="form-input text-sm" />
          </div>
          <!-- Description (text) -->
          <div>
            <label class="filter-label">Description</label>
            <input v-model="searchFilters.description" type="text" class="form-input text-sm" placeholder="Search description..." />
          </div>
        </div>
      </div>

      <!-- Import Results Message -->
      <div v-if="importMessage" :class="`mb-4 p-4 rounded ${importSuccess ? 'alert-success' : 'border-2 border-[color:var(--danger)]'}`" :style="!importSuccess ? 'background:var(--danger-light);color:var(--danger-dark)' : ''">
        {{ importMessage }}
        <button @click="importMessage = ''" class="ml-2 font-bold">&times;</button>
      </div>

      <div v-if="items.length === 0" class="empty-state">
        No items in inventory
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full border-collapse table-striped theme-table">
          <thead>
            <tr>
              <th class="border p-2 text-left">ID</th>
              <th class="border p-2 text-left">Name</th>
              <th class="border p-2 text-left cursor-pointer select-none " @click="toggleSort('type')">
                Type <span class="sort-icon">{{ getSortIcon('type') }}</span>
              </th>
              <th class="border p-2 text-left cursor-pointer select-none " @click="toggleSort('status')">
                Status <span class="sort-icon">{{ getSortIcon('status') }}</span>
              </th>
              <th class="border p-2 text-left cursor-pointer select-none " @click="toggleSort('location')">
                Location <span class="sort-icon">{{ getSortIcon('location') }}</span>
              </th>
              <th class="border p-2 text-left cursor-pointer select-none " @click="toggleSort('supplier')">
                Supplier <span class="sort-icon">{{ getSortIcon('supplier') }}</span>
              </th>
              <th class="border p-2 text-left">Ownership</th>
              <th class="border p-2 text-left cursor-pointer select-none " @click="toggleSort('warrantyEnd')">
                Warranty End <span class="sort-icon">{{ getSortIcon('warrantyEnd') }}</span>
              </th>
              <th class="border p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td class="border p-2">{{ item.id }}</td>
              <td class="border p-2">{{ item.name }}</td>
              <td class="border p-2">{{ item.type }}</td>
              <td class="border p-2">
                <span :class="['status-badge', getStatusColor(item.status)]">
                  {{ normalizeItemStatus(item.status) }}
                </span>
              </td>
              <td class="border p-2">{{ item.location }}</td>
              <td class="border p-2">{{ item.supplier }}</td>
              <td class="border p-2">
                <span :class="item.owner === 'department' ? 'px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'">
                  {{ getOwnerName(item.owner) }}
                </span>
              </td>
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
          :totalItems="totalItems"
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
          <button @click="showForm = false; resetForm()" class="text-muted hover:text-[color:var(--text-primary)] text-lg px-3 py-1 rounded hover:bg-[color:var(--row-hover)]">
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
        <div class="mb-6 p-4 rounded-lg border-2" style="background:var(--warning-light);border-color:var(--warning)">
          <h4 class="text-lg font-bold mb-3" style="color:var(--warning-dark)">
            <svg class="inline w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Invoice Scanner
          </h4>
          
          <!-- Invoice Input Mode Selection -->
          <div class="flex gap-3">
            <button
              type="button"
              @click="invoiceMode = 'upload'"
              :class="`flex-1 px-4 py-3 rounded-lg font-semibold transition transform hover:scale-105 ${invoiceMode === 'upload' ? 'btn-outline-primary shadow-lg' : 'theme-card border-2'}`"
            >
              <svg class="inline w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg> Upload Invoice
            </button>
            <button
              type="button"
              @click="invoiceMode = 'camera'"
              :class="`flex-1 px-4 py-3 rounded-lg font-semibold transition transform hover:scale-105 ${invoiceMode === 'camera' ? 'btn-outline-primary shadow-lg' : 'theme-card border-2'}`"
            >
              <svg class="inline w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg> Take Photo
            </button>
          </div>
        </div>

        <!-- Invoice Upload Section -->
        <div v-if="invoiceMode === 'upload'" class="mb-6 p-6 border-2 rounded-lg theme-card">
          <label class="form-label font-semibold mb-4">Upload Invoice File</label>
          
          <div 
            @drop.prevent="handleInvoiceDrop"
            @dragover.prevent="isDraggingInvoice = true"
            @dragleave="isDraggingInvoice = false"
            :class="`p-8 border-3 border-dashed rounded-lg text-center cursor-pointer transition ${isDraggingInvoice ? 'border-[color:var(--accent)]' : ''}`"
            :style="isDraggingInvoice ? 'background:var(--accent-glow)' : 'border-color:var(--border-color);background:var(--filter-bg)'"
          >
            <input 
              type="file" 
              ref="invoiceInput"
              @change="handleInvoiceUpload"
              accept="image/*,.pdf"
              class="hidden"
            />
            <div @click="$refs.invoiceInput.click()">
              <svg class="w-10 h-10 mx-auto mb-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <p class="font-semibold mb-2">{{ isDraggingInvoice ? 'Drop invoice here' : 'Click to upload or drag & drop' }}</p>
              <p class="text-sm text-muted mb-4">PNG, JPG, PDF (Max 10MB)</p>
              <div class="p-3 theme-card inline-block">
                <button 
                  type="button"
                  class="btn btn-outline-primary px-6 py-2 shadow-md hover:shadow-lg"
                >
                  <svg class="inline w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg> Browse Files
                </button>
              </div>
            </div>
          </div>

          <!-- Upload Preview -->
          <div v-if="uploadedImage" class="mt-6 p-4 border-2 rounded-lg" style="border-color:var(--success);background:var(--success-light)">
            <p class="text-sm font-semibold mb-3" style="color:var(--success-dark)">
              <svg class="inline w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Invoice Preview:
            </p>
            <img :src="uploadedImage" class="w-full max-h-72 rounded border object-contain" style="border-color:var(--success);background:var(--modal-bg)" />
            <p v-if="invoiceFileData" class="text-xs text-secondary mt-2">{{ invoiceFileData.name }} &bull; {{ (invoiceFileData.size / 1024).toFixed(2) }} KB</p>
          </div>
        </div>

        <!-- Invoice Camera Section -->
        <div v-if="invoiceMode === 'camera'" class="mb-6 p-6 border-2 rounded-lg theme-card">
          <label class="form-label font-semibold mb-4">Capture Invoice with Camera</label>
          
          <!-- Camera Feed with Large Display -->
          <div class="rounded-lg overflow-hidden mb-4 border-4" style="aspect-ratio: 4/3; max-height: 500px;border-color:var(--accent);background:#000">
            <video
              v-if="cameraActive"
              ref="invoiceVideoElement"
              class="w-full h-full object-cover"
              autoplay
              playsinline
            ></video>
            <div v-else class="w-full h-full flex items-center justify-center" style="background:#1a1a2e">
              <div class="text-center">
                <svg class="w-10 h-10 mx-auto mb-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                <p class="text-muted text-lg">Camera ready</p>
              </div>
            </div>
          </div>

          <!-- Camera Controls with Box -->
          <div class="mb-4 p-4 border-2 rounded-lg" style="border-color:var(--accent);background:var(--filter-bg)">
            <p class="text-sm font-semibold mb-3" style="color:var(--accent)">Camera Controls:</p>
            <div class="flex gap-2">
              <button
                v-if="!cameraActive"
                type="button"
                @click="startInvoiceCamera"
                class="flex-1 btn btn-outline-primary px-4 py-3 font-semibold shadow-md hover:shadow-lg"
                :disabled="invoiceCameraStarting"
              >
                {{ invoiceCameraStarting ? 'Starting...' : 'Start Camera' }}
              </button>
              <button
                v-else
                type="button"
                @click="stopInvoiceCamera"
                class="flex-1 btn btn-outline-danger px-4 py-3 font-semibold shadow-md hover:shadow-lg"
              >
                Stop Camera
              </button>
              <button
                v-if="cameraActive"
                type="button"
                @click="captureInvoicePhoto"
                class="flex-1 btn btn-outline-success px-4 py-3 font-semibold shadow-md hover:shadow-lg"
                :disabled="ocrProcessing"
              >
                {{ ocrProcessing ? 'Processing...' : 'Capture' }}
              </button>
            </div>
          </div>

          <!-- Captured Image Preview -->
          <div v-if="uploadedImage" class="p-4 border-2 rounded-lg" style="border-color:var(--success);background:var(--success-light)">
            <p class="text-sm font-semibold mb-3" style="color:var(--success-dark)"><svg class="inline w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>Captured Invoice Preview:</p>
            <img :src="uploadedImage" class="w-full max-h-72 rounded border object-contain" style="border-color:var(--success);background:var(--modal-bg)" />
          </div>
        </div>

        <!-- Processing Status -->
        <div v-if="ocrProcessing" class="mb-6 p-6 border-2 rounded-lg" style="border-color:var(--info);background:var(--info-light)">
          <div class="flex items-center justify-center gap-3 mb-4">
            <div class="animate-spin h-6 w-6 border-3 rounded-full" style="border-color:var(--info);border-top-color:transparent"></div>
            <span class="text-lg font-semibold" style="color:var(--info-dark)">Processing Invoice... {{ ocrProgress }}%</span>
          </div>
          <div class="w-full rounded-full h-3" style="background:var(--filter-bg)">
            <div class="h-3 rounded-full transition-all duration-300" style="background:var(--info)" :style="{ width: ocrProgress + '%' }"></div>
          </div>
        </div>

        <!-- Success/Error Message -->
        <div v-if="ocrMessage && !ocrProcessing" class="mb-6 p-4 rounded-lg border-2 font-semibold" :style="ocrSuccess ? 'background:var(--success-light);border-color:var(--success);color:var(--success-dark)' : 'background:var(--danger-light);border-color:var(--danger);color:var(--danger-dark)'">
          {{ ocrMessage }}
        </div>

        <!-- Invoice Preview (when editing) -->
        <div v-if="editingItem && invoiceFileData" class="mb-6 p-4 border-2 rounded-lg" style="border-color:var(--info);background:var(--info-light)">
          <p class="text-sm font-semibold mb-3" style="color:var(--info-dark)"><svg class="inline w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg> Invoice Attached:</p>
          <img 
            v-if="uploadedImage" 
            :src="uploadedImage" 
            class="w-full max-h-64 rounded border-2 object-contain mb-4" style="border-color:var(--info);background:var(--modal-bg)" 
          />
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-sm text-secondary font-medium">{{ invoiceFileData.name }}</span>
              <span class="text-xs text-muted">({{ (invoiceFileData.size / 1024).toFixed(2) }} KB)</span>
            </div>
            <div class="flex gap-2 p-3 border-2 rounded-lg theme-card">
              <button 
                type="button"
                @click="viewInvoice"
                class="btn btn-outline-primary px-4 py-2 text-sm font-medium shadow-md hover:shadow-lg"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>View
              </button>
              <button 
                type="button"
                @click="downloadInvoice"
                class="btn btn-outline-success px-4 py-2 text-sm font-medium shadow-md hover:shadow-lg"
              >
                <svg class="inline w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>Download
              </button>
            </div>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="grid grid-cols-2 gap-4 pr-2">
          <div>
            <label class="form-label">Name *</label>
            <input
              type="text"
              required
              v-model="formData.name"
              class="form-input"
            />
          </div>

          <div>
            <label class="form-label">University ID *</label>
            <input
              type="text"
              required
              v-model="formData.universityID"
              class="form-input"
            />
          </div>

          <div>
            <label class="form-label">Type</label>
            <select v-model="formData.type" class="form-select">
              <option v-for="t in itemTypes" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>

          <div>
            <label class="form-label">Category</label>
            <DropdownWithOther
              v-model="formData.category"
              :options="mutableCategories"
              placeholder="Enter new category..."
              @add-option="addCategory"
            />
          </div>

          <div>
            <label class="form-label">Status</label>
            <select v-model="formData.status" class="form-select">
              <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <div>
            <label class="form-label">Location</label>
            <DropdownWithOther
              v-model="formData.location"
              :options="mutableLocations"
              placeholder="Enter new location..."
              @add-option="addLocationOption"
            />
          </div>

          <div>
            <label class="form-label">Department ID</label>
            <input
              type="text"
              v-model="formData.departmentID"
              class="form-input"
              placeholder="e.g. COMP"
            />
          </div>

          <div>
            <label class="form-label">Mother ID</label>
            <input
              type="text"
              v-model="formData.motherID"
              class="form-input"
              placeholder="For components only"
            />
          </div>

          <div>
            <label class="form-label">Supplier</label>
            <input
              type="text"
              v-model="formData.supplier"
              class="form-input"
            />
          </div>

          <div>
            <label class="form-label">Invoice #</label>
            <input
              type="text"
              v-model="formData.invoiceNumber"
              class="form-input"
            />
          </div>

          <div>
            <label class="form-label">Warranty Start</label>
            <input
              type="date"
              v-model="formData.warrantyStartDate"
              class="form-input"
            />
          </div>

          <div>
            <label class="form-label">Warranty End</label>
            <input
              type="date"
              v-model="formData.warrantyEnd"
              class="form-input"
            />
          </div>

          <div>
            <label class="form-label">Owner</label>
            <select v-model="formData.owner" class="form-select">
              <option value="department">Department</option>
              <option v-for="t in teachers" :key="t.userId" :value="t.userId">
                {{ t.name }} ({{ t.userId }})
              </option>
            </select>
          </div>

          <div class="flex items-center pt-6">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" v-model="formData.canBorrow" class="rounded" />
              <span class="form-label mb-0">Can be Borrowed</span>
            </label>
          </div>

          <div class="col-span-2">
            <label class="form-label">Description</label>
            <textarea
              v-model="formData.description"
              class="form-input"
              rows="3"
            />
          </div>

          <div class="col-span-2 flex gap-3 justify-end p-4 form-action-bar">
            <button type="submit" class="btn btn-outline-success px-6 py-2 shadow-md hover:shadow-lg">
              <svg class="inline w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>{{ editingItem ? 'Update' : 'Add' }} Item
            </button>
            <button
              type="button"
              @click="showForm = false; resetForm()"
              class="btn btn-outline-secondary px-6 py-2 shadow-md hover:shadow-lg"
            >
              <svg class="inline w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>Cancel
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
import { ref, nextTick, onMounted, onUnmounted, computed, watch } from 'vue'
import * as XLSX from 'xlsx'
import * as Tesseract from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist'
import { inventoryService, userService } from '../utils/services'
import { formatDate, getStatusColor, exportToExcel, ITEM_STATUSES, normalizeItemStatus, isWarrantyExpired, isWarrantyExpiringSoon } from '../utils/helpers'
import PaginationControl from '../components/PaginationControl.vue'
import DropdownWithOther from '../components/DropdownWithOther.vue'
import DeleteBlockModal from '../components/DeleteBlockModal.vue'

const itemTypes = ["Hardware", "Software", "Component"]
const itemCategories = ["Computer", "Display", "Memory", "Storage", "Peripherals", "Other"]
const defaultLocations = ["Lab A", "Lab B", "Lab C", "Office", "Storage Room", "Shelf 1", "Shelf 2", "Other"]
const statuses = ITEM_STATUSES

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
  departmentID: 'COMP',
  owner: 'department',
  canBorrow: true
}

export default {
  components: { PaginationControl, DropdownWithOther, DeleteBlockModal },
  props: {
    pageParams: { type: Object, default: () => ({}) }
  },
  setup(props) {
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
    const currentPage = ref(1)
    const pageSize = 10
    const totalItems = ref(0)
    const showDeleteBlock = ref(false)
    const sortField = ref('')
    const sortDir = ref('asc')
    const mutableLocations = ref(loadSavedList('inv_custom_locations', defaultLocations))
    const mutableCategories = ref(loadSavedList('inv_custom_categories', itemCategories))
    const teachers = ref([])
    let ocrWorker = null
    let invoiceCameraStream = null
    let searchDebounceTimer = null

    const showFilterPanel = ref(false)
    const activeStatusFilter = ref('')
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
      activeStatusFilter.value = ''
    }

    // Build query params from current filters
    const buildQueryParams = () => {
      const f = searchFilters.value
      const params = {
        page: currentPage.value,
        pageSize,
      }
      if (sortField.value) {
        params.sortBy = sortField.value
        params.sortDir = sortDir.value
      }
      if (activeStatusFilter.value) {
        params.warrantyStatus = activeStatusFilter.value === 'warranty-expired' ? 'expired' : 'expiring-soon'
      }
      if (f.type) params.type = f.type
      if (f.category) params.category = f.category
      if (f.status) params.status = f.status
      if (f.location) params.location = f.location
      if (f.vendor) params.vendor = f.vendor
      if (f.supplier) params.supplier = f.supplier
      if (f.id) params.itemId = f.id
      if (f.name) params.name = f.name
      if (f.universityID) params.universityID = f.universityID
      if (f.warrantyEnd) params.warrantyEnd = f.warrantyEnd
      if (f.description) params.description = f.description
      return params
    }

    const loadItems = async () => {
      try {
        const params = buildQueryParams()
        const result = await inventoryService.getAllItems(params)
        items.value = result.items
        totalItems.value = result.total
      } catch (e) {
        console.error('Failed to load items:', e)
      }
    }

    // Watch dropdown/select filters to reload immediately
    const selectFilterFields = computed(() => {
      const f = searchFilters.value
      return [f.type, f.category, f.status, f.location, f.vendor, f.warrantyEnd]
    })
    watch([selectFilterFields, activeStatusFilter, currentPage, () => sortField.value, () => sortDir.value], () => {
      loadItems()
    })

    // Debounced watcher for text input filters
    const textFilterFields = computed(() => {
      const f = searchFilters.value
      return [f.id, f.name, f.supplier, f.universityID, f.description]
    })
    watch(textFilterFields, () => {
      currentPage.value = 1
      clearTimeout(searchDebounceTimer)
      searchDebounceTimer = setTimeout(() => {
        loadItems()
      }, 400)
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
      if (sortField.value !== field) return '\u2195'
      return sortDir.value === 'asc' ? '\u25B2' : '\u25BC'
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

    const resetForm = () => {
      formData.value = { ...defaultFormData }
      editingItem.value = null
    }

    const handleSubmit = async () => {
      if (!formData.value.name || !formData.value.universityID) {
        alert('Please fill in all required fields')
        return
      }

      // Invoice file is optional — admin can add items manually without an invoice

      try {
        if (editingItem.value) {
          // Build a clean payload with only the editable fields for the backend
          const updatePayload = {
            name: formData.value.name,
            universityID: formData.value.universityID,
            type: formData.value.type,
            category: formData.value.category,
            status: formData.value.status,
            location: formData.value.location,
            description: formData.value.description,
            motherID: formData.value.motherID,
            supplier: formData.value.supplier,
            invoiceNumber: formData.value.invoiceNumber,
            warrantyStartDate: formData.value.warrantyStartDate,
            warrantyEnd: formData.value.warrantyEnd,
            departmentID: formData.value.departmentID,
            owner: formData.value.owner,
            canBorrow: formData.value.canBorrow,
          }

          // Determine if there is a new invoice File object to upload
          const invoiceFile = (formData.value.invoiceFile && formData.value.invoiceFile instanceof File)
            ? formData.value.invoiceFile
            : null

          const updatedItem = await inventoryService.updateItem(editingItem.value.id, updatePayload, invoiceFile)

          // Immediately update the local items list so the UI reflects changes
          if (updatedItem) {
            const idx = items.value.findIndex(i => i.id === editingItem.value.id)
            if (idx !== -1) {
              items.value.splice(idx, 1, updatedItem)
            }
          }
        } else {
          await inventoryService.addItem(formData.value)
          // Reload full list to pick up the new item with server-generated ID
          await loadItems()
        }
      } catch (e) {
        console.error('Failed to submit item:', e)
        alert('Failed to save item: ' + e.message)
        return
      }

      resetForm()
      showForm.value = false
    }

    const handleEdit = (item) => {
      // Copy only editable fields to formData, avoiding MongoDB internal fields
      formData.value = {
        name: item.name || '',
        universityID: item.universityID || '',
        type: item.type || 'Hardware',
        category: item.category || 'Computer',
        status: item.status || 'Available',
        location: item.location || 'Lab A',
        description: item.description || '',
        motherID: item.motherID || '',
        supplier: item.supplier || '',
        invoiceNumber: item.invoiceNumber || '',
        warrantyStartDate: item.warrantyStartDate || '',
        warrantyEnd: item.warrantyEnd || '',
        departmentID: item.departmentID || 'COMP',
        owner: item.owner || 'department',
        canBorrow: item.canBorrow !== false,
        invoiceFile: null,
      }
      editingItem.value = item
      
      // Load stored invoice file if it exists
      if (item.invoiceFile) {
        invoiceFileData.value = item.invoiceFile
        ocrMessage.value = `Invoice ${item.invoiceFile.name} loaded`
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

      const reader = new FileReader()
      reader.onload = async (e) => {
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
          for (const row of jsonData) {
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
              await inventoryService.addItem(newItem)
              imported++
            }
          }

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
      importMessage.value = 'Invoice data extracted! Please review and complete the form.'
      importSuccess.value = true
    }

    const extractTextFromImage = async (imageFile) => {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = async (e) => {
          try {
            ocrProcessing.value = true
            ocrProgress.value = 0
            ocrMessage.value = 'Loading OCR engine and reading invoice...'

            console.log('[OCR] Starting Tesseract.recognize on image:', imageFile.name, imageFile.type, imageFile.size)
            const result = await Tesseract.recognize(
              e.target.result,
              'eng',
              {
                logger: (m) => {
                  if (m.status === 'recognizing text' || m.status === 'recognizing') {
                    ocrProgress.value = Math.round(m.progress * 100)
                    ocrMessage.value = `Scanning invoice... ${Math.round(m.progress * 100)}%`
                  } else if (m.status) {
                    ocrMessage.value = `${m.status}...`
                  }
                }
              }
            )

            const text = result.data.text
            console.log('[OCR] Raw text extracted:', text.substring(0, 300))
            console.log('[OCR] Confidence:', result.data.confidence)

            if (!text || text.trim().length === 0) {
              ocrProcessing.value = false
              ocrSuccess.value = false
              ocrMessage.value = 'No text could be extracted from this image. Try a clearer photo or PDF.'
              resolve({})
              return
            }

            const extractedData = smartExtractData(text)
            console.log('[OCR] Extracted data:', JSON.stringify(extractedData))
            
            ocrProcessing.value = false
            ocrSuccess.value = true

            const filledFields = Object.keys(extractedData).filter(k => extractedData[k])
            ocrMessage.value = `Invoice scanned! Auto-filled ${filledFields.length} fields: ${filledFields.join(', ')}`
            
            // Auto-fill form fields - PRESERVE invoiceFile!
            formData.value = {
              ...formData.value,
              ...extractedData,
              invoiceFile: invoiceFileData.value // Keep the stored invoice file!
            }
            
            resolve(extractedData)
          } catch (error) {
            console.error('[OCR] Error:', error)
            ocrProcessing.value = false
            ocrSuccess.value = false
            ocrMessage.value = `Could not extract text from image, but invoice is saved. Error: ${error.message}`
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

            console.log('[OCR] Starting PDF text extraction:', pdfFile.name)
            const pdf = await pdfjsLib.getDocument(e.target.result).promise
            let fullText = ''

            for (let i = 1; i <= pdf.numPages; i++) {
              ocrProgress.value = Math.round((i / pdf.numPages) * 100)
              ocrMessage.value = `Reading PDF page ${i}/${pdf.numPages}...`
              const page = await pdf.getPage(i)
              const textContent = await page.getTextContent()
              fullText += textContent.items.map(item => item.str).join(' ') + '\n'
            }

            console.log('[OCR] PDF text extracted:', fullText.substring(0, 300))

            if (!fullText || fullText.trim().length === 0) {
              ocrProcessing.value = false
              ocrSuccess.value = false
              ocrMessage.value = 'No text could be extracted from this PDF. It may be a scanned image PDF.'
              resolve({})
              return
            }

            const extractedData = smartExtractData(fullText)
            console.log('[OCR] Extracted data:', JSON.stringify(extractedData))
            
            ocrProcessing.value = false
            ocrSuccess.value = true

            const filledFields = Object.keys(extractedData).filter(k => extractedData[k])
            ocrMessage.value = `PDF scanned! Auto-filled ${filledFields.length} fields: ${filledFields.join(', ')}`
            
            // Auto-fill form fields - PRESERVE existing data!
            formData.value = {
              ...formData.value,
              ...extractedData,
              invoiceFile: invoiceFileData.value // Keep the stored invoice file!
            }
            
            resolve(extractedData)
          } catch (error) {
            console.error('[OCR] PDF error:', error)
            ocrProcessing.value = false
            ocrSuccess.value = false
            ocrMessage.value = `Could not extract text from PDF, but invoice is saved. Error: ${error.message}`
            resolve({})
          }
        }
        reader.readAsArrayBuffer(pdfFile)
      })
    }

    const smartExtractData = (text) => {
      const extracted = {}

      // Invoice Number pattern - require # or : delimiter, or INV- prefix
      const invoiceMatch = text.match(/(?:invoice\s*[#:]\s*)([A-Z0-9\-]+)/i) || text.match(/\b(INV[- ]?\d[\w\-]*)/i)
      if (invoiceMatch) {
        extracted.invoiceNumber = invoiceMatch[1].trim()
      }

      // Supplier/Company name (Look for common patterns)
      const supplierMatch = text.match(/(?:supplier|vendor|company|from|by)[\s:]+([A-Z][A-Za-z\s&.,'-]+?)(?=\n|$|invoice|date)/i)
      if (supplierMatch) {
        extracted.supplier = supplierMatch[1].trim()
      }

      // Price pattern (supports `$, EUR, £) - prefer Total line (not Subtotal)
      const totalPriceMatch = text.match(/(?:(?:grand\s+)?total|amount\s*due)(?<!sub\s*total)[\s:]*[$€£]\s*([0-9,]+[.][0-9]{2})/i) || text.match(/\btotal[\s:]*[$€£]\s*([0-9,]+[.][0-9]{2})/i)
      const priceMatch = totalPriceMatch || text.match(/[$€£]\s*([0-9,]+[.][0-9]{2}|[0-9]+)/i)
      if (priceMatch) {
        extracted.price = priceMatch[1].replace(/,/g, '')
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

      // Item description or model - require : delimiter to avoid matching table headers
      const modelMatch = text.match(/(?:model|product\s*name|description)[\s:]+([^\n]+)/i)
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
        ocrMessage.value = 'File too large. Maximum size is 10MB.'
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
          ocrMessage.value = `Invoice ${file.name} saved successfully!`
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
        cameraActive.value = true
        await nextTick()
        if (invoiceVideoElement.value) {
          invoiceVideoElement.value.srcObject = invoiceCameraStream
        }
        ocrMessage.value = 'Camera ready. Click "Capture" to take invoice photo.'
        ocrSuccess.value = true
      } catch (error) {
        ocrMessage.value = `Camera error: ${error.message}`
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
        ocrMessage.value = 'Capturing and processing invoice...'

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
        ocrMessage.value = 'Invoice captured! Processing text...'

        // Process the captured image - need to convert dataURL to blob
        const blob = await (await fetch(imageData)).blob()
        const file = new File([blob], 'invoice.jpg', { type: 'image/jpeg' })
        await extractTextFromImage(file)
        
        stopInvoiceCamera()
      } catch (error) {
        ocrMessage.value = `Error capturing invoice: ${error.message}`
        ocrSuccess.value = false
        console.error('Error:', error)
      } finally {
        ocrProcessing.value = false
      }
    }

    onMounted(() => {
      // Apply auto-filter from dashboard navigation
      if (props.pageParams?.filter) {
        activeStatusFilter.value = props.pageParams.filter
      }
      loadItems()
      // Load teachers for owner dropdown
      userService.getTeachers().then(t => { teachers.value = t }).catch(() => {})
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

    const getOwnerName = (ownerId) => {
      if (!ownerId || ownerId === 'department') {
        return 'Department'
      }
      const teacher = teachers.value.find(t => t.userId === ownerId)
      return teacher ? teacher.name : ownerId
    }

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
      totalItems,
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
      normalizeItemStatus,
      activeStatusFilter,
      teachers,
      getOwnerName,
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
  color: var(--text-muted);
}
thead th:hover .sort-icon {
  color: var(--text-primary);
}
</style>
