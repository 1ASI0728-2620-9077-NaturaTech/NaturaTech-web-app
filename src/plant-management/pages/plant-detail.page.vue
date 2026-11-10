<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { PlantService } from "@/plant-management/services/plant-api.service";
import { IoTApiService } from "@/iot-management/services/iot-api.service";
import { useAuthenticationStore } from "@/iam/services/authentication.store";
import { loadPersonalPlants } from "@/shared/services/personal-workspace.service";
import type { Plant } from "@/plant-management/model/plant.entity";
import type { SensorReading } from "@/iot-management/model/iot-node.entity";

const route = useRoute();
const router = useRouter();
const iotApi = new IoTApiService();

const plant = ref<Plant | null>(null);
const latestReading = ref<SensorReading | null>(null);
const loading = ref(true);
const error = ref("");
const readingError = ref("");

const plantId = Number(route.params.id);

onMounted(loadData);
async function loadData() {
  loading.value = true;
  error.value = "";
  readingError.value = "";
  try {
    if (!Number.isSafeInteger(plantId) || plantId <= 0)
      throw new Error("Invalid plant");
    if (useAuthenticationStore().userRole === "admin")
      plant.value = await PlantService.getById(plantId);
    else {
      const context = await loadPersonalPlants();
      plant.value = context.plants.find((item) => item.id === plantId) ?? null;
      if (!plant.value) throw new Error("Plant not accessible");
    }
    try {
      latestReading.value = await iotApi.getLatestReading(plantId);
    } catch {
      readingError.value =
        "Las lecturas no están disponibles. Los datos de la planta siguen disponibles.";
    }
  } catch {
    error.value = "Error cargando datos de la planta.";
  } finally {
    loading.value = false;
  }
}

function getMoistureLabel(humidity: string | undefined): string {
  if (!humidity) return "--";
  const map: Record<string, string> = {
    BAJA: "Baja",
    MEDIA: "Media",
    ALTA: "Alta",
  };
  return map[humidity] || humidity;
}
</script>

<template>
  <div class="plant-detail-page">
    <button
      class="ps-btn ps-btn--outline"
      @click="router.push('/plants')"
      style="margin-bottom: 1.5rem"
    >
      <i class="pi pi-arrow-left"></i>
      <span>Volver a Plantas</span>
    </button>

    <div v-if="loading" class="ps-loading">
      <i class="pi pi-spinner pi-spin"></i>
    </div>

    <div v-else-if="error" class="ps-alert ps-alert--error" role="alert">
      {{ error }}
      <button class="ps-btn ps-btn--outline" @click="loadData">
        Reintentar
      </button>
    </div>

    <div v-else-if="plant" class="detail-layout">
      <div class="detail-left">
        <p v-if="readingError" role="status">
          {{ readingError }}
          <button class="ps-btn ps-btn--outline" @click="loadData">
            Reintentar lecturas
          </button>
        </p>
        <div class="ps-card detail-image">
          <img
            v-if="plant.imageUrl"
            :src="plant.imageUrl"
            :alt="plant.name"
            class="detail-image__img"
          />
          <div
            v-else
            class="detail-image__placeholder"
            style="background: var(--ps-gradient-1)"
          >
            <i class="pi pi-leaf"></i>
          </div>
        </div>

        <div class="detail-stats">
          <div class="ps-card detail-stat">
            <i class="pi pi-cloud"></i>
            <span class="detail-stat__value">{{
              getMoistureLabel(plant.humidity)
            }}</span>
            <span class="detail-stat__label">Humedad</span>
          </div>
          <div class="ps-card detail-stat" v-if="latestReading">
            <i class="pi pi-sun"></i>
            <span class="detail-stat__value"
              >{{ latestReading.airTemperature?.toFixed(1) }}°C</span
            >
            <span class="detail-stat__label">Temperatura</span>
          </div>
          <div class="ps-card detail-stat" v-if="latestReading">
            <i class="pi pi-bolt"></i>
            <span class="detail-stat__value"
              >{{ latestReading.lightPercent }}%</span
            >
            <span class="detail-stat__label">Luz</span>
          </div>
          <div class="ps-card detail-stat" v-if="plant.nextWateringDate">
            <i class="pi pi-calendar"></i>
            <span class="detail-stat__value">{{ plant.nextWateringDate }}</span>
            <span class="detail-stat__label">Próximo Riego</span>
          </div>
        </div>
      </div>

      <div class="detail-right">
        <div class="ps-card" style="padding: 1.5rem">
          <h1 class="detail-name">{{ plant.name }}</h1>
          <p class="detail-species">{{ plant.species }}</p>
          <p v-if="plant.description" class="detail-description">
            {{ plant.description }}
          </p>
          <p v-if="plant.acquisitionDate" class="detail-meta">
            Desde: {{ plant.acquisitionDate }}
          </p>
          <div class="button-row">
            <router-link to="/health" class="ps-btn ps-btn--primary"
              ><i class="pi pi-camera" aria-hidden="true"></i> Revisar su
              salud</router-link
            ><router-link to="/assistant" class="ps-btn ps-btn--outline"
              >Consultar al asistente</router-link
            >
          </div>

          <div
            v-if="plant.temperatureThresholdMin || plant.humidityThresholdMin"
            class="detail-thresholds"
          >
            <h3 style="font-size: 0.95rem; margin: 1rem 0 0.5rem">
              Umbrales configurados
            </h3>
            <ul class="threshold-list">
              <li v-if="plant.temperatureThresholdMin != null">
                Temp: {{ plant.temperatureThresholdMin }}°C —
                {{ plant.temperatureThresholdMax }}°C
              </li>
              <li v-if="plant.humidityThresholdMin != null">
                Humedad: {{ plant.humidityThresholdMin }}% —
                {{ plant.humidityThresholdMax }}%
              </li>
              <li v-if="plant.lightThresholdMin != null">
                Luz mínima: {{ plant.lightThresholdMin }}%
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plant-detail-page {
  max-width: 1000px;
}
.detail-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 2rem;
  align-items: start;
}
@media (max-width: 900px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }
}
.detail-image {
  border-radius: 0.75rem;
  overflow: hidden;
}
.detail-image__img {
  width: 100%;
  height: 220px;
  object-fit: cover;
  display: block;
}
.detail-image__placeholder {
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.detail-image__placeholder i {
  font-size: 3.5rem;
  color: rgba(255, 255, 255, 0.8);
}
.detail-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-top: 1rem;
}
.detail-stat {
  padding: 1rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}
.detail-stat i {
  font-size: 1.25rem;
  color: var(--ps-primary);
}
.detail-stat__value {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--ps-text);
}
.detail-stat__label {
  font-size: 0.75rem;
  color: var(--ps-text-secondary);
}
.detail-name {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.25rem;
  color: var(--ps-text);
}
.detail-species {
  font-size: 1rem;
  color: var(--ps-text-secondary);
  margin: 0 0 1rem;
}
.detail-description {
  font-size: 0.9rem;
  color: var(--ps-text-secondary);
  margin: 0 0 1rem;
}
.detail-meta {
  font-size: 0.85rem;
  color: var(--ps-text-secondary);
}
.threshold-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.85rem;
  color: var(--ps-text-secondary);
}
.threshold-list li {
  padding: 0.25rem 0;
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
}
.ps-alert--error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}
</style>
