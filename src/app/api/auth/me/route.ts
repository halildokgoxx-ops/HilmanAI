import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { hilmanStorage } from "@/lib/storage";

/** GET -> mevcut oturum (yoksa { user: null }) */
export async function GET(req: NextRequest) {
  const session = getSessionUser(req);
  if (!session) {
    return NextResponse.json({ success: true, user: null });
  }
  const stored = hilmanStorage.getUser(session.email);
  const q = hilmanStorage.checkQuota(session.email);
  return NextResponse.json({
    success: true,
    user: {
      email: session.email,
      name: stored?.name || session.name,
      picture: stored?.picture || session.picture || null,
      isAdmin: session.isAdmin,
      plan: q.plan,
      quota: q.remaining,
      isVip: q.plan === "premium_plus",
    },
  });
}
