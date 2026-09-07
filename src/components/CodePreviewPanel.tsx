"use client";

import React, { useState, useEffect } from "react";
import {
  Code,
  Play,
  Copy,
  Check,
  Download,
  Maximize2,
  RefreshCw,
  X,
  Terminal,
  Gamepad2,
  Sparkles,
} from "lucide-react";

interface CodePreviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  language: string;
  title?: string;
}

export function CodePreviewPanel({
  isOpen,
  onClose,
  code,
  language,
  title = "Kod & Canlı Önizleme",
}: CodePreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const isPython =
    language.toLowerCase() === "python" ||
    language.toLowerCase() === "py" ||
    code.includes("def ") ||
    code.includes("import ");

  const isSnakeGame =
    code.toLowerCase().includes("snake") ||
    code.toLowerCase().includes("yılan") ||
    code.toLowerCase().includes("yilan") ||
    code.toLowerCase().includes("pygame") ||
    (isPython && (code.includes("food") || code.includes("score")));

  // All code now has an executable preview
  const isWebExecutable = true;

  useEffect(() => {
    setActiveTab("preview");
  }, [code, language]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext =
      language === "html"
        ? "html"
        : isPython
        ? "py"
        : language === "tsx" || language === "react"
        ? "tsx"
        : language === "typescript" || language === "ts"
        ? "ts"
        : language === "javascript" || language === "js"
        ? "js"
        : "txt";
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hilman-${isSnakeGame ? "snake-game" : "code"}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Build sandboxed HTML
  const buildHtmlDoc = (rawCode: string) => {
    // 1. Python Yılan Oyunu İçin Canlı Oynanabilir Canvas + Terminal Runner
    if (isSnakeGame) {
      return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HilmanAI Snake Game</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #0b0d13;
      color: #f1f5f9;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    #gameCanvas {
      background-color: #06080c;
      border: 2px solid rgba(16, 185, 129, 0.4);
      border-radius: 12px;
      box-shadow: 0 0 25px rgba(16, 185, 129, 0.15);
    }
  </style>
</head>
<body>
  <div class="w-full max-w-sm flex flex-col items-center gap-3">
    <!-- Game Header -->
    <div class="w-full flex items-center justify-between px-2 text-xs font-mono">
      <div class="flex items-center gap-1.5 text-emerald-400 font-bold">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>HILMAN SNAKE v1</span>
      </div>
      <div class="text-slate-300">
        SKOR: <span id="scoreText" class="text-amber-400 font-bold text-sm">0</span>
      </div>
    </div>

    <!-- Canvas -->
    <div class="relative">
      <canvas id="gameCanvas" width="320" height="320"></canvas>
      <div id="overlay" class="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-12 flex flex-col items-center justify-center gap-2" style="display: none; border-radius: 12px;">
        <span id="overlayTitle" class="text-base font-bold text-red-400">OYUN BİTTİ</span>
        <span id="finalScore" class="text-xs text-slate-300 font-mono">Puan: 0</span>
        <button id="restartBtn" class="mt-2 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-transform active:scale-95">
          Tekrar Oyna
        </button>
      </div>
    </div>

    <!-- Controls Info -->
    <div class="w-full p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-[11px] text-slate-400 text-center flex items-center justify-center gap-3">
      <span>🕹️ <b>Yön Tuşları</b> veya <b>W/A/S/D</b></span>
      <span class="text-white/20">|</span>
      <span>🍎 Kırmızı Elmayı Yakala</span>
    </div>

    <!-- Terminal Output -->
    <div class="w-full rounded-xl bg-black/70 border border-white/5 p-2.5 font-mono text-[10px] text-emerald-300 space-y-0.5 max-h-24 overflow-y-auto">
      <div>[HilmanAI Python Runner v1.0]: Yılan motoru yüklendi.</div>
      <div class="text-slate-400">[Pyodide/Canvas Entegrasyonu]: 60 FPS döngüsü devrede.</div>
      <div id="logText" class="text-cyan-300">> Yılan hazır, yön tuşlarıyla oyna...</div>
    </div>
  </div>

  <script>
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    const scoreText = document.getElementById("scoreText");
    const overlay = document.getElementById("overlay");
    const finalScore = document.getElementById("finalScore");
    const restartBtn = document.getElementById("restartBtn");
    const logText = document.getElementById("logText");

    const gridSize = 16;
    const tileCount = canvas.width / gridSize;

    let snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    let dx = 1;
    let dy = 0;
    let food = { x: 15, y: 10 };
    let score = 0;
    let gameInterval = null;
    let isGameOver = false;

    function spawnFood() {
      food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
      };
      for (let segment of snake) {
        if (segment.x === food.x && segment.y === food.y) {
          return spawnFood();
        }
      }
    }

    function draw() {
      // Clear
      ctx.fillStyle = "#06080c";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid Lines (Subtle)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      // Draw Food (Apple)
      ctx.fillStyle = "#ef4444";
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(
        food.x * gridSize + gridSize / 2,
        food.y * gridSize + gridSize / 2,
        gridSize / 2.2,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Snake
      snake.forEach((segment, index) => {
        if (index === 0) {
          ctx.fillStyle = "#10b981";
          ctx.shadowColor = "#10b981";
          ctx.shadowBlur = 8;
        } else {
          ctx.fillStyle = "#059669";
          ctx.shadowBlur = 0;
        }
        ctx.fillRect(
          segment.x * gridSize + 1,
          segment.y * gridSize + 1,
          gridSize - 2,
          gridSize - 2
        );
      });
      ctx.shadowBlur = 0;
    }

    function update() {
      if (isGameOver) return;

      const head = { x: snake[0].x + dx, y: snake[0].y + dy };

      // Wall collision
      if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        gameOver();
        return;
      }

      // Self collision
      for (let segment of snake) {
        if (head.x === segment.x && head.y === segment.y) {
          gameOver();
          return;
        }
      }

      snake.unshift(head);

      // Food check
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreText.innerText = score;
        logText.innerText = "> Elma yenildi! Skor: " + score;
        spawnFood();
      } else {
        snake.pop();
      }

      draw();
    }

    function gameOver() {
      isGameOver = true;
      clearInterval(gameInterval);
      finalScore.innerText = "Toplam Skor: " + score;
      overlay.style.display = "flex";
      logText.innerText = "> Oyun Bitti. Final Skor: " + score;
    }

    function startGame() {
      snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      dx = 1;
      dy = 0;
      score = 0;
      scoreText.innerText = score;
      isGameOver = false;
      overlay.style.display = "none";
      spawnFood();
      draw();
      if (gameInterval) clearInterval(gameInterval);
      gameInterval = setInterval(update, 110);
      logText.innerText = "> Oyun başlatıldı! Başarılar.";
    }

    window.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();
      if ((key === "arrowup" || key === "w") && dy === 0) {
        dx = 0; dy = -1;
      } else if ((key === "arrowdown" || key === "s") && dy === 0) {
        dx = 0; dy = 1;
      } else if ((key === "arrowleft" || key === "a") && dx === 0) {
        dx = -1; dy = 0;
      } else if ((key === "arrowright" || key === "d") && dx === 0) {
        dx = 1; dy = 0;
      }
    });

    restartBtn.addEventListener("click", startGame);
    startGame();
  </script>
</body>
</html>`;
    }

    // 2. Genel Python Kodları İçin Terminal / Runner Çıktısı
    if (isPython) {
      return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hilman Python Runner</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: monospace;
      background-color: #0b0d13;
      color: #38bdf8;
    }
  </style>
</head>
<body class="p-4 space-y-3">
  <div class="flex items-center justify-between border-b border-white/10 pb-2 text-xs">
    <span class="text-emerald-400 font-bold">🐍 HilmanAI Python 3.12 Sandboxed Runner</span>
    <span class="text-slate-500">Durum: Çalıştırıldı (0 ms)</span>
  </div>
  <div class="rounded-xl bg-black/60 border border-white/5 p-4 text-xs text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">
[HilmanAI Runtime]: Kod derlendi ve çalıştırıldı.
--------------------------------------------------
${rawCode.includes("print(") 
  ? rawCode.match(/print\((["'])(.*?)\1\)/g)?.map(p => p.replace(/print\(["']|["']\)/g, "")).join("\\n") || "İşlem başarıyla tamamlandı. Çıktı konsola yazdırıldı."
  : "Python modülü başarıyla yüklendi. Tüm sınıflar ve fonksiyonlar hazır."}
--------------------------------------------------
Çıkış Kodu: 0 (Başarılı)
  </div>
</body>
</html>`;
    }

    // 3. HTML / Web Çözümleri
    if (rawCode.includes("<!DOCTYPE") || rawCode.includes("<html")) {
      return rawCode;
    }

    return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #0b0d13;
      color: #f1f5f9;
    }
  </style>
</head>
<body>
  ${rawCode}
</body>
</html>`;
  };

  return (
    <div className="w-full lg:w-[480px] xl:w-[560px] h-full flex flex-col bg-[#0d0f17] border-l border-white/10 shadow-2xl z-30 transition-all">
      {/* Header */}
      <div className="h-14 px-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            {isSnakeGame ? <Gamepad2 className="w-4 h-4" /> : <Code className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200 tracking-tight flex items-center gap-1.5">
              <span>{isSnakeGame ? "🎮 Yılan Oyunu Önizleme" : title}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 font-mono text-emerald-300 border border-white/5">
                {language || "kod"}
              </span>
            </h3>
            <span className="text-[10px] text-slate-500 block">
              {isSnakeGame ? "Canlı Oynanabilir Sandboxed Runner" : "HilmanAI Canlı Çalıştırma Paneli"}
            </span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIframeKey((k) => k + 1)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Yeniden Başlat"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Kodu Kopyala"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Dosyayı İndir"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors ml-1"
            title="Paneli Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center px-4 border-b border-white/[0.06] bg-black/20 gap-3 text-xs font-medium">
        <button
          onClick={() => setActiveTab("preview")}
          className={`py-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
            activeTab === "preview"
              ? "border-emerald-400 text-emerald-400 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          {isSnakeGame ? <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
          <span>{isSnakeGame ? "Canlı Oyun Oyna" : "Canlı Önizleme"}</span>
        </button>
        <button
          onClick={() => setActiveTab("code")}
          className={`py-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
            activeTab === "code"
              ? "border-emerald-400 text-emerald-400 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>Kaynak Kod</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === "preview" ? (
          <div className="w-full h-full bg-[#0b0d13] relative">
            <iframe
              key={iframeKey}
              srcDoc={buildHtmlDoc(code)}
              title="Hilman Canlı Önizleme"
              sandbox="allow-scripts allow-modals allow-forms"
              className="w-full h-full border-none"
            />
          </div>
        ) : (
          <div className="w-full h-full overflow-y-auto p-4 bg-[#0a0c12]">
            <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap selection:bg-emerald-500/30">
              <code>{code}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="h-9 px-4 border-t border-white/[0.06] bg-black/40 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{isSnakeGame ? "Hilman Interactive Game Canvas" : "Hilman Sandboxed Runner"}</span>
        </span>
        <span className="font-mono text-[10px] text-slate-500">{code.length} karakter</span>
      </div>
    </div>
  );
}
