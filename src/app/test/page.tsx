'use client';

// DEPRECATED: This test page is no longer needed
// Image validation is now handled by /api/validate-image

export default function TestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          ⚠️ Page Deprecated
        </h1>
        <p className="text-gray-600 mb-4">
          This test page is no longer needed. Image validation is now integrated into the main upload flow.
        </p>
        <a 
          href="/reimagine" 
          className="inline-block bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Go to Main App
        </a>
      </div>
    </div>
  );
}
