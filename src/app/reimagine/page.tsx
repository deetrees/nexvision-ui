'use client';

import React, { useRef, useState } from "react";
import Image from 'next/image';

export default function ReimaginePage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [reimaginedImageUrl, setReimaginedImageUrl] = useState<string | null>(null);
  const [reimagineInstruction, setReimagineInstruction] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
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
        const processedFile = await convertHEICToJPEG(file);
        setSelectedImage(processedFile);
        const url = URL.createObjectURL(processedFile);
        setPreviewUrl(url);
        setReimaginedImageUrl(null);
      } catch (error) {
        console.error('Error processing image:', error);
        alert(error instanceof Error ? error.message : 'Failed to process image');
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
        imgElement.onload = () => {
          setReimaginedImageUrl(imageUrl);
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
    <main className="min-h-screen flex flex-col">
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
        style={{ 
          backgroundImage: 'url("/hero-bg.jpg")',
        }}
      />
      <div className="fixed inset-0 bg-black/60" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-16">
        <div className="w-full max-w-5xl mx-auto">
          {!previewUrl ? (
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
            <div className="flex flex-col items-center space-y-8">
              <div className="w-full bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-6 md:p-8 border border-white/20">
                <div className="flex flex-col md:flex-row md:items-stretch gap-4 md:gap-6">
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg mb-3 text-center">Original</h3>
                    <div className="aspect-square w-full relative rounded-xl overflow-hidden bg-black/30">
                      <img
                        src={previewUrl}
                        alt="Original"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg mb-3 text-center">Reimagined</h3>
                    <div className="aspect-square w-full relative rounded-xl overflow-hidden bg-black/30">
                      {reimaginedImageUrl ? (
                        <>
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
                    disabled={isProcessing}
                    className={`w-full md:max-w-xs mx-auto block px-8 py-4 rounded-xl font-semibold text-lg
                              transition-all duration-200 transform hover:-translate-y-1
                              active:translate-y-0 shadow-lg hover:shadow-xl
                              ${isProcessing 
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
    </main>
  );
}
