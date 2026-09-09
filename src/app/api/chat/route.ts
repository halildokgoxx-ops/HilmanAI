import { NextRequest, NextResponse } from "next/server";
import {
  createConversation,
  updateConversation,
  addMessage,
  getRecentMessages,
} from "@/lib/db-helpers";
import { hilmanStorage } from "@/lib/storage";
import { generateHilmanAutonomousResponse } from "@/lib/hilman-engine";
import { getSessionUser, unauthorized, forbidden } from "@/lib/auth";
import { checkRateLimit, RATE_PROFILES } from "@/lib/rate-limit";
import { buildChatSystemPrompt } from "@/lib/chat-prompt";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const limited = checkRateLimit(req, RATE_PROFILES.chat);
  if (limited) return limited;
  try {
    const body = await req.json();
    const {
      conversationId: incomingConvId,
      message: userContent,
      model: incomingModel,
      mode: incomingMode,
      apiKey: incomingApiKey,
      attachedFile,
      toolType,
    } = body;

    // --- Kimlik: önce Google session, yoksa Hilman API anahtarı (programatik) ---
    const session = getSessionUser(req);
    const authHeader = req.headers.get("authorization");
    const extractedKey = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : incomingApiKey;

    let keyOwner: string | null = null;
    if (extractedKey) {
      const owner = hilmanStorage.getApiKeyOwner(extractedKey);
      if (!owner) {
        return NextResponse.json(
          { success: false, error: "Geçersiz Hilman API Anahtarı. Lütfen API panelinden aldığınız 'hilman_...' anahtarını kontrol edin." },
          { status: 401 }
        );
      }
      keyOwner = owner.ownerEmail || null;
    }

    if (!session && !extractedKey) return unauthorized();

    const actorEmail = session?.email || keyOwner || "api-user";
    const isAdmin = !!session?.isAdmin;

    // Oturum var ama kullanıcı kaydı yoksa oluştur (kota sayacı için şart)
    if (session && !hilmanStorage.getUser(session.email)) {
      hilmanStorage.upsertUser({
        email: session.email,
        name: session.name,
        picture: session.picture || null,
      });
    }

    // Kota: plan kotası (API anahtarı muaf).
    // Admin dahil herkesin sayacı düşer; SADECE admin engellenmez.
    if (session && !extractedKey) {
      const q = hilmanStorage.checkQuota(actorEmail);
      if (!q.allowed && !isAdmin) {
        const planName =
          q.plan === "premium" ? "Premium" : q.plan === "premium_plus" ? "Premium Plus" : "Free";
        return NextResponse.json(
          {
            success: false,
            error: `${planName} kotanız doldu (${q.policy.periodLabel}). Yenilenme: ${new Date(
              (hilmanStorage.getUser(actorEmail)?.quotaResetAt as string) || Date.now()
            ).toLocaleString("tr-TR")}. Plan yükseltmek için yöneticiyle iletişime geçin.`,
          },
          { status: 429 }
        );
      }
    }

    if (!userContent || typeof userContent !== "string" || !userContent.trim()) {
      return NextResponse.json(
        { success: false, error: "Mesaj içeriği boş olamaz." },
        { status: 400 }
      );
    }

    // Boyut koruması (bellek şişmesini önle)
    if (userContent.length > 20000) {
      return NextResponse.json(
        { success: false, error: "Mesaj çok uzun (en fazla 20.000 karakter)." },
        { status: 413 }
      );
    }
    if (attachedFile?.content && attachedFile.content.length > 15 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "Dosya çok büyük (en fazla ~10MB)." },
        { status: 413 }
      );
    }

    const { systemPrompt, activeMode, model } = await buildChatSystemPrompt(
      actorEmail,
      incomingMode,
      incomingModel
    );

    // 1. Resolve or Create Conversation (sahiplik zorunlu)
    let convId = incomingConvId;
    let isNewConv = false;

    if (!convId) {
      convId = generateId();
      isNewConv = true;
      const title =
        userContent.trim().length > 36
          ? `${userContent.trim().substring(0, 36)}...`
          : userContent.trim();

      await createConversation({
        id: convId,
        title,
        model,
        provider: "hilman-engine",
        systemPrompt,
        ownerEmail: actorEmail,
      });
    } else {
      // Başkasının sohbetine yazmak yasak
      if (!hilmanStorage.canAccessConversation(convId, actorEmail, isAdmin)) {
        return forbidden("Bu sohbete erişim yetkiniz yok.");
      }
    }

    // 2. Insert User Message
    const userMessageId = generateId();
    await addMessage({
      id: userMessageId,
      conversationId: convId,
      role: "user",
      content: userContent.trim(),
      imageUrl: attachedFile?.type?.startsWith("image/") ? attachedFile.content : null,
      mediaType: attachedFile?.type?.startsWith("image/") ? "vision" : "text",
    });

    // 3. Fetch past messages for context
    const history = await getRecentMessages(convId, 10);
    const apiMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    for (const msg of history) {
      if (msg.role === "user" || msg.role === "assistant") {
        apiMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // 4. Generate Multimodal Response via Hilman Engine (Text, Vision, Image, Video)
    const autoResp = await generateHilmanAutonomousResponse(
      userContent,
      activeMode,
      apiMessages,
      attachedFile,
      toolType
    );

    let assistantReply = autoResp.content;
    let assistantReasoning = autoResp.reasoning;
    const tokensUsed = autoResp.tokensUsed;

    // Parse inline <think> tags if present
    if (assistantReply.includes("<think>")) {
      const match = assistantReply.match(/<think>([\s\S]*?)<\/think>/);
      if (match) {
        if (!assistantReasoning) {
          assistantReasoning = match[1].trim();
        }
        assistantReply = assistantReply.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      }
    }

    const latencyMs = Date.now() - startTime;

    // 5. Save Assistant Message
    const assistantMessageId = generateId();
    const savedAssistantMsg = await addMessage({
      id: assistantMessageId,
      conversationId: convId,
      role: "assistant",
      content: assistantReply,
      reasoning: assistantReasoning,
      imageUrl: autoResp.imageUrl || null,
      videoUrl: autoResp.videoUrl || null,
      mediaType: autoResp.mediaType || "text",
      model,
      provider: "hilman-engine",
      tokensUsed,
      latencyMs,
      searchResults: autoResp.searchResults || null,
      followUps: autoResp.followUps || null,
      source: autoResp.source || null,
      isError: false,
    });

    // 6. Update Conversation Timestamp
    await updateConversation(convId, {
      updatedAt: new Date().toISOString(),
      model,
      provider: "hilman-engine",
    });

    // 7. Kota düş (plus hariç herkes — admin dahil, gösterge herkes için işler).
    // Önbellekten gelen yanıt neredeyse bedavadır (1 hak).
    if (session && !extractedKey) {
      hilmanStorage.consumeQuota(actorEmail, autoResp.cached ? 1 : undefined);
    }

    return NextResponse.json({
      success: true,
      conversationId: convId,
      isNewConversation: isNewConv,
      message: savedAssistantMsg,
      latencyMs,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
