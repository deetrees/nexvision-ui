// Enhanced Image Gate with robust vision-based validation
import { RekognitionClient, DetectLabelsCommand, DetectModerationLabelsCommand, DetectFacesCommand } from '@aws-sdk/client-rekognition';

const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface ImageGateOptions {
  moderation?: boolean;
  faces?: boolean;
  text?: boolean;
  labels?: boolean;
  threshold?: number;
}

export interface ImageGateResponse {
  success: boolean;
  approved: boolean;
  reasons: string[];
  analysis: {
    moderationLabels?: Array<{ Name?: string; Confidence?: number }>;
    faces?: Array<{ BoundingBox?: object }>;
    labels?: Array<{ Name?: string; Confidence?: number }>;
  };
  metadata: {
    filename: string;
    size: number;
    type: string;
  };
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

export class ImageGateClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/image-gate') {
    this.baseUrl = baseUrl;
  }

  /**
   * Analyze an architectural image with robust vision-based validation
   * Uses positive detection approach - allows if home/building/room elements are present
   */
  async analyzeArchitecturalImage(
    file: File, 
    options: ImageGateOptions = {}
  ): Promise<ImageGateResponse> {
    // For client-side usage, delegate to server
    if (typeof window !== 'undefined') {
      return this.analyzeViaServer(file, options);
    }

    // Server-side direct analysis
    return this.analyzeDirectly(file, options);
  }

  /**
   * Server-side direct analysis using AWS Rekognition
   */
  private async analyzeDirectly(file: File, options: ImageGateOptions = {}): Promise<ImageGateResponse> {
    const result: ImageGateResponse = {
      success: false,
      approved: false,
      reasons: [],
      analysis: {},
      metadata: {
        filename: file.name,
        size: file.size,
        type: file.type,
      },
    };

    try {
      // Convert file to buffer
      const buffer = await file.arrayBuffer();
      const imageBytes = new Uint8Array(buffer);

      // Run parallel analysis - only what we need for robust detection
      const [moderationResponse, labelsResponse, facesResponse] = await Promise.all([
        rekognition.send(new DetectModerationLabelsCommand({
          Image: { Bytes: imageBytes },
          MinConfidence: 50
        })),
        rekognition.send(new DetectLabelsCommand({
          Image: { Bytes: imageBytes },
          MinConfidence: 30, // Lower threshold for better detection
          MaxLabels: 50      // More labels for better context
        })),
        rekognition.send(new DetectFacesCommand({
          Image: { Bytes: imageBytes }
        }))
      ]);

      // Store analysis results
      result.analysis.moderationLabels = moderationResponse.ModerationLabels || [];
      result.analysis.labels = labelsResponse.Labels || [];
      result.analysis.faces = facesResponse.FaceDetails || [];
      result.success = true;

      // Step 1: Check for moderation issues (always reject)
      if (result.analysis.moderationLabels.length > 0) {
        const moderationIssues = result.analysis.moderationLabels
          .filter(label => (label.Confidence || 0) > 70)
          .map(label => label.Name)
          .filter(Boolean);

        if (moderationIssues.length > 0) {
          result.approved = false;
          result.reasons.push(`❌ Content policy violation: ${moderationIssues.join(', ')}`);
          return result;
        }
      }

      // Step 2: Check for faces (reject if people are prominent)
      if (result.analysis.faces && result.analysis.faces.length > 0) {
        result.approved = false;
        result.reasons.push(`❌ People detected in image (${result.analysis.faces.length} face(s)). Please upload images without people for best results.`);
        return result;
      }

      // Step 3: Analyze labels for architectural content
      const detectedLabels = (result.analysis.labels || [])
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

      // Decision Logic
      if (strongNegatives.length > 0) {
        result.approved = false;
        result.reasons.push(`❌ Inappropriate content detected: ${strongNegatives.map(n => n.name).join(', ')}`);
        return result;
      }

      if (architecturalMatches.length > 0) {
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
        
        return result;
      }

      // No architectural content found
      if (contextualNegatives.length > 0) {
        result.approved = false;
        result.reasons.push(`❌ No architectural content found. Detected: ${contextualNegatives.map(n => n.name).join(', ')}`);
        result.reasons.push(`💡 Please upload images of homes, buildings, or interior spaces.`);
        return result;
      }

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

      return result;

    } catch (error) {
      console.error('Image analysis failed:', error);
      result.success = false;
      result.approved = false;
      result.reasons.push('❌ Image analysis failed. Please try again.');
      return result;
    }
  }

  /**
   * Client-side analysis via server API
   */
  private async analyzeViaServer(file: File, options: ImageGateOptions = {}): Promise<ImageGateResponse> {
    const formData = new FormData();
    formData.append('image', file);

    // Build query parameters
    const params = new URLSearchParams();
    if (options.faces !== undefined) params.set('faces', options.faces.toString());
    if (options.threshold !== undefined) params.set('threshold', options.threshold.toString());

    const url = `${this.baseUrl}${params.toString() ? '?' + params.toString() : ''}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Image gate API error:', error);
      return {
        success: false,
        approved: false,
        reasons: ['❌ Image validation service unavailable. Please try again.'],
        analysis: {},
        metadata: {
          filename: file.name,
          size: file.size,
          type: file.type,
        },
      };
    }
  }

  /**
   * Simplified method for basic validation
   */
  async analyzeImage(file: File, options: ImageGateOptions = {}): Promise<ImageGateResponse> {
    return this.analyzeArchitecturalImage(file, options);
  }
}

// Export singleton instance
export const imageGate = new ImageGateClient();

// Helper function for checking if content is architectural
export function isArchitecturalContent(labels: Array<{ Name?: string; Confidence?: number }>): boolean {
  return labels.some(label => {
    const labelName = label.Name?.toLowerCase() || '';
    const confidence = label.Confidence || 0;
    
    return confidence > 40 && ARCHITECTURAL_INDICATORS.some(indicator =>
      labelName.includes(indicator.toLowerCase()) ||
      indicator.toLowerCase().includes(labelName)
    );
  });
}

// Helper function to format analysis results for display
export function formatAnalysisResults(analysis: ImageGateResponse['analysis']): string[] {
  const results: string[] = [];
  
  if (analysis.labels && analysis.labels.length > 0) {
    const topLabels = analysis.labels
      .filter(label => (label.Confidence || 0) > 50)
      .sort((a, b) => (b.Confidence || 0) - (a.Confidence || 0))
      .slice(0, 8)
      .map(label => `${label.Name} (${Math.round(label.Confidence || 0)}%)`);
    
    if (topLabels.length > 0) {
      results.push(`🏷️ Detected: ${topLabels.join(', ')}`);
    }
  }
  
  if (analysis.faces && analysis.faces.length > 0) {
    results.push(`👥 Faces detected: ${analysis.faces.length}`);
  }
  
  if (analysis.moderationLabels && analysis.moderationLabels.length > 0) {
    const moderationIssues = analysis.moderationLabels
      .map(label => `${label.Name} (${Math.round(label.Confidence || 0)}%)`)
      .join(', ');
    results.push(`⚠️ Moderation flags: ${moderationIssues}`);
  }
  
  return results;
}
