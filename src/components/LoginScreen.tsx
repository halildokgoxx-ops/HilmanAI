"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ShieldCheck,
  Brain,
  Image as ImageIcon,
  Video as VideoIcon,
  Code,
  Sparkles,
  Loader2,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

interface LoginScreenProps {
  onLoggedIn: (user: { email: string; name: string; picture?: string | null; isAdmin: boolean }) => void;
}

declare global {
  interface Window {
    google?: any;
  }
}

export function LoginScreen({ onLoggedIn }: LoginScreenProps) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [configChecked, setConfigChecked] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  // 1. Public auth yapılandırmasını al
  useEffect(() => {
    fetch("/api/auth/config")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.googleClientId) setClientId(d.googleClientId);
      })
      .catch(() => setError("Sunucuya ulaşılamadı."))
      .finally(() => setConfigChecked(true));
  }, []);

  // 2. Google Identity Services betiğini yükle
  useEffect(() => {
    if (!clientId || document.getElementById("google-gsi-script")) return;
    const s = document.createElement("script");
    s.id = "google-gsi-script";
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => renderButton();
    document.head.appendChild(s);
    // Betik zaten yüklüyse doğrudan render et
    if (window.google?.accounts?.id) renderButton();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handleCredential = async (response: any) => {
    const idToken = response?.credential;
    if (!idToken) {
      setError("Google kimliği alınamadı, tekrar deneyin.");
      return;
    }
    setIsLoggingIn(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        onLoggedIn(data.user);
      } else {
        setError(data.error || "Google girişi başarısız.");
      }
    } catch (e: any) {
      setError("Bağlantı hatası: " + e.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const renderButton = () => {
    if (renderedRef.current || !buttonRef.current || !clientId || !window.google?.accounts?.id) return;
    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredential,
        auto_select: false,
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "filled_black",
        size: "large",
        width: 320,
        text: "signin_with",
        shape: "pill",
        logo_alignment: "left",
      });
      renderedRef.current = true;
    } catch (e) {
      console.error("GIS render error:", e);
    }
  };

  useEffect(() => {
    if (clientId && window.google?.accounts?.id) renderButton();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  return (
    <div className="min-h-screen min-h-dvh w-full relative overflow-hidden bg-[#05060a] text-slate-100 flex items-center justify-center p-4 pb-safe">
      {/* Arka plan: aurora gradyanlar + grid */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full bg-cyan-500/20 blur-[140px] animate-pulse" />
        <div className="absolute -bottom-48 -right-40 w-[620px] h-[620px] rounded-full bg-indigo-600/25 blur-[150px] animate-pulse" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.25) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 75%)",
          }}
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo + başlık */}
        <div className="text-center space-y-4 mb-6">
          <div className="inline-flex relative">
            <div className="absolute -inset-5 bg-gradient-to-r from-cyan-500/40 via-indigo-500/40 to-purple-500/40 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-cyan-400/50 shadow-2xl shadow-cyan-500/20 bg-black">
              <img src="/hilman-logo.png" alt="HilmanAI" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px] font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Güvenli Google Girişi • v1 Beta</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-cyan-300 via-indigo-200 to-purple-300 bg-clip-text text-transparent">
                HilmanAI
              </span>
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Çok modlu yapay zeka stüdyosu: derin muhakeme, kodlama, görsel analizi, resim ve video üretimi.
            </p>
          </div>
        </div>

        {/* Cam kart */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-2xl p-6 sm:p-7 space-y-5">
          {/* Yetenek rozetleri */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { icon: <Brain className="w-4 h-4 text-indigo-300" />, label: "Muhakeme" },
              { icon: <Code className="w-4 h-4 text-cyan-300" />, label: "Kodlama" },
              { icon: <ImageIcon className="w-4 h-4 text-purple-300" />, label: "Vision" },
              { icon: <VideoIcon className="w-4 h-4 text-amber-300" />, label: "Video" },
            ].map((f, i) => (
              <div key={i} className="rounded-xl bg-white/[0.03] border border-white/[0.07] py-2.5 px-1 space-y-1">
                <div className="flex justify-center">{f.icon}</div>
                <div className="text-[10px] font-medium text-slate-300">{f.label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-xs text-slate-400 text-center leading-relaxed">
              Devam etmek için Google hesabınızla giriş yapın.
              <br />
              <span className="text-slate-500">Sohbet geçmişiniz yalnızca sizin hesabınıza kaydedilir.</span>
            </p>

            {!configChecked ? (
              <div className="flex items-center justify-center py-3 text-slate-400 text-sm gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Hazırlanıyor...</span>
              </div>
            ) : !clientId ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200 leading-relaxed flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Google girişi henüz yapılandırılmamış (<span className="font-mono">GOOGLE_CLIENT_ID</span> eksik).
                  Kurulum için README&apos;deki &quot;Google ile Giriş&quot; adımlarını izleyin.
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div ref={buttonRef} className="min-h-[44px] flex items-center justify-center" />
                {isLoggingIn && (
                  <div className="flex items-center gap-2 text-xs text-emerald-300">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Google doğrulanıyor...</span>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200 leading-relaxed">
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500">
            <a href="/privacy" className="hover:text-slate-300 transition-colors inline-flex items-center gap-0.5">
              Gizlilik <ChevronRight className="w-3 h-3" />
            </a>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <a href="/terms" className="hover:text-slate-300 transition-colors inline-flex items-center gap-0.5">
              Kullanım Şartları <ChevronRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-600 mt-5 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3 h-3 text-emerald-500/70" />
          HilmanAI v1 Beta • Güvenli • Hızlı • Çok Modlu
        </p>
      </div>
    </div>
  );
}
