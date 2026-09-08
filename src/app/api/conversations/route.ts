import { NextRequest, NextResponse } from "next/server";
import { getAllConversations, createConversation, getOrCreateSettings, deleteAllConversations } from "@/lib/db-helpers";
import { DEFAULT_HILMAN_SYSTEM_PROMPT } from "@/lib/constants";
import { getSessionUser, unauthorized } from "@/lib/auth";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function GET(req: NextRequest) {
  const session = getSessionUser(req);
  if (!session) return unauthorized();
  try {
    // Yalnızca kendi geçmişin (admin hepsini görür)
    const list = await getAllConversations(session.email, session.isAdmin);
    // Liste görünümünde dev systemPrompt'u gönderme (92KB -> ~birkaç KB).
    const slim = list.map(({ systemPrompt, ...rest }: any) => rest);
    return NextResponse.json({ success: true, conversations: slim });
  } catch (error: any) {
    console.error("Conversations GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = getSessionUser(req);
  if (!session) return unauthorized();
  try {
    const body = await req.json().catch(() => ({}));
    const settings = await getOrCreateSettings();

    const id = generateId();
    const title = body.title || "Yeni Sohbet";
    const model = body.model || settings.defaultModel || "hilmanai-v1-beta";
    const provider = body.provider || "hilman-engine";
    const systemPrompt = body.systemPrompt || settings.systemPrompt || DEFAULT_HILMAN_SYSTEM_PROMPT;

    const created = await createConversation({
      id,
      title,
      model,
      provider,
      systemPrompt,
      ownerEmail: session.email,
    });

    return NextResponse.json({ success: true, conversation: created });
  } catch (error: any) {
    console.error("Conversations POST error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = getSessionUser(req);
  if (!session) return unauthorized();
  try {
    const count = await deleteAllConversations(session.email);
    return NextResponse.json({ success: true, deleted: count });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
