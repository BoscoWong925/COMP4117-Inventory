<template>
  <div class="import-review-table">
    <div class="import-review-toolbar">
      <span class="import-review-count">{{ selectedCount }} of {{ rows.length }} items selected</span>
      <div class="import-review-actions">
        <button type="button" class="import-review-btn" @click="$emit('addRow')">+ Add Row</button>
        <button
          type="button"
          class="import-review-btn import-review-btn--danger"
          :disabled="selectedCount === 0"
          @click="$emit('removeSelected')"
        >Remove Selected</button>
      </div>
    </div>

    <div class="import-review-scroll">
      <table class="import-review-table__el">
        <thead>
          <tr>
            <th class="import-review-th import-review-th--check">
              <input type="checkbox" :checked="allSelected" @change="toggleAll" />
            </th>
            <th class="import-review-th">Item Name <span class="form-required">*</span></th>
            <th class="import-review-th import-review-th--num">Qty</th>
            <th class="import-review-th import-review-th--num">Unit Price</th>
            <th class="import-review-th import-review-th--num">Line Total</th>
            <th class="import-review-th">Product Code</th>
            <th class="import-review-th">Description</th>
            <th class="import-review-th import-review-th--conf">Conf.</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row._rowId"
            class="import-review-row"
            :class="{ 'import-review-row--error': row.validationErrors && row.validationErrors.length > 0 }"
          >
            <td class="import-review-td import-review-td--check">
              <input type="checkbox" v-model="row.selected" />
            </td>
            <td class="import-review-td">
              <input
                type="text"
                class="import-review-input"
                v-model="row.itemName"
                placeholder="Item name"
              />
            </td>
            <td class="import-review-td import-review-td--num">
              <input
                type="number"
                class="import-review-input import-review-input--num"
                v-model.number="row.quantity"
                min="1"
              />
            </td>
            <td class="import-review-td import-review-td--num">
              <input
                type="number"
                class="import-review-input import-review-input--num"
                v-model.number="row.unitPrice"
                step="0.01"
                min="0"
              />
            </td>
            <td class="import-review-td import-review-td--num">
              <span class="import-review-readonly">{{ formatLineTotal(row) }}</span>
            </td>
            <td class="import-review-td">
              <input
                type="text"
                class="import-review-input"
                v-model="row.productCode"
                placeholder="—"
              />
            </td>
            <td class="import-review-td">
              <input
                type="text"
                class="import-review-input"
                v-model="row.description"
                placeholder="Notes"
              />
            </td>
            <td class="import-review-td import-review-td--conf">
              <span
                v-if="row.confidence != null"
                class="import-review-conf"
                :class="confidenceClass(row.confidence)"
              >{{ Math.round(row.confidence * 100) }}%</span>
              <span v-else class="import-review-conf import-review-conf--na">—</span>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="8" class="import-review-td import-review-empty">
              No line items detected. Click "Add Row" to add items manually.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Validation errors summary -->
    <div v-if="validationErrors.length > 0" class="import-review-errors">
      <p v-for="(err, i) in validationErrors" :key="i" class="import-review-error-line">{{ err }}</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InvoiceImportReviewTable',
  props: {
    rows: { type: Array, required: true },
  },
  emits: ['addRow', 'removeSelected'],
  computed: {
    selectedCount() {
      return this.rows.filter(r => r.selected).length
    },
    allSelected() {
      return this.rows.length > 0 && this.rows.every(r => r.selected)
    },
    validationErrors() {
      const errs = []
      this.rows.forEach((row, idx) => {
        if (row.validationErrors) {
          row.validationErrors.forEach(e => errs.push(`Row ${idx + 1}: ${e}`))
        }
      })
      return errs
    },
  },
  methods: {
    toggleAll() {
      const newVal = !this.allSelected
      this.rows.forEach(r => { r.selected = newVal })
    },
    formatLineTotal(row) {
      if (row.lineTotal != null && row.lineTotal !== '') return Number(row.lineTotal).toFixed(2)
      if (row.unitPrice && row.quantity) return (Number(row.unitPrice) * Number(row.quantity)).toFixed(2)
      return '—'
    },
    confidenceClass(conf) {
      if (conf >= 0.8) return 'import-review-conf--high'
      if (conf >= 0.5) return 'import-review-conf--mid'
      return 'import-review-conf--low'
    },
  },
}
</script>

<style scoped>
.import-review-table {
  margin-bottom: 1rem;
}
.import-review-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.import-review-count {
  font-size: 0.8125rem;
  color: var(--muted-foreground);
}
.import-review-actions {
  display: flex;
  gap: 0.5rem;
}
.import-review-btn {
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--card);
  color: var(--foreground);
  cursor: pointer;
  transition: all 0.15s;
}
.import-review-btn:hover {
  background: var(--surface-100);
}
.import-review-btn--danger {
  color: var(--danger);
  border-color: var(--danger);
}
.import-review-btn--danger:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.import-review-scroll {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.import-review-table__el {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}
.import-review-th {
  padding: 0.5rem 0.5rem;
  text-align: left;
  font-weight: 700;
  font-size: 0.75rem;
  color: var(--muted-foreground);
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
.import-review-th--check {
  width: 2rem;
  text-align: center;
}
.import-review-th--num {
  width: 6rem;
  text-align: right;
}
.import-review-th--conf {
  width: 3.5rem;
  text-align: center;
}
.import-review-row {
  transition: background 0.1s;
}
.import-review-row:hover {
  background: var(--surface-2);
}
.import-review-row--error {
  background: color-mix(in srgb, var(--danger) 6%, transparent);
}
.import-review-td {
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
.import-review-td--check {
  text-align: center;
}
.import-review-td--num {
  text-align: right;
}
.import-review-td--conf {
  text-align: center;
}
.import-review-empty {
  text-align: center;
  color: var(--muted-foreground);
  padding: 2rem 0.5rem;
}
.import-review-input {
  width: 100%;
  padding: 0.3rem 0.4rem;
  font-size: 0.8125rem;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--foreground);
  transition: border-color 0.15s;
}
.import-review-input:focus {
  outline: none;
  border-color: var(--accent);
  background: var(--card);
}
.import-review-input--num {
  text-align: right;
  width: 5rem;
}
.import-review-readonly {
  font-size: 0.8125rem;
  color: var(--muted-foreground);
}
.import-review-conf {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.1rem 0.3rem;
  border-radius: var(--radius-sm);
}
.import-review-conf--high {
  background: color-mix(in srgb, var(--success) 15%, transparent);
  color: var(--success);
}
.import-review-conf--mid {
  background: color-mix(in srgb, var(--warning) 15%, transparent);
  color: var(--warning);
}
.import-review-conf--low {
  background: color-mix(in srgb, var(--danger) 15%, transparent);
  color: var(--danger);
}
.import-review-conf--na {
  color: var(--muted-foreground);
}
.import-review-errors {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--danger);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--danger) 6%, transparent);
}
.import-review-error-line {
  font-size: 0.75rem;
  color: var(--danger);
  margin: 0.15rem 0;
}
.form-required {
  color: var(--danger);
}
</style>
