import { NextResponse } from 'next/server';
import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
  project: process.env.OPENAI_PROJECT_ID,
});

// FLUX fallback configuration
const FLUX_API_URL = 'https://api.bfl.ai/v1/flux-kontext-pro';
const FLUX_API_KEY = process.env.BFL_API_KEY;

// Rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 3;

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

async function convertImageToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

function buildCompositionPrompt(userPrompt: string, imageRoles: string[]): string {
  const roleDescriptions = imageRoles.map((role, index) => 
    `${role} from image ${index + 1}`
  ).join(', ');
  
  return `Create a composition combining ${roleDescriptions}. ${userPrompt}. Blend these elements naturally while maintaining the key characteristics of each.`;
}

async function tryGPTImage1(prompt: string, images: { role: string; base64: string }[]) {
  try {
    console.log('🤖 Attempting composition with GPT-Image-1');
    
    // For now, GPT-Image-1 doesn't support multi-image input directly
    // We'll create a detailed prompt describing the composition
    const enhancedPrompt = buildCompositionPrompt(prompt, images.map(img => img.role));
    
    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: enhancedPrompt,
      size: '1024x1024',
    });

    if (response.data && response.data.length > 0) {
      console.log('✅ GPT-Image-1 composition successful');
      return {
        success: true,
        data: response.data[0],
        model: 'gpt-image-1'
      };
    }
    
    throw new Error('No image generated');
  } catch (error) {
    console.log('❌ GPT-Image-1 failed:', error);
    return { success: false, error };
  }
}

async function tryFluxKontext(prompt: string, images: { role: string; base64: string }[], width: number, height: number) {
  try {
    if (!FLUX_API_KEY) {
      throw new Error('FLUX API key not configured');
    }
    
    console.log('🎨 Falling back to FLUX1-Kontext Max');
    
    const compositionPrompt = buildCompositionPrompt(prompt, images.map(img => img.role));
    
    const fluxRequest = {
      prompt: compositionPrompt,
      width,
      height,
      prompt_upsampling: false,
      seed: Math.floor(Math.random() * 1000000),
      safety_tolerance: 2,
      output_format: "jpeg",
      kontext_images: images.map(img => ({
        image: img.base64,
        description: img.role
      }))
    };

    const response = await fetch(FLUX_API_URL, {
      method: 'POST',
      headers: {
        'x-key': FLUX_API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(fluxRequest),
    });

    if (!response.ok) {
      throw new Error(`FLUX API error: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.result || !result.result.sample) {
      throw new Error('Invalid FLUX response');
    }

    console.log('✅ FLUX1-Kontext Max composition successful');
    return {
      success: true,
      data: {
        url: result.result.sample,
        seed: result.result.seed
      },
      model: 'flux1-kontext-max'
    };
    
  } catch (error) {
    console.log('❌ FLUX1-Kontext Max failed:', error);
    return { success: false, error };
  }
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
    const prompt = formData.get('prompt') as string;
    const width = parseInt(formData.get('width') as string || '1024');
    const height = parseInt(formData.get('height') as string || '1024');

    // Collect all uploaded images and their roles
    const images: { file: File; role: string; base64: string }[] = [];
    
    // Check for images with roles
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image_') && value instanceof File) {
        const role = formData.get(key.replace('image_', 'role_')) as string || 'reference';
        const base64 = await convertImageToBase64(value);
        images.push({ file: value, role, base64 });
      }
    }

    // Input validation
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    if (prompt.length > 2000) {
      return NextResponse.json(
        { error: 'Prompt too long. Maximum 2000 characters.' },
        { status: 400 }
      );
    }

    if (images.length === 0) {
      return NextResponse.json(
        { error: 'At least one reference image is required' },
        { status: 400 }
      );
    }

    if (images.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 reference images allowed' },
        { status: 400 }
      );
    }

    // Validate image sizes (10MB max each)
    const maxSize = 10 * 1024 * 1024;
    for (const img of images) {
      if (img.file.size > maxSize) {
        return NextResponse.json(
          { error: `Image "${img.role}" is too large. Maximum 10MB per image.` },
          { status: 413 }
        );
      }
    }

    console.log('🎨 Creating multi-image composition:', {
      imageCount: images.length,
      roles: images.map(img => img.role),
      prompt: prompt.substring(0, 100) + '...'
    });

    // Try GPT-Image-1 first
    const gptResult = await tryGPTImage1(prompt, images);
    
    if (gptResult.success && gptResult.data) {
      return NextResponse.json({
        data: [{
          url: gptResult.data.url,
          b64_json: gptResult.data.b64_json,
          cached: false,
          model: gptResult.model,
          revised_prompt: gptResult.data.revised_prompt,
          composition_info: {
            images_used: images.length,
            roles: images.map(img => img.role),
            primary_model: 'gpt-image-1'
          }
        }]
      });
    }

    // Fallback to FLUX1-Kontext Max
    const fluxResult = await tryFluxKontext(prompt, images, width, height);
    
    if (fluxResult.success && fluxResult.data) {
      return NextResponse.json({
        data: [{
          url: fluxResult.data.url,
          cached: false,
          model: fluxResult.model,
          seed: fluxResult.data.seed,
          composition_info: {
            images_used: images.length,
            roles: images.map(img => img.role),
            primary_model: 'gpt-image-1',
            fallback_used: 'flux1-kontext-max'
          }
        }]
      });
    }

    // Both failed
    return NextResponse.json(
      { error: 'Both GPT-Image-1 and FLUX1-Kontext Max failed. Please try again with different images or prompt.' },
      { status: 500 }
    );

  } catch (error) {
    console.error('Image composition error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('safety') || error.message.includes('content policy')) {
        return NextResponse.json(
          { error: 'Content policy violation. Please modify your prompt or images.' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create composition. Please try again.' },
      { status: 500 }
    );
  }
}