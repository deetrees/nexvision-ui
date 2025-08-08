"use client";
import React from "react";
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import the SafeSlider with SSR disabled
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
      {/* Hero Section */}
      <section className="relative w-full min-h-[80vh] md:min-h-[90vh] flex items-center justify-center px-4 py-8">
        {/* Background with image and gradient overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: 'url("/hero-bg.jpg")',
          }}
        />
        <div className="absolute inset-0 bg-black/50 z-10" /> {/* Darker overlay for better text contrast */}
        
        {/* Content */}
        <div className="relative z-20 text-center w-full max-w-3xl">
          {/* Logo */}
          <div className="mb-8 px-8">
            <Image
              src="/nexvision-logo.png"
              alt="NexVision Logo"
              width={280}
              height={280}
              priority
              className="mx-auto w-full max-w-[280px] h-auto"
            />
          </div>

          {/* Hero Text */}
          <div className="mb-8 px-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
              Reimagine Your Reality
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl text-white/90 font-medium leading-relaxed max-w-2xl mx-auto">
              Experience the magic of instant home makeovers—just upload, describe, and reimagine!
            </p>
          </div>

          {/* Image Comparison Slider */}
          <div className="mb-12 -mx-8 sm:-mx-12 md:-mx-16 lg:-mx-24 overflow-hidden shadow-2xl">
            <SafeSlider
              leftImage="/home-demo-after.jpg"
              rightImage="/home-demo-before.jpg"
            />
          </div>

          {/* CTA Button */}
          <button
            onClick={() => router.push('/reimagine')}
            className="w-full max-w-[280px] mx-auto flex items-center justify-center gap-2 
                     bg-[#FF7F50] text-white px-8 py-4 rounded-2xl text-xl font-semibold 
                     hover:bg-[#FF6B3D] active:bg-[#FF5B2D] transition-all duration-200 
                     transform hover:-translate-y-1 hover:shadow-lg 
                     active:translate-y-0 active:shadow-md
                     focus:outline-none focus:ring-4 focus:ring-[#FF7F50]/50"
          >
            <svg 
              className="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M3 16l4 4m0 0l4-4m-4 4V8m11 4h3m-3 4h3m-3-4h3M3 12h3m-3 4h3m-3-4h3" 
              />
            </svg>
            Reimagine a Photo
          </button>
        </div>
      </section>
    </main>
  );
}
