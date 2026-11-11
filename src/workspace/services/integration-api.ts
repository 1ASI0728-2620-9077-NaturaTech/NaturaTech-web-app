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
      .get<{
        id: string;
        messages: Message[];
      }>(`/agent/conversations/${encodeURIComponent(id)}`)
      .then((r) => r.data),
  message: (id: string, content: string, plantId: number | null) =>
    http
      .post<{
        reply: string;
        proposal: ActionProposal | null;
      }>(`/agent/conversations/${encodeURIComponent(id)}/messages`, { content, plantId }, { timeout: 55000 })
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
    GEMINI_CREDENTIALS_REJECTED:
      "El servicio de IA necesita revisar su autorización. Contacta con soporte; no es un problema de tu fotografía.",
    GEMINI_MODEL_UNAVAILABLE:
      "El modelo de IA configurado no está disponible. Se necesita actualizar la configuración del servidor.",
    GEMINI_RATE_LIMITED:
      "El proveedor de IA alcanzó su cuota. Espera e inténtalo más tarde.",
    GEMINI_REQUEST_REJECTED:
      "El proveedor de IA rechazó la solicitud. Soporte debe revisar su configuración.",
    ANALYSIS_PROVIDER_FAILED:
      "El proveedor no pudo completar el análisis. Puedes reintentar la fotografía más tarde.",
    WORKER_INTERRUPTED:
      "El análisis se interrumpió al reiniciar el servidor. Puedes intentarlo nuevamente.",
    PLANT_DATE_INVALID: "Revisa las fechas de llegada y próximo riego.",
    GEMINI_UNAVAILABLE:
      "Gemini no respondió. Reintenta en unos minutos; si persiste, revisa la configuración del proveedor con soporte.",
    GEMINI_INCOMPLETE:
      "El análisis quedó incompleto. Intenta una consulta más breve o una fotografía más clara.",
    GEMINI_INVALID_RESULT:
      "No pudimos interpretar el resultado de Gemini. Intenta nuevamente.",
    CHALLENGE_INVALID:
      "La solicitud de firma caducó o ya se utilizó. Solicita una firma nueva.",
    SIGNATURE_INVALID:
      "La firma no corresponde a esta cuenta. Comprueba la cuenta seleccionada en Rabby.",
    GEMINI_PROVIDER_ERROR:
      "El proveedor de IA no pudo responder. Inténtalo de nuevo en unos minutos.",
    GEMINI_INVALID_RESPONSE:
      "La IA devolvió una respuesta que no pudimos interpretar. Prueba con otra consulta o fotografía.",
    INVALID_IMAGE:
      "No pudimos leer la fotografía. Usa un archivo JPG, PNG o WebP válido.",
    IMAGE_TOO_LARGE:
      "La fotografía supera el tamaño permitido. Reduce su tamaño e inténtalo de nuevo.",
    WALLET_CHALLENGE_EXPIRED:
      "La solicitud de firma caducó. Solicita una firma nueva.",
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
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  if (!code || !messages[code]) {
    if (status === 401)
      return "Tu sesión no está disponible. Vuelve a iniciar sesión.";
    if (status === 403)
      return "Tu cuenta no tiene permiso para realizar esta operación.";
    if (status === 409)
      return "Este registro ya existe o cambió de estado. Actualiza la lista antes de continuar.";
    if (status === 400)
      return "Revisa los datos. El código podría estar registrado o algún campo no es válido.";
    if (status === 413)
      return "El archivo es demasiado grande. Selecciona una fotografía de hasta 10 MB.";
    if (status === 429)
      return "Alcanzaste el límite de solicitudes. Espera antes de intentarlo de nuevo.";
    if (!status)
      return "No pudimos conectar con el servidor. Comprueba tu conexión y vuelve a intentarlo.";
  }
  return (
    (code && messages[code]) ||
    "No pudimos completar la operación. Actualiza el estado antes de volver a enviarla."
  );
}
