import { NextRequest, NextResponse } from "next/server";
import { generateWith } from "@/lib/models";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const prompt = String(form.get("prompt") || "");
    let imageBase64 = (form.get("imageBase64") as string) || undefined;

    // Support file upload via `image` field as alternative to imageBase64
    const imageFile = form.get("image");
    if (!imageBase64 && imageFile && typeof imageFile !== "string") {
      const file = imageFile as File;
      const buf = Buffer.from(await file.arrayBuffer());
      const mime = file.type || "image/png";
      imageBase64 = `data:${mime};base64,${buf.toString("base64")}`;
    }

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const { imageUrl } = await generateWith({ prompt, imageBase64 });
    return NextResponse.json({ imageUrl });
  } catch (err: any) {
    console.error("/api/generate error", err);
    return NextResponse.json({ error: err?.message ?? "Internal Server Error" }, { status: 500 });
  }
}
