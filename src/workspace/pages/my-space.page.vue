<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { loadPersonalTasks } from "@/shared/services/personal-workspace.service";
import { ProfileNotFoundError } from "@/profile-management/services/profile-api.service";
const context = ref<Awaited<ReturnType<typeof loadPersonalTasks>> | null>(null);
const loading = ref(true), error = ref(""), missingProfile = ref(false);
const pending = computed(() => context.value?.tasks.filter(t => t.status !== "COMPLETED") ?? []);
const completed = computed(() => context.value?.tasks.filter(t => t.status === "COMPLETED").length ?? 0);
const upcoming = computed(() => [...pending.value].sort((a,b) => Date.parse(a.scheduledDate) - Date.parse(b.scheduledDate)).slice(0,4));
function date(value: string) { return new Date(value).toLocaleDateString("es-PE", { day: "numeric", month: "short" }); }
async function load() {
  loading.value = true; error.value = ""; missingProfile.value = false;
  try { context.value = await loadPersonalTasks(); }
  catch (cause) { missingProfile.value = cause instanceof ProfileNotFoundError; error.value = "No pudimos cargar tu espacio. Inténtalo de nuevo."; }
  finally { loading.value = false; }
}
onMounted(load);
</script>
<template>
  <div class="personal-space">
    <header class="ps-page-header"><div><span class="eyebrow">TU JARDÍN, DE UN VISTAZO</span><h1 class="ps-page-header__title">Mi espacio</h1><p class="ps-page-header__subtitle">Un lugar para ti y para todo lo que estás haciendo crecer.</p></div><router-link to="/profile" class="ps-btn ps-btn--outline">Ver mi perfil <i class="pi pi-arrow-up-right" aria-hidden="true"></i></router-link></header>
    <p v-if="loading" role="status">Preparando tu espacio…</p>
    <section v-else-if="missingProfile" class="ps-card panel"><h2>Vamos a conocernos</h2><p>Completa tu perfil para empezar a construir tu jardín.</p><router-link to="/profile" class="ps-btn ps-btn--primary">Completar mi perfil</router-link></section>
    <div v-else-if="error" role="alert" class="ps-alert ps-alert--error">{{ error }} <button class="ps-btn ps-btn--outline" @click="load">Reintentar</button></div>
    <template v-else-if="context">
      <section class="space-welcome"><div><span class="eyebrow">CADA PEQUEÑO CUIDADO CUENTA</span><h2>Hola, {{ context.profile.personName }}.</h2><p>Tu jardín crece a tu ritmo. Revisa tus próximos cuidados y encuentra el siguiente paso.</p><router-link to="/plants" class="ps-btn ps-btn--primary">Ir a mis plantas <i class="pi pi-arrow-right" aria-hidden="true"></i></router-link></div><i class="pi pi-leaf welcome-leaf" aria-hidden="true"></i></section>
      <div class="space-metrics"><router-link to="/plants" class="ps-card"><i class="pi pi-leaf" aria-hidden="true"></i><strong>{{ context.plants.length }}</strong><span>Plantas en tu jardín</span></router-link><router-link to="/tasks" class="ps-card"><i class="pi pi-calendar" aria-hidden="true"></i><strong>{{ pending.length }}</strong><span>Cuidados pendientes</span></router-link><router-link to="/tasks" class="ps-card"><i class="pi pi-check-circle" aria-hidden="true"></i><strong>{{ completed }}</strong><span>Cuidados completados</span></router-link></div>
      <div class="space-columns"><section class="ps-card panel"><div class="space-heading"><h2>Tu próxima atención</h2><router-link to="/tasks">Ver cuidados</router-link></div><p v-if="!upcoming.length" class="muted">{{ context.plants.length ? 'No hay cuidados pendientes. Puedes organizar tu próxima tarea en Cuidados.' : 'Agrega tu primera planta y organiza sus cuidados.' }}</p><router-link v-for="task in upcoming" :key="task.id" to="/tasks" class="space-task"><span><strong>{{ task.action }}</strong><small>{{ context.plants.find(p => p.id === task.plantId)?.name }}</small></span><time :datetime="task.scheduledDate">{{ date(task.scheduledDate) }}</time></router-link></section><section class="ps-card panel"><span class="eyebrow">TU CUENTA</span><h2>{{ context.profile.personName }}</h2><p class="account-email">{{ context.user.email }}</p><p>Plan {{ context.profile.subscriptionPlan }}</p><router-link to="/profile">Administrar mi perfil →</router-link><hr /><router-link to="/assistant">Consultar al asistente →</router-link></section></div>
    </template>
  </div>
</template>
<style scoped>
.personal-space { max-width:1200px; margin:auto; }
.space-welcome { display:flex; justify-content:space-between; align-items:center; gap:2rem; padding:clamp(1.5rem,4vw,3rem); border-radius:24px; background:var(--ps-gradient-1); margin-bottom:1.5rem; color:var(--ps-text); overflow:hidden; }
.space-welcome h2 { font-size:clamp(1.8rem,3vw,2.7rem); margin:.7rem 0; letter-spacing:-.04em; }
.space-welcome p { max-width:52ch; line-height:1.8; margin-bottom:1.5rem; }
.welcome-leaf { font-size:7rem; opacity:.3; transform:rotate(-20deg); }
.space-metrics { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin-bottom:1.5rem; }
.space-metrics a { padding:1.5rem; display:grid; gap:.6rem; color:var(--ps-text); }
.space-metrics i { color:var(--ps-primary); } .space-metrics strong { font-size:2.2rem; } .space-metrics span { color:var(--ps-text-secondary); font-size:.9rem; }
.space-columns { display:grid; grid-template-columns:1.6fr 1fr; gap:1.5rem; } .panel { padding:1.6rem; } .panel h2 { font-size:1.15rem; } .space-heading { display:flex; align-items:center; justify-content:space-between; gap:1rem; }
.space-task { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:1.1rem 0; border-bottom:1px solid var(--ps-border); color:var(--ps-text); } .space-task small { display:block; margin-top:.4rem; color:var(--ps-text-secondary); } .space-task time { white-space:nowrap; font-size:.85rem; } .account-email { overflow-wrap:anywhere; color:var(--ps-text-secondary); } hr { border:0; border-top:1px solid var(--ps-border); margin:1.5rem 0; }
@media(max-width:650px) { .space-metrics,.space-columns { grid-template-columns:1fr; } .welcome-leaf { display:none; } .space-heading { flex-wrap:wrap; } }
</style>
