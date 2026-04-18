<template>
  <div class="page-container">
    <!-- ========== TABLE VIEW ========== -->
    <template v-if="!showForm">
      <ModulePageHeader title="Inventory Items" :subtitle="itemsSummaryText">
        <Button v-if="canManageInventory" as="label" variant="outline" size="sm" class="cursor-pointer">
          Import Excel
          <input type="file" accept=".xlsx,.xls" @change="handleImport" class="hidden" />
        </Button>
        <Button variant="outline" size="sm" @click="exportItems">Export</Button>
        <Button v-if="canManageInventory" size="sm" @click="openNewItemForm">+ Add Item</Button>
      </ModulePageHeader>

      <Card v-if="activeStatusFilter" class="items-status-banner">
        <span class="items-status-banner-text">
          Showing: {{ activeStatusFilter === 'warranty-expired' ? 'Warranty Expired' : 'Warranty Expiring Soon' }} items
        </span>
        <Button variant="ghost" size="sm" @click="activeStatusFilter = ''">Clear Filter</Button>
      </Card>

      <!-- Quick Filter Toolbar -->
      <div class="quick-filter-bar">
        <div class="quick-filter-fields">
          <div class="qf-search">
            <Search :size="14" class="qf-search-icon" />
            <Input v-model="searchFilters.name" type="text" placeholder="Search name or ID..." class="qf-search-input" />
          </div>
          <FilterSelect
            v-model="searchFilters.status"
            tone="toolbar"
            class="qf-select"
            label="Status"
            empty-label="All Statuses"
            :options="statuses"
          />
          <FilterSelect
            v-model="searchFilters.type"
            tone="toolbar"
            class="qf-select"
            label="Type"
            empty-label="All Types"
            :options="itemTypes"
          />
          <FilterSelect
            v-model="searchFilters.location"
            tone="toolbar"
            class="qf-select"
            label="Location"
            empty-label="All Locations"
            :options="mutableLocations.filter(x => x !== 'Other')"
          />
        </div>
        <div class="quick-filter-actions">
          <FilterToggleButton
            class="qf-toggle-btn"
            :expanded="showAdvancedFilters"
            :count="advancedFilterCount"
            @click="showAdvancedFilters = !showAdvancedFilters"
          />
          <div class="col-selector-wrapper">
            <button class="qf-toggle-btn" :class="{ 'qf-toggle-btn--active': showColumnSelector }" @click="showColumnSelector = !showColumnSelector">
              <Columns3 :size="13" />
              Columns
              <span v-if="visibleColumns.length !== allColumns.filter(c => c.default).length" class="qf-badge">{{ visibleColumns.length }}</span>
            </button>
            <Transition name="col-panel">
              <div v-if="showColumnSelector" class="col-selector-panel" @click.stop>
                <div class="col-selector-header">
                  <span class="col-selector-title">Toggle Columns</span>
                  <button class="qf-clear-btn" @click="resetColumnsToDefault">Reset</button>
                </div>
                <div class="col-selector-list">
                  <label
                    v-for="col in allColumns.filter(c => !(c.hideForTeacher && isTeacher))"
                    :key="col.key"
                    class="col-selector-item"
                  >
                    <Checkbox
                      :checked="selectedColumnKeys.includes(col.key)"
                      @update:checked="toggleColumn(col.key)"
                    />
                    <span>{{ col.label }}</span>
                  </label>
                </div>
              </div>
            </Transition>
          </div>
          <button v-if="hasAnyFilter" class="qf-clear-btn" @click="clearFilters">Clear all</button>
        </div>
      </div>

      <!-- Advanced Filter Panel -->
      <Transition name="adv-panel">
        <Card v-if="showAdvancedFilters" class="adv-filter-card">
          <div class="adv-filter-toolbar">
            <button class="qf-clear-btn" @click="clearAdvancedFilters">Clear section</button>
          </div>
          <div class="adv-filter-grid">
            <div class="adv-field">
              <label class="adv-field-label">Item ID</label>
              <Input v-model="searchFilters.id" type="text" placeholder="e.g. INV-001" class="adv-control-input" />
            </div>
            <div class="adv-field">
              <label class="adv-field-label">University ID</label>
              <Input v-model="searchFilters.universityID" type="text" placeholder="Search uni ID..." class="adv-control-input" />
            </div>
            <div class="adv-field">
              <label class="adv-field-label">Description</label>
              <Input v-model="searchFilters.description" type="text" placeholder="Search description..." class="adv-control-input" />
            </div>
            <div class="adv-field">
              <label class="adv-field-label">Category</label>
              <FilterSelect
                v-model="searchFilters.category"
                class="adv-control-select"
                label="Category"
                empty-label="All Categories"
                :options="mutableCategories.filter(x => x !== 'Other')"
              />
            </div>
            <div class="adv-field">
              <label class="adv-field-label">Vendor</label>
              <FilterSelect
                v-model="searchFilters.vendor"
                class="adv-control-select"
                label="Vendor"
                empty-label="All Vendors"
                :options="uniqueVendors"
              />
            </div>
            <div class="adv-field">
              <label class="adv-field-label">Supplier</label>
              <Input v-model="searchFilters.supplier" type="text" placeholder="Search supplier..." class="adv-control-input" />
            </div>
            <div class="adv-field">
              <label class="adv-field-label">Warranty end date</label>
              <FilterDatePicker
                v-model="searchFilters.warrantyEnd"
                class="adv-control-date"
                placeholder="Select warranty date"
              />
            </div>
          </div>
        </Card>
      </Transition>

      <Card v-if="importMessage" class="items-import-alert" :class="{ 'items-import-alert--error': !importSuccess }">
        <span>{{ importMessage }}</span>
        <button @click="importMessage = ''" class="items-import-alert-close">&times;</button>
      </Card>

      <Card class="items-table-card">
        <Transition name="bulk-bar">
          <div v-if="canManageInventory && selectedItemIds.length > 0" class="bulk-toolbar">
            <div class="bulk-toolbar-left">
              <span class="bulk-chip">{{ selectedItemIds.length }} selected</span>
              <DropdownMenu align="start">
                <template #trigger>
                  <button class="toolbar-btn">
                    <Zap :size="12" /> Actions <ChevronDown :size="10" />
                  </button>
                </template>
                <template #default="{ close }">
                  <DropdownMenuItem destructive @click="showDeleteConfirm = true; close()">
                    <Trash2 :size="12" /> Delete ({{ selectedItemIds.length }})
                  </DropdownMenuItem>
                </template>
              </DropdownMenu>
              <button class="bulk-clear-btn" @click="selectedItemIds = []">Clear</button>
            </div>
          </div>
        </Transition>
        <div class="table-responsive">
          <table class="table-striped theme-table">
            <thead>
              <tr>
                <th v-if="canManageInventory" style="width:2.5rem;text-align:center">
                  <Checkbox
                    :checked="allSelected"
                    :indeterminate="selectedItemIds.length > 0 && !allSelected"
                    @update:checked="toggleSelectAll"
                  />
                </th>
                <th v-for="col in visibleColumns" :key="col.key">{{ col.label }}</th>
                <th style="text-align:center">Actions</th>
              </tr>
            </thead>

            <tbody>
              <template v-if="showItemsSkeleton">
                <tr>
                  <td :colspan="tableColumnSpan" class="table-spinner-cell">
                    <div class="table-spinner-anchor">
                      <Spinner size="lg" label="Loading items..." />
                    </div>
                  </td>
                </tr>
              </template>

              <tr v-else-if="itemsErrorMessage" class="items-empty-row">
                <td :colspan="tableColumnSpan" class="items-empty-cell">{{ itemsErrorMessage }}</td>
              </tr>

              <template v-else-if="items.length > 0">
                <tr v-for="item in items" :key="item.id">
                  <td v-if="canManageInventory" style="text-align:center">
                    <Checkbox
                      :checked="selectedItemIds.includes(item.id)"
                      @update:checked="toggleItemSelection(item.id, $event)"
                    />
                  </td>
                  <td v-for="col in visibleColumns" :key="col.key"
                    :class="{
                      'font-medium': col.key === 'id',
                      'font-semibold': col.key === 'name',
                    }"
                    :style="col.key === 'id' ? 'color:var(--muted-foreground);font-size:0.75rem' : ''"
                  >
                    <template v-if="col.key === 'status'">
                      <Badge :variant="getItemStatusVariant(item.status)">{{ normalizeItemStatus(item.status) }}</Badge>
                    </template>
                    <template v-else-if="col.key === 'owner'">
                      <Badge :variant="item.owner === 'department' ? 'info' : 'outline'">{{ getOwnerName(item.owner) }}</Badge>
                    </template>
                    <template v-else-if="col.key === 'warrantyEnd' || col.key === 'warrantyStartDate' || col.key === 'purchaseDate'">
                      {{ formatDate(item[col.key]) }}
                    </template>
                    <template v-else-if="col.key === 'warrantyOnsite'">
                      {{ item.warrantyOnsite ? 'Yes' : 'No' }}
                    </template>
                    <template v-else-if="col.key === 'canBorrow'">
                      {{ item.canBorrow !== false ? 'Yes' : 'No' }}
                    </template>
                    <template v-else-if="col.key === 'price'">
                      {{ item.price != null && item.price !== 0 ? `$${Number(item.price).toFixed(2)}` : '' }}
                    </template>
                    <template v-else-if="col.key === 'id'">
                      {{ item.id }}
                    </template>
                    <template v-else>
                      {{ item[col.key] }}
                    </template>
                  </td>
                  <td style="text-align:center">
                    <DropdownMenu align="end">
                      <template #trigger>
                        <button class="kebab-trigger" aria-label="Row actions">
                          <MoreVertical :size="14" />
                        </button>
                      </template>
                      <template #default="{ close }">
                        <DropdownMenuItem v-if="canManageInventory" @click="handleEdit(item); close()">
                          <Pencil :size="12" /> Edit
                        </DropdownMenuItem>
                        <template v-if="isTeacher">
                          <DropdownMenuItem v-if="item.status === 'Available'" @click="handleTeacherStatusChange(item, 'Not Available'); close()">
                            <Pencil :size="12" /> Set Not Available
                          </DropdownMenuItem>
                          <DropdownMenuItem v-else-if="item.status === 'Not Available'" @click="handleTeacherStatusChange(item, 'Available'); close()">
                            <Pencil :size="12" /> Set Available
                          </DropdownMenuItem>
                          <DropdownMenuItem v-else disabled>
                            <Pencil :size="12" /> No action allowed (return process required)
                          </DropdownMenuItem>
                        </template>
                        <DropdownMenuItem v-if="!canManageInventory && !isTeacher" disabled>
                          <Pencil :size="12" /> No permission
                        </DropdownMenuItem>
                        <template v-if="isAdmin">
                          <DropdownMenuItem separator />
                          <DropdownMenuItem destructive @click="singleDeleteTarget = item; showDeleteConfirm = true; close()">
                            <Trash2 :size="12" /> Delete
                          </DropdownMenuItem>
                        </template>
                      </template>
                    </DropdownMenu>
                  </td>
                </tr>
              </template>

              <tr v-else class="items-empty-row">
                <td :colspan="tableColumnSpan" class="items-empty-cell">No items in inventory</td>
              </tr>
            </tbody>
          </table>
        </div>

        <TablePaginationBar
          v-model:currentPage="currentPage"
          v-model:pageSize="pageSize"
          :total-items="totalItems"
          :disabled="showItemsSkeleton"
        />
      </Card>

      <DeleteBlockModal
        :show="showDeleteBlock"
        message="This item is currently in use (lent out) and cannot be deleted. Please return it first."
        @close="showDeleteBlock = false"
      />

      <div v-if="showDeleteConfirm" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
        <div class="modal-card max-w-md w-full">
          <h3 class="modal-title">Confirm Delete</h3>
          <p class="mb-4" style="color:var(--text-secondary);font-size:0.875rem">
            Are you sure you want to delete
            <strong>{{ singleDeleteTarget ? singleDeleteTarget.name : `${selectedItemIds.length} item(s)` }}</strong>?
          </p>
          <p class="text-sm mb-4" style="color:var(--danger)">This action cannot be undone.</p>
          <div class="flex gap-2">
            <Button variant="destructive" class="flex-1" @click="handleDeleteItems">Delete</Button>
            <Button variant="outline" class="flex-1" @click="showDeleteConfirm = false; singleDeleteTarget = null">Cancel</Button>
          </div>
        </div>
      </div>
    </template>

    <!-- ========== FULL-PAGE FORM VIEW ========== -->
    <template v-if="showForm">
      <div class="max-w-3xl mx-auto pt-4">
        <div class="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" @click="showForm = false; resetForm()">
            &larr; Back
          </Button>
          <Button
            v-if="editingItem"
            variant="destructive"
            size="sm"
            @click="deleteWhileEditing"
          >
            Delete Item
          </Button>
        </div>
        <h2 class="page-title mb-6">
          {{ editingItem ? 'Edit Item' : 'Add New Item' }}
        </h2>

        <form @submit.prevent="handleSubmit">
          <!-- ── Section: Item Identification ── -->
          <div class="form-section">
            <h3 class="form-section-title">Item Identification</h3>
            <div class="form-section-grid">
              <div>
                <label class="form-label">Name <span class="form-required">*</span></label>
                <Input type="text" required v-model="formData.name" />
              </div>
              <div>
                <label class="form-label">University ID <span class="form-required">*</span></label>
                <Input type="text" required v-model="formData.universityID" />
              </div>
              <div>
                <label class="form-label">Type</label>
                <Select v-model="formData.type">
                  <option v-for="t in itemTypes" :key="t" :value="t">{{ t }}</option>
                </Select>
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
              <div class="col-span-2">
                <label class="form-label">Description</label>
                <Textarea v-model="formData.description" rows="2" />
              </div>
            </div>
          </div>

          <!-- ── Section: Classification & Location ── -->
          <div class="form-section">
            <h3 class="form-section-title">Classification &amp; Location</h3>
            <div class="form-section-grid">
              <div>
                <label class="form-label">Status</label>
                <Select v-model="formData.status">
                  <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
                </Select>
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
                <Input type="text" v-model="formData.departmentID" placeholder="e.g. COMP" />
              </div>
              <div>
                <label class="form-label">Mother ID</label>
                <Input type="text" v-model="formData.motherID" placeholder="Parent item ID (components only)" />
              </div>
            </div>
          </div>

          <!-- ── Section: Procurement & Financial ── -->
          <div class="form-section">
            <h3 class="form-section-title">Procurement &amp; Financial</h3>
            <div class="form-section-grid">
              <div>
                <label class="form-label">Supplier</label>
                <Input type="text" v-model="formData.supplier" placeholder="Supplying company" />
              </div>
              <div>
                <label class="form-label">Vendor</label>
                <Input type="text" v-model="formData.vendor" placeholder="Sales vendor" />
              </div>
              <div>
                <label class="form-label">Invoice #</label>
                <Input type="text" v-model="formData.invoiceNumber" />
              </div>
              <div>
                <label class="form-label">Price ($)</label>
                <Input type="number" step="0.01" min="0" v-model="formData.price" placeholder="0.00" />
              </div>
              <div>
                <label class="form-label">Purchase Date</label>
                <Input type="date" v-model="formData.purchaseDate" />
              </div>
              <div>
                <label class="form-label">Supplier Status</label>
                <Select v-model="formData.supplierStatus">
                  <option value="">— None —</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Pending">Pending</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Backordered">Backordered</option>
                </Select>
              </div>
              <div>
                <label class="form-label">FO Request ID</label>
                <Input type="text" v-model="formData.foRequestID" placeholder="Financial Office ref" />
              </div>
              <div>
                <label class="form-label">Order ID</label>
                <Input type="text" v-model="formData.orderID" placeholder="Purchase order ref" />
              </div>
              <div>
                <label class="form-label">Funding Source</label>
                <Input type="text" v-model="formData.fundingSource" placeholder="e.g. Department Budget" />
              </div>
              <div>
                <label class="form-label">Project Linked</label>
                <Input type="text" v-model="formData.projectLinked" placeholder="Associated project" />
              </div>
            </div>
          </div>

          <!-- ── Section: Warranty ── -->
          <div class="form-section">
            <h3 class="form-section-title">Warranty</h3>
            <div class="form-section-grid">
              <div>
                <label class="form-label">Warranty Start</label>
                <Input type="date" v-model="formData.warrantyStartDate" />
              </div>
              <div>
                <label class="form-label">Warranty End</label>
                <Input type="date" v-model="formData.warrantyEnd" />
              </div>
              <div>
                <label class="form-label">Warranty Vendor</label>
                <Input type="text" v-model="formData.warrantyVendor" placeholder="Warranty service provider" />
              </div>
              <div class="flex items-center pt-6">
                <label class="flex items-center gap-2 cursor-pointer">
                  <Checkbox v-model="formData.warrantyOnsite" />
                  <span class="form-label mb-0">Onsite Warranty</span>
                </label>
              </div>
            </div>
          </div>

          <!-- ── Section: Ownership & Availability ── -->
          <div class="form-section">
            <h3 class="form-section-title">Ownership &amp; Availability</h3>
            <div class="form-section-grid">
              <div>
                <label class="form-label">Owner</label>
                <Select v-model="formData.owner">
                  <option value="department">Department</option>
                  <option v-for="t in teachers" :key="t.userId" :value="t.userId">
                    {{ t.name }} ({{ t.userId }})
                  </option>
                </Select>
              </div>
              <div class="flex items-center pt-6">
                <label class="flex items-center gap-2 cursor-pointer">
                  <Checkbox v-model="formData.canBorrow" />
                  <span class="form-label mb-0">Can be Borrowed</span>
                </label>
              </div>
            </div>
          </div>

          <!-- ── Section: Invoice / Documents (collapsible) ── -->
          <div class="form-section">
            <button type="button" class="form-section-toggle" @click="showInvoiceSection = !showInvoiceSection">
              <h3 class="form-section-title" style="margin:0">Invoice &amp; Documents</h3>
              <span class="form-section-chevron" :class="{ 'form-section-chevron--open': showInvoiceSection }">
                <ChevronDown :size="14" />
              </span>
            </button>

            <template v-if="showInvoiceSection">
              <!-- Invoice Scanner -->
              <div class="form-invoice-modes">
                <button
                  type="button"
                  @click="invoiceMode = 'upload'"
                  class="form-invoice-mode-btn"
                  :class="{ 'form-invoice-mode-btn--active': invoiceMode === 'upload' }"
                >
                  Upload Invoice
                </button>
                <button
                  type="button"
                  @click="invoiceMode = 'camera'"
                  class="form-invoice-mode-btn"
                  :class="{ 'form-invoice-mode-btn--active': invoiceMode === 'camera' }"
                >
                  Take Photo
                </button>
              </div>

              <!-- Invoice Upload Section -->
              <div v-if="invoiceMode === 'upload'" class="mb-4 p-4 border rounded-lg theme-card">
                <div 
                  @drop.prevent="handleInvoiceDrop"
                  @dragover.prevent="isDraggingInvoice = true"
                  @dragleave="isDraggingInvoice = false"
                  :class="`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition ${isDraggingInvoice ? 'border-[color:var(--accent)]' : ''}`"
                  :style="isDraggingInvoice ? 'background:var(--accent-surface)' : 'border-color:var(--border);background:var(--filter-bg)'"
                >
                  <input 
                    type="file" 
                    ref="invoiceInput"
                    @change="handleInvoiceUpload"
                    accept="image/*,.pdf"
                    class="hidden"
                  />
                  <div @click="$refs.invoiceInput.click()">
                    <p class="font-semibold mb-1 text-sm">{{ isDraggingInvoice ? 'Drop invoice here' : 'Click to upload or drag & drop' }}</p>
                    <p class="text-xs text-muted mb-3">PNG, JPG, PDF (Max 10MB)</p>
                    <Button type="button" variant="outline" size="sm">Browse Files</Button>
                  </div>
                </div>

                <div v-if="uploadedImage" class="mt-4 p-3 border rounded-lg" style="border-color:var(--success);background:var(--success-light)">
                  <p class="text-xs font-semibold mb-2" style="color:var(--success-dark)">Invoice Preview:</p>
                  <img :src="uploadedImage" class="w-full max-h-48 rounded border object-contain" style="border-color:var(--success);background:var(--modal-bg)" />
                  <p v-if="invoiceFileData" class="text-xs text-secondary mt-2">{{ invoiceFileData.name }} &bull; {{ (invoiceFileData.size / 1024).toFixed(2) }} KB</p>
                </div>
              </div>

              <!-- Invoice Camera Section -->
              <div v-if="invoiceMode === 'camera'" class="mb-4 p-4 border rounded-lg theme-card">
                <div class="rounded-lg overflow-hidden mb-3 border-2" style="aspect-ratio: 4/3; max-height: 320px;border-color:var(--accent);background:#000">
                  <video
                    v-if="cameraActive"
                    ref="invoiceVideoElement"
                    class="w-full h-full object-cover"
                    autoplay
                    playsinline
                  ></video>
                  <div v-else class="w-full h-full flex items-center justify-center" style="background:#1a1a2e">
                    <p class="text-muted text-sm">Camera ready</p>
                  </div>
                </div>
                <div class="flex gap-2">
                  <button
                    v-if="!cameraActive"
                    type="button"
                    @click="startInvoiceCamera"
                    class="flex-1 btn btn-outline-primary px-3 py-2 text-sm font-semibold"
                    :disabled="invoiceCameraStarting"
                  >
                    {{ invoiceCameraStarting ? 'Starting...' : 'Start Camera' }}
                  </button>
                  <button
                    v-else
                    type="button"
                    @click="stopInvoiceCamera"
                    class="flex-1 btn btn-outline-danger px-3 py-2 text-sm font-semibold"
                  >
                    Stop Camera
                  </button>
                  <button
                    v-if="cameraActive"
                    type="button"
                    @click="captureInvoicePhoto"
                    class="flex-1 btn btn-outline-success px-3 py-2 text-sm font-semibold"
                    :disabled="ocrProcessing"
                  >
                    {{ ocrProcessing ? 'Processing...' : 'Capture' }}
                  </button>
                </div>
                <div v-if="uploadedImage" class="mt-3 p-3 border rounded-lg" style="border-color:var(--success);background:var(--success-light)">
                  <p class="text-xs font-semibold mb-2" style="color:var(--success-dark)">Captured Preview:</p>
                  <img :src="uploadedImage" class="w-full max-h-48 rounded border object-contain" style="border-color:var(--success);background:var(--modal-bg)" />
                </div>
              </div>

              <!-- Processing Status -->
              <div v-if="ocrProcessing" class="mb-4 p-4 border rounded-lg" style="border-color:var(--info);background:var(--info-light)">
                <div class="flex items-center gap-2 mb-2">
                  <div class="animate-spin h-4 w-4 border-2 rounded-full" style="border-color:var(--info);border-top-color:transparent"></div>
                  <span class="text-sm font-semibold" style="color:var(--info-dark)">Processing Invoice... {{ ocrProgress }}%</span>
                </div>
                <div class="w-full rounded-full h-2" style="background:var(--filter-bg)">
                  <div class="h-2 rounded-full transition-all duration-300" style="background:var(--info)" :style="{ width: ocrProgress + '%' }"></div>
                </div>
              </div>

              <!-- OCR Message -->
              <div v-if="ocrMessage && !ocrProcessing" class="mb-4 p-3 rounded-lg border text-sm font-semibold" :style="ocrSuccess ? 'background:var(--success-light);border-color:var(--success);color:var(--success-dark)' : 'background:var(--danger-light);border-color:var(--danger);color:var(--danger-dark)'">
                {{ ocrMessage }}
              </div>

              <!-- Invoice Preview (when editing existing item) -->
              <div v-if="editingItem && invoiceFileData" class="mb-4 p-3 border rounded-lg" style="border-color:var(--info);background:var(--info-light)">
                <p class="text-xs font-semibold mb-2" style="color:var(--info-dark)">Invoice Attached:</p>
                <img 
                  v-if="uploadedImage" 
                  :src="uploadedImage" 
                  class="w-full max-h-40 rounded border object-contain mb-3" style="border-color:var(--info);background:var(--modal-bg)" 
                />
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-secondary font-medium">{{ invoiceFileData.name }}</span>
                    <span class="text-xs text-muted">({{ (invoiceFileData.size / 1024).toFixed(2) }} KB)</span>
                  </div>
                  <div class="flex gap-2">
                    <Button variant="outline" size="sm" @click="viewInvoice">View</Button>
                    <Button variant="success" size="sm" @click="downloadInvoice">Download</Button>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- ── Form Actions ── -->
          <div class="form-actions">
            <Button type="submit" variant="success">{{ editingItem ? 'Update' : 'Add' }} Item</Button>
            <Button type="button" variant="outline" @click="showForm = false; resetForm()">Cancel</Button>
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
import { inventoryService, userService, authService } from '../utils/services'
import { formatDate, exportToExcel, ITEM_STATUSES, normalizeItemStatus } from '../utils/helpers'
import { useActionLock } from '../hooks/useActionLock'
import { MoreVertical, Pencil, Trash2, Zap, ChevronDown, Search, Columns3 } from 'lucide-vue-next'
import DropdownWithOther from '../components/DropdownWithOther.vue'
import DeleteBlockModal from '../components/DeleteBlockModal.vue'
import {
  UiBadge as Badge,
  UiButton as Button,
  UiCard as Card,
  UiCheckbox as Checkbox,
  UiFilterDatePicker as FilterDatePicker,
  UiFilterSelect as FilterSelect,
  UiFilterToggleButton as FilterToggleButton,
  UiDropdownMenu as DropdownMenu,
  UiDropdownMenuItem as DropdownMenuItem,
  UiInput as Input,
  UiModulePageHeader as ModulePageHeader,
  UiSelect as Select,
  UiTextarea as Textarea,
  UiTablePaginationBar as TablePaginationBar,
  UiSpinner as Spinner,
} from '../components/ui'

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
  vendor: '',
  invoiceNumber: '',
  price: '',
  purchaseDate: '',
  supplierStatus: '',
  foRequestID: '',
  orderID: '',
  fundingSource: '',
  projectLinked: '',
  warrantyStartDate: '',
  warrantyEnd: '',
  warrantyVendor: '',
  warrantyOnsite: false,
  invoiceFile: null,
  departmentID: 'COMP',
  owner: 'department',
  canBorrow: true
}

export default {
  components: {
    Badge,
    Button,
    Card,
    Checkbox,
    ChevronDown,
    Columns3,
    DeleteBlockModal,
    DropdownMenu,
    DropdownMenuItem,
    FilterDatePicker,
    FilterSelect,
    FilterToggleButton,
    DropdownWithOther,
    Input,
    ModulePageHeader,
    MoreVertical,
    Pencil,
    Search,
    Select,
    Spinner,
    Textarea,
    TablePaginationBar,
    Trash2,
    Zap,
  },
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
    const showInvoiceSection = ref(false)
    const currentPage = ref(1)
    const pageSize = ref(10)
    const totalItems = ref(0)
    const isItemsLoaded = ref(false)
    const isItemsInitialLoading = ref(false)
    const isItemsFetching = ref(false)
    const itemsErrorMessage = ref('')
    const showDeleteBlock = ref(false)
    const selectedItemIds = ref([])
    const showDeleteConfirm = ref(false)
    const singleDeleteTarget = ref(null)
    const sortField = ref('')
    const sortDir = ref('asc')
    // Note: sorting UI removed; sortField/sortDir kept for API default ordering
    const mutableLocations = ref(loadSavedList('inv_custom_locations', defaultLocations))
    const mutableCategories = ref(loadSavedList('inv_custom_categories', itemCategories))
    const teachers = ref([])
    let ocrWorker = null
    let invoiceCameraStream = null
    let searchDebounceTimer = null
    let loadRequestToken = 0

    const showAdvancedFilters = ref(false)
    const activeStatusFilter = ref('')
    const searchFilters = ref({
      id: '', name: '', type: '', category: '', status: '',
      location: '', vendor: '', supplier: '', universityID: '',
      warrantyEnd: '', description: ''
    })

    // ── Column visibility ──────────────────────────
    const allColumns = [
      { key: 'id', label: 'ID', default: true },
      { key: 'name', label: 'Name', default: true },
      { key: 'universityID', label: 'University ID', default: false },
      { key: 'type', label: 'Type', default: true },
      { key: 'category', label: 'Category', default: false },
      { key: 'status', label: 'Status', default: true },
      { key: 'location', label: 'Location', default: true },
      { key: 'description', label: 'Description', default: false },
      { key: 'supplier', label: 'Supplier', default: true },
      { key: 'vendor', label: 'Vendor', default: false },
      { key: 'invoiceNumber', label: 'Invoice #', default: false },
      { key: 'foRequestID', label: 'FO Request ID', default: false },
      { key: 'orderID', label: 'Order ID', default: false },
      { key: 'supplierStatus', label: 'Supplier Status', default: false },
      { key: 'projectLinked', label: 'Project Linked', default: false },
      { key: 'fundingSource', label: 'Funding Source', default: false },
      { key: 'purchaseDate', label: 'Purchase Date', default: false },
      { key: 'warrantyStartDate', label: 'Warranty Start', default: false },
      { key: 'warrantyEnd', label: 'Warranty End', default: true },
      { key: 'warrantyVendor', label: 'Warranty Vendor', default: false },
      { key: 'warrantyOnsite', label: 'Warranty Onsite', default: false },
      { key: 'price', label: 'Price', default: false },
      { key: 'departmentID', label: 'Department ID', default: false },
      { key: 'owner', label: 'Ownership', default: true, hideForTeacher: true },
      { key: 'motherID', label: 'Mother ID', default: false },
      { key: 'currentBorrower', label: 'Current Borrower', default: false },
      { key: 'canBorrow', label: 'Can Borrow', default: false },
    ]

    const defaultSelectedKeys = allColumns.filter(c => c.default).map(c => c.key)

    const loadSelectedColumns = () => {
      try {
        const saved = localStorage.getItem('inv_selected_columns')
        if (saved) return JSON.parse(saved)
      } catch (e) { /* ignore */ }
      return [...defaultSelectedKeys]
    }

    const selectedColumnKeys = ref(loadSelectedColumns())
    const showColumnSelector = ref(false)

    watch(selectedColumnKeys, (val) => {
      try { localStorage.setItem('inv_selected_columns', JSON.stringify(val)) } catch (e) { /* ignore */ }
    }, { deep: true })

    const toggleColumn = (key) => {
      const idx = selectedColumnKeys.value.indexOf(key)
      if (idx >= 0) {
        selectedColumnKeys.value.splice(idx, 1)
      } else {
        selectedColumnKeys.value.push(key)
      }
    }

    const resetColumnsToDefault = () => {
      selectedColumnKeys.value = [...defaultSelectedKeys]
    }

    const visibleColumns = computed(() => {
      return allColumns.filter(col => {
        if (col.hideForTeacher && isTeacher.value) return false
        return selectedColumnKeys.value.includes(col.key)
      })
    })

    const advancedFilterCount = computed(() => {
      const f = searchFilters.value
      return [f.id, f.category, f.vendor, f.supplier, f.universityID, f.warrantyEnd, f.description]
        .filter(v => v !== '').length
    })

    const hasAnyFilter = computed(() => {
      const f = searchFilters.value
      return Object.values(f).some(v => v !== '') || activeStatusFilter.value !== ''
    })

    const clearAdvancedFilters = () => {
      const f = searchFilters.value
      f.id = ''
      f.category = ''
      f.vendor = ''
      f.supplier = ''
      f.universityID = ''
      f.warrantyEnd = ''
      f.description = ''
    }

    const isAdmin = computed(() => {
      const user = authService.getCurrentUser()
      return user?.role === 'admin'
    })

    const isTeacher = computed(() => {
      const user = authService.getCurrentUser()
      return user?.role === 'user' && user?.subRole === 'teacher'
    })

    const canManageInventory = computed(() => {
      const user = authService.getCurrentUser()
      return user?.role === 'admin' || user?.role === 'operator'
    })

    const allSelected = computed(() => {
      return items.value.length > 0 && items.value.every(item => selectedItemIds.value.includes(item.id))
    })

    const uniqueVendors = computed(() => {
      const vendors = items.value.map(i => i.vendor || i.supplier).filter(Boolean)
      return [...new Set(vendors)].sort()
    })

    const tableColumnSpan = computed(() => {
      let columns = visibleColumns.value.length + 1 // visible data columns + Actions
      if (canManageInventory.value) columns += 1 // checkbox column
      return columns
    })

    const itemsSummaryText = computed(() => {
      if (!isItemsLoaded.value && isItemsInitialLoading.value) {
        return 'Loading inventory items...'
      }
      if (totalItems.value === 0) {
        return 'No items found'
      }
      return `${totalItems.value} item${totalItems.value === 1 ? '' : 's'} total`
    })

    const showItemsSkeleton = computed(() => {
      return !isItemsLoaded.value || isItemsInitialLoading.value || isItemsFetching.value
    })

    const itemSkeletonRows = computed(() => {
      const rows = Number(pageSize.value) || 10
      return Math.max(4, Math.min(rows, 8))
    })

    const getItemStatusVariant = (status) => {
      const normalized = normalizeItemStatus(status).toLowerCase()
      if (normalized === 'available') return 'success'
      if (normalized === 'in-use' || normalized === 'in use') return 'warning'
      if (normalized === 'missing') return 'destructive'
      if (normalized === 'dispose' || normalized === 'disposed') return 'secondary'
      return 'outline'
    }

    const clearFilters = () => {
      searchFilters.value = {
        id: '', name: '', type: '', category: '', status: '',
        location: '', vendor: '', supplier: '', universityID: '',
        warrantyEnd: '', description: ''
      }
      activeStatusFilter.value = ''
      currentPage.value = 1
    }

    // Build query params from current filters
    const buildQueryParams = () => {
      const f = searchFilters.value
      const params = {
        page: currentPage.value,
        pageSize: pageSize.value,
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
      const requestToken = ++loadRequestToken

      if (!isItemsLoaded.value) {
        isItemsInitialLoading.value = true
      } else {
        isItemsFetching.value = true
      }
      itemsErrorMessage.value = ''

      try {
        const params = buildQueryParams()
        const currentUser = authService.getCurrentUser()
        let result
        if (isTeacher.value) {
          const ownerId = currentUser?.userId || currentUser?.id
          if (!ownerId) {
            throw new Error('Teacher account missing owner identity')
          }
          result = await inventoryService.getItemsByOwner(ownerId, params)
        } else {
          result = await inventoryService.getAllItems(params)
        }

        if (requestToken !== loadRequestToken) {
          return
        }

        items.value = Array.isArray(result?.items) ? result.items : []
        totalItems.value = Number(result?.total ?? 0)
      } catch (e) {
        if (requestToken !== loadRequestToken) {
          return
        }

        console.error('Failed to load items:', e)

        items.value = []
        totalItems.value = 0
        itemsErrorMessage.value = 'Failed to load inventory items. Please try again.'
      } finally {
        if (requestToken !== loadRequestToken) {
          return
        }

        isItemsInitialLoading.value = false
        isItemsFetching.value = false
        isItemsLoaded.value = true
      }
    }

    const { runAction } = useActionLock()

    const handleTeacherStatusChange = async (item, nextStatus) => {
      await runAction('Updating item status...', async () => {
        try {
          await inventoryService.updateItemStatus(item.id, nextStatus)
          await loadItems()
        } catch (e) {
          const message = e?.message || 'Failed to update item status'
          alert(message)
        }
      })
    }

    // Watch dropdown/select filters to reload immediately
    const selectFilterFields = computed(() => {
      const f = searchFilters.value
      return [f.type, f.category, f.status, f.location, f.vendor, f.warrantyEnd]
    })

    watch(selectFilterFields, () => {
      if (currentPage.value !== 1) {
        currentPage.value = 1
        return
      }
      loadItems()
    })

    watch(activeStatusFilter, () => {
      if (currentPage.value !== 1) {
        currentPage.value = 1
        return
      }
      loadItems()
    })

    watch(() => pageSize.value, () => {
      if (currentPage.value !== 1) {
        currentPage.value = 1
        return
      }
      loadItems()
    })

    watch(() => currentPage.value, () => {
      loadItems()
    })

    // Debounced watcher for text input filters
    const textFilterFields = computed(() => {
      const f = searchFilters.value
      return [f.id, f.name, f.supplier, f.universityID, f.description]
    })
    watch(textFilterFields, () => {
      clearTimeout(searchDebounceTimer)
      searchDebounceTimer = setTimeout(() => {
        if (currentPage.value !== 1) {
          currentPage.value = 1
          return
        }
        loadItems()
      }, 400)
    })



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

      await runAction(editingItem.value ? 'Updating item...' : 'Adding item...', async () => {
        try {
          if (editingItem.value) {
            // Build a clean payload with all editable fields for the backend
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
              vendor: formData.value.vendor,
              invoiceNumber: formData.value.invoiceNumber,
              price: formData.value.price !== '' ? Number(formData.value.price) : 0,
              purchaseDate: formData.value.purchaseDate,
              supplierStatus: formData.value.supplierStatus,
              foRequestID: formData.value.foRequestID,
              orderID: formData.value.orderID,
              fundingSource: formData.value.fundingSource,
              projectLinked: formData.value.projectLinked,
              warrantyStartDate: formData.value.warrantyStartDate,
              warrantyEnd: formData.value.warrantyEnd,
              warrantyVendor: formData.value.warrantyVendor,
              warrantyOnsite: formData.value.warrantyOnsite,
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
            // Normalize price for add
            const addPayload = { ...formData.value }
            if (addPayload.price !== '' && addPayload.price != null) {
              addPayload.price = Number(addPayload.price)
            } else {
              addPayload.price = 0
            }
            await inventoryService.addItem(addPayload)
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
      })
    }

    const handleEdit = (item) => {
      // Copy all editable fields to formData, avoiding MongoDB internal fields
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
        vendor: item.vendor || '',
        invoiceNumber: item.invoiceNumber || '',
        price: item.price != null && item.price !== 0 ? item.price : '',
        purchaseDate: item.purchaseDate || '',
        supplierStatus: item.supplierStatus || '',
        foRequestID: item.foRequestID || '',
        orderID: item.orderID || '',
        fundingSource: item.fundingSource || '',
        projectLinked: item.projectLinked || '',
        warrantyStartDate: item.warrantyStartDate || '',
        warrantyEnd: item.warrantyEnd || '',
        warrantyVendor: item.warrantyVendor || '',
        warrantyOnsite: item.warrantyOnsite === true,
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
        showInvoiceSection.value = true
      } else {
        invoiceFileData.value = null
        ocrMessage.value = ''
        ocrSuccess.value = false
        showInvoiceSection.value = false
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

    const toggleSelectAll = (checkedOrEvent) => {
      const shouldSelect = typeof checkedOrEvent === 'boolean'
        ? checkedOrEvent
        : Boolean(checkedOrEvent?.target?.checked)
      const pageIds = items.value.map(item => item.id)

      if (shouldSelect) {
        const newSet = new Set([...selectedItemIds.value, ...pageIds])
        selectedItemIds.value = Array.from(newSet)
      } else {
        selectedItemIds.value = selectedItemIds.value.filter(id => !pageIds.includes(id))
      }
    }

    const toggleItemSelection = (itemId, checked) => {
      if (checked) {
        if (!selectedItemIds.value.includes(itemId)) {
          selectedItemIds.value = [...selectedItemIds.value, itemId]
        }
        return
      }
      selectedItemIds.value = selectedItemIds.value.filter(id => id !== itemId)
    }

    const handleDeleteItems = async () => {
      showDeleteConfirm.value = false
      if (singleDeleteTarget.value) {
        await runAction('Deleting item...', async () => {
          try {
            await inventoryService.deleteItem(singleDeleteTarget.value.id)
            singleDeleteTarget.value = null
            loadItems()
          } catch (e) {
            console.error('Failed to delete items:', e)
            singleDeleteTarget.value = null
          }
        })
      } else {
        const ids = [...selectedItemIds.value]
        await runAction('Deleting items...', async (onProgress) => {
          const total = ids.length
          let done = 0
          for (const id of ids) {
            try {
              await inventoryService.deleteItem(id)
            } catch (e) {
              console.error(`Failed to delete item ${id}:`, e)
            }
            done++
            onProgress(done, total)
          }
          selectedItemIds.value = []
          loadItems()
        })
      }
    }

    const deleteWhileEditing = async () => {
      if (editingItem.value && editingItem.value.status === 'In-use') {
        showDeleteBlock.value = true
        return
      }
      if (window.confirm('Delete this item?')) {
        await runAction('Deleting item...', async () => {
          try {
            await inventoryService.deleteItem(editingItem.value.id)
          } catch (e) {
            console.error('Failed to delete item:', e)
          }
          showForm.value = false
          resetForm()
          loadItems()
        })
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
          const total = jsonData.length
          await runAction('Importing items from Excel...', async (onProgress) => {
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
                supplier: row.supplier || row.Supplier || '',
                vendor: row.vendor || row.Vendor || '',
                motherID: row.motherID || row['Mother ID'] || null,
                invoiceNumber: row.invoiceNumber || row['Invoice Number'] || row['Invoice #'] || '',
                price: parseFloat(row.price || row.Price || '0') || 0,
                purchaseDate: row.purchaseDate || row['Purchase Date'] || '',
                supplierStatus: row.supplierStatus || row['Supplier Status'] || '',
                foRequestID: row.foRequestID || row['FO Request ID'] || '',
                orderID: row.orderID || row['Order ID'] || '',
                fundingSource: row.fundingSource || row['Funding Source'] || '',
                projectLinked: row.projectLinked || row['Project Linked'] || '',
                warrantyStartDate: row.warrantyStartDate || row['Warranty Start'] || '',
                warrantyEnd: row.warrantyEnd || row['Warranty End'] || '',
                warrantyVendor: row.warrantyVendor || row['Warranty Vendor'] || '',
                warrantyOnsite: row.warrantyOnsite === true || row.warrantyOnsite === 'Yes' || row['Warranty Onsite'] === 'Yes' || false,
                departmentID: row.departmentID || row['Department ID'] || row.Department || '',
                owner: row.owner || row.Owner || row.Ownership || 'department',
                canBorrow: row.canBorrow !== false && row.canBorrow !== 'No' && row['Can Borrow'] !== 'No',
              }

              if (newItem.name) {
                await inventoryService.addItem(newItem)
                imported++
              }
              onProgress(imported, total)
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

    const handleOutsideClick = (e) => {
      if (showColumnSelector.value && !e.target.closest('.col-selector-wrapper')) {
        showColumnSelector.value = false
      }
    }

    onMounted(() => {
      document.addEventListener('click', handleOutsideClick)
      // Apply auto-filter from dashboard navigation
      if (props.pageParams?.filter) {
        const filterMap = { available: 'Available', missing: 'Missing', disposed: 'Dispose' }
        if (filterMap[props.pageParams.filter]) {
          searchFilters.value.status = filterMap[props.pageParams.filter]
        } else {
          activeStatusFilter.value = props.pageParams.filter
        }
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
      document.removeEventListener('click', handleOutsideClick)
      // Cleanup OCR worker if needed
      if (ocrWorker) {
        ocrWorker.terminate()
      }
      clearTimeout(searchDebounceTimer)
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
      showInvoiceSection,
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
      itemsSummaryText,
      showItemsSkeleton,
      itemSkeletonRows,
      itemsErrorMessage,
      getItemStatusVariant,
      uploadedImage,
      showDeleteBlock,
      showAdvancedFilters,
      searchFilters,
      uniqueVendors,
      tableColumnSpan,
      clearFilters,
      clearAdvancedFilters,
      advancedFilterCount,
      hasAnyFilter,
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
      normalizeItemStatus,
      activeStatusFilter,
      teachers,
      getOwnerName,
      allColumns,
      selectedColumnKeys,
      showColumnSelector,
      visibleColumns,
      toggleColumn,
      resetColumnsToDefault,
      selectedItemIds,
      singleDeleteTarget,
      showDeleteConfirm,
      isAdmin,
      isTeacher,
      canManageInventory,
      allSelected,
      toggleSelectAll,
      toggleItemSelection,
      handleDeleteItems,
      handleTeacherStatusChange,
    }
  }
}
</script>

<style scoped>
/* ── Form Sections ──────────────────────────────── */
.form-section {
  margin-bottom: 1.25rem;
  padding: 1rem 1.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--card);
}

.form-section-title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.01em;
  margin-bottom: 0.75rem;
}

.form-section-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem 1rem;
}

.form-section-grid .col-span-2 {
  grid-column: span 2;
}

.form-section-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin-bottom: 0.5rem;
}

.form-section-chevron {
  color: var(--muted-foreground);
  transition: transform 0.2s;
}
.form-section-chevron--open {
  transform: rotate(180deg);
}

.form-invoice-modes {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.form-invoice-mode-btn {
  flex: 1;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--card);
  color: var(--muted-foreground);
  cursor: pointer;
  transition: all 0.15s;
}
.form-invoice-mode-btn:hover {
  background: var(--surface-100);
}
.form-invoice-mode-btn--active {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-surface);
}

.form-required {
  color: var(--danger);
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 1rem 0 0.5rem;
}

.table-spinner-cell {
  padding: 3rem 0.5rem !important;
  background: var(--card);
}

.table-spinner-anchor {
  position: sticky;
  left: 50%;
  transform: translateX(-50%);
  width: fit-content;
}

.items-status-banner {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--warning);
  background: var(--warning-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.items-status-banner-text {
  color: var(--warning-dark);
  font-size: 0.875rem;
  font-weight: 600;
}

/* ── Quick Filter Bar ───────────────────────────── */
.quick-filter-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface-50);
  flex-wrap: wrap;
}

.quick-filter-fields {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  flex: 1 1 0;
  min-width: 0;
}

.qf-search {
  position: relative;
  flex: 1 1 10rem;
  min-width: 8rem;
  max-width: 16rem;
}

.qf-search-icon {
  position: absolute;
  left: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  color: var(--muted-foreground);
  pointer-events: none;
}

.qf-search :deep(input) {
  padding-left: 1.75rem;
  height: 2.25rem;
  font-size: 0.8125rem;
}

.qf-select {
  width: 8.6rem;
  min-width: 7.6rem;
  flex-shrink: 0;
}

.quick-filter-actions {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-left: auto;
  flex-shrink: 0;
}

.qf-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--muted-foreground);
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
  line-height: 1.1;
}
.qf-toggle-btn:hover {
  background: var(--surface-100);
  color: var(--text-secondary);
}
.qf-toggle-btn--active {
  border-color: var(--accent);
  color: var(--accent);
}

.qf-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1rem;
  height: 1rem;
  padding: 0 0.25rem;
  font-size: 0.625rem;
  font-weight: 700;
  line-height: 1;
  color: var(--accent);
  background: var(--accent-surface);
  border-radius: 999px;
}
.qf-toggle-btn--active .qf-badge {
  color: #fff;
  background: var(--accent);
}

.qf-clear-btn {
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--muted-foreground);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  white-space: nowrap;
}
.qf-clear-btn:hover { color: var(--text-primary); }

/* ── Column Selector ───────────────────────────── */
.col-selector-wrapper {
  position: relative;
}

.col-selector-panel {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 50;
  width: 14rem;
  max-height: 22rem;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  display: flex;
  flex-direction: column;
}

.col-selector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.625rem;
  border-bottom: 1px solid var(--border);
}

.col-selector-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-primary);
}

.col-selector-list {
  overflow-y: auto;
  padding: 0.375rem 0;
}

.col-selector-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.1s;
}
.col-selector-item:hover {
  background: var(--surface-100);
}

/* Column panel transition */
.col-panel-enter-active,
.col-panel-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.col-panel-enter-from,
.col-panel-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ── Advanced Filter Panel ─────────────────────── */
.adv-filter-card {
  margin: 0.75rem 1rem 1rem;
  padding: 0;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--card) 96%, var(--surface-50));
  box-shadow: var(--shadow-sm);
}

.adv-filter-toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 0.55rem 0.9rem;
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface-50) 80%, transparent);
}

.adv-filter-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 0.65rem;
  padding: 0.85rem 0.9rem 0.95rem;
}

@media (min-width: 768px) {
  .adv-filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1280px) {
  .adv-filter-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.adv-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.adv-field-label {
  display: block;
  margin-bottom: 0.32rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--muted-foreground);
}

.adv-control-input {
  width: 100%;
  height: 2.25rem;
  font-size: 0.8125rem;
}

.adv-control-input::placeholder {
  color: var(--muted-foreground);
}

.adv-control-select,
.adv-control-date {
  width: 100%;
}

/* Advanced panel slide transition */
.adv-panel-enter-active,
.adv-panel-leave-active {
  transition: max-height 0.3s ease, opacity 0.25s ease;
  overflow: hidden;
}
.adv-panel-enter-from,
.adv-panel-leave-to {
  max-height: 0;
  opacity: 0;
}
.adv-panel-enter-to,
.adv-panel-leave-from {
  max-height: 56rem;
  opacity: 1;
}

.items-import-alert {
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--success);
  background: var(--success-light);
  color: var(--success-dark);
}

.items-import-alert--error {
  border-color: var(--danger);
  background: var(--danger-light);
  color: var(--danger-dark);
}

.items-import-alert-close {
  font-size: 1.25rem;
  line-height: 1;
  font-weight: 700;
  background: transparent;
  border: none;
  cursor: pointer;
  color: inherit;
}

.items-table-card {
  padding: 0;
}

.items-empty-row .items-empty-cell {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--muted-foreground);
  font-size: 0.9rem;
}

.items-row-skeleton td {
  padding-top: 0.85rem;
  padding-bottom: 0.85rem;
}

.items-skeleton-line {
  display: inline-block;
  height: 0.75rem;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--table-header) 0%, var(--filter-bg) 50%, var(--table-header) 100%);
  background-size: 200% 100%;
  animation: item-skeleton-wave 1.2s linear infinite;
}

.items-skeleton-box {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;
  background: linear-gradient(90deg, var(--table-header) 0%, var(--filter-bg) 50%, var(--table-header) 100%);
  background-size: 200% 100%;
  animation: item-skeleton-wave 1.2s linear infinite;
}

.items-skeleton-id {
  width: 4.5rem;
}

.items-skeleton-name {
  width: 8.5rem;
}

.items-skeleton-short {
  width: 5.5rem;
}

@keyframes item-skeleton-wave {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.sort-icon {
  display: inline-block;
  width: 14px;
  text-align: center;
  font-size: 11px;
  color: var(--muted-foreground);
}
thead th:hover .sort-icon {
  color: var(--text-primary);
}

/* Kebab action trigger */
.kebab-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--muted-foreground);
  cursor: pointer;
  transition: all 0.12s;
}
.kebab-trigger:hover { background: var(--surface-100); color: var(--text-primary); }

/* Bulk toolbar */
.bulk-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface-50);
}
.bulk-toolbar-left {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}
.bulk-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-surface);
  border-radius: 999px;
}
.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--muted-foreground);
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
}
.toolbar-btn:hover { background: var(--surface-100); color: var(--text-secondary); }
.bulk-clear-btn {
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--muted-foreground);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.bulk-clear-btn:hover { color: var(--text-primary); }

/* Bulk bar slide animation */
.bulk-bar-enter-active,
.bulk-bar-leave-active {
  transition: max-height 0.25s ease, opacity 0.2s ease;
  overflow: hidden;
}
.bulk-bar-enter-from,
.bulk-bar-leave-to {
  max-height: 0;
  opacity: 0;
}
.bulk-bar-enter-to,
.bulk-bar-leave-from {
  max-height: 4rem;
  opacity: 1;
}
</style>
