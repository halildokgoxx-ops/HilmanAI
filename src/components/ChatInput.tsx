"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Mic,
  MicOff,
  Paperclip,
  X,
  Zap,
  FileText,
  Loader2,
  Brain,
  Sparkles,
  Square,
  Image as ImageIcon,
  Video as VideoIcon,
  MessageSquare,
  Eye,
} from "lucide-react";
import { CHAT_MODES, type ChatModeId, type ToolType } from "@/lib/constants";

interface ChatInputProps {
  onSendMessage: (
    text: string,
    mode: ChatModeId,
    attachedFile?: { name: string; content: string; type?: string } | null,
    toolType?: ToolType
  ) => void;
  isLoading: boolean;
  streamActive?: boolean;
  onStopStream?: () => void;
  onSendTestMessage: () => void;
  currentMode: ChatModeId;
  onSelectMode: (mode: ChatModeId) => void;
}

export function ChatInput({
  onSendMessage,
  isLoading,
  streamActive = false,
  onStopStream,
  onSendTestMessage,
  currentMode,
  onSelectMode,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [activeTool, setActiveTool] = useState<ToolType>("chat");
  const [isListening, setIsListening] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    content: string;
    type?: string;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
    }
  }, [input]);

  // Voice recognition setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "tr-TR";

      recognition.onresult = (event: any) => {
        // interimResults açıkken her olayda tüm sonuçları baştan eklersek
        // metin katlanarak tekrarlanır. Sadece FINAL sonuçları ekle.
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTranscript += res[0].transcript;
          }
        }
        if (finalTranscript) {
          setInput((prev) => (prev ? `${prev} ${finalTranscript}` : finalTranscript));
        }
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Tarayıcınız ses tanıma özelliğini desteklemiyor.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Mic start failed", err);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Dosya boyutu 10MB'tan küçük olmalıdır.");
      return;
    }

    const isImg = file.type.startsWith("image/");
    const reader = new FileReader();

    if (isImg) {
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setAttachedFile({
          name: file.name,
          content: dataUrl,
          type: file.type,
        });
        setActiveTool("vision");
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setAttachedFile({
          name: file.name,
          content: text,
          type: file.type || "text/plain",
        });
      };
      reader.readAsText(file);
    }

    e.target.value = "";
  };

  const handleSend = () => {
    if (isLoading) return;

    let fullMessage = input.trim();
    // Sunucu 20K sınırına takılmamak için dosya bütçesi girdiye göre ayarlanır
    const budget = Math.max(2000, 19000 - fullMessage.length - 500);
    const MAX_FILE_CHARS = Math.min(15000, budget);
    const excerpt = (content: string) =>
      content.length > MAX_FILE_CHARS
        ? content.slice(0, MAX_FILE_CHARS) +
          `\n\n[... dosyanın tamamı ${content.length} karakter; ilk ${MAX_FILE_CHARS} karakteri gösteriliyor ...]`
        : content;
    if (!fullMessage && attachedFile) {
      if (attachedFile.type?.startsWith("image/")) {
        fullMessage = "Bu görseli derinlemesine analiz et, detaylarını ve varsa kod/tasarım bileşenlerini açıkla.";
      } else {
        fullMessage = `[Eklenen Dosya: ${attachedFile.name}]\n\`\`\`\n${excerpt(attachedFile.content)}\n\`\`\`\n\nBu dosya içeriğini inceleyip analiz eder misin?`;
      }
    } else if (fullMessage && attachedFile && !attachedFile.type?.startsWith("image/")) {
      // Yazı + metin dosyası birlikteyse dosya göz ardı edilmesin
      fullMessage += `\n\n[Ekli Dosya: ${attachedFile.name}]\n\`\`\`\n${excerpt(attachedFile.content)}\n\`\`\``;
    }

    if (!fullMessage.trim() && !attachedFile) return;

    onSendMessage(fullMessage, currentMode, attachedFile, activeTool);
    setInput("");
    setAttachedFile(null);
    setActiveTool("chat");
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeModeConfig = CHAT_MODES[currentMode] || CHAT_MODES["düşünen"];

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 pb-4">
      {/* Attached file preview */}
      {attachedFile && (
        <div className="mb-2.5 flex items-center gap-3 p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300 w-fit shadow-md">
          {attachedFile.type?.startsWith("image/") ? (
            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-emerald-500/30 shrink-0">
              <img
                src={attachedFile.content}
                alt="Eklenen Görsel"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <div className="min-w-0 pr-1">
            <span className="font-mono text-xs text-slate-200 block max-w-[220px] truncate">
              {attachedFile.name}
            </span>
            <span className="text-[10px] text-emerald-400">
              {attachedFile.type?.startsWith("image/") ? "Vision Görsel Analizi Hazır" : "Metin/Kod Dosyası"}
            </span>
          </div>
          <button
            onClick={() => setAttachedFile(null)}
            className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Multimodal Tools & Modes Bar */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        {/* Multimodal Tools (Chat, Image, Video) */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#12141c] border border-white/5 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTool("chat")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTool === "chat"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "text-slate-400 hover:text-white"
            }`}
            title="Sohbet & Kodlama"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sohbet & Kod</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool("image")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTool === "image"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-white"
            }`}
            title="Resim Çiz (Hilman Diffusion)"
          >
            <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>Resim Çiz</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool("video")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTool === "video"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-white"
            }`}
            title="Video Oluştur (Hilman Motion Studio)"
          >
            <VideoIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Video Yap</span>
          </button>
        </div>

        {/* Reasoning Mode Pill Bar */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#12141c] border border-white/5 shadow-inner">
          <button
            type="button"
            onClick={() => onSelectMode("düşünen")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              currentMode === "düşünen"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                : "text-slate-400 hover:text-white"
            }`}
            title="Derin muhakeme (<think>) modu"
          >
            <Brain className="w-3.5 h-3.5 text-indigo-400" />
            <span>Düşünen</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectMode("pro")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              currentMode === "pro"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-white"
            }`}
            title="Kıdemli mimar standartları"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Pro</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectMode("hızlı")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              currentMode === "hızlı"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "text-slate-400 hover:text-white"
            }`}
            title="Hızlı doğrudan yanıt"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hızlı</span>
          </button>
        </div>
      </div>

      {/* Main Input Box */}
      <div className="relative rounded-2xl bg-[#13151b] border border-white/10 shadow-2xl focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all">
        {/* Hidden File Input supporting Images, Code & Documents */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.txt,.md,.json,.js,.ts,.tsx,.jsx,.py,.html,.css,.csv"
          onChange={handleFileUpload}
          className="hidden"
        />

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            activeTool === "image"
              ? "Çizilmesini istediğiniz görsel sahnesini tarif edin..."
              : activeTool === "video"
              ? "Oluşturulmasını istediğiniz video sahnesini tarif edin..."
              : activeTool === "vision"
              ? "Görsel yüklendi! Sormak veya analiz ettirmek istediğiniz detayı yazın..."
              : "HilmanAI'a sorun, kod yazdırın, resim/video tarif edin veya dosya ekleyin... (Enter ile gönder)"
          }
          rows={1}
          disabled={isLoading}
          className="w-full bg-transparent text-slate-100 placeholder:text-slate-500 px-4 pt-3.5 pb-12 focus:outline-none resize-none text-[15px] max-h-56 min-h-[54px] leading-relaxed"
        />

        {/* Action Bar Bottom */}
        <div className="absolute left-3 right-3 bottom-2.5 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1 pointer-events-auto">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
              title="Görsel (Vision) veya Kod Dosyası Ekle"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Microphone Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-1.5 rounded-lg transition-colors ${
                isListening
                  ? "text-red-400 bg-red-950/40 animate-pulse border border-red-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
              title={isListening ? "Dinlemeyi Durdur" : "Sesle Yazdır"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Quick Test Message Trigger */}
            <button
              type="button"
              onClick={onSendTestMessage}
              disabled={isLoading}
              className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-emerald-400/90 hover:text-emerald-300 bg-emerald-950/30 hover:bg-emerald-950/60 border border-emerald-500/20 transition-all"
              title="Hızlı Test Mesajı Gönder"
            >
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>Hızlı Test</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Active Tool / Mode Badge */}
            <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5">
              {activeTool === "image"
                ? "Diffusion"
                : activeTool === "video"
                ? "Motion"
                : activeTool === "vision"
                ? "Vision"
                : activeModeConfig.badge}
            </span>

            {/* Send / Stop Button */}
            {streamActive ? (
              <button
                type="button"
                onClick={onStopStream}
                className="p-2 rounded-xl flex items-center justify-center bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 transition-all active:scale-95"
                title="Üretimi Durdur"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !attachedFile)}
                className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                  input.trim() || attachedFile
                    ? "bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95"
                    : "bg-white/5 text-slate-600 cursor-not-allowed"
                }`}
                title="Gönder (Enter)"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 text-center text-[11px] text-slate-500 flex items-center justify-center gap-2">
        <span className="text-emerald-400 font-medium">HilmanAI v1 Beta</span>
        <span>•</span>
        <span>Çok Modlu Zeka (Vision • Resim • Video • Kod)</span>
        <span>•</span>
        <span className="text-slate-400">Shift + Enter yeni satır</span>
      </div>
    </div>
  );
}
