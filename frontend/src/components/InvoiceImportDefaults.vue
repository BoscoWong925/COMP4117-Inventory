<template>
  <Card class="import-defaults">
    <h4 class="import-defaults-title">Shared Defaults</h4>
    <p class="import-defaults-hint">These values will be applied to all selected items on create.</p>

    <div class="import-defaults-grid">
      <div>
        <label class="id-form-label">Type <span class="id-form-required">*</span></label>
        <Select v-model="defaults.type">
          <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
        </Select>
      </div>
      <div>
        <label class="id-form-label">Category <span class="id-form-required">*</span></label>
        <Select v-model="defaults.category">
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </Select>
      </div>
      <div>
        <label class="id-form-label">Status</label>
        <Select v-model="defaults.status">
          <option value="Available">Available</option>
          <option value="In-use">In-use</option>
          <option value="Not Available">Not Available</option>
        </Select>
      </div>
      <div>
        <label class="id-form-label">Location</label>
        <Select v-model="defaults.location">
          <option v-for="l in locations" :key="l" :value="l">{{ l }}</option>
        </Select>
      </div>
      <div>
        <label class="id-form-label">Owner</label>
        <Select v-model="defaults.owner">
          <option value="department">Department</option>
          <option v-for="t in teachers" :key="t.userId" :value="t.userId">{{ t.name || t.userId }}</option>
        </Select>
      </div>
      <div>
        <label class="id-form-label">Can Borrow</label>
        <Select :modelValue="defaults.canBorrow != null ? String(defaults.canBorrow) : 'true'" @update:modelValue="defaults.canBorrow = $event === 'true'">
          <option value="true">Yes</option>
          <option value="false">No</option>
        </Select>
      </div>
      <div>
        <label class="id-form-label">Department</label>
        <Input v-model="defaults.departmentID" placeholder="e.g. COMP" />
      </div>
      <div>
        <label class="id-form-label">Funding Source</label>
        <Input v-model="defaults.fundingSource" />
      </div>
      <div>
        <label class="id-form-label">Vendor</label>
        <Input v-model="defaults.vendor" placeholder="Vendor / supplier" />
      </div>
      <div>
        <label class="id-form-label">Project Linked</label>
        <Input v-model="defaults.projectLinked" placeholder="Project code" />
      </div>
      <div>
        <label class="id-form-label">Warranty Start</label>
        <Input type="date" v-model="defaults.warrantyStartDate" />
      </div>
      <div>
        <label class="id-form-label">Warranty End</label>
        <Input type="date" v-model="defaults.warrantyEnd" />
      </div>
      <div>
        <label class="id-form-label">Warranty Vendor</label>
        <Input v-model="defaults.warrantyVendor" />
      </div>
      <div class="import-defaults-checkbox-row">
        <Checkbox :checked="!!defaults.warrantyOnsite" @update:checked="defaults.warrantyOnsite = $event" />
        <label class="id-form-label id-form-label--inline">Warranty Onsite</label>
      </div>
    </div>
  </Card>
</template>

<script setup>
import {
  UiCard as Card,
  UiSelect as Select,
  UiInput as Input,
  UiCheckbox as Checkbox,
} from '@/components/ui'

defineProps({
  defaults: { type: Object, required: true },
  types: { type: Array, default: () => ['Hardware', 'Software', 'Component'] },
  categories: { type: Array, default: () => ['Computer', 'Peripheral', 'Network', 'Other'] },
  locations: { type: Array, default: () => ['Lab A', 'Lab B', 'Office', 'Storage'] },
  teachers: { type: Array, default: () => [] },
})
</script>

<style scoped>
.import-defaults {
  padding: 1rem 1.25rem;
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
.import-defaults-checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 1.25rem;
}
.id-form-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted-foreground);
  margin-bottom: 0.25rem;
}
.id-form-label--inline {
  margin-bottom: 0;
}
.id-form-required {
  color: var(--danger);
}
</style>
