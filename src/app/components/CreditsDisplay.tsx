'use client';
import { useState, useEffect } from 'react';
import { featureFlags } from '../config/features';

interface CreditsDisplayProps {
  userId?: string;
  onCreditsUpdate?: (credits: number) => void;
}

export default function CreditsDisplay({ userId = 'anonymous', onCreditsUpdate }: CreditsDisplayProps) {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (featureFlags.enableCredits) {
      fetchCredits();
    } else {
      setLoading(false);
      // Set unlimited credits for development
      setCredits(999);
      onCreditsUpdate?.(999);
    }
  }, [userId]);

  const fetchCredits = async () => {
    try {
      const response = await fetch(`/api/credits?userId=${userId}`);
      const data = await response.json();
      setCredits(data.credits);
      onCreditsUpdate?.(data.credits);
    } catch (error) {
      console.error('Failed to fetch credits:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render anything if credits are disabled
  if (!featureFlags.enableCredits) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      <span className="font-semibold text-gray-800">
        {credits} credits remaining
      </span>
      {credits === 0 && (
        <button className="ml-2 px-3 py-1 bg-blue-500 text-white text-sm rounded-full hover:bg-blue-600 transition-colors">
          Upgrade
        </button>
      )}
    </div>
  );
}
