import { NextResponse } from 'next/server';

// Simple in-memory credit system (in production, use database)
const userCredits = new Map();
const FREE_CREDITS = 3; // Free credits per user
const CREDIT_COST_PER_IMAGE = 1;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId') || 'anonymous';
  
  const credits = userCredits.get(userId) ?? FREE_CREDITS;
  
  return NextResponse.json({ 
    credits,
    freeCredits: FREE_CREDITS,
    costPerImage: CREDIT_COST_PER_IMAGE
  });
}

export async function POST(request: Request) {
  try {
    const { userId = 'anonymous', action } = await request.json();
    
    if (action === 'use') {
      const currentCredits = userCredits.get(userId) ?? FREE_CREDITS;
      
      if (currentCredits < CREDIT_COST_PER_IMAGE) {
        return NextResponse.json(
          { error: 'Insufficient credits. Please upgrade to continue.' },
          { status: 402 } // Payment Required
        );
      }
      
      userCredits.set(userId, currentCredits - CREDIT_COST_PER_IMAGE);
      
      return NextResponse.json({ 
        success: true,
        remainingCredits: currentCredits - CREDIT_COST_PER_IMAGE
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process credits' },
      { status: 500 }
    );
  }
}
