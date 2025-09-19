"use client";
import React, { useState, useRef } from "react";
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { BaseInput } from "@/components/ui/BaseField";
import { storeImagesForTraining } from "./utils/imageStorage";
import { correctImageOrientation, needsOrientationCorrection } from "../lib/image-orientation";

const CreditsDisplay = dynamic(() => import('./components/CreditsDisplay'), {
  ssr: false,
});

const EmailSignup = dynamic(() => import('./components/EmailSignup'), {
  ssr: false,
});

export default function Home() {
  const router = useRouter();
  const [credits, setCredits] = useState<number | null>(null);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [reimaginedImageUrl, setReimaginedImageUrl] = useState<string | null>(null);
  const [reimagineInstruction, setReimagineInstruction] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [orientationCorrected, setOrientationCorrected] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const convertHEICToJPEG = async (file: File): Promise<File> => {
    if (file.type === "image/heic" || file.type === "image/heif") {
      try {
        const heic2any = (await import('heic2any')).default;
        const convertedBlob = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.9
        });
        const jpeg = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        return new File([jpeg], file.name.replace(/\.(heic|HEIC|heif|HEIF)$/, '.jpg'), {
          type: "image/jpeg"
        });
      } catch (error) {
        console.error('HEIC conversion error:', error);
        throw new Error('Failed to convert HEIC image. Please try a different image format.');
      }
    }
    return file;
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      try {
        setSelectedImage(null);
        setPreviewUrl(null);
        setOrientationCorrected(false);

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          throw new Error('Image file is too large. Please select an image smaller than 10MB.');
        }

        console.log('📁 Processing image file:', file.name, `(${(file.size / 1024 / 1024).toFixed(1)}MB)`);

        let processedFile = await convertHEICToJPEG(file);

        try {
          console.log('🔍 Validating image content...');
          const formData = new FormData();
          formData.append('image', processedFile);

          const validationResponse = await fetch('/api/validate-image', {
            method: 'POST',
            body: formData
          });

          if (validationResponse.ok) {
            const validation = await validationResponse.json();

            if (!validation.isValid) {
              console.warn('⚠️ Image validation warning:', validation.reason);
              alert(`Warning: ${validation.reason}\n\nYou can still proceed, but results may not be optimal for non-architectural content.`);
            } else {
              console.log('✅ Image validation passed:', validation.reason);
            }
          } else {
            console.warn('⚠️ Validation service unavailable, proceeding anyway');
          }
        } catch (validationError) {
          console.warn('⚠️ Validation failed, proceeding anyway:', validationError);
        }

        const needsCorrection = await needsOrientationCorrection(processedFile);
        processedFile = await correctImageOrientation(processedFile, 0.92);
        setOrientationCorrected(needsCorrection);

        const url = URL.createObjectURL(processedFile);
        setPreviewUrl(url);
        setSelectedImage(processedFile);

        setReimaginedImageUrl(null);

      } catch (error) {
        console.error('Error processing image:', error);
        alert(error instanceof Error ? error.message : 'Failed to process image');
        setSelectedImage(null);
        setPreviewUrl(null);
        setOrientationCorrected(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage || !reimagineInstruction) {
      alert('Please select an image and enter your reimagine instruction');
      return;
    }

    try {
      setIsProcessing(true);
      setReimaginedImageUrl(null);

      const reader = new FileReader();

      const processImage = new Promise<string>((resolve, reject) => {
        reader.onloadend = async () => {
          try {
            const base64data = reader.result as string;
            const formData = new FormData();
            formData.append('prompt', reimagineInstruction);
            formData.append('imageBase64', base64data);

            const response = await fetch('/api/generate', {
              method: 'POST',
              body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || `API error: ${response.status}`);
            }

            if (!data.imageUrl) {
              throw new Error('No imageUrl in API response');
            }

            try {
              new URL(data.imageUrl);
            } catch {
              throw new Error('Invalid URL received from API');
            }

            resolve(data.imageUrl);
          } catch (error) {
            console.error('Processing error:', error);
            reject(error);
          }
        };

        reader.onerror = () => {
          reject(new Error('Failed to read the image file'));
        };
      });

      reader.readAsDataURL(selectedImage);
      const imageUrl = await processImage;

      const imgElement = document.createElement('img');

      await new Promise<void>((resolve, reject) => {
        imgElement.onload = async () => {
          setReimaginedImageUrl(imageUrl);

          if (selectedImage) {
            try {
              const userEmail = localStorage.getItem('nexvision_email') || undefined;
              await storeImagesForTraining({
                originalImage: selectedImage,
                reimaginedImageUrl: imageUrl,
                instruction: reimagineInstruction,
                userEmail: userEmail
              });
              console.log('Images stored for model training');
            } catch (error) {
              console.error('Failed to store images for training:', error);
            }
          }

          resolve();
        };
        imgElement.onerror = () => {
          reject(new Error('Failed to load the reimagined image'));
        };
        imgElement.src = imageUrl;
      });

    } catch (error) {
      console.error('Error details:', error);
      alert(error instanceof Error ? error.message : 'Failed to reimagine image. Please try again.');
      setReimaginedImageUrl(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (reimaginedImageUrl) {
      try {
        setIsDownloading(true);
        const response = await fetch(reimaginedImageUrl);

        if (!response.ok) {
          throw new Error(`Failed to download image: ${response.statusText}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        const originalName = selectedImage?.name || 'image';
        const baseName = originalName.replace(/\.[^/.]+$/, '');
        const transformationType = reimagineInstruction.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .slice(0, 30);

        a.download = `${baseName}-${transformationType}.jpg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error('Download failed:', error);
        alert('Failed to download image. Please try again or right-click and save the image directly.');
      } finally {
        setIsDownloading(false);
      }
    }
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Header with Credits */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/nexvision-logo.png"
              alt="NexVision Logo"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <span className="text-xl font-bold text-gray-800">NexVision</span>
          </Link>
          <CreditsDisplay onCreditsUpdate={setCredits} />
        </div>
      </header>
      {/* Hero Section */}
      <section className="relative w-full min-h-screen flex items-center justify-center px-4 py-20 pt-24">
        {/* Background with image and gradient overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: 'url("/hero-bg.jpg")',
          }}
        />
        <div className="absolute inset-0 bg-black/50 z-10" />
        
        {/* Content */}
        <div className="relative z-20 text-center w-full max-w-4xl">
          {/* Logo */}
          <div className="mb-6 px-4">
            <Image
              src="/nexvision-logo.png"
              alt="NexVision Logo"
              width={240}
              height={240}
              priority
              className="mx-auto w-full max-w-[240px] h-auto"
            />
          </div>

          {/* Hero Text */}
          <div className="mb-8 px-4">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
              Upload. Describe. Transform.
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-3xl mx-auto mb-6">
              Simply upload a photo of your home and describe the changes you want. Our AI will instantly transform your exterior with professional-quality results.
            </p>
            
            {/* Value Props */}
            <div className="flex flex-wrap justify-center gap-4 mb-8 text-white/80">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm md:text-base">Instant Results</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm md:text-base">3 Free Tries</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm md:text-base">No Sign-up Required</span>
              </div>
            </div>
          </div>

          {/* Reimagine Component */}
          <div className="w-full max-w-5xl mx-auto">
          {!previewUrl ? (
            // Initial Upload State
            <div className="max-w-xl mx-auto">
              <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/20">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-6 text-center">
                  Upload Your Home Photo
                </h1>
                <p className="text-white/80 text-center mb-8">
                  Choose a photo of your home to reimagine its appearance
                </p>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  aria-label="Upload or take a photo"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2
                           bg-[#FF7F50] text-white px-6 py-4 rounded-xl text-lg font-semibold
                           hover:bg-[#FF6B3D] active:bg-[#FF5B2D] transition-all duration-200
                           focus:outline-none focus:ring-4 focus:ring-[#FF7F50]/50
                           shadow-lg hover:shadow-xl"
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
                  Upload a Photo
                </button>
              </div>
            </div>
          ) : (
            // Preview and Edit State
            <div className="flex flex-col items-center space-y-8">
              {/* Image Comparison Section */}
              <div className="w-full bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-6 md:p-8 border border-white/20">
                <div className="flex flex-col md:flex-row md:items-stretch gap-4 md:gap-6">
                  {/* Original Image */}
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg mb-3 text-center">Original</h3>
                    <div className="aspect-square w-full relative rounded-xl overflow-hidden bg-black/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt="Original"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {selectedImage && (
                      <div className="mt-3 p-3 rounded-lg text-center text-sm font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                        <div className="flex items-center justify-center gap-2">
                          <span>✅</span>
                          <span>Image ready for transformation</span>
                        </div>
                      </div>
                    )}

                    {orientationCorrected && (
                      <div className="mt-2 p-2 rounded-lg text-center text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        <div className="flex items-center justify-center gap-2">
                          <span>🔄</span>
                          <span>Mobile photo orientation corrected</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reimagined Image */}
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg mb-3 text-center">Reimagined</h3>
                    <div className="aspect-square w-full relative rounded-xl overflow-hidden bg-black/30">
                      {reimaginedImageUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={reimaginedImageUrl}
                            alt="Reimagined"
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="absolute top-3 right-3 p-2 bg-white/20 hover:bg-white/30
                                     backdrop-blur-md rounded-lg transition-all duration-200
                                     text-white hover:scale-105 focus:outline-none
                                     focus:ring-2 focus:ring-white/50
                                     disabled:opacity-50 disabled:cursor-not-allowed
                                     disabled:hover:scale-100"
                            title={isDownloading ? "Downloading..." : "Download reimagined image"}
                          >
                            {isDownloading ? (
                              <svg
                                className="w-6 h-6 animate-spin"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                            ) : (
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
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                />
                              </svg>
                            )}
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-white/20">
                          <p className="text-white/60 text-center px-4 text-sm md:text-base">
                            Enter your reimagine instruction below
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {reimaginedImageUrl && (
                <div className="w-full max-w-2xl mx-auto mb-8">
                  <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 text-center">
                    <h3 className="text-white font-bold text-xl mb-4">
                      🎉 Your Transformation is Ready!
                    </h3>
                    <p className="text-white/80 mb-6">
                      Download your reimagined home exterior and share it with friends, family, or contractors.
                    </p>
                    <button
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="inline-flex items-center gap-3 bg-green-600 hover:bg-green-700
                               text-white px-8 py-4 rounded-xl text-lg font-semibold
                               transition-all duration-200 transform hover:-translate-y-1
                               hover:shadow-lg active:translate-y-0 active:shadow-md
                               disabled:opacity-50 disabled:cursor-not-allowed
                               disabled:hover:translate-y-0 disabled:hover:shadow-none
                               focus:outline-none focus:ring-4 focus:ring-green-500/50"
                    >
                      {isDownloading ? (
                        <>
                          <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                          </svg>
                          Downloading...
                        </>
                      ) : (
                        <>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download High-Quality Image
                        </>
                      )}
                    </button>
                    <p className="text-white/60 text-sm mt-3">
                      Perfect for sharing, printing, or planning your renovation
                    </p>
                  </div>
                </div>
              )}

              <form
                className="w-full max-w-2xl mx-auto"
                onSubmit={handleSubmit}
              >
                <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                  <label
                    htmlFor="reimagine-instruction"
                    className="block text-white font-semibold mb-3 text-lg text-center"
                  >
                    How would you like to reimagine your home?
                  </label>
                  <BaseInput
                    id="reimagine-instruction"
                    type="text"
                    placeholder="e.g. Change the exterior to modern farmhouse style"
                    value={reimagineInstruction}
                    onChange={(e) => setReimagineInstruction(e.target.value)}
                    className="mb-4 bg-white/10 border-white/20 text-white placeholder-white/70 focus:ring-[#FF7F50]/60"
                  />
                  <button
                    type="submit"
                    disabled={isProcessing || !selectedImage || !reimagineInstruction.trim()}
                    className={`w-full md:max-w-xs mx-auto block px-8 py-4 rounded-xl font-semibold text-lg
                              transition-all duration-200 transform hover:-translate-y-1
                              active:translate-y-0 shadow-lg hover:shadow-xl
                              ${isProcessing || !selectedImage || !reimagineInstruction.trim()
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-[#FF7F50] hover:bg-[#FF6B3D] text-white'}`}
                  >
                    {isProcessing ? (
                      <div className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Reimagining...
                      </div>
                    ) : "Reimagine"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
        </div>
      </section>

      {/* Email Signup Section */}
      <section className="py-16 bg-white">
        <div className="max-w-2xl mx-auto px-4">
          <EmailSignup 
            onEmailSubmit={(email) => {
              console.log('Email submitted:', email);
              // You can add additional logic here, like updating credits
              setCredits(3);
            }}
          />
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose NexVision for Exterior Transformations?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Professional-grade AI that understands architecture, landscaping, and exterior design principles
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Lightning Fast</h3>
              <p className="text-gray-600">See your home&apos;s potential in under 30 seconds. Perfect for planning renovations or selling.</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Boost Curb Appeal</h3>
              <p className="text-gray-600">Transform siding, roofing, landscaping, and more. Increase your home&apos;s value and appeal.</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Multiple Styles</h3>
              <p className="text-gray-600">Modern, traditional, farmhouse, contemporary - explore any architectural style instantly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Start free, upgrade when you need more transformations
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div className="border-2 border-gray-200 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Free Trial</h3>
              <div className="text-4xl font-bold text-gray-900 mb-4">$0</div>
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>3 free transformations</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>High-quality results</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>No signup required</span>
                </li>
              </ul>
              <button 
                onClick={() => router.push('/reimagine')}
                className="w-full py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:border-gray-400 transition-colors"
              >
                Start Free
              </button>
            </div>
            
            <div className="border-2 border-blue-500 rounded-2xl p-8 text-center relative bg-blue-50">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro Plan</h3>
              <div className="text-4xl font-bold text-gray-900 mb-4">$9.99</div>
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>50 transformations</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Priority processing</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Email support</span>
                </li>
              </ul>
              <button className="w-full py-3 px-6 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors">
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">NexVision</h3>
              <p className="text-gray-400">
                Transform your home&apos;s exterior with AI-powered design. Professional curb appeal results in seconds.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/how-it-works" className="hover:text-white transition-colors">How it works</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/examples" className="hover:text-white transition-colors">Examples</Link></li>
                <li><Link href="/gemini" className="hover:text-white transition-colors">Gemini (Image-to-Image)</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/faq" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 NexVision. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}