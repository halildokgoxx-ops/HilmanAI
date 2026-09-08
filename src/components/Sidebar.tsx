"use client";

import React, { useState } from "react";
import {
  Plus,
  MessageSquare,
  Search,
  Pin,
  Trash2,
  Edit2,
  Check,
  X,
  X as CloseIcon,
  Activity,
  Settings,
  Cpu,
  Key,
  Images,
} from "lucide-react";
import type { Conversation } from "@/db/schema";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onDeleteAllConversations: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onTogglePinConversation: (id: string, currentPin: boolean) => void;
  onOpenSettings: () => void;
  onOpenDiagnostics: () => void;
  onOpenMedia: () => void;
  activeProvider: string;
}

export function Sidebar({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onDeleteAllConversations,
  onRenameConversation,
  onTogglePinConversation,
  onOpenSettings,
  onOpenDiagnostics,
  onOpenMedia,
  activeProvider,
}: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pinnedConversations = filteredConversations.filter((c) => c.isPinned);
  const unpinnedConversations = filteredConversations.filter((c) => !c.isPinned);

  // Tarih grupları (sabitlenmeyenler için): Bugün / Dün / Son 7 gün / Daha eski
  const dayStart = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  };
  const todayStart = dayStart(new Date());
  const DAY = 24 * 60 * 60 * 1000;
  const groups: Array<{ label: string; items: typeof unpinnedConversations }> = [
    { label: "Bugün", items: [] },
    { label: "Dün", items: [] },
    { label: "Son 7 Gün", items: [] },
    { label: "Daha Eski", items: [] },
  ];
  for (const c of unpinnedConversations) {
    const t = new Date(c.updatedAt).getTime();
    const diff = todayStart - dayStart(new Date(t));
    if (diff <= 0) groups[0].items.push(c);
    else if (diff <= DAY) groups[1].items.push(c);
    else if (diff <= 7 * DAY) groups[2].items.push(c);
    else groups[3].items.push(c);
  }

  const startRename = (c: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditingTitle(c.title);
  };

  const submitRename = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editingTitle.trim()) {
      onRenameConversation(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 bg-[#0a0c12] border-r border-white/[0.07] flex flex-col transition-all duration-200 ease-in-out overflow-hidden ${
          isOpen
            ? "translate-x-0 w-72 md:w-64 lg:w-72 opacity-100 pointer-events-auto"
            : "-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 md:opacity-0 pointer-events-none"
        }`}
      >
        {/* Brand & Close on Mobile */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-cyan-500/30 shadow-md shadow-indigo-500/20 bg-black shrink-0">
              <img
                src="/hilman-logo.png"
                alt="HilmanAI Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="font-bold text-sm bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent tracking-tight block">
                HilmanAI
              </span>
              <span className="text-[10px] font-mono block text-slate-500 leading-none">v1 Beta Core</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Action: New Chat */}
        <div className="p-3 border-b border-white/[0.04]">
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-indigo-500/20 hover:from-emerald-500/30 hover:to-indigo-500/30 border border-emerald-500/30 text-emerald-300 hover:text-white text-xs font-medium transition-all shadow-sm group"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
            <span>Yeni Sohbet Başlat</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-white/[0.04]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Sohbetlerde ara..."
              className="w-full bg-white/[0.03] text-xs text-slate-200 placeholder:text-slate-500 rounded-lg pl-8 pr-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 border border-white/5"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
          {/* Pinned Section */}
          {pinnedConversations.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Pin className="w-2.5 h-2.5" />
                <span>Sabitlenenler</span>
              </div>
              <div className="space-y-0.5 mt-1">
                {pinnedConversations.map((c) => renderItem(c))}
              </div>
            </div>
          )}

          {/* Date-grouped Conversations */}
          {unpinnedConversations.length === 0 && pinnedConversations.length === 0 ? (
            <div>
              <div className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Geçmiş Sohbetler
              </div>
              <div className="px-3 py-6 text-center text-xs text-slate-500">
                Henüz sohbet bulunmuyor.
              </div>
            </div>
          ) : (
            groups.map(
              (g) =>
                g.items.length > 0 && (
                  <div key={g.label}>
                    <div className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      {g.label}
                    </div>
                    <div className="space-y-0.5 mt-1">
                      {g.items.map((c) => renderItem(c))}
                    </div>
                  </div>
                )
            )
          )}
        </div>

        {/* Footer info & Diagnostics */}
        <div className="p-3 border-t border-white/[0.06] bg-[#08090d] text-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium text-slate-300 capitalize">{activeProvider}</span>
            </span>
            <button
              onClick={onOpenDiagnostics}
              className="text-emerald-400 hover:text-emerald-300 text-[10px] flex items-center gap-1 hover:underline"
            >
              <Key className="w-3 h-3" />
              API Keys
            </button>
          </div>

          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>{conversations.length} kayıtlı sohbet</span>
            <div className="flex items-center gap-1">
              {conversations.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm("TÜM sohbet geçmişinizi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
                      onDeleteAllConversations();
                    }
                  }}
                  className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-500/10 text-[10px] flex items-center gap-1"
                  title="Tüm Sohbetleri Sil"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Tümü</span>
                </button>
              )}
              <button
                onClick={onOpenMedia}
                className="text-slate-400 hover:text-purple-300 transition-colors p-1 rounded hover:bg-white/5 flex items-center gap-1"
                title="Görseller ve Videolar (Medya Arşivi)"
              >
                <Images className="w-3.5 h-3.5" />
                <span className="text-[10px]">Medya</span>
              </button>
              <button
                onClick={onOpenSettings}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded hover:bg-white/5"
                title="Ayarlar"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );

  function renderItem(c: Conversation) {
    const isActive = c.id === activeConversationId;
    const isEditing = editingId === c.id;

    if (isEditing) {
      return (
        <form
          key={c.id}
          onSubmit={(e) => submitRename(c.id, e)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10"
        >
          <input
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-xs text-white focus:outline-none"
          />
          <button type="submit" className="p-1 text-emerald-400 hover:text-emerald-300">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setEditingId(null)}
            className="p-1 text-slate-400 hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      );
    }

    return (
      <div
        key={c.id}
        onClick={() => {
          onSelectConversation(c.id);
          if (window.innerWidth < 768) onClose();
        }}
        className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
          isActive
            ? "bg-white/[0.08] text-white font-medium border border-white/5"
            : "text-slate-300 hover:bg-white/[0.03] hover:text-white"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
          <span className="truncate">{c.title}</span>
        </div>

        {/* Hover Action Buttons */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePinConversation(c.id, c.isPinned);
            }}
            className={`p-1 rounded hover:bg-white/10 ${
              c.isPinned ? "text-emerald-400" : "text-slate-400 hover:text-white"
            }`}
            title={c.isPinned ? "Sabitlemeyi Kaldır" : "Sabitle"}
          >
            <Pin className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => startRename(c, e)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10"
            title="Yeniden Adlandır"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Bu sohbeti silmek istediğinize emin misiniz?")) {
                onDeleteConversation(c.id);
              }
            }}
            className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10"
            title="Sil"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }
}
