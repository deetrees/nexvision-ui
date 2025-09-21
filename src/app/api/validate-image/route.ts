import { NextResponse } from 'next/server';
import { RekognitionClient, DetectLabelsCommand } from '@aws-sdk/client-rekognition';

// Initialize Rekognition client
const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Architectural/home-related keywords that we accept
const VALID_CONTENT_KEYWORDS = [
  // Buildings & Architecture
  'house', 'home', 'building', 'architecture', 'residential', 'facade', 'roof', 'exterior',
  'cottage', 'villa', 'mansion', 'apartment', 'townhouse', 'bungalow', 'cabin',
  
  // Architectural Features
  'window', 'door', 'porch', 'balcony', 'garage', 'driveway', 'siding', 'brick',
  'stone', 'stucco', 'wood', 'concrete', 'shingle', 'chimney', 'gutter', 'trim',
  
  // Outdoor Spaces
  'yard', 'garden', 'lawn', 'backyard', 'front yard', 'patio', 'deck', 'fence',
  'landscape', 'landscaping', 'property', 'estate', 'curb', 'sidewalk', 'path',
  
  // Natural Elements (common in home photos)
  'tree', 'grass', 'sky', 'ground', 'plant', 'flower', 'bush', 'nature'
];

interface ValidationResult {
  isValid: boolean;
  confidence: number;
  detectedLabels: string[];
  reason: string;
}

async function validateImageContent(imageBuffer: Buffer): Promise<ValidationResult> {
  try {
    // Use AWS Rekognition to detect labels
    const command = new DetectLabelsCommand({
      Image: { Bytes: imageBuffer },
      MaxLabels: 20,
      MinConfidence: 20  // Lower threshold for better detection
    });

    const response = await rekognitionClient.send(command);
    const labels = response.Labels || [];
    
    // Extract label names and confidences
    const detectedLabels = labels.map(label => ({
      name: label.Name?.toLowerCase() || '',
      confidence: label.Confidence || 0
    }));

    // Check if any detected labels match our valid content keywords
    const validMatches = detectedLabels.filter(label =>
      VALID_CONTENT_KEYWORDS.some(keyword =>
        label.name.includes(keyword.toLowerCase()) || 
        keyword.toLowerCase().includes(label.name)
      )
    );

    // Calculate confidence based on matches
    const hasValidContent = validMatches.length > 0;
    const avgConfidence = hasValidContent 
      ? validMatches.reduce((sum, match) => sum + match.confidence, 0) / validMatches.length
      : 0;

    // More permissive validation - accept if we have any architectural content OR if we can't determine
    const isValid = hasValidContent || detectedLabels.length === 0; // Accept if no labels detected (benefit of doubt)
    
    return {
      isValid,
      confidence: Math.round(avgConfidence),
      detectedLabels: detectedLabels.map(l => l.name),
      reason: isValid 
        ? hasValidContent 
          ? `✅ Detected architectural content: ${validMatches.map(m => m.name).join(', ')}`
          : `✅ Image accepted (unable to analyze content)`
        : `❌ No architectural content detected. Please upload a photo of a house, building, or property exterior.`
    };

  } catch (error) {
    console.error('Image validation error:', error);
    // On error, be permissive and allow the image
    return {
      isValid: true,
      confidence: 0,
      detectedLabels: [],
      reason: '✅ Image accepted (validation service unavailable)'
    };
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({
        isValid: false,
        reason: '❌ Image file too large. Maximum size is 5MB.',
        confidence: 0,
        detectedLabels: []
      });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate image content
    const validation = await validateImageContent(buffer);

    return NextResponse.json({
      isValid: validation.isValid,
      confidence: validation.confidence,
      detectedLabels: validation.detectedLabels,
      reason: validation.reason,
      filename: file.name,
      size: file.size
    });

  } catch (error) {
    console.error('Validation API error:', error);
    return NextResponse.json(
      { 
        isValid: false,
        reason: '❌ Failed to validate image. Please try again.',
        confidence: 0,
        detectedLabels: []
      },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'image-validation',
    timestamp: new Date().toISOString()
  });
}
