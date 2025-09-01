import Image from 'next/image';
import Link from 'next/link';
import Header from '../components/Header';

export default function HowItWorks() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <Header showBackButton={true} />

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            How NexVision Works
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Transform your home's exterior in just 3 simple steps. No design experience needed.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-16">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center text-xl font-bold">1</div>
                <h2 className="text-2xl font-bold text-gray-900">Upload Your Photo</h2>
              </div>
              <p className="text-gray-600 text-lg leading-relaxed">
                Take a clear photo of your home's exterior from the front. Make sure the lighting is good and the entire facade is visible. 
                Our AI works best with daylight photos showing the full front of your house.
              </p>
              <ul className="mt-4 space-y-2 text-gray-600">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Use natural daylight for best results
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Show the full front facade
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Maximum 10MB file size
                </li>
              </ul>
            </div>
            <div className="md:w-1/2">
              <div className="bg-gray-100 rounded-lg p-8 text-center">
                <svg className="w-24 h-24 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-600">Upload your home photo here</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row-reverse items-center gap-8">
            <div className="md:w-1/2">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center text-xl font-bold">2</div>
                <h2 className="text-2xl font-bold text-gray-900">Describe Your Vision</h2>
              </div>
              <p className="text-gray-600 text-lg leading-relaxed">
                Tell our AI exactly what you want to change. Be specific about colors, materials, styles, and features. 
                The more detailed your description, the better your results will be.
              </p>
              <div className="mt-4 space-y-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800"><strong>Example:</strong> "Change the siding to white board and batten, add black shutters, replace the front door with a red farmhouse door, and add window boxes with flowers"</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-800"><strong>Example:</strong> "Modern makeover with dark gray stucco, large black-framed windows, and minimalist landscaping with ornamental grasses"</p>
                </div>
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="bg-gray-100 rounded-lg p-8">
                <div className="bg-white rounded border p-4">
                  <p className="text-gray-500 text-sm mb-2">Describe your dream exterior...</p>
                  <div className="h-20 bg-gray-50 rounded border-dashed border-2 border-gray-300 flex items-center justify-center">
                    <span className="text-gray-400">Type your vision here</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-500 text-white rounded-full flex items-center justify-center text-xl font-bold">3</div>
                <h2 className="text-2xl font-bold text-gray-900">Get Your Transformation</h2>
              </div>
              <p className="text-gray-600 text-lg leading-relaxed">
                Watch as our AI transforms your home in under 30 seconds. Download your high-resolution result 
                and share it with contractors, family, or use it for planning your actual renovation.
              </p>
              <ul className="mt-4 space-y-2 text-gray-600">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  High-resolution download
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Results in 30 seconds or less
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Perfect for contractor consultations
                </li>
              </ul>
            </div>
            <div className="md:w-1/2">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-8 text-center">
                <div className="w-24 h-24 bg-white rounded-lg mx-auto mb-4 flex items-center justify-center shadow-lg">
                  <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-700 font-semibold">Your transformed home is ready!</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <Link 
            href="/reimagine"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl text-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Try It Now - 3 Free Transformations
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </main>
  );
}
