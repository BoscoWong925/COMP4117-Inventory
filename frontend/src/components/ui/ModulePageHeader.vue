<script setup>
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  class: { type: String, default: '' }
})

const classes = computed(() => cn('module-page-header', props.class))
</script>

<template>
  <div :class="classes">
    <div class="module-page-header-left">
      <h2 class="module-page-title">{{ title }}</h2>
      <p v-if="subtitle" class="module-page-subtitle">{{ subtitle }}</p>
    </div>
    <div class="module-page-header-actions">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.module-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.module-page-header-left {
  min-width: 0;
}

.module-page-title {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.03em;
  color: var(--text-primary);
}

.module-page-subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
}

.module-page-header-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
