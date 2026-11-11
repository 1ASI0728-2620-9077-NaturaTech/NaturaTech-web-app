export interface WalletProvider {
  isRabby?: boolean;
  providers?: WalletProvider[];
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, callback: (...args: unknown[]) => void): void;
  removeListener?(event: string, callback: (...args: unknown[]) => void): void;
}

/** Discover only the explicitly selected wallet; never select another injected wallet. */
export async function getRabby(): Promise<WalletProvider> {
  const injected = (window as Window & { ethereum?: WalletProvider }).ethereum;
  const fallback =
    injected?.providers?.find(
      (p) => p.isRabby && typeof p.request === "function",
    ) ||
    (injected?.isRabby && typeof injected.request === "function"
      ? injected
      : undefined);
  if (fallback) return fallback;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", announce);
      reject(
        new Error(
          "Instala o habilita Rabby Wallet desde rabby.io y vuelve a conectar.",
        ),
      );
    }, 500);
    function announce(event: Event) {
      const detail = (event as CustomEvent).detail;
      if (
        detail?.info?.rdns !== "io.rabby" ||
        typeof detail?.provider?.request !== "function"
      )
        return;
      clearTimeout(timer);
      window.removeEventListener("eip6963:announceProvider", announce);
      resolve(detail.provider);
    }
    window.addEventListener("eip6963:announceProvider", announce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
  });
}

export function encodeMessage(message: string): string {
  return (
    "0x" +
    [...new TextEncoder().encode(message)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

export async function walletAccount(
  provider: WalletProvider,
  requestAccess = false,
): Promise<string> {
  const accounts = await provider.request({
    method: requestAccess ? "eth_requestAccounts" : "eth_accounts",
  });
  if (
    !Array.isArray(accounts) ||
    typeof accounts[0] !== "string" ||
    !/^0x[a-fA-F0-9]{40}$/.test(accounts[0])
  )
    throw new Error("Selecciona una cuenta en Rabby Wallet.");
  return accounts[0].toLowerCase();
}
