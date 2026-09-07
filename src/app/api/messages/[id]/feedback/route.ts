import { NextRequest, NextResponse } from "next/server";
import { hilmanStorage } from "@/lib/storage";
import { getSessionUser, unauthorized, forbidden } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSessionUser(req);
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    const msg = hilmanStorage.getMessage(id);
    if (!msg) {
      return NextResponse.json({ success: false, error: "Mesaj bulunamadı" }, { status: 404 });
    }
    if (!hilmanStorage.canAccessConversation(msg.conversationId, session.email, session.isAdmin)) {
      return forbidden("Bu mesaja erişim yetkiniz yok.");
    }
    const body = await req.json().catch(() => ({}));
    const success = hilmanStorage.setMessageFeedback(id, body.feedback ?? null);
    if (!success) {
      return NextResponse.json({ success: false, error: "Mesaj bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({ success: true, feedback: body.feedback });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
