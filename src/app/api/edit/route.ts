import { NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

interface Prediction {
  id: string;
  status: string;
  output: string | string[] | Record<string, unknown>;
  error?: string;
}

async function waitForPrediction(prediction: Prediction): Promise<string | string[] | Record<string, unknown>> {
  while (['starting', 'processing'].includes(prediction.status)) {
    console.log('Polling prediction status:', prediction.status);
    await new Promise(resolve => setTimeout(resolve, 1000));
    prediction = await replicate.predictions.get(prediction.id) as Prediction;
  }

  if (prediction.status === 'succeeded') {
    return prediction.output;
  }

  throw new Error(`Prediction failed: ${prediction.error || 'Unknown error'}`);
}

export async function POST(request: Request) {
  try {
    const { imageUrl: inputImageUrl, prompt: reimagineInstruction } = await request.json();

    if (!inputImageUrl || !reimagineInstruction) {
      return NextResponse.json(
        { error: 'Image URL and reimagine instruction are required' },
        { status: 400 }
      );
    }

    const imageUri = inputImageUrl.startsWith('data:') 
      ? inputImageUrl 
      : `data:image/jpeg;base64,${inputImageUrl}`;

    console.log('Starting reimagining process with FLUX-1 Kontext...');

    const prediction = await replicate.predictions.create({
      version: "0b9c317b23e79a9a0d8b9602ff4d04030d433055927fb7c4b91c44234a6818c4",
      input: {
        image: imageUri,
        prompt: reimagineInstruction,
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_outputs: 1,
        aspect_ratio: "1:1",
        output_format: "jpg",
        output_quality: 80,
        seed: Math.floor(Math.random() * 1000000)
      }
    }) as Prediction;

    console.log('Prediction created:', prediction.id);

    const output = await waitForPrediction(prediction);
    
    let resultUrl: string;
    if (Array.isArray(output)) {
      resultUrl = output[0] as string;
    } else if (typeof output === 'string') {
      resultUrl = output;
    } else {
      throw new Error('Unexpected output format from prediction');
    }

    console.log('Reimagining completed successfully');

    return NextResponse.json({
      success: true,
      result: resultUrl,
      metadata: {
        model: 'FLUX-1 Kontext Max',
        version: '0b9c317b',
        prompt: reimagineInstruction
      }
    });

  } catch (error) {
    console.error('Error in reimagine API:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to process image',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
