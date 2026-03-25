<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  class: { type: String, default: '' },
  align: { type: String, default: 'end' }, // 'start' | 'end'
  side: { type: String, default: 'bottom' } // 'bottom' | 'top'
})

const open = ref(false)
const triggerRef = ref(null)
const menuRef = ref(null)

const menuStyle = ref({})
let rafId = null

function updatePosition() {
  if (!open.value) return
  if (triggerRef.value) {
    const trigger = triggerRef.value.getBoundingClientRect()
    
    let top, left, right, bottom, maxHeight

    if (props.side === 'bottom') {
      top = trigger.bottom + 4
      const spaceBelow = window.innerHeight - top - 8
      
      // If we don't have enough space below, try flipping to top
      if (spaceBelow < 250 && trigger.top > spaceBelow) {
        top = undefined
        bottom = window.innerHeight - trigger.top + 4
        maxHeight = trigger.top - 12
      } else {
        maxHeight = spaceBelow
      }
    } else {
      bottom = window.innerHeight - trigger.top + 4
      maxHeight = trigger.top - 12
    }

    if (props.align === 'start') {
      left = trigger.left
      // prevent overflowing right edge
      const maxLeft = document.documentElement.clientWidth - 200 // approx menu width
      if (left > maxLeft) left = maxLeft
    } else {
      right = document.documentElement.clientWidth - trigger.right
    }

    menuStyle.value = {
      top: top !== undefined ? `${top}px` : '',
      bottom: bottom !== undefined ? `${bottom}px` : '',
      left: left !== undefined ? `${left}px` : '',
      right: right !== undefined ? `${right}px` : '',
      maxHeight: maxHeight !== undefined ? `${maxHeight}px` : ''
    }
  }
  rafId = requestAnimationFrame(updatePosition)
}

function toggle() {
  open.value = !open.value
  if (open.value) {
    updatePosition()
  } else {
    if (rafId) cancelAnimationFrame(rafId)
  }
}

function close() {
  if (open.value) {
    open.value = false
    if (rafId) cancelAnimationFrame(rafId)
  }
}

function onClickOutside(e) {
  if (!open.value) return
  if (!triggerRef.value?.contains(e.target) && !menuRef.value?.contains(e.target)) {
    close()
  }
}

function onKeyDown(e) {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('click', onClickOutside, true)
  document.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside, true)
  document.removeEventListener('keydown', onKeyDown)
  if (rafId) cancelAnimationFrame(rafId)
})

defineExpose({ close })
</script>

<template>
  <div class="dropdown-menu-root" ref="triggerRef" @click.stop.prevent="toggle">
    <slot name="trigger" />
  </div>
  <Teleport to="body">
    <div
      v-if="open"
      ref="menuRef"
      :class="cn('dropdown-menu-content', props.class)"
      :style="menuStyle"
      @click.stop
    >
      <slot :close="close" />
    </div>
  </Teleport>
</template>

<style scoped>
.dropdown-menu-root {
  position: relative;
  display: inline-flex;
}
.dropdown-menu-content {
  position: fixed;
  z-index: 2147483647;
  min-width: 10rem;
  overflow-y: auto;
  overflow-x: hidden;
  border-radius: var(--radius-lg, 0.5rem);
  border: 1px solid var(--border);
  background: var(--card);
  padding: 0.25rem;
  color: var(--text-primary);
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.1);
  animation: scaleIn 0.12s ease-out;
}

@keyframes scaleIn {
  0% { opacity: 0; transform: scale(0.95); transform-origin: top; }
  100% { opacity: 1; transform: scale(1); transform-origin: top; }
}
</style>
