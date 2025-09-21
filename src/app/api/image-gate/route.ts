// Image gate functionality has been removed
// This endpoint is deprecated and will return a 410 Gone status
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Image gate functionality has been removed. Images are now processed directly.' },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    { 
      status: 'deprecated',
      message: 'Image gate functionality has been removed',
      timestamp: new Date().toISOString(),
    },
    { status: 410 }
  );
}
