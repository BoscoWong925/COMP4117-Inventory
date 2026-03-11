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
  min-width: 1.375rem;
  height: 1.375rem;
  padding: 0 0.375rem;
  font-size: 0.8125rem;
  font-weight: 700;
  color: #fff;
  background: var(--danger, #ef4444);
  border-radius: 9999px;
  line-height: 1;
  margin-left: 0.375rem;
  vertical-align: middle;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
}
</style>
