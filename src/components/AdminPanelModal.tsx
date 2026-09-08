"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  X,
  MessageSquare,
  Cpu,
  Terminal,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Plus,
  Save,
  Check,
  RotateCcw,
  Loader2,
  Layers,
  ExternalLink,
  Calendar,
  Sparkles,
  Users,
  Sliders,
  Brain,
  Code,
  Megaphone,
} from "lucide-react";
import type { MessageData, CustomModelData, HilmanUser } from "@/lib/storage";

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModelUpdated?: () => void;
}

export function AdminPanelModal({ isOpen, onClose, onModelUpdated }: AdminPanelModalProps) {
  const [activeTab, setActiveTab] = useState<"messages" | "models" | "system_prompt" | "users" | "engine" | "changelog">("messages");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Stats & Messages State
  const [stats, setStats] = useState<{
    totalMessages: number;
    userMessagesCount: number;
    assistantMessagesCount: number;
    likedCount: number;
    dislikedCount: number;
    satisfactionRate: number;
    totalUsers: number;
  }>({
    totalMessages: 0,
    userMessagesCount: 0,
    assistantMessagesCount: 0,
    likedCount: 0,
    dislikedCount: 0,
    satisfactionRate: 100,
    totalUsers: 0,
  });
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [messageFilter, setMessageFilter] = useState<"all" | "like" | "dislike">("all");

  // Models State
  const [models, setModels] = useState<CustomModelData[]>([]);
  const [newModelName, setNewModelName] = useState("");
  const [newModelId, setNewModelId] = useState("");
  const [newModelHfLink, setNewModelHfLink] = useState("");
  const [newModelDesc, setNewModelDesc] = useState("");
  const [newModelBadge, setNewModelBadge] = useState("");

  // Duyuru (changelog) State
  const [chgTitle, setChgTitle] = useState("");
  const [chgBody, setChgBody] = useState("");
  const [chgId, setChgId] = useState<string | null>(null);

  // Users & Quota State
  const [users, setUsers] = useState<HilmanUser[]>([]);
  const [planEdits, setPlanEdits] = useState<Record<string, { plan: string; quota: string }>>({});

  // Global System Prompt State
  const [systemPrompt, setSystemPrompt] = useState("");

  // Motor Parametreleri (admin'e özel — herkese uygulanır)
  const [defaultModel, setDefaultModel] = useState("hilmanai-v1-beta");
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState(2048);
  const [reasoningDepth, setReasoningDepth] = useState<"standard" | "deep" | "extreme">("deep");
  const [contextWindow, setContextWindow] = useState<"32k" | "64k" | "128k">("128k");
  const [codeOptimization, setCodeOptimization] = useState(true);
  const [showThinking, setShowThinking] = useState(true);
  // Senin modelin (HF Space / kendi sunucun — önce burası denenir)
  const [customEndpoint, setCustomEndpoint] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [customApiKey, setCustomApiKey] = useState("");
  const [hasCustomKey, setHasCustomKey] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    loadAdminData();
  }, [isOpen]);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin");
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setMessages(data.messages || []);
        setModels(data.models || []);
        setSystemPrompt(data.systemPrompt || "");
        setUsers(data.users || []);
        setPlanEdits({});
        if (data.changelog) {
          setChgId(data.changelog.id);
          setChgTitle(data.changelog.title || "");
          setChgBody(data.changelog.body || "");
        } else {
          setChgId(null);
          setChgTitle("");
          setChgBody("");
        }
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
    }
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        setDefaultModel(s.defaultModel || "hilmanai-v1-beta");
        setTemperature(s.temperature || "0.7");
        setMaxTokens(s.maxTokens || 2048);
        setReasoningDepth(s.reasoningDepth || "deep");
        setContextWindow(s.contextWindow || "128k");
        setCodeOptimization(s.codeOptimization !== false);
        setShowThinking(s.showThinking !== false);
        setCustomEndpoint(s.customEndpoint || "");
        setCustomModel(s.customModel || "");
        setHasCustomKey(!!s.hasCustomKey);
        setCustomApiKey("");
      }
    } catch (err) {
      console.error("Failed to load engine settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSystemPrompt = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_system_prompt",
          systemPrompt,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      } else {
        alert(data.error || "Hata oluştu.");
      }
    } catch (e) {
      console.error(e);
      alert("Sistem promptu güncellenemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelName.trim()) {
      alert("Lütfen model adı girin.");
      return;
    }

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_model",
          name: newModelName.trim(),
          id: newModelId.trim() || undefined,
          hfLink: newModelHfLink.trim() || undefined,
          description: newModelDesc.trim() || "Özel HilmanAI Zeka Modeli",
          badge: newModelBadge.trim() || "Yeni",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewModelName("");
        setNewModelId("");
        setNewModelHfLink("");
        setNewModelDesc("");
        setNewModelBadge("");
        loadAdminData();
        if (onModelUpdated) onModelUpdated();
      } else {
        alert(data.error || "Model eklenemedi.");
      }
    } catch (e) {
      console.error(e);
      alert("Model eklenirken bir hata oluştu.");
    }
  };

  const handleSetPlan = async (email: string) => {
    const edit = planEdits[email];
    if (!edit) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_plan",
          email,
          plan: edit.plan,
          quota: edit.quota.trim() === "" ? undefined : Number(edit.quota),
        }),
      });
      const data = await res.json();
      if (data.success) {
        loadAdminData();
      } else {
        alert(data.error || "Plan güncellenemedi.");
      }
    } catch (e) {
      console.error(e);
      alert("Plan güncellenirken bir hata oluştu.");
    }
  };

  const handleSaveEngine = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultModel,
          temperature,
          maxTokens,
          reasoningDepth,
          contextWindow,
          codeOptimization,
          showThinking,
          customEndpoint,
          customModel,
          ...(customApiKey.trim() ? { customApiKey: customApiKey.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      } else {
        alert(data.error || "Motor ayarları kaydedilemedi.");
      }
    } catch (e) {
      console.error(e);
      alert("Motor ayarları kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveChangelog = async () => {
    if (!chgBody.trim()) {
      alert("Duyuru metni boş olamaz.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_changelog", title: chgTitle, body: chgBody }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
        loadAdminData();
      } else {
        alert(data.error || "Duyuru kaydedilemedi.");
      }
    } catch (e) {
      console.error(e);
      alert("Duyuru kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearChangelog = async () => {
    if (!confirm("Aktif duyuruyu kaldırmak istediğinize emin misiniz?")) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_changelog" }),
      });
      const data = await res.json();
      if (data.success) loadAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteModel = async (id: string) => {    if (!confirm("Bu modeli kaldırmak istediğinize emin misiniz?")) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_model",
          id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        loadAdminData();
        if (onModelUpdated) onModelUpdated();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const filteredMessages = messages.filter((m) => {
    if (messageFilter === "like") return m.feedback === "like";
    if (messageFilter === "dislike") return m.feedback === "dislike";
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl rounded-2xl bg-[#0e1017] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-emerald-500/20 border border-indigo-500/30 text-indigo-400">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>HilmanAI Yönetici (Admin) Paneli</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                  Aktif Yönetim
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Kullanıcı mesajlarını, Hilman yanıtlarını, beğenileri, modelleri ve sistem çekirdek promptunu yönetin.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-5 border-b border-white/[0.08] bg-white/[0.01] gap-6 text-xs font-medium">
          <button
            onClick={() => setActiveTab("messages")}
            className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "messages"
                ? "border-emerald-400 text-emerald-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Mesaj İzleme & Geri Bildirimler</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
              {stats.totalMessages}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("models")}
            className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "models"
                ? "border-emerald-400 text-emerald-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Model Yönetimi (HF / Dinamik)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
              {models.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("system_prompt")}
            className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "system_prompt"
                ? "border-emerald-400 text-emerald-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Global Sistem Promptu</span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "users"
                ? "border-emerald-400 text-emerald-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Kullanıcılar & Kota</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("engine")}
            className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "engine"
                ? "border-emerald-400 text-emerald-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Motor Parametreleri</span>
          </button>

          <button
            onClick={() => setActiveTab("changelog")}
            className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "changelog"
                ? "border-emerald-400 text-emerald-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>Duyuru</span>
            {chgId && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm flex-1">
          {/* TAB 1: MESAJ İZLEME */}
          {activeTab === "messages" && (
            <div className="space-y-4">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[11px] text-slate-400 block">Toplam Mesaj</span>
                  <span className="text-lg font-bold text-white">{stats.totalMessages}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[11px] text-emerald-400 block flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" /> Beğenilenler
                  </span>
                  <span className="text-lg font-bold text-emerald-400">{stats.likedCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[11px] text-red-400 block flex items-center gap-1">
                    <ThumbsDown className="w-3 h-3" /> Beğenilmeyenler
                  </span>
                  <span className="text-lg font-bold text-red-400">{stats.dislikedCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[11px] text-cyan-400 block">Memnuniyet Oranı</span>
                  <span className="text-lg font-bold text-cyan-300">%{stats.satisfactionRate}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[11px] text-indigo-400 block">Kayıtlı Kullanıcı</span>
                  <span className="text-lg font-bold text-indigo-300">{stats.totalUsers}</span>
                </div>
              </div>

              {/* Message Filter Chips */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-semibold text-slate-300">Hilman & Kullanıcı Mesaj Kayıtları</span>
                <div className="flex items-center gap-1.5 p-1 rounded-lg bg-black/40 border border-white/5 text-xs">
                  <button
                    onClick={() => setMessageFilter("all")}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      messageFilter === "all"
                        ? "bg-white/10 text-white font-medium"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Tümü
                  </button>
                  <button
                    onClick={() => setMessageFilter("like")}
                    className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                      messageFilter === "like"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <ThumbsUp className="w-3 h-3 text-emerald-400" />
                    <span>Beğenilen ({stats.likedCount})</span>
                  </button>
                  <button
                    onClick={() => setMessageFilter("dislike")}
                    className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                      messageFilter === "dislike"
                        ? "bg-red-500/20 text-red-300 border border-red-500/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <ThumbsDown className="w-3 h-3 text-red-400" />
                    <span>Beğenilmeyen ({stats.dislikedCount})</span>
                  </button>
                </div>
              </div>

              {/* Message List */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {filteredMessages.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 rounded-xl border border-white/5 bg-black/20">
                    Henüz kayıtlı mesaj bulunmuyor veya seçilen filtreye uygun kayıt yok.
                  </div>
                ) : (
                  filteredMessages.map((m) => {
                    const isUser = m.role === "user";
                    return (
                      <div
                        key={m.id}
                        className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                isUser
                                  ? "bg-slate-700/60 text-slate-200"
                                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              }`}
                            >
                              {isUser ? "Kullanıcı" : "HilmanAI"}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {new Date(m.createdAt).toLocaleString("tr-TR")}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {m.feedback === "like" && (
                              <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                                <ThumbsUp className="w-3 h-3" /> Beğenildi
                              </span>
                            )}
                            {m.feedback === "dislike" && (
                              <span className="flex items-center gap-1 text-[11px] text-red-400 bg-red-950/40 px-2 py-0.5 rounded border border-red-500/30">
                                <ThumbsDown className="w-3 h-3" /> Beğenilmedi
                              </span>
                            )}
                            {!m.feedback && !isUser && (
                              <span className="text-[10px] text-slate-500">Nötr</span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap line-clamp-3">
                          {m.content}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MODEL YÖNETİMİ (HF / DİNAMİK MODEL EKLEME) */}
          {activeTab === "models" && (
            <div className="space-y-5">
              {/* Add Model Form */}
              <form
                onSubmit={handleAddModel}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Yeni Hilman Zeka Modeli Ekle (Hugging Face / Özel Link)</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Buraya eklediğiniz model anında üst kısımdaki model seçiciye yerleşir ve aktif olarak seçilebilir.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Model Adı *</label>
                    <input
                      type="text"
                      value={newModelName}
                      onChange={(e) => setNewModelName(e.target.value)}
                      placeholder="Örn: HilmanAI v2 Pro"
                      className="w-full bg-[#13151b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Model ID / Kod Adı (Opsiyonel)</label>
                    <input
                      type="text"
                      value={newModelId}
                      onChange={(e) => setNewModelId(e.target.value)}
                      placeholder="Örn: hilmanai-v2-pro"
                      className="w-full bg-[#13151b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] text-slate-400">Model / GGUF Sayfa Bağlantısı</label>
                    <input
                      type="text"
                      value={newModelHfLink}
                      onChange={(e) => setNewModelHfLink(e.target.value)}
                      placeholder="Model ağırlık sayfasının bağlantısı (opsiyonel)"
                      className="w-full bg-[#13151b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] text-slate-400">Model Açıklaması</label>
                    <input
                      type="text"
                      value={newModelDesc}
                      onChange={(e) => setNewModelDesc(e.target.value)}
                      placeholder="Modelin temel kabiliyetleri ve kullanım alanı"
                      className="w-full bg-[#13151b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Rozet / Etiket</label>
                    <input
                      type="text"
                      value={newModelBadge}
                      onChange={(e) => setNewModelBadge(e.target.value)}
                      placeholder="Örn: v2 Ultra, Hızlı, Muhakeme"
                      className="w-full bg-[#13151b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full py-2 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Modeli Sisteme Ekle</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Existing Models */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300">Sistemdeki Aktif Modeller</span>
                <div className="space-y-2">
                  {models.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-white">{m.name}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                            {m.badge}
                          </span>
                          {m.isDefault && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                              Varsayılan Amiral
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate max-w-lg">{m.description}</p>
                        {m.hfLink && (
                          <a
                            href={m.hfLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span>{m.hfLink}</span>
                          </a>
                        )}
                      </div>

                      {!m.isDefault && m.id !== "hilmanai-v1-beta" && m.id !== "hilmanai-v2-beta" && (
                        <button
                          onClick={() => handleDeleteModel(m.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                          title="Modeli Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GLOBAL SİSTEM PROMPTU */}
          {activeTab === "system_prompt" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-semibold text-xs text-slate-200 uppercase tracking-wider block">
                    HilmanAI Global Sistem Çekirdek Promptu
                  </label>
                  <p className="text-xs text-slate-400">
                    Tüm kullanıcı oturumlarında HilmanAI&apos;ın sabit kimliğini, kurallarını ve çalışma prensiplerini belirler.
                  </p>
                </div>
              </div>

              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={12}
                className="w-full bg-[#13151b] text-slate-200 border border-white/10 rounded-xl p-3.5 text-xs font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-y"
              />

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500 font-mono">
                  {systemPrompt.length} karakter
                </span>
                <button
                  onClick={handleSaveSystemPrompt}
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-all flex items-center gap-2 shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : savedSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Kaydedildi!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Sistem Promptunu Güncelle</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB: MOTOR PARAMETRELERİ */}
          {activeTab === "engine" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Tüm kullanıcılara uygulanan global motor ayarları. Değişiklikler anında geçerli olur.
              </p>
              <div className="space-y-1.5">
                <label className="font-semibold text-xs text-slate-200 uppercase tracking-wider block">
                  Varsayılan Model
                </label>
                <select
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  className="w-full bg-[#13151b] text-slate-200 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 font-medium"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.badge})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-xs text-slate-200">
                    Sıcaklık (Temperature): {temperature}
                  </label>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-xs text-slate-200">
                    Maksimum Yanıt Uzunluğu: {maxTokens} token
                  </label>
                </div>
                <input
                  type="range"
                  min="256"
                  max="4096"
                  step="128"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold text-xs text-slate-200">
                    Düşünce Süreci Derinliği
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["standard", "deep", "extreme"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setReasoningDepth(lvl)}
                      className={`p-2.5 rounded-lg border text-xs font-medium transition-all text-center ${
                        reasoningDepth === lvl
                          ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/50"
                          : "bg-black/30 border-white/5 text-slate-400 hover:text-white"
                      }`}
                    >
                      {lvl === "standard" ? "Standart" : lvl === "deep" ? "Derin" : "Ekstrem"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-xs text-slate-200">Bağlam Penceresi</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["32k", "64k", "128k"] as const).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setContextWindow(w)}
                      className={`p-2 rounded-lg border text-xs font-mono transition-all text-center ${
                        contextWindow === w
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                          : "bg-black/30 border-white/5 text-slate-400 hover:text-white"
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 cursor-pointer hover:bg-white/[0.04] transition-colors">
                  <input
                    type="checkbox"
                    checked={codeOptimization}
                    onChange={(e) => setCodeOptimization(e.target.checked)}
                    className="mt-0.5 accent-emerald-500 rounded"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-semibold text-xs text-slate-200">Clean Code Optimizasyonu</span>
                    </div>
                  </div>
                </label>
                <label className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 cursor-pointer hover:bg-white/[0.04] transition-colors">
                  <input
                    type="checkbox"
                    checked={showThinking}
                    onChange={(e) => setShowThinking(e.target.checked)}
                    className="mt-0.5 accent-indigo-500 rounded"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-semibold text-xs text-slate-200">Düşünce Zincirini Göster</span>
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end pt-1">
                <button
                  onClick={handleSaveEngine}
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-all flex items-center gap-2 shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : savedSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Kaydedildi!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Motor Ayarlarını Kaydet</span>
                    </>
                  )}
                </button>
              </div>

              {/* Senin modelin (önce burası denenir, olmazsa buluta düşer) */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-200">
                    🤖 Senin Modelin (HilmanAI-7B)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {customEndpoint ? "● bağlı" : "○ kapalı"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  HF Space veya kendi sunucunun adresini yaz (örn.{" "}
                  <span className="font-mono">https://kullanici-adi-hilmanai-7b.hf.space</span>).
                  Doluysa tüm cevaplar önce senin modelinden gelir; uyuyorsa site otomatik buluta düşer.
                </p>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Endpoint (https://... — /v1 olmadan)</label>
                  <input
                    type="text"
                    value={customEndpoint}
                    onChange={(e) => setCustomEndpoint(e.target.value)}
                    placeholder="https://....hf.space"
                    className="w-full bg-[#13151b] text-slate-200 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Model adı (isteğe bağlı)</label>
                    <input
                      type="text"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      placeholder="hilmanai-7b"
                      className="w-full bg-[#13151b] text-slate-200 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">
                      API anahtarı {hasCustomKey ? "(kayıtlı ✓ — boş bırakılırsa korunur)" : "(gerekirse)"}
                    </label>
                    <input
                      type="password"
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      placeholder={hasCustomKey ? "••••••••" : "gerekirse yaz"}
                      className="w-full bg-[#13151b] text-slate-200 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DUYURU */}
          {activeTab === "changelog" && (
            <div className="space-y-3">
              <div>
                <label className="font-semibold text-xs text-slate-200 uppercase tracking-wider block">
                  Site Açılış Duyurusu
                </label>
                <p className="text-xs text-slate-400 mt-1">
                  Kaydettiğiniz not, kullanıcılar sohbet ekranını açtığında ortada şık bir
                  pencere olarak gösterilir. Kapatıp yeniden kaydederseniz herkese tekrar gösterilir.
                </p>
              </div>
              {chgId && (
                <div className="text-[11px] text-emerald-400 font-mono">
                  ● Yayında (ID: {chgId})
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Başlık</label>
                <input
                  type="text"
                  value={chgTitle}
                  onChange={(e) => setChgTitle(e.target.value)}
                  placeholder="Örn: HilmanAI v2 Yayında!"
                  className="w-full bg-[#13151b] text-slate-200 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Metin (Markdown destekler)</label>
                <textarea
                  value={chgBody}
                  onChange={(e) => setChgBody(e.target.value)}
                  rows={8}
                  placeholder={"Örn:\n- **Yeni:** Takip soruları eklendi\n- Hız %40 arttı"}
                  className="w-full bg-[#13151b] text-slate-200 border border-white/10 rounded-xl p-3.5 text-xs font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-y"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={handleClearChangelog}
                  className="px-4 py-2 rounded-xl text-xs text-red-300 hover:text-red-200 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Duyuruyu Kaldır</span>
                </button>
                <button
                  onClick={handleSaveChangelog}
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-all flex items-center gap-2 shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : savedSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Yayınlandı!</span>
                    </>
                  ) : (
                    <>
                      <Megaphone className="w-3.5 h-3.5" />
                      <span>Duyuruyu Yayınla</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: KULLANICILAR & KOTA */}
          {activeTab === "users" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Google ile giriş yapan hesaplar. Free haftada 100 (mesaj başı 5),
                Premium günde 2000 (mesaj başı 2), Premium Plus 5 saatte 10000
                (mesaj başı 1) hak kullanır. Özel sayı girerseniz plan kotası
                yerine o kullanılır.
              </p>
              {users.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500 bg-white/[0.01] rounded-xl border border-dashed border-white/10">
                  Henüz kayıtlı kullanıcı yok.
                </div>
              )}
              <div className="space-y-2">
                {users.map((u) => {
                  const edit = planEdits[u.email] || {
                    plan: (u as any).plan || (u.isVip ? "premium_plus" : "free"),
                    quota: "",
                  };
                  return (
                    <div
                      key={u.email}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-wrap items-center gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {u.picture ? (
                          <img src={u.picture} alt={u.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        ) : (
                          <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{u.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                          <p className="text-[10px] text-slate-500">
                            Son giriş: {new Date(u.lastLoginAt).toLocaleString("tr-TR")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            ((u as any).plan === "premium_plus" || u.isVip)
                              ? "bg-amber-500/20 text-amber-300"
                              : (u as any).plan === "premium"
                              ? "bg-cyan-500/20 text-cyan-300"
                              : "bg-white/10 text-slate-300"
                          }`}
                        >
                          {(u as any).plan === "premium_plus" || u.isVip
                            ? "PLUS"
                            : (u as any).plan === "premium"
                            ? "PRO"
                            : "FREE"}
                          {u.quota != null ? ` • ${u.quota}` : ""}
                        </span>
                        <select
                          value={edit.plan}
                          onChange={(e) =>
                            setPlanEdits((prev) => ({
                              ...prev,
                              [u.email]: { plan: e.target.value, quota: edit.quota },
                            }))
                          }
                          className="bg-black/40 text-slate-200 border border-white/10 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
                        >
                          <option value="free">Free (100/hafta)</option>
                          <option value="premium">Premium (2000/gün)</option>
                          <option value="premium_plus">Premium Plus (10000/5sa)</option>
                        </select>
                        <input
                          type="number"
                          min={0}
                          value={edit.quota}
                          onChange={(e) =>
                            setPlanEdits((prev) => ({
                              ...prev,
                              [u.email]: { plan: edit.plan, quota: e.target.value },
                            }))
                          }
                          placeholder="Özel kota"
                          title="Boş bırakılırsa plan kotası kullanılır"
                          className="w-24 bg-black/40 text-slate-200 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          onClick={() => handleSetPlan(u.email)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-all flex items-center gap-1"
                        >
                          <Save className="w-3 h-3" />
                          <span>Kaydet</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
