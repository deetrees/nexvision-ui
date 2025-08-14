import { NextRequest, NextResponse } from 'next/server';
import { RekognitionClient, DetectModerationLabelsCommand, DetectFacesCommand, DetectTextCommand, DetectLabelsCommand } from '@aws-sdk/client-rekognition';

// Validate environment variables
function validateEnvVars() {
  const required = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Initialize Rekognition client with error handling
let rekognitionClient: RekognitionClient;

try {
  validateEnvVars();
  rekognitionClient = new RekognitionClient({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
} catch (error) {
  console.error('Failed to initialize Rekognition client:', error);
}

interface ImageGateOptions {
  checkModeration?: boolean;
  checkFaces?: boolean;
  checkText?: boolean;
  checkLabels?: boolean;
  moderationThreshold?: number;
}

interface ImageGateResult {
  approved: boolean;
  reasons: string[];
  moderationLabels?: any[];
  faces?: any[];
  text?: any[];
  labels?: any[];
  confidence?: number;
}

// Positive indicators - if ANY of these are found with good confidence, approve the image
const ARCHITECTURAL_INDICATORS = [
  // Exterior Architecture
  'House', 'Building', 'Architecture', 'Residential Building', 'Facade', 'Roof',
  'Home', 'Cottage', 'Villa', 'Mansion', 'Apartment Building', 'Townhouse',
  'Porch', 'Balcony', 'Window', 'Door', 'Garage', 'Driveway',
  'Yard', 'Garden', 'Lawn', 'Backyard', 'Front Yard', 'Patio', 'Deck',
  
  // Interior Spaces
  'Room', 'Living Room', 'Kitchen', 'Bathroom', 'Bedroom', 'Dining Room',
  'Interior Design', 'Furniture', 'Cabinet', 'Counter', 'Fireplace',
  'Ceiling', 'Floor', 'Wall', 'Hardwood Floor', 'Tile Floor',
  
  // Architectural Features
  'Brick', 'Stone', 'Siding', 'Stucco', 'Wood', 'Concrete',
  'Shingle', 'Metal Roof', 'Chimney', 'Gutter', 'Trim'
];

// Strong negative indicators - reject ONLY if these are dominant AND no architectural elements
const STRONG_NEGATIVES = [
  'Person', 'Human', 'Face', 'People', 'Man', 'Woman', 'Child',
  'Nudity', 'Explicit', 'Violence', 'Weapon', 'Drug'
];

// Contextual negatives - only reject if these are present WITHOUT architectural context
const CONTEXTUAL_NEGATIVES = [
  'Animal', 'Dog', 'Cat', 'Pet', 'Wildlife',
  'Vehicle Only', 'Car Interior', 'Truck Interior'
];

async function analyzeImage(imageBuffer: Buffer, options: ImageGateOptions): Promise<ImageGateResult> {
  const result: ImageGateResult = {
    approved: false, // Default to rejected until we find acceptable content
    reasons: [],
  };

  try {
    // Run all checks in parallel for faster performance
    const promises = [
      // Always check for inappropriate content
      rekognitionClient.send(new DetectModerationLabelsCommand({
        Image: { Bytes: imageBuffer },
        MinConfidence: options.moderationThreshold || 50,
      })),
      
      // Check for general labels (most important for architectural detection)
      rekognitionClient.send(new DetectLabelsCommand({
        Image: { Bytes: imageBuffer },
        MaxLabels: 50, // More labels for better context
        MinConfidence: 30, // Lower threshold for better detection
      }))
    ];

    // Add face detection if enabled
    if (options.checkFaces) {
      promises.push(
        rekognitionClient.send(new DetectFacesCommand({
          Image: { Bytes: imageBuffer },
          Attributes: [], // Don't analyze face attributes for speed
        }))
      );
    }

    // Add text detection if enabled
    if (options.checkText) {
      promises.push(
        rekognitionClient.send(new DetectTextCommand({
          Image: { Bytes: imageBuffer },
        }))
      );
    }

    // Wait for all analyses to complete
    const responses = await Promise.all(promises);
    
    // Parse responses
    const moderationResponse = responses[0] as any;
    const labelResponse = responses[1] as any;
    const faceResponse = options.checkFaces ? responses[2] as any : null;
    const textResponse = options.checkText ? responses[options.checkFaces ? 3 : 2] as any : null;

    result.moderationLabels = moderationResponse.ModerationLabels || [];
    result.labels = labelResponse.Labels || [];
    result.faces = faceResponse?.FaceDetails || [];
    result.text = textResponse?.TextDetections || [];

    // Quick rejection checks first
    if (result.moderationLabels && result.moderationLabels.length > 0) {
      result.approved = false;
      result.reasons.push(`Inappropriate content detected: ${result.moderationLabels.map(label => label.Name).join(', ')}`);
      return result;
    }

    // Check for people in the image
    if (result.faces && result.faces.length > 0) {
      result.approved = false;
      result.reasons.push(`People detected in image (${result.faces.length} face(s)). Please upload images without people.`);
      return result;
    }

    // Analyze labels for architectural content using robust approach
    const detectedLabels = (result.labels || [])
      .map(label => ({ name: label.Name || '', confidence: label.Confidence || 0 }))
      .filter(label => label.confidence > 30);

    // Find architectural indicators
    const architecturalMatches = detectedLabels.filter(label =>
      ARCHITECTURAL_INDICATORS.some(indicator =>
        label.name.toLowerCase().includes(indicator.toLowerCase()) ||
        indicator.toLowerCase().includes(label.name.toLowerCase())
      )
    );

    // Find strong negatives
    const strongNegatives = detectedLabels.filter(label =>
      STRONG_NEGATIVES.some(negative =>
        label.name.toLowerCase().includes(negative.toLowerCase())
      )
    );

    // Find contextual negatives
    const contextualNegatives = detectedLabels.filter(label =>
      CONTEXTUAL_NEGATIVES.some(negative =>
        label.name.toLowerCase().includes(negative.toLowerCase())
      )
    );

    console.log('Detected labels:', detectedLabels.map(l => `${l.name} (${l.confidence}%)`));
    console.log('Architectural matches:', architecturalMatches.map(m => m.name));
    console.log('Strong negatives:', strongNegatives.map(n => n.name));
    console.log('Contextual negatives:', contextualNegatives.map(n => n.name));

    // Robust Decision Logic
    if (strongNegatives.length > 0) {
      result.approved = false;
      result.reasons.push(`❌ Inappropriate content detected: ${strongNegatives.map(n => n.name).join(', ')}`);
    } else if (architecturalMatches.length > 0) {
      // Found architectural content - approve!
      result.approved = true;
      const highConfidenceMatches = architecturalMatches
        .filter(match => match.confidence > 60)
        .map(match => match.name);
      
      result.reasons.push(`✅ Architectural content detected: ${highConfidenceMatches.join(', ')}`);
      
      // Note contextual elements if present
      if (contextualNegatives.length > 0) {
        result.reasons.push(`ℹ️ Also detected: ${contextualNegatives.map(n => n.name).join(', ')} (acceptable with architectural content)`);
      }
    } else if (contextualNegatives.length > 0) {
      // No architectural content found, but contextual negatives present
      result.approved = false;
      result.reasons.push(`❌ No architectural content found. Detected: ${contextualNegatives.map(n => n.name).join(', ')}`);
      result.reasons.push(`💡 Please upload images of homes, buildings, or interior spaces.`);
    } else {
      // Generic rejection - no clear architectural content
      result.approved = false;
      result.reasons.push(`❌ No architectural content detected in this image.`);
      result.reasons.push(`💡 Please upload photos of house exteriors, building facades, or interior rooms.`);
      
      if (detectedLabels.length > 0) {
        const topLabels = detectedLabels
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 5)
          .map(label => label.name);
        result.reasons.push(`🔍 Detected: ${topLabels.join(', ')}`);
      }
    }

  } catch (error) {
    console.error('Rekognition analysis error:', error);
    result.approved = false;
    result.reasons.push('Image analysis failed');
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Check file size (max 5MB for Rekognition)
    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image file too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Get analysis options from query parameters - architectural filtering is always on
    const url = new URL(request.url);
    const options: ImageGateOptions = {
      checkModeration: true, // Always check for inappropriate content
      checkFaces: url.searchParams.get('faces') !== 'false', // Default to checking faces
      checkText: url.searchParams.get('text') === 'true',
      checkLabels: true, // Always check labels for architectural content
      moderationThreshold: parseInt(url.searchParams.get('threshold') || '50'),
    };

    console.log('Analyzing architectural image:', file.name, 'Size:', buffer.length, 'Options:', options);

    // Analyze the image
    const analysis = await analyzeImage(buffer, options);

    return NextResponse.json({
      success: true,
      approved: analysis.approved,
      reasons: analysis.reasons,
      analysis: {
        moderationLabels: analysis.moderationLabels,
        faces: analysis.faces,
        text: analysis.text,
        labels: analysis.labels,
      },
      metadata: {
        filename: file.name,
        size: buffer.length,
        type: file.type,
      }
    });

  } catch (error) {
    console.error('Image gate error:', error);
    return NextResponse.json(
      { error: 'Internal server error during image analysis' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    // Check if client is initialized
    if (!rekognitionClient) {
      return NextResponse.json(
        { 
          status: 'unhealthy',
          service: 'image-gate',
          error: 'Rekognition client not initialized - check environment variables',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    // Check environment variables
    validateEnvVars();

    // Simple test to verify credentials work
    const testCommand = new DetectModerationLabelsCommand({
      Image: { 
        Bytes: new Uint8Array([0xFF, 0xD8, 0xFF]) // Invalid JPEG header to trigger expected error
      },
    });

    try {
      await rekognitionClient.send(testCommand);
    } catch (error: any) {
      // Expected error for invalid image format, but confirms API access
      if (error.name === 'InvalidImageFormatException' || error.name === 'InvalidParameterException') {
        return NextResponse.json({
          status: 'healthy',
          service: 'image-gate',
          rekognition: 'connected',
          region: process.env.AWS_REGION,
          timestamp: new Date().toISOString(),
        });
      }
      throw error; // Re-throw unexpected errors
    }

    return NextResponse.json({
      status: 'healthy',
      service: 'image-gate',
      rekognition: 'connected',
      region: process.env.AWS_REGION,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy',
        service: 'image-gate',
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
