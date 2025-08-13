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
    text?: Array<{ DetectedText?: string; Confidence?: number }>;
    labels?: Array<{ Name?: string; Confidence?: number }>;
  };
  metadata: {
    filename: string;
    size: number;
    type: string;
  };
}

export class ImageGateClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/image-gate') {
    this.baseUrl = baseUrl;
  }

  /**
   * Analyze an architectural image through the server-side gate
   * This will check for homes, buildings, interiors, and exteriors only
   */
  async analyzeArchitecturalImage(
    file: File, 
    options: ImageGateOptions = {}
  ): Promise<ImageGateResponse> {
    const formData = new FormData();
    formData.append('image', file);

    // Build query parameters - architectural filtering is always enabled
    const params = new URLSearchParams();
    if (options.faces !== undefined) params.set('faces', options.faces.toString());
    if (options.text !== undefined) params.set('text', options.text.toString());
    if (options.threshold !== undefined) params.set('threshold', options.threshold.toString());

    const url = `${this.baseUrl}${params.toString() ? '?' + params.toString() : ''}`;

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Architectural image analysis failed');
    }

    return response.json();
  }

  /**
   * Legacy method - now redirects to architectural analysis
   * @deprecated Use analyzeArchitecturalImage instead
   */
  async analyzeImage(
    file: File, 
    options: ImageGateOptions = {}
  ): Promise<ImageGateResponse> {
    return this.analyzeArchitecturalImage(file, options);
  }

  /**
   * Check if the image gate service is healthy
   */
  async healthCheck(): Promise<{ status: string; rekognition: string }> {
    const response = await fetch(this.baseUrl, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Health check failed');
    }

    return response.json();
  }

  /**
   * Quick architectural check - returns true if image contains buildings/homes
   */
  async isArchitecturalImage(file: File, allowPeople: boolean = false): Promise<boolean> {
    try {
      const result = await this.analyzeArchitecturalImage(file, {
        faces: !allowPeople, // Reject faces unless explicitly allowed
        threshold: 50,
      });
      return result.approved;
    } catch (error) {
      console.error('Architectural image check failed:', error);
      return false; // Fail safe - reject if we can't analyze
    }
  }

  /**
   * Comprehensive architectural analysis
   */
  async fullArchitecturalAnalysis(file: File): Promise<ImageGateResponse> {
    return this.analyzeArchitecturalImage(file, {
      faces: true, // Check for people (will reject if found)
      text: true,  // Detect any text in the image
      threshold: 50,
    });
  }
}

// Export a default instance
export const imageGate = new ImageGateClient();

// Utility functions for architectural content filtering
export const architecturalPresets = {
  strict: { faces: true, threshold: 30 }, // Reject people, low threshold
  standard: { faces: true, threshold: 50 }, // Reject people, standard threshold
  lenient: { faces: false, threshold: 70 }, // Allow people, high threshold
};

export function getArchitecturalLevel(level: 'strict' | 'standard' | 'lenient'): ImageGateOptions {
  return architecturalPresets[level];
}

// Helper to format architectural analysis results
export function formatArchitecturalResults(analysis: ImageGateResponse['analysis']) {
  const results: string[] = [];

  if (analysis.moderationLabels?.length) {
    results.push(`⚠️ Content Issues: ${analysis.moderationLabels.map(l => `${l.Name} (${l.Confidence?.toFixed(1)}%)`).join(', ')}`);
  }

  if (analysis.faces?.length) {
    results.push(`👥 People Detected: ${analysis.faces.length} face(s) - may be rejected`);
  }

  if (analysis.text?.length) {
    const textItems = analysis.text.filter(t => t.Type === 'LINE').map(t => t.DetectedText);
    if (textItems.length) {
      results.push(`📝 Text Found: ${textItems.join(', ')}`);
    }
  }

  if (analysis.labels?.length) {
    const architecturalLabels = analysis.labels
      .filter(l => l.Confidence && l.Confidence > 60)
      .slice(0, 8)
      .map(l => `${l.Name} (${l.Confidence?.toFixed(1)}%)`);
    
    if (architecturalLabels.length) {
      results.push(`🏠 Detected Features: ${architecturalLabels.join(', ')}`);
    }
  }

  return results;
}

// Helper to determine if labels indicate architectural content
export function isArchitecturalContent(labels: Array<{ Name?: string; Confidence?: number }>): boolean {
  const architecturalKeywords = [
    'building', 'house', 'home', 'architecture', 'room', 'interior', 'exterior',
    'door', 'window', 'roof', 'wall', 'floor', 'ceiling', 'kitchen', 'bathroom',
    'bedroom', 'living', 'office', 'furniture', 'cabinet', 'counter'
  ];

  return labels.some(label => 
    architecturalKeywords.some(keyword => 
      label.Name?.toLowerCase().includes(keyword)
    )
  );
}
