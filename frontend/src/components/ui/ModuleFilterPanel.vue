<script setup>
import UiCard from './Card.vue'
import UiButton from './Button.vue'

defineProps({
  title: { type: String, default: 'Search & Filter' },
  clearLabel: { type: String, default: 'Clear All' },
  showClear: { type: Boolean, default: true }
})

defineEmits(['clear'])
</script>

<template>
  <UiCard class="module-filter-panel">
    <div class="module-filter-panel-header">
      <h3 class="module-filter-panel-title">{{ title }}</h3>
      <UiButton v-if="showClear" variant="ghost" size="sm" @click="$emit('clear')">
        {{ clearLabel }}
      </UiButton>
    </div>
    <div class="module-filter-panel-body">
      <slot />
    </div>
  </UiCard>
</template>

<style scoped>
.module-filter-panel {
  padding: 0.875rem 1rem;
  margin-bottom: 0.75rem;
}

.module-filter-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.module-filter-panel-title {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.module-filter-panel-body {
  display: block;
}
</style>
