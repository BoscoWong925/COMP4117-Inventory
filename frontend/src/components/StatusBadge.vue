<template>
  <span :class="['status-badge', colorClass]">{{ label }}</span>
</template>

<script>
import { computed } from 'vue'
import { normalizeItemStatus, getStatusColor } from '../utils/helpers'

export default {
  props: {
    status: { type: String, default: '' }
  },
  setup(props) {
    const label = computed(() => normalizeItemStatus(props.status))
    const colorClass = computed(() => getStatusColor(props.status))
    return { label, colorClass }
  }
}
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.55rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 0.375rem;
  white-space: nowrap;
  line-height: 1.4;
  letter-spacing: 0.01em;
}
</style>
