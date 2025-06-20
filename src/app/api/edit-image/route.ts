import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import sharp from 'sharp';

async function streamToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

async function resizeImageTo768px(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  return await sharp(buffer)
    .resize(768, 768, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 90 })
    .toBuffer();
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

    // Resize image to 768px and convert to base64
    const resizedBuffer = await resizeImageTo768px(image);
    const base64Image = resizedBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

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
      "black-forest-labs/flux-kontext-max",
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
        model: "black-forest-labs/flux-kontext-max",
        version: "latest",
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