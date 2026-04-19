<template>
  <div class="pcs">
    <!-- ── Stats row ── -->
    <div class="pcs-stats">
      <Card class="pcs-stat">
        <span class="pcs-stat-num">{{ rows.length }}</span>
        <span class="pcs-stat-label">Total Rows</span>
      </Card>
      <Card class="pcs-stat">
        <span class="pcs-stat-num">{{ selectedRows.length }}</span>
        <span class="pcs-stat-label">Selected Rows</span>
      </Card>
      <Card class="pcs-stat pcs-stat--muted">
        <span class="pcs-stat-num">{{ excludedCount + nonInvCount }}</span>
        <span class="pcs-stat-label">Skipped</span>
      </Card>
      <Card class="pcs-stat pcs-stat--accent">
        <span class="pcs-stat-num">{{ totalItemCount }}</span>
        <span class="pcs-stat-label">Items to Create</span>
      </Card>
    </div>

    <!-- ── Quantity expansion math ── -->
    <Card v-if="hasQuantityExpansion" class="pcs-expansion">
      <div class="pcs-expansion-title">
        <Badge variant="accent">Qty Expansion</Badge>
        <span>Some rows have quantity &gt; 1 and will create multiple inventory items each.</span>
      </div>
      <div class="pcs-expansion-math">
        <div class="pcs-expansion-line">
          <span class="pcs-expansion-val">{{ selectedRows.length }}</span>
          <span>selected rows</span>
        </div>
        <div class="pcs-expansion-line pcs-expansion-line--plus">
          <span class="pcs-expansion-val">+ {{ extraFromExpansion }}</span>
          <span>extra items from quantity expansion</span>
        </div>
        <Separator />
        <div class="pcs-expansion-line pcs-expansion-line--result">
          <span class="pcs-expansion-val">= {{ totalItemCount }}</span>
          <span>inventory items to create</span>
        </div>
      </div>
      <div class="pcs-expansion-detail">
        <div v-for="r in qtyExpandedRows" :key="r._rowId" class="pcs-expansion-row">
          <span class="pcs-expansion-row-name">{{ r.itemName || '(unnamed)' }}</span>
          <Badge variant="accent">&times;{{ r.quantity }}</Badge>
          <span class="pcs-expansion-row-arrow">&rarr; creates {{ r.quantity }} items</span>
        </div>
      </div>
    </Card>

    <Separator class="pcs-sep" />

    <!-- ── Financial Reconciliation ── -->
    <Card v-if="invoiceHeaderTotal != null" class="pcs-recon">
      <h4 class="pcs-subtitle" style="margin-bottom:0.5rem;">Financial Reconciliation</h4>
      <div class="pcs-recon-grid">
        <span class="pcs-recon-label">Invoice total (header)</span>
        <span class="pcs-recon-val">${{ invoiceHeaderTotal.toFixed(2) }}</span>

        <span class="pcs-recon-label">Selected inventory rows</span>
        <span class="pcs-recon-val pcs-recon-val--accent">${{ grandTotal }}</span>

        <span class="pcs-recon-label">Non-inventory / excluded rows</span>
        <span class="pcs-recon-val">${{ nonActiveTotal.toFixed(2) }}</span>

        <template v-if="reconDifference != null && Math.abs(reconDifference) > 0.01">
          <Separator style="grid-column:1/-1;margin:0.25rem 0;" />
          <span class="pcs-recon-label" :class="{ 'pcs-recon-label--warn': Math.abs(reconDifference) > 0.5 }">Unreconciled difference</span>
          <span class="pcs-recon-val" :class="{ 'pcs-recon-val--warn': Math.abs(reconDifference) > 0.5 }">${{ reconDifference.toFixed(2) }}</span>
        </template>
      </div>
      <p v-if="nonActiveTotal > 0 && (reconDifference == null || Math.abs(reconDifference) <= 0.5)" class="pcs-recon-note">
        The difference between invoice total and inventory total is expected — non-inventory
        rows (delivery, assembly, service fees, etc.) are not created as inventory items.
      </p>
      <p v-if="reconDifference != null && Math.abs(reconDifference) > 0.5" class="pcs-recon-warn">
        ⚠ Unreconciled difference of ${{ Math.abs(reconDifference).toFixed(2) }}.
        This may be due to rounding, tax, or OCR inaccuracies. Verify row prices before creating items.
      </p>
    </Card>

    <Separator class="pcs-sep" />

    <!-- ── Shared Defaults ── -->
    <div class="pcs-section">
      <h4 class="pcs-subtitle">Shared Defaults</h4>
      <div class="pcs-tags">
        <Badge v-if="defaults.type" variant="outline">Type: {{ defaults.type }}</Badge>
        <Badge v-if="defaults.category" variant="outline">Category: {{ defaults.category }}</Badge>
        <Badge v-if="defaults.status" variant="outline">Status: {{ defaults.status }}</Badge>
        <Badge v-if="defaults.location" variant="outline">Location: {{ defaults.location }}</Badge>
        <Badge v-if="defaults.owner" variant="outline">Owner: {{ defaults.owner }}</Badge>
        <Badge v-if="defaults.departmentID" variant="outline">Dept: {{ defaults.departmentID }}</Badge>
        <Badge v-if="defaults.fundingSource" variant="outline">Funding: {{ defaults.fundingSource }}</Badge>
        <Badge v-if="defaults.vendor" variant="outline">Vendor: {{ defaults.vendor }}</Badge>
        <Badge v-if="defaults.projectLinked" variant="outline">Project: {{ defaults.projectLinked }}</Badge>
        <Badge v-if="defaults.canBorrow === true" variant="outline">Can Borrow: Yes</Badge>
        <Badge v-if="defaults.canBorrow === false" variant="outline">Can Borrow: No</Badge>
      </div>
    </div>

    <!-- ── Invoice info ── -->
    <div class="pcs-section" v-if="invoiceMeta.supplier || invoiceMeta.invoiceNumber">
      <h4 class="pcs-subtitle">Invoice Info</h4>
      <div class="pcs-tags">
        <Badge v-if="invoiceMeta.supplier" variant="outline">Supplier: {{ invoiceMeta.supplier }}</Badge>
        <Badge v-if="invoiceMeta.invoiceNumber" variant="outline">Invoice #: {{ invoiceMeta.invoiceNumber }}</Badge>
        <Badge v-if="invoiceMeta.purchaseDate" variant="outline">Date: {{ invoiceMeta.purchaseDate }}</Badge>
        <Badge v-if="invoiceMeta.orderID" variant="outline">PO: {{ invoiceMeta.orderID }}</Badge>
        <Badge v-if="invoiceMeta.totalAmount != null" variant="outline">Total: ${{ invoiceMeta.totalAmount }}</Badge>
      </div>
    </div>

    <p v-if="overrideCount > 0" class="pcs-note">
      <Badge variant="accent" class="pcs-note-badge">{{ overrideCount }}</Badge>
      row{{ overrideCount > 1 ? 's have' : ' has' }} per-row field overrides.
    </p>

    <Separator class="pcs-sep" />

    <!-- ── Warnings ── -->
    <Card v-if="warnings.length > 0" class="pcs-alert pcs-alert--warning">
      <h4 class="pcs-alert-title">Warnings ({{ warnings.length }})</h4>
      <ul class="pcs-alert-list">
        <li v-for="(w, i) in warnings" :key="i">{{ w }}</li>
      </ul>
    </Card>

    <!-- ── Blocking errors ── -->
    <Card v-if="blockingErrors.length > 0" class="pcs-alert pcs-alert--error">
      <h4 class="pcs-alert-title">Errors &mdash; must fix before creating</h4>
      <ul class="pcs-alert-list">
        <li v-for="(e, i) in blockingErrors" :key="i">{{ e }}</li>
      </ul>
    </Card>

    <Separator class="pcs-sep" />

    <!-- ── Items preview table ── -->
    <div class="pcs-section">
      <h4 class="pcs-subtitle">Items Preview</h4>
      <Card class="pcs-preview">
        <table class="pcs-preview-table">
          <thead>
            <tr>
              <th class="pcs-preview-th">#</th>
              <th class="pcs-preview-th">Name</th>
              <th class="pcs-preview-th pcs-preview-th--r">Qty</th>
              <th class="pcs-preview-th pcs-preview-th--r">Creates</th>
              <th class="pcs-preview-th pcs-preview-th--r">Unit $</th>
              <th class="pcs-preview-th">Type</th>
              <th class="pcs-preview-th">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in selectedRows" :key="row._rowId" class="pcs-preview-row" :class="{ 'pcs-preview-row--multi': (row.quantity || 1) > 1 }">
              <td class="pcs-preview-td pcs-preview-td--idx">{{ idx + 1 }}</td>
              <td class="pcs-preview-td pcs-preview-td--name">
                {{ row.itemName || '(unnamed)' }}
                <Badge v-if="hasOverrides(row)" variant="accent" class="pcs-badge-sm">custom</Badge>
                <span v-if="resolveMotherLabel(row)" class="pcs-mother-hint">↳ child of {{ resolveMotherLabel(row) }}</span>
              </td>
              <td class="pcs-preview-td pcs-preview-td--r">{{ row.quantity || 1 }}</td>
              <td class="pcs-preview-td pcs-preview-td--r">
                <Badge v-if="(row.quantity || 1) > 1" variant="accent">{{ row.quantity }}</Badge>
                <span v-else>1</span>
              </td>
              <td class="pcs-preview-td pcs-preview-td--r">${{ Number(row.unitPrice || 0).toFixed(2) }}</td>
              <td class="pcs-preview-td"><Badge variant="outline">{{ effectiveType(row) || '—' }}</Badge></td>
              <td class="pcs-preview-td">
                <Badge :variant="readinessVariant(row)">{{ readinessLabel(row) }}</Badge>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="pcs-preview-foot">
              <td colspan="3" class="pcs-preview-td pcs-preview-td--foot">Total</td>
              <td class="pcs-preview-td pcs-preview-td--foot pcs-preview-td--r"><strong>{{ totalItemCount }}</strong></td>
              <td class="pcs-preview-td pcs-preview-td--foot pcs-preview-td--r"><strong>${{ grandTotal }}</strong></td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  UiCard as Card,
  UiBadge as Badge,
  UiSeparator as Separator,
} from '@/components/ui'

const props = defineProps({
  rows: { type: Array, required: true },
  defaults: { type: Object, required: true },
  invoiceMeta: { type: Object, default: () => ({}) },
})

const selectedRows = computed(() => props.rows.filter(r => r.rowClass === 'item'))
const excludedCount = computed(() => props.rows.filter(r => r.rowClass === 'excluded').length)
const nonInvCount = computed(() => props.rows.filter(r => r.rowClass === 'non-inventory').length)
const totalItemCount = computed(() => selectedRows.value.reduce((sum, r) => sum + Math.max(1, r.quantity || 1), 0))
const hasQuantityExpansion = computed(() => totalItemCount.value !== selectedRows.value.length)
const extraFromExpansion = computed(() => totalItemCount.value - selectedRows.value.length)
const qtyExpandedRows = computed(() => selectedRows.value.filter(r => (r.quantity || 1) > 1))
const overrideCount = computed(() => selectedRows.value.filter(r => hasOverrides(r)).length)

const grandTotal = computed(() => {
  const t = selectedRows.value.reduce((sum, r) => {
    const price = Number(r.unitPrice) || 0
    const qty = Math.max(1, r.quantity || 1)
    return sum + price * qty
  }, 0)
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
    .reduce((sum, r) => {
      const price = Number(r.unitPrice) || 0
      const qty = Math.max(1, r.quantity || 1)
      if (price !== 0) return sum + price * qty
      if (r.lineTotal != null && r.lineTotal !== '') return sum + (Number(r.lineTotal) || 0)
      return sum
    }, 0)
})
const reconDifference = computed(() => {
  if (invoiceHeaderTotal.value == null) return null
  return invoiceHeaderTotal.value - (parseFloat(grandTotal.value) + nonActiveTotal.value)
})

const warnings = computed(() => {
  const w = []
  const nameCount = {}
  selectedRows.value.forEach((row) => {
    const n = row.itemName || ''
    nameCount[n] = (nameCount[n] || 0) + 1
  })
  Object.entries(nameCount).filter(([, c]) => c > 1).forEach(([name, count]) => {
    w.push(`"${name || '(unnamed)'}" appears ${count} times — duplicate names will be created.`)
  })

  if (selectedRows.value.length > 0 && selectedRows.value.every(r => !(r.overrides?.universityID))) {
    w.push('University ID is empty for all items. You can set it per-row in Step 4.')
  }

  if (selectedRows.value.length > 0 && selectedRows.value.every(r => !(r.overrides?.vendor || props.defaults.vendor))) {
    w.push('Vendor is empty for all items. Consider setting a shared default vendor.')
  }

  if (!props.defaults.status) {
    w.push('Shared default status is empty. Items will fallback to Available.')
  }

  selectedRows.value.forEach((row, idx) => {
    if (!row.unitPrice && row.unitPrice !== 0) {
      w.push(`Row ${idx + 1} ("${row.itemName || 'unnamed'}") has no price.`)
    } else if (Number(row.unitPrice) === 0) {
      w.push(`Row ${idx + 1} ("${row.itemName || 'unnamed'}") has $0 price.`)
    }
    if (row.confidence != null && row.confidence < 0.5) {
      w.push(`Row ${idx + 1} ("${row.itemName || 'unnamed'}") has low OCR confidence (${Math.round(row.confidence * 100)}%).`)
    }
    const ov = row.overrides || {}
    const sd = props.defaults
    const wStart = ov.warrantyStartDate || sd.warrantyStartDate || ''
    const wEnd = ov.warrantyEnd || sd.warrantyEnd || ''
    if (wStart && wEnd && wStart > wEnd) {
      w.push(`Row ${idx + 1}: warranty start date is after end date.`)
    }
    const type = effectiveType(row)
    if (type === 'Component' && !row.overrides?.motherID) {
      w.push(`Row ${idx + 1} ("${row.itemName || 'unnamed'}") is Component but has no parent (motherID).`)
    }
    if (row.overrides?.motherID?.startsWith('_row:')) {
      const targetId = row.overrides.motherID.slice(5)
      if (!selectedRows.value.some(r => r._rowId === targetId)) {
        w.push(`Row ${idx + 1} has unresolved parent reference.`)
      }
    }
  })
  return w
})

const blockingErrors = computed(() => {
  const errs = []
  const sd = props.defaults
  selectedRows.value.forEach((row, idx) => {
    if (!row.itemName) errs.push(`Row ${idx + 1}: Name is required.`)
    if (!(row.overrides?.type || sd.type)) errs.push(`Row ${idx + 1}: Type is required (no default set).`)
    if (!(row.overrides?.category || sd.category)) errs.push(`Row ${idx + 1}: Category is required (no default set).`)
  })
  if (selectedRows.value.length === 0) errs.push('No items selected for creation.')

  const parentGraph = {}
  selectedRows.value.forEach((row) => {
    const ref = row.overrides?.motherID
    if (ref && ref.startsWith('_row:')) parentGraph[row._rowId] = ref.slice(5)
  })
  selectedRows.value.forEach((row) => {
    const a = row._rowId
    const b = parentGraph[a]
    if (b && parentGraph[b] === a) {
      errs.push(`Circular parent reference between "${row.itemName || a}" and "${selectedRows.value.find(r => r._rowId === b)?.itemName || b}".`)
    }
  })
  return errs
})

function hasOverrides(row) {
  if (!row.overrides) return false
  return Object.values(row.overrides).some(v => v !== '' && v !== null && v !== undefined)
}

function effectiveType(row) {
  return row.overrides?.type || props.defaults.type || ''
}

function readinessLabel(row) {
  const sd = props.defaults
  if (!row.itemName) return 'No name'
  if (!(row.overrides?.type || sd.type)) return 'No type'
  if (!(row.overrides?.category || sd.category)) return 'No cat.'
  return 'Ready'
}

function readinessVariant(row) {
  const label = readinessLabel(row)
  if (label === 'Ready') return 'success'
  return 'warning'
}

function resolveMotherLabel(row) {
  const motherID = row.overrides?.motherID
  if (!motherID) return ''
  if (motherID.startsWith('_row:')) {
    const id = motherID.slice(5)
    const found = selectedRows.value.find(r => r._rowId === id)
    return found ? (found.itemName || '(unnamed import row)') : '(unresolved)'
  }
  return motherID
}
</script>

<style scoped>
/* ── Stats ── */
.pcs-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.625rem;
  margin-bottom: 1rem;
}
.pcs-stat {
  text-align: center;
  padding: 0.625rem 0.5rem;
}
.pcs-stat--muted { opacity: 0.6; }
.pcs-stat--accent {
  border-color: var(--accent);
  background: var(--accent-surface);
}
.pcs-stat-num {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--foreground);
  line-height: 1.2;
}
.pcs-stat--accent .pcs-stat-num { color: var(--accent); }
.pcs-stat-label {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
}

/* ── Expansion card ── */
.pcs-expansion {
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.pcs-expansion-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  margin-bottom: 0.75rem;
}
.pcs-expansion-math {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
  padding-left: 0.25rem;
}
.pcs-expansion-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
}
.pcs-expansion-val {
  font-weight: 700;
  color: var(--foreground);
  min-width: 2.5rem;
}
.pcs-expansion-line--plus .pcs-expansion-val { color: var(--accent); }
.pcs-expansion-line--result {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--foreground);
}
.pcs-expansion-line--result .pcs-expansion-val {
  color: var(--accent);
  font-size: 1rem;
}
.pcs-expansion-detail {
  padding-left: 0.25rem;
}
.pcs-expansion-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  padding: 0.2rem 0;
}
.pcs-expansion-row-name {
  font-weight: 600;
  max-width: 20rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pcs-expansion-row-arrow {
  color: var(--muted-foreground);
}

/* ── General ── */
.pcs-sep { margin: 0.75rem 0; }
.pcs-section { margin-bottom: 0.75rem; }
.pcs-subtitle {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin: 0 0 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.pcs-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.pcs-note {
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0.5rem 0;
}
.pcs-note-badge { font-size: 0.6875rem; }

/* ── Alerts ── */
.pcs-alert {
  padding: 0.625rem 0.875rem;
  margin-bottom: 0.75rem;
}
.pcs-alert--warning {
  border-color: var(--warning);
  background: color-mix(in srgb, var(--warning) 8%, transparent);
}
.pcs-alert--error {
  border-color: var(--danger);
  background: color-mix(in srgb, var(--danger) 6%, transparent);
}
.pcs-alert-title {
  font-size: 0.75rem;
  font-weight: 700;
  margin: 0 0 0.35rem;
}
.pcs-alert--warning .pcs-alert-title { color: var(--warning-dark, var(--warning)); }
.pcs-alert--error .pcs-alert-title { color: var(--danger); }
.pcs-alert-list {
  margin: 0;
  padding-left: 1.125rem;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--foreground);
}

/* ── Preview table ── */
.pcs-preview {
  padding: 0;
  overflow: hidden;
}
.pcs-preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}
.pcs-preview-th {
  padding: 0.45rem 0.5rem;
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
.pcs-preview-th--r { text-align: right; }
.pcs-preview-row { transition: background 0.1s; }
.pcs-preview-row:hover { background: var(--surface-2); }
.pcs-preview-row--multi { background: color-mix(in srgb, var(--accent) 4%, transparent); }
.pcs-preview-td {
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
.pcs-preview-td--idx { width: 2rem; text-align: center; font-size: 0.6875rem; color: var(--muted-foreground); font-weight: 600; }
.pcs-preview-td--name { max-width: 20rem; }
.pcs-preview-td--r { text-align: right; }
.pcs-preview-td--foot {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  border-bottom: none;
  padding-top: 0.5rem;
}
.pcs-preview-foot { background: var(--surface-2); }
.pcs-badge-sm { font-size: 0.5625rem; margin-left: 0.25rem; }
.pcs-mother-hint {
  display: block;
  font-size: 0.6875rem;
  color: var(--info);
}

/* ── Financial reconciliation ── */
.pcs-recon {
  padding: 0.75rem 1rem;
  margin-bottom: 0.25rem;
}
.pcs-recon-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.25rem 1rem;
  font-size: 0.8125rem;
  max-width: 24rem;
}
.pcs-recon-label { color: var(--muted-foreground); }
.pcs-recon-val {
  text-align: right;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.pcs-recon-val--accent { color: var(--accent); }
.pcs-recon-label--warn { color: var(--warning-dark, var(--warning)); font-weight: 600; }
.pcs-recon-val--warn { color: var(--warning-dark, var(--warning)); }
.pcs-recon-note {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin: 0.5rem 0 0;
  line-height: 1.4;
}
.pcs-recon-warn {
  font-size: 0.75rem;
  color: var(--warning-dark, var(--warning));
  margin: 0.35rem 0 0;
  line-height: 1.4;
}
</style>
