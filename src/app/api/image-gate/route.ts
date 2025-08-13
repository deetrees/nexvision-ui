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

// Define acceptable architectural/property-related labels
const ACCEPTABLE_LABELS = [
  // Buildings and structures
  'Building', 'House', 'Home', 'Architecture', 'Mansion', 'Villa', 'Cottage', 'Cabin',
  'Apartment Building', 'Condominium', 'Office Building', 'Skyscraper', 'Tower',
  'Church', 'Cathedral', 'Temple', 'Mosque', 'Synagogue', 'Chapel',
  'School', 'University', 'Hospital', 'Hotel', 'Restaurant', 'Shop', 'Store',
  'Warehouse', 'Factory', 'Barn', 'Garage', 'Shed', 'Greenhouse',
  
  // Exterior elements
  'Roof', 'Door', 'Window', 'Balcony', 'Porch', 'Deck', 'Patio', 'Terrace',
  'Garden', 'Yard', 'Lawn', 'Driveway', 'Sidewalk', 'Fence', 'Gate',
  'Pool', 'Swimming Pool', 'Hot Tub', 'Gazebo', 'Pergola',
  'Brick', 'Stone', 'Wood', 'Concrete', 'Siding', 'Stucco',
  
  // Interior elements
  'Room', 'Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Dining Room',
  'Office', 'Study', 'Library', 'Basement', 'Attic', 'Hallway', 'Staircase',
  'Fireplace', 'Ceiling', 'Floor', 'Wall', 'Cabinet', 'Counter', 'Countertop',
  'Furniture', 'Chair', 'Table', 'Sofa', 'Bed', 'Desk', 'Shelf', 'Bookshelf',
  'Appliance', 'Refrigerator', 'Oven', 'Stove', 'Dishwasher', 'Washer', 'Dryer',
  'Light', 'Lamp', 'Chandelier', 'Mirror', 'Curtain', 'Blinds',
  
  // Architectural details
  'Column', 'Pillar', 'Arch', 'Dome', 'Spire', 'Chimney', 'Gutter',
  'Molding', 'Trim', 'Tile', 'Hardwood', 'Carpet', 'Marble', 'Granite',
  'Paint', 'Wallpaper', 'Texture', 'Pattern',
  
  // Property-related
  'Real Estate', 'Property', 'Residence', 'Commercial', 'Residential',
  'Interior Design', 'Architecture', 'Construction', 'Renovation'
];

// Labels that should be rejected (non-architectural content)
const REJECTED_LABELS = [
  // People and animals
  'Person', 'Human', 'Face', 'People', 'Man', 'Woman', 'Child', 'Baby',
  'Animal', 'Dog', 'Cat', 'Pet', 'Bird', 'Horse', 'Cow', 'Wildlife',
  
  // Vehicles
  'Car', 'Truck', 'Vehicle', 'Automobile', 'Motorcycle', 'Bicycle', 'Boat', 'Plane',
  
  // Nature (unless part of landscaping)
  'Forest', 'Mountain', 'Beach', 'Ocean', 'Lake', 'River', 'Desert',
  
  // Food and dining (unless architectural dining spaces)
  'Food', 'Meal', 'Plate', 'Bowl', 'Drink', 'Beverage',
  
  // Electronics (unless built-in)
  'Phone', 'Computer', 'Laptop', 'Television', 'TV', 'Monitor',
  
  // Clothing and personal items
  'Clothing', 'Shirt', 'Pants', 'Shoes', 'Bag', 'Purse', 'Jewelry'
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
        MaxLabels: 20, // Reduced for speed
        MinConfidence: 60,
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
    if (result.faces.length > 0) {
      result.approved = false;
      result.reasons.push(`People detected in image (${result.faces.length} face(s)). Please upload images without people.`);
      return result;
    }

    // Check for architectural/property-related content
    const detectedLabels = result.labels.map(label => label.Name || '');
    const acceptableMatches = detectedLabels.filter(label => 
      ACCEPTABLE_LABELS.some(acceptable => 
        label.toLowerCase().includes(acceptable.toLowerCase()) ||
        acceptable.toLowerCase().includes(label.toLowerCase())
      )
    );

    const rejectedMatches = detectedLabels.filter(label => 
      REJECTED_LABELS.some(rejected => 
        label.toLowerCase().includes(rejected.toLowerCase()) ||
        rejected.toLowerCase().includes(label.toLowerCase())
      )
    );

    console.log('Detected labels:', detectedLabels);
    console.log('Acceptable matches:', acceptableMatches);
    console.log('Rejected matches:', rejectedMatches);

    // Decision logic
    if (acceptableMatches.length === 0) {
      result.approved = false;
      result.reasons.push('No architectural or property-related content detected. Only images of homes, buildings, interiors, and exteriors are allowed.');
    } else if (rejectedMatches.length > 0 && rejectedMatches.length >= acceptableMatches.length) {
      result.approved = false;
      result.reasons.push(`Image contains non-architectural content: ${rejectedMatches.join(', ')}. Please upload images of buildings, homes, or property features only.`);
    } else {
      result.approved = true;
      result.reasons.push(`Architectural content detected: ${acceptableMatches.join(', ')}`);
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
