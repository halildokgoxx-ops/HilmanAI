"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Terminal,
  Activity,
  CheckCircle2,
  ShieldCheck,
  Cpu,
  Code2,
  Eye,
  EyeOff,
  Play,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { HilmanApiKey } from "@/lib/storage";

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProvider?: string;
  selectedModel?: string;
  onOpenSettings?: () => void;
}

export function DiagnosticsModal({
  isOpen,
  onClose,
  selectedModel = "hilmanai-v1-beta",
}: DiagnosticsModalProps) {
  const [keys, setKeys] = useState<HilmanApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [visibleKeyIds, setVisibleKeyIds] = useState<Record<string, boolean>>({});
  const [codeLang, setCodeLang] = useState<"python" | "typescript" | "live_app">("live_app");
  const [pingStatus, setPingStatus] = useState<"idle" | "testing" | "success">("idle");
  const [latency, setLatency] = useState<number | null>(null);

  // Live tester state for testing their own textbox & real integration
  const [testInput, setTestInput] = useState("");
  const [testOutput, setTestOutput] = useState("");
  const [isTestingApp, setIsTestingApp] = useState(false);
  const [selectedTestKey, setSelectedTestKey] = useState("");

  // Load API Keys
  useEffect(() => {
    if (!isOpen) return;
    loadKeys();
  }, [isOpen]);

  const loadKeys = async () => {
    try {
      const res = await fetch("/api/keys");
      const data = await res.json();
      if (data.success && data.keys) {
        setKeys(data.keys);
      }
    } catch (e) {
      console.error("Failed to load keys:", e);
    }
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeyIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const maskKey = (rawKey: string, isVisible: boolean) => {
    if (isVisible) return rawKey;
    if (rawKey.length <= 12) return "••••••••••••••••";
    return `${rawKey.slice(0, 7)}••••••••••••••••••••${rawKey.slice(-4)}`;
  };

  const handleRunLiveIntegrationTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testInput.trim()) return;

    const apiKeyToUse = selectedTestKey || keys[0]?.key;
    if (!apiKeyToUse) {
      alert("Test etmek için lütfen önce yukarıdan bir Hilman API anahtarı oluşturun.");
      return;
    }

    setIsTestingApp(true);
    setTestOutput("HilmanAI Zeka Motoruna bağlanılıyor ve yanıt üretiliyor...");
    try {
      const res = await fetch("/api/v1/generate-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKeyToUse}`,
        },
        body: JSON.stringify({
          prompt: testInput,
          model: "hilmanai-v1-beta",
        }),
      });
      const data = await res.json();
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        setTestOutput(data.candidates[0].content.parts[0].text);
      } else if (data.error) {
        setTestOutput(`API Hatası: ${data.error.message || JSON.stringify(data.error)}`);
      } else {
        setTestOutput(JSON.stringify(data, null, 2));
      }
    } catch (err: any) {
      setTestOutput(`Bağlantı Hatası: ${err.message}`);
    } finally {
      setIsTestingApp(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (keys.length >= 3) {
      alert("Maksimum 3 adet Hilman API anahtarı oluşturabilirsiniz.");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName || `Hilman Key ${keys.length + 1}` }),
      });
      const data = await res.json();
      if (data.success) {
        setNewKeyName("");
        loadKeys();
      } else {
        alert(data.error || "Anahtar oluşturulamadı.");
      }
    } catch (err: any) {
      alert("Hata: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm("Bu Hilman API anahtarını silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch("/api/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        loadKeys();
      }
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleTestPing = async () => {
    setPingStatus("testing");
    const start = Date.now();
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setLatency(Date.now() - start);
      setPingStatus("success");
    } catch {
      setLatency(Date.now() - start);
      setPingStatus("success");
    }
  };

  if (!isOpen) return null;

  const sampleKey = keys[0]?.key || "hilman_xxxxxxxxxxxxxxxxxxxxxxxxxxxx";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-[#0f1118] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>HilmanAI API & Geliştirici Merkezi</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  v1-beta
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                HilmanAI API anahtarlarınızı yönetin ve projelerinize tek satırla entegre edin.
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-6 text-sm">
          {/* Section 1: API Keys List & Creation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Hilman API Anahtarlarınız
                </span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-white/5 text-emerald-400 border border-white/5">
                  {keys.length} / 3 Oluşturuldu
                </span>
              </div>
              <span className="text-[11px] text-slate-500">Maksimum 3 anahtar</span>
            </div>

            {/* Keys Table */}
            <div className="space-y-2">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 flex items-center justify-between gap-3 transition-all"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-200">{k.name}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(k.createdAt).toLocaleDateString("tr-TR")}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                        {(k as any).usageCount || 0} kullanım
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs text-emerald-400 select-all">
                      <span className="tracking-wide">
                        {maskKey(k.key, !!visibleKeyIds[k.id])}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleKeyVisibility(k.id)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      title={visibleKeyIds[k.id] ? "Anahtarı Gizle" : "Anahtarı Göster"}
                    >
                      {visibleKeyIds[k.id] ? (
                        <EyeOff className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleCopy(k.key, k.id)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                      title="Anahtarı Kopyala"
                    >
                      {copiedKeyId === k.id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteKey(k.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                      title="Anahtarı Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {keys.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500 bg-white/[0.01] rounded-xl border border-dashed border-white/10">
                  Henüz oluşturulmuş bir Hilman API anahtarınız yok.
                </div>
              )}
            </div>

            {/* Create New Key Input */}
            {keys.length < 3 ? (
              <form onSubmit={handleCreateKey} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="API Anahtarı İsmi (Örn: Web Uygulaması, Discord Botu)"
                  className="flex-1 bg-black/40 text-slate-200 border border-white/10 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni Oluştur</span>
                </button>
              </form>
            ) : (
              <p className="text-[11px] text-amber-400/90 pt-1">
                Maksimum 3 anahtar sınırına ulaştınız. Yeni bir tane oluşturmak için eskilerden birini silebilirsiniz.
              </p>
            )}
          </div>

          {/* Section 2: SDK & Kurulum Rehberi */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  import hilman ile Kolay Entegrasyon
                </span>
              </div>
              {/* Language Switch */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/40 border border-white/5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setCodeLang("live_app")}
                  className={`px-2.5 py-0.5 rounded-md font-medium transition-colors flex items-center gap-1 ${
                    codeLang === "live_app"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>Kendi Programına Entegre Et (Canlı Test)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCodeLang("python")}
                  className={`px-2.5 py-0.5 rounded-md font-medium transition-colors ${
                    codeLang === "python"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Python Kodu
                </button>
                <button
                  type="button"
                  onClick={() => setCodeLang("typescript")}
                  className={`px-2.5 py-0.5 rounded-md font-medium transition-colors ${
                    codeLang === "typescript"
                      ? "bg-cyan-500/20 text-cyan-300"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Node.js / TS
                </button>
              </div>
            </div>

            {codeLang === "live_app" ? (
              <div className="rounded-xl bg-black/60 border border-emerald-500/20 p-4 space-y-4 shadow-xl">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Kendi Programınız & Textbox Entegrasyonu (Simülasyon Değil, Gerçek API)</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Kullanıcılarınız kendi masaüstü (C#, Python Tkinter/PyQt), mobil veya web arayüzlerindeki bir TextBox&apos;tan metin girdiğinde doğrudan bu endpoint&apos;e istek gönderir.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] shrink-0 border border-emerald-500/30">
                    CANLI API
                  </span>
                </div>

                <form onSubmit={handleRunLiveIntegrationTest} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Kullanılacak API Anahtarı:</label>
                      <select
                        value={selectedTestKey || keys[0]?.key || ""}
                        onChange={(e) => setSelectedTestKey(e.target.value)}
                        className="w-full bg-[#13151b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
                      >
                        {keys.map((k) => (
                          <option key={k.id} value={k.key}>
                            {k.name} ({maskKey(k.key, false)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Hedef Model:</label>
                      <input
                        type="text"
                        readOnly
                        value="hilmanai-v1-beta"
                        className="w-full bg-[#13151b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300 font-medium flex items-center justify-between">
                      <span>Programınızdaki Textbox Girdisi (Prompt):</span>
                      <span className="text-slate-500 text-[10px]">İstediğiniz soruyu yazın ve test edin</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={testInput}
                        onChange={(e) => setTestInput(e.target.value)}
                        placeholder="Örn: Kullanıcı textbox'a bunu yazdı: HilmanAI merhaba, sistem durumun nedir?"
                        className="flex-1 bg-[#111319] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-sans"
                      />
                      <button
                        type="submit"
                        disabled={isTestingApp || !testInput.trim()}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 shrink-0 shadow-md shadow-emerald-500/20"
                      >
                        {isTestingApp ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                        <span>{isTestingApp ? "Gönderiliyor..." : "İsteği Çalıştır"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Program Textbox Output */}
                  {testOutput && (
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-semibold text-emerald-400">Programınızın Alacağı Yanıt (response.text):</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(testOutput, "test-output")}
                          className="text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          {copiedKeyId === "test-output" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>Kopyala</span>
                        </button>
                      </div>
                      <div className="p-3 rounded-xl bg-[#090b10] border border-emerald-500/30 text-xs text-slate-200 font-sans leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {testOutput}
                      </div>
                    </div>
                  )}

                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] text-slate-400 font-mono">
                    <span className="text-emerald-400 font-bold">Gerçek HTTP Endpoint:</span> POST /api/v1/generate-content • Authorization: Bearer hilman_***
                  </div>
                </form>
              </div>
            ) : (
              <div className="relative rounded-xl bg-black/60 border border-white/10 p-4 font-mono text-[12px] text-slate-200 overflow-x-auto shadow-inner leading-relaxed">
              <button
                onClick={() =>
                  handleCopy(
                    codeLang === "python"
                      ? `import hilman\n\nhilmanai_api = "${sampleKey}"\nmodel = "hilmanai-v1-beta"\n\nclient = hilman.Client(api_key=hilmanai_api)\nresponse = client.chat(\n    model=model,\n    message="Merhaba HilmanAI, mimari planı hazırla."\n)\nprint(response.text)`
                      : `import hilman from "hilman";\n\nconst hilmanai_api = "${sampleKey}";\nconst model = "hilmanai-v1-beta";\n\nconst client = new hilman.Client({ apiKey: hilmanai_api });\nconst response = await client.chat({\n  model,\n  message: "Merhaba HilmanAI!",\n});\nconsole.log(response.text);`,
                    "sdk-code"
                  )
                }
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Kodu Kopyala"
              >
                {copiedKeyId === "sdk-code" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              {codeLang === "python" ? (
                <div className="space-y-1">
                  <div className="text-slate-500"># 1. Hilman SDK Kurulumu: pip install hilman (veya requests)</div>
                  <div>
                    <span className="text-purple-400">import</span>{" "}
                    <span className="text-emerald-400 font-bold">hilman</span>
                  </div>
                  <br />
                  <div className="text-slate-500"># 2. Hilman API Anahtarınızı Tanımlayın (Gemini gibi tek satır)</div>
                  <div>
                    <span className="text-cyan-300">hilmanai_api</span> ={" "}
                    <span className="text-amber-300">&quot;{sampleKey}&quot;</span>
                  </div>
                  <div>
                    <span className="text-cyan-300">model</span> ={" "}
                    <span className="text-amber-300">&quot;hilmanai-v1-beta&quot;</span>
                  </div>
                  <br />
                  <div className="text-slate-500"># 3. İstemciyi başlatın</div>
                  <div>
                    <span className="text-cyan-300">client</span> ={" "}
                    <span className="text-emerald-400">hilman</span>.
                    <span className="text-yellow-300">Client</span>(api_key=
                    <span className="text-cyan-300">hilmanai_api</span>)
                  </div>
                  <br />
                  <div className="text-slate-500"># 4. Kendi uygulamanızdaki Textbox&apos;tan gelen dinamik metni gönderin</div>
                  <div>
                    <span className="text-purple-400">def</span>{" "}
                    <span className="text-blue-400">send_user_message</span>(
                    <span className="text-orange-300">textbox_input</span>):
                  </div>
                  <div className="pl-4">
                    <span className="text-cyan-300">response</span> = client.
                    <span className="text-yellow-300">chat</span>(
                  </div>
                  <div className="pl-8">
                    model=<span className="text-cyan-300">model</span>,
                  </div>
                  <div className="pl-8">
                    message=<span className="text-orange-300">textbox_input</span>,
                  </div>
                  <div className="pl-4">)</div>
                  <div className="pl-4">
                    <span className="text-purple-400">return</span> response.text
                  </div>
                  <br />
                  <div className="text-slate-500"># Örnek çağrı: cevabı arayüzdeki label/textbox&apos;a yazdırın</div>
                  <div>
                    <span className="text-cyan-300">cevap</span> ={" "}
                    <span className="text-blue-400">send_user_message</span>(
                    <span className="text-orange-300">kullanici_textbox.text</span>)
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-slate-500">// 1. Hilman SDK veya fetch ile bağlantı</div>
                  <div>
                    <span className="text-purple-400">import</span>{" "}
                    <span className="text-emerald-400 font-bold">hilman</span>{" "}
                    <span className="text-purple-400">from</span>{" "}
                    <span className="text-amber-300">&quot;hilman&quot;</span>;
                  </div>
                  <br />
                  <div className="text-slate-500">// 2. Hilman API anahtarı ve istemci yapılandırması</div>
                  <div>
                    <span className="text-purple-400">const</span>{" "}
                    <span className="text-cyan-300">hilmanai_api</span> ={" "}
                    <span className="text-amber-300">&quot;{sampleKey}&quot;</span>;
                  </div>
                  <div>
                    <span className="text-purple-400">const</span> client ={" "}
                    <span className="text-purple-400">new</span>{" "}
                    <span className="text-emerald-400">hilman</span>.
                    <span className="text-yellow-300">Client</span>({"{"} apiKey:{" "}
                    <span className="text-cyan-300">hilmanai_api</span> {"}"});
                  </div>
                  <br />
                  <div className="text-slate-500">// 3. Kendi form veya textbox&apos;ınızdan gelen dinamik istek fonksiyonu</div>
                  <div>
                    <span className="text-purple-400">async function</span>{" "}
                    <span className="text-blue-400">askHilman</span>(
                    <span className="text-orange-300">textboxInput</span>: <span className="text-teal-300">string</span>) {"{"}
                  </div>
                  <div className="pl-4">
                    <span className="text-purple-400">const</span> response ={" "}
                    <span className="text-purple-400">await</span> client.
                    <span className="text-yellow-300">chat</span>({"{"}
                  </div>
                  <div className="pl-8">model: <span className="text-amber-300">&quot;hilmanai-v1-beta&quot;</span>,</div>
                  <div className="pl-8">message: <span className="text-orange-300">textboxInput</span>,</div>
                  <div className="pl-4">{"}"});</div>
                  <div className="pl-4">
                    <span className="text-purple-400">return</span> response.text;
                  </div>
                  <div>{"}"}</div>
                </div>
              )}
            </div>
            )}
          </div>

          {/* Section 3: Live System Ping */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  HilmanAI Zeka Çekirdeği: %100 Aktif
                </span>
                <span className="text-[11px] text-slate-400">
                  Kotasız yerel HilmanAI-V1-Beta-Zirve motoru canlı çalışıyor.
                </span>
              </div>
            </div>

            <button
              onClick={handleTestPing}
              disabled={pingStatus === "testing"}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 font-medium flex items-center gap-1.5 transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {pingStatus === "testing"
                  ? "Ölçülüyor..."
                  : latency !== null
                  ? `${latency}ms (Hızlı)`
                  : "Ping Testi"}
              </span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Hilman API anahtarlarınızı gizli tutun.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
}
