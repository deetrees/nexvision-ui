import { NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function GET() {
  try {
    // Check if API token exists
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({ 
        error: 'REPLICATE_API_TOKEN not found',
        hasToken: false 
      });
    }

    // Initialize Replicate
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Test basic connection
    const models = await replicate.models.list();
    
    return NextResponse.json({ 
      status: 'success',
      hasToken: true,
      tokenLength: process.env.REPLICATE_API_TOKEN.length,
      tokenPrefix: process.env.REPLICATE_API_TOKEN.substring(0, 8) + '...',
      modelsCount: models.results?.length || 0,
      message: 'Replicate API connection successful'
    });

  } catch (error) {
    console.error('Replicate debug error:', error);
    
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : 'Unknown',
      hasToken: !!process.env.REPLICATE_API_TOKEN,
      tokenLength: process.env.REPLICATE_API_TOKEN?.length || 0,
      details: error.toString()
    }, { status: 500 });
  }
}
