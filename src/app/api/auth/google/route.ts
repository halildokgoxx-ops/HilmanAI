import { NextRequest, NextResponse } from "next/server";
import {
  verifyGoogleIdToken,
  signSession,
  sessionCookieHeader,
  isAdminEmail,
} from "@/lib/auth";
import { hilmanStorage } from "@/lib/storage";
import { checkRateLimit, RATE_PROFILES } from "@/lib/rate-limit";

/** POST { idToken } -> Google doğrulaması + session cookie */
export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, RATE_PROFILES.auth);
  if (limited) return limited;
  try {
    const body = await req.json().catch(() => ({}));
    const idToken = typeof body.idToken === "string" ? body.idToken : "";
    if (!idToken) {
      return NextResponse.json(
        { success: false, error: "Google kimliği alınamadı." },
        { status: 400 }
      );
    }

    const info = await verifyGoogleIdToken(idToken);
    const user = hilmanStorage.upsertUser({
      email: info.email,
      name: info.name,
      picture: info.picture || null,
    });

    const signed = signSession({ email: user.email, name: user.name, picture: user.picture });
    const res = NextResponse.json({
      success: true,
      user: {
        email: user.email,
        name: user.name,
        picture: user.picture,
        isAdmin: isAdminEmail(user.email),
      },
    });
    res.headers.set("Set-Cookie", sessionCookieHeader(signed));
    return res;
  } catch (err: any) {
    console.error("Google auth error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message || "Google girişi başarısız." },
      { status: 401 }
    );
  }
}
