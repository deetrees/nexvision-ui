'use client';

// DEPRECATED: This gate test page is no longer needed
// Image validation is now handled by /api/validate-image

import Header from '../components/Header';

export default function GateTestPage() {
  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header showBackButton={true} />
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            ⚠️ Page Deprecated
          </h1>
          <p className="text-gray-600 mb-6">
            This gate test page is no longer needed. Image validation is now seamlessly integrated into the main upload flow.
          </p>
          <div className="space-y-3">
            <a 
              href="/reimagine" 
              className="block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Try Image Transformation
            </a>
            <a 
              href="/gpt-image" 
              className="block bg-green-500 text-white px-6 py-3 rounded-lg hover:green-600 transition-colors"
            >
              Try GPT-Image Studio
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
