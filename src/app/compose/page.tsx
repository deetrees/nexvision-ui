'use client';

import React, { useRef, useState } from "react";
import { BaseTextarea } from "@/components/ui/BaseField";
import Header from "../components/Header";
import HolidayGlow from "../components/HolidayGlow";
import { correctImageOrientation } from "../../lib/image-orientation";

// Predefined roles for image ingredients
const IMAGE_ROLES = [
  { id: 'person', label: 'Person/Model', icon: '👤', description: 'The main subject or person in the composition' },
  { id: 'clothing', label: 'Clothing/Garment', icon: '👕', description: 'T-shirt, dress, jacket, or other clothing items' },
  { id: 'pattern', label: 'Pattern/Design', icon: '🎨', description: 'Textures, patterns, or designs to apply' },
  { id: 'background', label: 'Background/Scene', icon: '🏞️', description: 'Environment or background setting' },
  { id: 'accessory', label: 'Accessory/Detail', icon: '💎', description: 'Additional elements like jewelry, props, etc.' }
];

// Preset composition ideas
const PRESET_PROMPTS = [
  "A girl wearing a t-shirt with this pattern in a casual style",
  "Apply this design pattern to the clothing item on the person",
  "Combine these elements into a fashionable outfit composition",
  "Create a stylish look using the pattern on the garment",
  "Merge the design with the clothing to create a trendy appearance",
  "Style the person with the patterned clothing in this setting"
];

interface ImageIngredient {
  id: string;
  file: File;
  role: string;
  preview: string;
  name: string;
}

interface CompositionResult {
  url?: string;
  b64_json?: string;
  cached?: boolean;
  model?: string;
  seed?: number;
  composition_info?: {
    images_used: number;
    roles: string[];
    primary_model: string;
    fallback_used?: string;
  };
}

export default function ComposePage() {
  const [images, setImages] = useState<ImageIngredient[]>([]);
  const [prompt, setPrompt] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<CompositionResult | null>(null);
  const [width, setWidth] = useState<number>(1024);
  const [height, setHeight] = useState<number>(1024);
  const [holidayGlow, setHolidayGlow] = useState(false);
  
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleImageUpload = async (roleId: string, file: File) => {
    try {
      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('Image file is too large. Please select an image smaller than 10MB.');
        return;
      }

      // Apply EXIF orientation correction
      const correctedFile = await correctImageOrientation(file, 0.95);
      
      const preview = URL.createObjectURL(correctedFile);
      const imageId = `${roleId}-${Date.now()}`;
      
      const newImage: ImageIngredient = {
        id: imageId,
        file: correctedFile,
        role: roleId,
        preview,
        name: file.name
      };

      // Remove existing image with same role (only one per role)
      setImages(prev => prev.filter(img => img.role !== roleId).concat(newImage));
      setResult(null);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try again.');
    }
  };

  const removeImage = (imageId: string) => {
    setImages(prev => {
      const imageToRemove = prev.find(img => img.id === imageId);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return prev.filter(img => img.id !== imageId);
    });
  };

  const handleCompose = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      alert('Please enter a composition prompt');
      return;
    }

    if (images.length === 0) {
      alert('Please upload at least one reference image');
      return;
    }

    try {
      setIsProcessing(true);
      setResult(null);

      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('width', width.toString());
      formData.append('height', height.toString());
      
      // Add the first image as reference (Gemini works best with one reference image)
      if (images.length > 0) {
        formData.append('image', images[0].file);
      }

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `API error: ${response.status}`);
      }

      if (!data.data || data.data.length === 0) {
        throw new Error('No composition generated');
      }

      setResult({
        url: data.imageUrl,
        model: 'gemini-2.5-flash-image-preview',
        composition_info: {
          images_used: images.length,
          roles: images.map(img => img.role),
          primary_model: 'Gemini'
        }
      });
    } catch (error) {
      console.error('Composition error:', error);
      alert(error instanceof Error ? error.message : 'Failed to create composition. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!result?.url) return;

    try {
      const response = await fetch(result.url);
      if (!response.ok) throw new Error('Failed to download');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `composition-${result.model}-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download image. Please try again.');
    }
  };

  const selectPresetPrompt = (presetPrompt: string) => {
    setPrompt(presetPrompt);
  };

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header showBackButton={true} className="relative z-50" />
      
      <div className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            🎨 Image Composition Studio
          </h1>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto">
            Upload multiple images and describe how you want them combined. Perfect for creating outfits, applying patterns, or merging design elements.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Panel - Image Ingredients */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                📸 Image Ingredients
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload images for different roles. Each role represents a different element in your composition.
              </p>
              
              <div className="space-y-4">
                {IMAGE_ROLES.map((role) => {
                  const existingImage = images.find(img => img.role === role.id);
                  
                  return (
                    <div key={role.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{role.icon}</span>
                          <span className="font-medium text-gray-900">{role.label}</span>
                        </div>
                        {existingImage && (
                          <button
                            onClick={() => removeImage(existingImage.id)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-500 mb-3">{role.description}</p>
                      
                      {existingImage ? (
                        <div className="relative">
                          <img
                            src={existingImage.preview}
                            alt={`${role.label} preview`}
                            className="w-full h-24 object-cover rounded border"
                          />
                          <div className="absolute top-1 right-1 bg-green-500 text-white px-1 py-0.5 rounded text-xs">
                            ✓
                          </div>
                        </div>
                      ) : (
                        <>
                          <input
                            type="file"
                            accept="image/*"
                            ref={(el) => { fileInputRefs.current[role.id] = el; }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(role.id, file);
                            }}
                            className="hidden"
                          />
                          <button
                            onClick={() => fileInputRefs.current[role.id]?.click()}
                            className="w-full h-24 border-2 border-dashed border-gray-300 rounded hover:border-blue-400 transition-colors flex items-center justify-center text-gray-500 hover:text-gray-700"
                          >
                            <span className="text-sm">Click to upload</span>
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Middle Panel - Controls */}
          <div className="lg:col-span-1 space-y-6">
            <HolidayGlow
              prompt={prompt}
              setPrompt={setPrompt}
              holidayGlow={holidayGlow}
              setHolidayGlow={setHolidayGlow}
            />
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                ✍️ Composition Prompt
              </h3>

              {/* Prompt Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Describe your composition
                </label>
                <BaseTextarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe how you want the uploaded images combined..."
                  className="resize-none"
                  rows={4}
                  maxLength={2000}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {prompt.length}/2000 characters
                </div>
              </div>

              {/* Preset Prompts */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Ideas
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {PRESET_PROMPTS.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => selectPresetPrompt(preset)}
                      className="text-left p-3 text-sm bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size Settings */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Width
                  </label>
                  <select
                    value={width}
                    onChange={(e) => setWidth(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={512}>512px</option>
                    <option value={768}>768px</option>
                    <option value={1024}>1024px</option>
                    <option value={1536}>1536px</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height
                  </label>
                  <select
                    value={height}
                    onChange={(e) => setHeight(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={512}>512px</option>
                    <option value={768}>768px</option>
                    <option value={1024}>1024px</option>
                    <option value={1536}>1536px</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-2">
                <button
                  onClick={handleCompose}
                  disabled={isProcessing || !prompt.trim() || images.length === 0}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-4 rounded-lg transition-colors"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                      Creating Composition...
                    </div>
                  ) : (
                    '🎨 Create Composition'
                  )}
                </button>
                <a href="/ar" className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-4 rounded-lg transition-colors flex items-center justify-center">
                  📷 AR Preview
                </a>
              </div>
            </div>
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Result</h3>
              
              {result ? (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={result.url || `data:image/jpeg;base64,${result.b64_json}`}
                      alt="Composition result"
                      className="w-full rounded-lg shadow-md"
                    />
                    {result.cached && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                        Cached
                      </div>
                    )}
                  </div>
                  
                  {result.composition_info && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-1">Composition Info:</p>
                      <p className="text-xs text-blue-700">
                        Model: {result.composition_info.primary_model}
                        {result.composition_info.fallback_used && ` → ${result.composition_info.fallback_used}`}
                      </p>
                      <p className="text-xs text-blue-700">
                        Images: {result.composition_info.images_used} ({result.composition_info.roles.join(', ')})
                      </p>
                    </div>
                  )}
                  
                  <button
                    onClick={handleDownload}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Composition
                  </button>
                </div>
              ) : (
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-lg font-medium">Your composition will appear here</p>
                    <p className="text-sm">Upload images and create your composition</p>
                  </div>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <h4 className="font-semibold text-yellow-800 mb-2">💡 Tips</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Upload high-quality images for better results</li>
                <li>• Be specific about how elements should combine</li>
                <li>• Uses Gemini AI for intelligent image composition</li>
                <li>• Each role helps the AI understand your intent</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
