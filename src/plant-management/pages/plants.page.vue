<script setup lang="ts">
import { downloadCSV } from "@/shared/services/csv";
import { ref, computed, onMounted } from "vue";
import PlantArt from "@/workspace/components/plant-art.vue";
import { useAuthenticationStore } from "@/iam/services/authentication.store";
import { loadPersonalPlants } from "@/shared/services/personal-workspace.service";
import { PlantService } from "@/plant-management/services/plant-api.service";
import http from "@/shared/services/http-common";
import type { Plant } from "@/plant-management/model/plant.entity";
import type { Profile } from "@/profile-management/model/profile.entity";

interface User {
  id: number;
  email: string;
  roles: string[];
}

const plants = ref<Plant[]>([]);
const users = ref<User[]>([]);
const profiles = ref<Profile[]>([]);
const loading = ref(true);
const error = ref("");
const search = ref("");
const view = ref<"cards" | "table">("cards");
const filteredPlants = computed(() =>
  plants.value.filter((plant) =>
    `${plant.name} ${plant.species}`
      .toLocaleLowerCase()
      .includes(search.value.toLocaleLowerCase()),
  ),
);

onMounted(async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  error.value = "";
  try {
    if (useAuthenticationStore().userRole !== "admin") {
      const context = await loadPersonalPlants();
      plants.value = context.plants;
      profiles.value = [context.profile];
      users.value = [context.user];
      return;
    }
    const [plantsData, usersRes, profilesRes] = await Promise.all([
      PlantService.getAll(),
      http.get("/users"),
      http.get("/profiles"),
    ]);
    plants.value = plantsData;
    users.value = Array.isArray(usersRes.data) ? usersRes.data : [];
    profiles.value = Array.isArray(profilesRes.data) ? profilesRes.data : [];
  } catch {
    plants.value = [];
    error.value =
      "No pudimos cargar las plantas. Revisa tu conexión o inténtalo de nuevo.";
  } finally {
    loading.value = false;
  }
}

function getUserEmail(profileId: number): string {
  const profile = profiles.value.find((p) => p.id === profileId);
  if (!profile) return "--";
  const user = users.value.find((u) => u.id === profile.userId);
  return user ? user.email : "--";
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

function exportPlantsCSV() {
  if (plants.value.length === 0) return;
  const exportData = plants.value.map((p) => ({
    id: p.id,
    nombre: p.name,
    especie: p.species,
    humedad: p.humidity || "",
    usuario: getUserEmail(p.profileId),
    profileId: p.profileId,
    descripcion: p.description || "",
    proximoRiego: p.nextWateringDate || "",
  }));
  downloadCSV(exportData, "plantas.csv");
}
</script>

<template>
  <div class="plants-page">
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-header__title">Plantas</h1>
        <p class="ps-page-header__subtitle">
          {{
            useAuthenticationStore().userRole === "admin"
              ? "Todas las plantas registradas en el sistema"
              : "Las plantas de tu cuenta, en un solo lugar"
          }}
        </p>
      </div>
      <button
        class="ps-btn ps-btn--outline"
        @click="exportPlantsCSV"
        :disabled="plants.length === 0 || loading"
      >
        <i class="pi pi-download"></i>
        <span>Descargar CSV</span>
      </button>
    </div>

    <div v-if="loading" class="ps-loading">
      <i class="pi pi-spinner pi-spin"></i>
    </div>

    <div
      v-else-if="error"
      class="ps-alert ps-alert--error"
      style="margin-bottom: 1rem"
    >
      <p>{{ error }}</p>
      <button class="ps-btn ps-btn--outline" @click="loadData">
        Reintentar
      </button>
    </div>

    <div v-else-if="plants.length === 0" class="ps-empty">
      <i class="pi pi-leaf"></i>
      <p>No hay plantas registradas.</p>
    </div>

    <template v-else>
      <div class="section-heading">
        <label class="search-field"
          ><i class="pi pi-search" aria-hidden="true"></i
          ><input
            v-model="search"
            aria-label="Buscar plantas"
            placeholder="Nombre o especie"
        /></label>
        <div class="button-row" style="margin: 0">
          <button
            class="ps-btn ps-btn--outline"
            :aria-pressed="view === 'cards'"
            @click="view = 'cards'"
          >
            Tarjetas</button
          ><button
            class="ps-btn ps-btn--outline"
            :aria-pressed="view === 'table'"
            @click="view = 'table'"
          >
            Tabla
          </button>
        </div>
      </div>
      <div v-if="!filteredPlants.length" class="ps-empty" role="status">
        No hay coincidencias para tu búsqueda.
      </div>
      <div v-else-if="view === 'cards'" class="plant-collection">
        <router-link
          v-for="(plant, index) in filteredPlants"
          :key="plant.id"
          :to="`/plants/${plant.id}`"
          class="ps-card plant-tile"
        >
          <div
            class="plant-visual"
            :class="['sage', 'sand', 'mint'][index % 3]"
          >
            <PlantArt :variant="(index % 2) + 1" /><span class="plant-location"
              >Ilustración</span
            ><span class="plant-open"
              ><i class="pi pi-arrow-up-right" aria-hidden="true"></i
            ></span>
          </div>
          <div class="plant-tile__body">
            <h3>{{ plant.name }}</h3>
            <p>{{ plant.species }}</p>
            <div class="plant-readings">
              <span
                ><i class="pi pi-tint" aria-hidden="true"></i
                >{{ getMoistureLabel(plant.humidity) }}</span
              ><span>{{ plant.nextWateringDate || "Sin próximo riego" }}</span>
            </div>
          </div>
        </router-link>
      </div>
      <div v-else class="ps-card table-container">
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Especie</th>
              <th>Humedad</th>
              <th>Usuario</th>
              <th>Próximo Riego</th>
              <th>Temp Min/Max</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="plant in filteredPlants" :key="plant.id">
              <td>{{ plant.id }}</td>
              <td>
                <router-link :to="`/plants/${plant.id}`">{{
                  plant.name
                }}</router-link>
              </td>
              <td>{{ plant.species }}</td>
              <td>
                <span class="ps-badge ps-badge--low">{{
                  getMoistureLabel(plant.humidity)
                }}</span>
              </td>
              <td>{{ getUserEmail(plant.profileId) }}</td>
              <td>{{ plant.nextWateringDate || "--" }}</td>
              <td>
                {{ plant.temperatureThresholdMin ?? "--" }} /
                {{ plant.temperatureThresholdMax ?? "--" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
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
