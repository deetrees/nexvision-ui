'use client';

import React, { useRef, useState } from "react";
import Image from "next/image";
import Header from "../components/Header";
import { storeImagesForTraining } from "../utils/imageStorage";
import { correctImageOrientation, needsOrientationCorrection } from "../../lib/image-orientation";

// Image Gate Types
interface ImageGateResponse {
  success: boolean;
  approved: boolean;
  reasons: string[];
  analysis: {
    moderationLabels?: Array<{ Name?: string; Confidence?: number }>;
    faces?: Array<{ BoundingBox?: object }>;
    text?: Array<{ DetectedText?: string; Confidence?: number }>;
    labels?: Array<{ Name?: string; Confidence?: number }>;
  };
  metadata: {
    filename: string;
    size: number;
    type: string;
  };
}

export default function ReimaginePage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [reimaginedImageUrl, setReimaginedImageUrl] = useState<string | null>(null);
  const [reimagineInstruction, setReimagineInstruction] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isValidatingImage, setIsValidatingImage] = useState(false);
  const [validationStep, setValidationStep] = useState<string>('');
  const [orientationCorrected, setOrientationCorrected] = useState<boolean>(false);
  const [imageValidation, setImageValidation] = useState<ImageGateResponse | null>(null);
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
        setIsValidatingImage(true);
        setValidationStep('Preparing image...');
        setImageValidation(null);
        setSelectedImage(null);
        setPreviewUrl(null);
        setOrientationCorrected(false);
        
        // Check file size (limit to 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          throw new Error('Image file is too large. Please select an image smaller than 10MB.');
        }
        
        console.log('📁 Processing image file:', file.name, `(${(file.size / 1024 / 1024).toFixed(1)}MB)`);
        
        // Step 1: Convert HEIC to JPEG if needed
        setValidationStep('Converting image format...');
        let processedFile = await convertHEICToJPEG(file);
        
        // Step 2: Correct image orientation (fix mobile photo rotation)
        setValidationStep('Correcting image orientation...');
        const needsCorrection = await needsOrientationCorrection(processedFile);
        processedFile = await correctImageOrientation(processedFile, 0.92);
        setOrientationCorrected(needsCorrection);
        
        // Create preview immediately while validation runs
        const url = URL.createObjectURL(processedFile);
        setPreviewUrl(url);
        setSelectedImage(processedFile);
        
        // Step 3: Validate architectural content in parallel
        setValidationStep('Analyzing architectural content...');
        console.log('🔍 Validating architectural content...');
        const validationStart = Date.now();
        
        const validation = await validateArchitecturalImage(processedFile);
        
        const validationTime = Date.now() - validationStart;
        console.log(`⏱️ Validation completed in ${validationTime}ms`);
        
        setImageValidation(validation);
        
        if (!validation.approved) {
          console.log('⚠️ Non-architectural content detected:', validation.reasons[0]);
        } else {
          console.log('✅ Architectural content validated:', validation.reasons[0]);
        }
        
        setReimaginedImageUrl(null);
        
      } catch (error) {
        console.error('Error processing image:', error);
        alert(error instanceof Error ? error.message : 'Failed to process image');
        // Reset states on error
        setSelectedImage(null);
        setPreviewUrl(null);
        setImageValidation(null);
        setOrientationCorrected(false);
      } finally {
        setIsValidatingImage(false);
        setValidationStep('');
      }
    }
  };

  // Image Gate validation function
  const validateArchitecturalImage = async (file: File): Promise<ImageGateResponse> => {
    // Compress image if it's too large for faster upload
    let imageToValidate = file;
    
    if (file.size > 2 * 1024 * 1024) { // If larger than 2MB, compress
      console.log('🗜️ Compressing large image for faster validation...');
      imageToValidate = await compressImage(file, 0.7); // 70% quality
    }
    
    const formData = new FormData();
    formData.append('image', imageToValidate);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const response = await fetch('/api/image-gate', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Architectural validation failed');
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Image validation timed out. Please try with a smaller image.');
      }
      throw error;
    }
  };

  // Helper function to compress images (now works with orientation-corrected images)
  const compressImage = (file: File, quality: number): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions (max 1200px on longest side)
        const maxSize = 1200;
        let { width, height } = img;
        
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Image is already orientation-corrected, so just draw normally
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            console.log(`📉 Compressed from ${(file.size / 1024 / 1024).toFixed(1)}MB to ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB`);
            resolve(compressedFile);
          } else {
            resolve(file); // Fallback to original if compression fails
          }
        }, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage || !reimagineInstruction) {
      alert('Please select an image and enter your reimagine instruction');
      return;
    }

    // Check architectural validation - reject non-architectural content
    if (imageValidation && !imageValidation.approved) {
      alert(
        `❌ Non-Architectural Content Detected\n\n` +
        `${imageValidation.reasons.join('\n')}\n\n` +
        `This app is exclusively for architectural content. Please upload images of:\n` +
        `• Houses and buildings (exteriors)\n` +
        `• Rooms and interior spaces\n` +
        `• Architectural details and features\n\n` +
        `Please select a different image.`
      );
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
            const response = await fetch('/api/edit', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                imageUrl: base64data,
                prompt: reimagineInstruction,
              }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || `API error: ${response.status}`);
            }

            if (!data.result) {
              throw new Error('No result URL in API response');
            }

            try {
              new URL(data.result);
            } catch {
              throw new Error('Invalid URL received from API');
            }

            resolve(data.result);
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
          
          // Store images for model training (don't block the UI)
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
              // Don't show error to user as this is background functionality
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
        
        // Create a filename based on original image name and transformation
        const originalName = selectedImage?.name || 'image';
        const baseName = originalName.replace(/\.[^/.]+$/, ''); // Remove extension
        const transformationType = reimagineInstruction.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-') // Replace special chars with hyphens
          .slice(0, 30); // Limit length
        
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
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <Header showBackButton={true} className="relative z-50" />
      
      {/* Background with image and gradient overlay */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
        style={{ 
          backgroundImage: 'url("/hero-bg.jpg")',
        }}
      />
      <div className="fixed inset-0 bg-black/60" />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-16">
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
                    
                    {/* Validation Status */}
                    {imageValidation && (
                      <div className={`mt-3 p-3 rounded-lg text-center text-sm font-medium ${
                        imageValidation.approved 
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}>
                        {imageValidation.approved ? (
                          <div className="flex items-center justify-center gap-2">
                            <span>✅</span>
                            <span>Architectural content verified</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <span>❌</span>
                            <span>Non-architectural content detected</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Orientation Correction Status */}
                    {orientationCorrected && (
                      <div className="mt-2 p-2 rounded-lg text-center text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        <div className="flex items-center justify-center gap-2">
                          <span>🔄</span>
                          <span>Mobile photo orientation corrected</span>
                        </div>
                      </div>
                    )}
                    
                    {isValidatingImage && (
                      <div className="mt-3 p-3 rounded-lg text-center text-sm font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full"></div>
                          <span>{validationStep || 'Processing...'}</span>
                        </div>
                        <div className="text-xs text-blue-200 mt-1 opacity-75">
                          This usually takes 2-5 seconds
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

              {/* Download Section */}
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

              {/* Reimagine Form */}
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
                  <input
                    id="reimagine-instruction"
                    type="text"
                    placeholder="e.g. Change the exterior to modern farmhouse style"
                    value={reimagineInstruction}
                    onChange={(e) => setReimagineInstruction(e.target.value)}
                    className="w-full px-4 py-4 rounded-xl text-base md:text-lg 
                             bg-white/10 border-2 border-white/20 mb-4 
                             text-white placeholder-white/50
                             focus:border-[#FF7F50] focus:ring-4 focus:ring-[#FF7F50]/20 
                             transition-all duration-200"
                  />
                  <button
                    type="submit"
                    disabled={isProcessing || (imageValidation && !imageValidation.approved)}
                    className={`w-full md:max-w-xs mx-auto block px-8 py-4 rounded-xl font-semibold text-lg
                              transition-all duration-200 transform hover:-translate-y-1
                              active:translate-y-0 shadow-lg hover:shadow-xl
                              ${isProcessing || (imageValidation && !imageValidation.approved)
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
                    ) : (imageValidation && !imageValidation.approved) ? "Upload Architectural Content Only" : "Reimagine"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 