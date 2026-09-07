import { NextResponse } from "next/server";
import { hilmanStorage } from "@/lib/storage";

export async function GET() {
  try {
    const models = hilmanStorage.getModels();
    return NextResponse.json({ success: true, models });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
