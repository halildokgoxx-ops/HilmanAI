"use client";

import React, { useState } from "react";
import { X, FileDown, Copy, Check, FileText, Code } from "lucide-react";
import type { Message, Conversation } from "@/db/schema";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  messages: Message[];
}

export function ExportModal({
  isOpen,
  onClose,
  conversation,
  messages,
}: ExportModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const title = conversation?.title || "HilmanAI Sohbeti";

  const getMarkdownText = () => {
    let md = `# ${title}\n`;
    md += `*HilmanAI Sohbet Kaydı - ${new Date().toLocaleDateString("tr-TR")}*\n\n---\n\n`;
    for (const msg of messages) {
      const sender = msg.role === "user" ? "👤 Siz" : "🤖 HilmanAI";
      const time = new Date(msg.createdAt).toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      md += `### ${sender} (${time})\n\n${msg.content}\n\n`;
      if ((msg as any).imageUrl) {
        md += `![Üretilen görsel](${(msg as any).imageUrl})\n\n`;
      }
      if ((msg as any).videoUrl) {
        md += `🎬 Video: ${(msg as any).videoUrl}\n\n`;
      }
      if (msg.reasoning) {
        md += `> **Düşünce Süreci:**\n> ${msg.reasoning.replace(/\n/g, "\n> ")}\n\n`;
      }
      md += `---\n\n`;
    }
    return md;
  };

  const getPlainText = () => {
    let text = `${title.toUpperCase()}\n`;
    text += `Tarih: ${new Date().toLocaleString("tr-TR")}\n`;
    text += `=========================================\n\n`;
    for (const msg of messages) {
      const sender = msg.role === "user" ? "KULLANICI" : "HILMANAI";
      text += `[${sender}]:\n${msg.content}\n\n`;
    }
    return text;
  };

  const getJsonText = () => {
    return JSON.stringify(
      {
        conversation,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
          reasoning: m.reasoning,
          model: m.model,
          createdAt: m.createdAt,
        })),
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getMarkdownText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0f1118] border border-white/10 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Sohbeti Dışa Aktar</h3>
              <p className="text-xs text-slate-400">{messages.length} adet mesaj içeriyor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Export Options */}
        <div className="p-5 space-y-3 text-xs">
          <button
            onClick={() =>
              downloadFile(
                getMarkdownText(),
                `${title.replace(/[^a-zA-Z0-9-]/g, "_")}.md`,
                "text/markdown"
              )
            }
            className="w-full p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 flex items-center justify-between text-slate-200 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold block text-white">Markdown (.md) İndir</span>
                <span className="text-[11px] text-slate-400">
                  Biçimlendirilmiş başlıklar ve kod blokları ile tam format
                </span>
              </div>
            </div>
            <FileDown className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() =>
              downloadFile(
                getPlainText(),
                `${title.replace(/[^a-zA-Z0-9-]/g, "_")}.txt`,
                "text/plain"
              )
            }
            className="w-full p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 flex items-center justify-between text-slate-200 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold block text-white">Düz Metin (.txt) İndir</span>
                <span className="text-[11px] text-slate-400">
                  Her yerde okunabilir sade metin dosyası
                </span>
              </div>
            </div>
            <FileDown className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() =>
              downloadFile(
                getJsonText(),
                `${title.replace(/[^a-zA-Z0-9-]/g, "_")}.json`,
                "application/json"
              )
            }
            className="w-full p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 flex items-center justify-between text-slate-200 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Code className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold block text-white">JSON (.json) İndir</span>
                <span className="text-[11px] text-slate-400">
                  Geliştiriciler ve API arşivleme için yapılandırılmış veri
                </span>
              </div>
            </div>
            <FileDown className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Tümü Panoya Kopyalandı</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Panoya Kopyala</span>
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
