'use client';

import { useState, useCallback } from 'react';
import { imageGate, ImageGateResponse } from '@/lib/image-gate';

interface ImageGateUploadProps {
  onImageApproved?: (file: File, analysis: ImageGateResponse) => void;
  onImageRejected?: (file: File, analysis: ImageGateResponse) => void;
  moderationLevel?: 'strict' | 'moderate' | 'lenient';
  enableFullAnalysis?: boolean;
  className?: string;
}

export default function ImageGateUpload({
  onImageApproved,
  onImageRejected,
  moderationLevel = 'moderate',
  enableFullAnalysis = false,
  className = '',
}: ImageGateUploadProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<ImageGateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);
    setLastAnalysis(null);

    try {
      let analysis: ImageGateResponse;

      if (enableFullAnalysis) {
        analysis = await imageGate.analyzeArchitecturalImage(file);
      } else {
        const options = {
          faces: moderationLevel === 'strict',
          text: moderationLevel !== 'permissive',
          threshold: moderationLevel === 'strict' ? 30 : moderationLevel === 'moderate' ? 50 : 70
        };
        analysis = await imageGate.analyzeImage(file, options);
      }

      setLastAnalysis(analysis);

      if (analysis.approved) {
        onImageApproved?.(file, analysis);
      } else {
        onImageRejected?.(file, analysis);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Image analysis failed';
      setError(errorMessage);
      console.error('Image gate error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [moderationLevel, enableFullAnalysis, onImageApproved, onImageRejected]);

  return (
    <div className={`image-gate-upload ${className}`}>
      <div className="upload-section">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Image for Analysis
        </label>
        
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={isAnalyzing}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        />
        
        {isAnalyzing && (
          <div className="mt-2 flex items-center text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Analyzing image with AWS Rekognition...
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="text-red-800">
              <strong>Error:</strong> {error}
            </div>
          </div>
        </div>
      )}

      {lastAnalysis && (
        <div className="mt-4 p-4 border rounded-md">
          <div className={`mb-2 font-semibold ${lastAnalysis.approved ? 'text-green-600' : 'text-red-600'}`}>
            {lastAnalysis.approved ? '✅ Image Approved' : '❌ Image Rejected'}
          </div>

          {!lastAnalysis.approved && lastAnalysis.reasons.length > 0 && (
            <div className="mb-3">
              <strong>Rejection Reasons:</strong>
              <ul className="list-disc list-inside text-red-700 mt-1">
                {lastAnalysis.reasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-sm text-gray-600">
            <strong>File:</strong> {lastAnalysis.metadata.filename} 
            ({(lastAnalysis.metadata.size / 1024).toFixed(1)} KB)
          </div>

          {enableFullAnalysis && (
            <div className="mt-3">
              <strong>Analysis Results:</strong>
              <div className="text-sm text-gray-700 mt-1">
                {Object.entries(lastAnalysis.analysis).map(([key, value]) => (
                  value && Array.isArray(value) && value.length > 0 && (
                    <div key={key} className="mb-1">
                      • {key}: {value.map((item: { Name?: string; DetectedText?: string }) => item.Name || item.DetectedText).filter(Boolean).join(', ')}
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <div>Moderation Level: <strong>{moderationLevel}</strong></div>
        <div>Full Analysis: <strong>{enableFullAnalysis ? 'Enabled' : 'Disabled'}</strong></div>
        <div>Powered by AWS Rekognition</div>
      </div>
    </div>
  );
}

// Example usage component
export function ImageGateDemo() {
  const [approvedImages, setApprovedImages] = useState<File[]>([]);
  const [rejectedImages, setRejectedImages] = useState<File[]>([]);

  const handleApproved = (file: File, analysis: ImageGateResponse) => {
    console.log('Image approved:', file.name, analysis);
    setApprovedImages(prev => [...prev, file]);
  };

  const handleRejected = (file: File, analysis: ImageGateResponse) => {
    console.log('Image rejected:', file.name, analysis);
    setRejectedImages(prev => [...prev, file]);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Image Gate Demo</h2>
      
      <div className="grid gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-3">Basic Moderation (Moderate Level)</h3>
          <ImageGateUpload
            moderationLevel="moderate"
            onImageApproved={handleApproved}
            onImageRejected={handleRejected}
            className="border p-4 rounded-lg"
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Full Analysis (All Features)</h3>
          <ImageGateUpload
            moderationLevel="strict"
            enableFullAnalysis={true}
            onImageApproved={handleApproved}
            onImageRejected={handleRejected}
            className="border p-4 rounded-lg bg-gray-50"
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-green-600">Approved Images ({approvedImages.length})</h4>
          <ul className="text-sm text-gray-600 mt-2">
            {approvedImages.map((file, index) => (
              <li key={index}>• {file.name}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-red-600">Rejected Images ({rejectedImages.length})</h4>
          <ul className="text-sm text-gray-600 mt-2">
            {rejectedImages.map((file, index) => (
              <li key={index}>• {file.name}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
