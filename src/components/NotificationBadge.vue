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
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background-color: #FF3B30;
  border-radius: 10px;
  line-height: 1;
  margin-left: 4px;
  vertical-align: middle;
}
</style>
