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

// Helper function to wait for prediction
async function waitForPrediction(prediction: Prediction): Promise<string | string[] | Record<string, unknown>> {
  while (['starting', 'processing'].includes(prediction.status)) {
    console.log('Polling prediction status:', prediction.status);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between polls
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

    // Convert base64 to a temporary URL using a data URI
    const imageUri = inputImageUrl.startsWith('data:') 
      ? inputImageUrl 
      : `data:image/jpeg;base64,${inputImageUrl}`;

    console.log('Starting reimagining process with FLUX-1 Kontext...'); // Debug log

    // Create the reimagine request with FLUX-1 Kontext parameters
    const prediction = await replicate.predictions.create({
      version: "0b9c317b23e79a9a0d8b9602ff4d04030d433055927fb7c4b91c44234a6818c4",
      input: {
        input_image: imageUri,
        prompt: reimagineInstruction,
        aspect_ratio: "match_input_image",
        seed: -1 // Random seed for variety
      },
    }) as Prediction;

    console.log('Reimagine request created, waiting for result...'); // Debug log

    // Wait for the reimagining to complete
    const output = await waitForPrediction(prediction);
    console.log('Reimagining completed:', output); // Debug log

    // Handle different possible output formats
    let outputUrl: string;

    if (typeof output === 'string') {
      outputUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      outputUrl = output[0];
    } else if (output && typeof output === 'object') {
      const possibleUrls = Object.values(output).filter((value): value is string => 
        typeof value === 'string' && 
        (value.startsWith('http://') || value.startsWith('https://'))
      );
      if (possibleUrls.length > 0) {
        outputUrl = possibleUrls[0];
      } else {
        throw new Error('No valid image URL found in reimagined output');
      }
    } else {
      throw new Error(`Unexpected output format: ${JSON.stringify(output)}`);
    }

    return NextResponse.json({ result: outputUrl });
  } catch (error) {
    console.error('Error details:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reimagine the image' },
      { status: 500 }
    );
  }
} 