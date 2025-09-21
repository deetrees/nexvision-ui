'use client';

import { useState } from 'react';
import Header from "../components/Header";
import { BaseTextarea } from '@/components/ui/BaseField';

export default function GeminiPage() {
  const [prompt, setPrompt] = useState(
    'Generate an image of a banana wearing a costume'
  );
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ms, setMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const start = Date.now();
    setError(null);
    setImageUrl(null);
    const fd = new FormData();
    fd.set('prompt', prompt);
    if (file) fd.set('image', file);
    try {
      const res = await fetch('/api/generate', { method: 'POST', body: fd });
      const json = await res.json();
      setMs(Date.now() - start);
      if (!res.ok) return setError(json?.error || 'Generation failed');
      setImageUrl(json.imageUrl);
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header showBackButton={true} className="relative z-50" />
      <div className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-semibold mb-2">Gemini Image Generation</h1>
        <p className="text-sm text-gray-600 mb-6">
          Uses Google Gemini preview model (gemini-2.5-flash-image-preview). Generate images from text or modify existing images.
        </p>

        <div className="space-y-4">
          <label className="block text-sm font-medium">Prompt</label>
          <BaseTextarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} />

          <div className="space-y-2">
            <label className="block text-sm font-medium">Input image (optional)</label>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <p className="text-xs text-gray-500">Upload an image to modify it, or leave empty to generate from text only.</p>
          </div>

          <button
            onClick={run}
            disabled={busy || !prompt.trim()}
            className="bg-black text-white rounded-md px-4 py-2 disabled:opacity-60"
          >
            {busy ? 'Generating…' : 'Generate'}
          </button>

          {ms !== null && <p className="text-xs text-gray-500">Elapsed: {ms} ms</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {imageUrl && (
            <div className="mt-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Result" className="w-full rounded-lg" />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
