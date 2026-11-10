<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useAuthenticationStore } from "@/iam/services/authentication.store";
import {
  ProfileApiService,
  ProfileNotFoundError,
} from "@/profile-management/services/profile-api.service";
import type {
  Profile,
  UpdateProfileRequest,
} from "@/profile-management/model/profile.entity";

const authStore = useAuthenticationStore();
const profileApi = new ProfileApiService();

const profile = ref<Profile | null>(null);
const loading = ref(true);
const error = ref("");
const saving = ref(false);
const success = ref("");
const editMode = ref(false);
const profileNotFound = ref(false);

// Edit form
const editName = ref("");
const editPlan = ref<"BASIC" | "PRO">("BASIC");

// Create profile form
const createName = ref("");
const creatingProfile = ref(false);

onMounted(async () => {
  await loadProfile();
});

async function loadProfile() {
  loading.value = true;
  error.value = "";
  profileNotFound.value = false;
  try {
    if (authStore.userId) {
      profile.value = await profileApi.getByUserId(authStore.userId);
      editName.value = profile.value.personName;
      editPlan.value = profile.value.subscriptionPlan;
    }
  } catch (cause) {
    profileNotFound.value = cause instanceof ProfileNotFoundError;
    if (!profileNotFound.value)
      error.value =
        "No pudimos consultar tu perfil. Inténtalo de nuevo; no crees otro perfil por este error.";
  } finally {
    loading.value = false;
  }
}

function getInitial(): string {
  if (profile.value?.personName)
    return profile.value.personName.charAt(0).toUpperCase();
  if (authStore.email) return authStore.email.charAt(0).toUpperCase();
  return "U";
}

function openEdit() {
  if (profile.value) {
    editName.value = profile.value.personName;
    editPlan.value = profile.value.subscriptionPlan;
  }
  editMode.value = true;
}

async function saveProfile() {
  if (saving.value || !profile.value || !editName.value.trim()) return;
  saving.value = true;
  error.value = "";
  success.value = "";
  try {
    const request: UpdateProfileRequest = {
      personName: editName.value.trim(),
      subscriptionPlan: editPlan.value,
    };
    profile.value = await profileApi.update(profile.value.id, request);
    success.value = "Perfil actualizado correctamente.";
    editMode.value = false;
  } catch {
    error.value = "Error guardando perfil.";
  } finally {
    saving.value = false;
  }
}

async function createProfile() {
  if (creatingProfile.value || !authStore.userId || !createName.value.trim())
    return;
  creatingProfile.value = true;
  error.value = "";
  success.value = "";
  try {
    const request = {
      personName: createName.value.trim(),
      subscriptionPlan: "BASIC",
      userId: authStore.userId,
    };
    profile.value = await profileApi.create(request);
    profileNotFound.value = false;
    editName.value = profile.value.personName;
    editPlan.value = profile.value.subscriptionPlan;
    success.value = "Perfil creado correctamente.";
  } catch {
    error.value = "Error creando perfil.";
  } finally {
    creatingProfile.value = false;
  }
}

async function selectPlan(plan: "BASIC" | "PRO") {
  if (saving.value || !profile.value || profile.value.subscriptionPlan === plan)
    return;
  saving.value = true;
  error.value = "";
  success.value = "";
  try {
    const request: UpdateProfileRequest = {
      subscriptionPlan: plan,
    };
    profile.value = await profileApi.update(profile.value.id, request);
    editPlan.value = plan;
    success.value = `Cambiado al plan ${plan}.`;
  } catch {
    error.value = "Error actualizando suscripción.";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="profile-page">
    <!-- Page header -->
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-header__title">Perfil</h1>
        <p class="ps-page-header__subtitle">
          Administra tu cuenta y suscripción
        </p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="ps-loading">
      <i class="pi pi-spinner pi-spin"></i>
    </div>

    <div
      v-else-if="error && !profile && !profileNotFound"
      class="ps-alert ps-alert--error"
      role="alert"
    >
      <p>{{ error }}</p>
      <button class="ps-btn ps-btn--outline" @click="loadProfile">
        Reintentar
      </button>
    </div>
    <!-- Profile not found fallback -->
    <template v-else-if="profileNotFound">
      <div
        v-if="success"
        class="ps-alert ps-alert--success"
        style="margin-bottom: 1.5rem"
      >
        {{ success }}
      </div>
      <div
        v-if="error"
        class="ps-alert ps-alert--error"
        style="margin-bottom: 1.5rem"
      >
        {{ error }}
      </div>

      <div
        class="ps-card"
        style="
          padding: 2rem;
          text-align: center;
          max-width: 480px;
          margin: 0 auto;
        "
      >
        <div class="ps-profile-avatar">{{ getInitial() }}</div>
        <p style="color: var(--ps-text-secondary); margin-bottom: 0.5rem">
          {{ authStore.email }}
        </p>
        <p
          style="
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--ps-text);
            margin-bottom: 1.5rem;
          "
        >
          Perfil no configurado
        </p>
        <p
          style="
            color: var(--ps-text-secondary);
            font-size: 0.9rem;
            margin-bottom: 1.5rem;
          "
        >
          No se encontró un perfil asociado a tu cuenta. Crea uno para
          continuar.
        </p>
        <div class="ps-input-group" style="text-align: left">
          <label for="createName">Nombre</label>
          <input
            id="createName"
            v-model="createName"
            type="text"
            placeholder="Tu nombre completo"
          />
        </div>
        <button
          class="ps-btn ps-btn--primary"
          @click="createProfile"
          :disabled="creatingProfile || !createName.trim()"
        >
          <i v-if="creatingProfile" class="pi pi-spinner pi-spin"></i>
          <span>{{ creatingProfile ? "Creando..." : "Crear Perfil" }}</span>
        </button>
      </div>
    </template>

    <template v-else-if="profile">
      <!-- Notifications -->
      <div
        v-if="success"
        class="ps-alert ps-alert--success"
        style="margin-bottom: 1.5rem"
      >
        {{ success }}
      </div>
      <div
        v-if="error"
        class="ps-alert ps-alert--error"
        style="margin-bottom: 1.5rem"
      >
        {{ error }}
      </div>

      <div class="profile-grid">
        <!-- Profile Card -->
        <div class="ps-card ps-profile-card">
          <div class="ps-profile-avatar">{{ getInitial() }}</div>

          <template v-if="!editMode">
            <h2 class="profile-name">{{ profile.personName }}</h2>
            <p class="profile-email">{{ authStore.email }}</p>
            <span class="ps-header__badge" style="margin-bottom: 1.5rem">{{
              profile.subscriptionPlan
            }}</span>
            <button class="ps-btn ps-btn--primary" @click="openEdit">
              <i class="pi pi-pencil"></i>
              <span>Editar Perfil</span>
            </button>
          </template>

          <template v-else>
            <div class="profile-edit-form">
              <div class="ps-input-group">
                <label for="editName">Nombre</label>
                <input
                  id="editName"
                  v-model="editName"
                  type="text"
                  placeholder="Tu nombre"
                />
              </div>
              <div class="profile-edit-actions">
                <button
                  class="ps-btn ps-btn--outline"
                  @click="editMode = false"
                  :disabled="saving"
                >
                  Cancelar
                </button>
                <button
                  class="ps-btn ps-btn--primary"
                  @click="saveProfile"
                  :disabled="saving || !editName.trim()"
                >
                  <i v-if="saving" class="pi pi-spinner pi-spin"></i>
                  <span>{{ saving ? "Guardando..." : "Guardar Cambios" }}</span>
                </button>
              </div>
            </div>
          </template>
        </div>

        <!-- Subscription Section -->
        <div class="subscription-section">
          <h3 class="subscription-title">Plan de Suscripción</h3>
          <div class="subscription-cards">
            <div
              class="ps-plan-card"
              :class="{
                'ps-plan-card--active': profile.subscriptionPlan === 'BASIC',
              }"
            >
              <h4 class="plan-name">Plan Básico</h4>
              <p class="plan-price">Gratis</p>
              <ul class="plan-features">
                <li>Hasta 5 plantas</li>
                <li>Gestión básica de tareas</li>
                <li>Soporte comunitario</li>
              </ul>
              <button
                class="ps-btn"
                :class="
                  profile.subscriptionPlan === 'BASIC'
                    ? 'ps-btn--primary'
                    : 'ps-btn--outline'
                "
                @click="selectPlan('BASIC')"
                :disabled="profile.subscriptionPlan === 'BASIC' || saving"
              >
                {{
                  profile.subscriptionPlan === "BASIC"
                    ? "Plan Actual"
                    : "Cambiar a Básico"
                }}
              </button>
            </div>

            <div
              class="ps-plan-card"
              :class="{
                'ps-plan-card--active': profile.subscriptionPlan === 'PRO',
              }"
            >
              <h4 class="plan-name">Plan Premium</h4>
              <p class="plan-price">$9.99/mes</p>
              <ul class="plan-features">
                <li>Plantas ilimitadas</li>
                <li>Chatbot IA asistente</li>
                <li>Integración sensores IoT</li>
                <li>Analíticas avanzadas</li>
                <li>Soporte prioritario</li>
              </ul>
              <button
                class="ps-btn"
                :class="
                  profile.subscriptionPlan === 'PRO'
                    ? 'ps-btn--primary'
                    : 'ps-btn--outline'
                "
                @click="selectPlan('PRO')"
                :disabled="profile.subscriptionPlan === 'PRO' || saving"
              >
                {{
                  profile.subscriptionPlan === "PRO"
                    ? "Plan Actual"
                    : "Cambiar a Premium"
                }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.profile-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 2rem;
  align-items: start;
}

@media (max-width: 900px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
}

.profile-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--ps-text);
  margin: 0 0 0.25rem;
}

.profile-email {
  font-size: 0.9rem;
  color: var(--ps-text-secondary);
  margin: 0 0 0.75rem;
}

.profile-edit-form {
  width: 100%;
  text-align: left;
  margin-top: 1rem;
}

.profile-edit-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  justify-content: center;
}

.subscription-section {
  padding: 0;
}

.subscription-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--ps-text);
  margin: 0 0 1.25rem;
}

.subscription-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.25rem;
}

.plan-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--ps-text);
  margin: 0 0 0.5rem;
}

.plan-price {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ps-primary);
  margin: 0 0 1rem;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem;
  font-size: 0.85rem;
  color: var(--ps-text-secondary);
}

.plan-features li {
  padding: 0.35rem 0;
  padding-left: 1.25rem;
  position: relative;
}

.plan-features li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.65rem;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ps-primary);
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
</style>
