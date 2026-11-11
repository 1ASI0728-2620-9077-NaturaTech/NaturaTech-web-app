// Retired provider proxy. The authenticated Spring endpoint is /api/v1/chat.
export default function handler(req, res) {
  return res
    .status(410)
    .json({
      code: "CHAT_MOVED",
      message: "Usa el chat autenticado de PlantSync.",
    });
}
