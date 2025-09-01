import Image from 'next/image';
import Link from 'next/link';
import Header from '../components/Header';

export default function Examples() {
  const examples = [
    {
      title: "Modern Farmhouse Transformation",
      description: "Traditional colonial transformed into a stunning modern farmhouse with board and batten siding, black trim, and contemporary landscaping.",
      style: "Modern Farmhouse",
      beforeAlt: "Traditional colonial house before transformation",
      afterAlt: "Modern farmhouse after AI transformation"
    },
    {
      title: "Contemporary Makeover",
      description: "Ranch home updated with sleek stucco, large windows, and minimalist design elements for a contemporary look.",
      style: "Contemporary",
      beforeAlt: "Ranch house before transformation",
      afterAlt: "Contemporary house after AI transformation"
    },
    {
      title: "Craftsman Style Revival",
      description: "Basic suburban home transformed into a charming craftsman with stone accents, covered porch, and natural materials.",
      style: "Craftsman",
      beforeAlt: "Suburban house before transformation",
      afterAlt: "Craftsman style house after AI transformation"
    },
    {
      title: "Mediterranean Villa",
      description: "Standard home reimagined as a Mediterranean villa with stucco walls, tile roof, and arched windows.",
      style: "Mediterranean",
      beforeAlt: "Standard house before transformation",
      afterAlt: "Mediterranean villa after AI transformation"
    }
  ];

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <Header showBackButton={true} />

      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Transformation Examples
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            See how NexVision AI transforms ordinary homes into stunning architectural masterpieces. 
            Each transformation took less than 30 seconds to generate.
          </p>
        </div>

        {/* Examples Grid */}
        <div className="space-y-20">
          {examples.map((example, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-8">
                <div className="flex flex-col lg:flex-row gap-8 items-center">
                  <div className="lg:w-1/3">
                    <div className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold mb-4">
                      {example.style}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      {example.title}
                    </h2>
                    <p className="text-gray-600 text-lg leading-relaxed mb-6">
                      {example.description}
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>Generated in under 30 seconds</span>
                      </div>
                      <div className="flex items-center gap-2 text-green-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>High-resolution output</span>
                      </div>
                      <div className="flex items-center gap-2 text-green-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>Realistic architectural details</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="lg:w-2/3">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">Before</h3>
                        <div className="aspect-[4/3] bg-gray-200 rounded-lg overflow-hidden">
                          <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                            <div className="text-center text-gray-600">
                              <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                              </svg>
                              <p className="text-sm">Original Home</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">After</h3>
                        <div className="aspect-[4/3] bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg overflow-hidden">
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center text-gray-700">
                              <svg className="w-16 h-16 mx-auto mb-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                              </svg>
                              <p className="text-sm font-semibold">AI Transformed</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Popular Styles */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Popular Transformation Styles</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "Modern Farmhouse", description: "Clean lines with rustic charm" },
              { name: "Contemporary", description: "Sleek and minimalist design" },
              { name: "Traditional", description: "Classic and timeless appeal" },
              { name: "Craftsman", description: "Handcrafted details and natural materials" },
              { name: "Mediterranean", description: "Warm stucco and tile roofing" },
              { name: "Colonial", description: "Symmetrical and formal design" },
              { name: "Ranch", description: "Single-story horizontal emphasis" },
              { name: "Victorian", description: "Ornate details and bold colors" }
            ].map((style, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <h3 className="font-semibold text-gray-900 mb-2">{style.name}</h3>
                <p className="text-gray-600 text-sm">{style.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Home?</h2>
            <p className="text-xl mb-6 opacity-90">Join thousands of homeowners who've discovered their home's potential</p>
            <Link 
              href="/reimagine"
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-2xl text-xl font-semibold hover:bg-gray-100 transition-colors"
            >
              Start Your Free Transformation
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
