import { NextResponse } from 'next/server';
import OpenAI from 'openai';

function makeClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
  return new OpenAI({
    apiKey,
    organization: process.env.OPENAI_ORG_ID,
    project: process.env.OPENAI_PROJECT_ID,
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const singleModel = url.searchParams.get('model') || undefined;

  const modelsToCheck = singleModel
    ? [singleModel]
    : ['gpt-image-1', 'dall-e-3', 'dall-e-2'];

  try {
    const client = makeClient();

    const results: Record<string, { available: boolean; error?: string }> = {};
    for (const m of modelsToCheck) {
      try {
        // Model metadata check (no image generation; should be free)
        await client.models.retrieve(m);
        results[m] = { available: true };
      } catch (err: any) {
        const code = err?.status || err?.code || err?.response?.status;
        const message = err?.message || 'Unknown error';
        results[m] = { available: false, error: `${code || 'ERR'}: ${message}` };
      }
    }

    return NextResponse.json({
      ok: true,
      orgScoped: !!process.env.OPENAI_ORG_ID,
      projectScoped: !!process.env.OPENAI_PROJECT_ID,
      models: results,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to check OpenAI models',
        hasKey: !!process.env.OPENAI_API_KEY,
      },
      { status: 500 }
    );
  }
}

