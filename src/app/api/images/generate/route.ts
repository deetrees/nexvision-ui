import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Optional: scope requests to a specific org/project if provided
  organization: process.env.OPENAI_ORG_ID,
  project: process.env.OPENAI_PROJECT_ID,
});

// Make the image model configurable so teams can switch to gpt-image-1 easily
const IMAGE_GENERATE_MODEL = process.env.OPENAI_IMAGE_GENERATE_MODEL || 'dall-e-3';

// Rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5;

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const clientRequests = rateLimitMap.get(clientId) || [];
  
  const validRequests = clientRequests.filter((time: number) => now - time < RATE_LIMIT_WINDOW);
  
  if (validRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  validRequests.push(now);
  rateLimitMap.set(clientId, validRequests);
  return true;
}

// Cache utilities
const CACHE_DIR = path.join(process.cwd(), 'public', 'cache', 'images');

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function generateCacheKey(prompt: string, size?: string, quality?: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(`${prompt}-${size || '1024x1024'}-${quality || 'standard'}`);
  return hash.digest('hex');
}

async function saveToCache(key: string, imageUrl: string): Promise<string> {
  try {
    ensureCacheDir();
    
    // Download image
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Failed to fetch image');
    
    const buffer = await response.arrayBuffer();
    const filename = `${key}.png`;
    const filepath = path.join(CACHE_DIR, filename);
    
    fs.writeFileSync(filepath, Buffer.from(buffer));
    
    // Return public URL
    return `/cache/images/${filename}`;
  } catch (error) {
    console.error('Cache save error:', error);
    return imageUrl; // Fallback to original URL
  }
}

function getCachedImage(key: string): string | null {
  const filename = `${key}.png`;
  const filepath = path.join(CACHE_DIR, filename);
  
  if (fs.existsSync(filepath)) {
    return `/cache/images/${filename}`;
  }
  
  return null;
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

    const { 
      prompt, 
      size = '1024x1024',
      quality = 'standard',
      n = 1,
      response_format = 'url'
    } = await request.json();

    // Input validation
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    if (prompt.length > 1000) {
      return NextResponse.json(
        { error: 'Prompt too long. Maximum 1000 characters.' },
        { status: 400 }
      );
    }

    // Valid sizes for DALL-E 3
    const validSizes = ['1024x1024', '1024x1792', '1792x1024'];
    if (!validSizes.includes(size)) {
      return NextResponse.json(
        { error: 'Invalid size. Must be one of: ' + validSizes.join(', ') },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = generateCacheKey(prompt, size, quality);
    const cachedImage = getCachedImage(cacheKey);
    
    if (cachedImage) {
      console.log('✅ Serving from cache');
      return NextResponse.json({
        data: [{
          url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${cachedImage}`,
          cached: true
        }],
        model: 'gpt-image-1'
      });
    }

    console.log('🎨 Generating image with GPT-Image-1:', prompt);

    // Generate image - adjust parameters based on model
    const generateParams: any = {
      model: IMAGE_GENERATE_MODEL,
      prompt,
      size: size as '1024x1024' | '1024x1792' | '1792x1024',
    };

    // gpt-image-1 doesn't support some DALL-E specific parameters
    if (IMAGE_GENERATE_MODEL === 'gpt-image-1') {
      // gpt-image-1 specific configuration
      console.log('🤖 Using GPT-Image-1 model');
    } else {
      // DALL-E specific parameters
      generateParams.quality = quality as 'standard' | 'hd';
      generateParams.n = Math.min(n, 1); // DALL-E 3 only supports n=1
      generateParams.response_format = response_format as 'url' | 'b64_json';
    }

    const response = await openai.images.generate(generateParams);

    if (!response.data || response.data.length === 0) {
      throw new Error('No image generated');
    }

    const imageData = response.data[0];
    
    // Cache the result if it's a URL
    let finalUrl = imageData.url;
    if (finalUrl) {
      try {
        const cachedUrl = await saveToCache(cacheKey, finalUrl);
        if (cachedUrl.startsWith('/')) {
          finalUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${cachedUrl}`;
        }
      } catch (error) {
        console.warn('Failed to cache image:', error);
      }
    }

    console.log('✅ Image generated successfully');
    
    return NextResponse.json({
      data: [{
        url: finalUrl,
        b64_json: imageData.b64_json,
        revised_prompt: imageData.revised_prompt,
        cached: false
      }],
      model: 'gpt-image-1'
    });

  } catch (error) {
    console.error('Image generation error:', error);
    
    // Handle specific OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes('safety')) {
        return NextResponse.json(
          { error: 'Content policy violation. Please modify your prompt.' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('billing')) {
        return NextResponse.json(
          { error: 'Service temporarily unavailable due to billing.' },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to generate image. Please try again.' },
      { status: 500 }
    );
  }
}
