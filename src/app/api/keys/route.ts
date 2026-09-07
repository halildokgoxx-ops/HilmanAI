import { NextRequest, NextResponse } from "next/server";
import { hilmanStorage } from "@/lib/storage";
import { getSessionUser, unauthorized } from "@/lib/auth";

function sanitize(keys: ReturnType<typeof hilmanStorage.getApiKeys>) {
  return keys.map((k) => ({
    id: k.id,
    name: k.name,
    key: k.key,
    ownerEmail: k.ownerEmail || null,
    usageCount: k.usageCount || 0,
    lastUsedAt: k.lastUsedAt || null,
    createdAt: k.createdAt,
  }));
}

export async function GET(req: NextRequest) {
  const session = getSessionUser(req);
  if (!session) return unauthorized();
  try {
    // Admin herkesi görür, normal kullanıcı yalnızca kendi anahtarlarını
    const keys = session.isAdmin
      ? hilmanStorage.getApiKeys()
      : hilmanStorage.getApiKeys(session.email);
    return NextResponse.json({ success: true, keys: sanitize(keys) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = getSessionUser(req);
  if (!session) return unauthorized();
  try {
    const body = await req.json().catch(() => ({}));
    const result = hilmanStorage.createApiKey(body.name || "", session.email);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, key: result.key });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = getSessionUser(req);
  if (!session) return unauthorized();
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.id) {
      return NextResponse.json({ success: false, error: "Anahtar ID gereklidir." }, { status: 400 });
    }
    const result = hilmanStorage.deleteApiKey(body.id, session.email);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 403 });
    }
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
