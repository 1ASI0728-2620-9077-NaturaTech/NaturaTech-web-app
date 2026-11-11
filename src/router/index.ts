import { useAuthenticationStore } from "@/iam/services/authentication.store";
import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/preview",
    redirect: "/preview/dashboard",
  },
  {
    path: "/preview/:section(dashboard|plants|tasks|devices|health|assistant|rewards)",
    name: "preview",
    component: () => import("@/workspace/pages/preview.page.vue"),
    meta: { requiresAuth: false, minimumRole: "guest", demo: true },
  },
  {
    path: "/health",
    name: "health",
    component: () => import("@/workspace/pages/live-health.page.vue"),
    meta: { requiresAuth: true, minimumRole: "user" },
  },
  {
    path: "/assistant",
    name: "assistant",
    component: () => import("@/workspace/pages/live-assistant.page.vue"),
    meta: { requiresAuth: true, minimumRole: "user" },
  },
  {
    path: "/rewards",
    name: "rewards",
    component: () => import("@/workspace/pages/live-rewards.page.vue"),
    meta: { requiresAuth: true, minimumRole: "user" },
  },
  // Public routes
  {
    path: "/sign-in",
    name: "sign-in",
    component: () => import("@/iam/pages/sign-in.page.vue"),
    meta: { requiresAuth: false, minimumRole: "guest" },
  },
  {
    path: "/sign-up",
    name: "sign-up",
    component: () => import("@/iam/pages/sign-up.page.vue"),
    meta: { requiresAuth: false, minimumRole: "guest" },
  },

  // Protected routes
  {
    path: "/dashboard",
    name: "dashboard",
    component: () => import("@/analytics/pages/analytics-dashboard.page.vue"),
    meta: { requiresAuth: true, minimumRole: "admin" },
  },
  {
    path: "/users",
    name: "users",
    component: () => import("@/iam/pages/users.page.vue"),
    meta: { requiresAuth: true, minimumRole: "admin" },
  },
  {
    path: "/plants",
    name: "plants",
    component: () => import("@/plant-management/pages/plants.page.vue"),
    meta: { requiresAuth: true, minimumRole: "user" },
  },
  {
    path: "/plants/:id",
    name: "plant-detail",
    component: () => import("@/plant-management/pages/plant-detail.page.vue"),
    meta: { requiresAuth: true, minimumRole: "user" },
  },
  {
    path: "/tasks",
    name: "tasks-timeline",
    component: () => import("@/task-management/pages/tasks-timeline.page.vue"),
    meta: { requiresAuth: true, minimumRole: "user" },
  },
  {
    path: "/iot",
    name: "iot-dashboard",
    component: () => import("@/iot-management/pages/iot-dashboard.page.vue"),
    meta: { requiresAuth: true, minimumRole: "user" },
  },
  {
    path: "/chatbot",
    name: "chatbot",
    component: () => import("@/chatbot/pages/chatbot.page.vue"),
    meta: { requiresAuth: true, minimumRole: "user" },
  },
  {
    path: "/profile",
    name: "profile",
    component: () => import("@/profile-management/pages/profile.page.vue"),
    meta: { requiresAuth: true, minimumRole: "user" },
  },

  // Fallbacks
  {
    path: "/access-denied",
    name: "access-denied",
    component: () => import("@/shared/pages/access-denied.page.vue"),
    meta: { requiresAuth: false, minimumRole: "guest" },
  },
  {
    path: "/",
    redirect: "/dashboard",
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: () => import("@/shared/pages/not-found.page.vue"),
    meta: { requiresAuth: false, minimumRole: "guest" },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

/**
 * Navigation guard implementing route protection logic:
 * 1. Redirect authenticated users away from sign-in/sign-up pages
 * 2. Redirect unauthenticated users to sign-in for protected routes
 */
router.beforeEach(async (to) => {
  // Public preview never requests a real profile or validates a stored session.
  if (to.meta.demo) return true;
  const auth = useAuthenticationStore();
  const token = localStorage.getItem("token");
  const authPage = to.name === "sign-in" || to.name === "sign-up";
  if (!to.meta.requiresAuth && !authPage) return true;
  if (!token) {
    auth.clearSession();
    return to.meta.requiresAuth
      ? { name: "sign-in", query: { redirect: to.fullPath } }
      : true;
  }
  if (!(await auth.validateSession())) {
    return to.meta.requiresAuth
      ? { name: "sign-in", query: { reason: "session", redirect: to.fullPath } }
      : true;
  }
  if (authPage)
    return { name: auth.userRole === "admin" ? "dashboard" : "plants" };
  if (
    to.name === "dashboard" &&
    to.redirectedFrom?.path === "/" &&
    auth.userRole === "user"
  )
    return { name: "plants" };
  if (to.meta.minimumRole === "admin" && auth.userRole !== "admin")
    return { name: "access-denied" };
  return true;
});
export default router;
