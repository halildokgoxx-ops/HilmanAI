import { NextRequest, NextResponse } from "next/server";
import { hilmanStorage } from "@/lib/storage";
import { getSessionUser, unauthorized, forbidden } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = getSessionUser(req);
  if (!session) return unauthorized();
  if (!session.isAdmin) return forbidden();
  try {
    const messages = hilmanStorage.getAllMessages();
    const models = hilmanStorage.getModels();
    const settings = hilmanStorage.getSettings();
    const users = hilmanStorage.getAllUsers();

    const likedCount = messages.filter((m) => m.feedback === "like").length;
    const dislikedCount = messages.filter((m) => m.feedback === "dislike").length;
    const userMessagesCount = messages.filter((m) => m.role === "user").length;
    const assistantMessagesCount = messages.filter((m) => m.role === "assistant").length;

    return NextResponse.json({
      success: true,
      stats: {
        totalMessages: messages.length,
        userMessagesCount,
        assistantMessagesCount,
        likedCount,
        dislikedCount,
        totalUsers: users.length,
        satisfactionRate:
          likedCount + dislikedCount > 0
            ? Math.round((likedCount / (likedCount + dislikedCount)) * 100)
            : 100,
      },
      models,
      users: users.map((u) => ({
        email: u.email,
        name: u.name,
        picture: u.picture || null,
        quota: u.quota ?? null,
        isVip: !!u.isVip,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
      })),
      systemPrompt: settings.systemPrompt,
      messages: messages.slice(0, 100), // latest 100 messages
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = getSessionUser(req);
  if (!session) return unauthorized();
  if (!session.isAdmin) return forbidden();
  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === "add_model") {
      if (!body.name) {
        return NextResponse.json({ success: false, error: "Model ismi gereklidir." }, { status: 400 });
      }
      const newModel = hilmanStorage.addModel({
        name: body.name,
        id: body.id,
        hfLink: body.hfLink,
        description: body.description,
        badge: body.badge,
        contextWindow: body.contextWindow,
      });
      return NextResponse.json({ success: true, model: newModel });
    }

    if (action === "delete_model") {
      if (!body.id) {
        return NextResponse.json({ success: false, error: "Model ID gereklidir." }, { status: 400 });
      }
      const success = hilmanStorage.deleteModel(body.id);
      return NextResponse.json({ success });
    }

    if (action === "update_system_prompt") {
      if (!body.systemPrompt) {
        return NextResponse.json({ success: false, error: "Sistem promptu gereklidir." }, { status: 400 });
      }
      hilmanStorage.updateSettings({ systemPrompt: body.systemPrompt });
      return NextResponse.json({ success: true });
    }

    if (action === "set_quota") {
      if (!body.email || body.quota === undefined) {
        return NextResponse.json({ success: false, error: "E-posta ve kota gereklidir." }, { status: 400 });
      }
      const ok = hilmanStorage.setUserQuota(body.email, Number(body.quota), body.isVip);
      if (!ok) {
        return NextResponse.json({ success: false, error: "Kullanıcı bulunamadı." }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Geçersiz işlem" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
