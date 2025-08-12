"use client";
import React, { useState } from 'react';
import { featureFlags } from '../config/features';

interface EmailSignupProps {
  onEmailSubmit?: (email: string) => void;
  className?: string;
}

export default function EmailSignup({ onEmailSubmit, className = "" }: EmailSignupProps) {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Hide email signup if disabled
  if (!featureFlags.enableEmailSignup) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    
    try {
      // Here you would typically send the email to your backend
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsSubmitted(true);
      if (onEmailSubmit) {
        onEmailSubmit(email);
      }
      
      // Store email in localStorage for now (you'd want to use a proper backend)
      localStorage.setItem('nexvision_email', email);
      localStorage.setItem('nexvision_free_credits', '3');
      
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-2xl p-8 text-center ${className}`}>
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-green-800 mb-2">Welcome to NexVision!</h3>
        <p className="text-green-700 mb-4">
          You've been granted <strong>3 free credits</strong> to transform your home's exterior.
        </p>
        <p className="text-green-600 text-sm">
          Start creating amazing exterior transformations right away!
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8 ${className}`}>
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 0v1m-2 0V6a2 2 0 00-2 0v1m2 0V9.5m0 0v-2A2 2 0 00 9.5 6h-1A2 2 0 00 6.5 7.5v2m5 0v2a2 2 0 01-2 2H8a2 2 0 01-2-2v-2m5 0H9.5a2 2 0 00-2 2v2a2 2 0 002 2h1a2 2 0 002-2V9.5a2 2 0 00-2-2z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Get 3 Free Credits</h3>
        <p className="text-gray-600">
          Enter your email to unlock 3 free exterior transformations and see what your home could look like!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            disabled={isLoading}
            required
          />
          {error && (
            <p className="text-red-600 text-sm mt-2">{error}</p>
          )}
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl text-lg font-semibold 
                   hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 
                   disabled:opacity-50 disabled:cursor-not-allowed
                   focus:outline-none focus:ring-4 focus:ring-blue-500/50"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </div>
          ) : (
            'Claim My 3 Free Credits'
          )}
        </button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          No spam, ever. We'll only send you updates about NexVision.
        </p>
      </div>
    </div>
  );
}
