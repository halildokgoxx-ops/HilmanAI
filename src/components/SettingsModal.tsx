"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Settings,
  Terminal,
  Check,
  RotateCcw,
  Save,
  Sparkles,
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: () => void;
}

const PLAN_INFO: Record<string, { label: string; chip: string }> = {
  free: { label: "Free", chip: "bg-white/10 text-slate-300" },
  premium: { label: "Premium", chip: "bg-amber-500/20 text-amber-300" },
  premium_plus: { label: "Premium Plus", chip: "bg-gradient-to-r from-amber-500/25 to-purple-500/25 text-amber-200" },
};

export function SettingsModal({ isOpen, onClose, onSettingsSaved }: SettingsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [personalPrompt, setPersonalPrompt] = useState("");
  const [plan, setPlan] = useState<string>("free");
  const [quota, setQuota] = useState<number | null>(null);
  const [quotaPolicy, setQuotaPolicy] = useState<{ periodLabel: string } | null>(null);

  // Fetch settings on open
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setPlan(data.user.plan || "free");
          setQuota(data.user.quota ?? null);
          setQuotaPolicy(data.user.quotaPolicy || null);
        }
      })
      .catch(() => {});
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setPersonalPrompt(data.settings.personalPrompt || "");
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
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalPrompt }),
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

  const planInfo = PLAN_INFO[plan] || PLAN_INFO.free;

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
                <span>Kullanıcı Ayarları</span>
              </h2>
              <p className="text-xs text-slate-400">
                Kişisel talimatlarınızı ve üyelik durumunuzu yönetin.
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm flex-1">
          {isLoading ? (
            <div className="py-10 text-center text-xs text-slate-400">Yükleniyor...</div>
          ) : (
            <>
              {/* Plan kartı */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Üyelik Planınız</div>
                    <div className="text-[11px] text-slate-400">
                      {quotaPolicy ? quotaPolicy.periodLabel : ""}
                      {quota != null ? ` • kalan: ${quota}` : ""}
                    </div>
                  </div>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${planInfo.chip}`}>
                  {planInfo.label}
                </span>
              </div>

              {/* Kişisel prompt */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-semibold text-xs text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      Kişisel Özel Prompt
                    </label>
                    <p className="text-[11px] text-slate-400 mt-1">
                      HilmanAI&apos;ın size nasıl hitap etmesini, hangi stilde cevap vermesini
                      istediğinizi belirtin. Her sohbetinize otomatik eklenir.
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
                  ℹ️ Motor ayarları (model, sıcaklık, token limiti) yönetici tarafından
                  herkese en uygun şekilde yapılandırılır ve buradan değiştirilemez.
                </div>
              </div>
            </>
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
              <span>Değişiklikler sonraki mesajlarınıza yansır.</span>
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
