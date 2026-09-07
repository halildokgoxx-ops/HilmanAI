import { hilmanStorage, type AppSettingsData, type ConversationData, type MessageData } from "./storage";
import { DEFAULT_HILMAN_SYSTEM_PROMPT } from "./constants";

export async function getOrCreateSettings(): Promise<AppSettingsData> {
  return hilmanStorage.getSettings();
}

export async function updateSettings(partial: Partial<AppSettingsData>): Promise<AppSettingsData> {
  return hilmanStorage.updateSettings(partial);
}

export async function getAllConversations(ownerEmail?: string | null, isAdmin = false): Promise<ConversationData[]> {
  return hilmanStorage.getConversations(ownerEmail, isAdmin);
}

export async function getConversationWithMessages(conversationId: string): Promise<{
  conversation: ConversationData | null;
  messages: MessageData[];
}> {
  return hilmanStorage.getConversation(conversationId);
}

export async function createConversation(conv: {
  id: string;
  title: string;
  model?: string;
  provider?: string;
  systemPrompt?: string;
  ownerEmail?: string | null;
}): Promise<ConversationData> {
  return hilmanStorage.createConversation(conv);
}

export async function updateConversation(
  id: string,
  partial: Partial<ConversationData>
): Promise<ConversationData | null> {
  return hilmanStorage.updateConversation(id, partial);
}

export async function deleteConversation(id: string): Promise<boolean> {
  return hilmanStorage.deleteConversation(id);
}

export async function addMessage(msg: {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  reasoning?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  mediaType?: "text" | "image" | "video" | "vision";
  model?: string | null;
  provider?: string | null;
  tokensUsed?: number | null;
  latencyMs?: number | null;
  searchResults?: Array<{ title: string; snippet: string; url: string }> | null;
  followUps?: string[] | null;
  isError?: boolean;
}): Promise<MessageData> {
  return hilmanStorage.addMessage(msg);
}

export async function getRecentMessages(conversationId: string, limit = 10): Promise<MessageData[]> {
  return hilmanStorage.getRecentMessages(conversationId, limit);
}
