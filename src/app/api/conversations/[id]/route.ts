import { NextRequest, NextResponse } from "next/server";
import {
  getConversationWithMessages,
  updateConversation,
  deleteConversation,
} from "@/lib/db-helpers";
import { hilmanStorage } from "@/lib/storage";
import { getSessionUser, unauthorized, forbidden } from "@/lib/auth";

export async function GET(
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
    const data = await getConversationWithMessages(id);

    if (!data || !data.conversation) {
      return NextResponse.json(
        { success: false, error: "Sohbet bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation: data.conversation,
      messages: data.messages,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const body = await req.json();

    const updateData: Record<string, any> = {};

    if (typeof body.title === "string") updateData.title = body.title.trim();
    if (typeof body.isPinned === "boolean") updateData.isPinned = body.isPinned;
    if (typeof body.model === "string") updateData.model = body.model;
    if (typeof body.provider === "string") updateData.provider = body.provider;

    const updated = await updateConversation(id, updateData);

    return NextResponse.json({ success: true, conversation: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

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
    await deleteConversation(id);
    return NextResponse.json({ success: true, message: "Sohbet silindi" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
