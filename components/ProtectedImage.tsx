'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

interface ProtectedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  authToken?: string;
  apiKey?: string;
  showAnalysisInfo?: boolean;
}

interface AnalysisInfo {
  labels?: string;
  faces?: string;
  textDetected?: boolean;
}

export default function ProtectedImage({
  src,
  alt,
  width = 400,
  height = 300,
  className,
  authToken,
  apiKey,
  showAnalysisInfo = false,
}: ProtectedImageProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [analysisInfo, setAnalysisInfo] = useState<AnalysisInfo>({});

  useEffect(() => {
    const fetchProtectedImage = async () => {
      try {
        const headers: HeadersInit = {};
        
        // Add authentication headers
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }
        if (apiKey) {
          headers['X-API-Key'] = apiKey;
        }

        const response = await fetch(`/api/images/${src}`, {
          headers,
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 403) {
            // Try to get the error details for blocked content
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.reason || 'Content blocked by filter');
          }
          throw new Error(`Failed to load image: ${response.status}`);
        }

        // Extract analysis info from headers
        if (showAnalysisInfo) {
          setAnalysisInfo({
            labels: response.headers.get('X-Analysis-Labels') || '',
            faces: response.headers.get('X-Analysis-Faces') || '0',
            textDetected: response.headers.get('X-Analysis-Text-Detected') === 'true',
          });
        }

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setImageSrc(imageUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load image');
      } finally {
        setLoading(false);
      }
    };

    fetchProtectedImage();

    // Cleanup object URL on unmount
    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [src, authToken, apiKey, showAnalysisInfo]);

  if (loading) {
    return (
      <div className="space-y-2">
        <div 
          className={`flex items-center justify-center bg-gray-200 ${className}`}
          style={{ width, height }}
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
        {showAnalysisInfo && (
          <div className="text-sm text-gray-500">Analyzing image...</div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <div 
          className={`flex flex-col items-center justify-center bg-red-100 text-red-700 p-4 rounded ${className}`}
          style={{ width, height }}
        >
          <div className="text-center">
            <div className="font-semibold">Image Blocked</div>
            <div className="text-sm mt-1">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Image
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
      />
      {showAnalysisInfo && (
        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
          <div className="font-semibold mb-1">Analysis Results:</div>
          {analysisInfo.labels && (
            <div>Labels: {analysisInfo.labels}</div>
          )}
          <div>Faces detected: {analysisInfo.faces}</div>
          <div>Text detected: {analysisInfo.textDetected ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  );
}
