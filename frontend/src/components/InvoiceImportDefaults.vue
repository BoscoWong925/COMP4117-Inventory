<template>
  <div class="import-defaults">
    <h4 class="import-defaults-title">Shared Defaults</h4>
    <p class="import-defaults-hint">These values will be applied to all selected items on create.</p>

    <div class="import-defaults-grid">
      <div>
        <label class="form-label">Supplier</label>
        <input type="text" class="import-defaults-input" v-model="defaults.supplier" />
      </div>
      <div>
        <label class="form-label">Invoice #</label>
        <input type="text" class="import-defaults-input" v-model="defaults.invoiceNumber" />
      </div>
      <div>
        <label class="form-label">Purchase Date</label>
        <input type="date" class="import-defaults-input" v-model="defaults.purchaseDate" />
      </div>
      <div>
        <label class="form-label">PO / Order ID</label>
        <input type="text" class="import-defaults-input" v-model="defaults.orderID" />
      </div>
      <div>
        <label class="form-label">Type <span class="form-required">*</span></label>
        <select class="import-defaults-input" v-model="defaults.type">
          <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
      <div>
        <label class="form-label">Category <span class="form-required">*</span></label>
        <select class="import-defaults-input" v-model="defaults.category">
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div>
        <label class="form-label">Location</label>
        <select class="import-defaults-input" v-model="defaults.location">
          <option v-for="l in locations" :key="l" :value="l">{{ l }}</option>
        </select>
      </div>
      <div>
        <label class="form-label">Owner</label>
        <select class="import-defaults-input" v-model="defaults.owner">
          <option value="department">Department</option>
          <option v-for="t in teachers" :key="t.userId" :value="t.userId">{{ t.name || t.userId }}</option>
        </select>
      </div>
      <div>
        <label class="form-label">Department</label>
        <input type="text" class="import-defaults-input" v-model="defaults.departmentID" />
      </div>
      <div>
        <label class="form-label">Funding Source</label>
        <input type="text" class="import-defaults-input" v-model="defaults.fundingSource" />
      </div>
      <div>
        <label class="form-label">Warranty Start</label>
        <input type="date" class="import-defaults-input" v-model="defaults.warrantyStartDate" />
      </div>
      <div>
        <label class="form-label">Warranty End</label>
        <input type="date" class="import-defaults-input" v-model="defaults.warrantyEnd" />
      </div>
      <div>
        <label class="form-label">Warranty Vendor</label>
        <input type="text" class="import-defaults-input" v-model="defaults.warrantyVendor" />
      </div>
      <div class="import-defaults-checkbox-row">
        <label class="form-label">
          <input type="checkbox" v-model="defaults.warrantyOnsite" /> Warranty Onsite
        </label>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InvoiceImportDefaults',
  props: {
    defaults: { type: Object, required: true },
    types: { type: Array, default: () => ['Hardware', 'Software', 'Component'] },
    categories: { type: Array, default: () => ['Computer', 'Peripheral', 'Network', 'Other'] },
    locations: { type: Array, default: () => ['Lab A', 'Lab B', 'Office', 'Storage'] },
    teachers: { type: Array, default: () => [] },
  },
}
</script>

<style scoped>
.import-defaults {
  padding: 1rem 1.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--card);
  margin-bottom: 1rem;
}
.import-defaults-title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin: 0 0 0.25rem;
}
.import-defaults-hint {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin: 0 0 0.75rem;
}
.import-defaults-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem 1rem;
}
.import-defaults-input {
  width: 100%;
  padding: 0.45rem 0.5rem;
  font-size: 0.8125rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--background);
  color: var(--foreground);
  transition: border-color 0.15s;
}
.import-defaults-input:focus {
  outline: none;
  border-color: var(--accent);
}
.import-defaults-checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 1.25rem;
}
.form-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted-foreground);
  margin-bottom: 0.25rem;
}
.form-required {
  color: var(--danger);
}
</style>
