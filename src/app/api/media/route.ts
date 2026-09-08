import { NextRequest, NextResponse } from "next/server";
import { hilmanStorage } from "@/lib/storage";
import { getSessionUser, unauthorized } from "@/lib/auth";

/** GET /api/media — hesabın tüm görsel/video üretimleri (Medya Arşivi) */
export async function GET(req: NextRequest) {
  const session = getSessionUser(req);
  if (!session) return unauthorized();
  try {
    const convs = hilmanStorage.getConversations(session.email, session.isAdmin);
    const titles = new Map(convs.map((c) => [c.id, c.title]));
    const items: Array<{
      id: string;
      kind: "image" | "video";
      url: string;
      conversationId: string;
      title: string;
      createdAt: string;
    }> = [];
    for (const m of hilmanStorage.getAllMessages()) {
      if (!titles.has(m.conversationId)) continue;
      if (m.role !== "assistant" || m.isError) continue; // yalnızca üretilenler
      if (m.videoUrl) {
        items.push({
          id: `v-${m.id}`,
          kind: "video",
          url: m.videoUrl,
          conversationId: m.conversationId,
          title: titles.get(m.conversationId) || "Sohbet",
          createdAt: m.createdAt,
        });
      } else if (m.imageUrl && (m.mediaType === "image" || m.mediaType === "text")) {
        // Üretilen görseller + video sahne posterleri (sohbete yüklenen ham dosyalar değil;
        // onlar kullanıcı mesajıdır ve role filtresiyle elenir)
        items.push({
          id: `i-${m.id}`,
          kind: "image",
          url: m.imageUrl,
          conversationId: m.conversationId,
          title: titles.get(m.conversationId) || "Sohbet",
          createdAt: m.createdAt,
        });
      }
    }
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json({ success: true, items: items.slice(0, 200) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
