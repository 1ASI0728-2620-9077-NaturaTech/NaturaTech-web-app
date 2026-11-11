import http from "@/shared/services/http-common";
import type { ActionProposal, PlantAnalysisResult, Reward } from "../model";

export interface Capabilities {
  plantAnalysis: boolean;
  assistant: boolean;
  actuatorCommands: boolean;
  rewards: boolean;
  walletChainId: number;
  iotEnvironment?: "SIMULATED" | "PHYSICAL";
}
export interface Analysis extends PlantAnalysisResult {
  plantId: number | null;
  errorCode: string | null;
}
export interface Command {
  commandId: string;
  status: string;
  createdAt: string;
}
export interface Message {
  role: "user" | "assistant";
  content: string;
  proposalId?: string;
}
export interface Wallet {
  address: string;
  chainId: number;
  verifiedAt: string;
}
export interface GreenReward extends Reward {
  plantId: number;
  startedAt: string;
  errorCode: string | null;
}
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
export const integrationApi = {
  capabilities: () =>
    http.get<Capabilities>("/capabilities").then((r) => r.data),
  analyses: (cursor = "0") =>
    http
      .get<Page<Analysis>>("/plant-analyses", { params: { cursor } })
      .then((r) => r.data),
  analysis: (id: string) =>
    http
      .get<Analysis>(`/plant-analyses/${encodeURIComponent(id)}`)
      .then((r) => r.data),
  submitImage: (image: File, plantId: number | null, key: string) => {
    const body = new FormData();
    body.append("image", image);
    if (plantId !== null) body.append("plantId", String(plantId));
    return http
      .post<{ id: string; status: string }>("/plant-analyses", body, {
        headers: { "Content-Type": undefined, "Idempotency-Key": key },
      })
      .then((r) => r.data);
  },
  deleteAnalysis: (id: string) =>
    http.delete(`/plant-analyses/${encodeURIComponent(id)}`),
  createConversation: () =>
    http.post<{ id: string }>("/agent/conversations").then((r) => r.data),
  conversation: (id: string) =>
    http
      .get<{ id: string; messages: Message[] }>(
        `/agent/conversations/${encodeURIComponent(id)}`,
      )
      .then((r) => r.data),
  message: (id: string, content: string, plantId: number | null) =>
    http
      .post<{ reply: string; proposal: ActionProposal | null }>(
        `/agent/conversations/${encodeURIComponent(id)}/messages`,
        { content, plantId },
        { timeout: 55000 },
      )
      .then((r) => r.data),
  proposal: (id: string) =>
    http
      .get<ActionProposal>(
        `/actuator-command-proposals/${encodeURIComponent(id)}`,
      )
      .then((r) => r.data),
  confirm: (id: string) =>
    http
      .post<Command>(
        `/actuator-command-proposals/${encodeURIComponent(id)}/confirm`,
        {},
        { headers: { "Idempotency-Key": id } },
      )
      .then((r) => r.data),
  cancel: (id: string) =>
    http
      .post<ActionProposal>(
        `/actuator-command-proposals/${encodeURIComponent(id)}/cancel`,
      )
      .then((r) => r.data),
  command: (id: string) =>
    http
      .get<Command>(`/actuator-commands/${encodeURIComponent(id)}`)
      .then((r) => r.data),
  wallet: () => http.get<Wallet | null>("/wallet").then((r) => r.data || null),
  challenge: (address: string) =>
    http
      .post<{ challengeId: string; message: string }>("/wallet/challenges", {
        address,
        chainId: 11155111,
      })
      .then((r) => r.data),
  verifyWallet: (challengeId: string, signature: string) =>
    http
      .post<Wallet>("/wallet/verify", { challengeId, signature })
      .then((r) => r.data),
  unlinkWallet: () => http.delete("/wallet"),
  rewards: () => http.get<Page<GreenReward>>("/rewards").then((r) => r.data),
  reward: (id: string) =>
    http
      .get<GreenReward>(`/rewards/${encodeURIComponent(id)}`)
      .then((r) => r.data),
  enroll: (plantId: number) =>
    http.post<GreenReward>("/rewards", { plantId }).then((r) => r.data),
  restart: (id: string) =>
    http
      .post<GreenReward>(`/rewards/${encodeURIComponent(id)}/restart`)
      .then((r) => r.data),
  claim: (id: string) =>
    http
      .post<GreenReward>(
        `/rewards/${encodeURIComponent(id)}/claim`,
        {},
        { headers: { "Idempotency-Key": id } },
      )
      .then((r) => r.data),
};
export function integrationError(error: unknown): string {
  const code = (error as { response?: { data?: { code?: string } } })?.response
    ?.data?.code;
  const messages: Record<string, string> = {
    GEMINI_NOT_CONFIGURED:
      "El análisis con IA aún no está configurado en el servidor.",
    SEPOLIA_NOT_CONFIGURED: "La emisión en Sepolia aún no está configurada.",
    REWARDS_NOT_ENABLED: "Los retos todavía no están habilitados.",
    REWARD_RULE_NOT_APPROVED:
      "Esta planta todavía no tiene reglas de recompensa aprobadas.",
    DEVICE_CAPABILITIES_NOT_APPROVED:
      "Este dispositivo aún no está habilitado para acciones del asistente.",
    SENSOR_DATA_STALE:
      "Se necesitan lecturas recientes antes de activar el dispositivo.",
    PLANT_HAS_NO_DEVICE: "La planta no tiene un dispositivo vinculado.",
    PROPOSAL_NOT_CONFIRMABLE: "La propuesta caducó o ya no se puede confirmar.",
    DEVICE_HOURLY_LIMIT:
      "El dispositivo alcanzó su límite de acciones por hora.",
    AGENT_DAILY_QUOTA: "Alcanzaste el límite diario de consultas.",
    ANALYSIS_QUOTA: "Alcanzaste el límite diario de fotografías.",
    REWARD_NOT_ELIGIBLE: "Todavía no se completan 30 días de lecturas válidas.",
    DEVICE_LINK_CHANGED:
      "El dispositivo cambió de planta. Reinicia el reto para comenzar un periodo nuevo.",
    MINTER_BUSY: "Hay una emisión en curso. Inténtalo más tarde.",
  };
  return (
    (code && messages[code]) ||
    "No pudimos completar la operación. Actualiza el estado antes de volver a enviarla."
  );
}
