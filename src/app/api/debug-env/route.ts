import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasReplicateToken: !!process.env.REPLICATE_API_TOKEN,
    tokenLength: process.env.REPLICATE_API_TOKEN?.length || 0,
    tokenPrefix: process.env.REPLICATE_API_TOKEN?.substring(0, 10) + '...' || 'none',
    nodeEnv: process.env.NODE_ENV,
    hasAwsKey: !!process.env.AWS_ACCESS_KEY_ID,
    awsRegion: process.env.AWS_REGION,
    allEnvKeys: Object.keys(process.env).filter(key => 
      key.includes('REPLICATE') || 
      key.includes('AWS') || 
      key.includes('NODE_ENV')
    ).sort()
  });
}
