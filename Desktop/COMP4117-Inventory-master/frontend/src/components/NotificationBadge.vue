<template>
  <span
    v-if="count > 0"
    class="notification-badge"
  >{{ count > 99 ? '99+' : count }}</span>
</template>

<script>
export default {
  props: {
    count: { type: Number, default: 0 }
  }
}
</script>

<style scoped>
.notification-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.125rem;
  height: 1.125rem;
  padding: 0 0.3rem;
  font-size: 0.6875rem;
  font-weight: 700;
  color: #fff;
  background: var(--danger, #ef4444);
  border-radius: 9999px;
  line-height: 1;
  margin-left: 0.25rem;
  vertical-align: middle;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
}
</style>
