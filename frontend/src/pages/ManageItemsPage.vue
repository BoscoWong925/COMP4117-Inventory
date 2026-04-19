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

        <!-- Mode switcher (hidden during edit) -->
        <div v-if="!editingItem" class="import-mode-switcher">
          <button
            type="button"
            class="import-mode-btn"
            :class="{ 'import-mode-btn--active': addMode === 'manual' }"
            @click="addMode = 'manual'"
          >Manual Add</button>
          <button
            type="button"
            class="import-mode-btn"
            :class="{ 'import-mode-btn--active': addMode === 'import' }"
            @click="addMode = 'import'"
          >Import from Invoice</button>
        </div>

        <!-- ════════════════════════════════════════════ -->
        <!-- IMPORT FROM INVOICE WIZARD                  -->
        <!-- ════════════════════════════════════════════ -->
        <div v-if="addMode === 'import' && !editingItem">

          <!-- Step Indicator -->
          <ImportStepIndicator
            :current="importStep"
            :maxReachable="importMaxStep"
            @go="navigateImportStep"
          />

          <!-- Step 1: Upload -->
          <div v-if="importStep === 1" class="form-section">
            <h3 class="form-section-title">Step 1: Upload Invoice</h3>
            <p style="font-size:0.8125rem;color:var(--muted-foreground);margin-bottom:0.75rem;">
              Upload an invoice image or PDF. Azure AI Document Intelligence will extract vendor info and line items.
            </p>
            <div
              class="import-dropzone"
              :class="{ 'import-dropzone--active': importDragOver }"
              @dragover.prevent="importDragOver = true"
              @dragleave="importDragOver = false"
              @drop.prevent="importDragOver = false; handleImportInvoiceDrop($event)"
            >
              <template v-if="importAnalyzing">
                <Spinner :size="32" />
                <p style="margin-top:0.5rem;font-size:0.8125rem;color:var(--muted-foreground)">Analyzing invoice with Azure AI...</p>
              </template>
              <template v-else>
                <p style="font-size:0.875rem;font-weight:600;margin-bottom:0.5rem;">Drag &amp; drop invoice here</p>
                <p style="font-size:0.75rem;color:var(--muted-foreground);margin-bottom:0.75rem;">or</p>
                <label class="import-browse-btn">
                  Browse File
                  <input type="file" accept="image/jpeg,image/png,image/bmp,image/tiff,application/pdf" hidden @change="handleImportInvoiceUpload" />
                </label>
                <p style="font-size:0.6875rem;color:var(--muted-foreground);margin-top:0.5rem;">Supported: JPEG, PNG, BMP, TIFF, PDF (max 10MB)</p>
              </template>
            </div>
            <p v-if="importError" class="import-error-msg">{{ importError }}</p>
          </div>

          <!-- Step 2: Invoice Header Review -->
          <div v-if="importStep === 2">
            <h3 class="form-section-title" style="margin-bottom:0.75rem;">Step 2: Invoice Header</h3>

            <!-- Invoice preview button -->
            <div v-if="importInvoiceFile" class="import-file-info">
              <span style="font-size:0.75rem;color:var(--muted-foreground);">{{ importInvoiceFile.name }} ({{ (importInvoiceFile.size / 1024).toFixed(1) }} KB)</span>
              <button type="button" class="import-review-btn" @click="viewImportInvoice">View Invoice</button>
            </div>

            <!-- Warnings -->
            <div v-if="importState.warnings.length > 0" class="import-warnings">
              <p v-for="(w, i) in importState.warnings" :key="i" class="import-warning-line">⚠ {{ w }}</p>
            </div>

            <!-- Confidence badge -->
            <div v-if="importState.confidence != null" class="import-confidence-bar">
              Overall confidence:
              <span class="import-confidence-val" :class="importConfidenceClass">
                {{ Math.round(importState.confidence * 100) }}%
              </span>
            </div>

            <!-- Invoice Header Card -->
            <div class="form-section">
              <h3 class="form-section-title">Extracted Header Fields</h3>
              <div class="form-section-grid">
                <div>
                  <label class="form-label">Supplier / Vendor</label>
                  <Input type="text" v-model="importState.invoiceMeta.supplier" />
                </div>
                <div>
                  <label class="form-label">Invoice #</label>
                  <Input type="text" v-model="importState.invoiceMeta.invoiceNumber" />
                </div>
                <div>
                  <label class="form-label">Purchase Date</label>
                  <Input type="date" v-model="importState.invoiceMeta.purchaseDate" />
                </div>
                <div>
                  <label class="form-label">PO / Order ID</label>
                  <Input type="text" v-model="importState.invoiceMeta.orderID" />
                </div>
                <div>
                  <label class="form-label">Total Amount</label>
                  <Input type="number" step="0.01" v-model.number="importState.invoiceMeta.totalAmount" />
                </div>
                <div>
                  <label class="form-label">Currency</label>
                  <Input type="text" v-model="importState.invoiceMeta.currency" />
                </div>
              </div>
            </div>

            <!-- Extracted Data Inspector (collapsible) -->
            <div v-if="importState.rawFields" class="form-section">
              <button type="button" class="import-inspector-toggle" @click="importInspectorOpen = !importInspectorOpen">
                <span class="form-section-title" style="margin:0">{{ importInspectorOpen ? '▼' : '▶' }} Extracted Data Inspector</span>
              </button>
              <div v-if="importInspectorOpen" class="import-inspector-body">
                <div v-for="(val, key) in flattenedRawFields" :key="key" class="import-inspector-row">
                  <span class="import-inspector-key">{{ key }}</span>
                  <span class="import-inspector-val">{{ val }}</span>
                </div>
                <button type="button" class="import-review-btn" style="margin-top:0.5rem;" @click="copyRawFieldsJSON">Copy Raw JSON</button>
              </div>
            </div>

            <!-- Navigation -->
            <div class="form-actions">
              <Button type="button" variant="outline" @click="confirmReupload">
                &larr; Re-upload
              </Button>
              <Button type="button" variant="default" @click="importStep = 3">
                Next: Line Items &rarr;
              </Button>
            </div>
          </div>

          <!-- Step 3: Line Items Review & Classification -->
          <div v-if="importStep === 3">
            <h3 class="form-section-title" style="margin-bottom:0.75rem;">Step 3: Review Line Items</h3>

            <p style="font-size:0.8125rem;color:var(--muted-foreground);margin-bottom:0.75rem;">
              Classify each row. Non-inventory and excluded rows will not create items.
            </p>

            <div class="form-section">
              <InvoiceImportReviewTable
                :rows="importState.draftRows"
                :sharedDefaults="importState.sharedDefaults"
                :invoiceMeta="importState.invoiceMeta"
                @addRow="addImportRow"
                @excludeSelected="excludeSelectedImportRows"
                @restoreExcluded="restoreExcludedImportRows"
              />
            </div>

            <!-- Navigation -->
            <div class="form-actions">
              <Button type="button" variant="outline" @click="importStep = 2">
                &larr; Header
              </Button>
              <Button type="button" variant="default" @click="goToStep4" :disabled="importState.draftRows.filter(r => r.rowClass === 'item').length === 0">
                Next: Configure Fields &rarr;
              </Button>
            </div>
            <p v-if="importError" class="import-error-msg">{{ importError }}</p>
          </div>

          <!-- Step 4: Configure Item Fields (Shared Defaults + Per-row) -->
          <div v-if="importStep === 4">
            <h3 class="form-section-title" style="margin-bottom:0.75rem;">Step 4: Configure Item Fields</h3>
            <p style="font-size:0.8125rem;color:var(--muted-foreground);margin-bottom:0.75rem;">
              Set shared defaults for all items. Expand individual rows below to override fields per-item.
            </p>

            <!-- Shared Defaults -->
            <InvoiceImportDefaults
              :defaults="importState.sharedDefaults"
              :types="itemTypes"
              :categories="mutableCategories"
              :locations="mutableLocations"
              :teachers="teachers"
            />

            <!-- Per-row overrides section -->
            <div class="form-section" style="margin-top:0.75rem;">
              <h4 class="form-section-title">Per-Row Overrides</h4>
              <p style="font-size:0.75rem;color:var(--muted-foreground);margin-bottom:0.5rem;">
                Expand rows that need different values from the shared defaults above.
              </p>
              <div v-for="row in importState.draftRows.filter(r => r.rowClass === 'item')" :key="row._rowId" class="import-override-row">
                <div class="import-override-header" @click="row.expanded = !row.expanded">
                  <span class="import-override-expand">{{ row.expanded ? '▼' : '▶' }}</span>
                  <span class="import-override-name">{{ row.itemName || '(unnamed)' }}</span>
                  <span class="import-override-qty" v-if="row.quantity > 1">&times;{{ row.quantity }}</span>
                  <Badge v-if="hasRowOverrides(row)" variant="accent">⚙ custom</Badge>
                  <Badge :variant="rowReadinessClass(row) === 'import-override-readiness--ready' ? 'success' : rowReadinessClass(row) === 'import-override-readiness--incomplete' ? 'warning' : 'outline'">{{ rowReadinessLabel(row) }}</Badge>
                  <Button size="sm" variant="destructive" style="margin-left:auto;" @click.stop="row.rowClass = 'excluded'">Remove</Button>
                </div>
                <div v-if="row.expanded" class="import-override-panel">
                  <div class="import-override-grid">
                    <!-- ── Item Identification ── -->
                    <div>
                      <label class="form-label">Name <span class="form-required">*</span></label>
                      <Input v-model="row.itemName" placeholder="Item name" />
                    </div>
                    <div>
                      <label class="form-label">University ID</label>
                      <Input v-model="row.overrides.universityID" placeholder="e.g. FE-XXX" />
                    </div>
                    <div>
                      <label class="form-label">Type</label>
                      <Select v-model="row.overrides.type">
                        <option value="">— Use default —</option>
                        <option v-for="t in itemTypes" :key="t" :value="t">{{ t }}</option>
                      </Select>
                    </div>
                    <div>
                      <label class="form-label">Category</label>
                      <Select v-model="row.overrides.category">
                        <option value="">— Use default —</option>
                        <option v-for="c in mutableCategories" :key="c" :value="c">{{ c }}</option>
                      </Select>
                    </div>
                    <div>
                      <label class="form-label">Qty</label>
                      <Input type="number" :modelValue="row.quantity" @update:modelValue="row.quantity = Number($event) || 1" min="1" />
                    </div>
                    <div class="import-override-grid-full">
                      <label class="form-label">Description</label>
                      <Input v-model="row.description" placeholder="Item description / notes" />
                    </div>

                    <Separator class="import-override-sep" />

                    <!-- ── Classification & Location ── -->
                    <div>
                      <label class="form-label">Status</label>
                      <Select v-model="row.overrides.status">
                        <option value="">— Use default —</option>
                        <option value="Available">Available</option>
                        <option value="In-use">In-use</option>
                        <option value="Not Available">Not Available</option>
                      </Select>
                    </div>
                    <div>
                      <label class="form-label">Location</label>
                      <Select v-model="row.overrides.location">
                        <option value="">— Use default —</option>
                        <option v-for="l in mutableLocations" :key="l" :value="l">{{ l }}</option>
                      </Select>
                    </div>
                    <div>
                      <label class="form-label">Department</label>
                      <Input v-model="row.overrides.departmentID" placeholder="— Use default —" />
                    </div>
                    <div>
                      <label class="form-label">Owner</label>
                      <Select v-model="row.overrides.owner">
                        <option value="">— Use default —</option>
                        <option value="department">Department</option>
                        <option v-for="t in teachers" :key="t.userId" :value="t.userId">{{ t.name || t.userId }}</option>
                      </Select>
                    </div>
                    <div>
                      <label class="form-label">Can Borrow</label>
                      <Select :modelValue="row.overrides.canBorrow == null ? '' : String(row.overrides.canBorrow)" @update:modelValue="row.overrides.canBorrow = $event === '' ? null : $event === 'true'">
                        <option value="">— Use default —</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </Select>
                    </div>

                    <Separator class="import-override-sep" />

                    <!-- ── Procurement & Financial ── -->
                    <div>
                      <label class="form-label">Supplier</label>
                      <Input v-model="row.overrides.supplier" placeholder="— Use invoice header —" />
                    </div>
                    <div>
                      <label class="form-label">Vendor</label>
                      <Input v-model="row.overrides.vendor" placeholder="— Use default —" />
                    </div>
                    <div>
                      <label class="form-label">Invoice #</label>
                      <Input v-model="row.overrides.invoiceNumber" placeholder="— Use invoice header —" />
                    </div>
                    <div>
                      <label class="form-label">Price ($)</label>
                      <Input type="number" step="0.01" min="0" :modelValue="row.unitPrice" @update:modelValue="row.unitPrice = $event === '' ? '' : Number($event)" placeholder="0.00" />
                    </div>
                    <div>
                      <label class="form-label">Purchase Date</label>
                      <Input type="date" v-model="row.overrides.purchaseDate" />
                    </div>
                    <div>
                      <label class="form-label">Supplier Status</label>
                      <Select v-model="row.overrides.supplierStatus">
                        <option value="">— None —</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Pending">Pending</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="Backordered">Backordered</option>
                      </Select>
                    </div>
                    <div>
                      <label class="form-label">FO Request ID</label>
                      <Input v-model="row.overrides.foRequestID" placeholder="Financial Office ref" />
                    </div>
                    <div>
                      <label class="form-label">Order ID</label>
                      <Input v-model="row.overrides.orderID" placeholder="— Use invoice header —" />
                    </div>
                    <div>
                      <label class="form-label">Funding Source</label>
                      <Input v-model="row.overrides.fundingSource" placeholder="— Use default —" />
                    </div>
                    <div>
                      <label class="form-label">Project Linked</label>
                      <Input v-model="row.overrides.projectLinked" placeholder="— Use default —" />
                    </div>

                    <Separator class="import-override-sep" />

                    <!-- ── Warranty ── -->
                    <div>
                      <label class="form-label">Warranty Start</label>
                      <Input type="date" v-model="row.overrides.warrantyStartDate" />
                    </div>
                    <div>
                      <label class="form-label">Warranty End</label>
                      <Input type="date" v-model="row.overrides.warrantyEnd" />
                    </div>
                    <div>
                      <label class="form-label">Warranty Vendor</label>
                      <Input v-model="row.overrides.warrantyVendor" placeholder="— Use default —" />
                    </div>
                    <div class="import-override-checkbox-row">
                      <Checkbox :checked="!!row.overrides.warrantyOnsite" @update:checked="row.overrides.warrantyOnsite = $event ? true : null" />
                      <label class="form-label" style="margin-bottom:0;">Warranty Onsite</label>
                    </div>

                    <Separator class="import-override-sep" />

                    <!-- ── Parent / Component ── -->
                    <div class="import-override-grid-full">
                      <label class="form-label">Parent Item (motherID)</label>
                      <div class="import-override-mother">
                        <Select v-model="row.overrides.motherID" class="import-override-mother-select">
                          <option value="">— No parent (standalone) —</option>
                          <option
                            v-for="sibling in importState.draftRows.filter(r => r.rowClass === 'item' && r._rowId !== row._rowId)"
                            :key="sibling._rowId"
                            :value="'_row:' + sibling._rowId"
                          >[Import] {{ sibling.itemName || '(unnamed)' }}</option>
                        </Select>
                        <Input
                          v-if="!row.overrides.motherID || !row.overrides.motherID.startsWith('_row:')"
                          v-model="row.overrides.motherID"
                          placeholder="Or enter existing item ID..."
                          class="import-override-mother-input"
                        />
                      </div>
                      <p v-if="row.overrides.motherID" class="import-override-mother-hint">
                        This item will be created as a component. It will NOT be independently borrowable.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Navigation -->
            <div class="form-actions">
              <Button type="button" variant="outline" @click="importStep = 3">
                &larr; Line Items
              </Button>
              <Button type="button" variant="default" @click="goToStep5">
                Next: Review &amp; Confirm &rarr;
              </Button>
            </div>
          </div>

          <!-- Step 5: Pre-Create Validation & Confirmation -->
          <div v-if="importStep === 5">
            <h3 class="form-section-title" style="margin-bottom:0.75rem;">Step 5: Review &amp; Confirm</h3>

            <ImportPreCreateSummary
              :rows="importState.draftRows"
              :defaults="importState.sharedDefaults"
              :invoiceMeta="importState.invoiceMeta"
            />

            <!-- Navigation -->
            <div class="form-actions" style="margin-top:1rem;">
              <Button type="button" variant="outline" @click="importStep = 4">
                &larr; Fields
              </Button>
              <Button
                type="button"
                variant="success"
                @click="submitImportItems"
                :disabled="importBlockingErrors.length > 0"
              >
                Create {{ importExpandedItemCount }} Items
              </Button>
            </div>
            <p v-if="importError" class="import-error-msg">{{ importError }}</p>
          </div>

          <!-- Step 6: Creating Progress -->
          <div v-if="importStep === 6" class="form-section" style="text-align:center;padding:2rem;">
            <Spinner :size="32" />
            <p style="font-size:0.875rem;font-weight:600;margin-top:0.75rem;">
              Creating item {{ importState.createProgress.current }} of {{ importState.createProgress.total }}...
            </p>
            <div class="import-progress-bar">
              <div
                class="import-progress-fill"
                :style="{ width: (importState.createProgress.total > 0 ? (importState.createProgress.current / importState.createProgress.total) * 100 : 0) + '%' }"
              ></div>
            </div>
          </div>

          <!-- Step 7: Summary -->
          <div v-if="importStep === 7" class="form-section">
            <h3 class="form-section-title">Import Complete</h3>
            <div class="import-summary">
              <p class="import-summary-success" v-if="importState.createProgress.successes.length > 0">
                ✓ {{ importState.createProgress.successes.length }} item(s) created successfully
              </p>
              <p class="import-summary-fail" v-if="importState.createProgress.failures.length > 0">
                ✗ {{ importState.createProgress.failures.length }} item(s) failed
              </p>
              <div v-if="importState.createProgress.failures.length > 0" class="import-failure-list">
                <p v-for="(f, i) in importState.createProgress.failures" :key="i" class="import-failure-item">
                  "{{ f.name }}" — {{ f.error }}
                </p>
              </div>
            </div>
            <div class="form-actions">
              <Button
                v-if="importState.createProgress.failures.length > 0"
                type="button"
                variant="outline"
                @click="retryFailedImports"
              >Retry Failed</Button>
              <Button type="button" variant="success" @click="showForm = false; resetForm()">
                Done
              </Button>
            </div>
          </div>
        </div>

        <!-- ════════════════════════════════════════════ -->
        <!-- MANUAL ADD FORM (existing)                  -->
        <!-- ════════════════════════════════════════════ -->
        <form v-if="addMode === 'manual' || editingItem" @submit.prevent="handleSubmit">
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
              <h3 class="form-section-title" style="margin:0">Invoice Assist &amp; Documents</h3>
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
                  Upload Invoice / Receipt
                </button>
                <button
                  type="button"
                  @click="invoiceMode = 'camera'"
                  class="form-invoice-mode-btn"
                  :class="{ 'form-invoice-mode-btn--active': invoiceMode === 'camera' }"
                >
                  Photo Invoice
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
                    <p class="font-semibold mb-1 text-sm">{{ isDraggingInvoice ? 'Drop invoice here' : 'Upload invoice or receipt image / PDF' }}</p>
                    <p class="text-xs text-muted mb-3">PNG, JPG, PDF (Max 10MB) — text will be auto-extracted</p>
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

              <!-- OCR Review Confirmation Card -->
              <div v-if="ocrReviewData && !ocrProcessing" class="mb-4 p-4 border rounded-lg" style="border-color:var(--accent);background:var(--accent-surface, var(--filter-bg))">
                <div class="flex items-center justify-between mb-3">
                  <p class="text-sm font-semibold" style="color:var(--accent)">Extracted Invoice Data</p>
                  <span v-if="ocrConfidence" class="text-xs px-2 py-0.5 rounded-full font-semibold"
                    :style="ocrConfidence >= 60 ? 'background:var(--success-light);color:var(--success-dark)' : 'background:var(--warning-light, #fef3cd);color:var(--warning-dark, #856404)'">
                    {{ ocrConfidence >= 60 ? 'High' : 'Low' }} · {{ ocrConfidence }}%
                  </span>
                </div>
                <div class="space-y-1.5 text-xs mb-3" style="color:var(--text-primary)">
                  <label v-if="ocrReviewData.name" class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" v-model="ocrFieldSelection.name" class="accent-[var(--accent)]" />
                    <span class="font-semibold w-28 shrink-0">Item Name:</span><span>{{ ocrReviewData.name }}</span>
                  </label>
                  <label v-if="ocrReviewData.invoiceNumber" class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" v-model="ocrFieldSelection.invoiceNumber" class="accent-[var(--accent)]" />
                    <span class="font-semibold w-28 shrink-0">Invoice #:</span><span>{{ ocrReviewData.invoiceNumber }}</span>
                  </label>
                  <label v-if="ocrReviewData.orderID" class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" v-model="ocrFieldSelection.orderID" class="accent-[var(--accent)]" />
                    <span class="font-semibold w-28 shrink-0">PO / Order #:</span><span>{{ ocrReviewData.orderID }}</span>
                  </label>
                  <label v-if="ocrReviewData.supplier" class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" v-model="ocrFieldSelection.supplier" class="accent-[var(--accent)]" />
                    <span class="font-semibold w-28 shrink-0">Supplier:</span><span>{{ ocrReviewData.supplier }}</span>
                  </label>
                  <label v-if="ocrReviewData.price" class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" v-model="ocrFieldSelection.price" class="accent-[var(--accent)]" />
                    <span class="font-semibold w-28 shrink-0">Price:</span><span>${{ ocrReviewData.price }}</span>
                  </label>
                  <label v-if="ocrReviewData.purchaseDate" class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" v-model="ocrFieldSelection.purchaseDate" class="accent-[var(--accent)]" />
                    <span class="font-semibold w-28 shrink-0">Purchase Date:</span><span>{{ ocrReviewData.purchaseDate }}</span>
                  </label>
                  <label v-if="ocrReviewData.serialNumber" class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" v-model="ocrFieldSelection.serialNumber" class="accent-[var(--accent)]" />
                    <span class="font-semibold w-28 shrink-0">Serial #:</span><span>{{ ocrReviewData.serialNumber }} <span class="text-muted">(→ description)</span></span>
                  </label>
                  <label v-if="ocrReviewData.warrantyVendor" class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" v-model="ocrFieldSelection.warrantyVendor" class="accent-[var(--accent)]" />
                    <span class="font-semibold w-28 shrink-0">Warranty Vendor:</span><span>{{ ocrReviewData.warrantyVendor }}</span>
                  </label>
                  <div v-if="ocrReviewData.warrantyMonths" class="flex items-center gap-2 pl-5">
                    <span class="font-semibold w-28 shrink-0">Warranty:</span><span>{{ ocrReviewData.warrantyMonths }} months (until {{ ocrReviewData.warrantyEnd }}) <span class="text-muted">(info only)</span></span>
                  </div>
                  <div v-if="ocrReviewData.quantity" class="flex items-center gap-2 pl-5">
                    <span class="font-semibold w-28 shrink-0">Quantity:</span><span>{{ ocrReviewData.quantity }} <span class="text-muted">(info only)</span></span>
                  </div>
                  <div v-if="Object.keys(ocrReviewData).length === 0" class="text-muted py-2">No fields could be extracted. Try a clearer image or PDF.</div>
                </div>
                <div class="flex gap-2">
                  <Button type="button" variant="success" size="sm" @click="acceptOCRData">Apply Selected</Button>
                  <Button type="button" variant="outline" size="sm" @click="dismissOCRData">Dismiss</Button>
                  <Button type="button" variant="outline" size="sm" @click="scanAgain">Scan Again</Button>
                </div>
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
import { inventoryService, userService, authService, invoiceImportService } from '../utils/services'
import { formatDate, exportToExcel, ITEM_STATUSES, normalizeItemStatus } from '../utils/helpers'
import { useActionLock } from '../hooks/useActionLock'
import { usePermissions } from '../hooks/usePermissions'
import { MoreVertical, Pencil, Trash2, Zap, ChevronDown, Search, Columns3 } from 'lucide-vue-next'
import DropdownWithOther from '../components/DropdownWithOther.vue'
import DeleteBlockModal from '../components/DeleteBlockModal.vue'
import InvoiceImportReviewTable from '../components/InvoiceImportReviewTable.vue'
import InvoiceImportDefaults from '../components/InvoiceImportDefaults.vue'
import ImportStepIndicator from '../components/ImportStepIndicator.vue'
import ImportPreCreateSummary from '../components/ImportPreCreateSummary.vue'
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
  UiSeparator as Separator,
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
    ImportPreCreateSummary,
    ImportStepIndicator,
    Input,
    InvoiceImportDefaults,
    InvoiceImportReviewTable,
    ModulePageHeader,
    MoreVertical,
    Pencil,
    Search,
    Select,
    Separator,
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
    const ocrReviewData = ref(null) // Phase 3: extracted data waiting for user confirmation
    const ocrConfidence = ref(0)
    const ocrFieldSelection = ref({})
    let ocrWorker = null
    let ocrWorkerReady = false
    let invoiceCameraStream = null

    // ── Invoice Import (Azure) wizard state ─────────
    const addMode = ref('manual')        // 'manual' | 'import'
    const importStep = ref(1)            // 1=upload, 2=header+review, 3=creating, 4=summary
    const importAnalyzing = ref(false)
    const importError = ref('')
    const importInvoiceFile = ref(null)  // File object from upload
    const importDragOver = ref(false)    // drag-over state for dropzone


    const defaultImportState = () => ({
      invoiceMeta: {
        supplier: '', invoiceNumber: '', purchaseDate: '', orderID: '',
        totalAmount: null, subtotal: null, totalTax: null, currency: 'HKD', customerName: '',
      },
      draftRows: [],
      sharedDefaults: {
        owner: 'department', departmentID: 'COMP', location: 'Lab A',
        category: 'Computer', type: 'Hardware', fundingSource: '',
        projectLinked: '', warrantyStartDate: '', warrantyEnd: '',
        warrantyVendor: '', warrantyOnsite: false, status: 'Available',
        vendor: '', canBorrow: true,
      },
      rawFields: null,
      warnings: [],
      confidence: null,
      createProgress: { current: 0, total: 0, successes: [], failures: [] },
    })
    const importState = ref(defaultImportState())

    const resetImportState = () => {
      addMode.value = 'manual'
      importStep.value = 1
      importAnalyzing.value = false
      importError.value = ''
      importInvoiceFile.value = null
      importDragOver.value = false
      importState.value = defaultImportState()
    }

    const importConfidenceClass = computed(() => {
      const c = importState.value.confidence
      if (c == null) return ''
      if (c >= 0.8) return 'import-confidence--high'
      if (c >= 0.5) return 'import-confidence--mid'
      return 'import-confidence--low'
    })

    // ── New: 7-step wizard helpers ──────────────
    const importInspectorOpen = ref(false)

    const importMaxStep = computed(() => {
      // Highest step the user can reach (prevents skipping ahead)
      if (importState.value.draftRows.length === 0) return 1
      return 5
    })

    const importExpandedItemCount = computed(() => {
      return importState.value.draftRows
        .filter(r => r.rowClass === 'item')
        .reduce((sum, r) => sum + Math.max(1, r.quantity || 1), 0)
    })

    const importBlockingErrors = computed(() => {
      const errs = []
      const sd = importState.value.sharedDefaults
      const activeRows = importState.value.draftRows.filter(r => r.rowClass === 'item')
      activeRows.forEach((row, idx) => {
        if (!row.itemName) errs.push(`Row ${idx + 1}: Name is required.`)
        if (!(row.overrides?.type || sd.type)) errs.push(`Row ${idx + 1}: Type is required.`)
        if (!(row.overrides?.category || sd.category)) errs.push(`Row ${idx + 1}: Category is required.`)
      })
      if (activeRows.length === 0) errs.push('No items selected for creation.')
      return errs
    })

    const flattenedRawFields = computed(() => {
      const raw = importState.value.rawFields
      if (!raw) return {}
      const out = {}
      for (const [key, field] of Object.entries(raw)) {
        if (key === 'Items') continue // line items shown in step 3
        const val = field?.content || field?.valueString || ''
        const conf = field?.confidence != null ? ` (${Math.round(field.confidence * 100)}%)` : ''
        if (val) out[key] = val + conf
      }
      return out
    })

    const navigateImportStep = (step) => {
      if (step < importStep.value && step <= 5) {
        importStep.value = step
      }
    }

    const confirmReupload = () => {
      if (importState.value.draftRows.length > 0) {
        if (!window.confirm('Discard current review data and re-upload a different invoice?')) return
      }
      importStep.value = 1
      importState.value = defaultImportState()
      importInvoiceFile.value = null
      importError.value = ''
      importInspectorOpen.value = false
    }

    const viewImportInvoice = () => {
      if (importInvoiceFile.value) {
        const url = URL.createObjectURL(importInvoiceFile.value)
        window.open(url, '_blank')
      }
    }

    const copyRawFieldsJSON = () => {
      const raw = importState.value.rawFields
      if (raw) {
        navigator.clipboard.writeText(JSON.stringify(raw, null, 2)).catch(() => {})
      }
    }

    const goToStep4 = () => {
      const activeRows = importState.value.draftRows.filter(r => r.rowClass === 'item')
      if (activeRows.length === 0) {
        importError.value = 'Select at least one inventory item to continue.'
        return
      }
      importError.value = ''
      importStep.value = 4
    }

    const goToStep5 = () => {
      importError.value = ''
      importStep.value = 5
    }

    const hasRowOverrides = (row) => {
      if (!row.overrides) return false
      return Object.values(row.overrides).some(v => v !== '' && v !== null && v !== undefined)
    }

    const rowReadinessLabel = (row) => {
      if (row.rowClass === 'excluded') return '— Excluded'
      if (row.rowClass === 'non-inventory') return '🏷 Non-inventory'
      const sd = importState.value.sharedDefaults
      if (!row.itemName) return '⚠ Incomplete'
      if (!(row.overrides?.type || sd.type)) return '⚠ Incomplete'
      if (!(row.overrides?.category || sd.category)) return '⚠ Incomplete'
      return '✓ Ready'
    }

    const rowReadinessClass = (row) => {
      const label = rowReadinessLabel(row)
      if (label.includes('Ready')) return 'import-readiness--ready'
      if (label.includes('Incomplete')) return 'import-readiness--incomplete'
      return 'import-readiness--excluded'
    }

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

    const { isAdmin, isTeacher, canManageItems: canManageInventory } = usePermissions()

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
      ocrReviewData.value = null
      ocrMessage.value = ''
      ocrConfidence.value = 0
      resetImportState()
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

    // ── Invoice Import (Azure) methods ──────────────
    const handleImportInvoiceUpload = async (e) => {
      const file = e.target?.files?.[0]
      if (!file) return
      importInvoiceFile.value = file
      importError.value = ''
      importAnalyzing.value = true

      try {
        const result = await invoiceImportService.analyzeInvoice(file)
        if (!result.success) {
          importError.value = 'Analysis returned no results.'
          importAnalyzing.value = false
          return
        }

        // Populate import state from normalized result
        const meta = result.invoiceMeta || {}
        importState.value.invoiceMeta = { ...importState.value.invoiceMeta, ...meta }
        importState.value.warnings = result.warnings || []
        importState.value.confidence = result.confidence
        importState.value.rawFields = result.rawFields || null

        // Build draft rows from line items
        const lineItems = result.lineItems || []
        importState.value.draftRows = lineItems.map(li => {
          // Derive unitPrice from lineTotal / qty when Azure didn't extract unitPrice
          let unitPrice = li.unitPrice != null ? li.unitPrice : ''
          const qty = li.quantity || 1
          if ((unitPrice === '' || unitPrice == null) && li.lineTotal != null && qty > 0) {
            unitPrice = li.lineTotal / qty
          }
          return {
          _rowId: crypto.randomUUID(),
          rowClass: 'item', // 'item' | 'non-inventory' | 'excluded'
          itemName: li.description || '',
          quantity: qty,
          unitPrice,
          lineTotal: li.lineTotal != null ? li.lineTotal : '',
          productCode: li.productCode || '',
          description: '',
          confidence: li.confidence,
          validationErrors: [],
          expanded: false,
          overrides: {
            type: '', category: '', location: '', owner: '',
            departmentID: '', fundingSource: '', warrantyStartDate: '',
            warrantyEnd: '', warrantyVendor: '', warrantyOnsite: null,
            universityID: '', status: '', canBorrow: null,
            vendor: '', projectLinked: '', motherID: '',
            supplier: '', invoiceNumber: '', purchaseDate: '',
            supplierStatus: '', foRequestID: '', orderID: '',
          },
        }
        })

        // Auto-detect non-inventory rows (shipping, fees, tax, services)
        // Note: \b word boundary does not work with CJK characters, so CJK patterns are separate
        const nonInvPatternEn = /\b(shipping|delivery|deliver|freight|tax|vat|gst|fee|service\s?charge|install(ation)?|assembly|labour|labor|discount|handling|surcharge|rebate|credit|adjustment|deposit|setup|support|maintenance|bundling|recycling|no\s?charge|foc|free\s?of\s?charge|pre.?install)\b/i
        const nonInvPatternCJK = /送貨|運費|砌機|安裝|組裝|回收|稅|服務費/
        for (const row of importState.value.draftRows) {
          if (nonInvPatternEn.test(row.itemName) || nonInvPatternCJK.test(row.itemName) || (row.unitPrice !== '' && Number(row.unitPrice) <= 0)) {
            row.rowClass = 'non-inventory'
          }
        }

        importStep.value = 2
      } catch (err) {
        importError.value = err.message || 'Failed to analyze invoice.'
      } finally {
        importAnalyzing.value = false
      }
    }

    const handleImportInvoiceDrop = (e) => {
      e.preventDefault()
      const file = e.dataTransfer?.files?.[0]
      if (!file) return
      // Trigger the same handler via a synthetic event-like object
      handleImportInvoiceUpload({ target: { files: [file] } })
    }

    const addImportRow = () => {
      importState.value.draftRows.push({
        _rowId: crypto.randomUUID(),
        rowClass: 'item',
        itemName: '',
        quantity: 1,
        unitPrice: '',
        lineTotal: '',
        productCode: '',
        description: '',
        confidence: null,
        validationErrors: [],
        expanded: false,
        overrides: {
          type: '', category: '', location: '', owner: '',
          departmentID: '', fundingSource: '', warrantyStartDate: '',
          warrantyEnd: '', warrantyVendor: '', warrantyOnsite: null,
          universityID: '', status: '', canBorrow: null,
          vendor: '', projectLinked: '', motherID: '',
          supplier: '', invoiceNumber: '', purchaseDate: '',
          supplierStatus: '', foRequestID: '', orderID: '',
        },
      })
    }

    const excludeSelectedImportRows = () => {
      for (const row of importState.value.draftRows) {
        if (row.rowClass === 'item') {
          row.rowClass = 'excluded'
        }
      }
    }

    const restoreExcludedImportRows = () => {
      for (const row of importState.value.draftRows) {
        if (row.rowClass === 'excluded') {
          row.rowClass = 'item'
        }
      }
    }

    const validateImportRows = () => {
      let valid = true
      const sd = importState.value.sharedDefaults
      for (const row of importState.value.draftRows) {
        row.validationErrors = []
        if (row.rowClass === 'item') {
          if (!row.itemName) { row.validationErrors.push('Name is required'); valid = false }
          if (!(row.overrides?.type || sd.type)) { row.validationErrors.push('Type is required'); valid = false }
          if (!(row.overrides?.category || sd.category)) { row.validationErrors.push('Category is required'); valid = false }
        }
      }
      if (importState.value.draftRows.filter(r => r.rowClass === 'item').length === 0) {
        importError.value = 'No items selected for creation.'
        return false
      }
      importError.value = ''
      return valid
    }

    const submitImportItems = async () => {
      if (!validateImportRows()) return

      const sd = importState.value.sharedDefaults
      const meta = importState.value.invoiceMeta
      const activeRows = importState.value.draftRows.filter(r => r.rowClass === 'item')

      // Sort: rows without motherID first (parents), then rows with motherID (children)
      const parentRows = activeRows.filter(r => !r.overrides?.motherID)
      const childRows = activeRows.filter(r => !!r.overrides?.motherID)
      const sortedRows = [...parentRows, ...childRows]

      // Map _rowId → created itemId (for resolving import-row parent references)
      const rowIdToItemId = {}

      // Build payload for a single row instance
      const buildPayload = (row) => {
        const ov = row.overrides || {}
        const desc = [row.description, row.productCode ? `Product Code: ${row.productCode}` : ''].filter(Boolean).join(' | ')

        // Resolve motherID: if it's a _row: reference, resolve to created itemId
        let resolvedMotherID = ov.motherID || ''
        if (resolvedMotherID.startsWith('_row:')) {
          const refRowId = resolvedMotherID.slice(5)
          resolvedMotherID = rowIdToItemId[refRowId] || ''
        }

        return {
          name: row.itemName,
          universityID: ov.universityID || '',
          type: ov.type || sd.type || 'Hardware',
          category: ov.category || sd.category || 'Other',
          status: ov.status || sd.status || 'Available',
          location: ov.location || sd.location || '',
          description: desc,
          supplier: ov.supplier || meta.supplier || '',
          invoiceNumber: ov.invoiceNumber || meta.invoiceNumber || '',
          price: Number(row.unitPrice) || 0,
          purchaseDate: ov.purchaseDate || meta.purchaseDate || '',
          supplierStatus: ov.supplierStatus || '',
          foRequestID: ov.foRequestID || '',
          orderID: ov.orderID || meta.orderID || '',
          owner: ov.owner || sd.owner || 'department',
          departmentID: ov.departmentID || sd.departmentID || '',
          fundingSource: ov.fundingSource || sd.fundingSource || '',
          projectLinked: ov.projectLinked || sd.projectLinked || '',
          vendor: ov.vendor || sd.vendor || '',
          warrantyStartDate: ov.warrantyStartDate || sd.warrantyStartDate || '',
          warrantyEnd: ov.warrantyEnd || sd.warrantyEnd || '',
          warrantyVendor: ov.warrantyVendor || sd.warrantyVendor || '',
          warrantyOnsite: ov.warrantyOnsite != null ? ov.warrantyOnsite : (sd.warrantyOnsite || false),
          canBorrow: ov.canBorrow != null ? ov.canBorrow : (sd.canBorrow != null ? sd.canBorrow : true),
          motherID: resolvedMotherID || null,
          _sourceRowId: row._rowId, // track for rowId→itemId mapping
        }
      }

      // Expand quantities and build payloads in sorted order
      const payloads = []
      for (const row of sortedRows) {
        const qty = Math.max(1, row.quantity || 1)
        for (let i = 0; i < qty; i++) {
          payloads.push(buildPayload(row))
        }
      }

      importStep.value = 6
      const progress = importState.value.createProgress
      progress.total = payloads.length
      progress.current = 0
      progress.successes = []
      progress.failures = []

      for (let i = 0; i < payloads.length; i++) {
        progress.current = i + 1
        const payload = { ...payloads[i] }
        const sourceRowId = payload._sourceRowId
        delete payload._sourceRowId
        try {
          const created = await inventoryService.addItem(payload)
          const createdId = created?.itemId || created?.id || `Item ${i + 1}`
          progress.successes.push({ itemId: createdId, name: payload.name })
          // Map row _rowId to created itemId for child resolution
          if (sourceRowId && !rowIdToItemId[sourceRowId]) {
            rowIdToItemId[sourceRowId] = createdId
          }
        } catch (err) {
          progress.failures.push({ index: i, name: payload.name, error: err.message, payload })
        }
      }

      importStep.value = 7
      // Refresh the items list
      await loadItems()
    }

    const retryFailedImports = async () => {
      const failures = [...importState.value.createProgress.failures]
      importState.value.createProgress.failures = []
      importStep.value = 6
      importState.value.createProgress.total = failures.length
      importState.value.createProgress.current = 0

      for (let i = 0; i < failures.length; i++) {
        importState.value.createProgress.current = i + 1
        try {
          const payload = failures[i].payload || { name: failures[i].name, canBorrow: true }
          const created = await inventoryService.addItem(payload)
          importState.value.createProgress.successes.push({ itemId: created?.itemId || created?.id, name: failures[i].name })
        } catch (err) {
          importState.value.createProgress.failures.push({ index: i, name: failures[i].name, error: err.message, payload: failures[i].payload })
        }
      }

      importStep.value = 7
      await loadItems()
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

    // ── Persistent Tesseract Worker ──
    const getOCRWorker = async () => {
      if (ocrWorker && ocrWorkerReady) return ocrWorker
      if (ocrWorker) { try { await ocrWorker.terminate() } catch (_) {} }
      ocrWorker = await Tesseract.createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text' || m.status === 'recognizing') {
            ocrProgress.value = Math.round(m.progress * 100)
            ocrMessage.value = `Scanning invoice... ${Math.round(m.progress * 100)}%`
          } else if (m.status) {
            ocrMessage.value = `${m.status}...`
          }
        }
      })
      ocrWorkerReady = true
      return ocrWorker
    }

    // ── Image Preprocessing (grayscale + contrast) ──
    const preprocessImage = (imageDataUrl, { skip = false } = {}) => {
      if (skip) return Promise.resolve(imageDataUrl)
      return new Promise((resolve) => {
        let resolved = false
        // Safety timeout — if preprocessing stalls, return original image
        const timer = setTimeout(() => {
          if (!resolved) { resolved = true; resolve(imageDataUrl) }
        }, 10000)
        const img = new Image()
        img.onload = () => {
          if (resolved) return
          try {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0)
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const data = imgData.data
            // Convert to grayscale and boost contrast
            for (let i = 0; i < data.length; i += 4) {
              let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
              // Simple contrast stretch
              gray = Math.min(255, Math.max(0, (gray - 128) * 1.5 + 128))
              data[i] = data[i + 1] = data[i + 2] = gray
            }
            ctx.putImageData(imgData, 0, 0)
            resolved = true
            clearTimeout(timer)
            resolve(canvas.toDataURL('image/jpeg', 0.95))
          } catch (_) {
            resolved = true
            clearTimeout(timer)
            resolve(imageDataUrl) // fallback to original on canvas error
          }
        }
        img.onerror = () => {
          if (!resolved) { resolved = true; clearTimeout(timer); resolve(imageDataUrl) }
        }
        img.src = imageDataUrl
      })
    }

    const extractTextFromImage = async (imageFile, { skipPreprocess = false } = {}) => {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = async (e) => {
          try {
            ocrProcessing.value = true
            ocrProgress.value = 0
            ocrMessage.value = 'Loading OCR engine and reading invoice...'

            // Preprocess image for better accuracy (skip for high-quality uploaded files)
            const processedImage = await preprocessImage(e.target.result, { skip: skipPreprocess })

            const worker = await getOCRWorker()
            const result = await worker.recognize(processedImage)

            const text = result.data.text
            const confidence = result.data.confidence || 0
            ocrConfidence.value = Math.round(confidence)

            if (!text || text.trim().length === 0) {
              ocrProcessing.value = false
              ocrSuccess.value = false
              ocrMessage.value = 'No text could be extracted from this image. Try a clearer photo or PDF.'
              resolve({})
              return
            }

            // Confidence threshold check
            if (confidence < 40) {
              ocrProcessing.value = false
              ocrSuccess.value = false
              ocrMessage.value = `Image quality too low for reliable extraction (confidence: ${Math.round(confidence)}%). Invoice is saved but data was not auto-filled. Try a clearer image.`
              resolve({})
              return
            }

            const extractedData = smartExtractData(text)
            ocrProcessing.value = false
            ocrSuccess.value = true

            const filledFields = Object.keys(extractedData).filter(k => extractedData[k])

            if (confidence < 60) {
              // Low confidence — show review card instead of auto-filling
              ocrReviewData.value = extractedData
              initFieldSelection(extractedData)
              ocrMessage.value = `Low confidence scan (${Math.round(confidence)}%). Please review extracted data before applying.`
            } else {
              // Good confidence — show review card for confirmation
              ocrReviewData.value = extractedData
              initFieldSelection(extractedData)
              ocrMessage.value = `Invoice scanned (${Math.round(confidence)}% confidence). ${filledFields.length} fields extracted — please review.`
            }
            
            resolve(extractedData)
          } catch (error) {
            console.error('OCR image error:', error)
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

            const pdf = await pdfjsLib.getDocument(e.target.result).promise
            let fullText = ''

            for (let i = 1; i <= pdf.numPages; i++) {
              ocrProgress.value = Math.round((i / pdf.numPages) * 50) // 0-50% for text extraction
              ocrMessage.value = `Reading PDF page ${i}/${pdf.numPages}...`
              const page = await pdf.getPage(i)
              const textContent = await page.getTextContent()
              fullText += textContent.items.map(item => item.str).join(' ') + '\n'
            }

            // If text layer is empty/near-empty, fallback to OCR via page rendering
            if (!fullText || fullText.trim().length < 20) {
              ocrMessage.value = 'Scanned PDF detected — using OCR (may take longer)...'
              let ocrText = ''
              for (let i = 1; i <= pdf.numPages; i++) {
                ocrProgress.value = 50 + Math.round((i / pdf.numPages) * 50) // 50-100% for OCR
                ocrMessage.value = `OCR on page ${i}/${pdf.numPages}...`
                const page = await pdf.getPage(i)
                const viewport = page.getViewport({ scale: 2.0 }) // Higher scale = better OCR
                const canvas = document.createElement('canvas')
                canvas.width = viewport.width
                canvas.height = viewport.height
                const ctx = canvas.getContext('2d')
                await page.render({ canvasContext: ctx, viewport }).promise
                // Preprocess and OCR the rendered page
                const pageImageData = canvas.toDataURL('image/jpeg', 0.95)
                const processedImage = await preprocessImage(pageImageData)
                const worker = await getOCRWorker()
                const result = await worker.recognize(processedImage)
                ocrText += result.data.text + '\n'
              }
              fullText = ocrText
            }

            if (!fullText || fullText.trim().length === 0) {
              ocrProcessing.value = false
              ocrSuccess.value = false
              ocrMessage.value = 'No text could be extracted from this PDF. Try a clearer scan.'
              resolve({})
              return
            }

            const extractedData = smartExtractData(fullText)
            ocrProcessing.value = false
            ocrSuccess.value = true

            const filledFields = Object.keys(extractedData).filter(k => extractedData[k])
            // Show review card instead of auto-filling
            ocrReviewData.value = extractedData
            initFieldSelection(extractedData)
            ocrMessage.value = `PDF scanned! ${filledFields.length} fields extracted — please review.`
            
            resolve(extractedData)
          } catch (error) {
            console.error('OCR PDF error:', error)
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

      // Invoice Number — require # or : delimiter, or INV-/REC- prefix
      const invoiceMatch = text.match(/(?:invoice\s*[#:]\s*)([A-Z0-9\-]+)/i)
        || text.match(/\b(INV[- ]?\d[\w\-]*)/i)
        || text.match(/(?:receipt\s*[#:]\s*)([A-Z0-9\-]+)/i)
      if (invoiceMatch) {
        extracted.invoiceNumber = invoiceMatch[1].trim()
      }

      // PO / Order Number → maps to orderID form field
      const poMatch = text.match(/(?:p\.?o\.?\s*(?:no\.?|number|#)?|order\s*(?:no\.?|number|#)?)[\s:]+([A-Z0-9\-]+)/i)
      if (poMatch) {
        extracted.orderID = poMatch[1].trim()
      }

      // Supplier/Company name — multiple strategies
      let supplierFound = false
      // Strategy 1: labeled supplier/vendor
      const supplierMatch = text.match(/(?:supplier|vendor|company|sold\s+by|from|bill\s+from)[\s:]+([A-Z][A-Za-z\s&.,'-]+?)(?=\n|$|invoice|date|address|tel|phone|fax)/i)
      if (supplierMatch) {
        extracted.supplier = supplierMatch[1].trim()
        supplierFound = true
      }
      // Strategy 2: company name patterns (Co., Ltd., Limited, Inc., Corp.)
      if (!supplierFound) {
        const companyMatch = text.match(/([A-Z][A-Za-z\s&.'-]*(?:Co\.\s*,?\s*Ltd\.?|Limited|Inc\.?|Corp\.?|Corporation|Group|Enterprise|Trading))/i)
        if (companyMatch) {
          extracted.supplier = companyMatch[1].trim()
          supplierFound = true
        }
      }
      // Strategy 3: first meaningful line (many invoices start with company name)
      if (!supplierFound) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3 && l.length < 80)
        if (lines.length > 0) {
          const firstLine = lines[0]
          // Only use if it looks like a name: starts uppercase, no leading digits,
          // at least 2 words, and not a common header keyword
          const skipWords = /invoice|receipt|date|page|total|tax|subtotal|amount|order|bill|statement|description|qty|quantity|unit|price/i
          if (/^[A-Z]/.test(firstLine) && !/^\d/.test(firstLine) && !skipWords.test(firstLine) && firstLine.split(/\s+/).length >= 2) {
            extracted.supplier = firstLine.substring(0, 60)
          }
        }
      }

      // Price — supports $, €, £, HK$, HKD, ¥, CNY, plain Total
      const currencySymbol = '(?:HK\\$|HKD|USD|CNY|RMB|[$€£¥])\\s*'
      const amountPattern = '([0-9,]+[.][0-9]{2}|[0-9,]+)'
      // Prefer Grand Total / Total / Amount Due (not Subtotal)
      const totalRegex = new RegExp('(?:(?:grand\\s+)?total|amount\\s*due)(?<!sub\\s*total)[\\s:]*' + currencySymbol + amountPattern, 'i')
      const totalRegex2 = new RegExp('\\btotal[\\s:]*' + currencySymbol + amountPattern, 'i')
      const anyCurrencyRegex = new RegExp(currencySymbol + amountPattern, 'gi')
      const totalPriceMatch = text.match(totalRegex) || text.match(totalRegex2)
      let priceMatch = totalPriceMatch
      if (!priceMatch) {
        // Use last currency match (usually the total at the bottom)
        let lastMatch = null
        let m
        while ((m = anyCurrencyRegex.exec(text)) !== null) lastMatch = m
        priceMatch = lastMatch
      }
      if (priceMatch) {
        extracted.price = priceMatch[1].replace(/,/g, '')
      }

      // Purchase Date — multiple date formats
      const datePatterns = [
        /(?:date|invoice\s*date|purchase\s*date|order\s*date)[\s:]+(\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
        /(?:date|invoice\s*date|purchase\s*date|order\s*date)[\s:]+(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i,
        /(?:date|invoice\s*date|purchase\s*date|order\s*date)[\s:]+(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})/i,
        /(?:date|invoice\s*date|purchase\s*date|order\s*date)[\s:]+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})/i,
      ]
      for (const pattern of datePatterns) {
        const dateMatch = text.match(pattern)
        if (dateMatch) {
          const parsed = new Date(dateMatch[1])
          if (!isNaN(parsed.getTime())) {
            extracted.purchaseDate = parsed.toISOString().split('T')[0]
          } else {
            extracted.purchaseDate = dateMatch[1]
          }
          break
        }
      }

      // Serial Number
      const serialMatch = text.match(/(?:s\.?\/?\s*n\.?|serial\s*(?:no\.?|number|#)?)[\s:]+([A-Za-z0-9\-]+)/i)
      if (serialMatch) {
        extracted.serialNumber = serialMatch[1].trim()
      }

      // Warranty period (months or years)
      const warrantyMatch = text.match(/warranty[\s:]*([0-9]+)\s*(month|year|yr|mo)/i)
      if (warrantyMatch) {
        const months = warrantyMatch[2].toLowerCase().includes('year') || warrantyMatch[2].toLowerCase().includes('yr')
          ? parseInt(warrantyMatch[1]) * 12
          : parseInt(warrantyMatch[1])
        extracted.warrantyMonths = months
        
        // Use purchase date if extracted, otherwise today
        const startDate = extracted.purchaseDate ? new Date(extracted.purchaseDate) : new Date()
        extracted.warrantyStartDate = startDate.toISOString().split('T')[0]
        const endDate = new Date(startDate)
        endDate.setMonth(endDate.getMonth() + months)
        extracted.warrantyEnd = endDate.toISOString().split('T')[0]
      }

      // Item description or model — require : or - delimiter
      const modelMatch = text.match(/(?:model|product\s*name|item\s*name|description|item)[\s:\-]+([^\n]+)/i)
      if (modelMatch) {
        extracted.name = modelMatch[1].trim().substring(0, 100)
      }

      // Quantity
      const qtyMatch = text.match(/(?:qty|quantity)[\s:]+(\d+)/i)
      if (qtyMatch) {
        extracted.quantity = parseInt(qtyMatch[1])
      }

      // Warranty Vendor
      const warrantyVendorMatch = text.match(/(?:warranty\s*(?:provided|by|vendor|service|support))[\s:]+([A-Z][A-Za-z\s&.,'-]+?)(?=\n|$|warranty|date|phone|tel)/i)
      if (warrantyVendorMatch) {
        extracted.warrantyVendor = warrantyVendorMatch[1].trim()
      }

      return extracted
    }

    const handleInvoiceUpload = async (event) => {
      const file = event.target.files[0]
      if (!file) return
      
      ocrMessage.value = ''
      ocrReviewData.value = null
      
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
        await extractTextFromImage(file, { skipPreprocess: true })
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
            width: { ideal: 1920 },
            height: { ideal: 1080 }
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
        ocrReviewData.value = null
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
        console.error('OCR capture error:', error)
      }
    }

    // ── OCR Review: Accept, Dismiss, or Scan Again ──
    const initFieldSelection = (data) => {
      const sel = {}
      const formKeys = Object.keys(defaultFormData)
      for (const key of Object.keys(data)) {
        if (formKeys.includes(key) || key === 'serialNumber') sel[key] = true
      }
      ocrFieldSelection.value = sel
    }

    const acceptOCRData = () => {
      if (!ocrReviewData.value) return
      const data = ocrReviewData.value
      const checked = ocrFieldSelection.value
      // Only apply fields that exist in defaultFormData AND are checked
      const validKeys = Object.keys(defaultFormData)
      const toApply = {}
      for (const key of Object.keys(data)) {
        if (validKeys.includes(key) && checked[key] !== false) {
          toApply[key] = data[key]
        }
      }
      // Special: append serialNumber to description if checked
      if (data.serialNumber && checked.serialNumber !== false) {
        const currentDesc = formData.value.description || ''
        const snText = `S/N: ${data.serialNumber}`
        if (!currentDesc.includes(snText)) {
          toApply.description = currentDesc ? `${currentDesc}\n${snText}` : snText
        }
      }
      formData.value = {
        ...formData.value,
        ...toApply,
        invoiceFile: invoiceFileData.value
      }
      const appliedCount = Object.keys(toApply).length
      ocrMessage.value = `${appliedCount} field${appliedCount !== 1 ? 's' : ''} applied to form.`
      ocrSuccess.value = true
      ocrReviewData.value = null
    }

    const dismissOCRData = () => {
      ocrReviewData.value = null
      ocrFieldSelection.value = {}
      ocrMessage.value = 'Extracted data dismissed. Invoice file is still saved.'
      ocrSuccess.value = true
    }

    const scanAgain = async () => {
      ocrReviewData.value = null
      ocrFieldSelection.value = {}
      if (!invoiceFileData.value) return
      const { data, type, name } = invoiceFileData.value
      // Re-run OCR on the stored file
      if (type === 'application/pdf') {
        const blob = await (await fetch(data)).blob()
        const file = new File([blob], name, { type })
        await extractTextFromPDF(file)
      } else if (type && type.startsWith('image/')) {
        const blob = await (await fetch(data)).blob()
        const file = new File([blob], name, { type })
        await extractTextFromImage(file)
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
      // Cleanup OCR worker
      if (ocrWorker) {
        try { ocrWorker.terminate() } catch (_) {}
        ocrWorker = null
        ocrWorkerReady = false
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
      ocrReviewData,
      ocrConfidence,
      ocrFieldSelection,
      acceptOCRData,
      dismissOCRData,
      scanAgain,
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
      // Invoice Import (Azure)
      addMode,
      importStep,
      importAnalyzing,
      importError,
      importInvoiceFile,
      importDragOver,
      importState,
      importConfidenceClass,
      importInspectorOpen,
      importMaxStep,
      importExpandedItemCount,
      importBlockingErrors,
      flattenedRawFields,
      navigateImportStep,
      confirmReupload,
      viewImportInvoice,
      copyRawFieldsJSON,
      goToStep4,
      goToStep5,
      hasRowOverrides,
      rowReadinessLabel,
      rowReadinessClass,
      handleImportInvoiceUpload,
      handleImportInvoiceDrop,
      addImportRow,
      excludeSelectedImportRows,
      restoreExcludedImportRows,
      submitImportItems,
      retryFailedImports,
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

/* ── Invoice Import Wizard ──────────────────────── */
.import-mode-switcher {
  display: flex;
  gap: 0;
  margin-bottom: 1.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  width: fit-content;
}
.import-mode-btn {
  padding: 0.45rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  border: none;
  background: var(--card);
  color: var(--muted-foreground);
  cursor: pointer;
  transition: all 0.15s;
}
.import-mode-btn:not(:last-child) {
  border-right: 1px solid var(--border);
}
.import-mode-btn:hover {
  background: var(--surface-2);
}
.import-mode-btn--active {
  background: var(--accent-surface);
  color: var(--accent);
}

.import-dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg);
  padding: 2.5rem 1rem;
  text-align: center;
  transition: border-color 0.15s, background 0.15s;
}
.import-dropzone--active {
  border-color: var(--accent);
  background: var(--accent-surface);
}

.import-browse-btn {
  display: inline-block;
  padding: 0.45rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  color: var(--accent);
  background: transparent;
  cursor: pointer;
  transition: background 0.15s;
}
.import-browse-btn:hover {
  background: var(--accent-surface);
}

.import-error-msg {
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  color: var(--danger);
  border: 1px solid var(--danger);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--danger) 6%, transparent);
}

.import-warnings {
  margin-bottom: 0.75rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--warning);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--warning) 8%, transparent);
}
.import-warning-line {
  font-size: 0.75rem;
  color: var(--warning);
  margin: 0.15rem 0;
}

.import-confidence-bar {
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  margin-bottom: 0.75rem;
}
.import-confidence-val {
  font-weight: 700;
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-sm);
}
.import-confidence--high {
  background: color-mix(in srgb, var(--success) 15%, transparent);
  color: var(--success);
}
.import-confidence--mid {
  background: color-mix(in srgb, var(--warning) 15%, transparent);
  color: var(--warning);
}
.import-confidence--low {
  background: color-mix(in srgb, var(--danger) 15%, transparent);
  color: var(--danger);
}

.import-progress-bar {
  width: 100%;
  height: 0.5rem;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-top: 0.75rem;
}
.import-progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: var(--radius-sm);
  transition: width 0.3s ease;
}

.import-summary {
  margin-bottom: 1rem;
}
.import-summary-success {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--success);
  margin: 0.25rem 0;
}
.import-summary-fail {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--danger);
  margin: 0.25rem 0;
}
.import-failure-list {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--danger);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--danger) 4%, transparent);
}
.import-failure-item {
  font-size: 0.75rem;
  color: var(--danger);
  margin: 0.15rem 0;
}

/* ── Import wizard: file info, inspector, overrides ── */
.import-file-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}
.import-inspector-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: var(--foreground);
  width: 100%;
  text-align: left;
}
.import-inspector-body {
  margin-top: 0.75rem;
  max-height: 16rem;
  overflow-y: auto;
}
.import-inspector-row {
  display: flex;
  gap: 0.75rem;
  padding: 0.2rem 0;
  font-size: 0.75rem;
  border-bottom: 1px solid var(--border);
}
.import-inspector-key {
  font-weight: 600;
  color: var(--muted-foreground);
  min-width: 10rem;
}
.import-inspector-val {
  color: var(--foreground);
  word-break: break-word;
}
.import-override-row {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  margin-bottom: 0.5rem;
  overflow: hidden;
}
.import-override-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  background: var(--surface-2);
  transition: background 0.15s;
}
.import-override-header:hover {
  background: color-mix(in srgb, var(--accent) 8%, var(--surface-2));
}
.import-override-expand {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  width: 1rem;
}
.import-override-name {
  flex: 1;
  font-size: 0.8125rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.import-override-qty {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}
.import-override-badge {
  font-size: 0.625rem;
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-sm);
  background: var(--accent-surface);
  color: var(--accent);
}
.import-override-readiness {
  font-size: 0.625rem;
  font-weight: 600;
  white-space: nowrap;
}
.import-override-panel {
  padding: 0.75rem;
  border-top: 1px solid var(--border);
  background: var(--card);
}
.import-override-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem 1rem;
}
.import-override-checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 1.25rem;
}
.import-override-sep {
  grid-column: 1 / -1;
  margin: 0.25rem 0;
}
.import-override-grid-full {
  grid-column: 1 / -1;
}
.import-override-mother {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.import-override-mother-select {
  flex: 1;
}
.import-override-mother-input {
  flex: 1;
}
.import-override-mother-hint {
  margin: 0.25rem 0 0;
  font-size: 0.6875rem;
  color: var(--info);
  font-weight: 500;
}
.import-readiness--ready {
  color: var(--success);
}
.import-readiness--incomplete {
  color: var(--warning);
}
.import-readiness--excluded {
  color: var(--muted-foreground);
}

</style>
