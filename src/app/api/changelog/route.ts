import { NextRequest, NextResponse } from "next/server";
import { hilmanStorage } from "@/lib/storage";
import { getSessionUser, unauthorized } from "@/lib/auth";

/** GET -> aktif duyuru notu (yoksa { note: null }) */
export async function GET(req: NextRequest) {
  const session = getSessionUser(req);
  if (!session) return unauthorized();
  try {
    const note = hilmanStorage.getChangelog();
    return NextResponse.json({ success: true, note });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
