<script setup lang="ts">
interface Props {
  visible: boolean;
  title?: string;
  message: string;
}

defineProps<Props>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

function handleConfirm() {
  emit('confirm');
}

function handleCancel() {
  emit('cancel');
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        class="confirm-dialog__overlay"
        role="presentation"
        @click.self="handleCancel"
      >
        <div
          class="confirm-dialog"
          role="alertdialog"
          aria-modal="true"
          :aria-labelledby="title ? 'confirm-dialog-title' : undefined"
          aria-describedby="confirm-dialog-message"
        >
          <header v-if="title" class="confirm-dialog__header">
            <h2 id="confirm-dialog-title" class="confirm-dialog__title">{{ title }}</h2>
          </header>

          <div class="confirm-dialog__body">
            <p id="confirm-dialog-message" class="confirm-dialog__message">{{ message }}</p>
          </div>

          <footer class="confirm-dialog__footer">
            <button
              type="button"
              class="confirm-dialog__btn confirm-dialog__btn--cancel"
              @click="handleCancel"
            >
              Cancel
            </button>
            <button
              type="button"
              class="confirm-dialog__btn confirm-dialog__btn--confirm"
              @click="handleConfirm"
            >
              Confirm
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-dialog__overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.confirm-dialog {
  background-color: var(--p-surface-0, #ffffff);
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  max-width: 420px;
  width: 100%;
  overflow: hidden;
}

.confirm-dialog__header {
  padding: 1.25rem 1.5rem 0;
}

.confirm-dialog__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--p-surface-900, #111827);
}

.confirm-dialog__body {
  padding: 1rem 1.5rem;
}

.confirm-dialog__message {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--p-surface-600, #4b5563);
  line-height: 1.5;
}

.confirm-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem 1.25rem;
}

.confirm-dialog__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1.25rem;
  min-width: 44px;
  min-height: 44px;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}

.confirm-dialog__btn--cancel {
  background-color: transparent;
  border: 1px solid var(--p-surface-300, #d1d5db);
  color: var(--p-surface-700, #374151);
}

.confirm-dialog__btn--cancel:hover {
  background-color: var(--p-surface-100, #f3f4f6);
}

.confirm-dialog__btn--cancel:focus-visible {
  outline: 2px solid var(--p-primary-500, #3b82f6);
  outline-offset: 2px;
}

.confirm-dialog__btn--confirm {
  background-color: var(--p-red-500, #ef4444);
  border: 1px solid var(--p-red-500, #ef4444);
  color: #ffffff;
}

.confirm-dialog__btn--confirm:hover {
  background-color: var(--p-red-600, #dc2626);
  border-color: var(--p-red-600, #dc2626);
}

.confirm-dialog__btn--confirm:focus-visible {
  outline: 2px solid var(--p-red-500, #ef4444);
  outline-offset: 2px;
}

/* Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Dark mode support */
:root[data-theme='dark'] .confirm-dialog,
.p-dark .confirm-dialog {
  background-color: var(--p-surface-800, #1f2937);
}

:root[data-theme='dark'] .confirm-dialog__title,
.p-dark .confirm-dialog__title {
  color: var(--p-surface-50, #f9fafb);
}

:root[data-theme='dark'] .confirm-dialog__message,
.p-dark .confirm-dialog__message {
  color: var(--p-surface-300, #d1d5db);
}

:root[data-theme='dark'] .confirm-dialog__btn--cancel,
.p-dark .confirm-dialog__btn--cancel {
  border-color: var(--p-surface-600, #4b5563);
  color: var(--p-surface-200, #e5e7eb);
}

:root[data-theme='dark'] .confirm-dialog__btn--cancel:hover,
.p-dark .confirm-dialog__btn--cancel:hover {
  background-color: var(--p-surface-700, #374151);
}
</style>
