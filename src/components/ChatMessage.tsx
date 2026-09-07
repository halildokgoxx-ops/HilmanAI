"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  User,
  Copy,
  Check,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Brain,
  Cpu,
  AlertCircle,
  Download,
  Maximize2,
  Play,
  Pause,
  RotateCcw,
  Eye,
  X,
  ThumbsUp,
  ThumbsDown,
  MoreVertical,
  RefreshCw,
  Film,
  Code2,
  Globe,
  ExternalLink,
} from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import type { MessageData } from "@/lib/storage";

interface ChatMessageProps {
  message: MessageData | any;
  onRegenerate?: () => void;
  isLastAssistant?: boolean;
  onOpenCodePreview?: (code: string, language: string) => void;
}

export function ChatMessage({
  message,
  onRegenerate,
  isLastAssistant,
  onOpenCodePreview,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(message.feedback || null);
  const [showMenu, setShowMenu] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const sourcesRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
      if (sourcesRef.current && !sourcesRef.current.contains(e.target as Node)) {
        setShowSources(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFeedback = async (type: "like" | "dislike") => {
    const nextVal = feedback === type ? null : type;
    setFeedback(nextVal);
    try {
      await fetch(`/api/messages/${message.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: nextVal }),
      });
    } catch (e) {
      console.error("Feedback error:", e);
    }
  };

  // Helper to extract code if present (prioritize actual programming languages over shell/bash commands)
  const extractCode = () => {
    const regex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const blocks: Array<{ lang: string; code: string; length: number }> = [];
    let match;
    while ((match = regex.exec(message.content)) !== null) {
      const lang = (match[1] || "html").toLowerCase();
      const code = match[2].trim();
      blocks.push({ lang, code, length: code.length });
    }

    if (blocks.length === 0) return null;

    // Shell/terminal komutlarını eleyip gerçek programlama dillerini (Python, JS, HTML, React vb.) öne al
    const shellLangs = ["bash", "sh", "shell", "cmd", "terminal", "zsh"];
    const programmingBlocks = blocks.filter((b) => !shellLangs.includes(b.lang));

    if (programmingBlocks.length > 0) {
      // En kapsamlı / uzun kod bloğunu seç
      programmingBlocks.sort((a, b) => b.length - a.length);
      return { lang: programmingBlocks[0].lang, code: programmingBlocks[0].code };
    }

    return { lang: blocks[0].lang, code: blocks[0].code };
  };
  const extractedCode = extractCode();

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (!("speechSynthesis" in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message.content.replace(/[#*`_~]/g, ""));
    utterance.lang = "tr-TR";
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const toggleVideo = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => { });
      setIsVideoPlaying(true);
    } else {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    }
  };

  const restartVideo = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play().catch(() => { });
    setIsVideoPlaying(true);
  };

  const formattedTime = new Date(message.createdAt).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <div
        className={`group relative flex gap-3.5 md:gap-4 py-4 px-3 md:px-6 transition-colors ${isUser
            ? "bg-transparent hover:bg-white/[0.01]"
            : "bg-[#111319]/70 hover:bg-[#111319] border-y border-white/[0.03]"
          }`}
      >
        {/* Avatar */}
        <div className="shrink-0 pt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 shadow-sm">
              <User className="w-4 h-4" />
            </div>
          ) : (
            <div className="relative">
              <div className="w-8 h-8 rounded-xl overflow-hidden border border-cyan-500/30 shadow-md shadow-indigo-500/20 bg-black">
                <img
                  src="/hilman-logo.png"
                  alt="HilmanAI"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header line */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200">
                {isUser ? "Siz" : "HilmanAI"}
              </span>
              {!isUser && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/[0.05] text-emerald-300 border border-white/5">
                  <Cpu className="w-2.5 h-2.5 text-emerald-400" />
                  HilmanAI v1 Beta
                </span>
              )}
              <span className="text-[11px] text-slate-500">{formattedTime}</span>
              {!isUser && !!message.latencyMs && (
                <span className="text-[10px] font-mono text-slate-500">
                  {(message.latencyMs / 1000).toFixed(1)}sn
                </span>
              )}
            </div>

            {/* Quick Actions for Assistant message */}
            {!isUser && (
              <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                {/* Like Button */}
                <button
                  onClick={() => handleFeedback("like")}
                  className={`p-1 rounded transition-colors ${feedback === "like"
                      ? "text-emerald-400 bg-emerald-500/10"
                      : "text-slate-400 hover:text-white hover:bg-white/10"
                    }`}
                  title="Beğen"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>

                {/* Dislike Button */}
                <button
                  onClick={() => handleFeedback("dislike")}
                  className={`p-1 rounded transition-colors ${feedback === "dislike"
                      ? "text-red-400 bg-red-500/10"
                      : "text-slate-400 hover:text-white hover:bg-white/10"
                    }`}
                  title="Beğenme"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>

                {/* Kaynağı İncele (Sadece Zincir Emojisi 🔗) */}
                {message.searchResults && message.searchResults.length > 0 && (
                  <div className="relative" ref={sourcesRef}>
                    <button
                      onClick={() => setShowSources(!showSources)}
                      className={`p-1 rounded transition-all flex items-center justify-center ${
                        showSources
                          ? "bg-cyan-500/20 text-white shadow-sm ring-1 ring-cyan-500/40"
                          : "text-slate-400 hover:text-white hover:bg-white/10"
                      }`}
                      title="Kaynağı İncele"
                    >
                      <span className="text-xs select-none">🔗</span>
                    </button>

                    {showSources && (
                      <div className="absolute right-0 mt-1 w-72 sm:w-80 rounded-xl bg-[#141620] border border-cyan-500/30 shadow-2xl p-2.5 z-40 space-y-2 text-xs divide-y divide-white/5">
                        <div className="flex items-center justify-between pb-1.5 text-cyan-300 font-semibold text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <span>🔗</span>
                            <span>İncelenen Kaynaklar ({message.searchResults.length})</span>
                          </span>
                          <button
                            onClick={() => setShowSources(false)}
                            className="text-slate-400 hover:text-white p-0.5 rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="space-y-1.5 pt-1.5 max-h-56 overflow-y-auto pr-1">
                          {message.searchResults.map((item: any, idx: number) => (
                            <a
                              key={idx}
                              href={item.url || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="block p-2 rounded-lg bg-white/[0.03] hover:bg-cyan-950/40 border border-white/5 hover:border-cyan-500/30 transition-colors group/src"
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="font-medium text-slate-200 group-hover/src:text-cyan-300 text-[11px] truncate">
                                  {item.title}
                                </span>
                                <ExternalLink className="w-3 h-3 text-slate-400 group-hover/src:text-cyan-300 shrink-0" />
                              </div>
                              {item.snippet && (
                                <p className="text-slate-400 text-[10px] mt-0.5 line-clamp-2 leading-tight">
                                  {item.snippet}
                                </p>
                              )}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Copy Button */}
                <button
                  onClick={handleCopy}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Metni Kopyala"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                {/* Speech Button */}
                <button
                  onClick={handleSpeak}
                  className={`p-1 rounded transition-colors ${isSpeaking
                      ? "text-emerald-400 bg-emerald-500/10"
                      : "text-slate-400 hover:text-white hover:bg-white/10"
                    }`}
                  title={isSpeaking ? "Durdur" : "Sesli Dinle"}
                >
                  {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>

                {/* 3-dots Menu */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Diğer Seçenekler"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>

                  {showMenu && (
                    <div className="absolute right-0 mt-1 w-44 rounded-xl bg-[#141620] border border-white/10 shadow-2xl py-1.5 z-30 divide-y divide-white/5 text-xs">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            handleCopy();
                            setShowMenu(false);
                          }}
                          className="w-full px-3 py-1.5 text-left text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Metni Kopyala</span>
                        </button>
                        {onRegenerate && (
                          <button
                            onClick={() => {
                              onRegenerate();
                              setShowMenu(false);
                            }}
                            className="w-full px-3 py-1.5 text-left text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Yeniden Oluştur</span>
                          </button>
                        )}
                        {extractedCode && onOpenCodePreview && (
                          <button
                            onClick={() => {
                              onOpenCodePreview(extractedCode.code, extractedCode.lang);
                              setShowMenu(false);
                            }}
                            className="w-full px-3 py-1.5 text-left text-emerald-300 hover:bg-white/5 hover:text-emerald-200 flex items-center gap-2 font-medium"
                          >
                            <Play className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Canlı Önizleme Aç</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            handleSpeak();
                            setShowMenu(false);
                          }}
                          className="w-full px-3 py-1.5 text-left text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>Sesli Dinle</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Attached Image (Vision Input) */}
          {isUser && message.imageUrl && (
            <div className="mb-2 max-w-sm rounded-xl overflow-hidden border border-white/10 shadow-lg">
              <img
                src={message.imageUrl}
                alt="Yüklenen Görsel"
                className="w-full h-auto object-cover max-h-72 cursor-pointer hover:opacity-95 transition-opacity"
                onClick={() => setModalImage(message.imageUrl)}
              />
            </div>
          )}


          {/* Reasoning Dropdown (SADECE non-empty reasoning olduğunda!) */}
          {!isUser && message.reasoning && message.reasoning.trim().length > 0 && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 overflow-hidden text-xs my-2 transition-all">
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="w-full flex items-center justify-between px-3.5 py-2 text-indigo-300 hover:text-indigo-200 hover:bg-indigo-950/40 transition-colors"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Brain className="w-4 h-4 text-indigo-400 animate-pulse" />
                  <span>HilmanAI Düşünce Zinciri & Analiz ({message.reasoning.length} karakter)</span>
                </span>
                {showReasoning ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showReasoning && (
                <div className="p-3.5 text-slate-300 bg-black/40 border-t border-indigo-500/20 whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-64 overflow-y-auto">
                  {message.reasoning}
                </div>
              )}
            </div>
          )}

          {/* Assistant Generated Image (Vision Diffusion) */}
          {!isUser && message.imageUrl && !message.videoUrl && (
            <div className="my-3 max-w-lg rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-2xl relative group/img">
              <img
                src={message.imageUrl}
                alt="HilmanAI Tarafından Üretilen Görsel"
                className="w-full h-auto object-cover max-h-[460px] cursor-pointer hover:scale-[1.01] transition-transform duration-300"
                onClick={() => setModalImage(message.imageUrl)}
              />
              <div className="absolute bottom-2 right-2 flex items-center gap-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/70 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10">
                <a
                  href={message.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  download="hilmanai-image.jpg"
                  className="text-xs text-slate-200 hover:text-white flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>İndir</span>
                </a>
                <span className="text-white/20">|</span>
                <button
                  onClick={() => setModalImage(message.imageUrl)}
                  className="text-xs text-slate-200 hover:text-white flex items-center gap-1"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Büyüt</span>
                </button>
              </div>
            </div>
          )}

          {/* Assistant Generated Video (HilmanAI Motion Studio) */}
          {!isUser && message.videoUrl && (
            <div className="my-3 max-w-xl rounded-2xl overflow-hidden border border-white/10 bg-[#0a0c12] shadow-2xl">
              <div className="relative aspect-video bg-black">
                {/* Poster/Loading background */}
                {message.imageUrl && (
                  <img
                    src={message.imageUrl}
                    alt="Video poster"
                    className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm"
                  />
                )}
                <video
                  ref={videoRef}
                  src={message.videoUrl}
                  poster={message.imageUrl || undefined}
                  controls
                  playsInline
                  preload="metadata"
                  className="relative w-full h-full object-contain z-10"
                  onError={(e) => {
                    console.warn("Video yüklenemedi:", message.videoUrl);
                  }}
                >
                  Tarayıcınız video etiketini desteklemiyor.
                </video>
              </div>

              {/* Player Bar */}
              <div className="p-3 bg-[#0e1017] border-t border-white/5 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-emerald-400 font-mono text-[11px]">
                    HilmanAI Motion Studio v2
                  </span>
                  <span className="text-slate-500">• 720p Sinematik</span>
                </div>

                <a
                  href={message.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  download="hilmanai-motion.mp4"
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Videoyu İndir</span>
                </a>
              </div>
            </div>
          )}

          {/* Prominent Code Action Banner (When Code is Detected) */}
          {!isUser && extractedCode && onOpenCodePreview && (
            <div className="my-2.5 p-3 rounded-xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-black border border-emerald-500/30 flex items-center justify-between shadow-lg shadow-emerald-950/20">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <span>{extractedCode.lang.toUpperCase()} Çözümü Hazır</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Kodu yan panelde anında canlı çalıştırabilir ve test edebilirsiniz.
                  </span>
                </div>
              </div>

              <button
                onClick={() => onOpenCodePreview(extractedCode.code, extractedCode.lang)}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/25 transition-all active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>Canlı Önizleme Aç</span>
              </button>
            </div>
          )}

          {/* Body Text */}
          <div className="text-slate-200">
            {message.isError && (
              <div className="mb-2.5 p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <span className="font-semibold block text-red-300">İstek Hatası</span>
                  <p className="text-slate-300 leading-normal">{message.content}</p>
                </div>
              </div>
            )}

            {!message.isError && <MarkdownRenderer content={message.content} />}
          </div>
        </div>
      </div>

      {/* Image Modal Preview */}
      {modalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setModalImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setModalImage(null)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={modalImage}
              alt="Büyütülmüş Görsel"
              className="max-w-full max-h-[85vh] rounded-xl object-contain border border-white/10 shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
