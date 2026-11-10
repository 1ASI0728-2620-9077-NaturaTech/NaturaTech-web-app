<script setup lang="ts">
import { downloadCSV } from "@/shared/services/csv";
import { ref, onMounted } from "vue";
import http from "@/shared/services/http-common";
import { PlantService } from "@/plant-management/services/plant-api.service";
import { IoTApiService } from "@/iot-management/services/iot-api.service";
import { TaskApiService } from "@/task-management/services/task-api.service";
import type {
  Profile,
  UpdateProfileRequest,
} from "@/profile-management/model/profile.entity";
import type { Plant } from "@/plant-management/model/plant.entity";
import type { IoTNode } from "@/iot-management/model/iot-node.entity";
import type { Task } from "@/task-management/model/task.entity";

interface User {
  id: number;
  email: string;
  roles: string[];
}

interface UserDetail {
  plants: Plant[];
  nodes: IoTNode[];
  tasks: Task[];
  readings: Record<number, any>;
  loading: boolean;
  error?: string;
}

const iotApi = new IoTApiService();
const taskApi = new TaskApiService();

const users = ref<User[]>([]);
const profiles = ref<Profile[]>([]);
const loading = ref(true);
const error = ref("");
const success = ref("");

// User detail
const expandedUserId = ref<number | null>(null);
const userDetails = ref<Record<number, UserDetail>>({});

// Edit user dialog
const showEditUser = ref(false);
const editingUser = ref<User | null>(null);
const editEmail = ref("");
const saving = ref(false);

// Edit profile dialog
const showEditProfile = ref(false);
const editingProfile = ref<Profile | null>(null);
const editPersonName = ref("");
const editSubscriptionPlan = ref<"BASIC" | "PRO">("BASIC");
const savingProfile = ref(false);

onMounted(async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  error.value = "";
  try {
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
  } catch (e: any) {
    error.value = e?.response?.data?.message || "Error cargando usuarios.";
  } finally {
    loading.value = false;
  }
}

function getProfileForUser(userId: number): Profile | undefined {
  return profiles.value.find((p) => p.userId === userId);
}

async function toggleUserDetail(user: User) {
  if (expandedUserId.value === user.id) {
    expandedUserId.value = null;
    return;
  }
  expandedUserId.value = user.id;

  // If already loaded, don't reload
  if (
    userDetails.value[user.id] &&
    !userDetails.value[user.id].loading &&
    !userDetails.value[user.id].error
  )
    return;

  const profile = getProfileForUser(user.id);
  if (!profile) {
    userDetails.value[user.id] = {
      plants: [],
      nodes: [],
      tasks: [],
      readings: {},
      loading: false,
    };
    return;
  }

  userDetails.value[user.id] = {
    plants: [],
    nodes: [],
    tasks: [],
    readings: {},
    loading: true,
  };

  try {
    const [plants, nodes, allTasks] = await Promise.all([
      PlantService.getByProfile(profile.id),
      iotApi.getNodesByProfile(profile.id),
      taskApi.getAll(),
    ]);
    const tasks = allTasks.filter((task) => task.profileId === profile.id);
    const readings: Record<number, any> = {};
    for (const plant of plants) {
      const reading = await iotApi.getLatestReading(plant.id);
      if (reading) readings[plant.id] = reading;
    }
    userDetails.value[user.id] = {
      plants,
      nodes,
      tasks,
      readings,
      loading: false,
    };
  } catch {
    userDetails.value[user.id] = {
      plants: [],
      nodes: [],
      tasks: [],
      readings: {},
      loading: false,
      error:
        "No pudimos cargar el detalle completo. Cierra y vuelve a abrir Detalle para reintentar.",
    };
  }
}

function exportUserDataCSV(user: User) {
  const detail = userDetails.value[user.id];
  if (!detail || detail.loading || detail.error) return;

  const rows: any[] = [];

  // Plants
  for (const plant of detail.plants) {
    rows.push({
      tipo: "Planta",
      id: plant.id,
      nombre: plant.name,
      especie: plant.species,
      estado: "",
      fecha: "",
    });
  }

  // Tasks
  for (const task of detail.tasks) {
    rows.push({
      tipo: "Tarea",
      id: task.id,
      nombre: task.action,
      especie: "",
      estado: task.status,
      fecha: task.scheduledDate,
    });
  }

  if (rows.length > 0) {
    downloadCSV(rows, `usuario_${user.id}_datos.csv`);
  }
}

function openEditUser(user: User) {
  editingUser.value = user;
  editEmail.value = user.email;
  showEditUser.value = true;
}
function openEditProfile(userId: number) {
  const profile = getProfileForUser(userId);
  if (!profile) return;
  editingProfile.value = profile;
  editPersonName.value = profile.personName;
  editSubscriptionPlan.value = profile.subscriptionPlan;
  showEditProfile.value = true;
}
async function saveUser() {
  if (
    saving.value ||
    !editingUser.value ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail.value.trim())
  )
    return;
  saving.value = true;
  error.value = "";
  success.value = "";
  try {
    await http.put(`/users/${editingUser.value.id}`, {
      email: editEmail.value.trim(),
    });
    editingUser.value.email = editEmail.value.trim();
    success.value = "Usuario actualizado correctamente.";
    showEditUser.value = false;
  } catch (e: any) {
    error.value = e?.response?.data?.message || "Error actualizando usuario.";
  } finally {
    saving.value = false;
  }
}

async function saveProfile() {
  if (
    savingProfile.value ||
    !editingProfile.value ||
    !editPersonName.value.trim()
  )
    return;
  savingProfile.value = true;
  error.value = "";
  success.value = "";
  try {
    const request: UpdateProfileRequest = {
      personName: editPersonName.value.trim(),
      subscriptionPlan: editSubscriptionPlan.value,
    };
    await http.put(`/profiles/${editingProfile.value.id}`, request);
    editingProfile.value.personName = editPersonName.value.trim();
    editingProfile.value.subscriptionPlan = editSubscriptionPlan.value;
    success.value = "Perfil actualizado correctamente.";
    showEditProfile.value = false;
  } catch (e: any) {
    error.value = e?.response?.data?.message || "Error actualizando perfil.";
  } finally {
    savingProfile.value = false;
  }
}
</script>

<template>
  <div class="users-page">
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-header__title">Usuarios</h1>
        <p class="ps-page-header__subtitle">
          Gestión de usuarios y perfiles del sistema
        </p>
      </div>
    </div>

    <!-- Messages -->
    <div
      v-if="success"
      class="ps-alert ps-alert--success"
      style="margin-bottom: 1rem"
    >
      {{ success }}
      <button
        class="ps-btn ps-btn--outline"
        style="margin-left: 0.5rem"
        @click="success = ''"
      >
        OK
      </button>
    </div>
    <div
      v-if="error"
      class="ps-alert ps-alert--error"
      style="margin-bottom: 1rem"
    >
      {{ error }}
      <button
        class="ps-btn ps-btn--outline"
        style="margin-left: 0.5rem"
        @click="error = ''"
      >
        OK
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="ps-loading">
      <i class="pi pi-spinner pi-spin"></i>
    </div>

    <template v-else-if="!error || users.length > 0">
      <!-- Unified Users + Profiles Table -->
      <section class="users-section">
        <h2 class="section-title">Usuarios del Sistema ({{ users.length }})</h2>
        <div class="ps-card table-container">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Nombre</th>
                <th>Plan</th>
                <th>Roles</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="user in users" :key="user.id">
                <tr class="user-row" @click="toggleUserDetail(user)">
                  <td>{{ user.id }}</td>
                  <td>{{ user.email }}</td>
                  <td>{{ getProfileForUser(user.id)?.personName || "--" }}</td>
                  <td>
                    <span
                      v-if="getProfileForUser(user.id)"
                      class="ps-badge"
                      :class="
                        getProfileForUser(user.id)?.subscriptionPlan === 'PRO'
                          ? 'ps-badge--low'
                          : 'ps-badge--medium'
                      "
                    >
                      {{ getProfileForUser(user.id)?.subscriptionPlan }}
                    </span>
                    <span v-else class="ps-badge ps-badge--high"
                      >Sin perfil</span
                    >
                  </td>
                  <td>
                    <span
                      v-for="role in user.roles || []"
                      :key="role"
                      class="ps-badge ps-badge--low"
                      style="margin-right: 0.25rem"
                    >
                      {{ role }}
                    </span>
                  </td>
                  <td>
                    <button
                      class="ps-btn ps-btn--outline ps-btn--sm"
                      @click.stop="toggleUserDetail(user)"
                    >
                      <i
                        class="pi"
                        :class="
                          expandedUserId === user.id
                            ? 'pi-chevron-up'
                            : 'pi-chevron-down'
                        "
                      ></i>
                      Detalle
                    </button>
                    <button
                      class="ps-btn ps-btn--outline"
                      @click.stop="openEditUser(user)"
                    >
                      Editar correo
                    </button>
                    <button
                      v-if="getProfileForUser(user.id)"
                      class="ps-btn ps-btn--outline"
                      @click.stop="openEditProfile(user.id)"
                    >
                      Editar perfil
                    </button>
                  </td>
                </tr>
                <!-- Expanded detail row -->
                <tr v-if="expandedUserId === user.id" class="detail-row">
                  <td colspan="6">
                    <div class="user-detail">
                      <div
                        v-if="userDetails[user.id]?.loading"
                        class="detail-loading"
                      >
                        <i class="pi pi-spinner pi-spin"></i> Cargando datos del
                        usuario...
                      </div>

                      <div
                        v-else-if="userDetails[user.id]?.error"
                        class="ps-alert ps-alert--error"
                        role="alert"
                      >
                        {{ userDetails[user.id].error }}
                      </div>
                      <template v-else-if="userDetails[user.id]">
                        <div class="detail-grid">
                          <div class="detail-section">
                            <h4>
                              Plantas ({{ userDetails[user.id].plants.length }})
                            </h4>
                            <div
                              v-if="userDetails[user.id].plants.length === 0"
                              class="detail-empty"
                            >
                              Sin plantas
                            </div>
                            <ul v-else class="detail-list">
                              <li
                                v-for="plant in userDetails[user.id].plants"
                                :key="plant.id"
                              >
                                <strong>{{ plant.name }}</strong> —
                                {{ plant.species }}
                                <span
                                  v-if="userDetails[user.id].readings[plant.id]"
                                  class="detail-reading"
                                >
                                  ({{
                                    userDetails[user.id].readings[
                                      plant.id
                                    ].airTemperature?.toFixed(1) ?? "--"
                                  }}°C,
                                  {{
                                    userDetails[user.id].readings[plant.id]
                                      .humidityPercent ?? "--"
                                  }}% hum)
                                </span>
                              </li>
                            </ul>
                          </div>

                          <div class="detail-section">
                            <h4>
                              Nodos IoT ({{
                                userDetails[user.id].nodes.length
                              }})
                            </h4>
                            <div
                              v-if="userDetails[user.id].nodes.length === 0"
                              class="detail-empty"
                            >
                              Sin nodos
                            </div>
                            <ul v-else class="detail-list">
                              <li
                                v-for="node in userDetails[user.id].nodes"
                                :key="node.id"
                              >
                                <strong>{{ node.nodeCode }}</strong> —
                                <span
                                  class="ps-badge"
                                  :class="
                                    node.status === 'ONLINE'
                                      ? 'ps-badge--low'
                                      : 'ps-badge--medium'
                                  "
                                  >{{ node.status }}</span
                                >
                              </li>
                            </ul>
                          </div>

                          <div class="detail-section">
                            <h4>
                              Tareas ({{ userDetails[user.id].tasks.length }})
                            </h4>
                            <div
                              v-if="userDetails[user.id].tasks.length === 0"
                              class="detail-empty"
                            >
                              Sin tareas
                            </div>
                            <ul v-else class="detail-list">
                              <li
                                v-for="task in userDetails[user.id].tasks"
                                :key="task.id"
                              >
                                <strong>{{ task.action }}</strong> —
                                <span
                                  class="ps-badge"
                                  :class="
                                    task.status === 'COMPLETED'
                                      ? 'ps-badge--low'
                                      : 'ps-badge--medium'
                                  "
                                  >{{ task.status }}</span
                                >
                                · {{ task.scheduledDate }}
                              </li>
                            </ul>
                          </div>
                        </div>

                        <div class="detail-export">
                          <button
                            class="ps-btn ps-btn--outline ps-btn--sm"
                            @click.stop="exportUserDataCSV(user)"
                            :disabled="
                              userDetails[user.id].plants.length === 0 &&
                              userDetails[user.id].tasks.length === 0
                            "
                          >
                            <i class="pi pi-download"></i> Descargar datos CSV
                          </button>
                        </div>
                      </template>

                      <div v-else class="detail-empty">
                        No se encontró perfil para este usuario.
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
          <div v-if="users.length === 0" class="ps-empty">
            <p>No se encontraron usuarios.</p>
          </div>
        </div>
      </section>
    </template>

    <!-- Edit User Dialog -->
    <pv-dialog
      v-model:visible="showEditUser"
      header="Editar Usuario"
      :modal="true"
      :closable="true"
      :style="{ width: '90%', maxWidth: '420px' }"
    >
      <div class="ps-dialog-body">
        <div class="ps-input-group">
          <label for="editEmail">Email</label>
          <input
            id="editEmail"
            v-model="editEmail"
            type="email"
            placeholder="usuario@ejemplo.com"
          />
        </div>
      </div>
      <template #footer>
        <div class="ps-dialog-footer">
          <button
            class="ps-btn ps-btn--outline"
            @click="showEditUser = false"
            :disabled="saving"
          >
            Cancelar
          </button>
          <button
            class="ps-btn ps-btn--primary"
            @click="saveUser"
            :disabled="saving"
          >
            <i v-if="saving" class="pi pi-spinner pi-spin"></i>
            <span>{{ saving ? "Guardando..." : "Guardar" }}</span>
          </button>
        </div>
      </template>
    </pv-dialog>

    <!-- Edit Profile Dialog -->
    <pv-dialog
      v-model:visible="showEditProfile"
      header="Editar Perfil"
      :modal="true"
      :closable="true"
      :style="{ width: '90%', maxWidth: '420px' }"
    >
      <div class="ps-dialog-body">
        <div class="ps-input-group">
          <label for="editName">Nombre</label>
          <input
            id="editName"
            v-model="editPersonName"
            type="text"
            placeholder="Nombre completo"
          />
        </div>
        <div class="ps-input-group">
          <label for="editPlan">Plan de Suscripción</label>
          <select id="editPlan" v-model="editSubscriptionPlan">
            <option value="BASIC">BASIC</option>
            <option value="PRO">PRO</option>
          </select>
        </div>
      </div>
      <template #footer>
        <div class="ps-dialog-footer">
          <button
            class="ps-btn ps-btn--outline"
            @click="showEditProfile = false"
            :disabled="savingProfile"
          >
            Cancelar
          </button>
          <button
            class="ps-btn ps-btn--primary"
            @click="saveProfile"
            :disabled="savingProfile"
          >
            <i v-if="savingProfile" class="pi pi-spinner pi-spin"></i>
            <span>{{ savingProfile ? "Guardando..." : "Guardar" }}</span>
          </button>
        </div>
      </template>
    </pv-dialog>
  </div>
</template>

<style scoped>
.users-section {
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

.user-row {
  cursor: pointer;
}

.user-row:hover td {
  background: rgba(107, 124, 62, 0.03);
}

.detail-row td {
  padding: 0;
  background: rgba(107, 124, 62, 0.02);
}

.user-detail {
  padding: 1.25rem 1.5rem;
}

.detail-loading {
  color: var(--ps-text-secondary);
  font-size: 0.875rem;
  padding: 1rem 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.detail-section h4 {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ps-text);
  margin: 0 0 0.5rem;
}

.detail-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.825rem;
  color: var(--ps-text-secondary);
}

.detail-list li {
  padding: 0.3rem 0;
  border-bottom: 1px solid var(--ps-border);
}

.detail-list li:last-child {
  border-bottom: none;
}

.detail-reading {
  font-size: 0.75rem;
  color: var(--ps-primary);
}

.detail-empty {
  font-size: 0.825rem;
  color: var(--ps-text-secondary);
  font-style: italic;
}

.detail-export {
  padding-top: 0.75rem;
  border-top: 1px solid var(--ps-border);
}

.ps-btn--sm {
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
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

.ps-alert--success {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.ps-dialog-body {
  padding: 0.5rem 0;
}

.ps-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
</style>
