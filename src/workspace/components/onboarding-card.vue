<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  to: string;
  action: string;
  step?: string;
}>();
</script>
<template>
  <section class="onboarding-card">
    <span class="eyebrow">{{ step || "TU JARDÍN, PASO A PASO" }}</span>
    <div class="onboarding-card__icon" aria-hidden="true">
      <i class="pi pi-leaf"></i>
    </div>
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
    <router-link :to="to" class="ps-btn ps-btn--primary"
      >{{ action }} <i class="pi pi-arrow-right" aria-hidden="true"></i
    ></router-link>
  </section>
</template>
