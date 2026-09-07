import { NextResponse } from "next/server";
import { hilmanStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = hilmanStorage.getSettings();
    return NextResponse.json({
      ok: true,
      status: "healthy",
      storage: "local_resilient",
      defaultModel: settings.defaultModel,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
