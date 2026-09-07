import { NextRequest, NextResponse } from "next/server";
import { getOrCreateSettings } from "@/lib/db-helpers";
import { hilmanStorage } from "@/lib/storage";
import { getSessionUser, unauthorized } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = getSessionUser(req);
  if (!session) return unauthorized();
  try {
    const startTime = Date.now();
    const settings = await getOrCreateSettings();
    const keys = hilmanStorage.getApiKeys(session.isAdmin ? undefined : session.email);

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      status: 200,
      statusText: "HilmanAI Zeka Motoru Canlı",
      latencyMs,
      model: settings.defaultModel,
      activeKeysCount: keys.length,
      details: "HilmanAI-V1-Beta-Zirve GGUF motoru aktif ve hazır.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, status: 500, error: err.message },
      { status: 500 }
    );
  }
}
