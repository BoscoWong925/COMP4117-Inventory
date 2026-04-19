<template>
  <Card class="irt">
    <!-- ── Toolbar ── -->
    <div class="irt-toolbar">
      <div class="irt-toolbar-left">
        <Badge variant="outline" class="irt-stat-badge">
          <span class="irt-stat-num">{{ activeCount }}</span> of {{ rows.length }} rows active
        </Badge>
        <Badge v-if="hasQuantityExpansion" variant="accent" class="irt-stat-badge">
          {{ expandedItemCount }} inventory items
          <span class="irt-stat-dim">({{ rowsWithQtyGt1 }} row{{ rowsWithQtyGt1 > 1 ? 's' : '' }} with qty&gt;1)</span>
        </Badge>
      </div>
      <div class="irt-toolbar-right">
        <Button size="sm" variant="outline" @click="emit('addRow')">+ Add Row</Button>
        <Button v-if="excludedCount > 0" size="sm" variant="outline" @click="emit('restoreExcluded')">
          Restore {{ excludedCount }} Excluded
        </Button>
      </div>
    </div>

    <!-- ── Quantity expansion callout ── -->
    <div v-if="hasQuantityExpansion" class="irt-expansion-callout">
      <div class="irt-expansion-icon">i</div>
      <div>
        <strong>{{ activeCount }} selected rows</strong> will create
        <strong>{{ expandedItemCount }} inventory items</strong> because
        {{ rowsWithQtyGt1 }} row{{ rowsWithQtyGt1 > 1 ? 's have' : ' has' }}
        quantity &gt; 1:
        <span v-for="(r, i) in qtyExpandedRows" :key="r._rowId" class="irt-expansion-detail">
          {{ i > 0 ? ', ' : '' }}{{ r.itemName || '(unnamed)' }} &times;{{ r.quantity }}
        </span>
      </div>
    </div>

    <!-- ── Table ── -->
    <div class="irt-scroll">
      <table class="irt-table">
        <thead>
          <tr>
            <th class="irt-th irt-th--check">
              <Checkbox :checked="allActive" :indeterminate="someActive && !allActive" @update:checked="toggleAll" />
            </th>
            <th class="irt-th irt-th--idx">#</th>
            <th class="irt-th irt-th--class">Class</th>
            <th class="irt-th irt-th--name">Item Name <span class="irt-req">*</span></th>
            <th class="irt-th irt-th--qty">Qty</th>
            <th class="irt-th irt-th--price">Unit $</th>
            <th class="irt-th irt-th--total">Total</th>
            <th class="irt-th irt-th--code">Product Code</th>
            <th class="irt-th irt-th--conf">Conf</th>
            <th class="irt-th irt-th--ready">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in rows"
            :key="row._rowId"
            class="irt-row"
            :class="{
              'irt-row--excluded': row.rowClass === 'excluded',
              'irt-row--noninv': row.rowClass === 'non-inventory',
              'irt-row--qty-multi': row.rowClass === 'item' && (row.quantity || 1) > 1,
            }"
          >
            <td class="irt-td irt-td--check">
              <Checkbox :checked="row.rowClass === 'item'" @update:checked="toggleRowActive(row)" />
            </td>
            <td class="irt-td irt-td--idx">{{ idx + 1 }}</td>
            <td class="irt-td irt-td--class">
              <Select :modelValue="row.rowClass" @update:modelValue="row.rowClass = $event" class="irt-class-sel">
                <option value="item">Item</option>
                <option value="non-inventory">Non-inv</option>
                <option value="excluded">Exclude</option>
              </Select>
            </td>
            <td class="irt-td irt-td--name">
              <Input v-model="row.itemName" placeholder="Item name" class="irt-input" />
            </td>
            <td class="irt-td irt-td--qty">
              <Input type="number" :modelValue="row.quantity" @update:modelValue="row.quantity = Number($event) || 1" min="1" class="irt-input irt-input--num" />
              <Badge v-if="row.rowClass === 'item' && (row.quantity || 1) > 1" variant="accent" class="irt-qty-badge">
                &rarr;{{ row.quantity }} items
              </Badge>
            </td>
            <td class="irt-td irt-td--price">
              <Input type="number" :modelValue="row.unitPrice" @update:modelValue="row.unitPrice = $event === '' ? '' : Number($event)" step="0.01" min="0" class="irt-input irt-input--num" />
            </td>
            <td class="irt-td irt-td--total">
              <span class="irt-readonly">${{ formatLineTotal(row) }}</span>
              <span v-if="hasLineTotalMismatch(row)" class="irt-mismatch" :title="'Azure extracted $' + Number(row.lineTotal).toFixed(2) + ' but unitPrice×qty = $' + (Number(row.unitPrice) * Math.max(1, row.quantity || 1)).toFixed(2)">
                ⚠
              </span>
              <span v-if="row.unitPrice === '' || row.unitPrice == null" class="irt-missing-price" title="No unit price from OCR — enter manually">?</span>
            </td>
            <td class="irt-td irt-td--code">
              <Input v-model="row.productCode" placeholder="—" class="irt-input irt-input--sm" />
            </td>
            <td class="irt-td irt-td--conf">
              <Badge v-if="row.confidence != null" :variant="confidenceVariant(row.confidence)">{{ Math.round(row.confidence * 100) }}%</Badge>
              <span v-else class="irt-dim">—</span>
            </td>
            <td class="irt-td irt-td--ready">
              <Badge :variant="readinessVariant(row)">{{ readinessLabel(row) }}</Badge>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="10" class="irt-td irt-empty">
              No line items detected. Click "+ Add Row" to add items manually.
            </td>
          </tr>
        </tbody>
        <tfoot v-if="rows.length > 0">
          <tr class="irt-footer">
            <td colspan="4" class="irt-td irt-td--foot-label">
              <strong>{{ activeCount }}</strong> active rows
              <template v-if="hasQuantityExpansion">
                &rarr; <strong>{{ expandedItemCount }}</strong> items
              </template>
            </td>
            <td class="irt-td irt-td--num irt-td--foot-val">{{ totalQty }}</td>
            <td class="irt-td irt-td--foot-label"></td>
            <td class="irt-td irt-td--num irt-td--foot-val">${{ grandTotal }}</td>
            <td colspan="3"></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- ── Financial reconciliation ── -->
    <div v-if="invoiceHeaderTotal != null" class="irt-recon">
      <div class="irt-recon-title">Financial Summary</div>
      <div class="irt-recon-grid">
        <span class="irt-recon-label">Invoice total (header)</span>
        <span class="irt-recon-val">${{ invoiceHeaderTotal.toFixed(2) }}</span>

        <span class="irt-recon-label">Selected inventory rows</span>
        <span class="irt-recon-val irt-recon-val--accent">${{ grandTotal }}</span>

        <span class="irt-recon-label">Non-inventory / excluded rows</span>
        <span class="irt-recon-val">${{ nonActiveTotal.toFixed(2) }}</span>

        <template v-if="reconDifference != null && Math.abs(reconDifference) > 0.01">
          <span class="irt-recon-label irt-recon-label--diff">Unreconciled difference</span>
          <span class="irt-recon-val irt-recon-val--diff">${{ reconDifference.toFixed(2) }}</span>
        </template>
      </div>
      <p v-if="nonActiveTotal > 0" class="irt-recon-note">
        The difference between invoice total and inventory total is expected — non-inventory rows
        (delivery, assembly, service fees, etc.) are not created as inventory items.
      </p>
      <p v-if="reconDifference != null && Math.abs(reconDifference) > 0.5" class="irt-recon-warn">
        ⚠ There is an unreconciled difference of ${{ Math.abs(reconDifference).toFixed(2) }}.
        This may be due to rounding, tax adjustments, or OCR extraction inaccuracies.
        Please verify row prices before creating items.
      </p>
    </div>

    <!-- ── Validation errors ── -->
    <div v-if="validationErrors.length > 0" class="irt-errors">
      <p v-for="(err, i) in validationErrors" :key="i" class="irt-error-line">{{ err }}</p>
    </div>
  </Card>
</template>

<script setup>
import { computed } from 'vue'
import {
  UiButton as Button,
  UiBadge as Badge,
  UiCard as Card,
  UiCheckbox as Checkbox,
  UiSelect as Select,
  UiInput as Input,
} from '@/components/ui'

const props = defineProps({
  rows: { type: Array, required: true },
  sharedDefaults: { type: Object, default: () => ({}) },
  invoiceMeta: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['addRow', 'excludeSelected', 'restoreExcluded'])

/* ── Computed counts ── */
const activeRows = computed(() => props.rows.filter(r => r.rowClass === 'item'))
const activeCount = computed(() => activeRows.value.length)
const excludedCount = computed(() => props.rows.filter(r => r.rowClass === 'excluded').length)
const allActive = computed(() => props.rows.length > 0 && props.rows.every(r => r.rowClass === 'item'))
const someActive = computed(() => props.rows.some(r => r.rowClass === 'item'))

const expandedItemCount = computed(() =>
  activeRows.value.reduce((sum, r) => sum + Math.max(1, r.quantity || 1), 0)
)
const hasQuantityExpansion = computed(() => expandedItemCount.value !== activeCount.value)
const rowsWithQtyGt1 = computed(() => activeRows.value.filter(r => (r.quantity || 1) > 1).length)
const qtyExpandedRows = computed(() => activeRows.value.filter(r => (r.quantity || 1) > 1))

const totalQty = computed(() =>
  activeRows.value.reduce((sum, r) => sum + Math.max(1, r.quantity || 1), 0)
)
const grandTotal = computed(() => {
  const t = activeRows.value.reduce((sum, r) => sum + computeRowTotal(r), 0)
  return t.toFixed(2)
})

/* ── Financial reconciliation ── */
const invoiceHeaderTotal = computed(() => {
  const v = Number(props.invoiceMeta?.totalAmount)
  return isNaN(v) || v == null ? null : v
})
const nonActiveTotal = computed(() => {
  return props.rows
    .filter(r => r.rowClass !== 'item')
    .reduce((sum, r) => sum + computeRowTotal(r), 0)
})
const reconDifference = computed(() => {
  if (invoiceHeaderTotal.value == null) return null
  return invoiceHeaderTotal.value - (parseFloat(grandTotal.value) + nonActiveTotal.value)
})

const validationErrors = computed(() => {
  const errs = []
  props.rows.forEach((row, idx) => {
    if (row.validationErrors) {
      row.validationErrors.forEach(e => errs.push(`Row ${idx + 1}: ${e}`))
    }
  })
  return errs
})

/* ── Actions ── */
function toggleAll() {
  const newClass = allActive.value ? 'excluded' : 'item'
  props.rows.forEach(r => {
    if (r.rowClass !== 'non-inventory') r.rowClass = newClass
  })
}

function toggleRowActive(row) {
  row.rowClass = row.rowClass === 'item' ? 'excluded' : 'item'
}

/* ── Formatters ── */
function computeRowTotal(row) {
  const price = Number(row.unitPrice) || 0
  const qty = Math.max(1, row.quantity || 1)
  if (price !== 0) return price * qty
  // fallback to Azure lineTotal when unitPrice is missing
  if (row.lineTotal != null && row.lineTotal !== '') return Number(row.lineTotal) || 0
  return 0
}

function formatLineTotal(row) {
  const computed = computeRowTotal(row)
  if (computed !== 0) return computed.toFixed(2)
  return '—'
}

function confidenceVariant(conf) {
  if (conf >= 0.8) return 'success'
  if (conf >= 0.5) return 'warning'
  return 'destructive'
}

function readinessLabel(row) {
  if (row.rowClass === 'excluded') return 'Excluded'
  if (row.rowClass === 'non-inventory') return 'Non-inv'
  const sd = props.sharedDefaults
  if (!row.itemName) return 'No name'
  if (!(row.overrides?.type || sd.type)) return 'No type'
  if (!(row.overrides?.category || sd.category)) return 'No cat.'
  return 'Ready'
}

function readinessVariant(row) {
  const label = readinessLabel(row)
  if (label === 'Ready') return 'success'
  if (label === 'Excluded' || label === 'Non-inv') return 'outline'
  return 'warning'
}

function hasLineTotalMismatch(row) {
  if (row.lineTotal == null || row.lineTotal === '') return false
  const price = Number(row.unitPrice) || 0
  if (price === 0) return false
  const qty = Math.max(1, row.quantity || 1)
  return Math.abs(Number(row.lineTotal) - price * qty) > 0.01
}
</script>

<style scoped>
.irt { padding: 0; overflow: hidden; }

/* ── Toolbar ── */
.irt-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
  flex-wrap: wrap;
}
.irt-toolbar-left, .irt-toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.irt-stat-badge { font-size: 0.75rem; gap: 0.25rem; }
.irt-stat-num { font-weight: 700; }
.irt-stat-dim { opacity: 0.7; font-size: 0.6875rem; }

/* ── Expansion callout ── */
.irt-expansion-callout {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  padding: 0.5rem 0.875rem;
  font-size: 0.75rem;
  color: var(--foreground);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
  line-height: 1.5;
}
.irt-expansion-icon {
  flex-shrink: 0;
  width: 1rem; height: 1rem;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  font-size: 0.625rem;
  font-weight: 700;
  margin-top: 0.15rem;
}
.irt-expansion-detail { font-weight: 600; }

/* ── Table ── */
.irt-scroll { overflow-x: auto; }
.irt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}
.irt-th {
  padding: 0.5rem 0.5rem;
  text-align: left;
  font-weight: 700;
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--muted-foreground);
  background: var(--surface-2);
  border-bottom: 2px solid var(--border);
  white-space: nowrap;
}
.irt-th--check { width: 2rem; text-align: center; }
.irt-th--idx   { width: 2rem; text-align: center; }
.irt-th--class { width: 5.5rem; }
.irt-th--name  { min-width: 12rem; }
.irt-th--qty   { width: 5.5rem; text-align: right; }
.irt-th--price { width: 5.5rem; text-align: right; }
.irt-th--total { width: 5.5rem; text-align: right; }
.irt-th--code  { width: 7rem; }
.irt-th--conf  { width: 3.5rem; text-align: center; }
.irt-th--ready { width: 4.5rem; text-align: center; }
.irt-req { color: var(--danger); }

/* ── Rows ── */
.irt-row { transition: background 0.1s; }
.irt-row:hover { background: var(--surface-2); }
.irt-row--excluded { opacity: 0.4; }
.irt-row--noninv { opacity: 0.5; background: color-mix(in srgb, var(--muted-foreground) 4%, transparent); }
.irt-row--qty-multi { background: color-mix(in srgb, var(--accent) 4%, transparent); }

/* ── Cells ── */
.irt-td {
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
.irt-td--check { text-align: center; }
.irt-td--idx   { text-align: center; font-size: 0.6875rem; color: var(--muted-foreground); font-weight: 600; }
.irt-td--qty   { text-align: right; }
.irt-td--price { text-align: right; }
.irt-td--total { text-align: right; }
.irt-td--conf  { text-align: center; }
.irt-td--ready { text-align: center; }
.irt-td--num   { text-align: right; }
.irt-td--foot-label { font-size: 0.75rem; color: var(--muted-foreground); border-bottom: none; padding-top: 0.5rem; }
.irt-td--foot-val   { font-size: 0.75rem; font-weight: 700; color: var(--foreground); border-bottom: none; padding-top: 0.5rem; }

.irt-class-sel { font-size: 0.6875rem; height: 1.75rem; padding: 0 0.35rem; }

.irt-input {
  border-color: transparent;
  background: transparent;
  height: 1.75rem;
  padding: 0.2rem 0.35rem;
  font-size: 0.8125rem;
  box-shadow: none;
}
.irt-input:focus-within {
  border-color: var(--accent);
  background: var(--card);
}
.irt-input--num { text-align: right; width: 4.5rem; }
.irt-input--sm  { font-size: 0.75rem; }

.irt-qty-badge {
  display: block;
  font-size: 0.5625rem;
  text-align: right;
  margin-top: 0.1rem;
}

.irt-readonly { font-size: 0.8125rem; color: var(--muted-foreground); }
.irt-dim { color: var(--muted-foreground); }
.irt-mismatch {
  display: inline-block;
  color: var(--warning-dark, var(--warning));
  font-size: 0.6875rem;
  cursor: help;
  margin-left: 0.2rem;
}
.irt-missing-price {
  display: inline-block;
  color: var(--muted-foreground);
  font-size: 0.625rem;
  font-weight: 700;
  border: 1px solid currentColor;
  border-radius: 50%;
  width: 0.875rem;
  height: 0.875rem;
  line-height: 0.875rem;
  text-align: center;
  cursor: help;
  margin-left: 0.2rem;
  opacity: 0.6;
}

/* ── Footer ── */
.irt-footer { background: var(--surface-2); }

/* ── Empty ── */
.irt-empty {
  text-align: center;
  color: var(--muted-foreground);
  padding: 2rem 0.5rem;
}

/* ── Validation errors ── */
.irt-errors {
  margin: 0;
  padding: 0.5rem 0.875rem;
  border-top: 1px solid var(--danger);
  background: color-mix(in srgb, var(--danger) 6%, transparent);
}
.irt-error-line {
  font-size: 0.75rem;
  color: var(--danger);
  margin: 0.15rem 0;
}

/* ── Financial reconciliation ── */
.irt-recon {
  padding: 0.625rem 0.875rem;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
}
.irt-recon-title {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--muted-foreground);
  margin-bottom: 0.5rem;
}
.irt-recon-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.2rem 1rem;
  font-size: 0.8125rem;
  max-width: 24rem;
}
.irt-recon-label {
  color: var(--muted-foreground);
}
.irt-recon-val {
  text-align: right;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.irt-recon-val--accent { color: var(--accent); }
.irt-recon-label--diff { color: var(--warning-dark, var(--warning)); font-weight: 600; }
.irt-recon-val--diff { color: var(--warning-dark, var(--warning)); }
.irt-recon-note {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin: 0.5rem 0 0;
  line-height: 1.4;
}
.irt-recon-warn {
  font-size: 0.75rem;
  color: var(--warning-dark, var(--warning));
  margin: 0.35rem 0 0;
  line-height: 1.4;
}
</style>
