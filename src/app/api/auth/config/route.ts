import { NextResponse } from "next/server";
import { getGoogleClientId } from "@/lib/auth";

/**
 * GET -> frontend'in GIS butonunu başlatması için gerekli public yapılandırma.
 * Client ID gizli değildir (Google JS origin allowlist ile korunur).
 */
export async function GET() {
  const clientId = getGoogleClientId();
  return NextResponse.json({
    success: true,
    googleClientId: clientId || null,
    configured: !!clientId,
  });
}
