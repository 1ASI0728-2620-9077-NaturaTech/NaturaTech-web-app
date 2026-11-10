<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onBeforeUnmount,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthenticationStore } from "@/iam/services/authentication.store";
import { useThemeStore } from "@/shared/services/theme.store";
import { ProfileApiService } from "@/profile-management/services/profile-api.service";
const route = useRoute();
const router = useRouter();
const auth = useAuthenticationStore();
const theme = useThemeStore();
const profileName = ref("");
const mobileOpen = ref(false);
const menuButton = ref<HTMLButtonElement>();
const navigation = ref<HTMLElement>();
const demo = computed(() => route.meta.demo === true);
const showShell = computed(
  () =>
    demo.value ||
    (auth.signedIn && !["sign-in", "sign-up"].includes(String(route.name))),
);
const section = computed(() =>
  demo.value ? String(route.params.section || "dashboard") : String(route.name),
);
const items = [
  {
    label: "Vista general",
    icon: "pi pi-th-large",
    section: "dashboard",
    path: "/dashboard",
  },
  {
    label: "Mis plantas",
    icon: "pi pi-leaf",
    section: "plants",
    path: "/plants",
  },
  {
    label: "Cuidados",
    icon: "pi pi-calendar",
    section: "tasks",
    path: "/tasks",
  },
  {
    label: "Dispositivos",
    icon: "pi pi-microchip",
    section: "devices",
    path: "/iot",
  },
  {
    label: "Salud de plantas",
    icon: "pi pi-camera",
    section: "health",
    path: "/health",
    fresh: true,
  },
  {
    label: "Asistente",
    icon: "pi pi-sparkles",
    section: "assistant",
    path: "/assistant",
    fresh: true,
  },
  {
    label: "Mis logros",
    icon: "pi pi-trophy",
    section: "rewards",
    path: "/rewards",
    fresh: true,
  },
];
const homePath = computed(() =>
  auth.userRole === "admin" ? "/dashboard" : "/plants",
);
const visibleItems = computed(() =>
  items.filter(
    (item) =>
      demo.value || auth.userRole === "admin" || item.section !== "dashboard",
  ),
);
function active(key: string) {
  return (
    section.value === key ||
    (key === "plants" && section.value === "plant-detail") ||
    (key === "tasks" && section.value === "tasks-timeline") ||
    (key === "devices" && section.value === "iot-dashboard")
  );
}
const extraTitles: Record<string, string> = {
  users: "Administración",
  profile: "Mi perfil",
  chatbot: "Chat de consultas",
};
const pageTitle = computed(
  () =>
    items.find((item) => active(item.section))?.label ||
    extraTitles[String(route.name)] ||
    "PlantSync",
);
function toggleTheme() {
  theme.applyTheme(
    document.documentElement.dataset.theme === "dark" ? "light" : "dark",
  );
}
async function openMenu() {
  mobileOpen.value = true;
  await nextTick();
  navigation.value?.querySelector<HTMLButtonElement>("button")?.focus();
}
async function closeMenu() {
  mobileOpen.value = false;
  await nextTick();
  menuButton.value?.focus();
}
function trapFocus(event: KeyboardEvent) {
  if (!mobileOpen.value || event.key !== "Tab") return;
  const elements = navigation.value?.querySelectorAll<HTMLElement>("a, button");
  if (!elements?.length) return;
  const first = elements[0];
  const last = elements[elements.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
watch(
  () => route.fullPath,
  async () => {
    const wasOpen = mobileOpen.value;
    mobileOpen.value = false;
    if (wasOpen) {
      await nextTick();
      document.getElementById("main-content")?.focus();
    }
  },
);
let desktopQuery: MediaQueryList | undefined;
function onDesktop(event: MediaQueryListEvent) {
  if (event.matches) mobileOpen.value = false;
}
function expireSession() {
  if (demo.value) return;
  auth.clearSession();
  void router.replace({ name: "sign-in", query: { reason: "session" } });
}
function onSessionStorage(event: StorageEvent) {
  if (event.key === "token" && !demo.value && event.newValue !== event.oldValue)
    window.location.assign("/sign-in");
}
onMounted(() => {
  desktopQuery = window.matchMedia("(min-width: 769px)");
  desktopQuery.addEventListener("change", onDesktop);
  window.addEventListener("plantsync:session-expired", expireSession);
  window.addEventListener("storage", onSessionStorage);
});
onBeforeUnmount(() => {
  desktopQuery?.removeEventListener("change", onDesktop);
  window.removeEventListener("plantsync:session-expired", expireSession);
  window.removeEventListener("storage", onSessionStorage);
});
let profileRequest = 0;
watch(
  [() => auth.userId, () => auth.userRole, demo],
  async ([id, role, isDemo]) => {
    const request = ++profileRequest;
    profileName.value = "";
    if (!id || !role || isDemo) return;
    try {
      const profile = await new ProfileApiService().getByUserId(id);
      if (request === profileRequest) profileName.value = profile.personName;
    } catch {
      /* Email remains a truthful fallback. */
    }
  },
  { immediate: true },
);
</script>
<template>
  <pv-toast /><pv-confirm-dialog />
  <router-view v-if="!showShell" />
  <div v-else class="ps-layout" @keydown.esc="mobileOpen && closeMenu()">
    <a href="#main-content" class="skip-link">Ir al contenido</a>
    <button
      v-if="mobileOpen"
      class="sidebar-backdrop"
      aria-label="Cerrar navegación"
      tabindex="-1"
      @click="closeMenu"
    ></button>
    <aside
      id="main-navigation"
      ref="navigation"
      class="ps-sidebar"
      :class="{ 'is-open': mobileOpen }"
      :role="mobileOpen ? 'dialog' : undefined"
      :aria-modal="mobileOpen ? true : undefined"
      aria-label="Navegación principal"
      @keydown="trapFocus"
    >
      <div class="brand-row">
        <router-link
          :to="demo ? '/preview/dashboard' : homePath"
          class="ps-sidebar__logo"
          ><span class="brand-symbol"
            ><img
              class="ps-brand-image"
              src="/logo.png"
              alt=""
              width="40"
              height="40" /></span
          ><span
            >plant<span class="brand-light">sync</span
            ><small>GROW WITH CARE</small></span
          ></router-link
        ><button
          class="mobile-menu-button close-menu"
          aria-label="Cerrar menú"
          @click="closeMenu"
        >
          <i class="pi pi-times" aria-hidden="true"></i>
        </button>
      </div>
      <p class="nav-caption">TU JARDÍN</p>
      <nav class="ps-sidebar__nav">
        <router-link
          v-for="item in visibleItems"
          :key="item.section"
          :to="demo ? `/preview/${item.section}` : item.path"
          class="ps-sidebar__link"
          :class="{ 'ps-sidebar__link--active': active(item.section) }"
          :aria-current="active(item.section) ? 'page' : undefined"
          ><i :class="item.icon" aria-hidden="true"></i
          ><span>{{ item.label }}</span
          ><span
            v-if="item.fresh"
            class="nav-new"
            aria-label="Nueva función"
          ></span
        ></router-link>
      </nav>
      <div class="sidebar-note">
        <i class="pi pi-sparkles" aria-hidden="true"></i
        ><strong>Un cuidado más consciente.</strong>
        <p>Pequeños hábitos.<br />Un mundo más verde.</p>
      </div>
      <div class="ps-sidebar__bottom">
        <router-link
          v-if="!demo && auth.userRole === 'admin'"
          to="/users"
          class="ps-sidebar__link"
          ><i class="pi pi-users" aria-hidden="true"></i>
          Administración</router-link
        ><router-link v-if="!demo" to="/chatbot" class="ps-sidebar__link"
          ><i class="pi pi-comments" aria-hidden="true"></i> Chat
          actual</router-link
        ><router-link v-if="!demo" to="/profile" class="ps-sidebar__link"
          ><i class="pi pi-user" aria-hidden="true"></i> Mi perfil</router-link
        ><button class="ps-sidebar__link" @click="toggleTheme">
          <i class="pi pi-moon" aria-hidden="true"></i> Cambiar tema</button
        ><router-link
          v-if="demo"
          :to="auth.signedIn ? homePath : '/sign-in'"
          class="ps-sidebar__link"
          ><i class="pi pi-sign-in" aria-hidden="true"></i>
          {{
            auth.signedIn ? "Volver a mi cuenta" : "Iniciar sesión"
          }}</router-link
        ><button v-else class="ps-sidebar__link" @click="auth.signOut()">
          <i class="pi pi-sign-out" aria-hidden="true"></i> Cerrar sesión
        </button>
      </div>
    </aside>
    <header class="ps-header" :inert="mobileOpen || undefined">
      <div class="header-location">
        <button
          ref="menuButton"
          class="mobile-menu-button"
          aria-label="Abrir menú"
          :aria-expanded="mobileOpen"
          aria-controls="main-navigation"
          @click="openMenu"
        >
          <i class="pi pi-bars" aria-hidden="true"></i></button
        ><span class="muted">Mi espacio</span
        ><i class="pi pi-angle-right" aria-hidden="true"></i
        ><strong>{{ pageTitle }}</strong>
      </div>
      <div class="ps-header__user">
        <router-link
          v-if="!demo"
          to="/preview/dashboard"
          class="text-link preview-link"
          >Explorar novedades</router-link
        ><span class="ps-header__name">{{
          demo ? "Mi jardín de ejemplo" : profileName || auth.email
        }}</span>
        <div class="ps-header__avatar" aria-hidden="true">
          {{
            demo
              ? "J"
              : (profileName || auth.email || "P").charAt(0).toUpperCase()
          }}
        </div>
      </div>
    </header>
    <main
      id="main-content"
      class="ps-main"
      tabindex="-1"
      :inert="mobileOpen || undefined"
    >
      <div v-if="demo" class="demo-banner">
        <span
          ><i class="pi pi-info-circle" aria-hidden="true"></i> Recorrido de
          demostración</span
        ><small>Datos de ejemplo · Sin acciones reales</small>
      </div>
      <router-view :key="route.path" />
      <footer class="workspace-footer">
        <span
          >PlantSync <span aria-hidden="true">/</span> Cultiva el
          equilibrio.</span
        ><span
          >Hecho para crecer contigo
          <i class="pi pi-leaf" aria-hidden="true"></i
        ></span>
      </footer>
    </main>
  </div>
</template>
