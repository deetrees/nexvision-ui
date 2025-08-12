'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../components/Header';

export default function FAQ() {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const faqs = [
    {
      category: "Getting Started",
      questions: [
        {
          q: "How does NexVision work?",
          a: "NexVision uses advanced AI to transform your home's exterior. Simply upload a photo of your home, describe the changes you want, and our AI generates a realistic transformation in under 30 seconds."
        },
        {
          q: "What types of photos work best?",
          a: "For best results, use clear, well-lit photos taken during daylight hours. Make sure the entire front facade of your home is visible and the image is high quality. Avoid photos taken at night or in poor weather conditions."
        },
        {
          q: "Do I need to create an account?",
          a: "No! You can try NexVision immediately with 3 free transformations. No signup, no credit card required. Just upload and transform."
        }
      ]
    },
    {
      category: "Pricing & Credits",
      questions: [
        {
          q: "How much does NexVision cost?",
          a: "NexVision offers 3 free transformations to get started. After that, our Pro plan is $9.99 for 50 additional transformations, perfect for planning multiple renovation ideas."
        },
        {
          q: "What happens when I run out of free credits?",
          a: "Once you've used your 3 free transformations, you'll be prompted to upgrade to our Pro plan. You can purchase additional credits anytime to continue transforming your home."
        },
        {
          q: "Do credits expire?",
          a: "No, your purchased credits never expire. Use them at your own pace for as many transformations as you need."
        }
      ]
    },
    {
      category: "Technical",
      questions: [
        {
          q: "What file formats are supported?",
          a: "We support JPG, PNG, and HEIC image formats. Maximum file size is 10MB. For best results, use high-resolution images with good lighting."
        },
        {
          q: "How long does a transformation take?",
          a: "Most transformations complete in 15-30 seconds. During busy periods, it may take up to 60 seconds. You'll see a progress indicator while your transformation is being generated."
        },
        {
          q: "Can I download my transformed images?",
          a: "Yes! All transformations can be downloaded in high resolution. Perfect for sharing with contractors, family, or using for renovation planning."
        },
        {
          q: "What if my transformation doesn't look right?",
          a: "Try being more specific in your description. The more detailed you are about colors, materials, and styles, the better your results will be. You can also try different prompts to explore various options."
        }
      ]
    },
    {
      category: "Features & Capabilities",
      questions: [
        {
          q: "What types of exterior changes can NexVision make?",
          a: "NexVision can transform siding materials and colors, roofing, windows, doors, landscaping, architectural details, and overall home style. From modern farmhouse to contemporary, Mediterranean to craftsman - the possibilities are endless."
        },
        {
          q: "Can I transform interior spaces?",
          a: "NexVision is specifically designed and optimized for exterior home transformations. While it may work on some interior photos, our AI is trained primarily on exterior architecture and landscaping."
        },
        {
          q: "How realistic are the transformations?",
          a: "Our AI generates highly realistic transformations that respect architectural principles and maintain proper proportions. However, these are conceptual visualizations meant for inspiration and planning, not architectural blueprints."
        }
      ]
    },
    {
      category: "Usage & Best Practices",
      questions: [
        {
          q: "How should I describe my desired transformation?",
          a: "Be specific! Instead of 'make it modern,' try 'change to white board and batten siding, add black shutters, replace with a red front door, and add window boxes with flowers.' The more detail, the better the result."
        },
        {
          q: "Can I use the images commercially?",
          a: "Yes, you own the rights to your transformed images and can use them for personal or commercial purposes, including sharing with contractors, real estate listings, or renovation planning."
        },
        {
          q: "Is there a mobile app?",
          a: "NexVision works perfectly in your mobile browser! Our web app is fully responsive and optimized for mobile use. Simply visit our website on your phone or tablet."
        }
      ]
    }
  ];

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <Header showBackButton={true} />

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to know about transforming your home's exterior with NexVision AI.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-12">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for answers..."
              className="w-full px-6 py-4 pl-12 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-8">
          {faqs.map((category, categoryIndex) => (
            <div key={categoryIndex} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">{category.category}</h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {category.questions.map((faq, questionIndex) => {
                  const itemIndex = categoryIndex * 100 + questionIndex;
                  const isOpen = openItems.includes(itemIndex);
                  
                  return (
                    <div key={questionIndex}>
                      <button
                        onClick={() => toggleItem(itemIndex)}
                        className="w-full px-6 py-6 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold text-gray-900 pr-4">
                            {faq.q}
                          </h3>
                          <svg
                            className={`w-6 h-6 text-gray-500 transform transition-transform ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>
                      
                      {isOpen && (
                        <div className="px-6 pb-6">
                          <p className="text-gray-600 leading-relaxed">
                            {faq.a}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Still have questions */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
            <p className="text-lg mb-6 opacity-90">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/contact"
                className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
              >
                Contact Support
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </Link>
              <Link 
                href="/reimagine"
                className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold border border-white/30 hover:bg-white/30 transition-colors"
              >
                Try NexVision Free
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
