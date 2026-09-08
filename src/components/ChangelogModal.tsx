"use client";

import React from "react";
import { X, Sparkles, Megaphone, Check } from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

export interface ChangelogNoteData {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
}

interface ChangelogModalProps {
  note: ChangelogNoteData;
  onClose: () => void;
}

export function ChangelogModal({ note, onClose }: ChangelogModalProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Üst gradyan şerit */}
        <div className="relative px-6 pt-7 pb-5 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 overflow-hidden">
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-cyan-300/20 blur-3xl" />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
              backgroundSize: "26px 26px",
              maskImage: "radial-gradient(ellipse 80% 100% at 50% 0%, black 20%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse 80% 100% at 50% 0%, black 20%, transparent 75%)",
            }}
          />
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-black/25 hover:bg-black/45 text-white/90 hover:text-white transition-colors"
            title="Kapat"
          >
            <X className="w-4.5 h-4.5" />
          </button>
          <div className="relative flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/15 border border-white/25 shadow-lg shrink-0">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-100/90">
                <Sparkles className="w-3 h-3" />
                <span>HilmanAI Güncelleme Notu</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white leading-tight truncate">
                {note.title}
              </h2>
              <p className="text-[11px] text-white/70">
                {new Date(note.updatedAt).toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Gövde */}
        <div className="bg-[#0d0f16] px-6 py-5 max-h-[46vh] overflow-y-auto">
          <MarkdownRenderer content={note.body} />
        </div>

        {/* Alt */}
        <div className="bg-[#0d0f16] px-6 pb-5 pt-1 border-t border-white/5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 transition-all active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Harika, Başlayalım</span>
          </button>
        </div>
      </div>
    </div>
  );
}
