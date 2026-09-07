import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default("Yeni Sohbet"),
  model: text("model").notNull().default("HilmanBey/HilmanAI-V1-Beta-Zirve-GGUF"),
  provider: text("provider").notNull().default("huggingface"),
  systemPrompt: text("system_prompt"),
  isPinned: boolean("is_pinned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  reasoning: text("reasoning"),
  model: text("model"),
  provider: text("provider"),
  tokensUsed: integer("tokens_used"),
  latencyMs: integer("latency_ms"),
  isError: boolean("is_error").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const appSettings = pgTable("app_settings", {
  id: text("id").primaryKey().default("default"),
  activeProvider: text("active_provider").notNull().default("huggingface"),
  hfToken: text("hf_token").notNull().default(""),
  groqApiKey: text("groq_api_key"),
  openrouterApiKey: text("openrouter_api_key"),
  customEndpoint: text("custom_endpoint"),
  defaultModel: text("default_model").notNull().default("HilmanBey/HilmanAI-V1-Beta-Zirve-GGUF"),
  temperature: text("temperature").notNull().default("0.7"),
  maxTokens: integer("max_tokens").notNull().default(2048),
  systemPrompt: text("system_prompt"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type AppSettings = typeof appSettings.$inferSelect;
