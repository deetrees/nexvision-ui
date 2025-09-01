import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import OpenAI from 'openai';
import { featureFlags } from '../../config/features';

// Validate environment
if (!process.env.REPLICATE_API_TOKEN) {
  throw new Error('REPLICATE_API_TOKEN environment variable is required');
}

if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY not found - OpenAI image generation will be unavailable');
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

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

// OpenAI GPT Image-1 function (placeholder for when API becomes available)
async function generateWithOpenAI(imageUri: string, prompt: string): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI not available');
  }

  console.log('Attempting OpenAI GPT Image-1 generation...');

  try {
    // TODO: Replace with actual GPT Image-1 API when available
    // For now, this will throw to trigger Flux fallback
    throw new Error('GPT Image-1 API not yet available - falling back to Flux');
    
    // Future implementation would be something like:
    // const response = await openai.images.edit({
    //   model: "gpt-image-1",
    //   image: imageBuffer,
    //   prompt: prompt,
    //   ...
    // });

  } catch (error) {
    console.error('❌ OpenAI generation failed:', error);
    throw error;
  }
}

// Flux-1 Kontext fallback function
async function generateWithFlux(imageUri: string, prompt: string): Promise<string> {
  console.log('Using Flux-1 Kontext fallback...');

  const prediction = await replicate.predictions.create({
    version: "0b9c317b23e79a9a0d8b9602ff4d04030d433055927fb7c4b91c44234a6818c4",
    input: {
      input_image: imageUri,
      prompt: prompt,
      aspect_ratio: "match_input_image",
      seed: -1
    },
  }) as Prediction;

  const output = await waitForPrediction(prediction);

  // Handle different possible output formats
  if (typeof output === 'string') {
    return output;
  } else if (Array.isArray(output) && output.length > 0) {
    return output[0];
  } else if (output && typeof output === 'object') {
    const possibleUrls = Object.values(output).filter((value): value is string => 
      typeof value === 'string' && 
      (value.startsWith('http://') || value.startsWith('https://'))
    );
    if (possibleUrls.length > 0) {
      return possibleUrls[0];
    }
    throw new Error('No valid image URL found in Flux output');
  }

  throw new Error(`Unexpected output format: ${JSON.stringify(output)}`);
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

    console.log('🚀 Starting image generation with OpenAI → Flux fallback strategy');

    let outputUrl: string | undefined;
    let usedProvider = 'unknown';

    try {
      // Try OpenAI GPT Image-1 first
      if (openai) {
        try {
          outputUrl = await generateWithOpenAI(imageUri, reimagineInstruction);
          usedProvider = 'OpenAI';
          console.log('✅ Successfully generated with OpenAI');
        } catch (openaiError) {
          console.log('⚠️ OpenAI failed, falling back to Flux-1 Kontext:', openaiError);
          // Fall through to Flux fallback
        }
      }

      // Fallback to Flux-1 Kontext if OpenAI failed or unavailable
      if (!outputUrl) {
        outputUrl = await generateWithFlux(imageUri, reimagineInstruction);
        usedProvider = 'Flux-1 Kontext';
        console.log('✅ Successfully generated with Flux-1 Kontext fallback');
      }

      if (!outputUrl) {
        throw new Error('Failed to generate image with any provider');
      }

    } catch (error) {
      console.error('❌ Both providers failed:', error);
      throw error;
    }

    console.log(`🎉 Image generation completed using: ${usedProvider}`);
    return NextResponse.json({ 
      result: outputUrl,
      provider: usedProvider 
    });
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