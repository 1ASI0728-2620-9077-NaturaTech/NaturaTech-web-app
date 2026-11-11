<script setup lang="ts">
import { downloadCSV } from "@/shared/services/csv";
import { useAuthenticationStore } from "@/iam/services/authentication.store";
import { loadPersonalTasks } from "@/shared/services/personal-workspace.service";
import { ref, computed, onMounted } from "vue";
import CreateResourceDialog from "@/workspace/components/create-resource-dialog.vue";
import { TaskApiService } from "@/task-management/services/task-api.service";
import { PlantService } from "@/plant-management/services/plant-api.service";
import http from "@/shared/services/http-common";
import type { Task } from "@/task-management/model/task.entity";
import type { Plant } from "@/plant-management/model/plant.entity";
import type { Profile } from "@/profile-management/model/profile.entity";

interface User {
  id: number;
  email: string;
  roles: string[];
}

const taskApi = new TaskApiService();
const tasks = ref<Task[]>([]);
const plants = ref<Plant[]>([]);
const users = ref<User[]>([]);
const profiles = ref<Profile[]>([]);
const loading = ref(true);
const error = ref("");
const creating = ref(false),
  completing = ref<number | null>(null);
async function completeTask(id: number) {
  if (completing.value !== null) return;
  const task = tasks.value.find((item) => item.id === id);
  if (!task) return;
  completing.value = id;
  try {
    await taskApi.complete(id, {
      notes: task.notes,
      humidity: task.humidity ?? undefined,
    });
    await loadData();
  } catch {
    error.value = "No pudimos completar el cuidado. Inténtalo de nuevo.";
  } finally {
    completing.value = null;
  }
}

// Metrics
const totalTasks = computed(() => tasks.value.length);
const completedTasks = computed(
  () => tasks.value.filter((t) => t.status === "COMPLETED").length,
);
const pendingTasks = computed(() => totalTasks.value - completedTasks.value);
const completionRate = computed(() =>
  totalTasks.value > 0
    ? ((completedTasks.value / totalTasks.value) * 100).toFixed(1)
    : "0",
);
const overdueTasks = computed(
  () =>
    tasks.value.filter(
      (t) => t.status !== "COMPLETED" && new Date(t.scheduledDate) < new Date(),
    ).length,
);

onMounted(loadData);
async function loadData() {
  loading.value = true;
  error.value = "";
  try {
    if (useAuthenticationStore().userRole !== "admin") {
      const context = await loadPersonalTasks();
      tasks.value = context.tasks;
      plants.value = context.plants;
      users.value = [context.user];
      profiles.value = [context.profile];
      return;
    }
    const [tasksData, plantsData, usersRes, profilesRes] = await Promise.all([
      taskApi.getAll(),
      PlantService.getAll(),
      http.get("/users"),
      http.get("/profiles"),
    ]);
    tasks.value = tasksData;
    plants.value = plantsData;
    users.value = Array.isArray(usersRes.data) ? usersRes.data : [];
    profiles.value = Array.isArray(profilesRes.data) ? profilesRes.data : [];
  } catch {
    error.value = "No pudimos cargar las tareas. Inténtalo de nuevo.";
  } finally {
    loading.value = false;
  }
}

function getPlantName(plantId: number): string {
  return plants.value.find((p) => p.id === plantId)?.name || `#${plantId}`;
}

function getUserEmail(profileId: number): string {
  const profile = profiles.value.find((p) => p.id === profileId);
  if (!profile) return "--";
  const user = users.value.find((u) => u.id === profile.userId);
  return user ? user.email : "--";
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function exportCSV() {
  const exportData = tasks.value.map((t) => ({
    id: t.id,
    accion: t.action,
    planta: getPlantName(t.plantId),
    usuario: getUserEmail(t.profileId),
    fechaProgramada: t.scheduledDate,
    estado: t.status,
    completada: t.completedAt || "",
    notas: t.notes || "",
  }));
  downloadCSV(exportData, "tareas.csv");
}
</script>

<template>
  <div class="tasks-page">
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-header__title">Tareas</h1>
        <p class="ps-page-header__subtitle">
          {{
            useAuthenticationStore().userRole === "admin"
              ? "Resumen de tareas de cuidado del sistema"
              : "Los cuidados pendientes y el historial de tus plantas"
          }}
        </p>
      </div>
      <button class="ps-btn ps-btn--primary" @click="creating = true">
        <i class="pi pi-plus" aria-hidden="true"></i> Crear tarea
      </button>
      <button
        class="ps-btn ps-btn--outline"
        @click="exportCSV"
        :disabled="loading || !!error || tasks.length === 0"
      >
        <i class="pi pi-download"></i>
        <span>Descargar CSV</span>
      </button>
    </div>

    <div v-if="loading" class="ps-loading">
      <i class="pi pi-spinner pi-spin"></i>
    </div>

    <div v-else-if="error" class="ps-alert ps-alert--error" role="alert">
      <p>{{ error }}</p>
      <button class="ps-btn ps-btn--outline" @click="loadData">
        Reintentar
      </button>
    </div>
    <template v-else>
      <!-- Metrics -->
      <section class="metrics-grid">
        <div class="ps-card metric-card">
          <i class="pi pi-list metric-card__icon"></i>
          <span class="metric-card__value">{{ totalTasks }}</span>
          <span class="metric-card__label">Total</span>
        </div>
        <div class="ps-card metric-card metric-card--success">
          <i class="pi pi-check-circle metric-card__icon"></i>
          <span class="metric-card__value">{{ completedTasks }}</span>
          <span class="metric-card__label">Completadas</span>
        </div>
        <div class="ps-card metric-card metric-card--warning">
          <i class="pi pi-clock metric-card__icon"></i>
          <span class="metric-card__value">{{ pendingTasks }}</span>
          <span class="metric-card__label">Pendientes</span>
        </div>
        <div class="ps-card metric-card metric-card--danger">
          <i class="pi pi-exclamation-triangle metric-card__icon"></i>
          <span class="metric-card__value">{{ overdueTasks }}</span>
          <span class="metric-card__label">Vencidas</span>
        </div>
        <div class="ps-card metric-card">
          <i class="pi pi-percentage metric-card__icon"></i>
          <span class="metric-card__value">{{ completionRate }}%</span>
          <span class="metric-card__label">Cumplimiento</span>
        </div>
      </section>

      <!-- Tasks table -->
      <section style="margin-top: 2rem">
        <h2 class="section-title">Registro de Tareas ({{ tasks.length }})</h2>
        <div v-if="tasks.length === 0" class="ps-empty onboarding-card">
          <i class="pi pi-check-square"></i>
          <h2>Pequeños cuidados, grandes cambios</h2>
          <p>Organiza el próximo riego o revisión de hojas de tu jardín.</p>
          <button class="ps-btn ps-btn--primary" @click="creating = true">
            Añadir mi primer cuidado
          </button>
        </div>
        <div v-else class="ps-card table-container">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Acción</th>
                <th>Planta</th>
                <th>Usuario</th>
                <th>Fecha Programada</th>
                <th>Estado</th>
                <th>Completada</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="task in tasks" :key="task.id">
                <td>
                  <strong>{{ task.action }}</strong
                  ><br v-if="task.notes" /><small
                    v-if="task.notes"
                    style="color: var(--ps-text-secondary)"
                    >{{ task.notes }}</small
                  >
                </td>
                <td>{{ getPlantName(task.plantId) }}</td>
                <td>{{ getUserEmail(task.profileId) }}</td>
                <td>{{ formatDate(task.scheduledDate) }}</td>
                <td>
                  <span
                    class="ps-badge"
                    :class="
                      task.status === 'COMPLETED'
                        ? 'ps-badge--low'
                        : 'ps-badge--medium'
                    "
                  >
                    {{
                      task.status === "COMPLETED" ? "Completada" : "Pendiente"
                    }}
                  </span>
                </td>
                <td>
                  {{ task.completedAt ? formatDate(task.completedAt) : "--" }}
                </td>
                <td>
                  <button
                    v-if="task.status !== 'COMPLETED'"
                    class="ps-btn ps-btn--outline"
                    :disabled="completing !== null"
                    @click="completeTask(task.id)"
                  >
                    {{
                      completing === task.id
                        ? "Guardando…"
                        : "Marcar completada"
                    }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
    <CreateResourceDialog
      v-model:visible="creating"
      kind="task"
      @created="loadData"
    />
  </div>
</template>

<style scoped>
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;
}
.metric-card {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
}
.metric-card__icon {
  font-size: 1.5rem;
  color: var(--ps-primary);
}
.metric-card__value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ps-text);
}
.metric-card__label {
  font-size: 0.8rem;
  color: var(--ps-text-secondary);
}
.metric-card--success .metric-card__icon,
.metric-card--success .metric-card__value {
  color: #16a34a;
}
.metric-card--warning .metric-card__icon,
.metric-card--warning .metric-card__value {
  color: #d97706;
}
.metric-card--danger .metric-card__icon,
.metric-card--danger .metric-card__value {
  color: #dc2626;
}
.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--ps-text);
  margin: 0 0 1rem;
}
.table-container {
  overflow-x: auto;
  padding: 1rem;
}
.admin-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.admin-table th,
.admin-table td {
  text-align: left;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--ps-border);
}
.admin-table th {
  font-weight: 600;
  color: var(--ps-text-secondary);
  font-size: 0.8rem;
  text-transform: uppercase;
}
.admin-table tr:hover td {
  background: rgba(107, 124, 62, 0.03);
}
.ps-loading {
  display: flex;
  justify-content: center;
  padding: 4rem;
}
.ps-loading i {
  font-size: 2.5rem;
  color: var(--ps-primary);
}
</style>
