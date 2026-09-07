"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Settings,
  Cpu,
  Sliders,
  Terminal,
  Check,
  RotateCcw,
  Save,
  Brain,
  Layers,
  Code,
  Sparkles,
} from "lucide-react";
import { DEFAULT_HILMAN_SYSTEM_PROMPT, AVAILABLE_MODELS } from "@/lib/constants";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: () => void;
}

export function SettingsModal({ isOpen, onClose, onSettingsSaved }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"ai" | "parameters" | "prompt">("ai");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Real AI Engine States (No external tokens!)
  const [defaultModel, setDefaultModel] = useState("hilmanai-v1-beta");
  const [reasoningDepth, setReasoningDepth] = useState<"standard" | "deep" | "extreme">("deep");
  const [contextWindow, setContextWindow] = useState<"32k" | "64k" | "128k">("128k");
  const [codeOptimization, setCodeOptimization] = useState(true);
  const [showThinking, setShowThinking] = useState(true);
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState(2048);
  const [personalPrompt, setPersonalPrompt] = useState("");

  // Fetch settings on open
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        const admin = !!data?.user?.isAdmin;
        setIsAdmin(admin);
        if (!admin) setActiveTab("prompt");
      })
      .catch(() => {});
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          const s = data.settings;
          setDefaultModel(s.defaultModel || "hilmanai-v1-beta");
          setReasoningDepth(s.reasoningDepth || "deep");
          setContextWindow(s.contextWindow || "128k");
          setCodeOptimization(s.codeOptimization !== false);
          setShowThinking(s.showThinking !== false);
          setTemperature(s.temperature || "0.7");
          setMaxTokens(s.maxTokens || 2048);
          setPersonalPrompt(s.personalPrompt || "");
        }
      })
      .catch((err) => console.error("Settings load error:", err))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      // Normal kullanıcı yalnızca kişisel talimatını kaydedebilir;
      // motor parametreleri admin'e özeldir (403 yememek için gönderilmez).
      const payload: Record<string, any> = isAdmin
        ? {
            defaultModel,
            reasoningDepth,
            contextWindow,
            codeOptimization,
            showThinking,
            temperature,
            maxTokens,
            personalPrompt,
          }
        : { personalPrompt };
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        if (onSettingsSaved) onSettingsSaved();
        setTimeout(() => setSavedSuccess(false), 2000);
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Ayarlar kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaultPrompt = () => {
    setPersonalPrompt("Bana her zaman net, doğrudan, saygılı ve gerekirse en güncel yazılım standartlarında yanıt ver.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#0f1118] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Kullanıcı Tercihleri & AI Ayarları</span>
              </h2>
              <p className="text-xs text-slate-400">
                Kişisel talimatlarınızı, muhakeme derinliğini ve model parametrelerinizi yapılandırın.
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
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab("ai")}
                className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === "ai"
                    ? "border-emerald-400 text-emerald-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span>AI Zeka Modu</span>
              </button>
              <button
                onClick={() => setActiveTab("parameters")}
                className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === "parameters"
                    ? "border-emerald-400 text-emerald-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Parametreler</span>
              </button>
            </>
          )}
          <button
            onClick={() => setActiveTab("prompt")}
            className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "prompt"
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Kişisel Özel Prompt</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm flex-1">
          {/* TAB 1: GERÇEK AI AYARLARI (admin) */}
          {activeTab === "ai" && isAdmin && (
            <div className="space-y-4">
              {/* Default Model */}
              <div className="space-y-1.5">
                <label className="font-semibold text-xs text-slate-200 uppercase tracking-wider block">
                  HilmanAI Zeka Motoru
                </label>
                <select
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  className="w-full bg-[#13151b] text-slate-200 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 font-medium"
                >
                  {AVAILABLE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.badge})
                    </option>
                  ))}
                </select>
              </div>

              {/* Reasoning Depth (Düşünce Süreci Derinliği) */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-indigo-400" />
                    <span className="font-semibold text-xs text-slate-200">
                      Düşünce Süreci Derinliği (Reasoning Depth)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-indigo-400 uppercase">
                    {reasoningDepth}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  HilmanAI&apos;ın yanıt vermeden önce mimariyi ve mantığı planlama derinliğini belirler.
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {(["standard", "deep", "extreme"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setReasoningDepth(lvl)}
                      className={`p-2.5 rounded-lg border text-xs font-medium transition-all text-center ${
                        reasoningDepth === lvl
                          ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-sm"
                          : "bg-black/30 border-white/5 text-slate-400 hover:text-white"
                      }`}
                    >
                      {lvl === "standard"
                        ? "Standart"
                        : lvl === "deep"
                        ? "Derin (Önerilen)"
                        : "Ekstrem"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Context Window & Token Capacity */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span className="font-semibold text-xs text-slate-200">
                      Bağlam Penceresi (Context Window)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-400">{contextWindow}</span>
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

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Code Optimization */}
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
                      <span className="font-semibold text-xs text-slate-200">
                        Clean Code & Tip Optimizasyonu
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      TypeScript, Python ve React kodlarında sıkı tip kontrolü ve Clean Code uygular.
                    </p>
                  </div>
                </label>

                {/* Show Thinking */}
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
                      <span className="font-semibold text-xs text-slate-200">
                        Düşünce Zincirini Göster
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      &lt;think&gt; düşünce sürecini mesaj üstünde açılır akordeon olarak sunar.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: PARAMETRELER (admin) */}
          {activeTab === "parameters" && isAdmin && (
            <div className="space-y-4">
              {/* Temperature */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-xs text-slate-200">
                    Sıcaklık (Temperature): {temperature}
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {parseFloat(temperature) < 0.4
                      ? "Kesin & Analitik"
                      : parseFloat(temperature) > 0.8
                      ? "Yaratıcı & Esnek"
                      : "Dengeli"}
                  </span>
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
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0.1 (Kesin/Analitik)</span>
                  <span>0.7 (Dengeli)</span>
                  <span>1.0 (Yaratıcı)</span>
                </div>
              </div>

              {/* Max Tokens */}
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
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>256 (Kısa)</span>
                  <span>2048 (Standart)</span>
                  <span>4096 (Kapsamlı Kod / Pro)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: KİŞİSEL ÖZEL PROMPT */}
          {activeTab === "prompt" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-semibold text-xs text-slate-200 uppercase tracking-wider block">
                    Kişisel Özel Prompt (Custom User Instructions)
                  </label>
                  <p className="text-[11px] text-slate-400">
                    HilmanAI&apos;ın size nasıl hitap etmesini, hangi stilde ve kurallarla cevap vermesini istediğinizi belirtin.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetToDefaultPrompt}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1 shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Varsayılana Sıfırla</span>
                </button>
              </div>
              <textarea
                value={personalPrompt}
                onChange={(e) => setPersonalPrompt(e.target.value)}
                placeholder="Örnek: Yanıtları her zaman doğrudan, teknik ve açıklayıcı ver. Kod örneklerinde TypeScript kullan."
                rows={9}
                className="w-full bg-black/40 text-slate-200 border border-white/10 rounded-xl p-3.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/50 leading-relaxed resize-none"
              />
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] text-slate-400">
                ℹ️ <strong>Not:</strong> HilmanAI&apos;ın küresel sistem promptu sistem kararlılığı için korunmaktadır. Buradaki talimatlarınız her oturumda HilmanAI&apos;a sizin özel tercihleriniz olarak iletilir.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {savedSuccess ? (
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" />
                Ayarlar başarıyla kaydedildi!
              </span>
            ) : (
              <span>Değişiklikler anında HilmanAI motoruna yansıtılır.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Vazgeç
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Kaydediliyor..." : "Kaydet"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
