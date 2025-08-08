'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative w-8 h-8">
            <Image
              src="/nexvision-logo.png"
              alt="NexVision"
              fill
              sizes="32px"
              priority
              className="object-contain"
            />
          </div>
          <span className="font-semibold text-gray-900">NexVision</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className={`px-4 py-2 rounded-lg transition-colors ${
              pathname === '/'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Home
          </Link>
          <Link
            href="/reimagine"
            className={`px-4 py-2 rounded-lg transition-colors ${
              pathname === '/reimagine'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Reimagine
          </Link>
        </div>
      </div>
    </nav>
  );
} 