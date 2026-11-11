import { afterEach, describe, expect, it, vi } from "vitest";
import { getRabby, encodeMessage } from "../services/rabby";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("Rabby discovery", () => {
  it("selects Rabby among multiple injected wallets without requesting accounts", async () => {
    const rabby = { isRabby: true, request: vi.fn() };
    vi.stubGlobal("ethereum", {
      providers: [{ isMetaMask: true, request: vi.fn() }, rabby],
    });
    expect(await getRabby()).toBe(rabby);
    expect(rabby.request).not.toHaveBeenCalled();
  });
  it("discovers Rabby via EIP-6963 without window.ethereum", async () => {
    vi.stubGlobal("ethereum", undefined);
    const rabby = { request: vi.fn() };
    const announce = () =>
      window.dispatchEvent(
        new CustomEvent("eip6963:announceProvider", {
          detail: { info: { rdns: "io.rabby" }, provider: rabby },
        }),
      );
    window.addEventListener("eip6963:requestProvider", announce);
    try {
      expect(await getRabby()).toBe(rabby);
    } finally {
      window.removeEventListener("eip6963:requestProvider", announce);
    }
  });
  it("does not silently fall back to MetaMask", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("ethereum", { isMetaMask: true, request: vi.fn() });
    const pending = expect(getRabby()).rejects.toThrow("Rabby");
    await vi.advanceTimersByTimeAsync(500);
    await pending;
  });
  it("encodes the exact UTF-8 challenge", () => {
    expect(encodeMessage("ñ")).toBe("0xc3b1");
  });
});
