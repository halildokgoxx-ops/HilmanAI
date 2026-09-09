"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Menu,
  Sparkles,
  Settings,
  Activity,
  Share2,
  ChevronDown,
  Plus,
  Trash2,
  Check,
  ShieldCheck,
  Key,
  LogOut,
} from "lucide-react";
import { AVAILABLE_MODELS, type ModelOption } from "@/lib/constants";
import type { AuthUser } from "@/app/page";

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onOpenDiagnostics: () => void;
  onOpenExport: () => void;
  onOpenAdminPanel: () => void;
  onNewChat: () => void;
  onClearChat: () => void;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  availableModels?: Array<{ id: string; name: string; badge: string; description?: string; isRecommended?: boolean }>;
  activeProvider: string;
  hasMessages: boolean;
  user?: AuthUser | null;
  onLogout?: () => void;
}

export function Header({
  onToggleSidebar,
  onOpenSettings,
  onOpenDiagnostics,
  onOpenExport,
  onOpenAdminPanel,
  onNewChat,
  onClearChat,
  selectedModel,
  onSelectModel,
  availableModels = AVAILABLE_MODELS,
  activeProvider,
  hasMessages,
  user = null,
  onLogout,
}: HeaderProps) {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const modelList = availableModels.length > 0 ? availableModels : AVAILABLE_MODELS;
  const currentModel =
    modelList.find((m) => m.id === selectedModel) || {
      id: selectedModel,
      name: selectedModel.includes("Hilman")
        ? selectedModel.split("/").pop() || "HilmanAI v1 Beta"
        : "HilmanAI v1 Beta",
      badge: "HilmanAI",
    };

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="pt-safe h-14 border-b border-white/[0.07] bg-[#0c0e14]/90 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-2 sm:px-3 md:px-5 gap-1">
      {/* Left: Hamburger & Brand */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Menüyü Aç/Kapat"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Official HilmanAI Logo */}
        <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-cyan-500/30 shadow-md shadow-indigo-500/20 bg-black shrink-0">
          <img
            src="/hilman-logo.png"
            alt="HilmanAI Logo"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="hidden sm:block">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-tight bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              HilmanAI
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </div>
        </div>

        {/* Model Selector Pill */}
        <div className="relative ml-1 sm:ml-3" ref={dropdownRef}>
          <button
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-slate-200 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="font-medium max-w-[140px] sm:max-w-[220px] truncate">
              {currentModel.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {/* Dropdown Menu */}
          {isModelDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-72 sm:w-84 rounded-xl bg-[#12141c] border border-white/10 shadow-2xl py-1.5 z-30 divide-y divide-white/5">
              <div className="px-3 py-1.5 text-[11px] font-medium text-slate-400">
                HilmanAI Zeka Modelleri
              </div>
              <div className="py-1 max-h-72 overflow-y-auto">
                {modelList.map((model) => {
                  const isSelected = model.id === selectedModel;
                  return (
                    <button
                      key={model.id}
                      onClick={() => {
                        onSelectModel(model.id);
                        setIsModelDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-start justify-between gap-2 text-xs transition-colors ${
                        isSelected
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-200">{model.name}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                            {model.badge}
                          </span>
                        </div>
                        {model.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-1">
                            {model.description}
                          </p>
                        )}
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium transition-colors"
          title="Yeni Sohbet Başlat"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Yeni Sohbet</span>
        </button>

        {/* Hilman API Keys & Developer */}
        <button
          onClick={onOpenDiagnostics}
          className="p-1.5 rounded-lg text-slate-300 hover:text-emerald-300 hover:bg-white/5 transition-colors relative flex items-center gap-1"
          title="Hilman API & Geliştirici Merkezi"
        >
          <Key className="w-4 h-4 text-emerald-400" />
          <span className="hidden lg:inline text-xs font-medium text-slate-300">
            API Keys
          </span>
        </button>

        {/* Admin Manager — yalnızca admin hesabı görür */}
        {user?.isAdmin && (
          <button
            onClick={onOpenAdminPanel}
            className="p-1.5 rounded-lg text-slate-300 hover:text-emerald-300 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all flex items-center gap-1"
            title="Admin Yönetim Paneli"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline text-xs font-medium text-slate-300 hover:text-white">
              Admin Paneli
            </span>
          </button>
        )}

        {/* Export */}
        {hasMessages && (
          <button
            onClick={onOpenExport}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            title="Sohbeti Dışa Aktar"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}

        {/* Clear Chat */}
        {hasMessages && (
          <button
            onClick={onClearChat}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Sohbeti Temizle"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
          title="Ayarlar & API Anahtarları"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Plan + kota çipi */}
        {user && user.plan !== "premium_plus" && (
          <span
            className={`hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-mono border ${
              user.plan === "premium"
                ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                : "bg-white/[0.04] text-slate-300 border-white/10"
            }`}
            title={user.quota != null ? `Kalan hak: ${user.quota}` : "Kalan hak"}
          >
            <span
              className={`text-[9px] font-bold px-1 rounded ${
                user.plan === "premium" ? "bg-amber-500/25 text-amber-200" : "bg-white/10 text-slate-300"
              }`}
            >
              {user.plan === "premium" ? "PRO" : "FREE"}
            </span>
            {user.quota != null && <span>{user.quota}</span>}
          </span>
        )}
        {user && user.plan === "premium_plus" && (
          <span
            className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-mono bg-gradient-to-r from-amber-500/20 to-purple-500/20 text-amber-200 border border-amber-500/40"
            title={user.quota != null ? `Kalan hak: ${user.quota}` : "Premium Plus"}
          >
            <span className="text-[9px] font-bold">PLUS</span>
            {user.quota != null && <span>{user.quota}</span>}
          </span>
        )}

        {/* User chip */}
        {user && (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors"
              title={user.email}
            >
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-lg object-cover" />
              ) : (
                <span className="w-6 h-6 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-600 flex items-center justify-center text-[11px] font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
              {user.isAdmin && (
                <span className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                  ADMIN
                </span>
              )}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-60 rounded-xl bg-[#12141c] border border-white/10 shadow-2xl py-2 z-30">
                <div className="px-3.5 py-2 border-b border-white/5">
                  <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout?.();
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs text-red-300 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Çıkış Yap</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
