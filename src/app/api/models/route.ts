import { NextRequest, NextResponse } from "next/server";
import { hilmanStorage } from "@/lib/storage";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const models = hilmanStorage.getModels();
    const session = getSessionUser(req);
    // Sıfır ifşa: model ağırlık linkleri (hfLink) yalnızca admin'e gösterilir.
    // Normal kullanıcı ve authsuz istekler rozet/isimbilgisini alır.
    if (session?.isAdmin) {
      return NextResponse.json({ success: true, models });
    }
    const pub = models.map(({ hfLink, ...rest }: any) => rest);
    return NextResponse.json({ success: true, models: pub });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
