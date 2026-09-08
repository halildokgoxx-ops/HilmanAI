import { NextRequest, NextResponse } from "next/server";
import { hilmanStorage } from "@/lib/storage";
import { getSessionUser, unauthorized, forbidden } from "@/lib/auth";

const CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

/** GET /api/media/<dosya> — üretilen medya dosyaları (giriş + sahiplik gerekli) */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSessionUser(req);
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    if (!/^[a-zA-Z0-9._-]+$/.test(id)) {
      return NextResponse.json({ success: false, error: "Geçersiz dosya." }, { status: 400 });
    }
    // Sahiplik: dosya, isteyenin sohbetlerinden birine ait olmalı (admin muaf)
    if (!session.isAdmin) {
      const mine = hilmanStorage
        .getConversations(session.email, false)
        .map((c) => c.id);
      const all = hilmanStorage.getAllMessages();
      const owned = all.some(
        (m) =>
          mine.includes(m.conversationId) &&
          ((m.videoUrl || "").endsWith(`/api/media/${id}`) ||
            (m.imageUrl || "").endsWith(`/api/media/${id}`))
      );
      if (!owned) return forbidden("Bu dosyaya erişim yetkiniz yok.");
    }
    const bytes = hilmanStorage.readGeneratedFile(id);
    if (!bytes) {
      return NextResponse.json({ success: false, error: "Dosya bulunamadı." }, { status: 404 });
    }
    const ext = ("." + id.split(".").pop()?.toLowerCase()) as string;
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=86400",
        "Content-Length": String(bytes.length),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
