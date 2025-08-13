'use client';

import { useState } from 'react';

interface TestResult {
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

export default function TestPage() {
  const [result, setResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testImageGate = async (file: File) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/image-gate', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        approved: false,
        reasons: [error instanceof Error ? error.message : 'Unknown error'],
        analysis: {},
        metadata: { filename: '', size: 0, type: '' }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      testImageGate(file);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🏠 Image Gate Test</h1>
      <p>Test the architectural image validation</p>
      
      <input 
        type="file" 
        accept="image/*" 
        onChange={handleFileChange}
        style={{ marginBottom: '20px' }}
      />
      
      {isLoading && <p>🔍 Analyzing image...</p>}
      
      {result && (
        <div style={{ 
          background: result.approved ? '#d4edda' : '#f8d7da', 
          padding: '15px', 
          borderRadius: '5px',
          marginTop: '20px'
        }}>
          <h3>{result.approved ? '✅ APPROVED' : '⚠️ WARNING'}</h3>
          <p><strong>Reasons:</strong> {result.reasons?.join(', ')}</p>
          {result.analysis?.labels && (
            <p><strong>Detected:</strong> {result.analysis.labels.slice(0, 5).map(l => l.Name).join(', ')}</p>
          )}
        </div>
      )}
      
      <div style={{ marginTop: '30px', padding: '15px', background: '#f8f9fa', borderRadius: '5px' }}>
        <h3>Instructions:</h3>
        <ul>
          <li>✅ Upload images of houses, buildings, rooms, exteriors</li>
          <li>⚠️ Try uploading people, animals, or vehicles to see warnings</li>
          <li>🔍 The system uses AWS Rekognition for analysis</li>
        </ul>
      </div>
    </div>
  );
}
