<script setup>
import { computed } from 'vue'
import { ChevronDown, X } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import UiDropdownMenu from './DropdownMenu.vue'
import UiDropdownMenuItem from './DropdownMenuItem.vue'

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  emptyLabel: { type: String, default: 'All' },
  label: { type: String, default: 'Select' },
  tone: { type: String, default: 'default' },
  class: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const normalizedOptions = computed(() => {
  return props.options
    .map((opt) => {
      if (typeof opt === 'object' && opt !== null) {
        const value = opt.value ?? ''
        const label = opt.label ?? String(value)
        return { value, label }
      }
      return { value: String(opt), label: String(opt) }
    })
    .filter((opt) => opt.value !== '')
})

const hasValue = computed(() => {
  return props.modelValue !== '' && props.modelValue !== null && props.modelValue !== undefined
})

const selectedLabel = computed(() => {
  if (!hasValue.value) return props.emptyLabel
  const found = normalizedOptions.value.find((opt) => String(opt.value) === String(props.modelValue))
  return found ? found.label : String(props.modelValue)
})

const triggerClasses = computed(() => cn(
  'filter-select-trigger',
  {
    'filter-select-trigger--toolbar': props.tone === 'toolbar',
    'filter-select-trigger--toolbar-active': props.tone === 'toolbar' && hasValue.value,
  },
  props.class
))

const chevronSize = computed(() => (props.tone === 'toolbar' ? 10 : 13))

const setValue = (value, close) => {
  emit('update:modelValue', value)
  if (close) close()
}

const clearValue = (close) => {
  setValue('', close)
}
</script>

<template>
  <UiDropdownMenu align="start" class="filter-select-menu" v-bind="$attrs">
    <template #trigger>
      <button :class="triggerClasses" type="button">
        <span :class="['filter-select-text', { 'filter-select-text--placeholder': !hasValue }]">
          {{ selectedLabel }}
        </span>
        <ChevronDown :size="chevronSize" class="filter-select-chevron" />
      </button>
    </template>

    <template #default="{ close }">
      <UiDropdownMenuItem label>{{ label }}</UiDropdownMenuItem>
      <UiDropdownMenuItem checkable :checked="!hasValue" @click="clearValue(close)">
        {{ emptyLabel }}
      </UiDropdownMenuItem>
      <UiDropdownMenuItem
        v-for="opt in normalizedOptions"
        :key="String(opt.value)"
        checkable
        :checked="String(modelValue) === String(opt.value)"
        @click="setValue(opt.value, close)"
      >
        {{ opt.label }}
      </UiDropdownMenuItem>

      <template v-if="hasValue">
        <UiDropdownMenuItem separator />
        <UiDropdownMenuItem @click="clearValue(close)">
          <X :size="12" /> Clear
        </UiDropdownMenuItem>
      </template>
    </template>
  </UiDropdownMenu>
</template>

<style scoped>
.filter-select-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  width: 100%;
  min-height: 2.25rem;
  padding: 0.4rem 0.7rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--input);
  color: var(--text-primary);
  font-size: 0.8125rem;
  line-height: 1.2;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  text-align: left;
}

.filter-select-trigger:hover {
  background: var(--card);
}

.filter-select-trigger--toolbar {
  gap: 0.25rem;
  min-height: auto;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  background: var(--card);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--muted-foreground);
}

.filter-select-trigger--toolbar:hover {
  background: var(--surface-100);
  color: var(--text-secondary);
}

.filter-select-trigger--toolbar-active {
  border-color: var(--accent);
  color: var(--accent);
}

.filter-select-trigger:focus-visible {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 24%, transparent);
}

.filter-select-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-select-text--placeholder {
  color: var(--muted-foreground);
}

.filter-select-chevron {
  color: var(--muted-foreground);
  flex-shrink: 0;
}

.filter-select-trigger--toolbar .filter-select-chevron {
  color: currentColor;
}

.filter-select-menu {
  min-width: 13rem;
}
</style>
