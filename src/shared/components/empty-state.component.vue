<script setup lang="ts">
interface Props {
  message: string;
  actionLabel?: string;
}

defineProps<Props>();

const emit = defineEmits<{
  action: [];
}>();

function handleAction() {
  emit('action');
}
</script>

<template>
  <div class="empty-state" role="status" aria-live="polite">
    <i class="pi pi-inbox empty-state__icon" aria-hidden="true"></i>
    <p class="empty-state__message">{{ message }}</p>
    <button
      v-if="actionLabel"
      class="empty-state__action"
      type="button"
      @click="handleAction"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;
}

.empty-state__icon {
  font-size: 3rem;
  color: var(--p-surface-400, #9ca3af);
  margin-bottom: 1rem;
}

.empty-state__message {
  font-size: 1rem;
  color: var(--p-surface-600, #4b5563);
  margin: 0 0 1rem 0;
  max-width: 300px;
  line-height: 1.5;
}

.empty-state__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.625rem 1.25rem;
  min-width: 44px;
  min-height: 44px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #ffffff;
  background-color: var(--p-primary-500, #3b82f6);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.empty-state__action:hover {
  background-color: var(--p-primary-600, #2563eb);
}

.empty-state__action:focus-visible {
  outline: 2px solid var(--p-primary-500, #3b82f6);
  outline-offset: 2px;
}

/* Dark mode support */
:root[data-theme='dark'] .empty-state__icon,
.p-dark .empty-state__icon {
  color: var(--p-surface-500, #6b7280);
}

:root[data-theme='dark'] .empty-state__message,
.p-dark .empty-state__message {
  color: var(--p-surface-300, #d1d5db);
}
</style>
