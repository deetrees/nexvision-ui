import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'EXIF orientation handling verification endpoint',
    features: [
      'Enhanced EXIF parsing for iOS and Android',
      'Robust orientation detection (values 1-8)',
      'Canvas-based rotation with flip support',
      'Quality preservation (92% JPEG)',
      'Error handling and fallbacks',
      'Performance optimizations'
    ],
    testInstructions: [
      '1. Take photos with your mobile device in different orientations',
      '2. Upload to /orientation-test for detailed analysis',
      '3. Check debug output for EXIF parsing details',
      '4. Verify images display upright after correction',
      '5. Test with both iOS and Android devices'
    ]
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Basic file validation
    const isImage = file.type.startsWith('image/');
    const isJPEG = file.type.includes('jpeg') || file.type.includes('jpg');
    
    return NextResponse.json({
      filename: file.name,
      size: file.size,
      type: file.type,
      isImage,
      isJPEG,
      hasEXIFPotential: isJPEG,
      message: isJPEG 
        ? 'JPEG file detected - EXIF orientation data may be present'
        : 'Non-JPEG file - EXIF orientation data unlikely',
      recommendation: isJPEG
        ? 'Upload to /orientation-test for full EXIF analysis'
        : 'JPEG files are recommended for EXIF orientation testing'
    });

  } catch {
    return NextResponse.json(
      { error: 'Failed to analyze file' },
      { status: 500 }
    );
  }
}
