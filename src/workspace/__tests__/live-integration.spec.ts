import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises, enableAutoUnmount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import Health from "../pages/live-health.page.vue";
import Assistant from "../pages/live-assistant.page.vue";
import Rewards from "../pages/live-rewards.page.vue";
import { useAuthenticationStore } from "@/iam/services/authentication.store";

const loadPlants = vi.hoisted(() => vi.fn());
const api = vi.hoisted(() => ({
  capabilities: vi.fn(),
  analyses: vi.fn(),
  analysis: vi.fn(),
  submitImage: vi.fn(),
  deleteAnalysis: vi.fn(),
  createConversation: vi.fn(),
  conversation: vi.fn(),
  message: vi.fn(),
  proposal: vi.fn(),
  confirm: vi.fn(),
  cancel: vi.fn(),
  command: vi.fn(),
  wallet: vi.fn(),
  challenge: vi.fn(),
  verifyWallet: vi.fn(),
  unlinkWallet: vi.fn(),
  rewards: vi.fn(),
  reward: vi.fn(),
  enroll: vi.fn(),
  restart: vi.fn(),
  claim: vi.fn(),
}));
vi.mock("../services/integration-api", () => ({
  integrationApi: api,
  integrationError: () => "Error del servidor",
}));
vi.mock("@/shared/services/personal-workspace.service", () => ({
  loadPersonalPlants: loadPlants,
}));
enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  setActivePinia(createPinia());
  useAuthenticationStore().signIn(
    { id: 1, email: "test@example.test", token: "fixture" },
    "user",
  );
  loadPlants.mockResolvedValue({ plants: [{ id: 1, name: "Monstera" }] });
  api.capabilities.mockResolvedValue({
    plantAnalysis: true,
    assistant: true,
    rewards: true,
  });
  api.analyses.mockResolvedValue({ items: [], nextCursor: null });
  api.wallet.mockResolvedValue(null);
  api.rewards.mockResolvedValue({ items: [], nextCursor: null });
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: vi.fn(() => "blob:test"),
      revokeObjectURL: vi.fn(),
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe("Real integration views", () => {
  it("keeps real uploads disabled when the server has not enabled Gemini", async () => {
    api.capabilities.mockResolvedValue({ plantAnalysis: false });
    const wrapper = mount(Health);
    await flushPromises();
    expect(
      wrapper.get("input[type=file]").attributes("disabled"),
    ).toBeDefined();
    expect(wrapper.text()).toContain("no tiene configurado Gemini");
    expect(api.submitImage).not.toHaveBeenCalled();
  });
  it("sends a selected image and displays the server result instead of a fixture", async () => {
    const result = {
      id: "job",
      status: "SUCCEEDED",
      species: "Especie del servidor",
      summary: "Resultado externo",
      observations: [],
      recommendations: [],
      createdAt: "2026-11-10T12:00:00Z",
    };
    api.submitImage.mockResolvedValue({ id: "job", status: "QUEUED" });
    api.analysis.mockResolvedValue(result);
    const wrapper = mount(Health);
    await flushPromises();
    const file = new File(["image"], "plant.png", { type: "image/png" });
    const input = wrapper.get("input[type=file]");
    Object.defineProperty(input.element, "files", { value: [file] });
    await input.trigger("change");
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Analizar fotografía")!
      .trigger("click");
    await flushPromises();
    expect(api.submitImage).toHaveBeenCalledWith(
      file,
      null,
      expect.any(String),
    );
    expect(wrapper.text()).toContain("Especie del servidor");
    expect(wrapper.text()).not.toContain("Resultado ilustrativo");
  });
  it("persists the real conversation ID and sends a message without confirming an action", async () => {
    api.createConversation.mockResolvedValue({ id: "conversation" });
    api.message.mockResolvedValue({
      reply: "Consulta recibida",
      proposal: null,
    });
    api.conversation.mockResolvedValue({
      id: "conversation",
      messages: [{ role: "assistant", content: "Consulta recibida" }],
    });
    const wrapper = mount(Assistant);
    await flushPromises();
    await wrapper.get("textarea").setValue("Hola");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(api.message).toHaveBeenCalledWith("conversation", "Hola", null);
    expect(sessionStorage.getItem("plantsync:conversation:1")).toBe(
      "conversation",
    );
    expect(api.confirm).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Consulta recibida");
  });
  it("requires explicit confirmation before requesting a physical command", async () => {
    sessionStorage.setItem("plantsync:conversation:1", "conversation");
    const proposal = {
      id: "proposal",
      plantId: 1,
      nodeId: 2,
      actuator: "GROW_LIGHT",
      durationSeconds: 30,
      status: "AWAITING_CONFIRMATION",
      expiresAt: "2099-01-01T00:00:00Z",
    };
    api.conversation.mockResolvedValue({
      id: "conversation",
      messages: [
        {
          role: "assistant",
          content: "Revisa la propuesta",
          proposalId: "proposal",
        },
      ],
    });
    api.proposal.mockResolvedValue(proposal);
    api.confirm.mockResolvedValue({ commandId: "proposal", status: "QUEUED" });
    expect(sessionStorage.getItem("plantsync:conversation:1")).toBe(
      "conversation",
    );
    expect(useAuthenticationStore().userId).toBe(1);
    const wrapper = mount(Assistant);
    await flushPromises();
    expect(api.conversation).toHaveBeenCalledWith("conversation");
    expect(wrapper.text()).toContain("Revisa la propuesta");
    expect(api.proposal).toHaveBeenCalledWith("proposal");
    expect(api.confirm).not.toHaveBeenCalled();
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Confirmar acción")!
      .trigger("click");
    await flushPromises();
    expect(api.confirm).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("QUEUED");
  });
  it("requests a wallet signature explicitly and invalidates the connected account on change", async () => {
    const address = "0x" + "1".repeat(40);
    let changed: () => void = () => {};
    const request = vi.fn(async ({ method }: { method: string }) =>
      method === "eth_chainId"
        ? "0xaa36a7"
        : method === "personal_sign"
          ? "0x" + "a".repeat(130)
          : [address],
    );
    vi.stubGlobal("ethereum", {
      isRabby: true,
      request,
      on: (event: string, callback: () => void) => {
        if (event === "accountsChanged") changed = callback;
      },
      removeListener: vi.fn(),
    });
    api.challenge.mockResolvedValue({
      challengeId: "challenge",
      message: "Verify account",
    });
    api.verifyWallet.mockResolvedValue({
      address,
      chainId: 11155111,
      verifiedAt: "2026-11-10",
    });
    const wrapper = mount(Rewards);
    await flushPromises();
    expect(request).not.toHaveBeenCalled();
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Conectar Rabby Wallet")!
      .trigger("click");
    await flushPromises();
    expect(api.challenge).not.toHaveBeenCalled();
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Firmar y verificar")!
      .trigger("click");
    await flushPromises();
    expect(api.verifyWallet).toHaveBeenCalledWith(
      "challenge",
      "0x" + "a".repeat(130),
    );
    expect(wrapper.text()).toContain("Cuenta verificada");
    changed();
    await flushPromises();
    expect(wrapper.text()).not.toContain("Cuenta verificada");
    expect(api.claim).not.toHaveBeenCalled();
  });
});
