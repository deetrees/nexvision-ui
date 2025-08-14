'use client';

import { useState } from 'react';
import Header from '../components/Header';

interface TestResult {
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

export default function GateTestPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
    }
  };

  const testImageGate = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await fetch('/api/image-gate', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error testing image gate:', error);
      setResult({
        success: false,
        approved: false,
        reasons: ['❌ Test failed. Please try again.'],
        analysis: {},
        metadata: {
          filename: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🔧 Robust Image Gate Test
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Test the new vision-based validation system
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left">
            <h3 className="font-semibold text-blue-900 mb-3">✅ What&apos;s New:</h3>
            <ul className="space-y-2 text-blue-800">
              <li>• <strong>Flexible Detection:</strong> Allows houses with trees, cars, mailboxes</li>
              <li>• <strong>Wide Shots:</strong> Accepts street + house combinations</li>
              <li>• <strong>Context Aware:</strong> Dogs in yard OK if house is visible</li>
              <li>• <strong>Better Feedback:</strong> Clear reasons with helpful suggestions</li>
              <li>• <strong>Lower Thresholds:</strong> 30% confidence for better coverage</li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Image to Test
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {selectedFile && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Selected Image:</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p><strong>Name:</strong> {selectedFile.name}</p>
                <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                <p><strong>Type:</strong> {selectedFile.type}</p>
              </div>
              
              <button
                onClick={testImageGate}
                disabled={isLoading}
                className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Testing...' : 'Test Image Gate'}
              </button>
            </div>
          )}

          {result && (
            <div className="border-t pt-8">
              <h3 className="text-xl font-semibold mb-4">Test Results:</h3>
              
              <div className={`p-6 rounded-lg mb-6 ${
                result.approved 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">
                    {result.approved ? '✅' : '❌'}
                  </span>
                  <span className={`text-xl font-semibold ${
                    result.approved ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {result.approved ? 'APPROVED' : 'REJECTED'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {result.reasons.map((reason, index) => (
                    <p key={index} className={`${
                      result.approved ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {reason}
                    </p>
                  ))}
                </div>
              </div>

              {result.analysis.labels && result.analysis.labels.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h4 className="font-semibold mb-3">🏷️ Detected Labels:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {result.analysis.labels
                      .filter(label => (label.Confidence || 0) > 30)
                      .sort((a, b) => (b.Confidence || 0) - (a.Confidence || 0))
                      .slice(0, 12)
                      .map((label, index) => (
                        <div key={index} className="bg-white rounded px-3 py-2 text-sm">
                          <span className="font-medium">{label.Name}</span>
                          <span className="text-gray-500 ml-2">
                            {Math.round(label.Confidence || 0)}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {result.analysis.faces && result.analysis.faces.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-yellow-800 mb-2">👥 Faces Detected:</h4>
                  <p className="text-yellow-700">
                    {result.analysis.faces.length} face(s) found in the image
                  </p>
                </div>
              )}

              {result.analysis.moderationLabels && result.analysis.moderationLabels.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">⚠️ Moderation Flags:</h4>
                  <div className="space-y-1">
                    {result.analysis.moderationLabels.map((label, index) => (
                      <p key={index} className="text-red-700">
                        {label.Name} ({Math.round(label.Confidence || 0)}% confidence)
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-12 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">🧪 Test Scenarios:</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-green-700 mb-2">✅ Should PASS:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• House with car in driveway</li>
                <li>• Home partially hidden by trees</li>
                <li>• Street view showing house</li>
                <li>• Interior room photos</li>
                <li>• Kitchen with appliances</li>
                <li>• Backyard with house visible</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-red-700 mb-2">❌ Should FAIL:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Photos with people</li>
                <li>• Just animals (no house)</li>
                <li>• Car interior only</li>
                <li>• Pure landscape/nature</li>
                <li>• Inappropriate content</li>
                <li>• Random objects only</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
