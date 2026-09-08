import { NextRequest, NextResponse } from "next/server";
import {
  createConversation,
  updateConversation,
  addMessage,
  getRecentMessages,
} from "@/lib/db-helpers";
import { hilmanStorage } from "@/lib/storage";
import { getSessionUser, unauthorized, forbidden } from "@/lib/auth";
import { checkRateLimit, RATE_PROFILES } from "@/lib/rate-limit";
import { buildChatSystemPrompt } from "@/lib/chat-prompt";
import { enforceHilmanIdentity, stripParameterLeaks } from "@/lib/hilman-engine";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function sseEncode(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

/**
 * POST /api/chat/stream — canlı akan yanıt (SSE).
 * Sadece düz metin sohbet içindir (dosya/resim/video normal /api/chat yolunu kullanır).
 * Harici LLM'in tamamı çökerse 503 + {fallback:true} döner; istemci sessizce
 * normal POST /api/chat'e düşer (yerel çekirdek devreye girer).
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const limited = checkRateLimit(req, RATE_PROFILES.chat);
  if (limited) return limited;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Geçersiz istek." }, { status: 400 });
  }

  const {
    conversationId: incomingConvId,
    message: userContent,
    model: incomingModel,
    mode: incomingMode,
    apiKey: incomingApiKey,
    attachedFile,
    toolType,
  } = body;

  // Streaming yalnızca düz metin içindir
  if (attachedFile || (toolType && toolType !== "chat")) {
    return NextResponse.json(
      { success: false, fallback: true, error: "Bu tür streaming desteklemez." },
      { status: 400 }
    );
  }

  const session = getSessionUser(req);
  const authHeader = req.headers.get("authorization");
  const extractedKey = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : incomingApiKey;

  let keyOwner: string | null = null;
  if (extractedKey) {
    const owner = hilmanStorage.getApiKeyOwner(extractedKey);
    if (!owner) {
      return NextResponse.json({ success: false, error: "Geçersiz Hilman API Anahtarı." }, { status: 401 });
    }
    keyOwner = owner.ownerEmail || null;
  }
  if (!session && !extractedKey) return unauthorized();

  const actorEmail = session?.email || keyOwner || "api-user";
  const isAdmin = !!session?.isAdmin;

  if (!userContent || typeof userContent !== "string" || !userContent.trim()) {
    return NextResponse.json({ success: false, error: "Mesaj içeriği boş olamaz." }, { status: 400 });
  }
  if (userContent.length > 20000) {
    return NextResponse.json({ success: false, error: "Mesaj çok uzun." }, { status: 413 });
  }

  if (session && !extractedKey) {
    if (!hilmanStorage.getUser(session.email)) {
      hilmanStorage.upsertUser({ email: session.email, name: session.name, picture: session.picture || null });
    }
    const q = hilmanStorage.checkQuota(actorEmail);
    if (!q.allowed && !isAdmin) {
      return NextResponse.json({ success: false, error: "Kotanız doldu." }, { status: 429 });
    }
  }

  const { systemPrompt, model } = await buildChatSystemPrompt(actorEmail, incomingMode, incomingModel);

  // Sohbeti çöz/oluştur + kullanıcı mesajını kaydet
  let convId = incomingConvId;
  let isNewConv = false;
  if (!convId) {
    convId = generateId();
    isNewConv = true;
    const title =
      userContent.trim().length > 36 ? `${userContent.trim().substring(0, 36)}...` : userContent.trim();
    await createConversation({ id: convId, title, model, provider: "hilman-engine", systemPrompt, ownerEmail: actorEmail });
  } else if (!hilmanStorage.canAccessConversation(convId, actorEmail, isAdmin)) {
    return forbidden("Bu sohbete erişim yetkiniz yok.");
  }

  const userMessageId = generateId();
  await addMessage({ id: userMessageId, conversationId: convId, role: "user", content: userContent.trim() });

  const history = await getRecentMessages(convId, 10);
  const apiMessages: Array<{ role: string; content: string }> = [{ role: "system", content: systemPrompt }];
  for (const msg of history) {
    if (msg.role === "user" || msg.role === "assistant") {
      apiMessages.push({ role: msg.role, content: msg.content });
    }
  }

  const storageSettings = hilmanStorage.getSettings();
  const hfToken = process.env.HF_TOKEN?.trim() || (storageSettings as any)?.hfToken?.trim() || "";
  const groqKey = process.env.GROQ_API_KEY?.trim() || (storageSettings as any)?.groqApiKey?.trim() || "";
  // Sıra: önce Groq (hızlı + ayrı bedava kota), sonra HF modelleri
  const targets: Array<{ url: string; headers: Record<string, string>; body: any; tag: string }> = [];
  if (groqKey) {
    targets.push({
      url: "https://api.groq.com/openai/v1/chat/completions",
      headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: { model: "llama-3.1-8b-instant", messages: apiMessages, max_tokens: 2048, temperature: 0.7, stream: true },
      tag: "groq:llama-3.1-8b-instant",
    });
  }
  if (hfToken && hfToken.length > 10) {
    for (const m of ["deepseek-ai/DeepSeek-V3", "Qwen/Qwen2.5-72B-Instruct", "meta-llama/Llama-3.3-70B-Instruct"]) {
      targets.push({
        url: "https://router.huggingface.co/v1/chat/completions",
        headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
        body: { model: m, messages: apiMessages, max_tokens: 2048, temperature: 0.7, stream: true },
        tag: `hf:${m}`,
      });
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(new TextEncoder().encode(sseEncode(obj)));
      let streamed = false;
      let fullText = "";
      let usedModel = "";

      if (targets.length === 0) {
        send({ fallback: true, error: "Canlı akış için sağlayıcı yok." });
        controller.close();
        return;
      }
      for (const t of targets) {
        if (streamed) break;
        const upstream = new AbortController();
          const kill = setTimeout(() => upstream.abort(), 110000);
          // İstemci bağlantıyı keserse yukarı akışı da durdur
          const onClientAbort = () => upstream.abort();
          req.signal.addEventListener("abort", onClientAbort);
          try {
            const resp = await fetch(t.url, {
              method: "POST",
              headers: t.headers,
              body: JSON.stringify(t.body),
              signal: upstream.signal,
            });
            if (!resp.ok || !resp.body) continue;
            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buf = "";
            let gotAny = false;
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              buf += decoder.decode(value, { stream: true });
              const lines = buf.split("\n");
              buf = lines.pop() || "";
              for (const line of lines) {
                const ln = line.trim();
                if (!ln.startsWith("data:")) continue;
                const payload = ln.slice(5).trim();
                if (payload === "[DONE]") break;
                try {
                  const json = JSON.parse(payload);
                  const piece: string = json.choices?.[0]?.delta?.content || "";
                  if (piece) {
                    gotAny = true;
                    fullText += piece;
                    send({ token: piece });
                  }
                } catch {
                  // kısmi satır — yoksay
                }
              }
            }
            if (gotAny && fullText.trim()) {
              streamed = true;
              usedModel = t.tag;
            }
          } catch {
            // sıradaki sağlayıcıya geç
          } finally {
            clearTimeout(kill);
            req.signal.removeEventListener("abort", onClientAbort);
          }
        }

      if (!streamed) {
        send({ fallback: true, error: "Canlı akış kurulamadı." });
        controller.close();
        return;
      }

      // <think> ayıkla + kimlik/parametre temizliği
      let finalText = fullText;
      let reasoning = "";
      const thinkMatch = finalText.match(/<think>([\s\S]*?)<\/think>/);
      if (thinkMatch) {
        reasoning = thinkMatch[1].trim();
        finalText = finalText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      }
      finalText = stripParameterLeaks(enforceHilmanIdentity(finalText));

      const latencyMs = Date.now() - startTime;
      const assistantMessageId = generateId();
      const saved = await addMessage({
        id: assistantMessageId,
        conversationId: convId,
        role: "assistant",
        content: finalText,
        reasoning,
        model,
        provider: "hilman-engine",
        tokensUsed: Math.max(80, Math.floor(finalText.length / 3)),
        latencyMs,
        isError: false,
      });
      (saved as any).source = usedModel;
      hilmanStorage.setMessageSource(assistantMessageId, usedModel);

      await updateConversation(convId, { updatedAt: new Date().toISOString(), model, provider: "hilman-engine" });
      if (session && !isAdmin && !extractedKey) {
        hilmanStorage.consumeQuota(actorEmail);
      }

      send({
        done: true,
        conversationId: convId,
        isNewConversation: isNewConv,
        message: { ...saved, source: usedModel },
        latencyMs,
      });
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
