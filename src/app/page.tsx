"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Zap,
  Code,
  Compass,
  Activity,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Layers,
  Terminal,
  RefreshCw,
  Loader2,
  Brain,
  Eye,
  Image as ImageIcon,
  Video as VideoIcon,
  Key,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { SettingsModal } from "@/components/SettingsModal";
import { DiagnosticsModal } from "@/components/DiagnosticsModal";
import { ExportModal } from "@/components/ExportModal";
import { AdminPanelModal } from "@/components/AdminPanelModal";
import { CodePreviewPanel } from "@/components/CodePreviewPanel";
import { QUICK_PROMPTS, AVAILABLE_MODELS, CHAT_MODES, type ChatModeId, type ToolType } from "@/lib/constants";
import type { ConversationData, MessageData, CustomModelData } from "@/lib/storage";
import { LoginScreen } from "@/components/LoginScreen";
import { ChangelogModal, type ChangelogNoteData } from "@/components/ChangelogModal";

export interface AuthUser {
  email: string;
  name: string;
  picture?: string | null;
  isAdmin: boolean;
  plan?: "free" | "premium" | "premium_plus";
  quota?: number | null;
  isVip?: boolean;
}

export default function HilmanChatPage() {
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Auth (Google zorunlu — girişsiz AI açılmaz)
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Açılış duyurusu
  const [changelogNote, setChangelogNote] = useState<ChangelogNoteData | null>(null);

  // App settings state & Dynamic Models
  const [selectedModel, setSelectedModel] = useState<string>("hilmanai-v1-beta");
  const [availableModels, setAvailableModels] = useState<CustomModelData[]>([]);
  const [activeProvider, setActiveProvider] = useState<string>("hilman-engine");
  const [currentMode, setCurrentMode] = useState<ChatModeId>("düşünen");

  // Code Preview Side Panel State
  const [codePreviewOpen, setCodePreviewOpen] = useState(false);
  const [previewCode, setPreviewCode] = useState("");
  const [previewLang, setPreviewLang] = useState("html");

  // Modals state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load initial settings, models and conversations
  useEffect(() => {
    checkSession();
  }, []);

  const convStorageKey = () => `hilman_active_conv_${user?.email || "anon"}`;

  const checkSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        loadSettings();
        loadModels();
        loadConversations(true, data.user.email);
        loadChangelog(data.user.email);
      }
    } catch (e) {
      console.error("Session check failed:", e);
    } finally {
      setAuthLoading(false);
    }
  };

  const loadChangelog = async (email: string) => {
    try {
      const res = await fetch("/api/changelog");
      if (res.status === 401) return;
      const data = await res.json();
      if (data.success && data.note && data.note.id) {
        const seenKey = `hilman_changelog_seen_${email}_${data.note.id}`;
        if (typeof window !== "undefined" && !localStorage.getItem(seenKey)) {
          setChangelogNote(data.note);
        }
      }
    } catch (e) {
      console.error("Changelog load failed:", e);
    }
  };

  const closeChangelog = () => {
    if (changelogNote && user && typeof window !== "undefined") {
      localStorage.setItem(`hilman_changelog_seen_${user.email}_${changelogNote.id}`, "1");
    }
    setChangelogNote(null);
  };

  const handleLoggedIn = (u: AuthUser) => {
    setUser(u);
    setMessages([]);
    setActiveConversationId(null);
    loadSettings();
    loadModels();
    loadConversations(true, u.email);
    loadChangelog(u.email);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setUser(null);
    setMessages([]);
    setConversations([]);
    setActiveConversationId(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(convStorageKey());
    }
  };

  const loadModels = async () => {
    try {
      const res = await fetch("/api/models");
      const data = await res.json();
      if (data.success && data.models) {
        setAvailableModels(data.models);
      }
    } catch (e) {
      console.error("Failed to load models:", e);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        setSelectedModel(data.settings.defaultModel || "hilmanai-v1-beta");
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  };

  const loadConversations = async (autoSelect = false, emailOverride?: string) => {
    try {
      const res = await fetch("/api/conversations");
      if (res.status === 401) {
        setUser(null);
        return;
      }
      const data = await res.json();
      if (data.success && data.conversations) {
        setConversations(data.conversations);
        if (autoSelect && data.conversations.length > 0) {
          const key = `hilman_active_conv_${emailOverride || user?.email || "anon"}`;
          const savedId = typeof window !== "undefined" ? localStorage.getItem(key) : null;
          const target = data.conversations.find((c: any) => c.id === savedId) || data.conversations[0];
          if (target) {
            selectConversation(target.id);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load conversations:", e);
    }
  };

  const selectConversation = async (id: string) => {
    setActiveConversationId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(convStorageKey(), id);
    }
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.status === 401) {
        setUser(null);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
        if (data.conversation?.model) {
          setSelectedModel(data.conversation.model);
        }
      }
    } catch (e) {
      console.error("Failed to load conversation messages:", e);
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(convStorageKey());
    }
  };

  const handleSendMessage = async (
    userText: string,
    mode: ChatModeId = currentMode,
    attachedFile?: { name: string; content: string; type?: string } | null,
    toolType: ToolType = "chat"
  ) => {
    if (!userText.trim() && !attachedFile) return;
    if (isLoading) return;

    // Optimistically append user message
    const isImage = attachedFile?.type?.startsWith("image/");
    const tempUserMsg: MessageData = {
      id: `temp-${Date.now()}`,
      conversationId: activeConversationId || "new",
      role: "user",
      content: userText || (isImage ? "Bu görseli analiz et" : attachedFile?.name || "Dosya analizi"),
      reasoning: null,
      imageUrl: isImage ? attachedFile?.content : null,
      mediaType: isImage ? "vision" : "text",
      model: selectedModel,
      provider: "hilman-engine",
      tokensUsed: null,
      latencyMs: null,
      isError: false,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId,
          message: userText,
          model: selectedModel,
          mode: mode,
          attachedFile,
          toolType,
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        setUser(null);
        return;
      }

      if (data.success && data.message) {
        if (data.isNewConversation) {
          setActiveConversationId(data.conversationId);
          if (typeof window !== "undefined") {
            localStorage.setItem(convStorageKey(), data.conversationId);
          }
          loadConversations(false);
        }

        setMessages((prev) => [...prev, data.message]);

        // Kota göstergesini güncel tut
        fetch("/api/auth/me")
          .then((r) => r.json())
          .then((md) => {
            if (md.success && md.user) setUser(md.user);
          })
          .catch(() => {});

        // Auto-detect code in assistant reply and open live preview panel
        const codeMatch = data.message.content.match(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/);
        if (codeMatch && codeMatch[2]) {
          setPreviewLang(codeMatch[1] || "html");
          setPreviewCode(codeMatch[2].trim());
          setCodePreviewOpen(true);
        }
      } else {
        const errorMsg: MessageData = {
          id: `err-${Date.now()}`,
          conversationId: activeConversationId || "new",
          role: "assistant",
          content: `${data.error || "İstek işlenirken bir sorun oluştu."}`,
          reasoning: null,
          model: selectedModel,
          provider: "hilman-engine",
          tokensUsed: null,
          latencyMs: null,
          isError: true,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      const networkErrorMsg: MessageData = {
        id: `err-${Date.now()}`,
        conversationId: activeConversationId || "new",
        role: "assistant",
        content: `Bağlantı hatası: ${err.message}`,
        reasoning: null,
        model: selectedModel,
        provider: "hilman-engine",
        tokensUsed: null,
        latencyMs: null,
        isError: true,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, networkErrorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTestMessage = () => {
    handleSendMessage("Test mesajı: HilmanAI v1 Beta sistem çekirdeği aktif mi? Yanıt süresi ve durum kontrolü yap.");
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (activeConversationId === id) {
        handleNewChat();
      }
      loadConversations();
    } catch (e) {
      console.error("Delete conversation error:", e);
    }
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      loadConversations();
    } catch (e) {
      console.error("Rename conversation error:", e);
    }
  };

  const handleTogglePin = async (id: string, currentPin: boolean) => {
    try {
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !currentPin }),
      });
      loadConversations();
    } catch (e) {
      console.error("Pin conversation error:", e);
    }
  };

  const handleClearChat = async () => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    if (confirm("Bu sohbetteki tüm mesajları temizlemek istediğinize emin misiniz?")) {
      try {
        await fetch(`/api/conversations/${activeConversationId}/messages`, {
          method: "DELETE",
        });
        setMessages([]);
      } catch (e) {
        console.error("Clear chat error:", e);
      }
    }
  };

  const handleRegenerateLast = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content);
    }
  };

  const currentConversation =
    conversations.find((c) => c.id === activeConversationId) || null;

  // Giriş yoksa AI açılmaz — havalı login ekranı
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#05060a] flex flex-col items-center justify-center gap-4 text-slate-400">
        <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-cyan-500/30 bg-black">
          <img src="/hilman-logo.png" alt="HilmanAI" className="w-full h-full object-cover animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>HilmanAI hazırlanıyor...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLoggedIn={handleLoggedIn} />;
  }

  return (
    <div className="flex h-screen bg-[#08090d] text-slate-100 overflow-hidden font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Left Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations as any}
        activeConversationId={activeConversationId}
        onSelectConversation={selectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onTogglePinConversation={handleTogglePin}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenDiagnostics={() => setDiagnosticsOpen(true)}
        activeProvider="hilman-engine"
      />

      {/* Main Chat Viewport */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenDiagnostics={() => setDiagnosticsOpen(true)}
          onOpenExport={() => setExportOpen(true)}
          onOpenAdminPanel={() => setAdminPanelOpen(true)}
          onNewChat={handleNewChat}
          onClearChat={handleClearChat}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          availableModels={availableModels}
          activeProvider="hilman-engine"
          hasMessages={messages.length > 0}
          user={user}
          onLogout={handleLogout}
        />

        {/* Message Thread or Welcome Hero */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {messages.length === 0 ? (
            /* EXECUTIVE WELCOME HERO */
            <div className="h-full flex flex-col items-center justify-center p-4 sm:p-8 max-w-4xl mx-auto">
              <div className="text-center space-y-4 mb-8">
                {/* Radiant Official HilmanAI Logo */}
                <div className="inline-flex relative mb-2">
                  <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/30 via-indigo-500/30 to-purple-500/30 rounded-full blur-2xl animate-pulse" />
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-cyan-400/40 shadow-2xl bg-black p-0.5">
                    <img
                      src="/hilman-logo.png"
                      alt="HilmanAI Logo"
                      className="w-full h-full object-cover rounded-[14px]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>HilmanAI v1 Beta • Çok Modlu Zeka Motoru</span>
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                    HilmanAI v1 Beta
                  </h1>
                  <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
                    Gemini kalitesinde çok modlu yapay zeka: Derin muhakeme & kodlama, Vision görsel analizi, görsel çizimi ve video oluşturma.
                  </p>
                </div>

                {/* Multimodal Capability Badges */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => setDiagnosticsOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-400 font-medium transition-colors"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Developer API & SDK</span>
                  </button>
                  {user.isAdmin && (
                    <button
                      onClick={() => setAdminPanelOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-slate-300 transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Admin Paneli</span>
                    </button>
                  )}
                  <button
                    onClick={handleSendTestMessage}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-slate-300 transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Hızlı Test</span>
                  </button>
                </div>
              </div>

              {/* Starter Quick Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {QUICK_PROMPTS.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(qp.prompt)}
                    className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] hover:border-emerald-500/30 text-left transition-all group flex items-start justify-between gap-3 shadow-sm"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {qp.icon === "sparkles" && <Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
                        {qp.icon === "code" && <Code className="w-3.5 h-3.5 text-cyan-400" />}
                        {qp.icon === "compass" && <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />}
                        {qp.icon === "zap" && <VideoIcon className="w-3.5 h-3.5 text-amber-400" />}
                        <span className="font-semibold text-xs text-slate-200 group-hover:text-white">
                          {qp.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {qp.prompt}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ACTIVE CHAT MESSAGE STREAM */
            <div className="max-w-4xl mx-auto divide-y divide-transparent">
              {messages.map((msg, index) => {
                const isLastAssistant =
                  msg.role === "assistant" && index === messages.length - 1;
                return (
                  <ChatMessage
                    key={msg.id || index}
                    message={msg}
                    onRegenerate={handleRegenerateLast}
                    isLastAssistant={isLastAssistant}
                    onOpenCodePreview={(code, lang) => {
                      setPreviewCode(code);
                      setPreviewLang(lang);
                      setCodePreviewOpen(true);
                    }}
                  />
                );
              })}

              {/* Takip soruları (son asistan yanıtının altında) */}
              {!isLoading &&
                (() => {
                  const lastAssistant = [...messages]
                    .reverse()
                    .find((m) => m.role === "assistant" && m.followUps && m.followUps.length > 0);
                  if (!lastAssistant?.followUps) return null;
                  return (
                    <div className="px-3 md:px-6 pb-3 flex flex-wrap gap-2">
                      {lastAssistant.followUps.slice(0, 3).map((fu, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(fu)}
                          className="px-3 py-1.5 rounded-full text-xs text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 transition-colors"
                        >
                          {fu}
                        </button>
                      ))}
                    </div>
                  );
                })()}

              {/* Typing / Generating Loader */}
              {isLoading && (
                <div className="flex gap-4 py-5 px-3 md:px-6 bg-[#111319]/70 border-y border-white/[0.03]">
                  <div className="w-8 h-8 rounded-xl overflow-hidden border border-cyan-500/30 shadow-md shadow-indigo-500/20 bg-black shrink-0">
                    <img
                      src="/hilman-logo.png"
                      alt="HilmanAI"
                      className="w-full h-full object-cover animate-pulse"
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-medium text-slate-200">HilmanAI</span>
                      <span className="text-[11px] text-indigo-400 flex items-center gap-1.5 font-medium">
                        <Brain className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
                        {currentMode === "düşünen"
                          ? "Derinlemesine muhakeme yapıyor ve planlıyor..."
                          : currentMode === "pro"
                          ? "Kıdemli mimar standartlarında kod hazırlıyor..."
                          : "Hızlı yanıt üretiliyor..."}
                      </span>
                    </div>
                    <div className="h-4 w-48 bg-white/5 rounded animate-pulse" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Bottom Input Field */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          onSendTestMessage={handleSendTestMessage}
          currentMode={currentMode}
          onSelectMode={setCurrentMode}
        />
      </div>

      {/* Code Live Preview Side Panel (Opens when assistant outputs runnable code) */}
      <CodePreviewPanel
        isOpen={codePreviewOpen}
        onClose={() => setCodePreviewOpen(false)}
        code={previewCode}
        language={previewLang}
      />

      {/* Admin Panel Modal (yalnızca admin Google hesabı görür) */}
      {user.isAdmin && (
        <AdminPanelModal
          isOpen={adminPanelOpen}
          onClose={() => setAdminPanelOpen(false)}
          onModelUpdated={() => {
            loadModels();
          }}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSettingsSaved={() => {
          loadSettings();
          loadModels();
        }}
      />

      {/* Diagnostics / API Keys Modal */}
      <DiagnosticsModal
        isOpen={diagnosticsOpen}
        onClose={() => setDiagnosticsOpen(false)}
        selectedModel={selectedModel}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        conversation={currentConversation as any}
        messages={messages as any}
      />

      {/* Açılış Duyurusu */}
      {changelogNote && (
        <ChangelogModal note={changelogNote} onClose={closeChangelog} />
      )}
    </div>
  );
}
