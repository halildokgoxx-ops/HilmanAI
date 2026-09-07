import { NextRequest, NextResponse } from "next/server";
import { hilmanStorage } from "@/lib/storage";
import { generateHilmanAutonomousResponse } from "@/lib/hilman-engine";
import { checkRateLimit, RATE_PROFILES } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, RATE_PROFILES.v1);
  if (limited) return limited;
  try {
    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get("authorization");
    const apiKey =
      (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null) ||
      req.headers.get("x-hilman-api-key") ||
      req.headers.get("x-goog-api-key") ||
      body.apiKey;

    if (!apiKey || !hilmanStorage.validateApiKey(apiKey)) {
      return NextResponse.json(
        {
          error: {
            code: 401,
            message: "Geçersiz veya eksik Hilman API Anahtarı. Lütfen 'hilman_...' formatındaki anahtarınızı sağlayın.",
            status: "UNAUTHENTICATED",
          },
        },
        { status: 401 }
      );
    }
    hilmanStorage.touchApiKeyUsage(apiKey);

    // Extract contents (supports string or Gemini parts array)
    let prompt = "";
    if (typeof body.contents === "string") {
      prompt = body.contents;
    } else if (Array.isArray(body.contents)) {
      prompt = body.contents
        .map((c: any) => (typeof c === "string" ? c : c.text || c.parts?.map((p: any) => p.text).join(" ")))
        .join(" ");
    } else if (body.prompt) {
      prompt = body.prompt;
    }

    if (!prompt.trim()) {
      return NextResponse.json(
        {
          error: {
            code: 400,
            message: "'contents' veya 'prompt' parametresi boş olamaz.",
            status: "INVALID_ARGUMENT",
          },
        },
        { status: 400 }
      );
    }

    const response = await generateHilmanAutonomousResponse(prompt, "düşünen");

    // Gemini standard response format
    return NextResponse.json({
      candidates: [
        {
          content: {
            parts: [
              {
                text: response.content,
              },
            ],
            role: "model",
          },
          finishReason: "STOP",
          index: 0,
          reasoning: response.reasoning,
        },
      ],
      usageMetadata: {
        promptTokenCount: Math.round(prompt.length / 4),
        candidatesTokenCount: response.tokensUsed,
        totalTokenCount: Math.round(prompt.length / 4) + response.tokensUsed,
      },
      modelVersion: "hilmanai-v1-beta",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: {
          code: 500,
          message: err.message,
          status: "INTERNAL",
        },
      },
      { status: 500 }
    );
  }
}
