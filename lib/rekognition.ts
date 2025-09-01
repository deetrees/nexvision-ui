import { 
  RekognitionClient, 
  DetectModerationLabelsCommand,
  DetectLabelsCommand,
  DetectFacesCommand,
  DetectTextCommand,
  DetectCustomLabelsCommand,
  ModerationLabel,
  Label,
  FaceDetail,
  TextDetection,
  CustomLabel
} from '@aws-sdk/client-rekognition';

// Initialize Rekognition client
const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface ImageAnalysisResult {
  isAllowed: boolean;
  reason?: string;
  confidence?: number;
  moderationLabels?: ModerationLabel[];
  labels?: Label[];
  faces?: FaceDetail[];
  text?: TextDetection[];
  customLabels?: CustomLabel[];
}

export interface ImageGateConfig {
  enableContentModeration?: boolean;
  enableObjectDetection?: boolean;
  enableFaceDetection?: boolean;
  enableTextDetection?: boolean;
  enableCustomLabels?: boolean;
  customModelArn?: string;
  moderationThreshold?: number;
  requiredLabels?: string[];
  blockedLabels?: string[];
  maxFaces?: number;
  minFaces?: number;
  blockedText?: string[];
}

export class RekognitionImageGate {
  private config: ImageGateConfig;

  constructor(config: ImageGateConfig = {}) {
    this.config = {
      enableContentModeration: true,
      moderationThreshold: 80,
      ...config,
    };
  }

  async analyzeImage(imageBuffer: Buffer): Promise<ImageAnalysisResult> {
    const result: ImageAnalysisResult = {
      isAllowed: true,
    };

    try {
      // Content Moderation
      if (this.config.enableContentModeration) {
        const moderationResult = await this.detectModerationLabels(imageBuffer);
        result.moderationLabels = moderationResult;
        
        const inappropriateContent = moderationResult.find(
          label => (label.Confidence || 0) > (this.config.moderationThreshold || 80)
        );
        
        if (inappropriateContent) {
          result.isAllowed = false;
          result.reason = `Inappropriate content detected: ${inappropriateContent.Name}`;
          result.confidence = inappropriateContent.Confidence;
          return result;
        }
      }

      // Object Detection
      if (this.config.enableObjectDetection) {
        const labels = await this.detectLabels(imageBuffer);
        result.labels = labels;
        
        // Check for required labels
        if (this.config.requiredLabels?.length) {
          const hasRequiredLabel = this.config.requiredLabels.some(required =>
            labels.some(label => 
              label.Name?.toLowerCase().includes(required.toLowerCase()) &&
              (label.Confidence || 0) > 70
            )
          );
          
          if (!hasRequiredLabel) {
            result.isAllowed = false;
            result.reason = `Required content not found: ${this.config.requiredLabels.join(', ')}`;
            return result;
          }
        }
        
        // Check for blocked labels
        if (this.config.blockedLabels?.length) {
          const blockedLabel = labels.find(label =>
            this.config.blockedLabels!.some(blocked =>
              label.Name?.toLowerCase().includes(blocked.toLowerCase()) &&
              (label.Confidence || 0) > 70
            )
          );
          
          if (blockedLabel) {
            result.isAllowed = false;
            result.reason = `Blocked content detected: ${blockedLabel.Name}`;
            result.confidence = blockedLabel.Confidence;
            return result;
          }
        }
      }

      // Face Detection
      if (this.config.enableFaceDetection) {
        const faces = await this.detectFaces(imageBuffer);
        result.faces = faces;
        
        if (this.config.maxFaces && faces.length > this.config.maxFaces) {
          result.isAllowed = false;
          result.reason = `Too many faces detected: ${faces.length} (max: ${this.config.maxFaces})`;
          return result;
        }
        
        if (this.config.minFaces && faces.length < this.config.minFaces) {
          result.isAllowed = false;
          result.reason = `Not enough faces detected: ${faces.length} (min: ${this.config.minFaces})`;
          return result;
        }
      }

      // Text Detection
      if (this.config.enableTextDetection) {
        const textDetections = await this.detectText(imageBuffer);
        result.text = textDetections;
        
        if (this.config.blockedText?.length) {
          const detectedText = textDetections
            .map(t => t.DetectedText?.toLowerCase())
            .join(' ');
          
          const blockedTextFound = this.config.blockedText.find(blocked =>
            detectedText.includes(blocked.toLowerCase())
          );
          
          if (blockedTextFound) {
            result.isAllowed = false;
            result.reason = `Blocked text detected: ${blockedTextFound}`;
            return result;
          }
        }
      }

      // Custom Labels
      if (this.config.enableCustomLabels && this.config.customModelArn) {
        const customLabels = await this.detectCustomLabels(imageBuffer);
        result.customLabels = customLabels;
        
        // Add custom logic based on your custom model
        // Example: Block images with specific custom labels
        const blockedCustomLabel = customLabels.find(label =>
          (label.Confidence || 0) > 80 && label.Name === 'inappropriate_custom_content'
        );
        
        if (blockedCustomLabel) {
          result.isAllowed = false;
          result.reason = `Custom content filter triggered: ${blockedCustomLabel.Name}`;
          result.confidence = blockedCustomLabel.Confidence;
          return result;
        }
      }

    } catch (error) {
      console.error('Rekognition analysis error:', error);
      // Fail closed - deny access if analysis fails
      result.isAllowed = false;
      result.reason = 'Image analysis failed';
    }

    return result;
  }

  private async detectModerationLabels(imageBuffer: Buffer): Promise<ModerationLabel[]> {
    const command = new DetectModerationLabelsCommand({
      Image: { Bytes: imageBuffer },
      MinConfidence: 50,
    });
    
    const response = await rekognitionClient.send(command);
    return response.ModerationLabels || [];
  }

  private async detectLabels(imageBuffer: Buffer): Promise<Label[]> {
    const command = new DetectLabelsCommand({
      Image: { Bytes: imageBuffer },
      MinConfidence: 70,
      MaxLabels: 20,
    });
    
    const response = await rekognitionClient.send(command);
    return response.Labels || [];
  }

  private async detectFaces(imageBuffer: Buffer): Promise<FaceDetail[]> {
    const command = new DetectFacesCommand({
      Image: { Bytes: imageBuffer },
      Attributes: ['ALL'],
    });
    
    const response = await rekognitionClient.send(command);
    return response.FaceDetails || [];
  }

  private async detectText(imageBuffer: Buffer): Promise<TextDetection[]> {
    const command = new DetectTextCommand({
      Image: { Bytes: imageBuffer },
    });
    
    const response = await rekognitionClient.send(command);
    return response.TextDetections || [];
  }

  private async detectCustomLabels(imageBuffer: Buffer): Promise<CustomLabel[]> {
    if (!this.config.customModelArn) {
      return [];
    }

    const command = new DetectCustomLabelsCommand({
      Image: { Bytes: imageBuffer },
      ProjectVersionArn: this.config.customModelArn,
      MinConfidence: 70,
    });
    
    const response = await rekognitionClient.send(command);
    return response.CustomLabels || [];
  }
}
