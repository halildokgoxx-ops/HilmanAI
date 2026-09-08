import { hilmanStorage } from "./storage";
import {
  DEFAULT_HILMAN_SYSTEM_PROMPT,
  CHAT_MODES,
  type ChatModeId,
} from "./constants";
import { getOrCreateSettings } from "./db-helpers";

/**
 * Sohbet sistem promptu — /api/chat ve /api/chat/stream AYNI kurucuyu kullanır
 * (sapma olmasın diye tek kaynak).
 */
export async function buildChatSystemPrompt(
  actorEmail: string,
  incomingMode?: string | null,
  incomingModel?: string | null
): Promise<{ systemPrompt: string; activeMode: ChatModeId; model: string }> {
  const settings = await getOrCreateSettings();
  const activeMode: ChatModeId =
    (incomingMode as ChatModeId) || "düşünen";
  const modeConfig = CHAT_MODES[activeMode] || CHAT_MODES["düşünen"];

  let systemPrompt = settings.systemPrompt || DEFAULT_HILMAN_SYSTEM_PROMPT;
  const actorUser = hilmanStorage.getUser(actorEmail);
  if (actorUser?.personalPrompt?.trim()) {
    systemPrompt += `\n\n[KULLANICI ÖZEL TALİMATI]: ${actorUser.personalPrompt.trim()}`;
  }
  if (modeConfig?.instructionPrompt) {
    systemPrompt += `\n\n${modeConfig.instructionPrompt}`;
  }

  return {
    systemPrompt,
    activeMode,
    model: incomingModel || settings.defaultModel || "hilmanai-v1-beta",
  };
}
