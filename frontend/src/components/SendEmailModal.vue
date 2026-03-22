<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
      <h3 class="text-lg font-bold mb-4">Send Email</h3>

      <div v-if="recipientName" class="mb-3 text-sm text-gray-600">
        To: <span class="font-medium text-gray-800">{{ recipientName }}</span>
        <span v-if="recipientEmail" class="text-gray-400 ml-1">({{ recipientEmail }})</span>
      </div>

      <div class="mb-3">
        <label class="block text-sm font-medium text-gray-700 mb-1">Subject</label>
        <input v-model="subject" type="text" class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="Email subject" />
      </div>

      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">Message</label>
        <textarea v-model="message" rows="5" class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none" placeholder="Type your message..."></textarea>
      </div>

      <div v-if="error" class="mb-3 text-sm text-red-600">{{ error }}</div>
      <div v-if="success" class="mb-3 text-sm text-green-600">{{ success }}</div>

      <div class="flex justify-end gap-2">
        <button @click="close" class="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50">Cancel</button>
        <button @click="send" :disabled="sending" class="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
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
