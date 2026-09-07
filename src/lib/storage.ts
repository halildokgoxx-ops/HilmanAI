import fs from "fs";
import path from "path";
import crypto from "crypto";
import { DEFAULT_HILMAN_SYSTEM_PROMPT } from "./constants";
import { isAdminEmail } from "./auth";

export interface HilmanApiKey {
  id: string;
  name: string;
  key: string; // format: hilman_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ownerEmail?: string | null; // hangi Google hesabına ait (yoksa legacy/ortak)
  usageCount?: number; // bu anahtarla yapılan toplam API çağrısı
  lastUsedAt?: string | null;
  createdAt: string;
}

export interface HilmanUser {
  email: string; // küçük harf, birincil anahtar
  name: string;
  picture?: string | null;
  personalPrompt?: string; // kullanıcıya özel talimat (HilmanAI kişisel komutları gibi)
  quota?: number; // kalan sohbet hakkı (opsiyonel, tanımsızsa sınırsız)
  isVip?: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export interface CustomModelData {
  id: string;
  name: string;
  hfLink?: string;
  description: string;
  badge: string;
  contextWindow: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface AppSettingsData {
  id: string;
  defaultModel: string;
  temperature: string;
  maxTokens: number;
  systemPrompt: string;       // Admin-only global core prompt
  personalPrompt: string;     // User-specific custom instruction (HilmanAI style)
  reasoningDepth: "standard" | "deep" | "extreme";
  contextWindow: "32k" | "64k" | "128k";
  codeOptimization: boolean;
  showThinking: boolean;
  hfToken?: string;
  groqApiKey?: string;
  openrouterApiKey?: string;
  geminiApiKey?: string;
  updatedAt: string;
}

export interface ConversationData {
  id: string;
  title: string;
  model: string;
  provider: string;
  ownerEmail?: string | null; // hangi Google hesabına ait — kimse başkasının geçmişini göremez
  systemPrompt?: string | null;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessageData {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  reasoning?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  mediaType?: "text" | "image" | "video" | "vision";
  feedback?: "like" | "dislike" | null;
  model?: string | null;
  provider?: string | null;
  tokensUsed?: number | null;
  latencyMs?: number | null;
  searchResults?: Array<{ title: string; snippet: string; url: string }> | null;
  followUps?: string[] | null; // tek tıkla takip soruları
  isError: boolean;
  createdAt: string;
}

interface StorageSchema {
  settings: AppSettingsData;
  models: CustomModelData[];
  apiKeys: HilmanApiKey[];
  users: HilmanUser[];
  conversations: ConversationData[];
  messages: MessageData[];
}

// Render'da kalıcı disk kullanılacaksa DATA_DIR=/var/hilman-data gibi verilir.
// (Render free planda disk yoktur — bkz. render.yaml + README. Disk yoksa
//  redeploy/restart sonrası JSON sıfırlanır.)
const DATA_DIR = process.env.DATA_DIR?.trim() || path.join(process.cwd(), "data");
const STORAGE_FILE = path.join(DATA_DIR, "hilman_storage.json");
const BACKUP_FILE = path.join(DATA_DIR, "hilman_storage.bak.json");

function getDefaultModels(): CustomModelData[] {
  return [
    {
      id: "hilmanai-v1-beta",
      name: "HilmanAI v1 Beta",
      hfLink: "https://huggingface.co/HilmanBey/HilmanAI-V1-Beta-Zirve-GGUF",
      description: "Çok modlu amiral gemisi (Vision, Kodlama, Resim, Video)",
      badge: "v1 Beta",
      contextWindow: "128k",
      isDefault: true,
      createdAt: new Date().toISOString(),
    },
  ];
}

function getDefaultState(): StorageSchema {
  return {
    settings: {
      id: "default",
      defaultModel: "hilmanai-v1-beta",
      temperature: "0.7",
      maxTokens: 2048,
      systemPrompt: DEFAULT_HILMAN_SYSTEM_PROMPT,
      personalPrompt: "Bana her zaman net, doğrudan, saygılı ve gerekirse en güncel yazılım standartlarında yanıt ver.",
      reasoningDepth: "deep",
      contextWindow: "128k",
      codeOptimization: true,
      showThinking: true,
      updatedAt: new Date().toISOString(),
    },
    models: getDefaultModels(),
    apiKeys: [],
    users: [],
    conversations: [],
    messages: [],
  };
}

class HilmanStorage {
  private ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (e) {
        console.warn("Storage mkdir error:", e);
      }
    }
  }

  private read(): StorageSchema {
    this.ensureDir();
    if (!fs.existsSync(STORAGE_FILE)) {
      const def = getDefaultState();
      this.write(def);
      return def;
    }

    try {
      const raw = fs.readFileSync(STORAGE_FILE, "utf-8").replace(/^\uFEFF/, "");
      const data = JSON.parse(raw) as StorageSchema;

      if (!data.models || data.models.length === 0) {
        data.models = getDefaultModels();
        this.write(data);
      }

      if (!data.settings.personalPrompt) {
        data.settings.personalPrompt = "Bana her zaman net, doğrudan ve en güncel yazılım standartlarında yanıt ver.";
        this.write(data);
      }

      if (!data.apiKeys) {
        data.apiKeys = [];
        this.write(data);
      }

      if (!data.users) {
        data.users = [];
        this.write(data);
      }

      // Alan göçleri (eski kayıtlarda olmayabilir)
      let dirty = false;
      for (const k of data.apiKeys) {
        if (k.usageCount === undefined) { k.usageCount = 0; dirty = true; }
        if (k.lastUsedAt === undefined) { k.lastUsedAt = null; dirty = true; }
        if (k.ownerEmail === undefined) { k.ownerEmail = null; dirty = true; }
      }
      for (const c of data.conversations) {
        if ((c as any).ownerEmail === undefined) { (c as any).ownerEmail = null; dirty = true; }
      }
      for (const u of data.users) {
        if ((u as any).personalPrompt === undefined) { (u as any).personalPrompt = ""; dirty = true; }
      }
      if (dirty) this.write(data);

      return data;
    } catch (err) {
      // Bozuk/yarım yazılmış dosyada ASLA sessizce sıfırlama yapma —
      // önce yedeği dene, o da yoksa/bozuksa varsayılanla devam et.
      try {
        if (fs.existsSync(BACKUP_FILE)) {
          const bakRaw = fs.readFileSync(BACKUP_FILE, "utf-8").replace(/^\uFEFF/, "");
          const bak = JSON.parse(bakRaw) as StorageSchema;
          if (bak && bak.settings) {
            console.warn("Storage ana dosya bozuk, yedekten kurtarıldı.");
            return bak;
          }
        }
      } catch {
        // yedek de bozuk — aşağıda varsayılan üretilir
      }
      console.warn("Storage read error, resetting to default:", err);
      const def = getDefaultState();
      this.write(def);
      return def;
    }
  }

  private write(data: StorageSchema) {
    this.ensureDir();
    try {
      // Önce mevcut dosyanın yedeğini al (çökme/yarım yazmaya karşı)
      try {
        if (fs.existsSync(STORAGE_FILE)) {
          fs.copyFileSync(STORAGE_FILE, BACKUP_FILE);
        }
      } catch {
        // yedek alınamazsa da yazmaya devam et
      }
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error("Storage write error:", err);
    }
  }

  // SETTINGS
  public getSettings(): AppSettingsData {
    const data = this.read();
    return data.settings;
  }

  public updateSettings(partial: Partial<AppSettingsData>): AppSettingsData {
    const data = this.read();
    data.settings = {
      ...data.settings,
      ...partial,
      updatedAt: new Date().toISOString(),
    };
    this.write(data);
    return data.settings;
  }

  // DYNAMIC MODELS (Admin can add new models, edit, delete)
  public getModels(): CustomModelData[] {
    const data = this.read();
    return data.models || getDefaultModels();
  }

  public addModel(model: {
    name: string;
    id?: string;
    hfLink?: string;
    description?: string;
    badge?: string;
    contextWindow?: string;
  }): CustomModelData {
    const data = this.read();
    if (!data.models) data.models = getDefaultModels();

    const slugId = model.id?.trim() || model.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const newModel: CustomModelData = {
      id: slugId,
      name: model.name.trim(),
      hfLink: model.hfLink?.trim() || "",
      description: model.description?.trim() || "Özel HilmanAI Zeka Modeli",
      badge: model.badge?.trim() || "Yeni",
      contextWindow: model.contextWindow || "128k",
      createdAt: new Date().toISOString(),
    };

    // Remove existing if duplicate ID
    data.models = data.models.filter((m) => m.id !== slugId);
    data.models.push(newModel);
    this.write(data);
    return newModel;
  }

  public deleteModel(id: string): boolean {
    const data = this.read();
    if (!data.models) return false;
    // Don't delete base model
    if (id === "hilmanai-v1-beta") return false;
    data.models = data.models.filter((m) => m.id !== id);
    this.write(data);
    return true;
  }

  // USERS (Google hesabı başına kayıt — geçmiş, anahtar ve prompt buraya bağlanır)
  public getUser(email: string): HilmanUser | null {
    const data = this.read();
    const clean = email.trim().toLowerCase();
    return (data.users || []).find((u) => u.email === clean) || null;
  }

  public upsertUser(input: {
    email: string;
    name: string;
    picture?: string | null;
  }): HilmanUser {
    const data = this.read();
    if (!data.users) data.users = [];
    const clean = input.email.trim().toLowerCase();
    const now = new Date().toISOString();
    let user = data.users.find((u) => u.email === clean);
    if (!user) {
      user = {
        email: clean,
        name: input.name,
        picture: input.picture || null,
        personalPrompt: "",
        createdAt: now,
        lastLoginAt: now,
      };
      data.users.push(user);
    } else {
      user.name = input.name || user.name;
      if (input.picture) user.picture = input.picture;
      user.lastLoginAt = now;
    }
    this.write(data);
    return user;
  }

  public setUserPersonalPrompt(email: string, personalPrompt: string): void {
    const data = this.read();
    const user = (data.users || []).find((u) => u.email === email.trim().toLowerCase());
    if (!user) return;
    user.personalPrompt = personalPrompt;
    this.write(data);
  }

  public getAllUsers(): HilmanUser[] {
    const data = this.read();
    return [...(data.users || [])].sort((a, b) =>
      new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime()
    );
  }

  /** Sohbet kotasından 1 düşürür. Kotasız (null) kullanıcıda hiçbir şey yapmaz. */
  public decrementQuota(email: string): void {
    const data = this.read();
    const user = (data.users || []).find((u) => u.email === email.trim().toLowerCase());
    if (!user || user.quota == null || user.isVip) return;
    user.quota = Math.max(0, user.quota - 1);
    this.write(data);
  }

  public setUserQuota(email: string, quota: number, isVip?: boolean): boolean {    const data = this.read();
    const user = (data.users || []).find((u) => u.email === email.trim().toLowerCase());
    if (!user) return false;
    user.quota = quota;
    if (isVip !== undefined) user.isVip = isVip;
    this.write(data);
    return true;
  }

  // API KEYS (hesap başına MAX 3 — gerçek, kullanımlı, sahipli)
  public getApiKeys(ownerEmail?: string | null): HilmanApiKey[] {
    const data = this.read();
    const keys = data.apiKeys || [];
    if (!ownerEmail) return keys; // admin görünümü
    const clean = ownerEmail.trim().toLowerCase();
    return keys.filter((k) => (k.ownerEmail || "").toLowerCase() === clean);
  }

  public createApiKey(
    name: string,
    ownerEmail?: string | null
  ): { success: boolean; key?: HilmanApiKey; error?: string } {
    const data = this.read();
    if (!data.apiKeys) data.apiKeys = [];
    const clean = (ownerEmail || "").trim().toLowerCase() || null;

    const ownCount = clean
      ? data.apiKeys.filter((k) => (k.ownerEmail || "").toLowerCase() === clean).length
      : data.apiKeys.length;
    if (ownCount >= 3) {
      return {
        success: false,
        error: "Her hesap en fazla 3 adet Hilman API anahtarı oluşturabilir.",
      };
    }

    const randomSecret = crypto.randomBytes(16).toString("hex");
    const newKey: HilmanApiKey = {
      id: `key-${Date.now()}`,
      name: name.trim() || `API Key ${ownCount + 1}`,
      key: `hilman_${randomSecret}`,
      ownerEmail: clean,
      usageCount: 0,
      lastUsedAt: null,
      createdAt: new Date().toISOString(),
    };

    data.apiKeys.push(newKey);
    this.write(data);
    return { success: true, key: newKey };
  }

  public deleteApiKey(id: string, ownerEmail?: string | null): { success: boolean; error?: string } {
    const data = this.read();
    if (!data.apiKeys) data.apiKeys = [];
    const target = data.apiKeys.find((k) => k.id === id);
    if (!target) {
      return { success: false, error: "Anahtar bulunamadı." };
    }
    // Sahibi olmayan (legacy) anahtarları yalnızca admin silebilir;
    // sahipli anahtarı yalnızca sahibi (veya admin) silebilir.
    if (ownerEmail) {
      const clean = ownerEmail.trim().toLowerCase();
      if (!isAdminEmail(clean)) {
        if ((target.ownerEmail || "").toLowerCase() !== clean) {
          return { success: false, error: "Bu anahtarı silme yetkiniz yok." };
        }
      }
    }
    data.apiKeys = data.apiKeys.filter((k) => k.id !== id);
    this.write(data);
    return { success: true };
  }

  public getApiKeyOwner(apiKey: string): HilmanApiKey | null {
    if (!apiKey || !apiKey.startsWith("hilman_")) return null;
    const data = this.read();
    return (data.apiKeys || []).find((k) => k.key === apiKey) || null;
  }

  public validateApiKey(apiKey: string): boolean {
    return this.getApiKeyOwner(apiKey) !== null;
  }

  /** v1 isteklerinde çağrılır — kullanım sayacı + son kullanım damgası */
  public touchApiKeyUsage(apiKey: string): void {
    const data = this.read();
    const target = (data.apiKeys || []).find((k) => k.key === apiKey);
    if (!target) return;
    target.usageCount = (target.usageCount || 0) + 1;
    target.lastUsedAt = new Date().toISOString();
    this.write(data);
  }

  // CONVERSATIONS (hesap bazlı — kimse başkasının geçmişini göremez)
  public getConversations(ownerEmail?: string | null, isAdmin = false): ConversationData[] {
    const data = this.read();
    let list = [...data.conversations];
    if (!isAdmin && ownerEmail) {
      const clean = ownerEmail.trim().toLowerCase();
      list = list.filter((c) => (c.ownerEmail || "").toLowerCase() === clean);
    }
    return list.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  /** Sohbetin sahibini döndürür (yoksa null) */
  public getConversationOwner(id: string): string | null {
    const data = this.read();
    const conv = data.conversations.find((c) => c.id === id);
    if (!conv) return null;
    return (conv.ownerEmail || "").toLowerCase() || null;
  }

  /** Erişim kontrolü: admin her şeye, kullanıcı yalnızca kendininkine erişir */
  public canAccessConversation(id: string, email: string, isAdmin: boolean): boolean {
    if (isAdmin) return true;
    const data = this.read();
    const conv = data.conversations.find((c) => c.id === id);
    if (!conv) return false;
    return (conv.ownerEmail || "").toLowerCase() === email.trim().toLowerCase();
  }

  public getConversation(id: string): { conversation: ConversationData | null; messages: MessageData[] } {
    const data = this.read();
    const conv = data.conversations.find((c) => c.id === id) || null;
    const msgs = data.messages
      .filter((m) => m.conversationId === id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return { conversation: conv, messages: msgs };
  }

  public createConversation(conv: Partial<ConversationData> & { id: string }): ConversationData {
    const data = this.read();
    const newConv: ConversationData = {
      id: conv.id,
      title: conv.title || "Yeni Sohbet",
      model: conv.model || data.settings.defaultModel,
      provider: "hilman-engine",
      ownerEmail: (conv.ownerEmail || "").toLowerCase() || null,
      systemPrompt: conv.systemPrompt || data.settings.systemPrompt,
      isPinned: !!conv.isPinned,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.conversations.unshift(newConv);
    this.write(data);
    return newConv;
  }

  public updateConversation(id: string, partial: Partial<ConversationData>): ConversationData | null {
    const data = this.read();
    const idx = data.conversations.findIndex((c) => c.id === id);
    if (idx === -1) return null;

    data.conversations[idx] = {
      ...data.conversations[idx],
      ...partial,
      updatedAt: new Date().toISOString(),
    };
    this.write(data);
    return data.conversations[idx];
  }

  public deleteConversation(id: string): boolean {
    const data = this.read();
    data.conversations = data.conversations.filter((c) => c.id !== id);
    data.messages = data.messages.filter((m) => m.conversationId !== id);
    this.write(data);
    return true;
  }

  // MESSAGES
  public addMessage(msg: Partial<MessageData> & { id: string; conversationId: string; role: "user" | "assistant" | "system"; content: string }): MessageData {
    const data = this.read();
    const newMsg: MessageData = {
      id: msg.id,
      conversationId: msg.conversationId,
      role: msg.role,
      content: msg.content,
      reasoning: msg.reasoning || null,
      imageUrl: msg.imageUrl || null,
      videoUrl: msg.videoUrl || null,
      mediaType: msg.mediaType || "text",
      feedback: null,
      model: msg.model || data.settings.defaultModel,
      provider: "hilman-engine",
      tokensUsed: msg.tokensUsed || null,
      latencyMs: msg.latencyMs || null,
      searchResults: msg.searchResults || null,
      followUps: msg.followUps || null,
      isError: !!msg.isError,
      createdAt: new Date().toISOString(),
    };
    data.messages.push(newMsg);

    const convIdx = data.conversations.findIndex((c) => c.id === msg.conversationId);
    if (convIdx !== -1) {
      data.conversations[convIdx].updatedAt = new Date().toISOString();
    }

    this.write(data);
    return newMsg;
  }

  public getMessage(id: string): MessageData | null {
    const data = this.read();
    return (data.messages || []).find((m) => m.id === id) || null;
  }

  public setMessageFeedback(id: string, feedback: "like" | "dislike" | null): boolean {    const data = this.read();
    const msg = data.messages.find((m) => m.id === id);
    if (!msg) return false;
    msg.feedback = feedback;
    this.write(data);
    return true;
  }

  public getRecentMessages(conversationId: string, limit = 10): MessageData[] {
    const data = this.read();
    const msgs = data.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return msgs.slice(-limit);
  }

  public getAllMessages(): MessageData[] {
    const data = this.read();
    return [...data.messages].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public clearMessages(conversationId: string): void {
    const data = this.read();
    data.messages = data.messages.filter((m) => m.conversationId !== conversationId);
    this.write(data);
  }
}

export const hilmanStorage = new HilmanStorage();
