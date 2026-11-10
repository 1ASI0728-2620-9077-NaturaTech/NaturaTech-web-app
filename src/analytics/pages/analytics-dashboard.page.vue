<script setup lang="ts">
import { downloadCSV } from "@/shared/services/csv";
import { ref, computed, onMounted } from "vue";
import { fetchAllAnalytics } from "@/analytics/services/analytics-api.service";
import { PlantService } from "@/plant-management/services/plant-api.service";
import { TaskApiService } from "@/task-management/services/task-api.service";
import http from "@/shared/services/http-common";
import type {
  GlobalTelemetry,
  DeviceStatus,
} from "@/analytics/model/analytics.entity";
import type { Task } from "@/task-management/model/task.entity";
import PlantArt from "@/workspace/components/plant-art.vue";

const taskApi = new TaskApiService();

const telemetry = ref<GlobalTelemetry | null>(null);
const deviceStatus = ref<DeviceStatus | null>(null);
const loading = ref(true);
const error = ref("");
const totalUsers = ref<number | null>(null);
const totalPlants = ref<number | null>(null);

// Task metrics
const tasks = ref<Task[]>([]);
const tasksAvailable = ref(false);
const partialErrors = ref<string[]>([]);
const totalTasks = computed(() => tasks.value.length);
const completedTasks = computed(
  () => tasks.value.filter((t) => t.status === "COMPLETED").length,
);
const pendingTasks = computed(() => totalTasks.value - completedTasks.value);
const completionRate = computed(() =>
  totalTasks.value > 0
    ? ((completedTasks.value / totalTasks.value) * 100).toFixed(1)
    : "0.0",
);

function exportTelemetryCSV() {
  if (!telemetry.value) return;
  downloadCSV([telemetry.value], "telemetria_global.csv");
}

function exportDevicesCSV() {
  if (!deviceStatus.value) return;
  downloadCSV([deviceStatus.value], "estado_dispositivos.csv");
}

function exportTasksCSV() {
  if (tasks.value.length === 0) return;
  downloadCSV(tasks.value, "tareas.csv");
}

onMounted(loadData);
async function loadData() {
  loading.value = true;
  error.value = "";
  partialErrors.value = [];
  totalUsers.value = null;
  totalPlants.value = null;
  telemetry.value = null;
  deviceStatus.value = null;
  tasksAvailable.value = false;
  const results = await Promise.allSettled([
    fetchAllAnalytics(),
    http.get("/users"),
    PlantService.getAll(),
    taskApi.getAll(),
  ]);
  const [analytics, users, plants, taskResult] = results;
  if (analytics.status === "fulfilled")
    [telemetry.value, deviceStatus.value] = analytics.value;
  else partialErrors.value.push("telemetría y dispositivos");
  if (users.status === "fulfilled" && Array.isArray(users.value.data))
    totalUsers.value = users.value.data.length;
  else partialErrors.value.push("usuarios");
  if (plants.status === "fulfilled") totalPlants.value = plants.value.length;
  else partialErrors.value.push("plantas");
  if (taskResult.status === "fulfilled") {
    tasks.value = taskResult.value;
    tasksAvailable.value = true;
  } else partialErrors.value.push("tareas");
  if (partialErrors.value.length === 4)
    error.value =
      "No pudimos consultar el resumen. Revisa tu conexión e inténtalo de nuevo.";
  loading.value = false;
}
</script>

<template>
  <div class="dashboard-page">
    <div class="ps-page-header">
      <div>
        <span class="eyebrow">TU ESPACIO VERDE, CONECTADO</span>
        <h1 class="ps-page-header__title">El pulso de tu jardín</h1>
        <p class="ps-page-header__subtitle">
          Resumen general del sistema PlantSync
        </p>
      </div>
    </div>

    <section class="garden-hero" style="margin-bottom: 24px">
      <div class="garden-hero__copy">
        <span class="hero-label">CUIDAR ES CONECTAR</span>
        <h2>Más cerca de tus plantas.<br /><em>Cada día.</em></h2>
        <p>
          Consulta sus condiciones, organiza sus cuidados y descubre las nuevas
          herramientas de PlantSync.
        </p>
        <router-link to="/health" class="hero-link"
          >Conocer el análisis de imágenes
          <i class="pi pi-arrow-right" aria-hidden="true"></i
        ></router-link>
      </div>
      <div class="garden-hero__art">
        <span class="hero-orbit"></span><PlantArt />
      </div>
    </section>
    <!-- Loading -->
    <div v-if="loading" class="ps-loading">
      <i class="pi pi-spinner pi-spin"></i>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="ps-alert ps-alert--error">
      <p>{{ error }}</p>
      <button class="ps-btn ps-btn--outline" @click="loadData">
        Reintentar
      </button>
    </div>

    <template v-else
      ><div v-if="partialErrors.length" class="workspace-notice" role="status">
        No se pudo consultar: {{ partialErrors.join(", ") }}.
        <button class="ps-btn ps-btn--outline" @click="loadData">
          Reintentar
        </button>
      </div>
      <!-- Summary cards -->
      <section class="dashboard-summary">
        <div class="ps-card summary-card">
          <div class="summary-card__icon"><i class="pi pi-users"></i></div>
          <div class="summary-card__info">
            <span class="summary-card__value">{{
              totalUsers ?? "No disponible"
            }}</span>
            <span class="summary-card__label">Usuarios</span>
          </div>
        </div>
        <div class="ps-card summary-card">
          <div class="summary-card__icon"><i class="pi pi-leaf"></i></div>
          <div class="summary-card__info">
            <span class="summary-card__value">{{
              totalPlants ?? "No disponible"
            }}</span>
            <span class="summary-card__label">Plantas</span>
          </div>
        </div>
        <div class="ps-card summary-card" v-if="deviceStatus">
          <div class="summary-card__icon"><i class="pi pi-microchip"></i></div>
          <div class="summary-card__info">
            <span class="summary-card__value">{{
              deviceStatus.onlineCount +
              deviceStatus.offlineCount +
              deviceStatus.errorCount
            }}</span>
            <span class="summary-card__label">Nodos IoT</span>
          </div>
        </div>
      </section>

      <!-- Task Metrics -->
      <section v-if="tasksAvailable" class="dashboard-section">
        <h2 class="dashboard-section__title">Métricas de Tareas</h2>
        <div class="metrics-grid">
          <div class="ps-card metric-card">
            <i class="pi pi-list metric-card__icon"></i>
            <span class="metric-card__value">{{ totalTasks }}</span>
            <span class="metric-card__label">Total Tareas</span>
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
          <div class="ps-card metric-card">
            <i class="pi pi-percentage metric-card__icon"></i>
            <span class="metric-card__value">{{ completionRate }}%</span>
            <span class="metric-card__label">Tasa de Completado</span>
          </div>
        </div>
      </section>

      <!-- Telemetry metrics -->
      <section class="dashboard-section" v-if="telemetry">
        <h2 class="dashboard-section__title">Telemetría Global (Promedios)</h2>
        <div class="metrics-grid">
          <div class="ps-card metric-card">
            <i class="pi pi-sun metric-card__icon"></i>
            <span class="metric-card__value"
              >{{ telemetry.averageLightPercent.toFixed(1) }}%</span
            >
            <span class="metric-card__label">Luz</span>
          </div>
          <div class="ps-card metric-card">
            <i
              class="pi pi-thermometer metric-card__icon"
              style="color: #e67e22"
            ></i>
            <span class="metric-card__value"
              >{{ telemetry.averageAirTemperature.toFixed(1) }}°C</span
            >
            <span class="metric-card__label">Temperatura</span>
          </div>
          <div class="ps-card metric-card">
            <i class="pi pi-cloud metric-card__icon" style="color: #8e44ad"></i>
            <span class="metric-card__value"
              >{{ telemetry.averageGasPercent.toFixed(1) }}%</span
            >
            <span class="metric-card__label">Gas</span>
          </div>
          <div class="ps-card metric-card">
            <i class="pi pi-cloud metric-card__icon" style="color: #3498db"></i>
            <span class="metric-card__value"
              >{{ telemetry.averageHumidityPercent.toFixed(1) }}%</span
            >
            <span class="metric-card__label">Humedad</span>
          </div>
        </div>
      </section>

      <!-- Device status -->
      <section class="dashboard-section" v-if="deviceStatus">
        <h2 class="dashboard-section__title">Estado de Dispositivos</h2>
        <div class="metrics-grid">
          <div class="ps-card metric-card metric-card--success">
            <i class="pi pi-check-circle metric-card__icon"></i>
            <span class="metric-card__value">{{
              deviceStatus.onlineCount
            }}</span>
            <span class="metric-card__label">En Línea</span>
          </div>
          <div class="ps-card metric-card metric-card--warning">
            <i class="pi pi-exclamation-circle metric-card__icon"></i>
            <span class="metric-card__value">{{
              deviceStatus.offlineCount
            }}</span>
            <span class="metric-card__label">Desconectados</span>
          </div>
          <div class="ps-card metric-card metric-card--danger">
            <i class="pi pi-times-circle metric-card__icon"></i>
            <span class="metric-card__value">{{
              deviceStatus.errorCount
            }}</span>
            <span class="metric-card__label">Con Error</span>
          </div>
        </div>
      </section>

      <!-- Export buttons -->
      <section class="dashboard-section">
        <h2 class="dashboard-section__title">Exportar Datos</h2>
        <div class="export-buttons">
          <button
            class="ps-btn ps-btn--outline"
            @click="exportTelemetryCSV"
            :disabled="!telemetry"
          >
            <i class="pi pi-download"></i>
            <span>Exportar Telemetría CSV</span>
          </button>
          <button
            class="ps-btn ps-btn--outline"
            @click="exportDevicesCSV"
            :disabled="!deviceStatus"
          >
            <i class="pi pi-download"></i>
            <span>Exportar Dispositivos CSV</span>
          </button>
          <button
            class="ps-btn ps-btn--outline"
            @click="exportTasksCSV"
            :disabled="!tasksAvailable || tasks.length === 0"
          >
            <i class="pi pi-download"></i>
            <span>Exportar Tareas CSV</span>
          </button>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.dashboard-summary {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
}

.summary-card__icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(107, 124, 62, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.summary-card__icon i {
  font-size: 1.25rem;
  color: var(--ps-primary);
}

.summary-card__info {
  display: flex;
  flex-direction: column;
}

.summary-card__value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ps-text);
}

.summary-card__label {
  font-size: 0.8rem;
  color: var(--ps-text-secondary);
}

.dashboard-section {
  margin-bottom: 2rem;
}

.dashboard-section__title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--ps-text);
  margin: 0 0 1rem;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
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

.metric-card--success .metric-card__icon {
  color: #16a34a;
}
.metric-card--success .metric-card__value {
  color: #16a34a;
}
.metric-card--warning .metric-card__icon {
  color: #d97706;
}
.metric-card--warning .metric-card__value {
  color: #d97706;
}
.metric-card--danger .metric-card__icon {
  color: #dc2626;
}
.metric-card--danger .metric-card__value {
  color: #dc2626;
}

.export-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
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

.ps-alert {
  padding: 1rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
}

.ps-alert--error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}
</style>
