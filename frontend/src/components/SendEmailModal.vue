<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center modal-overlay">
    <div class="modal-card max-w-lg w-full mx-4">
      <h3 class="modal-title">Send Email</h3>

      <div v-if="recipientName" class="mb-3 text-sm text-secondary">
        To: <span class="font-medium">{{ recipientName }}</span>
        <span v-if="recipientEmail" class="text-muted ml-1">({{ recipientEmail }})</span>
      </div>

      <div class="mb-3">
        <label class="modal-label">Subject</label>
        <input v-model="subject" type="text" class="form-input" placeholder="Email subject" />
      </div>

      <div class="mb-4">
        <label class="modal-label">Message</label>
        <textarea v-model="message" rows="5" class="form-input resize-none" placeholder="Type your message..."></textarea>
      </div>

      <div v-if="error" class="mb-3 text-sm" style="color:var(--danger)">{{ error }}</div>
      <div v-if="success" class="mb-3 text-sm" style="color:var(--success)">{{ success }}</div>

      <div class="flex justify-end gap-2">
        <button @click="close" class="btn btn-outline-secondary">Cancel</button>
        <button @click="send" :disabled="sending" class="btn btn-outline-primary disabled:opacity-50">
          {{ sending ? 'Sending...' : 'Send' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { userService } from '../utils/services';

const props = defineProps({
  visible: Boolean,
  recipientId: String,
  recipientName: String,
  recipientEmail: String,
  defaultSubject: { type: String, default: '' }
});

const emit = defineEmits(['close']);

const subject = ref('');
const message = ref('');
const sending = ref(false);
const error = ref('');
const success = ref('');

watch(() => props.visible, (val) => {
  if (val) {
    subject.value = props.defaultSubject || '';
    message.value = '';
    error.value = '';
    success.value = '';
  }
});

const close = () => emit('close');

const send = async () => {
  if (!subject.value.trim() || !message.value.trim()) {
    error.value = 'Subject and message are required';
    return;
  }
  sending.value = true;
  error.value = '';
  success.value = '';
  try {
    const result = await userService.sendEmail(props.recipientId, subject.value, message.value);
    if (result.success) {
      success.value = 'Email sent successfully';
      setTimeout(close, 1200);
    } else {
      error.value = result.message || 'Failed to send email';
    }
  } catch (err) {
    error.value = err.message || 'Failed to send email';
  } finally {
    sending.value = false;
  }
};
</script>
