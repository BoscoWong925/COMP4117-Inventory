<script setup>
import UiCard from './Card.vue'
import UiButton from './Button.vue'

defineProps({
  clearLabel: { type: String, default: 'Clear All' },
  showClear: { type: Boolean, default: true }
})

defineEmits(['clear'])
</script>

<template>
  <UiCard class="module-filter-panel">
    <div v-if="showClear" class="module-filter-panel-toolbar">
      <UiButton variant="ghost" size="sm" class="module-filter-panel-clear" @click="$emit('clear')">
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
  padding: 0.8rem 0.9rem 0.9rem;
  margin-bottom: 0.75rem;
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--card) 95%, var(--surface-50));
  box-shadow: var(--shadow-xs);
}

.module-filter-panel-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.5rem;
}

.module-filter-panel-clear {
  font-weight: 600;
  color: var(--muted-foreground);
}

.module-filter-panel-body {
  display: block;
}

.module-filter-panel :deep(.filter-label) {
  display: block;
  margin-bottom: 0.32rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--muted-foreground);
}
</style>
