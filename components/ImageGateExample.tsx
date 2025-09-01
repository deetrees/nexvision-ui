'use client';

import { useState } from 'react';
import ProtectedImage from './ProtectedImage';

export default function ImageGateExample() {
  const [authToken, setAuthToken] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(true);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">AWS Rekognition Image Gate</h2>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold text-blue-800 mb-2">Features Enabled:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>✅ Content Moderation (blocks inappropriate content)</li>
          <li>✅ Object Detection (can require/block specific objects)</li>
          <li>✅ Text Detection (can block specific text content)</li>
          <li>⚠️ Face Detection (disabled in config)</li>
          <li>⚠️ Custom Labels (requires custom model)</li>
        </ul>
      </div>
      
      {/* Authentication inputs */}
      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Auth Token (Bearer):
            </label>
            <input
              type="text"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="Enter 'valid-token' to test"
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              API Key:
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter 'valid-api-key' to test"
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showAnalysis"
            checked={showAnalysis}
            onChange={(e) => setShowAnalysis(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="showAnalysis" className="text-sm">
            Show Rekognition analysis results
          </label>
        </div>
      </div>

      {/* Protected images */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Test Image 1:</h3>
          <p className="text-sm text-gray-600 mb-3">
            Upload a test image to /public/protected-images/test1.jpg
          </p>
          <ProtectedImage
            src="test1.jpg"
            alt="Protected test image 1"
            width={400}
            height={300}
            authToken={authToken}
            apiKey={apiKey}
            showAnalysisInfo={showAnalysis}
            className="border rounded"
          />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">Test Image 2:</h3>
          <p className="text-sm text-gray-600 mb-3">
            Upload a test image to /public/protected-images/test2.png
          </p>
          <ProtectedImage
            src="test2.png"
            alt="Protected test image 2"
            width={400}
            height={300}
            authToken={authToken}
            apiKey={apiKey}
            showAnalysisInfo={showAnalysis}
            className="border rounded"
          />
        </div>
      </div>

      {/* Configuration info */}
      <div className="mt-8 bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Current Configuration:</h3>
        <div className="text-sm text-gray-700 space-y-1">
          <div>• Moderation threshold: 80% confidence</div>
          <div>• Blocked labels: Weapon, Violence</div>
          <div>• Blocked text: confidential, private, secret</div>
          <div>• Required labels: None (can be configured)</div>
        </div>
        
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Make sure to set up your AWS credentials in .env.local 
            and ensure your AWS account has Rekognition permissions.
          </p>
        </div>
      </div>
    </div>
  );
}
