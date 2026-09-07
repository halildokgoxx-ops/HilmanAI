import { NextRequest, NextResponse } from "next/server";
import { hilmanStorage } from "@/lib/storage";
import { getSessionUser, unauthorized, forbidden } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSessionUser(req);
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    if (!hilmanStorage.canAccessConversation(id, session.email, session.isAdmin)) {
      return forbidden("Bu sohbete erişim yetkiniz yok.");
    }
    hilmanStorage.clearMessages(id);
    return NextResponse.json({ success: true, message: "Mesajlar temizlendi" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
