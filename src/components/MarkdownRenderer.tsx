"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-invert max-w-none text-slate-200 text-sm md:text-[15px] leading-relaxed space-y-3">
      {renderBlocks(content)}
    </div>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-white/10 bg-[#0d0f17] text-xs font-mono shadow-md">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.04] border-b border-white/10 text-slate-400">
        <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[11px]">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          title="Kodu Kopyala"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Kopyalandı</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Kopyala</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-slate-200 leading-normal">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderBlocks(markdown: string): React.ReactNode[] {
  if (!markdown) return [];

  // Split by code blocks first
  const parts = markdown.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const firstLineEnd = part.indexOf("\n");
      let language = "text";
      let code = "";
      if (firstLineEnd !== -1) {
        language = part.substring(3, firstLineEnd).trim();
        code = part.substring(firstLineEnd + 1, part.length - 3);
      } else {
        code = part.substring(3, part.length - 3);
      }
      return <CodeBlock key={`code-${index}`} code={code} language={language} />;
    }

    // Process non-code markdown
    return <ParagraphBlock key={`text-${index}`} text={part} />;
  });
}

function splitRow(row: string): string[] {
  // Baştaki/sondaki | işaretini at, hücrelere böl (kaçışlı \| korunur)
  const inner = row.trim().replace(/^\|/, "").replace(/\|$/, "");
  return inner.split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, "|").trim());
}

function ParagraphBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let isNumbered = false;

  const flushList = () => {
    if (currentList.length > 0) {
      if (isNumbered) {
        elements.push(
          <ol key={`ol-${elements.length}`} className="list-decimal pl-5 space-y-1 my-2 text-slate-300">
            {currentList.map((item, i) => (
              <li key={i}>{formatInline(item)}</li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc pl-5 space-y-1 my-2 text-slate-300">
            {currentList.map((item, i) => (
              <li key={i}>{formatInline(item)}</li>
            ))}
          </ul>
        );
      }
      currentList = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Markdown Table (| başlık | ... + | --- | ayırıcı)
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const nextLine = (lines[i + 1] || "").trim();
      if (/^\|[\s:\-|]+\|$/.test(nextLine) && nextLine.includes("-")) {
        flushList();
        const headerCells = splitRow(trimmed);
        const bodyRows: string[][] = [];
        let j = i + 2;
        while (j < lines.length) {
          const rl = lines[j].trim();
          if (!rl.startsWith("|") || !rl.endsWith("|")) break;
          bodyRows.push(splitRow(rl));
          j++;
        }
        elements.push(
          <div key={`tbl-${i}`} className="my-3 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-xs md:text-[13px] border-collapse bg-white/[0.02]">
              <thead>
                <tr className="bg-emerald-500/10">
                  {headerCells.map((c, ci) => (
                    <th
                      key={ci}
                      className="px-3 py-2 text-left font-semibold text-emerald-300 border-b border-white/10 whitespace-nowrap"
                    >
                      {formatInline(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 1 ? "bg-white/[0.02]" : undefined}>
                    {row.map((c, ci) => (
                      <td key={ci} className="px-3 py-2 text-slate-200 border-b border-white/5 align-top">
                        {formatInline(c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        i = j - 1;
        continue;
      }
    }

    // Headers
    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={`h3-${i}`} className="text-base font-semibold text-emerald-400 mt-4 mb-1.5 flex items-center gap-1.5">
          {formatInline(trimmed.substring(4))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h2 key={`h2-${i}`} className="text-lg font-bold text-white mt-4 mb-2 pb-1 border-b border-white/10">
          {formatInline(trimmed.substring(3))}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushList();
      elements.push(
        <h1 key={`h1-${i}`} className="text-xl font-bold text-white mt-4 mb-2">
          {formatInline(trimmed.substring(2))}
        </h1>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      flushList();
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-2 border-emerald-500/60 pl-3.5 my-2 text-slate-400 italic bg-white/[0.02] py-1 rounded-r"
        >
          {formatInline(trimmed.substring(2))}
        </blockquote>
      );
      continue;
    }

    // Divider
    if (trimmed === "---" || trimmed === "***") {
      flushList();
      elements.push(<hr key={`hr-${i}`} className="my-4 border-white/10" />);
      continue;
    }

    // Unordered List
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (isNumbered) flushList();
      isNumbered = false;
      currentList.push(trimmed.substring(2));
      continue;
    }

    // Numbered List
    const matchNum = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (matchNum) {
      if (!isNumbered) flushList();
      isNumbered = true;
      currentList.push(matchNum[2]);
      continue;
    }

    // Normal text line
    flushList();
    if (trimmed.length > 0) {
      elements.push(
        <p key={`p-${i}`} className="my-1.5 text-slate-200">
          {formatInline(trimmed)}
        </p>
      );
    }
  }

  flushList();

  return <>{elements}</>;
}

function formatInline(text: string): React.ReactNode {
  // Process markdown images, inline code, bold, links, italic
  const tokens = text.split(/(!\[[^\]]*\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);

  return tokens.map((token, i) => {
    if (!token) return null;

    // Markdown Image: ![alt](url)
    const imgMatch = token.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      return (
        <span key={i} className="block my-3 max-w-lg rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-xl">
          <img
            src={imgMatch[2]}
            alt={imgMatch[1] || "HilmanAI Görsel"}
            className="w-full h-auto object-cover max-h-[440px]"
            loading="lazy"
          />
        </span>
      );
    }

    // Inline code
    if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-white/10 text-emerald-300 font-mono text-[13px] border border-white/5"
        >
          {token.substring(1, token.length - 1)}
        </code>
      );
    }

    // Bold
    if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
      return (
        <strong key={i} className="font-semibold text-white">
          {token.substring(2, token.length - 2)}
        </strong>
      );
    }

    // Italic
    if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
      return (
        <em key={i} className="italic text-slate-300">
          {token.substring(1, token.length - 1)}
        </em>
      );
    }

    // Link
    const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors inline-flex items-center gap-0.5"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return token;
  });
}
