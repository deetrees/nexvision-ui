'use client';

import React, { useRef, useEffect, useState } from 'react';
import Header from '../components/Header';

export default function ARPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [nightMode, setNightMode] = useState(false);

  useEffect(() => {
    async function getCameraStream() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing camera: ', err);
        alert('Could not access the camera. Please ensure you have given permission.');
      }
    }

    getCameraStream();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <main className="min-h-screen flex flex-col bg-gray-900 text-white">
      <Header showBackButton={true} className="relative z-50" />
      
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        <h1 className="text-3xl font-bold mb-4">AR Preview</h1>
        
        <div className="relative w-full max-w-4xl aspect-video rounded-lg overflow-hidden shadow-2xl bg-black">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className={`w-full h-full object-cover transition-all duration-500 ${nightMode ? 'filter brightness-50 contrast-125' : ''}`}
          />
          <div className="absolute inset-0 bg-black bg-opacity-20 pointer-events-none"></div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4">
          <p className="text-lg">Toggle the dusk/night filter to preview your lights.</p>
          <button 
            onClick={() => setNightMode(!nightMode)}
            className="btn btn-lg btn-primary glass"
          >
            {nightMode ? '☀️ Day Mode' : '🌙 Night Mode'}
          </button>
        </div>
      </div>
    </main>
  );
}
