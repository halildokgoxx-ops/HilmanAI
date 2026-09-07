import { NextRequest, NextResponse } from "next/server";
import { hilmanStorage } from "@/lib/storage";
import { generateHilmanAutonomousResponse } from "@/lib/hilman-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get("authorization");
    const apiKey =
      (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null) ||
      req.headers.get("x-api-key") ||
      body.apiKey;

    if (!apiKey || !hilmanStorage.validateApiKey(apiKey)) {
      return NextResponse.json(
        {
          error: {
            message: "Geçersiz veya eksik Hilman API Anahtarı. Authorization: Bearer hilman_... gereklidir.",
            type: "invalid_request_error",
            code: "invalid_api_key",
          },
        },
        { status: 401 }
      );
    }
    hilmanStorage.touchApiKeyUsage(apiKey);

    const messages = body.messages || [];
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    const prompt = lastUserMsg?.content || body.prompt || "";

    if (!prompt.trim()) {
      return NextResponse.json(
        {
          error: {
            message: "Mesaj içeriği boş olamaz.",
            type: "invalid_request_error",
          },
        },
        { status: 400 }
      );
    }

    const response = await generateHilmanAutonomousResponse(prompt, "düşünen", messages);

    return NextResponse.json({
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "hilmanai-v1-beta",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: response.content,
            reasoning: response.reasoning,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: Math.round(prompt.length / 4),
        completion_tokens: response.tokensUsed,
        total_tokens: Math.round(prompt.length / 4) + response.tokensUsed,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: {
          message: err.message,
          type: "api_error",
        },
      },
      { status: 500 }
    );
  }
}
