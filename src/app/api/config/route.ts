import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const engines = {
    "banana-gemini": !!process.env.GEMINI_API_KEY,
  } as const;

  const defaultEngine = "banana-gemini" as const;

  return NextResponse.json({ engines, defaultEngine });
}

