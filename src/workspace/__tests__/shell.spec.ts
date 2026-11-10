import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import App from "@/App.vue";

const getProfile = vi.hoisted(() => vi.fn());
vi.mock("@/profile-management/services/profile-api.service", () => ({
  ProfileApiService: class {
    getByUserId = getProfile;
  },
}));

enableAutoUnmount(afterEach);
beforeEach(() => {
  localStorage.clear();
  getProfile.mockClear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

async function renderShell() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/plants", component: { template: "<div>Plants</div>" } },
      { path: "/sign-in", component: { template: "<div>Sign in</div>" } },
      { path: "/dashboard", component: { template: "<div>Dashboard</div>" } },
      {
        path: "/preview/:section",
        component: { template: "<h1>Example content</h1>" },
        meta: { demo: true },
      },
    ],
  });
  await router.push("/preview/dashboard");
  await router.isReady();
  return mount(App, {
    attachTo: document.body,
    global: {
      plugins: [createPinia(), router],
      stubs: { "pv-toast": true, "pv-confirm-dialog": true },
    },
  });
}

describe("Workspace shell", () => {
  it("does not load a real profile while browsing the demo with an existing session", async () => {
    localStorage.setItem("token", "existing-session");
    localStorage.setItem("userId", "42");
    const wrapper = await renderShell();
    expect(wrapper.text()).toContain("Recorrido de demostración");
    expect(getProfile).not.toHaveBeenCalled();
    expect(localStorage.getItem("token")).toBe("existing-session");
  });
  it("opens mobile navigation and closes it on Escape with focus restored", async () => {
    const wrapper = await renderShell();
    const menu = wrapper.get('button[aria-label="Abrir menú"]');
    await menu.trigger("click");
    expect(wrapper.get("aside").attributes("aria-modal")).toBe("true");
    await wrapper.get("aside").trigger("keydown", { key: "Escape" });
    expect(wrapper.get("aside").attributes("aria-modal")).toBeUndefined();
    expect(document.activeElement).toBe(menu.element);
  });
  it("keeps demonstration navigation entirely inside the preview routes", async () => {
    const wrapper = await renderShell();
    const links = wrapper.findAll("nav a");
    expect(links).toHaveLength(7);
    expect(
      links.every((link) => link.attributes("href")?.startsWith("/preview/")),
    ).toBe(true);
  });
});
