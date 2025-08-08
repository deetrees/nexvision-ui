'use client';

import React, { useEffect, useRef, useState } from 'react';

interface SafeSliderProps {
  leftImage: string;
  rightImage: string;
}

export default function SafeSlider({ leftImage, rightImage }: SafeSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Check if touch events are supported
    setIsTouchDevice(typeof TouchEvent !== 'undefined' && 'ontouchstart' in window);
  }, []);

  const updateSliderPosition = (clientX: number) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    setSliderPosition(percentage);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isTouchDevice) {
      setIsDragging(true);
      updateSliderPosition(e.clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && !isTouchDevice) {
      updateSliderPosition(e.clientX);
    }
  };

  const handleMouseUp = () => {
    if (!isTouchDevice) {
      setIsDragging(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTouchDevice) {
      setIsDragging(true);
      updateSliderPosition(e.touches[0].clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && isTouchDevice) {
      updateSliderPosition(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    if (isTouchDevice) {
      setIsDragging(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[3/2] select-none overflow-hidden rounded-lg"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Right Image (Original) */}
      <div className="absolute inset-0">
        <img
          src={rightImage}
          alt="Original"
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 right-4 bg-black/30 text-white px-3 py-1 rounded-lg font-semibold text-sm backdrop-blur-sm">
          Original
        </div>
      </div>

      {/* Left Image (Reimagined) with clip-path */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
        }}
      >
        <img
          src={leftImage}
          alt="Reimagined"
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 left-4 bg-black/30 text-white px-3 py-1 rounded-lg font-semibold text-sm backdrop-blur-sm">
          Reimagined
        </div>
      </div>

      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize transform -translate-x-1/2"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
          <div className="w-6 h-6 text-gray-600 select-none">⟷</div>
        </div>
      </div>
    </div>
  );
} 