import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useAuthenticationStore } from "@/iam/services/authentication.store";
const getRoles = vi.hoisted(() => vi.fn());
vi.mock("@/iam/services/authentication-api.service", () => ({
  AuthenticationApiService: class {
    getRoles = getRoles;
  },
}));
vi.mock("@/workspace/pages/preview.page.vue", () => ({
  default: { template: "<div>Demo</div>" },
}));
vi.mock("@/workspace/pages/health.page.vue", () => ({
  default: { template: "<div>Health</div>" },
}));
vi.mock("@/workspace/pages/assistant.page.vue", () => ({
  default: { template: "<div>Assistant</div>" },
}));
vi.mock("@/workspace/pages/rewards.page.vue", () => ({
  default: { template: "<div>Rewards</div>" },
}));
vi.mock("@/iam/pages/sign-in.page.vue", () => ({
  default: { template: "<div>Sign In</div>" },
}));
vi.mock("@/iam/pages/sign-up.page.vue", () => ({
  default: { template: "<div>Sign Up</div>" },
}));
vi.mock("@/analytics/pages/analytics-dashboard.page.vue", () => ({
  default: { template: "<div>Dashboard</div>" },
}));
vi.mock("@/plant-management/pages/plants.page.vue", () => ({
  default: { template: "<div>Plants</div>" },
}));
vi.mock("@/shared/pages/not-found.page.vue", () => ({
  default: { template: "<div>Not Found</div>" },
}));
import router from "@/router/index";

describe("Navigation contracts", () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    localStorage.clear();
    getRoles.mockReset().mockResolvedValue(["ROLE_ADMIN"]);
    await router.push("/missing-test-page");
  });
  it.each(["/dashboard", "/plants", "/health", "/assistant", "/rewards"])(
    "requires a session for %s",
    async (path) => {
      await router.push(path);
      expect(router.currentRoute.value.name).toBe("sign-in");
    },
  );
  it.each([
    "dashboard",
    "plants",
    "tasks",
    "devices",
    "health",
    "assistant",
    "rewards",
  ])(
    "opens isolated preview %s without creating a session",
    async (section) => {
      await router.push(`/preview/${section}`);
      expect(router.currentRoute.value.name).toBe("preview");
      expect(router.currentRoute.value.meta.demo).toBe(true);
      expect(localStorage.getItem("token")).toBeNull();
    },
  );
  it("rejects unknown preview sections", async () => {
    await router.push("/preview/admin");
    expect(router.currentRoute.value.name).toBe("not-found");
  });
  it("does not let a preview grant access to a real feature", async () => {
    await router.push("/preview/health");
    await router.push("/health");
    expect(router.currentRoute.value.name).toBe("sign-in");
  });
  it.each(["/sign-in", "/sign-up", "/"])(
    "keeps existing authenticated landing at dashboard from %s",
    async (path) => {
      localStorage.setItem("token", "fixture-token");
      const auth = useAuthenticationStore();
      auth.userId = 42;
      await router.push(path);
      expect(router.currentRoute.value.name).toBe("dashboard");
    },
  );
  it("does not mark real feature routes as demonstrations", () => {
    for (const name of ["health", "assistant", "rewards"]) {
      const route = router.getRoutes().find((item) => item.name === name);
      expect(route?.meta.requiresAuth).toBe(true);
      expect(route?.meta.demo).not.toBe(true);
    }
  });
  it.each(["/users", "/dashboard"])(
    "denies ordinary users the administrative route %s",
    async (path) => {
      useAuthenticationStore().signIn(
        { id: 2, email: "user@example.test", token: "user-token" },
        "user",
      );
      await router.push(path);
      expect(router.currentRoute.value.name).toBe("access-denied");
    },
  );
  it("restores a user role from the server, ignoring a forged stored role", async () => {
    localStorage.setItem("token", "user-token");
    localStorage.setItem("userRole", "admin");
    useAuthenticationStore().userId = 2;
    getRoles.mockResolvedValue(["ROLE_USER"]);
    await router.push("/sign-in");
    expect(router.currentRoute.value.name).toBe("plants");
    expect(useAuthenticationStore().userRole).toBe("user");
  });
  it("fails closed when session verification is unavailable", async () => {
    localStorage.setItem("token", "fixture-token");
    useAuthenticationStore().userId = 42;
    getRoles.mockRejectedValue(new Error("offline"));
    await router.push("/plants");
    expect(router.currentRoute.value.name).toBe("sign-in");
    expect(localStorage.getItem("token")).toBeNull();
  });
  it("lands an ordinary user on plants when opening the root URL", async () => {
    useAuthenticationStore().signIn(
      { id: 2, email: "user@example.test", token: "user-token" },
      "user",
    );
    await router.push("/");
    expect(router.currentRoute.value.name).toBe("plants");
  });
});
