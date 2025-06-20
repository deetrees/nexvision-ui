import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import sharp from 'sharp';

async function resizeImageTo768px(buffer: Buffer): Promise<Buffer> {
  console.log('Processing image with Sharp, buffer length:', buffer.length);
  
  return await sharp(buffer)
    .resize(768, 768, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .png({ quality: 90 })
    .toBuffer();
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.REPLICATE_API_TOKEN;
    if (!apiKey) {
      console.error('Replicate API token not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const image = formData.get('image') as File;
    const prompt = formData.get('prompt') as string;

    if (!image || !prompt) {
      return NextResponse.json(
        { error: 'Image and prompt are required' },
        { status: 400 }
      );
    }

    const arrayBuffer = await image.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    
    console.log('File type:', image.type);
    console.log('File size:', image.size);
    console.log('Buffer length:', imageBuffer.length);
    
    // Resize image to 768px and convert to base64
    const resizedBuffer = await resizeImageTo768px(imageBuffer);
    const base64Image = resizedBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;

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
          input_image: dataUrl,
          prompt: prompt,
          seed: Math.floor(Math.random() * 1000000),
          aspect_ratio: "match_input_image",
          output_format: "png",
          safety_tolerance: 2,
        }
      }
    );

    const output = await Promise.race([replicatePromise, timeoutPromise]);

    console.log('Replicate API output:', JSON.stringify(output, null, 2));
    console.log('Output type:', typeof output);
    console.log('Output keys:', Object.keys(output || {}));

    // The model returns a single URI
    const editedImageUrl = output;

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