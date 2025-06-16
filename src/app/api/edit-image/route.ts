import { NextResponse } from 'next/server';
import Replicate from 'replicate';

async function streamToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const prompt = formData.get('prompt') as string;

    if (!image || !prompt) {
      return NextResponse.json(
        { error: 'Image and prompt are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.REPLICATE_API_TOKEN;
    if (!apiKey) {
      console.error('Replicate API token not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Convert image to base64
    const base64Image = await streamToBase64(image);
    const dataUrl = `data:${image.type};base64,${base64Image}`;

    // Initialize Replicate client
    const replicate = new Replicate({
      auth: apiKey,
    });

    // Run the FLUX-1 Kontext model with timeout handling
    // Model: https://replicate.com/flux-1/kontext
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout after 120 seconds')), 120000);
    });

    const replicatePromise = replicate.run(
      "flux-1/kontext:9e6f5170e6b14500dd330f4f5c80a5f67564b5f0d78d4b8c390419925b3e0c46",
      {
        input: {
          image: dataUrl,
          prompt: prompt,
          num_inference_steps: 30,
          guidance_scale: 7.5,
          strength: 0.8,
          seed: Math.floor(Math.random() * 1000000),
        }
      }
    );

    const output = await Promise.race([replicatePromise, timeoutPromise]);

    // The model returns an array of image URLs
    const editedImageUrl = Array.isArray(output) ? output[0] : output;

    if (!editedImageUrl) {
      throw new Error('No output received from the model');
    }

    return NextResponse.json({
      success: true,
      editedImageUrl,
      metadata: {
        model: "flux-1/kontext",
        version: "9e6f5170",
      }
    });

  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process image' },
      { status: 500 }
    );
  }
}  