<script setup lang="ts">
import { ref, reactive, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { AuthenticationApiService } from "@/iam/services/authentication-api.service";
import type { SignUpRequest } from "@/iam/model/sign-up.request";

const router = useRouter();
const authService = new AuthenticationApiService();

const form = reactive<SignUpRequest>({
  name: "",
  email: "",
  password: "",
  subscriptionPlan: "BASIC",
});

const fieldErrors = reactive<Record<string, string>>({});
const generalError = ref<string | null>(null);
const loading = ref(false);
const success = ref(false);
let redirectTimer: ReturnType<typeof setTimeout> | undefined;
onBeforeUnmount(() => clearTimeout(redirectTimer));

function clearErrors() {
  Object.keys(fieldErrors).forEach((key) => delete fieldErrors[key]);
  generalError.value = null;
}

function validate(): boolean {
  clearErrors();
  let isValid = true;

  if (!form.name.trim()) {
    fieldErrors["name"] = "Ingresa tu nombre";
    isValid = false;
  }

  if (!form.email.trim()) {
    fieldErrors["email"] = "Ingresa tu correo";
    isValid = false;
  } else if (!form.email.includes("@") || !form.email.includes(".")) {
    fieldErrors["email"] = "Ingresa un correo válido";
    isValid = false;
  }

  if (!form.password.trim()) {
    fieldErrors["password"] = "Ingresa una contraseña";
    isValid = false;
  } else if (form.password.length < 8) {
    fieldErrors["password"] = "La contraseña debe tener al menos 8 caracteres";
    isValid = false;
  }

  return isValid;
}

async function handleSubmit() {
  if (loading.value || success.value || !validate()) return;

  loading.value = true;
  clearErrors();

  try {
    await authService.signUp({
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
    });
    success.value = true;
    redirectTimer = setTimeout(() => router.push({ name: "sign-in" }), 2000);
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      if (status === 400) {
        const data = error.response.data;
        if (data && typeof data === "object") {
          for (const [key, value] of Object.entries(data)) {
            if (
              ["name", "email", "password", "subscriptionPlan"].includes(key) &&
              typeof value === "string"
            ) {
              fieldErrors[key] = value;
            }
          }
          if (Object.keys(fieldErrors).length === 0) {
            generalError.value = data.message || "Revisa los datos ingresados.";
          }
        } else {
          generalError.value = "Revisa los datos ingresados.";
        }
      } else {
        generalError.value = "No pudimos crear la cuenta. Inténtalo de nuevo.";
      }
    } else {
      generalError.value = "No pudimos conectar. Revisa tu conexión.";
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="ps-auth-page">
    <div class="ps-auth-card">
      <div class="ps-auth-card__logo">
        <img
          class="ps-brand-image"
          src="/logo.png"
          alt=""
          width="48"
          height="48"
        />
        <span>PlantSync</span>
      </div>

      <h1>Crea tu cuenta</h1>
      <p class="ps-auth-card__subtitle">Tu próximo cuidado empieza aquí.</p>

      <!-- Success message -->
      <div v-if="success" class="ps-success-box">
        <i class="pi pi-check-circle"></i>
        <p class="ps-success-box__title">Tu cuenta se creó correctamente.</p>
        <p class="ps-success-box__text">En un momento podrás iniciar sesión.</p>
      </div>

      <form v-else @submit.prevent="handleSubmit" novalidate>
        <div v-if="generalError" class="ps-alert ps-alert--error" role="alert">
          {{ generalError }}
        </div>

        <div class="ps-input-group">
          <label for="name">Nombre</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            placeholder="Tu nombre"
            :class="{ 'ps-input--error': fieldErrors['name'] }"
            :disabled="loading"
          />
          <p v-if="fieldErrors['name']" class="ps-input-error">
            {{ fieldErrors["name"] }}
          </p>
        </div>

        <div class="ps-input-group">
          <label for="email">Correo electrónico</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="tu@correo.com"
            :class="{ 'ps-input--error': fieldErrors['email'] }"
            :disabled="loading"
            autocomplete="email"
          />
          <p v-if="fieldErrors['email']" class="ps-input-error">
            {{ fieldErrors["email"] }}
          </p>
        </div>

        <div class="ps-input-group">
          <label for="password">Contraseña</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            :class="{ 'ps-input--error': fieldErrors['password'] }"
            :disabled="loading"
            autocomplete="new-password"
          />
          <p v-if="fieldErrors['password']" class="ps-input-error">
            {{ fieldErrors["password"] }}
          </p>
        </div>

        <div class="ps-input-group">
          <label>Plan de suscripción</label>
          <div class="ps-plan-select">
            <label
              class="ps-plan-option"
              :class="{
                'ps-plan-option--active': form.subscriptionPlan === 'BASIC',
              }"
            >
              <input
                type="radio"
                v-model="form.subscriptionPlan"
                value="BASIC"
                :disabled="loading"
              />
              <span>Básico</span>
            </label>
            <label
              class="ps-plan-option"
              :class="{
                'ps-plan-option--active': form.subscriptionPlan === 'PRO',
              }"
            >
              <input
                type="radio"
                v-model="form.subscriptionPlan"
                value="PRO"
                :disabled="loading"
              />
              <span>Pro</span>
            </label>
          </div>
        </div>

        <button type="submit" class="ps-btn-submit" :disabled="loading">
          <span v-if="loading">
            <i class="pi pi-spinner pi-spin"></i> Creando cuenta...
          </span>
          <span v-else>Crear cuenta</span>
        </button>

        <p class="ps-auth-card__footer">
          ¿Ya tienes cuenta?
          <router-link to="/sign-in">Iniciar sesión</router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.ps-alert {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  margin-bottom: 1.25rem;
}

.ps-alert--error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.ps-success-box {
  text-align: center;
  padding: 2rem 1rem;
}

.ps-success-box i {
  font-size: 2.5rem;
  color: var(--ps-primary);
  margin-bottom: 0.75rem;
}

.ps-success-box__title {
  font-weight: 600;
  color: var(--ps-text);
  margin: 0 0 0.25rem;
}

.ps-success-box__text {
  font-size: 0.85rem;
  color: var(--ps-text-secondary);
  margin: 0;
}

.ps-plan-select {
  display: flex;
  gap: 0.75rem;
}

.ps-plan-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--ps-border);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.ps-plan-option--active {
  border-color: var(--ps-primary);
  background: rgba(107, 124, 62, 0.05);
}

.ps-plan-option input[type="radio"] {
  width: auto;
  accent-color: var(--ps-primary);
}

.ps-auth-card__footer {
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.85rem;
  color: var(--ps-text-secondary);
}

.ps-auth-card__footer a {
  color: var(--ps-primary);
  font-weight: 600;
}
</style>
