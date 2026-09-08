"use client";

import React, { useState, useEffect } from "react";
import { X, Image as ImageIcon, Video as VideoIcon, Download, Loader2, Images } from "lucide-react";

interface MediaItem {
  id: string;
  kind: "image" | "video";
  url: string;
  conversationId: string;
  title: string;
  createdAt: string;
}

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MediaModal({ isOpen, onClose }: MediaModalProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    fetch("/api/media")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.items) setItems(d.items);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = items.filter((i) => filter === "all" || i.kind === filter);
  const counts = {
    all: items.length,
    image: items.filter((i) => i.kind === "image").length,
    video: items.filter((i) => i.kind === "video").length,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl rounded-2xl bg-[#0f1118] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-500/20 to-cyan-500/20 border border-purple-500/30 text-purple-300">
              <Images className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Medya Arşivi</h2>
              <p className="text-xs text-slate-400">Ürettiğin tüm görseller ve videolar burada depolanır.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 px-5 pt-3 text-xs">
          {(
            [
              { id: "all", label: `Tümü (${counts.all})` },
              { id: "image", label: `Görseller (${counts.image})` },
              { id: "video", label: `Videolar (${counts.video})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === t.id
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "text-slate-400 hover:text-white bg-white/[0.03] border border-white/5"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-sm text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Arşiv yükleniyor...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              {items.length === 0
                ? "Henüz üretim yok. Sohbette resim çiz veya video üret, burada biriksin!"
                : "Bu filtrede öğe yok."}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setLightbox(item)}
                  className="group relative rounded-xl overflow-hidden border border-white/10 bg-black/40 aspect-video text-left"
                  title={item.title}
                >
                  {item.kind === "image" ? (
                    <img src={item.url} alt={item.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform" />
                  ) : (
                    <>
                      <video src={item.url} preload="metadata" className="w-full h-full object-cover" />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="p-2.5 rounded-full bg-black/60 border border-white/20">
                          <VideoIcon className="w-5 h-5 text-white" />
                        </span>
                      </span>
                    </>
                  )}
                  <span className="absolute bottom-1.5 left-1.5 right-1.5 truncate text-[10px] text-white/90 bg-black/60 rounded px-1.5 py-0.5">
                    {item.title}
                  </span>
                  <span className="absolute top-1.5 right-1.5 p-1 rounded bg-black/60 text-white/80">
                    {item.kind === "image" ? <ImageIcon className="w-3 h-3" /> : <VideoIcon className="w-3 h-3" />}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {lightbox && (
          <div className="absolute inset-0 z-10 bg-black/90 flex flex-col items-center justify-center p-4" onClick={() => setLightbox(null)}>
            <button className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white" onClick={() => setLightbox(null)}>
              <X className="w-5 h-5" />
            </button>
            <div className="max-w-full max-h-[75%] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              {lightbox.kind === "image" ? (
                <img src={lightbox.url} alt={lightbox.title} className="max-w-full max-h-[68vh] rounded-xl object-contain border border-white/10" />
              ) : (
                <video src={lightbox.url} controls autoPlay playsInline className="max-w-full max-h-[68vh] rounded-xl border border-white/10" />
              )}
            </div>
            <a
              href={lightbox.url}
              download={lightbox.kind === "image" ? "hilmanai-gorsel.jpg" : "hilmanai-video.mp4"}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-3 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>İndir</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
