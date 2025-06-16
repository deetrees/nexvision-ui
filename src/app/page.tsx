"use client";

import React from "react";
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const SafeSlider = dynamic(() => import('./components/SafeSlider'), {
  ssr: false,
  loading: () => (
    <div className="aspect-[3/2] w-full bg-gray-100 animate-pulse rounded-lg" />
  ),
});

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-white">
      <section className="relative w-full min-h-[80vh] md:min-h-[90vh] flex items-center justify-center px-4 py-8">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: 'url("/hero-bg.jpg")',
          }}
        />
        <div className="absolute inset-0 bg-black/50 z-10" />
        
        <div className="relative z-20 text-center w-full max-w-3xl">
          <div className="mb-8 px-8">
            <Image
              src="/nexvision-logo.png"
              alt="NexVision Logo"
              width={120}
              height={120}
              className="mx-auto mb-6"
              priority
            />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Reimagine Your Home with AI
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
            Transform your living space with cutting-edge AI technology. 
            Upload a photo and watch your vision come to life.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => router.push('/reimagine')}
              className="bg-[#FF7F50] text-white px-8 py-4 rounded-xl text-lg font-semibold 
                       hover:bg-[#FF6B3D] active:bg-[#FF5B2D] transition-all duration-200 
                       transform hover:-translate-y-1 active:translate-y-0
                       shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#FF7F50]/50"
            >
              Start Reimagining
            </button>
            
            <button
              onClick={() => {
                const demoSection = document.getElementById('demo-section');
                demoSection?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-white/90 hover:text-white px-6 py-3 rounded-lg border border-white/30 
                       hover:border-white/50 transition-all duration-200 text-lg font-medium"
            >
              See Demo
            </button>
          </div>
        </div>
      </section>

      <section id="demo-section" className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              See the Magic in Action
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience the power of AI-driven home transformation. 
              Drag the slider to see before and after results.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <SafeSlider 
              leftImage="/home-demo-after.jpg"
              rightImage="/home-demo-before.jpg"
            />
          </div>
          
          <div className="text-center mt-12">
            <button
              onClick={() => router.push('/reimagine')}
              className="bg-[#FF7F50] text-white px-8 py-4 rounded-xl text-lg font-semibold 
                       hover:bg-[#FF6B3D] active:bg-[#FF5B2D] transition-all duration-200 
                       transform hover:-translate-y-1 active:translate-y-0
                       shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#FF7F50]/50"
            >
              Try It Yourself
            </button>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#FF7F50] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4 4m0 0l4-4m-4 4V8" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Your Photo</h3>
              <p className="text-gray-600">
                Simply upload a photo of your home's interior or exterior
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-[#FF7F50] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Describe Your Vision</h3>
              <p className="text-gray-600">
                Tell our AI what changes you'd like to see in your space
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-[#FF7F50] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Get Instant Results</h3>
              <p className="text-gray-600">
                Watch as AI transforms your space in seconds with stunning realism
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
