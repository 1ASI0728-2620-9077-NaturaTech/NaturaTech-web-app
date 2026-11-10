/** Proposed v1 backend DTOs. The current demo never sends these to a live endpoint. */
export interface PlantAnalysisResult {
  id: string;
  status: "QUEUED" | "PROCESSING" | "SUCCEEDED" | "INCONCLUSIVE" | "FAILED";
  species: string | null;
  summary: string | null;
  observations: string[];
  recommendations: string[];
  createdAt: string;
}
export interface ActionProposal {
  id: string;
  plantId: number;
  nodeId: number;
  actuator: "GROW_LIGHT" | "WATER_PUMP";
  durationSeconds: number;
  expiresAt: string;
  status: "AWAITING_CONFIRMATION" | "CANCELLED" | "EXPIRED" | "CONFIRMED";
}
export interface Reward {
  id: string;
  eligibleDays: number;
  requiredDays: number;
  status: "IN_PROGRESS" | "ELIGIBLE" | "SUBMITTED" | "CONFIRMED" | "FAILED";
  chainId: 11155111;
  transactionHash: string | null;
}

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export function validateImage(
  file: Pick<File, "type" | "size">,
): string | null {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    return "Selecciona una imagen JPG, PNG o WebP.";
  if (file.size === 0 || file.size > IMAGE_MAX_BYTES)
    return "La imagen debe tener contenido y pesar como máximo 10 MB.";
  return null;
}
