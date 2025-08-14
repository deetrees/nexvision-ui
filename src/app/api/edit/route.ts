import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import { featureFlags } from '../../config/features';

// Validate environment
if (!process.env.REPLICATE_API_TOKEN) {
  throw new Error('REPLICATE_API_TOKEN environment variable is required');
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Simple rate limiting (in production, use Redis or database)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 requests per minute

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const clientRequests = rateLimitMap.get(clientId) || [];
  
  // Remove old requests outside the window
  const validRequests = clientRequests.filter((time: number) => now - time < RATE_LIMIT_WINDOW);
  
  if (validRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  validRequests.push(now);
  rateLimitMap.set(clientId, validRequests);
  return true;
}

interface Prediction {
  id: string;
  status: string;
  output: string | string[] | Record<string, unknown>;
  error?: string;
}

// Helper function to wait for prediction with timeout
async function waitForPrediction(prediction: Prediction): Promise<string | string[] | Record<string, unknown>> {
  const startTime = Date.now();
  const timeout = 300000; // 5 minutes
  const backoffDelays = [1000, 2000, 3000, 5000]; // Progressive delays
  let attempt = 0;

  while (['starting', 'processing'].includes(prediction.status)) {
    // Check timeout
    if (Date.now() - startTime > timeout) {
      throw new Error('Processing timeout. Please try again with a smaller image.');
    }

    console.log('Polling prediction status:', prediction.status);
    
    // Use progressive backoff
    const delay = backoffDelays[Math.min(attempt, backoffDelays.length - 1)];
    await new Promise(resolve => setTimeout(resolve, delay));
    
    prediction = await replicate.predictions.get(prediction.id) as Prediction;
    attempt++;
  }

  if (prediction.status === 'succeeded') {
    return prediction.output;
  }

  throw new Error(`Processing failed. Please try again.`);
}

export async function POST(request: Request) {
  try {
    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const { imageUrl: inputImageUrl, prompt: reimagineInstruction, userId = 'anonymous' } = await request.json();

    // Check credits only if enabled
    if (featureFlags.enableCredits) {
      const creditsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'use' })
      });

      if (!creditsResponse.ok) {
        const creditsError = await creditsResponse.json();
        return NextResponse.json(creditsError, { status: creditsResponse.status });
      }
    } else {
      console.log('Credits check skipped - feature disabled');
    }

    // Input validation
    if (!inputImageUrl || !reimagineInstruction) {
      return NextResponse.json(
        { error: 'Image URL and reimagine instruction are required' },
        { status: 400 }
      );
    }

    // Validate prompt length
    if (reimagineInstruction.length > 500) {
      return NextResponse.json(
        { error: 'Prompt too long. Maximum 500 characters.' },
        { status: 400 }
      );
    }

    // Validate image size (rough estimate for base64)
    const maxImageSize = 10 * 1024 * 1024; // 10MB
    if (inputImageUrl.length > maxImageSize) {
      return NextResponse.json(
        { error: 'Image too large. Maximum 10MB.' },
        { status: 413 }
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
    
    // Don't leak internal error details to client
    const isUserError = error instanceof Error && (
      error.message.includes('timeout') ||
      error.message.includes('too large') ||
      error.message.includes('Processing failed')
    );
    
    const errorMessage = isUserError 
      ? error.message 
      : 'Service temporarily unavailable. Please try again.';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: isUserError ? 400 : 500 }
    );
  }
} 