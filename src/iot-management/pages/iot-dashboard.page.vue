<script setup lang="ts">
import { downloadCSV } from "@/shared/services/csv";
import { useAuthenticationStore } from "@/iam/services/authentication.store";
import { loadPersonalPlants } from "@/shared/services/personal-workspace.service";
import { ref, onMounted } from "vue";
import CreateResourceDialog from "@/workspace/components/create-resource-dialog.vue";
const creating = ref(false),
  selectedNode = ref<string>();
function openCreate(code?: string) {
  selectedNode.value = code;
  creating.value = true;
}
import { IoTApiService } from "@/iot-management/services/iot-api.service";
import http from "@/shared/services/http-common";
import type { IoTNode } from "@/iot-management/model/iot-node.entity";
import type { Profile } from "@/profile-management/model/profile.entity";

interface User {
  id: number;
  email: string;
  roles: string[];
}

const iotApi = new IoTApiService();

const nodes = ref<IoTNode[]>([]);
const users = ref<User[]>([]);
const profiles = ref<Profile[]>([]);
const loading = ref(true);
const error = ref("");
const warning = ref("");

onMounted(async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  error.value = "";
  warning.value = "";
  nodes.value = [];
  try {
    if (useAuthenticationStore().userRole !== "admin") {
      const context = await loadPersonalPlants();
      const personalNodes = await iotApi.getNodesByProfile(context.profile.id);
      if (personalNodes.some((node) => node.profileId !== context.profile.id))
        throw new Error("Unexpected node owner");
      nodes.value = personalNodes;
      profiles.value = [context.profile];
      users.value = [context.user];
      return;
    }
    // Load users and profiles
    const [usersRes, profilesRes] = await Promise.all([
      http.get("/users"),
      http.get("/profiles"),
    ]);
    users.value = Array.isArray(usersRes.data)
      ? usersRes.data
      : [usersRes.data];
    profiles.value = Array.isArray(profilesRes.data)
      ? profilesRes.data
      : [profilesRes.data];

    // Get all nodes via profiles
    const allNodes: IoTNode[] = [];
    for (const profile of profiles.value) {
      try {
        const profileNodes = await iotApi.getNodesByProfile(profile.id);
        allNodes.push(...profileNodes);
      } catch {
        warning.value =
          "Algunos dispositivos no pudieron consultarse. La lista puede estar incompleta.";
      }
    }
    nodes.value = allNodes;
  } catch (e: any) {
    error.value = e?.response?.data?.message || "Error cargando datos.";
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

function formatDate(dateStr: string): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("es-PE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function exportNodesCSV() {
  if (nodes.value.length === 0) return;
  const exportData = nodes.value.map((n) => ({
    nodeCode: n.nodeCode,
    status: n.status,
    plantId: n.plantId || "",
    usuario: getUserEmail(n.profileId),
    createdAt: n.createdAt,
  }));
  downloadCSV(exportData, "nodos_iot.csv");
}
</script>

<template>
  <div class="iot-page">
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-header__title">Nodos IoT</h1>
        <p class="ps-page-header__subtitle">
          {{
            useAuthenticationStore().userRole === "admin"
              ? "Administración de nodos, sensores y actuadores"
              : "Sensores y dispositivos de tus plantas"
          }}
        </p>
      </div>
      <button class="ps-btn ps-btn--primary" @click="openCreate()">
        <i class="pi pi-plus" aria-hidden="true"></i> Vincular nuevo dispositivo
      </button>
      <button
        class="ps-btn ps-btn--outline"
        @click="exportNodesCSV"
        :disabled="loading || !!error || !!warning || nodes.length === 0"
      >
        <i class="pi pi-download"></i>
        <span>Descargar CSV</span>
      </button>
    </div>

    <!-- Messages -->
    <div
      v-if="error"
      class="ps-alert ps-alert--error"
      style="margin-bottom: 1rem"
    >
      {{ error }}
      <button
        class="ps-btn ps-btn--outline"
        style="margin-left: 0.5rem"
        :disabled="loading"
        @click="loadData"
      >
        Reintentar
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="ps-loading">
      <i class="pi pi-spinner pi-spin"></i>
    </div>

    <template v-else-if="!error">
      <p v-if="warning" role="status" class="workspace-notice">
        {{ warning }}
        <button class="ps-btn ps-btn--outline" @click="loadData">
          Reintentar
        </button>
      </p>
      <!-- Nodes Table -->
      <section class="iot-section">
        <h2 class="section-title">Todos los Nodos ({{ nodes.length }})</h2>
        <div class="ps-card table-container">
          <table v-if="nodes.length" class="admin-table">
            <thead>
              <tr>
                <th>Node Code</th>
                <th>Registro</th>
                <th>Plant ID</th>
                <th>Usuario</th>
                <th>Creado</th>
                <th>Vinculación</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="node in nodes" :key="node.id">
                <td>
                  <strong>{{ node.nodeCode }}</strong>
                </td>
                <td>
                  <span
                    class="ps-badge"
                    :class="
                      node.status === 'ONLINE'
                        ? 'ps-badge--low'
                        : node.status === 'ERROR'
                          ? 'ps-badge--high'
                          : 'ps-badge--medium'
                    "
                  >
                    {{ node.status === "ONLINE" ? "Registrado" : node.status }}
                  </span>
                </td>
                <td>{{ node.plantId || "--" }}</td>
                <td>{{ getUserEmail(node.profileId) }}</td>
                <td>{{ formatDate(node.createdAt) }}</td>
                <td>
                  <button
                    v-if="!node.plantId"
                    class="ps-btn ps-btn--outline"
                    @click="openCreate(node.nodeCode)"
                  >
                    Vincular a una planta</button
                  ><span v-else>Planta vinculada</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="nodes.length === 0" class="ps-empty onboarding-card">
            <i class="pi pi-microchip"></i>
            <h2>Escucha lo que tu planta necesita</h2>
            <p>
              Vincula un dispositivo para conocer su humedad, luz y temperatura.
              También puedes usar un simulador.
            </p>
            <button class="ps-btn ps-btn--primary" @click="openCreate()">
              Vincular nuevo dispositivo
            </button>
          </div>
        </div>
      </section>
    </template>
    <CreateResourceDialog
      v-model:visible="creating"
      kind="device"
      :existing-node-code="selectedNode"
      @created="loadData"
    />
  </div>
</template>

<style scoped>
.iot-section {
  margin-bottom: 2rem;
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
  letter-spacing: 0.03em;
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
