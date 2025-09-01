'use client';

import React, { useRef, useState } from "react";
import Header from "../components/Header";
import { correctImageOrientation } from "../../lib/image-orientation";

// Preset prompts for quick selection
const PRESET_PROMPTS = {
  generate: [
    "A beautiful Victorian house with white picket fence",
    "Modern minimalist house with large glass windows",
    "Cozy cottage with stone walls and thatched roof",
    "Contemporary farmhouse with wraparound porch",
    "Mediterranean villa with terracotta roof tiles",
    "Colonial style brick house with symmetrical design"
  ],
  edit: [
    "Change the exterior color to navy blue with white trim",
    "Add a wraparound porch with white columns",
    "Convert to modern minimalist style with large windows",
    "Add landscaping with mature trees and flower beds",
    "Change the roof to metal standing seam",
    "Add stone accents to the foundation and entryway"
  ]
};

interface GeneratedImage {
  url?: string;
  b64_json?: string;
  cached?: boolean;
  revised_prompt?: string;
}

export default function GPTImagePage() {
  const [mode, setMode] = useState<'generate' | 'edit'>('generate');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [maskImage, setMaskImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [maskPreviewUrl, setMaskPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<GeneratedImage | null>(null);
  const [size, setSize] = useState<string>('1024x1024');
  const [quality, setQuality] = useState<string>('standard');
  
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const maskFileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      try {
        // Check file size (10MB limit)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          alert('Image file is too large. Please select an image smaller than 10MB.');
          return;
        }

        // Validate image content for edit mode only
        if (mode === 'edit') {
          console.log('🔍 Validating image content...');
          const formData = new FormData();
          formData.append('image', file);
          
          const validationResponse = await fetch('/api/validate-image', {
            method: 'POST',
            body: formData
          });
          
          const validation = await validationResponse.json();
          
          if (!validation.isValid) {
            alert(validation.reason || 'Please upload a photo of a house, building, or property exterior.');
            return;
          }
          
          console.log('✅ Image validation passed:', validation.reason);
        }

        // Apply EXIF orientation correction
        const correctedFile = await correctImageOrientation(file, 0.95);
        setSelectedImage(correctedFile);
        
        const url = URL.createObjectURL(correctedFile);
        setPreviewUrl(url);
        setResult(null);
      } catch (error) {
        console.error('Error processing image:', error);
        alert('Failed to process image. Please try again.');
      }
    }
  };

  const handleMaskChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      try {
        // Check file size (10MB limit)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          alert('Mask file is too large. Please select a file smaller than 10MB.');
          return;
        }

        setMaskImage(file);
        const url = URL.createObjectURL(file);
        setMaskPreviewUrl(url);
      } catch (error) {
        console.error('Error processing mask:', error);
        alert('Failed to process mask. Please try again.');
      }
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    try {
      setIsProcessing(true);
      setResult(null);

      const response = await fetch('/api/images/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          size,
          quality,
          n: 1,
          response_format: 'url'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `API error: ${response.status}`);
      }

      if (!data.data || data.data.length === 0) {
        throw new Error('No image generated');
      }

      setResult(data.data[0]);
    } catch (error) {
      console.error('Generation error:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedImage) {
      alert('Please select an image to edit');
      return;
    }

    if (!prompt.trim()) {
      alert('Please enter an edit prompt');
      return;
    }

    try {
      setIsProcessing(true);
      setResult(null);

      const formData = new FormData();
      formData.append('image', selectedImage);
      if (maskImage) {
        formData.append('mask', maskImage);
      }
      formData.append('prompt', prompt);
      formData.append('size', size);
      formData.append('n', '1');
      formData.append('response_format', 'url');

      const response = await fetch('/api/images/edit', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `API error: ${response.status}`);
      }

      if (!data.data || data.data.length === 0) {
        throw new Error('No edited image generated');
      }

      setResult(data.data[0]);
    } catch (error) {
      console.error('Edit error:', error);
      alert(error instanceof Error ? error.message : 'Failed to edit image. Please try again.');
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
      a.download = `gpt-image-1-${mode}-${Date.now()}.png`;
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

  const clearMask = () => {
    setMaskImage(null);
    setMaskPreviewUrl(null);
    if (maskFileInputRef.current) {
      maskFileInputRef.current.value = '';
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header showBackButton={true} className="relative z-50" />
      
      <div className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            GPT-Image-1 Studio
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Generate stunning images from text or edit existing photos with AI-powered precision
          </p>
        </div>

        {/* Mode Selection */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-xl p-1 shadow-lg border">
            <button
              onClick={() => setMode('generate')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                mode === 'generate'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📝 Text to Image
            </button>
            <button
              onClick={() => setMode('edit')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                mode === 'edit'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🎨 Image Editing
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Panel - Controls */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {mode === 'generate' ? 'Generate Image' : 'Edit Image'}
              </h3>

              {/* Image Upload for Edit Mode */}
              {mode === 'edit' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Image to Edit
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    ref={imageFileInputRef}
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => imageFileInputRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors"
                  >
                    {selectedImage ? (
                      <span className="text-green-600">✅ Image Selected: {selectedImage.name}</span>
                    ) : (
                      <span className="text-gray-500">Click to upload image</span>
                    )}
                  </button>
                  
                  {previewUrl && (
                    <div className="mt-4">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-w-full h-48 object-cover rounded-lg mx-auto"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Mask Upload for Edit Mode */}
              {mode === 'edit' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Mask (Optional)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    White areas = keep, Black areas = edit. PNG format recommended.
                  </p>
                  <input
                    type="file"
                    accept="image/png"
                    ref={maskFileInputRef}
                    onChange={handleMaskChange}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => maskFileInputRef.current?.click()}
                      className="flex-1 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors"
                    >
                      {maskImage ? (
                        <span className="text-green-600">✅ Mask: {maskImage.name}</span>
                      ) : (
                        <span className="text-gray-500">Click to upload mask</span>
                      )}
                    </button>
                    {maskImage && (
                      <button
                        onClick={clearMask}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  
                  {maskPreviewUrl && (
                    <div className="mt-4">
                      <img
                        src={maskPreviewUrl}
                        alt="Mask Preview"
                        className="max-w-full h-32 object-cover rounded-lg mx-auto border"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Prompt Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={mode === 'generate' 
                    ? "Describe the image you want to generate..."
                    : "Describe how you want to edit the image..."
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  maxLength={1000}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {prompt.length}/1000 characters
                </div>
              </div>

              {/* Preset Prompts */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Presets
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {PRESET_PROMPTS[mode].map((preset, index) => (
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

              {/* Settings */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Size
                  </label>
                  <select
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {mode === 'generate' ? (
                      <>
                        <option value="1024x1024">Square (1024×1024)</option>
                        <option value="1024x1792">Portrait (1024×1792)</option>
                        <option value="1792x1024">Landscape (1792×1024)</option>
                      </>
                    ) : (
                      <>
                        <option value="256x256">Small (256×256)</option>
                        <option value="512x512">Medium (512×512)</option>
                        <option value="1024x1024">Large (1024×1024)</option>
                      </>
                    )}
                  </select>
                </div>
                
                {mode === 'generate' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quality
                    </label>
                    <select
                      value={quality}
                      onChange={(e) => setQuality(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="standard">Standard</option>
                      <option value="hd">HD</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                onClick={mode === 'generate' ? handleGenerate : handleEdit}
                disabled={isProcessing || !prompt.trim() || (mode === 'edit' && !selectedImage)}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-4 rounded-lg transition-colors"
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    {mode === 'generate' ? 'Generating...' : 'Editing...'}
                  </div>
                ) : (
                  mode === 'generate' ? '🎨 Generate Image' : '✨ Edit Image'
                )}
              </button>
            </div>
          </div>

          {/* Right Panel - Results */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Result</h3>
              
              {result ? (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={result.url || `data:image/png;base64,${result.b64_json}`}
                      alt="Generated result"
                      className="w-full rounded-lg shadow-md"
                    />
                    {result.cached && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                        Cached
                      </div>
                    )}
                  </div>
                  
                  {result.revised_prompt && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-1">Revised Prompt:</p>
                      <p className="text-sm text-blue-700">{result.revised_prompt}</p>
                    </div>
                  )}
                  
                  <button
                    onClick={handleDownload}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Image
                  </button>
                </div>
              ) : (
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-lg font-medium">Your result will appear here</p>
                    <p className="text-sm">Enter a prompt and click generate or edit</p>
                  </div>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <h4 className="font-semibold text-yellow-800 mb-2">💡 Tips</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {mode === 'generate' ? (
                  <>
                    <li>• Be specific about style, colors, and details</li>
                    <li>• Include lighting and mood descriptions</li>
                    <li>• Use HD quality for best results</li>
                  </>
                ) : (
                  <>
                    <li>• Use masks to edit specific areas only</li>
                    <li>• White areas in mask = keep, black = edit</li>
                    <li>• Higher resolution gives better results</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}