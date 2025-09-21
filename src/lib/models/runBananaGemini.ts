import type { GenerateParams, GenerateResult } from "./types";

export async function runBananaGemini({ prompt, imageBase64 }: GenerateParams): Promise<GenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const model = "gemini-2.5-flash-image-preview";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const parts: any[] = [{ text: prompt }];
  
  // Add input image if provided
  if (imageBase64) {
    const m = /^data:([^;]+);base64,([\s\S]*)$/.exec(imageBase64);
    if (m) {
      parts.push({ inline_data: { mime_type: m[1], data: m[2] } });
    }
  }

  const payload = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      response_modalities: ["IMAGE", "TEXT"]
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  console.log('Full response:', JSON.stringify(data, null, 2));
  
  // Match Python sample: response.candidates[0].content.parts
  const responseParts = data?.candidates?.[0]?.content?.parts || [];
  
  for (const part of responseParts) {
    if (part.text) {
      console.log('Text response:', part.text);
    }
    // Check for inlineData
    if (part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType || "image/png";
      console.log('Found image data, mime:', mimeType);
      return { imageUrl: `data:${mimeType};base64,${part.inlineData.data}` };
    }
  }

  throw new Error("No image data received from Gemini - model may not support image generation for this request");
}
