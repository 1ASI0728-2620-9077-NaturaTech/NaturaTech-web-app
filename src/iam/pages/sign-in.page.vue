<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { isAxiosError } from "axios";
import { useAuthenticationStore } from "@/iam/services/authentication.store";
import { AuthenticationApiService } from "@/iam/services/authentication-api.service";
import type { SignInRequest } from "@/iam/model/sign-in.request";

const router = useRouter();
const route = useRoute();
const authStore = useAuthenticationStore();
const authApi = new AuthenticationApiService();

const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMessage = ref(
  route.query.reason === "session"
    ? "No pudimos validar tu sesión. Ingresa de nuevo para continuar."
    : "",
);
const showPassword = ref(false);
const validEmail = computed(() =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()),
);
const emailTouched = ref(false);
const passwordTouched = ref(false);

const emailInvalid = computed(() => emailTouched.value && !validEmail.value);
const passwordInvalid = computed(
  () => passwordTouched.value && password.value.trim() === "",
);
const formValid = computed(() => validEmail.value && password.value.length > 0);

function markEmailTouched() {
  emailTouched.value = true;
}

function markPasswordTouched() {
  passwordTouched.value = true;
}

async function onSubmit() {
  if (loading.value) return;
  emailTouched.value = true;
  passwordTouched.value = true;

  if (!formValid.value) return;

  loading.value = true;
  errorMessage.value = "";

  const request: SignInRequest = {
    email: email.value.trim(),
    password: password.value,
  };

  try {
    const response = await authApi.signIn(request);
    if (
      !Number.isSafeInteger(response.data.id) ||
      response.data.id <= 0 ||
      !response.data.token?.trim()
    )
      throw new Error("Invalid sign-in response");
    const roles =
      response.data.roles ??
      (await authApi.getRoles(response.data.id, response.data.token));
    if (
      !Array.isArray(roles) ||
      !roles.every((role) => typeof role === "string")
    )
      throw new Error("Invalid roles");
    const role = roles.includes("ROLE_ADMIN")
      ? "admin"
      : roles.includes("ROLE_USER")
        ? "user"
        : "";
    if (!role) {
      authStore.clearSession();
      errorMessage.value =
        "Tu cuenta no tiene un rol habilitado. Contacta con administración.";
      return;
    }
    authStore.signIn(response.data, role);
    password.value = "";
    const redirect =
      typeof route.query.redirect === "string" ? route.query.redirect : "";
    const destination =
      redirect.startsWith("/") && !redirect.startsWith("//")
        ? router.resolve(redirect)
        : null;
    await router.replace(
      destination?.meta.requiresAuth &&
        (destination.meta.minimumRole !== "admin" || role === "admin")
        ? redirect
        : role === "admin"
          ? "/dashboard"
          : "/plants",
    );
  } catch (error: unknown) {
    authStore.clearSession();
    if (
      isAxiosError(error) &&
      (error.response?.status === 401 || error.response?.status === 403)
    ) {
      errorMessage.value =
        "Correo o contraseña incorrectos. Inténtalo de nuevo.";
    } else {
      errorMessage.value =
        "No pudimos completar el acceso o verificar tus permisos. Inténtalo de nuevo.";
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

      <h1>Un espacio para crecer</h1>
      <p class="ps-auth-card__subtitle">
        Ingresa y vuelve a conectar con tu jardín.
      </p>

      <form @submit.prevent="onSubmit" novalidate>
        <div v-if="errorMessage" class="ps-alert ps-alert--error" role="alert">
          {{ errorMessage }}
        </div>

        <div class="ps-input-group">
          <label for="email">Correo electrónico</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="tu@correo.com"
            :class="{ 'ps-input--error': emailInvalid }"
            @blur="markEmailTouched"
            :disabled="loading"
            autocomplete="email"
            :aria-invalid="emailInvalid"
            :aria-describedby="emailInvalid ? 'email-error' : undefined"
          />
          <p v-if="emailInvalid" id="email-error" class="ps-input-error">
            Ingresa un correo electrónico válido.
          </p>
        </div>

        <div class="ps-input-group">
          <label for="password">Contraseña</label>
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Tu contraseña"
            :class="{ 'ps-input--error': passwordInvalid }"
            @blur="markPasswordTouched"
            :disabled="loading"
            autocomplete="current-password"
            :aria-invalid="passwordInvalid"
            :aria-describedby="passwordInvalid ? 'password-error' : undefined"
          />
          <button
            type="button"
            class="text-link password-toggle"
            :aria-pressed="showPassword"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? "Ocultar contraseña" : "Mostrar contraseña" }}
          </button>
          <p v-if="passwordInvalid" id="password-error" class="ps-input-error">
            Ingresa tu contraseña.
          </p>
        </div>

        <button type="submit" class="ps-btn-submit" :disabled="loading">
          <span v-if="loading">
            <i class="pi pi-spinner pi-spin"></i> Ingresando...
          </span>
          <span v-else>Iniciar sesión</span>
        </button>

        <p class="ps-auth-card__footer">
          ¿Aún no tienes cuenta?
          <router-link to="/sign-up">Crear cuenta</router-link>
        </p>
        <p class="ps-auth-card__footer">
          <router-link to="/preview/dashboard"
            >Explorar el nuevo PlantSync sin iniciar sesión
            <i class="pi pi-arrow-right" aria-hidden="true"></i
          ></router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.password-toggle {
  border: 0;
  background: transparent;
  padding: 6px 0;
  margin-top: 5px;
  cursor: pointer;
  font-size: 12px;
}
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
