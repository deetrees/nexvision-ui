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
  organization: process.env.OPENAI_ORG_ID,
  project: process.env.OPENAI_PROJECT_ID,
});

// Make the image edit model configurable - use same model as generation
const IMAGE_EDIT_MODEL = process.env.OPENAI_IMAGE_GENERATE_MODEL || process.env.OPENAI_IMAGE_EDIT_MODEL || 'dall-e-2';

// Rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 3; // Lower limit for image editing

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

function generateCacheKey(imageHash: string, prompt: string, maskHash?: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(`edit-${imageHash}-${prompt}-${maskHash || 'nomask'}`);
  return hash.digest('hex');
}

async function saveToCache(key: string, imageUrl: string): Promise<string> {
  try {
    ensureCacheDir();
    
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Failed to fetch image');
    
    const buffer = await response.arrayBuffer();
    const filename = `${key}.png`;
    const filepath = path.join(CACHE_DIR, filename);
    
    fs.writeFileSync(filepath, Buffer.from(buffer));
    
    return `/cache/images/${filename}`;
  } catch (error) {
    console.error('Cache save error:', error);
    return imageUrl;
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

function hashBuffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 16);
}

async function processImageFile(file: File): Promise<{ buffer: Buffer; hash: string }> {
  // Convert to buffer directly (orientation correction handled client-side)
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Generate hash for caching
  const hash = hashBuffer(buffer);
  
  return { buffer, hash };
}

function validateImageFormat(buffer: Buffer): boolean {
  // Check PNG signature
  if (buffer.length >= 8) {
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    if (buffer.subarray(0, 8).equals(pngSignature)) {
      return true;
    }
  }
  
  // Check JPEG signature
  if (buffer.length >= 2) {
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      return true;
    }
  }
  
  return false;
}

function validateMaskFormat(buffer: Buffer): boolean {
  // Masks must be PNG with transparency
  if (buffer.length >= 8) {
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    return buffer.subarray(0, 8).equals(pngSignature);
  }
  return false;
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

    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const maskFile = formData.get('mask') as File | null;
    const prompt = formData.get('prompt') as string;
    const size = formData.get('size') as string || '1024x1024';
    const n = parseInt(formData.get('n') as string || '1');
    const response_format = formData.get('response_format') as string || 'url';

    // Input validation
    if (!imageFile) {
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      );
    }

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

    // File size validation (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (imageFile.size > maxSize) {
      return NextResponse.json(
        { error: 'Image file too large. Maximum 10MB.' },
        { status: 413 }
      );
    }

    if (maskFile && maskFile.size > maxSize) {
      return NextResponse.json(
        { error: 'Mask file too large. Maximum 10MB.' },
        { status: 413 }
      );
    }

    // Valid sizes for image editing
    const validSizes = ['256x256', '512x512', '1024x1024'];
    if (!validSizes.includes(size)) {
      return NextResponse.json(
        { error: 'Invalid size. Must be one of: ' + validSizes.join(', ') },
        { status: 400 }
      );
    }

    console.log('🖼️ Processing image edit request:', {
      imageSize: imageFile.size,
      maskSize: maskFile?.size || 0,
      prompt: prompt.substring(0, 50) + '...'
    });

    // Process image file (with EXIF correction)
    const { buffer: imageBuffer, hash: imageHash } = await processImageFile(imageFile);
    
    if (!validateImageFormat(imageBuffer)) {
      return NextResponse.json(
        { error: 'Invalid image format. Only PNG and JPEG are supported.' },
        { status: 400 }
      );
    }

    // Process mask file if provided
    let maskBuffer: Buffer | undefined;
    let maskHash: string | undefined;
    
    if (maskFile) {
      const maskArrayBuffer = await maskFile.arrayBuffer();
      maskBuffer = Buffer.from(maskArrayBuffer);
      maskHash = hashBuffer(maskBuffer);
      
      if (!validateMaskFormat(maskBuffer)) {
        return NextResponse.json(
          { error: 'Invalid mask format. Mask must be a PNG file with transparency.' },
          { status: 400 }
        );
      }
    }

    // Check cache
    const cacheKey = generateCacheKey(imageHash, prompt, maskHash);
    const cachedImage = getCachedImage(cacheKey);
    
    if (cachedImage) {
      console.log('✅ Serving edited image from cache');
      return NextResponse.json({
        data: [{
          url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${cachedImage}`,
          cached: true
        }],
        model: 'gpt-image-1'
      });
    }

    console.log(`🎨 Editing image with ${IMAGE_EDIT_MODEL}`);

    // Prepare the API call parameters - adjust based on model
    const editParams: any = {
      model: IMAGE_EDIT_MODEL,
      image: imageBuffer,
      prompt,
      size: size as '256x256' | '512x512' | '1024x1024',
    };

    // gpt-image-1 doesn't support some DALL-E specific parameters for editing
    if (IMAGE_EDIT_MODEL === 'gpt-image-1') {
      console.log('🤖 Using GPT-Image-1 for image editing');
      // Note: gpt-image-1 may not support image editing, this will likely fail
    } else {
      // DALL-E specific parameters
      editParams.n = Math.min(n, 1); // DALL-E only supports n=1
      editParams.response_format = response_format as 'url' | 'b64_json';
    }

    // Add mask if provided
    if (maskBuffer) {
      editParams.mask = maskBuffer;
      console.log('🎭 Using provided mask for selective editing');
    }

    // Call OpenAI API
    const response = await openai.images.edit(editParams);

    if (!response.data || response.data.length === 0) {
      throw new Error('No edited image generated');
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
        console.warn('Failed to cache edited image:', error);
      }
    }

    console.log('✅ Image edited successfully');
    
    return NextResponse.json({
      data: [{
        url: finalUrl,
        b64_json: imageData.b64_json,
        cached: false
      }],
      model: 'gpt-image-1',
      mask_used: !!maskBuffer
    });

  } catch (error) {
    console.error('Image edit error:', error);
    
    // Handle specific OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes('safety') || error.message.includes('policy')) {
        return NextResponse.json(
          { error: 'Content policy violation. Please modify your prompt or image.' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('size') || error.message.includes('dimensions')) {
        return NextResponse.json(
          { error: 'Image dimensions not supported. Please resize your image.' },
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
      { error: 'Failed to edit image. Please try again.' },
      { status: 500 }
    );
  }
}
