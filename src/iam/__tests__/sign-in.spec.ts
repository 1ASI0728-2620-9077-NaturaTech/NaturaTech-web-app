import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import SignIn from "../pages/sign-in.page.vue";
import { useAuthenticationStore } from "../services/authentication.store";

const api = vi.hoisted(() => ({ signIn: vi.fn(), getRoles: vi.fn() }));
vi.mock("@/iam/services/authentication-api.service", () => ({
  AuthenticationApiService: class {
    signIn = api.signIn;
    getRoles = api.getRoles;
  },
}));
enableAutoUnmount(afterEach);
beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
  api.signIn.mockResolvedValue({
    data: { id: 1, email: "test@example.test", token: "fixture" },
  });
});
async function setup(query = "") {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/sign-in", component: SignIn },
      { path: "/sign-up", component: { template: "<div />" } },
      { path: "/preview/dashboard", component: { template: "<div />" } },
      {
        path: "/dashboard",
        component: { template: "<div />" },
        meta: { requiresAuth: true, minimumRole: "admin" },
      },
      {
        path: "/plants",
        component: { template: "<div />" },
        meta: { requiresAuth: true },
      },
    ],
  });
  await router.push(`/sign-in${query}`);
  await router.isReady();
  const wrapper = mount(SignIn, { global: { plugins: [pinia, router] } });
  await wrapper.get("#email").setValue("test@example.test");
  await wrapper.get("#password").setValue("  valid-password  ");
  return { wrapper, router, store: useAuthenticationStore() };
}
describe("Existing sign-in workflow", () => {
  it.each([
    ["ROLE_ADMIN", "/dashboard"],
    ["ROLE_USER", "/plants"],
  ])("admits %s only after verification", async (role, path) => {
    const { wrapper, router, store } = await setup();
    api.getRoles.mockResolvedValue([role]);
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe(path);
    expect(store.signedIn).toBe(true);
    expect(api.signIn).toHaveBeenCalledWith({
      email: "test@example.test",
      password: "  valid-password  ",
    });
  });
  it("does not save credentials or enter when role verification fails", async () => {
    const { wrapper, router, store } = await setup();
    api.getRoles.mockRejectedValue(new Error("offline"));
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/sign-in");
    expect(store.signedIn).toBe(false);
    expect(localStorage.getItem("token")).toBeNull();
    expect(wrapper.get("[role=alert]").text()).toContain("verificar");
  });
  it("rejects missing roles and never persists a pending token", async () => {
    const { wrapper } = await setup();
    let resolve!: (roles: string[]) => void;
    api.getRoles.mockReturnValue(
      new Promise<string[]>((done) => {
        resolve = done;
      }),
    );
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(localStorage.getItem("token")).toBeNull();
    await wrapper.get("form").trigger("submit");
    expect(api.signIn).toHaveBeenCalledTimes(1);
    resolve([]);
    await flushPromises();
    expect(wrapper.text()).toContain("no tiene un rol habilitado");
  });
  it("validates email and blocks external return destinations", async () => {
    const { wrapper, router } = await setup("?redirect=https://example.org");
    await wrapper.get("#email").setValue("invalid");
    await wrapper.get("form").trigger("submit");
    expect(api.signIn).not.toHaveBeenCalled();
    await wrapper.get("#email").setValue("test@example.test");
    api.getRoles.mockResolvedValue(["ROLE_USER"]);
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/plants");
  });
});
