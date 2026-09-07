import { NextRequest, NextResponse } from "next/server";
import { getOrCreateSettings, updateSettings } from "@/lib/db-helpers";
import { hilmanStorage } from "@/lib/storage";
import { getSessionUser, unauthorized, forbidden } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = getSessionUser(req);
  if (!session) return unauthorized();
  try {
    const settings = await getOrCreateSettings();
    const user = hilmanStorage.getUser(session.email);
    return NextResponse.json({
      success: true,
      settings: {
        defaultModel: settings.defaultModel,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        systemPrompt: session.isAdmin ? settings.systemPrompt : undefined,
        personalPrompt: user?.personalPrompt || "",
        reasoningDepth: settings.reasoningDepth || "deep",
        contextWindow: settings.contextWindow || "128k",
        codeOptimization: settings.codeOptimization !== false,
        showThinking: settings.showThinking !== false,
      },
    });
  } catch (error: any) {
    console.error("Settings GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = getSessionUser(req);
  if (!session) return unauthorized();
  try {
    const body = await req.json();

    // Kişisel talimat herkes için serbest — kendi hesabına kaydedilir
    if (typeof body.personalPrompt === "string") {
      hilmanStorage.setUserPersonalPrompt(session.email, body.personalPrompt);
    }

    // Motor parametreleri yalnızca admin değiştirebilir
    const wantsEngineChange =
      body.defaultModel !== undefined ||
      body.temperature !== undefined ||
      body.maxTokens !== undefined ||
      body.systemPrompt !== undefined ||
      body.reasoningDepth !== undefined ||
      body.contextWindow !== undefined ||
      body.codeOptimization !== undefined ||
      body.showThinking !== undefined;

    let updated = await getOrCreateSettings();
    if (wantsEngineChange) {
      if (!session.isAdmin) return forbidden("Motor ayarlarını yalnızca admin değiştirebilir.");
      const patch: Record<string, any> = {};
      if (body.defaultModel !== undefined) patch.defaultModel = body.defaultModel || "hilmanai-v1-beta";
      if (body.temperature !== undefined) patch.temperature = body.temperature ? String(body.temperature) : "0.7";
      if (body.maxTokens !== undefined) patch.maxTokens = body.maxTokens ? Number(body.maxTokens) : 2048;
      if (typeof body.systemPrompt === "string" && body.systemPrompt.trim()) {
        patch.systemPrompt = body.systemPrompt;
      }
      if (body.reasoningDepth !== undefined) patch.reasoningDepth = body.reasoningDepth ?? "deep";
      if (body.contextWindow !== undefined) patch.contextWindow = body.contextWindow ?? "128k";
      if (body.codeOptimization !== undefined) patch.codeOptimization = body.codeOptimization !== false;
      if (body.showThinking !== undefined) patch.showThinking = body.showThinking !== false;
      updated = await updateSettings(patch);
    }

    const user = hilmanStorage.getUser(session.email);
    // Token'ları asla yanıta koyma
    return NextResponse.json({
      success: true,
      settings: {
        defaultModel: updated.defaultModel,
        temperature: updated.temperature,
        maxTokens: updated.maxTokens,
        systemPrompt: session.isAdmin ? updated.systemPrompt : undefined,
        personalPrompt: user?.personalPrompt || "",
        reasoningDepth: (updated as any).reasoningDepth || "deep",
        contextWindow: (updated as any).contextWindow || "128k",
        codeOptimization: (updated as any).codeOptimization !== false,
        showThinking: (updated as any).showThinking !== false,
      },
    });
  } catch (error: any) {
    console.error("Settings POST error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
